// server/routes/devices.js
const express = require('express');
const { User, BannedDevice, BannedIP, Log, Setting, UserDevice } = require('../models');
const { Op } = require('sequelize');
const { requireAdmin, verifyToken } = require('../middleware/auth');
const { getClientIp, refreshBannedIps, refreshBannedDevices, isDeviceBanned, getDeviceBanInfo, isIpBanned, getIpBanInfo, isVpnOrProxy, checkIpVpnStatus, refreshVpnSetting, refreshAllBans } = require('../middleware/ipBan');
const router = express.Router();

// 1. Real-time Device & IP Ban Status Check (Public - called on page load & entrance)
router.get('/check-ban', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const deviceId = (req.query.deviceId || req.headers['x-device-id'] || '').toString().trim();
    const hardwareHash = (req.query.hardwareHash || req.headers['x-hardware-hash'] || '').toString().trim();
    const username = (req.query.username || '').toString().trim();
    const deviceModel = (req.query.deviceModel || '').toString().trim();

    // A. Check Hardware / Device Ban
    let devBan = getDeviceBanInfo(deviceId, hardwareHash);
    if (!devBan && (deviceId || hardwareHash)) {
      const orConditions = [];
      if (deviceId) orConditions.push({ deviceId });
      if (hardwareHash) orConditions.push({ hardwareHash });
      devBan = await BannedDevice.findOne({ where: { [Op.or]: orConditions } });
    }

    if (devBan) {
      return res.json({
        banned: true,
        banType: 'device',
        deviceId: devBan.deviceId || deviceId,
        hardwareHash: devBan.hardwareHash || hardwareHash,
        deviceModel: devBan.deviceModel || 'อุปกรณ์นี้ถูกระงับการใช้งาน',
        reason: devBan.reason || 'อุปกรณ์ของคุณถูกระงับการเข้าใช้งานถาวรระดับฮาร์ดแวร์',
        bannedAt: devBan.bannedAt,
        bannedUntil: devBan.bannedUntil,
        bannedBy: devBan.bannedBy,
        ip: clientIp,
      });
    }

    // B. Check IP Ban
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
        hardwareHash,
        reason: ipBan.reason || 'IP ของคุณถูกระงับการเข้าสู่ระบบ',
        bannedAt: ipBan.bannedAt,
        bannedUntil: ipBan.bannedUntil,
        bannedBy: ipBan.bannedBy,
      });
    }

    // C. Check VPN / Proxy ONLY if admin explicitly enabled block_vpn_proxy
    try {
      const vpnSetting = await Setting.findOne({ where: { key: 'block_vpn_proxy' } });
      const isVpnBlockOn = vpnSetting && vpnSetting.value === 'true';
      if (isVpnBlockOn) {
        const isDatacenterVpn = await checkIpVpnStatus(clientIp);
        if (isDatacenterVpn) {
          return res.json({
            banned: true,
            banType: 'vpn',
            ip: clientIp,
            deviceId,
            hardwareHash,
            reason: 'ตรวจพบการใช้งาน VPN หรือ Datacenter Proxy กรุณาปิด VPN ก่อนเข้าใช้งานเว็บไซต์',
          });
        }
      }
    } catch {}

    // D. Check User ban if username is provided
    let isUserBanned = false;
    if (username) {
      const user = await User.findOne({ where: { username } });
      if (user && user.isBanned) {
        isUserBanned = true;
        return res.json({
          banned: true,
          userBanned: true,
          banType: 'user',
          username: user.username,
          reason: user.banReason || 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน',
          bannedAt: user.bannedAt || user.updatedAt,
          bannedUntil: user.bannedUntil,
          bannedBy: user.bannedBy || 'ผู้ดูแลระบบ (Admin)',
          ip: clientIp,
          deviceId,
          hardwareHash
        });
      }
    }

    // E. Record / Update into UserDevice table asynchronously (Keep fresh device history)
    if (deviceId || hardwareHash) {
      (async () => {
        try {
          const lookup = [];
          if (deviceId) lookup.push({ deviceId });
          if (hardwareHash) lookup.push({ hardwareHash });

          let existingDev = await UserDevice.findOne({ where: { [Op.or]: lookup } });
          const isVpnNow = isVpnOrProxy(req);

          if (existingDev) {
            await existingDev.update({
              lastIp: clientIp,
              lastSeen: new Date(),
              username: username || existingDev.username,
              deviceModel: deviceModel || existingDev.deviceModel,
              hardwareHash: hardwareHash || existingDev.hardwareHash,
              isVpn: isVpnNow,
            });
          } else {
            await UserDevice.create({
              username: username || 'Guest',
              deviceId: deviceId || `HEX-DID-${Date.now()}`,
              hardwareHash: hardwareHash || null,
              deviceModel: deviceModel || 'Unknown Device',
              lastIp: clientIp,
              isVpn: isVpnNow,
              firstSeen: new Date(),
              lastSeen: new Date(),
            });
          }
        } catch {}
      })();
    }

    // Clean / Allowed
    res.json({
      banned: false,
      userBanned: false,
      ip: clientIp,
      deviceId,
      hardwareHash
    });
  } catch (err) {
    res.json({ banned: false, userBanned: false, ip: getClientIp(req) });
  }
});

// 2. Heartbeat: Record and sync latest Device Info for the active user (Requires valid JWT)
router.post('/heartbeat', verifyToken, async (req, res) => {
  try {
    const { username, deviceId, deviceInfo, deviceModel } = req.body;
    const clientIp = getClientIp(req);

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Cannot update another user heartbeat' });
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

    // Upsert UserDevice from heartbeat
    try {
      const hwHash = (req.body.hardwareHash || req.headers['x-hardware-hash'] || '').toString().trim();
      const devType = (deviceInfo && deviceInfo.deviceType) || 'desktop';
      const osName = (deviceInfo && deviceInfo.os) || '';
      const browserName = (deviceInfo && deviceInfo.browser) || '';
      const gpuName = (deviceInfo && (deviceInfo.gpuRenderer || deviceInfo.gpu)) || '';
      const screenRes = (deviceInfo && deviceInfo.screenResolution) || '';

      const whereCond = [];
      if (deviceId) whereCond.push({ deviceId });
      if (hwHash) whereCond.push({ hardwareHash: hwHash });

      let uDev = whereCond.length > 0 ? await UserDevice.findOne({ where: { [Op.or]: whereCond } }) : null;
      if (uDev) {
        await uDev.update({
          userId: user.id,
          username: user.username,
          deviceModel: deviceModel || (deviceInfo && deviceInfo.model) || uDev.deviceModel,
          deviceType: devType,
          os: osName || uDev.os,
          browser: browserName || uDev.browser,
          gpuRenderer: gpuName || uDev.gpuRenderer,
          screenResolution: screenRes || uDev.screenResolution,
          lastIp: clientIp,
          hardwareHash: hwHash || uDev.hardwareHash,
          lastSeen: new Date(),
        });
      } else if (deviceId) {
        await UserDevice.create({
          userId: user.id,
          username: user.username,
          deviceId: deviceId.trim(),
          hardwareHash: hwHash || null,
          deviceModel: deviceModel || (deviceInfo && deviceInfo.model) || 'Unknown Device',
          deviceType: devType,
          os: osName,
          browser: browserName,
          gpuRenderer: gpuName,
          screenResolution: screenRes,
          lastIp: clientIp,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
      }
    } catch (e) {
      console.error('[Heartbeat] Error updating UserDevice:', e.message);
    }

    res.json({ success: true, message: 'Device information synchronized' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record device info' });
  }
});

// Rate-limiting tracker for device emergency unban
const devUnbanAttempts = new Map(); // ip -> { count, lockedUntil }

// 3. Emergency Device Unban (Master Key Only)
router.post('/emergency-unban', async (req, res) => {
  try {
    const callerIp = getClientIp(req);
    const now = Date.now();
    const attempt = devUnbanAttempts.get(callerIp) || { count: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > now) {
      const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({
        message: `⚠️ ใส่ Master Key ผิดเกินกำหนด กรุณารออีก ${waitSec} วินาที ก่อนลองใหม่อีกครั้ง`
      });
    }

    const { masterKey, deviceId, unbanAll } = req.body;
    const callerDid = (deviceId || req.headers['x-device-id'] || '').toString().trim();

    let activeMasterKey = process.env.EMERGENCY_MASTER_KEY || null;
    try {
      const s = await Setting.findOne({ where: { key: 'emergency_master_key' } });
      if (s && s.value && s.value.trim().length > 0) activeMasterKey = s.value.trim();
    } catch {}

    const inputKey = (masterKey || '').toString().trim();
    const isMasterValid = Boolean(activeMasterKey && inputKey === activeMasterKey);
    if (!inputKey || !isMasterValid) {
      attempt.count += 1;
      if (attempt.count >= 5) {
        attempt.lockedUntil = now + 15 * 60 * 1000;
        devUnbanAttempts.set(callerIp, attempt);
        return res.status(429).json({ message: '⚠️ ใส่ Master Key ผิดครบ 5 ครั้ง ระบบถูกล็อกชั่วคราวเป็นเวลา 15 นาที' });
      }
      devUnbanAttempts.set(callerIp, attempt);
      return res.status(401).json({ message: `รหัส Master Key ไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - attempt.count} ครั้ง)` });
    }

    devUnbanAttempts.delete(callerIp);

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

// Public GET /api/devices/vpn-status - Get current VPN defense status (Instant Sync)
router.get('/vpn-status', async (req, res) => {
  try {
    const s = await Setting.findOne({ where: { key: 'block_vpn_proxy' } });
    res.json({ blockVpn: s ? s.value === 'true' : false });
  } catch (err) {
    res.json({ blockVpn: false });
  }
});

// All endpoints below require Admin privileges
router.use(requireAdmin);


// 3.1 GET /api/devices/user-devices/:username - List all connected devices for a user
router.get('/user-devices/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    let devices = await UserDevice.findAll({
      where: { username },
      order: [['lastSeen', 'DESC']],
    });

    // If UserDevice has no records yet, check if User table has legacy device info
    if (devices.length === 0) {
      const u = await User.findOne({ where: { username } });
      if (u && u.deviceFingerprint) {
        let parsed = null;
        try { parsed = JSON.parse(u.deviceInfo); } catch {}
        const legacyRecord = await UserDevice.create({
          userId: u.id,
          username: u.username,
          deviceId: u.deviceFingerprint,
          deviceModel: u.lastDeviceModel || (parsed && parsed.model) || 'Unknown Device',
          deviceType: (parsed && parsed.deviceType) || 'desktop',
          os: (parsed && parsed.os) || '',
          browser: (parsed && parsed.browser) || '',
          gpuRenderer: (parsed && (parsed.gpuRenderer || parsed.gpu)) || '',
          screenResolution: (parsed && parsed.screenResolution) || '',
          lastIp: u.lastIp || '127.0.0.1',
          firstSeen: u.createdAt || new Date(),
          lastSeen: u.lastActive || new Date(),
        });
        devices = [legacyRecord];
      }
    }

    res.json({ devices, total: devices.length });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user devices: ' + err.message });
  }
});

// 3.2 POST /api/devices/ban-all-user-devices - Nuclear Ban all devices of a specific user
router.post('/ban-all-user-devices', async (req, res) => {
  try {
    const { username, reason } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Protect SuperAdmin
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Cannot ban SuperAdmin devices' });
    }

    const banReasonText = reason || `แบนอุปกรณ์ทั้งหมดของ @${username} โดย ${req.user.username}`;
    const adminUsername = req.user.username || 'Admin';

    // 1. Find all devices associated with this user
    const devices = await UserDevice.findAll({ where: { username } });

    // Also include the deviceFingerprint on User model if not in UserDevice
    const deviceIdSet = new Set();
    const hwHashSet = new Set();
    const ipsToBan = new Set();

    if (user.lastIp && user.lastIp !== '127.0.0.1') ipsToBan.add(user.lastIp);
    if (user.registerIp && user.registerIp !== '127.0.0.1') ipsToBan.add(user.registerIp);

    if (user.deviceFingerprint) {
      deviceIdSet.add({
        deviceId: user.deviceFingerprint,
        deviceModel: user.lastDeviceModel || 'Unknown Device'
      });
    }

    devices.forEach(d => {
      if (d.deviceId) deviceIdSet.add({ deviceId: d.deviceId, deviceModel: d.deviceModel, hardwareHash: d.hardwareHash, os: d.os, browser: d.browser, gpu: d.gpuRenderer });
      if (d.hardwareHash) hwHashSet.add(d.hardwareHash);
      if (d.lastIp && d.lastIp !== '127.0.0.1') ipsToBan.add(d.lastIp);
    });

    let bannedCount = 0;
    for (const d of deviceIdSet) {
      await BannedDevice.findOrCreate({
        where: { deviceId: d.deviceId },
        defaults: {
          deviceId: d.deviceId,
          hardwareHash: d.hardwareHash || null,
          deviceModel: d.deviceModel || 'Unknown Device',
          os: d.os || '',
          browser: d.browser || '',
          gpu: d.gpu || '',
          reason: banReasonText,
          bannedBy: adminUsername,
          bannedAt: new Date(),
        }
      });
      bannedCount++;
    }

    // 2. Mark all UserDevice records as banned
    await UserDevice.update(
      { isBanned: true, banReason: banReasonText, bannedAt: new Date(), bannedBy: adminUsername },
      { where: { username } }
    );

    // 3. Ban all unique IPs associated with this user
    let bannedIpCount = 0;
    for (const ip of ipsToBan) {
      await BannedIP.findOrCreate({
        where: { ip },
        defaults: {
          ip,
          reason: banReasonText,
          bannedBy: adminUsername,
          bannedAt: new Date(),
        }
      });
      bannedIpCount++;
    }

    // 4. Ban the user account itself
    await user.update({
      isBanned: true,
      banReason: banReasonText,
      bannedBy: adminUsername,
      bannedAt: new Date()
    });

    await refreshAllBans();

    // Audit log
    await Log.create({
      action: 'แบนอุปกรณ์ทั้งหมด (Ban All User Devices)',
      detail: `แบนอุปกรณ์ทั้งหมด ${bannedCount} เครื่อง และ ${bannedIpCount} IP ของ @${username}`,
      username: adminUsername,
      ip: getClientIp(req),
    });

    res.json({
      success: true,
      message: `แบนอุปกรณ์ทั้งหมดสำเร็จ (${bannedCount} อุปกรณ์, ${bannedIpCount} IP) และระงับบัญชี @${username} เรียบร้อยแล้ว`,
      bannedCount,
      bannedIpCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error banning all user devices: ' + err.message });
  }
});



// 3.4 POST /api/devices/toggle-vpn-block - Toggle VPN & Proxy blocking
router.post('/toggle-vpn-block', async (req, res) => {
  try {
    const { enabled } = req.body;
    const val = enabled ? 'true' : 'false';
    const [s] = await Setting.findOrCreate({
      where: { key: 'block_vpn_proxy' },
      defaults: { key: 'block_vpn_proxy', value: val }
    });
    await s.update({ value: val });
    await refreshVpnSetting();

    await Log.create({
      action: 'ตั้งค่าระบบความปลอดภัย (Security Setting)',
      detail: `${enabled ? 'เปิด' : 'ปิด'}การบล็อก VPN & Proxy ทั้งระบบ`,
      username: req.user?.username || 'Admin',
      ip: getClientIp(req),
    });

    res.json({
      success: true,
      blockVpn: enabled,
      message: enabled ? 'เปิดใช้งานระบบบล็อก VPN & Proxy ทั้งระบบแล้ว' : 'ปิดระบบบล็อก VPN & Proxy แล้ว'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling VPN block: ' + err.message });
  }
});

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
