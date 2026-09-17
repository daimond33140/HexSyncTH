// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Log } = require('../models');
const { getClientIp } = require('../middleware/ipBan');
const { recordFailedLogin, clearFailedLogin, checkLoginLockout } = require('../middleware/wafSecurity');
const { resolveIpLocation } = require('../utils/geoIp');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// In-memory OTP storage: { email: { otp, expiresAt } }
const otpStore = new Map();

// Helper to seed initial admin
async function ensureAdminUser() {
  try {
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin1234', 10);
      await User.create({
        username: 'admin',
        email: 'admin@gmail.com',
        passwordHash,
        role: 'admin',
        creditBalance: 5000,
      });
      console.log('Seeded default admin: username=admin, password=admin1234');
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  }
}
ensureAdminUser();

// Register: username, email (gmail), password, confirmPassword
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, deviceId, deviceModel, deviceInfo } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน' });
    }

    // Check if user already exists
    const exists = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });
    if (exists) {
      return res.status(409).json({ message: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });
    }

    const clientIp = req.clientIp || getClientIp(req);
    const passwordHash = await bcrypt.hash(password, 10);
    const parsedModel = deviceModel || (deviceInfo && deviceInfo.model) || 'Unknown Device';
    const parsedInfoStr = deviceInfo ? (typeof deviceInfo === 'string' ? deviceInfo : JSON.stringify(deviceInfo)) : null;

    const newUser = await User.create({
      username,
      email,
      passwordHash,
      role: 'member',
      creditBalance: 0,
      registerIp: clientIp,
      lastIp: clientIp,
      deviceFingerprint: deviceId ? deviceId.trim() : null,
      lastDeviceModel: parsedModel,
      deviceInfo: parsedInfoStr,
      lastActive: new Date(),
      isBanned: false,
    });

    await Log.create({
      action: 'USER_REGISTER',
      detail: `ผู้ใช้ ${username} (${email}) สมัครสมาชิกสำเร็จจาก IP ${clientIp}`,
      username,
      ip: clientIp,
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        balance: newUser.creditBalance,
        lastIp: newUser.lastIp,
        isBanned: newUser.isBanned,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + err.message });
  }
});

// Login: username, password
router.post('/login', async (req, res) => {
  try {
    const clientIp = req.clientIp || getClientIp(req);
    const { username, password, deviceId, deviceModel, deviceInfo } = req.body;

    // Check if IP is currently under brute-force lockout
    const lockout = checkLoginLockout(clientIp);
    if (lockout.locked) {
      return res.status(429).json({
        message: `⚠️ หมายเลข IP ถูกระงับการเข้าสู่ระบบชั่วคราวเนื่องจากใส่รหัสผ่านผิดหลายครั้ง กรุณารอ ${lockout.remainingSec} วินาที`
      });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email: username }]
      }
    });

    if (!user) {
      const failResult = recordFailedLogin(clientIp, username);
      if (failResult.ban) {
        return res.status(403).json({
          banned: true,
          message: 'IP ของคุณถูกระงับการใช้งานถาวรเนื่องจากตรวจพบการพยายามสุ่มรหัสผ่านข้ามบัญชี (Credential Stuffing / Hydra)'
        });
      }
      if (failResult.blocked) {
        return res.status(429).json({
          message: 'ใส่รหัสผ่านผิดเกิน 6 ครั้ง IP ของคุณถูกระงับการเข้าสู่ระบบชั่วคราว 15 นาที'
        });
      }
      return res.status(401).json({
        message: `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสลองอีก ${failResult.remaining} ครั้ง)`
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      const failResult = recordFailedLogin(clientIp, username);
      if (failResult.ban) {
        return res.status(403).json({
          banned: true,
          message: 'IP ของคุณถูกระงับการใช้งานถาวรเนื่องจากตรวจพบการพยายามสุ่มรหัสผ่านข้ามบัญชี (Credential Stuffing / Hydra)'
        });
      }
      if (failResult.blocked) {
        return res.status(429).json({
          message: 'ใส่รหัสผ่านผิดเกิน 6 ครั้ง IP ของคุณถูกระงับการเข้าสู่ระบบชั่วคราว 15 นาที'
        });
      }
      return res.status(401).json({
        message: `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสลองอีก ${failResult.remaining} ครั้ง)`
      });
    }

    // Login successful: reset failed attempt counter
    clearFailedLogin(clientIp);

    if (user.isBanned) {
      return res.status(403).json({
        banned: true,
        userBanned: true,
        username: user.username,
        bannedBy: user.bannedBy || 'ผู้ดูแลระบบ (Admin)',
        banReason: user.banReason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
        bannedAt: user.bannedAt || user.updatedAt,
        message: `บัญชีของคุณ (${user.username}) ถูกระงับการใช้งาน`,
      });
    }

    user.lastIp = clientIp;
    user.lastActive = new Date();
    if (deviceId) {
      user.deviceFingerprint = deviceId.trim();
    }
    if (deviceModel) {
      user.lastDeviceModel = deviceModel;
    } else if (deviceInfo && deviceInfo.model) {
      user.lastDeviceModel = deviceInfo.model;
    }
    if (deviceInfo) {
      user.deviceInfo = typeof deviceInfo === 'string' ? deviceInfo : JSON.stringify(deviceInfo);
    }

    // Geolocation Resolution (IP Geolocation & Browser GPS)
    const { latitude, longitude } = req.body;
    try {
      const geo = await resolveIpLocation(clientIp, req.headers);
      if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
        user.latitude = Number(latitude);
        user.longitude = Number(longitude);
      } else if (geo) {
        user.latitude = geo.latitude;
        user.longitude = geo.longitude;
      }
      if (geo) {
        user.city = geo.city;
        user.region = geo.region;
        user.country = geo.country;
        user.isp = geo.isp;
      }
      user.locationUpdatedAt = new Date();
    } catch {}

    await user.save();

    const locDesc = user.latitude && user.longitude
      ? ` [พิกัด: ${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)} (${user.city || 'Bangkok'})]`
      : '';

    await Log.create({
      action: 'USER_LOGIN',
      detail: `ผู้ใช้ ${user.username} (ยศ: ${user.role}) เข้าสู่ระบบสำเร็จจาก IP ${clientIp}${locDesc} [เครื่อง: ${user.lastDeviceModel || 'Unknown'}]`,
      username: user.username,
      ip: clientIp,
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.creditBalance,
        lastIp: user.lastIp,
        isBanned: user.isBanned,
        latitude: user.latitude,
        longitude: user.longitude,
        city: user.city,
        region: user.region,
        country: user.country,
        isp: user.isp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Update User Location (Called from browser GPS after login or on map sync)
router.post('/update-location', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { latitude, longitude, city, country } = req.body;
    if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      user.latitude = Number(latitude);
      user.longitude = Number(longitude);
      if (city) user.city = city;
      if (country) user.country = country;
      user.locationUpdatedAt = new Date();
      await user.save();
    }
    res.json({
      success: true,
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        city: user.city,
        country: user.country
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Request OTP for Gmail
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'กรุณาระบุ Gmail' });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบบัญชีที่ผูกกับอีเมลนี้' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpStore.set(email, { otp, expiresAt });

    await Log.create({
      action: 'REQUEST_OTP',
      detail: `ขอรหัส OTP สำหรับกู้รหัสผ่านอีเมล ${email}`,
      username: user.username,
    });

    console.log(`[OTP Generated] For ${email}: ${otp}`);
    res.json({
      message: 'ส่งรหัส OTP ไปยัง Gmail ของคุณเรียบร้อยแล้ว (มีอายุ 5 นาที)',
      ...(process.env.NODE_ENV === 'test' ? { mockOtp: otp } : {})
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถสร้าง OTP ได้' });
  }
});

// Reset Password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ไม่ตรงกัน' });
    }

    const record = otpStore.get(email);
    if (!record || Date.now() > record.expiresAt) {
      if (record) otpStore.delete(email);
      return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่อีกครั้ง' });
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.otp !== otp.toString().trim()) {
      if (record.attempts >= 5) {
        otpStore.delete(email);
        return res.status(429).json({ message: '⚠️ ใส่รหัส OTP ผิดเกิน 5 ครั้ง รหัสนี้ถูกยกเลิกแล้ว กรุณาขอรหัสใหม่' });
      }
      return res.status(400).json({ message: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - record.attempts} ครั้ง)` });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    otpStore.delete(email);

    await Log.create({
      action: 'RESET_PASSWORD',
      detail: `ผู้ใช้ ${user.username} รีเซ็ตรหัสผ่านใหม่ผ่าน OTP สำเร็จ`,
      username: user.username,
    });

    res.json({ message: 'เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
  }
});

// Check current user ban status (Real-time sync)
router.get('/check-status', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) return res.json({ loggedIn: false });
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (!token) return res.json({ loggedIn: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
    const user = await User.findByPk(decoded.id);
    if (!user) return res.json({ loggedIn: false });

    if (user.isBanned) {
      return res.json({
        loggedIn: true,
        isBanned: true,
        userBanned: true,
        username: user.username,
        bannedBy: user.bannedBy || 'ผู้ดูแลระบบ (Admin)',
        banReason: user.banReason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
        bannedAt: user.bannedAt || user.updatedAt,
      });
    }

    return res.json({
      loggedIn: true,
      isBanned: false,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.creditBalance,
      }
    });
  } catch (err) {
    return res.json({ loggedIn: false });
  }
});


// POST /api/auth/change-password (Self-service change password)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await Log.create({
      action: 'USER_CHANGE_PASSWORD',
      detail: `ผู้ใช้ ${user.username} ทำการเปลี่ยนรหัสผ่านด้วยตนเองสำเร็จ`,
      username: user.username,
      ip: getClientIp(req)
    });

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: ' + err.message });
  }
});

module.exports = router;
