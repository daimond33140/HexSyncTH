// server/middleware/antiFlood.js
const jwt = require('jsonwebtoken');
const { getClientIp, isIpWhitelisted } = require('./ipBan');

// In-memory sliding window storage for microsecond lookup
// Structure: key -> { count: number, windowStart: number, penalties: number }
const requestRateMap = new Map();
const deviceRateMap = new Map();

// Auto-jailed records: key -> jailExpiryTimestamp
const autoJailMap = new Map();
const autoJailDeviceMap = new Map();

// Configuration parameters optimized for shared school/NAT networks
const WINDOW_MS = 3000; // 3-second sliding window
const MAX_REQUESTS_PER_WINDOW_IP = 200; // Max 200 requests per 3 seconds for shared NAT IP (~66 req/sec)
const MAX_REQUESTS_PER_WINDOW_DEV = 80; // Max 80 requests per 3 seconds for single device/tab
const MAX_PENALTIES_BEFORE_JAIL = 5; // Allow up to 5 transient bursts before jailing
const JAIL_DURATION_MS = 2 * 60 * 1000; // 2-minute temporary quarantine (not 15 mins)

// Periodically clean stale records every 60 seconds to keep memory minimal
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestRateMap.entries()) {
    if (now - data.windowStart > WINDOW_MS * 4) {
      requestRateMap.delete(ip);
    }
  }
  for (const [devId, data] of deviceRateMap.entries()) {
    if (now - data.windowStart > WINDOW_MS * 4) {
      deviceRateMap.delete(devId);
    }
  }
  for (const [ip, expiry] of autoJailMap.entries()) {
    if (now > expiry) {
      autoJailMap.delete(ip);
    }
  }
  for (const [devId, expiry] of autoJailDeviceMap.entries()) {
    if (now > expiry) {
      autoJailDeviceMap.delete(devId);
    }
  }
}, 60000);

/**
 * Helper to unjail all or specific IPs (Emergency & Admin Action)
 */
function clearAllJails() {
  const count = autoJailMap.size + autoJailDeviceMap.size;
  autoJailMap.clear();
  autoJailDeviceMap.clear();
  requestRateMap.clear();
  deviceRateMap.clear();
  console.log(`[Anti-DDoS Shield] Cleared ${count} jailed records from memory.`);
  return count;
}

function clearIpJail(ip) {
  if (!ip) return false;
  const cleanIp = ip.trim().replace('::ffff:', '');
  const hadIp = autoJailMap.delete(cleanIp);
  requestRateMap.delete(cleanIp);
  return hadIp;
}

function getJailedIps() {
  const now = Date.now();
  const list = [];
  for (const [ip, expiry] of autoJailMap.entries()) {
    if (now < expiry) {
      list.push({
        ip,
        remainingSec: Math.ceil((expiry - now) / 1000),
        expiresAt: new Date(expiry).toISOString(),
      });
    }
  }
  return list;
}

/**
 * Ultra-fast In-Memory Anti-Flood / Anti-DDoS Shield
 * Supports School / University NAT networks and multi-client environments
 */
function antiFloodMiddleware(req, res, next) {
  // 1. Never rate-limit or flood-check CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();

  // 2. Whitelist & Localhost bypass: Skip check entirely
  if (isIpWhitelisted(ip) || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return next();
  }

  // 3. Admin Safety Bypass: If request has valid Admin Token, do not lock out
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
      if (decoded && decoded.role === 'admin') {
        return next();
      }
    } catch {}
  }

  const deviceId = (req.headers['x-device-id'] || req.query.deviceId || '').toString().trim();

  // 4. Check if Device or IP is in Auto-Jail (Quarantined)
  const ipJailExpiry = autoJailMap.get(ip);
  if (ipJailExpiry) {
    if (now < ipJailExpiry) {
      const remainingSec = Math.ceil((ipJailExpiry - now) / 1000);
      res.setHeader('Retry-After', remainingSec);
      return res.status(429).json({
        error: 'DDOS_FLOOD_DEFENSE_ACTIVATED',
        message: `🛡️ ระบบป้องกัน DDoS ตรวจพบการยิงคำขอผิดปกติ หมายเลข IP ของคุณถูกกักกันชั่วคราว ${remainingSec} วินาที`,
        retryAfterSeconds: remainingSec,
      });
    } else {
      autoJailMap.delete(ip);
      requestRateMap.delete(ip);
    }
  }

  if (deviceId) {
    const devJailExpiry = autoJailDeviceMap.get(deviceId);
    if (devJailExpiry) {
      if (now < devJailExpiry) {
        const remainingSec = Math.ceil((devJailExpiry - now) / 1000);
        res.setHeader('Retry-After', remainingSec);
        return res.status(429).json({
          error: 'DDOS_FLOOD_DEFENSE_ACTIVATED',
          message: `🛡️ ระบบป้องกัน DDoS ตรวจพบอุปกรณ์เครื่องนี้ส่งคำขอถี่ผิดปกติ ถูกกักกันชั่วคราว ${remainingSec} วินาที`,
          retryAfterSeconds: remainingSec,
        });
      } else {
        autoJailDeviceMap.delete(deviceId);
        deviceRateMap.delete(deviceId);
      }
    }
  }

  // 5. Sliding window tracking per Device (Individual tab/browser flood detection)
  if (deviceId) {
    let devData = deviceRateMap.get(deviceId);
    if (!devData || (now - devData.windowStart > WINDOW_MS)) {
      devData = { count: 1, windowStart: now, penalties: devData?.penalties || 0 };
      deviceRateMap.set(deviceId, devData);
    } else {
      devData.count++;
      if (devData.count > MAX_REQUESTS_PER_WINDOW_DEV) {
        devData.penalties++;
        if (devData.penalties >= MAX_PENALTIES_BEFORE_JAIL) {
          autoJailDeviceMap.set(deviceId, now + JAIL_DURATION_MS);
          console.warn(`[Anti-DDoS Shield] 🚨 JAILED Device ${deviceId} (IP: ${ip}) for 2 minutes (${devData.count} reqs in ${WINDOW_MS}ms)`);
          return res.status(429).json({
            error: 'DDOS_FLOOD_DEFENSE_ACTIVATED',
            message: '🛡️ ระบบป้องกัน DDoS ตรวจพบการส่งคำขอถี่ผิดปกติจากอุปกรณ์นี้ ถูกระงับชั่วคราว 2 นาที',
            retryAfterSeconds: 120,
          });
        }
        return res.status(429).json({
          error: 'TOO_MANY_REQUESTS_SPIKE',
          message: '⚠️ ตรวจพบการเรียกข้อมูลถี่เกินไป กรุณาชะลอการส่งคำขอ',
        });
      }
    }
  }

  // 6. Sliding window tracking per IP (Massive botnet / Volumetric attack detection)
  let clientData = requestRateMap.get(ip);
  if (!clientData || (now - clientData.windowStart > WINDOW_MS)) {
    clientData = { count: 1, windowStart: now, penalties: clientData?.penalties || 0 };
    requestRateMap.set(ip, clientData);
    return next();
  }

  clientData.count++;

  // IP Flood threshold exceeded
  if (clientData.count > MAX_REQUESTS_PER_WINDOW_IP) {
    clientData.penalties++;

    if (clientData.penalties >= MAX_PENALTIES_BEFORE_JAIL) {
      autoJailMap.set(ip, now + JAIL_DURATION_MS);
      console.warn(`[Anti-DDoS Shield] 🚨 JAILED IP ${ip} for 2 minutes due to massive flooding (${clientData.count} reqs in ${WINDOW_MS}ms)`);
      return res.status(429).json({
        error: 'DDOS_FLOOD_DEFENSE_ACTIVATED',
        message: '🛡️ ระบบป้องกัน DDoS ตรวจพบการส่งคำขอถี่ผิดปกติ หมายเลข IP ของคุณถูกระงับชั่วคราว 2 นาที',
        retryAfterSeconds: 120,
      });
    }

    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS_SPIKE',
      message: '⚠️ ตรวจพบการเรียกข้อมูลถี่เกินไป กรุณาชะลอการส่งคำขอ',
    });
  }

  next();
}

module.exports = {
  antiFloodMiddleware,
  autoJailMap,
  autoJailDeviceMap,
  requestRateMap,
  deviceRateMap,
  clearAllJails,
  clearIpJail,
  getJailedIps,
};
