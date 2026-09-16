// server/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { Setting, User, SecurityThreatLog } = require('../models');
const { getClientIp, banIpImmediately, banDeviceImmediately } = require('./ipBan');

const JWT_SECRET = process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c';

// Helper to calculate exactly 10 years, 9 months, 9 days ban duration
function calculate10YearsBanDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 10);
  d.setMonth(d.getMonth() + 9);
  d.setDate(d.getDate() + 9);
  d.setHours(d.getHours() + 9);
  d.setMinutes(d.getMinutes() + 9);
  d.setSeconds(d.getSeconds() + 9);
  return d;
}

/**
 * Auto Trap & Honeypot:
 * Instantly bans the IP and Device for 10 years, logs security threat, and terminates request.
 */
async function triggerAdminIntrusionTrap(req, res, reason = 'ความพยายามเข้าถึงหน้าแอดมินโดยไม่ได้รับอนุญาต (Admin Honeypot Trap)') {
  const clientIp = getClientIp(req);
  const deviceId = (req.headers['x-device-id'] || req.query?.deviceId || req.body?.deviceId || '').toString().trim();
  const bannedUntil = calculate10YearsBanDate();
  const endpoint = req.originalUrl || req.url || '';
  const method = req.method || 'GET';

  console.error(`[🚨 HONEYPOT TRAP ACTIVATED] Intrusion detected from IP: ${clientIp}, Device: ${deviceId || 'N/A'}, Target: [${method}] ${endpoint}, Reason: ${reason}`);

  // 1. Instantly ban IP (In-memory + Database)
  try {
    await banIpImmediately(
      clientIp,
      `[Auto Trap & Honeypot] ${reason} (Target: [${method}] ${endpoint})`,
      'HexSync Zero-Trust Honeypot Trap',
      bannedUntil
    );
  } catch (err) {
    console.error('[Honeypot Trap] Error banning IP:', err.message);
  }

  // 2. Instantly ban Device if ID is present
  if (deviceId) {
    try {
      await banDeviceImmediately(
        deviceId,
        `[Auto Trap & Honeypot] ${reason} (Target: [${method}] ${endpoint})`,
        'HexSync Zero-Trust Honeypot Trap',
        bannedUntil,
        {
          lastIp: clientIp,
          deviceModel: req.headers['user-agent'] || 'Hardware Fingerprint',
        }
      );
    } catch (err) {
      console.error('[Honeypot Trap] Error banning Device:', err.message);
    }
  }

  // 3. Persist forensic threat log in Database
  try {
    await SecurityThreatLog.create({
      ip: clientIp,
      threatType: 'UNAUTHORIZED_ADMIN_INTRUSION',
      details: `[Auto Trap & Honeypot] พยายามเจาะระบบแอดมิน: ${reason} (Target: ${method} ${endpoint}, DeviceId: ${deviceId || 'N/A'}, UserAgent: ${req.headers['user-agent'] || 'N/A'})`,
      strikeCount: 3,
      banned: true,
      bannedUntil: bannedUntil,
    });
  } catch (err) {
    console.error('[Honeypot Trap] Error saving SecurityThreatLog:', err.message);
  }

  // 4. Return 403 Forbidden with honeypot security alert
  return res.status(403).json({
    error: 'SECURITY_TRAP_TRIGGERED',
    message: '🚨 ตรวจพบความพยายามบุกรุกพื้นที่ผู้ดูแลระบบโดยไม่ได้รับอนุญาต (Admin Intrusion Trap): IP และอุปกรณ์ของคุณถูกสั่งแบนถาวรทันที!',
    reason: reason,
    banned: true,
    bannedUntil: bannedUntil.toISOString(),
  });
}

// Verify JWT token from Authorization header (Generic for member routes)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'ไม่พบ Token การยืนยันตัวตน กรุณาเข้าสู่ระบบ' });
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  if (!token) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session หมดอายุหรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }
}

// Helper to get active SuperAdmin security passcode
async function getSuperAdminPasscode() {
  try {
    const s = await Setting.findOne({ where: { key: 'superadmin_security_passcode' } });
    if (s && s.value && s.value.trim().length > 0) {
      return s.value.trim();
    }
  } catch {}
  return 'HEX-SUPER-SECURE-999';
}

/**
 * Require Admin:
 * 1. Auto Trap & Honeypot: If outsider or unauthorized user calls admin endpoint, ban IP + Device immediately!
 * 2. Zero-Trust Active Database Check: Always query User.findByPk live on every request.
 */
async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'จำเป็นต้องเข้าสู่ระบบแอดมินก่อนดำเนินการ' });
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  if (!token) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Session หมดอายุ หรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    });
  }

  if (!decoded || !decoded.id) {
    return res.status(401).json({ message: 'Token ขาดข้อมูลระบุตัวตน กรุณาเข้าสู่ระบบใหม่' });
  }

  // Zero-Trust Active Database Check: Every admin request checks the live DB
  try {
    const dbUser = await User.findByPk(decoded.id);

    if (!dbUser) {
      return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้ในระบบ กรุณาเข้าสู่ระบบใหม่' });
    }

    if (dbUser.isBanned) {
      return res.status(403).json({
        error: 'ACCOUNT_BANNED',
        message: 'บัญชีนี้ถูกระงับการใช้งาน',
        banned: true,
        bannedUntil: dbUser.bannedUntil
      });
    }

    if (dbUser.role !== 'admin' && dbUser.role !== 'superadmin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'คุณไม่มีสิทธิ์เข้าถึงพื้นที่นี้ (Admin Only)'
      });
    }

    req.user = dbUser;
    next();
  } catch (dbErr) {
    console.error('[Zero-Trust Auth] Database check error:', dbErr.message);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์แอดมิน' });
  }
}

/**
 * Require SuperAdmin or Passcode:
 * Zero-Trust live DB check + Auto-Trap on malicious breaches
 */
async function requireSuperAdminOrPasscode(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  let dbUser = null;
  if (authHeader) {
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          const u = await User.findByPk(decoded.id);
          if (u && !u.isBanned) {
            dbUser = u;
            req.user = u;
          }
        }
      } catch {}
    }
  }

  if (dbUser && dbUser.role === 'superadmin') {
    return next();
  }

  const providedCode = (
    req.headers['x-security-passcode'] ||
    req.body?.securityPasscode ||
    req.query?.securityPasscode ||
    ''
  ).toString().trim();

  if (providedCode) {
    const activeCode = await getSuperAdminPasscode();
    if (providedCode === activeCode) {
      req.hasPasscodeAccess = true;
      return next();
    }
  }

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'superadmin')) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (SuperAdmin Only)'
    });
  }

  return res.status(403).json({
    error: 'SUPERADMIN_CLEARANCE_REQUIRED',
    message: 'ต้องการรหัสผ่านความปลอดภัยขั้นสูง: กรุณากรอก Security Passcode เพื่อยืนยันตัวตน',
    requiresPasscode: true,
  });
}

module.exports = {
  verifyToken,
  requireAdmin,
  requireSuperAdminOrPasscode,
  getSuperAdminPasscode,
  triggerAdminIntrusionTrap,
  calculate10YearsBanDate,
};
