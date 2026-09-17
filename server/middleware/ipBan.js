// server/middleware/ipBan.js
const jwt = require('jsonwebtoken');
const { BannedIP, BannedDevice, WhitelistedIP, Setting, User } = require('../models');

// Fast in-memory maps for 0ms lookup per request
const bannedIpMap = new Map();
const bannedDeviceMap = new Map();
const bannedHardwareMap = new Map();
const vpnIpCache = new Map(); // ip -> { isVpn, org, checkedAt }
let blockVpnEnabled = false;
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
    bannedHardwareMap.clear();
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
        if (item.hardwareHash && item.hardwareHash.trim().length > 0) {
          bannedHardwareMap.set(item.hardwareHash.trim(), {
            deviceId: item.deviceId.trim(),
            hardwareHash: item.hardwareHash.trim(),
            deviceModel: item.deviceModel,
            reason: item.reason || 'ระงับการเข้าถึงถาวรระดับฮาร์ดแวร์ (Hardware Ban)',
            bannedAt: item.bannedAt,
            bannedUntil: item.bannedUntil,
            bannedBy: item.bannedBy || 'Admin',
          });
        }
      }
    }
    console.log(`[Security Firewall] Synced ${bannedDeviceMap.size} banned Device(s) into memory cache.`);
  } catch (err) {
    console.error('[Security Firewall] Error refreshing banned Devices:', err.message);
  }
}


// Refresh VPN blocking configuration from settings
async function refreshVpnSetting() {
  try {
    const s = await Setting.findOne({ where: { key: 'block_vpn_proxy' } });
    blockVpnEnabled = s ? s.value === 'true' : false;
  } catch (err) {
    blockVpnEnabled = false;
  }
}

// Safe VPN, Proxy & Cloudflare 1.1.1.1 WARP Detection
const THAI_ISPS = [
  'ais', 'advanced info', 'advanced wireless', 'awn',
  'true', 'truemove', 'true internet', 'real future', 'true online',
  'dtac', 'trinet', 'total access',
  '3bb', 'triple t', 'jasmine',
  'tot', 'cat telecom', 'national telecom', 'nt broadband',
  'cs loxinfo', 'symphony', 'uih', 'proen'
];

// Direct subnets used by Cloudflare 1.1.1.1 WARP and major VPN egress
function isKnownVpnSubnet(ip) {
  if (!ip) return false;
  // Cloudflare WARP 1.1.1.1 primary egress subnets
  if (
    ip.startsWith('104.28.') ||
    ip.startsWith('8.29.') ||
    ip.startsWith('8.30.') ||
    ip.startsWith('162.158.') ||
    ip.startsWith('162.159.')
  ) {
    return true;
  }
  // Cloudflare public proxy subnets (172.64.0.0/13: 172.64. - 172.71.)
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 64 && second <= 71) return true;
  }
  return false;
}

function isVpnOrProxy(req) {
  const ip = getClientIp(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return false;
  }
  if (isKnownVpnSubnet(ip)) return true;
  if (vpnIpCache.has(ip)) {
    return vpnIpCache.get(ip).isVpn;
  }
  return false;
}

// Background asynchronous IP intelligence lookup for Datacenter / Hosting / VPN / 1.1.1.1 WARP
async function checkIpVpnStatus(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return false;
  }

  // Only bypass true RFC1918 private range (172.16.0.0 to 172.31.255.255)
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return false;
  }

  // Instant 0ms detection for Cloudflare 1.1.1.1 WARP egress subnets!
  if (isKnownVpnSubnet(ip)) {
    vpnIpCache.set(ip, { isVpn: true, org: 'Cloudflare WARP (1.1.1.1)', checkedAt: Date.now() });
    return true;
  }

  // Fast bypass for genuine Thai cellular/broadband carrier blocks (NEVER match Cloudflare)
  if (
    ip.startsWith('49.22') ||
    ip.startsWith('49.23') ||
    ip.startsWith('49.24') ||
    ip.startsWith('49.25') ||
    ip.startsWith('58.') ||
    ip.startsWith('171.') ||
    ip.startsWith('124.') ||
    ip.startsWith('180.180.') ||
    ip.startsWith('180.181.') ||
    ip.startsWith('180.182.') ||
    ip.startsWith('180.183.')
  ) {
    return false;
  }

  if (vpnIpCache.has(ip)) {
    const entry = vpnIpCache.get(ip);
    if (Date.now() - entry.checkedAt < 24 * 3600 * 1000) {
      return entry.isVpn;
    }
  }

  try {
    const http = require('http');
    return new Promise((resolve) => {
      // Use http://ip-api.com (free endpoint requires http, not https)
      const req = http.get(`http://ip-api.com/json/${ip}?fields=status,hosting,proxy,isp,org,as,countryCode`, { timeout: 2500 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status !== 'success') return resolve(false);

            const orgLower = (parsed.org || '').toLowerCase();
            const ispLower = (parsed.isp || '').toLowerCase();
            const asLower = (parsed.as || '').toLowerCase();

            // 1. Cloudflare 1.1.1.1 WARP detection
            const isCloudflareWarp = orgLower.includes('cloudflare') ||
                                    ispLower.includes('cloudflare') ||
                                    asLower.includes('as13335') ||
                                    orgLower.includes('warp');

            if (isCloudflareWarp) {
              vpnIpCache.set(ip, { isVpn: true, org: 'Cloudflare WARP (1.1.1.1)', checkedAt: Date.now() });
              return resolve(true);
            }

            // 2. Genuine Thai ISP whitelist check (Strictly checks provider names, NOT countryCode!)
            const isGenuineThaiIsp = THAI_ISPS.some(t => orgLower.includes(t) || ispLower.includes(t));
            if (isGenuineThaiIsp && !parsed.proxy && !parsed.hosting) {
              vpnIpCache.set(ip, { isVpn: false, org: parsed.org || parsed.isp || '', checkedAt: Date.now() });
              return resolve(false);
            }

            // 3. Datacenter / Hosting / Commercial Proxy detection
            const isVpn = Boolean(parsed.hosting || parsed.proxy || (!isGenuineThaiIsp && (parsed.hosting || parsed.proxy)));
            vpnIpCache.set(ip, { isVpn, org: parsed.org || parsed.isp || '', checkedAt: Date.now() });
            resolve(isVpn);
          } catch {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
}

async function refreshAllBans() {
  await Promise.all([refreshBannedIps(), refreshBannedDevices(), refreshWhitelistedIps(), refreshVpnSetting()]);
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

function isDeviceBanned(deviceId, hardwareHash) {
  if (deviceId && bannedDeviceMap.has(deviceId.trim())) return true;
  if (hardwareHash && bannedHardwareMap.has(hardwareHash.trim())) return true;
  return false;
}

function getDeviceBanInfo(deviceId, hardwareHash) {
  if (deviceId && bannedDeviceMap.has(deviceId.trim())) {
    return bannedDeviceMap.get(deviceId.trim());
  }
  if (hardwareHash && bannedHardwareMap.has(hardwareHash.trim())) {
    return bannedHardwareMap.get(hardwareHash.trim());
  }
  return null;
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
  const hardwareHash = (req.headers['x-hardware-hash'] || req.query.hardwareHash || '').toString().trim();
  req.deviceId = deviceId;
  req.hardwareHash = hardwareHash;

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
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
  let devBanInfo = (deviceId ? bannedDeviceMap.get(deviceId) : null) || (hardwareHash ? bannedHardwareMap.get(hardwareHash) : null);
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

  // 5. If blockVpnEnabled is ON, check if client IP is a VPN / Datacenter / Cloudflare 1.1.1.1 WARP
  if (blockVpnEnabled) {
    const isVpn = await checkIpVpnStatus(ip);
    if (isVpn) {
      return res.status(403).json({
        message: 'ตรวจพบการใช้งาน VPN หรือ Proxy (รวมถึง Cloudflare 1.1.1.1 WARP) กรุณาปิดโปรแกรม VPN ก่อนเข้าใช้งานเว็บไซต์',
        banned: true,
        banType: 'vpn',
        bannedIp: ip,
        reason: 'ตรวจพบการใช้งาน VPN หรือ Proxy กรุณาปิดโปรแกรม VPN ก่อนเข้าใช้งานเว็บไซต์',
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
  isVpnOrProxy,
  checkIpVpnStatus,
  refreshVpnSetting,
  bannedHardwareMap,
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

