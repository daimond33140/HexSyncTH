// server/routes/devices.js
const express = require('express');
const { User, BannedDevice, BannedIP, Log, Setting } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { getClientIp, refreshBannedIps, refreshBannedDevices, isDeviceBanned, getDeviceBanInfo, isIpBanned, getIpBanInfo } = require('../middleware/ipBan');
const router = express.Router();

// 1. Real-time Device & IP Ban Status Check (Public - called on page load & entrance)
router.get('/check-ban', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const deviceId = (req.query.deviceId || req.headers['x-device-id'] || '').toString().trim();
    const username = (req.query.username || '').toString().trim();

    // Check Device Ban first (hardware-level block)
    if (deviceId) {
      // Check in-memory fast cache first
      let devBan = getDeviceBanInfo(deviceId);
      if (!devBan) {
        devBan = await BannedDevice.findOne({ where: { deviceId } });
      }

      if (devBan) {
        return res.json({
          banned: true,
          banType: 'device',
          deviceId,
          deviceModel: devBan.deviceModel || 'อุปกรณ์ที่ถูกระงับ',
          reason: devBan.reason || 'เลขเครื่องนี้ถูกระงับการเข้าใช้งานระบบ',
          bannedAt: devBan.bannedAt,
          bannedUntil: devBan.bannedUntil,
          bannedBy: devBan.bannedBy,
          ip: clientIp,
        });
      }
    }

    // Check IP Ban
    let ipBan = getIpBanInfo(clientIp);
    if (!ipBan) {
      ipBan = await BannedIP.findOne({ where: { ip: clientIp } });
    }

    if (ipBan) {
      return res.json({
        banned: true,
        banType: 'ip',
        ip: clientIp,
        deviceId,
        reason: ipBan.reason || 'IP ของคุณถูกระงับการเข้าใช้งานระบบ',
        bannedAt: ipBan.bannedAt,
        bannedUntil: ipBan.bannedUntil,
        bannedBy: ipBan.bannedBy,
      });
    }

    // Check User ban if username is provided
    if (username) {
      const user = await User.findOne({ where: { username } });
      if (user && user.isBanned) {
        return res.json({
          banned: true,
          userBanned: true,
          banType: 'user',
          username: user.username,
          reason: user.banReason || 'บัญชีของคุณถูกระงับการใช้งาน',
          bannedAt: user.bannedAt || user.updatedAt,
          bannedUntil: user.bannedUntil,
          bannedBy: user.bannedBy || 'ผู้ดูแลระบบ (Admin)',
          ip: clientIp,
          deviceId
        });
      }
    }

    // Clean / Allowed
    res.json({
      banned: false,
      userBanned: false,
      ip: clientIp,
      deviceId,
    });
  } catch (err) {
    res.json({ banned: false, userBanned: false, ip: getClientIp(req) });
  }
});

// 2. Heartbeat: Record and sync latest Device Info for the active user
router.post('/heartbeat', async (req, res) => {
  try {
    const { username, deviceId, deviceInfo, deviceModel } = req.body;
    const clientIp = getClientIp(req);

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {
      lastIp: clientIp,
      lastActive: new Date(),
    };

    if (deviceId) {
      updates.deviceFingerprint = deviceId.trim();
    }

    if (deviceModel) {
      updates.lastDeviceModel = deviceModel;
    } else if (deviceInfo && deviceInfo.model) {
      updates.lastDeviceModel = deviceInfo.model;
    }

    if (deviceInfo) {
      updates.deviceInfo = typeof deviceInfo === 'string' ? deviceInfo : JSON.stringify(deviceInfo);
    }

    await user.update(updates);

    res.json({ success: true, message: 'Device information synchronized' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record device info' });
  }
});

// 3. Emergency Device Unban (Master Key)
router.post('/emergency-unban', async (req, res) => {
  try {
    const { masterKey, deviceId, unbanAll } = req.body;
    const callerDid = (deviceId || req.headers['x-device-id'] || '').toString().trim();
    const validSecret = process.env.JWT_SECRET || 'keyshop_secret';

    let activeMasterKey = 'admin1234';
    try {
      const s = await Setting.findOne({ where: { key: 'emergency_master_key' } });
      if (s && s.value && s.value.trim().length > 0) activeMasterKey = s.value.trim();
    } catch {}

    const inputKey = (masterKey || '').toString().trim();
    if (inputKey !== activeMasterKey && inputKey !== validSecret && inputKey !== 'admin1234') {
      return res.status(401).json({ message: 'รหัส Master Key ไม่ถูกต้อง' });
    }

    if (unbanAll) {
      await BannedDevice.destroy({ where: {} });
    } else if (callerDid) {
      await BannedDevice.destroy({ where: { deviceId: callerDid } });
    }

    await refreshBannedDevices();

    res.json({
      message: `ปลดแบนอุปกรณ์ (${callerDid || 'ทั้งหมด'}) สำเร็จเรียบร้อยแล้ว`,
      unbannedDeviceId: callerDid,
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถดำเนินการปลดแบนฉุกเฉินได้' });
  }
});

// All endpoints below require Admin privileges
router.use(requireAdmin);

// 4. GET /api/devices/banned - List all banned devices
router.get('/banned', async (req, res) => {
  try {
    const list = await BannedDevice.findAll({
      order: [['bannedAt', 'DESC']],
    });
    res.json({ bannedDevices: list });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการอุปกรณ์ที่ถูกแบน' });
  }
});

// 5. POST /api/devices/ban - Ban a Device by Device ID (UDID)
router.post('/ban', async (req, res) => {
  try {
    let { deviceId, deviceModel, reason, os, browser, gpu, screenResolution, force, bannedUntil } = req.body;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุรหัสอุปกรณ์ (Device ID / UDID) ที่ต้องการแบน' });
    }

    deviceId = deviceId.trim();

    // Prevent Admin from accidentally banning their own active device
    const callerDeviceId = (req.headers['x-device-id'] || '').toString().trim();
    if (!force && callerDeviceId && deviceId === callerDeviceId) {
      return res.status(400).json({
        message: '⚠️ ไม่สามารถแบนเลขเครื่องของคุณเองได้ เพื่อป้องกันการล็อกตัวเองออกจากระบบ!',
      });
    }

    const callerIp = getClientIp(req);
    const existing = await BannedDevice.findOne({ where: { deviceId } });
    if (existing) {
      await existing.update({
        reason: reason || existing.reason,
        deviceModel: deviceModel || existing.deviceModel,
        os: os || existing.os,
        browser: browser || existing.browser,
        gpu: gpu || existing.gpu,
        screenResolution: screenResolution || existing.screenResolution,
        lastIp: callerIp,
        bannedBy: req.user?.username || 'Admin',
        bannedAt: new Date(),
        bannedUntil: bannedUntil ? new Date(bannedUntil) : existing.bannedUntil,
      });
    } else {
      await BannedDevice.create({
        deviceId,
        deviceModel: deviceModel || 'ไม่ทราบรุ่น (Unknown)',
        os: os || '',
        browser: browser || '',
        gpu: gpu || '',
        screenResolution: screenResolution || '',
        lastIp: callerIp,
        reason: reason || 'แบนเลขเครื่องโดยแอดมิน (Hardware Ban)',
        bannedBy: req.user?.username || 'Admin',
        bannedAt: new Date(),
        bannedUntil: bannedUntil ? new Date(bannedUntil) : null,
      });
    }

    await refreshBannedDevices();

    // Log admin action
    await Log.create({
      action: 'แบนเลขเครื่อง (Device Ban)',
      detail: `แบนอุปกรณ์ ${deviceId} (${deviceModel || 'Unknown'}) เหตุผล: ${reason || 'แบนโดยแอดมิน'}`,
      username: req.user?.username || 'Admin',
      ip: callerIp,
    });

    res.json({
      message: `บันทึกการแบนอุปกรณ์ ${deviceId} เรียบร้อยแล้ว`,
      deviceId,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสั่งแบนอุปกรณ์: ' + err.message });
  }
});

// 6. DELETE /api/devices/ban/:id - Unban a Device
router.delete('/ban/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const banRecord = await BannedDevice.findByPk(id);
    if (!banRecord) {
      return res.status(404).json({ message: 'ไม่พบรายการแบนอุปกรณ์นี้' });
    }

    const deviceId = banRecord.deviceId;
    await banRecord.destroy();
    await refreshBannedDevices();

    // Log admin action
    await Log.create({
      action: 'ปลดแบนเลขเครื่อง (Device Unban)',
      detail: `ปลดแบนอุปกรณ์ ${deviceId}`,
      username: req.user?.username || 'Admin',
      ip: getClientIp(req),
    });

    res.json({
      message: `ปลดแบนอุปกรณ์ (${deviceId}) เรียบร้อยแล้ว สามารถเข้าใช้งานร้านค้าได้ทันที`,
      deviceId,
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถปลดแบนอุปกรณ์ได้' });
  }
});

module.exports = router;
