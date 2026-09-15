// server/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'keyshop_secret';

// Verify JWT token from Authorization header
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

const { Setting } = require('../models');

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

// Require admin or superadmin role
function requireAdmin(req, res, next) {
  if (!req.user) {
    return verifyToken(req, res, () => {
      if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        return next();
      }
      return res.status(403).json({ message: 'สิทธิ์การเข้าถึงถูกปฏิเสธ (เฉพาะผู้ดูแลระบบเท่านั้น)' });
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'สิทธิ์การเข้าถึงถูกปฏิเสธ (เฉพาะผู้ดูแลระบบเท่านั้น)' });
  }

  next();
}

// Require SuperAdmin role OR valid SuperAdmin Passcode
async function requireSuperAdminOrPasscode(req, res, next) {
  // First ensure user is authenticated
  const checkAccess = async () => {
    // 1. Direct SuperAdmin access
    if (req.user && req.user.role === 'superadmin') {
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

    return res.status(403).json({
      error: 'SUPERADMIN_CLEARANCE_REQUIRED',
      message: 'เขตหวงห้ามความปลอดภัยระดับสูง: ต้องใช้สิทธิ์ SuperAdmin หรือรหัสผ่านความปลอดภัย (Security Passcode) เท่านั้น',
      requiresPasscode: true,
    });
  };

  if (!req.user) {
    return verifyToken(req, res, checkAccess);
  }
  await checkAccess();
}

module.exports = {
  verifyToken,
  requireAdmin,
  requireSuperAdminOrPasscode,
  getSuperAdminPasscode,
};
