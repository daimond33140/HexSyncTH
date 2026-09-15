const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Log, Setting } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Rate limiting tracker for secret brute-force protection
const secretAttempts = new Map(); // ip -> { count, lockedUntil }

async function getSuperAdminMasterSecret() {
  if (process.env.SUPERADMIN_SECRET && process.env.SUPERADMIN_SECRET.trim().length > 0) {
    return process.env.SUPERADMIN_SECRET.trim();
  }
  try {
    const s = await Setting.findOne({ where: { key: 'superadmin_master_secret' } });
    if (s && s.value && s.value.trim().length > 0) {
      return s.value.trim();
    }
    const emk = await Setting.findOne({ where: { key: 'emergency_master_key' } });
    if (emk && emk.value && emk.value.trim().length > 0) {
      return emk.value.trim();
    }
  } catch (_) {}
  return null;
}

// All endpoints require admin or superadmin authentication
router.use(requireAdmin);

// Check if user is superadmin or has provided the master secret
async function checkSuperAdminOrSecret(req) {
  const user = req.user;
  if (user && user.role === 'superadmin') {
    return { authorized: true, isSecret: false };
  }
  const secretHeader = (req.headers['x-superadmin-secret'] || req.body?.masterSecret || '').toString().trim();
  const activeMasterSecret = await getSuperAdminMasterSecret();
  if (activeMasterSecret && user && (user.role === 'admin' || user.role === 'superadmin') && secretHeader === activeMasterSecret) {
    return { authorized: true, isSecret: true };
  }
  return { authorized: false, isSecret: false };
}

// 1. Verify Secret Code (with rate-limiting and brute-force lockout)
router.post('/verify-secret', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const attempt = secretAttempts.get(ip) || { count: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > now) {
      const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({
        valid: false,
        message: `⚠️ คุณใส่รหัสลับผิดเกินกำหนด กรุณารออีก ${waitSec} วินาที ก่อนลองใหม่อีกครั้ง`
      });
    }

    const { secret } = req.body;
    if (!secret) {
      return res.status(400).json({ valid: false, message: 'กรุณากรอกรหัสลับ' });
    }

    const activeMasterSecret = await getSuperAdminMasterSecret();
    if (!activeMasterSecret) {
      return res.status(403).json({ valid: false, message: 'ยังไม่มีการตั้งค่ารหัสลับ SuperAdmin ในระบบ กรุณาติดต่อเจ้าของเว็บไซต์' });
    }

    if (secret.toString().trim() === activeMasterSecret) {
      secretAttempts.delete(ip);
      return res.json({ valid: true, message: 'ยืนยันรหัสลับความปลอดภัยสูงสุดสำเร็จ' });
    }

    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + 5 * 60 * 1000;
      secretAttempts.set(ip, attempt);
      return res.status(429).json({
        valid: false,
        message: '⚠️ ใส่รหัสลับผิดครบ 5 ครั้ง ระบบถูกล็อกชั่วคราวเป็นเวลา 5 นาที'
      });
    }
    secretAttempts.set(ip, attempt);

    return res.status(401).json({
      valid: false,
      message: `รหัสลับไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - attempt.count} ครั้ง)`
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสลับ' });
  }
});

// 2. Get SuperAdmin accounts list
router.get('/accounts', async (req, res) => {
  try {
    const authCheck = await checkSuperAdminOrSecret(req);
    if (!authCheck.authorized) {
      return res.status(403).json({
        error: 'SUPERADMIN_SECRET_REQUIRED',
        message: 'เขตหวงห้าม: ต้องใช้สิทธิ์ SuperAdmin หรือรหัสผ่านความปลอดภัยสูงสุดเท่านั้น'
      });
    }

    let superAdmins = await User.findAll({
      where: { role: 'superadmin' },
      attributes: ['id', 'username', 'email', 'role', 'creditBalance', 'lastIp', 'lastActive', 'createdAt', 'lastDeviceModel'],
      order: [['id', 'ASC']]
    });

    // Fallback: If no superadmin exists yet, promote user id 1 or username 'admin'
    if (superAdmins.length === 0) {
      const primaryAdmin = await User.findOne({ where: { username: 'admin' } }) || await User.findByPk(1);
      if (primaryAdmin) {
        primaryAdmin.role = 'superadmin';
        await primaryAdmin.save();
        superAdmins = [primaryAdmin];
      }
    }

    res.json({ accounts: superAdmins });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล SuperAdmin: ' + err.message });
  }
});

// 3. Update SuperAdmin account (Username, Password, Email, Balance)
router.put('/accounts/:id', async (req, res) => {
  try {
    const authCheck = await checkSuperAdminOrSecret(req);
    if (!authCheck.authorized) {
      return res.status(403).json({
        error: 'SUPERADMIN_SECRET_REQUIRED',
        message: 'เขตหวงห้าม: ต้องใช้สิทธิ์ SuperAdmin หรือรหัสผ่านความปลอดภัยสูงสุดเท่านั้น'
      });
    }

    const { id } = req.params;
    const { username, email, password, creditBalance } = req.body;

    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'ไม่พบบัญชี SuperAdmin นี้' });
    }

    const changes = [];

    // Update Username
    if (username && username.trim() !== targetUser.username) {
      const existingUser = await User.findOne({ where: { username: username.trim() } });
      if (existingUser && existingUser.id !== targetUser.id) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น' });
      }
      changes.push(`Username: "${targetUser.username}" -> "${username.trim()}"`);
      targetUser.username = username.trim();
    }

    // Update Email
    if (email && email.trim() !== targetUser.email) {
      const existingEmail = await User.findOne({ where: { email: email.trim() } });
      if (existingEmail && existingEmail.id !== targetUser.id) {
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
      }
      changes.push(`Email: "${targetUser.email}" -> "${email.trim()}"`);
      targetUser.email = email.trim();
    }

    // Update Password
    if (password && password.trim()) {
      if (password.trim().length < 4) {
        return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
      }
      targetUser.passwordHash = await bcrypt.hash(password.trim(), 10);
      changes.push('เปลี่ยนรหัสผ่านใหม่');
    }

    // Update Balance
    if (creditBalance !== undefined && creditBalance !== null && !isNaN(Number(creditBalance))) {
      const newBal = Math.max(0, Number(creditBalance));
      if (newBal !== targetUser.creditBalance) {
        changes.push(`Balance: ฿${targetUser.creditBalance} -> ฿${newBal}`);
        targetUser.creditBalance = newBal;
      }
    }

    // Ensure target role is superadmin
    targetUser.role = 'superadmin';
    await targetUser.save();

    const operatorName = req.user?.username || 'Admin';
    const methodDesc = authCheck.isSecret ? 'ผ่านรหัสลับ Master Secret' : 'โดย SuperAdmin';

    await Log.create({
      action: 'SUPERADMIN_ACCOUNT_UPDATED',
      detail: `อัปเดตข้อมูล SuperAdmin ID #${targetUser.id} (${changes.length > 0 ? changes.join(', ') : 'ไม่มีการเปลี่ยนแปลงข้อมูล'}) โดย ${operatorName} (${methodDesc})`,
      username: operatorName
    });

    res.json({
      success: true,
      message: `อัปเดตข้อมูล SuperAdmin "${targetUser.username}" สำเร็จเรียบร้อยแล้ว`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        creditBalance: targetUser.creditBalance,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไข SuperAdmin: ' + err.message });
  }
});

module.exports = router;
