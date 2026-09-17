const express = require('express');
const bcrypt = require('bcrypt');
const { User, Log, BannedIP } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { refreshBannedIps, getClientIp } = require('../middleware/ipBan');
const { clearIpJail } = require('../middleware/antiFlood');
const router = express.Router();

// Require Admin authorization for all user management endpoints
router.use(requireAdmin);

// Get all users (Admin/SuperAdmin)
router.get('/', async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === 'superadmin';
    const whereClause = isSuperAdmin ? {} : { role: ['member', 'admin'] }; // Regular admin cannot see superadmin accounts

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'username', 'email', 'role', 'creditBalance',
        'registerIp', 'lastIp', 'deviceFingerprint', 'lastDeviceModel', 'deviceInfo',
        'isBanned', 'banReason', 'bannedBy', 'bannedAt', 'bannedUntil', 'lastActive', 'createdAt',
        'latitude', 'longitude', 'city', 'region', 'country', 'isp', 'locationUpdatedAt'
      ],
      order: [['id', 'ASC']]
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
  }
});

// Update user role (promote/demote)
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, adminUsername } = req.body;
    const isSuperAdmin = req.user && req.user.role === 'superadmin';

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    // Protect SuperAdmin: Regular admin cannot touch superadmin
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: คุณไม่มีสิทธิ์แก้ไขหรือจัดการบัญชีระดับ SuperAdmin' });
    }

    // Only SuperAdmin can grant superadmin role
    if (role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: เฉพาะ SuperAdmin เท่านั้นที่สามารถแต่งตั้ง SuperAdmin ได้' });
    }

    if (!['member', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'ยศไม่ถูกต้อง' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await Log.create({
      action: 'ADMIN_UPDATE_ROLE',
      detail: `เปลี่ยนยศผู้ใช้ ${user.username} จาก "${oldRole}" เป็น "${role}" โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: `ปรับยศผู้ใช้ ${user.username} เป็น ${role} เรียบร้อยแล้ว`, user });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถเปลี่ยนยศได้' });
  }
});

// Adjust balance (Add or deduct balance)
router.post('/:id/adjust-balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, adminUsername } = req.body; // type: 'add' | 'deduct'
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    const isSuperAdmin = req.user && req.user.role === 'superadmin';
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: คุณไม่มีสิทธิ์ปรับแก้ข้อมูลของ SuperAdmin' });
    }

    const change = Math.abs(Number(amount));
    if (isNaN(change) || change <= 0) {
      return res.status(400).json({ message: 'จำนวนเงินต้องมากกว่า 0' });
    }

    if (type === 'deduct') {
      user.creditBalance = Math.max(0, user.creditBalance - change);
    } else {
      user.creditBalance += change;
    }
    await user.save();

    await Log.create({
      action: 'ADMIN_ADJUST_BALANCE',
      detail: `${type === 'add' ? 'เพิ่มเงิน' : 'ลดเงิน'} ผู้ใช้ ${user.username} จำนวน ${change} บาท (ยอดปัจจุบัน: ${user.creditBalance} บาท)`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: 'ปรับปรุงยอดเงินสำเร็จ', balance: user.creditBalance, user });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปรับยอดเงิน' });
  }
});

// Admin change user password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, adminUsername } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await Log.create({
      action: 'ADMIN_RESET_USER_PASS',
      detail: `รีเซ็ตรหัสผ่านใหม่ให้กับผู้ใช้ ${user.username} โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: `เปลี่ยนรหัสผ่านสำหรับ ${user.username} สำเร็จเรียบร้อย` });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
  }
});

// Admin edit user details: username, email, password, role, creditBalance
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, creditBalance, adminUsername } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    const isSuperAdmin = req.user && req.user.role === 'superadmin';
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: คุณไม่มีสิทธิ์แก้ไขข้อมูลของ SuperAdmin' });
    }

    if (role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: เฉพาะ SuperAdmin เท่านั้นที่สามารถแต่งตั้ง SuperAdmin ได้' });
    }

    const changes = [];

    // Check if new username is taken
    if (username && username !== user.username) {
      const existing = await User.findOne({ where: { username } });
      if (existing) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีคนอื่นใช้งานแล้ว' });
      }
      changes.push(`Username: ${user.username} -> ${username}`);
      user.username = username;
    }

    // Check if new email is taken
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'อีเมลนี้มีคนอื่นใช้งานแล้ว' });
      }
      changes.push(`Email: ${user.email} -> ${email}`);
      user.email = email;
    }

    // Check if new password is provided
    if (password && password.trim().length > 0) {
      if (password.length < 4) {
        return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
      changes.push('เปลี่ยนรหัสผ่านใหม่');
    }

    // Check role
    if (role && ['member', 'admin'].includes(role) && role !== user.role) {
      changes.push(`Role: ${user.role} -> ${role}`);
      user.role = role;
    }

    // Check balance
    if (creditBalance !== undefined && creditBalance !== null && !isNaN(Number(creditBalance))) {
      const newBal = Math.max(0, Number(creditBalance));
      if (newBal !== user.creditBalance) {
        changes.push(`Balance: ฿${user.creditBalance} -> ฿${newBal}`);
        user.creditBalance = newBal;
      }
    }

    await user.save();

    await Log.create({
      action: 'ADMIN_EDIT_USER',
      detail: `แก้ไขข้อมูลผู้ใช้ ID ${user.id} (${changes.length > 0 ? changes.join(', ') : 'ไม่มีการเปลี่ยนแปลง'}) โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({
      message: `อัปเดตข้อมูลผู้ใช้ ${user.username} เรียบร้อยแล้ว`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.creditBalance,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้: ' + err.message });
  }
});

// Ban or unban user
router.put('/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned, banReason, banIpAlso, banAllDevicesAlso, adminUsername, bannedUntil } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    // Protect SuperAdmin from ban
    const isSuperAdmin = req.user && req.user.role === 'superadmin';
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({ message: 'ไม่อนุญาต: คุณไม่สามารถแบนบัญชีระดับ SuperAdmin ได้' });
    }

    user.isBanned = !!isBanned;
    user.banReason = isBanned ? (banReason || 'ระงับการใช้งานโดยผู้ดูแลระบบ') : null;
    user.bannedBy = isBanned ? (adminUsername || 'Admin') : null;
    user.bannedAt = isBanned ? new Date() : null;
    user.bannedUntil = isBanned ? (bannedUntil ? new Date(bannedUntil) : null) : null;
    await user.save();

    let extraMsg = '';
    // If admin requested banning user's IP as well
    
    // If admin requested banning all devices of the user as well
    if (isBanned && banAllDevicesAlso) {
      try {
        const { UserDevice, BannedDevice } = require('../models');
        const { refreshBannedDevices } = require('../middleware/ipBan');
        const userDevs = await UserDevice.findAll({ where: { username: user.username } });
        
        if (user.deviceFingerprint) {
          await BannedDevice.findOrCreate({
            where: { deviceId: user.deviceFingerprint },
            defaults: {
              deviceId: user.deviceFingerprint,
              deviceModel: user.lastDeviceModel || 'Unknown Device',
              reason: banReason || 'แบนอุปกรณ์ทั้งหมดพร้อมกับบัญชีผู้ใช้',
              bannedBy: adminUsername || 'Admin',
              bannedAt: new Date()
            }
          });
        }

        for (const ud of userDevs) {
          if (ud.deviceId) {
            await BannedDevice.findOrCreate({
              where: { deviceId: ud.deviceId },
              defaults: {
                deviceId: ud.deviceId,
                hardwareHash: ud.hardwareHash || null,
                deviceModel: ud.deviceModel || 'Unknown Device',
                reason: banReason || 'แบนอุปกรณ์ทั้งหมดพร้อมกับบัญชีผู้ใช้',
                bannedBy: adminUsername || 'Admin',
                bannedAt: new Date()
              }
            });
          }
        }
        await UserDevice.update({ isBanned: true, banReason }, { where: { username: user.username } });
        await refreshBannedDevices();
      } catch (err) {
        console.error('Error auto-banning user devices:', err.message);
      }
    }

    if (isBanned && banIpAlso) {
      const ipsToBan = new Set();
      if (user.lastIp && user.lastIp !== '127.0.0.1') ipsToBan.add(user.lastIp);
      if (user.registerIp && user.registerIp !== '127.0.0.1') ipsToBan.add(user.registerIp);

      for (const ip of ipsToBan) {
        await BannedIP.findOrCreate({
          where: { ip },
          defaults: {
            ip,
            reason: `แบนพร้อมบัญชีผู้ใช้ ${user.username} (${banReason || 'ระงับโดยแอดมิน'})`,
            bannedBy: adminUsername || 'Admin',
            bannedAt: new Date(),
            bannedUntil: user.bannedUntil,
          }
        });
      }
      await refreshBannedIps();
      if (ipsToBan.size > 0) {
        extraMsg = ` และแบน IP (${Array.from(ipsToBan).join(', ')}) เรียบร้อยแล้ว`;
      }
    } else if (!isBanned) {
      if (user.lastIp) clearIpJail(user.lastIp);
      if (user.registerIp) clearIpJail(user.registerIp);

      const ipsToUnban = new Set();
      if (user.lastIp && user.lastIp !== '127.0.0.1') ipsToUnban.add(user.lastIp);
      if (user.registerIp && user.registerIp !== '127.0.0.1') ipsToUnban.add(user.registerIp);
      let removedIpCount = 0;
      for (const ip of ipsToUnban) {
        const deleted = await BannedIP.destroy({ where: { ip } });
        if (deleted > 0) removedIpCount++;
        clearIpJail(ip);
      }
      if (removedIpCount > 0) {
        await refreshBannedIps();
        extraMsg = ` และปลดแบน IP (${Array.from(ipsToUnban).join(', ')}) เรียบร้อยแล้ว`;
      }
    }

    await Log.create({
      action: isBanned ? 'ADMIN_BAN_USER' : 'ADMIN_UNBAN_USER',
      detail: `${isBanned ? 'แบนผู้ใช้' : 'ปลดแบนผู้ใช้'} ${user.username}${isBanned ? ` (เหตุผล: ${user.banReason})` : ''} โดย ${adminUsername || 'Admin'}${extraMsg}`,
      username: adminUsername || 'Admin',
      ip: getClientIp(req)
    });

    res.json({
      message: `${isBanned ? 'ระงับการใช้งานผู้ใช้' : 'ปลดการระงับผู้ใช้'} ${user.username} เรียบร้อยแล้ว${extraMsg}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        creditBalance: user.creditBalance,
        lastIp: user.lastIp,
        registerIp: user.registerIp,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจัดการสถานะการแบน: ' + err.message });
  }
});

// Quick action: Ban user's IP directly
router.post('/:id/ban-ip', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, targetIpType, adminUsername } = req.body; // targetIpType: 'last' | 'register' | 'both'
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });

    const ipsToBan = new Set();
    if ((!targetIpType || targetIpType === 'last' || targetIpType === 'both') && user.lastIp) {
      ipsToBan.add(user.lastIp);
    }
    if ((targetIpType === 'register' || targetIpType === 'both') && user.registerIp) {
      ipsToBan.add(user.registerIp);
    }

    const callerIp = getClientIp(req);
    // Safety check: Prevent admin from banning their own IP
    if (ipsToBan.has(callerIp)) {
      ipsToBan.delete(callerIp);
      if (ipsToBan.size === 0) {
        return res.status(400).json({ message: `⚠️ ไม่สามารถแบน IP (${callerIp}) ของคุณเองได้ เพื่อป้องกันการล็อกตัวเองออกจากระบบ!` });
      }
    }

    for (const ip of ipsToBan) {
      const existing = await BannedIP.findOne({ where: { ip } });
      if (existing) {
        existing.reason = reason || `แบนจากผู้ใช้ ${user.username}`;
        existing.bannedBy = adminUsername || 'Admin';
        existing.bannedAt = new Date();
        await existing.save();
      } else {
        await BannedIP.create({
          ip,
          reason: reason || `แบนจากผู้ใช้ ${user.username}`,
          bannedBy: adminUsername || 'Admin',
          bannedAt: new Date()
        });
      }
    }

    await refreshBannedIps();

    await Log.create({
      action: 'ADMIN_BAN_USER_IP',
      detail: `แบน IP (${Array.from(ipsToBan).join(', ')}) ของผู้ใช้ ${user.username} โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
      ip: getClientIp(req)
    });

    res.json({ message: `แบน IP (${Array.from(ipsToBan).join(', ')}) เรียบร้อยแล้ว`, ips: Array.from(ipsToBan) });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถแบน IP ได้: ' + err.message });
  }
});

module.exports = router;

