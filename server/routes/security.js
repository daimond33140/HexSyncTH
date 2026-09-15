const express = require('express');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { SecurityThreatLog, BannedIP, BannedDevice, User, Log, Setting } = require('../models');
const { getClientIp, banIpImmediately, refreshBannedIps, refreshBannedDevices, isIpBanned, isDeviceBanned } = require('../middleware/ipBan');
const { requireAdmin, requireSuperAdminOrPasscode, getSuperAdminPasscode } = require('../middleware/auth');
const { clearIpJail } = require('../middleware/antiFlood');
const router = express.Router();

/**
 * Calculate exactly 10 years, 9 months, 9 days, 9 hours, 9 minutes, 9 seconds from a given date
 */
function calculate10YearsBanDate(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() + 10);
  d.setMonth(d.getMonth() + 9);
  d.setDate(d.getDate() + 9);
  d.setHours(d.getHours() + 9);
  d.setMinutes(d.getMinutes() + 9);
  d.setSeconds(d.getSeconds() + 9);
  return d;
}

// 1. PUBLIC ENDPOINT: Report security threat (F12, Inspect, Hack Attempt, etc.)
// Captures screenshot and cookies, increments strike, bans on 3rd strike
router.post('/report-threat', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const {
      threatType = 'SECURITY_VIOLATION',
      detail = 'พยายามเจาะระบบหรือเปิดเครื่องมือตรวจโค้ด',
      cookies = '',
      screenshot = null,
      pageUrl = '',
      deviceId = '',
      deviceModel = 'Unknown Device',
      username = 'Anonymous',
    } = req.body;

    // Check JWT authentication to verify if the reported username belongs to this authenticated session
    let authenticatedUser = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
      try {
        const parts = authHeader.split(' ');
        const token = parts.length === 2 ? parts[1] : parts[0];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keyshop_secret');
        if (decoded && decoded.username) {
          authenticatedUser = decoded;
        }
      } catch (_) {}
    }

    // Only allow username to be associated and banned if authenticated session matches
    const verifiedUsername = (authenticatedUser && authenticatedUser.username)
      ? authenticatedUser.username
      : 'Anonymous';

    // Check if the entity is currently banned
    const ipIsBanned = isIpBanned(ip);
    let devIsBanned = false;
    if (deviceId && typeof deviceId === 'string' && deviceId.trim()) {
      const dbDev = await BannedDevice.findOne({ where: { deviceId: deviceId.trim() } });
      if (dbDev && (!dbDev.bannedUntil || new Date(dbDev.bannedUntil) > new Date())) {
        devIsBanned = true;
      }
    }
    let userIsBanned = false;
    if (verifiedUsername && verifiedUsername !== 'Anonymous') {
      const dbUser = await User.findOne({ where: { username: verifiedUsername } });
      if (dbUser && dbUser.isBanned && (!dbUser.bannedUntil || new Date(dbUser.bannedUntil) > new Date())) {
        userIsBanned = true;
      }
    }

    const isCurrentlyBanned = ipIsBanned || devIsBanned || userIsBanned;

    // Calculate strike count server-side based on actual records in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentThreatCount = await SecurityThreatLog.count({
      where: {
        [Op.or]: [
          { ip },
          ...(deviceId && deviceId.trim() ? [{ deviceId: deviceId.trim() }] : [])
        ],
        createdAt: { [Op.gte]: twentyFourHoursAgo },
        banned: false
      }
    });

    let strikes = recentThreatCount + 1;

    // Check recent threat history for reset if previously unbanned
    const whereConditions = [{ ip }];
    if (deviceId && deviceId.trim()) whereConditions.push({ deviceId: deviceId.trim() });
    if (verifiedUsername && verifiedUsername !== 'Anonymous') whereConditions.push({ username: verifiedUsername });

    const lastThreat = await SecurityThreatLog.findOne({
      where: { [Op.or]: whereConditions },
      order: [['id', 'DESC']]
    });

    if (!isCurrentlyBanned && lastThreat && lastThreat.banned) {
      strikes = 1;
    }

    const shouldBan = strikes >= 3;
    let bannedUntil = null;

    if (shouldBan) {
      bannedUntil = calculate10YearsBanDate();

      // 1. Ban IP
      await banIpImmediately(
        ip,
        `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง (${threatType}): ${detail}`,
        'HexSyncTH Anti-Hack 3-Strikes',
        bannedUntil
      );

      // 2. Ban Device if provided
      if (deviceId && typeof deviceId === 'string' && deviceId.trim().length > 0) {
        const cleanDid = deviceId.trim();
        const existingDev = await BannedDevice.findOne({ where: { deviceId: cleanDid } });
        if (existingDev) {
          await existingDev.update({
            reason: `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง (${threatType}): ${detail}`,
            deviceModel: deviceModel || existingDev.deviceModel,
            bannedUntil,
            bannedAt: new Date(),
            bannedBy: 'HexSyncTH Anti-Hack 3-Strikes',
          });
        } else {
          await BannedDevice.create({
            deviceId: cleanDid,
            deviceModel: deviceModel || 'ไม่ทราบรุ่น (Unknown)',
            reason: `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง (${threatType}): ${detail}`,
            bannedUntil,
            bannedAt: new Date(),
            bannedBy: 'HexSyncTH Anti-Hack 3-Strikes',
          });
        }
        await refreshBannedDevices();
      }

      // 3. Ban User ONLY if verified through authenticated JWT and not admin/superadmin
      if (verifiedUsername && verifiedUsername !== 'Anonymous') {
        const u = await User.findOne({ where: { username: verifiedUsername } });
        if (u && u.role !== 'admin' && u.role !== 'superadmin') {
          u.isBanned = true;
          u.banReason = `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง (${threatType}): ${detail}`;
          u.bannedBy = 'HexSyncTH Anti-Hack 3-Strikes';
          u.bannedAt = new Date();
          u.bannedUntil = bannedUntil;
          await u.save();
        }
      }
    }

    // Save forensic record to SecurityThreatLog
    const threatRecord = await SecurityThreatLog.create({
      threatType,
      detail,
      username: verifiedUsername,
      ip,
      deviceId: deviceId || null,
      deviceModel: deviceModel || null,
      strikeCount: strikes,
      banned: shouldBan,
      bannedUntil,
      cookies: cookies ? cookies.toString().slice(0, 15000) : null,
      screenshot: screenshot || null,
      pageUrl: pageUrl || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      success: true,
      strikeCount: strikes,
      banned: shouldBan,
      bannedUntil: bannedUntil ? bannedUntil.toISOString() : null,
      message: shouldBan
        ? '⚠️ คุณถูกระงับการเข้าใช้งานเป็นเวลา 10 ปี 9 เดือน 9 วัน 9 ชั่วโมง 9 นาที 9 วินาที เนื่องจากละเมิดข้อกำหนดความปลอดภัยครบ 3 ครั้ง'
        : `⚠️ คำเตือนความปลอดภัยครั้งที่ ${strikes}/3: ห้ามพยายามเจาะระบบหรือแกะโค้ด`,
      threatId: threatRecord.id,
    });
  } catch (err) {
    console.error('[Security Threat Route] Error recording threat:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเหตุการณ์ความปลอดภัย' });
  }
});

// Rate limiting tracker for passcode brute-force protection
const passcodeAttempts = new Map(); // ip -> { count, lockedUntil }

// 2. VERIFY PASSCODE (For admins accessing the encrypted section)
router.post('/verify-passcode', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const attempt = passcodeAttempts.get(ip) || { count: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > now) {
      const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({
        valid: false,
        message: `⚠️ คุณใส่รหัสผิดเกินกำหนด กรุณารออีก ${waitSec} วินาที ก่อนลองใหม่อีกครั้ง`
      });
    }

    const { passcode } = req.body;
    const activePasscode = await getSuperAdminPasscode();
    if (passcode && passcode.toString().trim() === activePasscode) {
      passcodeAttempts.delete(ip);
      return res.json({ valid: true, message: 'ยืนยันรหัสความปลอดภัยสำเร็จ' });
    }

    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + 5 * 60 * 1000; // lock for 5 minutes
      passcodeAttempts.set(ip, attempt);
      return res.status(429).json({
        valid: false,
        message: '⚠️ ใส่รหัสผิดครบ 5 ครั้ง ระบบถูกล็อกชั่วคราวเป็นเวลา 5 นาที'
      });
    }
    passcodeAttempts.set(ip, attempt);

    return res.status(401).json({
      valid: false,
      message: `รหัสผ่านความปลอดภัยไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - attempt.count} ครั้ง)`
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' });
  }
});

// 3. GET / PUT PASSCODE (SuperAdmin Only)
router.get('/passcode', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'เฉพาะ SuperAdmin เท่านั้นที่สามารถดูรหัสผ่านความปลอดภัยนี้ได้' });
    }
    const passcode = await getSuperAdminPasscode();
    res.json({ passcode });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/passcode/generate', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'เฉพาะ SuperAdmin เท่านั้นที่สามารถสร้างรหัสใหม่ได้' });
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let newCode = 'HEX-SEC-';
    for (let i = 0; i < 8; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const [setting] = await Setting.findOrCreate({
      where: { key: 'superadmin_security_passcode' },
      defaults: { key: 'superadmin_security_passcode', value: newCode }
    });
    setting.value = newCode;
    await setting.save();

    await Log.create({
      action: 'SUPERADMIN_GEN_PASSCODE',
      detail: 'สร้างรหัสผ่านความปลอดภัยใหม่สำหรับห้องควบคุมการเจาะระบบ',
      username: req.user.username,
      ip: getClientIp(req),
    });

    res.json({ passcode: newCode, message: 'สร้างรหัสผ่านความปลอดภัยใหม่สำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// 4. GET THREAT LOGS (SuperAdmin or Valid Passcode)
router.get('/threat-logs', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    const { username, threatType, limit = 100 } = req.query;
    const where = {};
    if (username && username.trim()) {
      where.username = username.trim();
    }
    if (threatType && threatType.trim()) {
      where.threatType = threatType.trim();
    }

    const logs = await SecurityThreatLog.findAll({
      where,
      order: [['id', 'DESC']],
      limit: Math.min(Number(limit) || 100, 300),
    });

    res.json({ threatLogs: logs });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการบันทึกสุ่มเสี่ยง' });
  }
});

// 5. GET THREAT LOGS FOR SPECIFIC USER
router.get('/threat-logs/user/:username', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    const { username } = req.params;
    const logs = await SecurityThreatLog.findAll({
      where: { username },
      order: [['id', 'DESC']],
      limit: 50,
    });
    res.json({ threatLogs: logs });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

// 6. BAN DIRECTLY FROM LOG (SuperAdmin or Valid Passcode)
router.post('/ban-from-log', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    const { ip, deviceId, username, banDurationType, customDate, reason } = req.body;
    const adminUsername = req.user?.username || 'SuperAdmin';
    let bannedUntil = null;

    if (banDurationType === '10years' || !banDurationType) {
      bannedUntil = calculate10YearsBanDate();
    } else if (banDurationType === 'custom' && customDate) {
      bannedUntil = new Date(customDate);
    } else if (banDurationType === 'permanent') {
      bannedUntil = null;
    } else if (banDurationType === '7days') {
      bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (banDurationType === '30days') {
      bannedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const banReason = reason || 'ระงับการใช้งานผ่านระบบตรวจจับภัยคุกคาม (Threat Log)';

    // Ban IP
    if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      await banIpImmediately(ip, banReason, adminUsername, bannedUntil);
    }

    // Ban Device
    if (deviceId && deviceId.trim()) {
      const cleanDid = deviceId.trim();
      const existingDev = await BannedDevice.findOne({ where: { deviceId: cleanDid } });
      if (existingDev) {
        await existingDev.update({
          reason: banReason,
          bannedUntil,
          bannedAt: new Date(),
          bannedBy: adminUsername,
        });
      } else {
        await BannedDevice.create({
          deviceId: cleanDid,
          reason: banReason,
          bannedUntil,
          bannedAt: new Date(),
          bannedBy: adminUsername,
        });
      }
      await refreshBannedDevices();
    }

    // Ban User
    if (username && username !== 'Anonymous') {
      const u = await User.findOne({ where: { username } });
      if (u && u.role !== 'superadmin') {
        u.isBanned = true;
        u.banReason = banReason;
        u.bannedBy = adminUsername;
        u.bannedAt = new Date();
        u.bannedUntil = bannedUntil;
        await u.save();
      }
    }

    await Log.create({
      action: 'ADMIN_BAN_FROM_THREAT_LOG',
      detail: `สั่งแบนจาก Threat Log (IP: ${ip || '-'}, เครื่อง: ${deviceId || '-'}, ผู้ใช้: ${username || '-'}) จนถึง: ${bannedUntil ? bannedUntil.toISOString() : 'ถาวร'} โดย ${adminUsername}`,
      username: adminUsername,
      ip: getClientIp(req),
    });

    res.json({
      success: true,
      message: `สั่งแบนสำเร็จเรียบร้อยแล้ว (หมดอายุ: ${bannedUntil ? bannedUntil.toLocaleString('th-TH') : 'ถาวร'})`,
      bannedUntil,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสั่งแบน: ' + err.message });
  }
});

// 7. ADVANCED BAN MANAGEMENT LIST & UPDATE
router.get('/all-active-bans', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    const [bannedIps, bannedDevices, bannedUsers] = await Promise.all([
      BannedIP.findAll({ order: [['bannedAt', 'DESC']] }),
      BannedDevice.findAll({ order: [['bannedAt', 'DESC']] }),
      User.findAll({
        where: { isBanned: true },
        attributes: ['id', 'username', 'email', 'lastIp', 'isBanned', 'banReason', 'bannedBy', 'bannedAt', 'bannedUntil'],
        order: [['bannedAt', 'DESC']]
      }),
    ]);

    res.json({
      bannedIps,
      bannedDevices,
      bannedUsers,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแบน' });
  }
});

// 8. UPDATE BAN EXPIRATION DATE
router.post('/update-ban-expiration', requireSuperAdminOrPasscode, async (req, res) => {
  try {
    const { targetType, targetId, banType, id, bannedUntil, action } = req.body; // action: 'extend10years' | 'unban' | 'setCustom'
    const effectiveType = ((targetType || banType || '').toString()).toLowerCase().trim();
    const effectiveId = targetId || id;
    const adminUsername = req.user?.username || 'SuperAdmin';

    const isUnban = action === 'unban' || (bannedUntil && new Date(bannedUntil) <= new Date());
    let newDate = null;
    if (action === 'extend10years') {
      newDate = calculate10YearsBanDate();
    } else if (isUnban) {
      newDate = null;
    } else if (bannedUntil) {
      newDate = new Date(bannedUntil);
    }

    if (effectiveType === 'ip') {
      const record = await BannedIP.findByPk(effectiveId);
      if (!record) return res.status(404).json({ message: 'ไม่พบ IP นี้' });
      const targetIp = record.ip;
      if (isUnban) {
        await record.destroy();
        clearIpJail(targetIp);
        // Also unban any users linked to this IP
        const usersToUnban = await User.findAll({
          where: {
            isBanned: true,
            [Op.or]: [{ lastIp: targetIp }, { registerIp: targetIp }]
          }
        });
        for (const u of usersToUnban) {
          u.isBanned = false;
          u.banReason = null;
          u.bannedBy = null;
          u.bannedAt = null;
          u.bannedUntil = null;
          await u.save();
        }
      } else {
        record.bannedUntil = newDate;
        await record.save();
      }
      await refreshBannedIps();
    } else if (effectiveType === 'device') {
      const record = await BannedDevice.findByPk(effectiveId);
      if (!record) return res.status(404).json({ message: 'ไม่พบอุปกรณ์นี้' });
      if (isUnban) {
        await record.destroy();
      } else {
        record.bannedUntil = newDate;
        await record.save();
      }
      await refreshBannedDevices();
    } else if (effectiveType === 'user') {
      const user = await User.findByPk(effectiveId);
      if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });
      if (isUnban) {
        user.isBanned = false;
        user.banReason = null;
        user.bannedUntil = null;
        user.bannedBy = null;
        user.bannedAt = null;
        // Also unban user's IP from BannedIP
        const ipsToUnban = new Set();
        if (user.lastIp && user.lastIp !== '127.0.0.1') ipsToUnban.add(user.lastIp);
        if (user.registerIp && user.registerIp !== '127.0.0.1') ipsToUnban.add(user.registerIp);
        for (const ip of ipsToUnban) {
          await BannedIP.destroy({ where: { ip } });
          clearIpJail(ip);
        }
        await refreshBannedIps();
      } else {
        user.bannedUntil = newDate;
        user.isBanned = true;
      }
      await user.save();
    }

    await Log.create({
      action: 'ADMIN_UPDATE_BAN_EXPIRATION',
      detail: `ปรับปรุงเวลาปลดแบน ${effectiveType} ID ${effectiveId} เป็น: ${newDate ? newDate.toISOString() : (isUnban ? 'ปลดแบน' : 'ถาวร')} โดย ${adminUsername}`,
      username: adminUsername,
      ip: getClientIp(req),
    });

    res.json({ success: true, message: isUnban ? 'ปลดแบนเรียบร้อยแล้ว' : 'อัปเดตข้อมูลการแบนสำเร็จ', newBannedUntil: newDate });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

module.exports = router;
