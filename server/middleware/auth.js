// server/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { Setting, User, SecurityThreatLog } = require('../models');
const { getClientIp, banIpImmediately, banDeviceImmediately } = require('./ipBan');

const JWT_SECRET = process.env.JWT_SECRET || 'keyshop_secret';

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

  // Outsider with no auth header trying to hit admin endpoint -> Trigger Honeypot Trap
  if (!authHeader) {
    return triggerAdminIntrusionTrap(req, res, 'ตรวจพบบุคคลภายนอกยิงคำขอเข้าสู่พื้นที่แอดมินโดยไม่มี Token ยืนยันตัวตน');
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  if (!token) {
    return triggerAdminIntrusionTrap(req, res, 'ตรวจพบบุคคลภายนอกส่ง Token ว่างเปล่าเข้าสู่พื้นที่แอดมิน');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // If token is genuinely expired for an admin, do not ban legitimate admin by accident, prompt re-login
    if (err.name === 'TokenExpiredError') {
      try {
        const unverified = jwt.decode(token);
        if (unverified && (unverified.role === 'admin' || unverified.role === 'superadmin')) {
          return res.status(401).json({
            error: 'SESSION_EXPIRED',
            message: 'Session ของผู้ดูแลระบบหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
          });
        }
      } catch {}
    }

    // Any forged signature, malformed token, or fake secret -> Trigger Honeypot Trap
    return triggerAdminIntrusionTrap(req, res, `ตรวจพบ Token ปลอมหรือลายเซ็นไม่ถูกต้องในการเข้าถึงพื้นที่แอดมิน (${err.message})`);
  }

  if (!decoded || !decoded.id) {
    return triggerAdminIntrusionTrap(req, res, 'ตรวจพบ Token ขาดข้อมูลระบุตัวตน (Missing User ID in Token)');
  }

  // 🌟 Zero-Trust Active Database Check: Every admin request checks the live DB
  try {
    const dbUser = await User.findByPk(decoded.id);

    // 1. User must actually exist in the database
    if (!dbUser) {
      return triggerAdminIntrusionTrap(req, res, `ตรวจพบบัญชีผู้ใช้ที่ไม่มีอยู่จริงในฐานข้อมูลพยายามเข้าพื้นที่แอดมิน (User ID ${decoded.id} not found)`);
    }

    // 2. User must not be banned / suspended
    if (dbUser.isBanned) {
      return triggerAdminIntrusionTrap(req, res, `ตรวจพบบัญชีที่ถูกระงับ (${dbUser.username || dbUser.id}) พยายามเข้าพื้นที่แอดมิน`);
    }

    // 3. User MUST genuinely have admin or superadmin role in the active database
    if (dbUser.role !== 'admin' && dbUser.role !== 'superadmin') {
      return triggerAdminIntrusionTrap(
        req,
        res,
        `ตรวจพบผู้ใช้ทั่วไป (${dbUser.username || dbUser.id}, role: ${dbUser.role}) พยายามเข้าถึง Endpoint แอดมิน`
      );
    }

    // Attach verified live database user to request
    req.user = dbUser;
    next();
  } catch (dbErr) {
    console.error('[Zero-Trust Auth] Database check error:', dbErr.message);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ความปลอดภัยในฐานข้อมูล' });
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

  // 1. Direct verified SuperAdmin in Database
  if (dbUser && dbUser.role === 'superadmin') {
    return next();
  }

  // 2. Check Passcode from header or body or query
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

  // If unauthenticated or normal user attempting SuperAdmin without valid passcode -> Trigger Honeypot Trap
  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'superadmin')) {
    return triggerAdminIntrusionTrap(
      req,
      res,
      'ตรวจพบความพยายามเจาะเข้าเขตหวงห้าม SuperAdmin โดยไม่มีรหัสผ่านความปลอดภัยที่ถูกต้อง'
    );
  }

  return res.status(403).json({
    error: 'SUPERADMIN_CLEARANCE_REQUIRED',
    message: 'เขตหวงห้ามความปลอดภัยระดับสูง: ต้องใช้สิทธิ์ SuperAdmin หรือรหัสผ่านความปลอดภัย (Security Passcode) เท่านั้น',
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
