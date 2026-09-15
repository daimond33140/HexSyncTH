// server/middleware/ipBan.js
const jwt = require('jsonwebtoken');
const { BannedIP, BannedDevice, WhitelistedIP } = require('../models');

// Fast in-memory maps for 0ms lookup per request
const bannedIpMap = new Map();
const bannedDeviceMap = new Map();
const whitelistedIpMap = new Map();
let isInitialized = false;

// Refresh in-memory Whitelisted IPs
async function refreshWhitelistedIps() {
  try {
    const list = await WhitelistedIP.findAll();
    whitelistedIpMap.clear();
    list.forEach((item) => {
      if (item.ip) {
        whitelistedIpMap.set(item.ip.trim(), {
          note: item.note || 'Trusted Network',
          addedBy: item.addedBy || 'Admin',
          createdAt: item.createdAt,
        });
      }
    });
    console.log(`[Security Firewall] Synced ${whitelistedIpMap.size} whitelisted IP(s) into memory cache.`);
  } catch (err) {
    console.error('[Security Firewall] Error refreshing whitelisted IPs:', err.message);
  }
}

// Refresh in-memory banned IPs
async function refreshBannedIps() {
  try {
    const list = await BannedIP.findAll();
    bannedIpMap.clear();
    const now = new Date();
    for (const item of list) {
      if (item.ip) {
        // If ban has expired, auto-remove
        if (item.bannedUntil && new Date(item.bannedUntil) <= now) {
          BannedIP.destroy({ where: { id: item.id } }).catch(() => {});
          continue;
        }
        bannedIpMap.set(item.ip.trim(), {
          reason: item.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
          bannedAt: item.bannedAt,
          bannedUntil: item.bannedUntil,
          bannedBy: item.bannedBy || 'Admin',
        });
      }
    }
    console.log(`[Security Firewall] Synced ${bannedIpMap.size} banned IP(s) into memory cache.`);
  } catch (err) {
    console.error('[Security Firewall] Error refreshing banned IPs:', err.message);
  }
}

// Refresh in-memory banned Devices
async function refreshBannedDevices() {
  try {
    const list = await BannedDevice.findAll();
    bannedDeviceMap.clear();
    const now = new Date();
    for (const item of list) {
      if (item.deviceId) {
        // If ban has expired, auto-remove
        if (item.bannedUntil && new Date(item.bannedUntil) <= now) {
          BannedDevice.destroy({ where: { id: item.id } }).catch(() => {});
          continue;
        }
        bannedDeviceMap.set(item.deviceId.trim(), {
          deviceId: item.deviceId.trim(),
          deviceModel: item.deviceModel,
          reason: item.reason || 'เลขเครื่องนี้ถูกระงับการเข้าใช้งานระบบ',
          bannedAt: item.bannedAt,
          bannedUntil: item.bannedUntil,
          bannedBy: item.bannedBy || 'Admin',
        });
      }
    }
    console.log(`[Security Firewall] Synced ${bannedDeviceMap.size} banned Device(s) into memory cache.`);
  } catch (err) {
    console.error('[Security Firewall] Error refreshing banned Devices:', err.message);
  }
}

async function refreshAllBans() {
  await Promise.all([refreshBannedIps(), refreshBannedDevices(), refreshWhitelistedIps()]);
  isInitialized = true;
}

function isIpWhitelisted(ip) {
  if (!ip) return false;
  const clean = ip.trim().replace('::ffff:', '');
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  return whitelistedIpMap.has(clean);
}

// Initial sync
refreshAllBans();

function isIpBanned(ip) {
  if (!ip) return false;
  return bannedIpMap.has(ip.trim());
}

function getIpBanInfo(ip) {
  if (!ip) return null;
  return bannedIpMap.get(ip.trim()) || null;
}

function isDeviceBanned(deviceId) {
  if (!deviceId) return false;
  return bannedDeviceMap.has(deviceId.trim());
}

function getDeviceBanInfo(deviceId) {
  if (!deviceId) return null;
  return bannedDeviceMap.get(deviceId.trim()) || null;
}

// Robust client IP extraction supporting Cloudflare, Nginx, Proxies, and Direct connection
function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string' && cfIp.trim().length > 0) {
    return cfIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }
  const rawIp = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  if (typeof rawIp === 'string' && rawIp.startsWith('::ffff:')) {
    return rawIp.replace('::ffff:', '');
  }
  return rawIp;
}

// IP & Device Ban Enforcement Middleware
async function ipBanMiddleware(req, res, next) {
  const ip = getClientIp(req);
  req.clientIp = ip;

  const deviceId = (req.headers['x-device-id'] || req.query.deviceId || '').toString().trim();
  req.deviceId = deviceId;

  if (!isInitialized) {
    await refreshAllBans();
  }

  // Whitelist bypass: If IP is whitelisted, skip all ban checks
  if (isIpWhitelisted(ip)) {
    return next();
  }

  // 1. Whitelist endpoints for real-time status check and emergency unban
  const path = req.path || '';
  if (
    path.startsWith('/api/banned-ips/check-my-ip') ||
    path.startsWith('/api/banned-ips/my-ip') ||
    path.startsWith('/api/banned-ips/emergency-unban') ||
    path.startsWith('/api/devices/check-ban') ||
    path.startsWith('/api/devices/emergency-unban')
  ) {
    return next();
  }

  // 2. Admin Safety Bypass: If request has valid Admin Token, confirm against database
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keyshop_secret');
      if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
        const dbAdmin = await User.findByPk(decoded.id);
        if (dbAdmin && !dbAdmin.isBanned && (dbAdmin.role === 'admin' || dbAdmin.role === 'superadmin')) {
          req.isAdmin = true;
          return next(); // Genuine Admin always allowed
        }
      }
    } catch {}
  }

  const now = new Date();

  // 3. Check if Device ID is in the banned devices map (Hardware Lock)
  let devBanInfo = deviceId ? bannedDeviceMap.get(deviceId) : null;
  if (deviceId && !devBanInfo) {
    try {
      const dbDev = await BannedDevice.findOne({ where: { deviceId } });
      if (dbDev) {
        // Auto unban if expired
        if (dbDev.bannedUntil && new Date(dbDev.bannedUntil) <= now) {
          await dbDev.destroy();
          devBanInfo = null;
        } else {
          devBanInfo = {
            deviceId,
            deviceModel: dbDev.deviceModel,
            reason: dbDev.reason || 'เลขเครื่องนี้ถูกระงับการเข้าใช้งานระบบ',
            bannedAt: dbDev.bannedAt,
            bannedUntil: dbDev.bannedUntil,
            bannedBy: dbDev.bannedBy || 'Admin',
          };
          bannedDeviceMap.set(deviceId, devBanInfo);
        }
      }
    } catch {}
  }
  if (devBanInfo) {
    if (devBanInfo.bannedUntil && new Date(devBanInfo.bannedUntil) <= now) {
      bannedDeviceMap.delete(deviceId);
      BannedDevice.destroy({ where: { deviceId } }).catch(() => {});
    } else {
      return res.status(403).json({
        message: `อุปกรณ์ (${devBanInfo.deviceModel || deviceId}) ของคุณถูกระงับการใช้งานในระบบ HexSyncTH`,
        banned: true,
        banType: 'device',
        deviceId,
        deviceModel: devBanInfo.deviceModel,
        reason: devBanInfo.reason || 'เลขเครื่องนี้ถูกระงับการเข้าใช้งานระบบ',
        bannedAt: devBanInfo.bannedAt,
        bannedUntil: devBanInfo.bannedUntil,
        bannedBy: devBanInfo.bannedBy,
      });
    }
  }

  // 4. Check if IP is in the banned IP map
  let ipBanInfo = bannedIpMap.get(ip);
  if (!ipBanInfo) {
    try {
      const dbRecord = await BannedIP.findOne({ where: { ip } });
      if (dbRecord) {
        if (dbRecord.bannedUntil && new Date(dbRecord.bannedUntil) <= now) {
          await dbRecord.destroy();
          ipBanInfo = null;
        } else {
          ipBanInfo = {
            reason: dbRecord.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
            bannedAt: dbRecord.bannedAt,
            bannedUntil: dbRecord.bannedUntil,
            bannedBy: dbRecord.bannedBy || 'Admin',
          };
          bannedIpMap.set(ip, ipBanInfo);
        }
      }
    } catch {}
  }
  if (ipBanInfo) {
    if (ipBanInfo.bannedUntil && new Date(ipBanInfo.bannedUntil) <= now) {
      bannedIpMap.delete(ip);
      BannedIP.destroy({ where: { ip } }).catch(() => {});
    } else {
      return res.status(403).json({
        message: `IP (${ip}) ของคุณถูกระงับการใช้งานในระบบ HexSyncTH`,
        banned: true,
        banType: 'ip',
        bannedIp: ip,
        reason: ipBanInfo.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
        bannedAt: ipBanInfo.bannedAt,
        bannedUntil: ipBanInfo.bannedUntil,
        bannedBy: ipBanInfo.bannedBy,
      });
    }
  }

  next();
}

/**
 * Instantly ban an IP in-memory (0ms) and persist to Database with optional bannedUntil
 */
async function banIpImmediately(ip, reason = 'ละเมิดความปลอดภัยของระบบ', bannedBy = 'HexSyncTH Security MAX', bannedUntil = null) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || isIpWhitelisted(ip)) return;
  const cleanIp = ip.trim().replace('::ffff:', '');
  const banInfo = {
    reason,
    bannedAt: new Date(),
    bannedUntil: bannedUntil || null,
    bannedBy
  };
  // 1. Instant in-memory cache update
  bannedIpMap.set(cleanIp, banInfo);

  // 2. Persist to Postgres database
  try {
    const existing = await BannedIP.findOne({ where: { ip: cleanIp } });
    if (existing) {
      await existing.update(banInfo);
    } else {
      await BannedIP.create({
        ip: cleanIp,
        reason,
        bannedBy,
        bannedAt: banInfo.bannedAt,
        bannedUntil: banInfo.bannedUntil,
      });
    }
    console.warn(`[Security Firewall] 🚨 BANNED IP ${cleanIp} immediately: ${reason} (Until: ${banInfo.bannedUntil || 'Permanent'})`);
  } catch (err) {
    console.error(`[Security Firewall] Failed to persist banned IP ${cleanIp}:`, err.message);
  }
}

/**
 * Instantly ban a Device in-memory (0ms) and persist to Database with optional bannedUntil
 */
async function banDeviceImmediately(deviceId, reason = 'ละเมิดความปลอดภัยของระบบ', bannedBy = 'HexSync Honeypot Trap', bannedUntil = null, extraInfo = {}) {
  if (!deviceId || typeof deviceId !== 'string') return;
  const cleanId = deviceId.trim();
  if (!cleanId) return;

  const banInfo = {
    deviceId: cleanId,
    deviceModel: extraInfo.deviceModel || 'ไม่ทราบรุ่น (Unknown Device)',
    reason,
    bannedAt: new Date(),
    bannedUntil: bannedUntil || null,
    bannedBy,
  };

  bannedDeviceMap.set(cleanId, banInfo);

  try {
    const existing = await BannedDevice.findOne({ where: { deviceId: cleanId } });
    if (existing) {
      await existing.update({
        reason,
        bannedBy,
        bannedAt: banInfo.bannedAt,
        bannedUntil: banInfo.bannedUntil,
        lastIp: extraInfo.lastIp || existing.lastIp,
      });
    } else {
      await BannedDevice.create({
        deviceId: cleanId,
        deviceModel: extraInfo.deviceModel || 'ไม่ทราบรุ่น (Unknown Device)',
        os: extraInfo.os || null,
        browser: extraInfo.browser || null,
        gpu: extraInfo.gpu || null,
        screenResolution: extraInfo.screenResolution || null,
        lastIp: extraInfo.lastIp || null,
        reason,
        bannedBy,
        bannedAt: banInfo.bannedAt,
        bannedUntil: banInfo.bannedUntil,
      });
    }
    console.warn(`[Security Firewall] 🚨 BANNED DEVICE ${cleanId} immediately: ${reason} (Until: ${banInfo.bannedUntil || 'Permanent'})`);
  } catch (err) {
    console.error(`[Security Firewall] Failed to persist banned Device ${cleanId}:`, err.message);
  }
}

module.exports = {
  ipBanMiddleware,
  getClientIp,
  refreshBannedIps,
  refreshBannedDevices,
  refreshWhitelistedIps,
  refreshAllBans,
  isIpBanned,
  getIpBanInfo,
  isDeviceBanned,
  getDeviceBanInfo,
  isIpWhitelisted,
  banIpImmediately,
  banDeviceImmediately,
  bannedIpMap,
  bannedDeviceMap,
  whitelistedIpMap,
};

