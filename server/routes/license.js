// server/routes/license.js
const express = require('express');
const { LicenseKey, Product, ProductKey, Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Helper: Format remaining milliseconds into human-readable Thai string
function formatRemainingTime(ms) {
  if (ms <= 0) return 'หมดอายุแล้ว';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / (3600 * 24));
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชม.`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  if (parts.length === 0 || (days === 0 && hours === 0)) parts.push(`${seconds} วิ.`);
  return parts.join(' ');
}

// -------------------------------------------------------------
// 1. PUBLIC VERIFICATION API (FOR C++, C#, PYTHON, APPS & LOADERS)
// Supports both POST (JSON body) and GET (query parameters)
// -------------------------------------------------------------
const handleVerifyLicense = async (req, res) => {
  try {
    const rawKey = req.body?.key || req.query?.key;
    const reqHwid = (req.body?.hwid || req.query?.hwid || '').trim();
    const reqAppName = (req.body?.appName || req.body?.gameId || req.query?.appName || req.query?.gameId || '').trim();

    if (!rawKey) {
      return res.status(400).json({
        success: false,
        status: 'missing_key',
        message: 'กรุณาระบุ License Key (Parameter "key" is required)'
      });
    }

    const keyClean = String(rawKey).trim();
    const license = await LicenseKey.findOne({ where: { key: keyClean } });

    if (!license) {
      return res.status(404).json({
        success: false,
        status: 'invalid_key',
        message: 'ไม่พบคีย์นี้ในระบบ หรือคีย์ไม่ถูกต้อง (License key not found)'
      });
    }

    // Check if key is banned/revoked
    if (license.status === 'banned') {
      return res.status(403).json({
        success: false,
        status: 'banned',
        message: 'คีย์นี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (License key has been suspended/banned)'
      });
    }

    const now = new Date();

    // 1. First-time Activation: Starts the countdown clock & locks to first HWID
    if (!license.activatedAt) {
      license.activatedAt = now;
      license.status = 'active';

      if (!license.isLifetime) {
        const durationHours = license.durationHours || 24;
        const durationMs = durationHours * 3600 * 1000;
        license.expiresAt = new Date(now.getTime() + durationMs);
      } else {
        license.expiresAt = null;
      }

      if (reqHwid) {
        license.hwid = reqHwid;
      }

      await license.save();

      const remainingMs = license.isLifetime ? null : (license.expiresAt.getTime() - now.getTime());
      return res.json({
        success: true,
        status: 'active',
        message: 'เปิดใช้งานคีย์ครั้งแรกสำเร็จ เริ่มนับถอยหลังอายุการใช้งาน',
        license: {
          key: license.key,
          appName: license.appName,
          hwid: license.hwid || null,
          isLifetime: license.isLifetime,
          activatedAt: license.activatedAt,
          expiresAt: license.expiresAt,
          remainingSeconds: remainingMs ? Math.max(0, Math.floor(remainingMs / 1000)) : -1,
          remainingFormatted: license.isLifetime ? 'ถาวร (ตลอดชีพ)' : formatRemainingTime(remainingMs)
        }
      });
    }

    // 2. Already Activated: Check Expiration
    if (!license.isLifetime && license.expiresAt) {
      if (license.expiresAt.getTime() <= now.getTime()) {
        if (license.status !== 'expired') {
          license.status = 'expired';
          await license.save();
        }
        return res.status(403).json({
          success: false,
          status: 'expired',
          message: 'คีย์นี้หมดอายุการใช้งานแล้ว กรุณาต่ออายุคีย์',
          expiredAt: license.expiresAt
        });
      }
    }

    // 3. HWID Lock Check (If key has HWID bound and request provides HWID)
    if (license.hwid && reqHwid) {
      if (license.hwid.toLowerCase() !== reqHwid.toLowerCase()) {
        return res.status(403).json({
          success: false,
          status: 'hwid_mismatch',
          message: 'คีย์นี้ถูกผูกกับอุปกรณ์เครื่องอื่นแล้ว (HWID Mismatch) หากต้องการย้ายเครื่องกรุณาติดต่อผู้ดูแลระบบเพื่อ Reset HWID'
        });
      }
    } else if (!license.hwid && reqHwid) {
      // Auto-bind HWID if it was empty (e.g. after admin reset HWID)
      license.hwid = reqHwid;
      await license.save();
    }

    // 4. Everything is Valid & Active!
    const remainingMs = license.isLifetime ? null : (new Date(license.expiresAt).getTime() - now.getTime());
    return res.json({
      success: true,
      status: 'active',
      message: 'คีย์ถูกต้องและมีสิทธิ์ใช้งานปกติ',
      license: {
        key: license.key,
        appName: license.appName,
        hwid: license.hwid,
        isLifetime: license.isLifetime,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        remainingSeconds: remainingMs ? Math.max(0, Math.floor(remainingMs / 1000)) : -1,
        remainingFormatted: license.isLifetime ? 'ถาวร (ตลอดชีพ)' : formatRemainingTime(remainingMs)
      }
    });
  } catch (err) {
    console.error('License verification error:', err);
    return res.status(500).json({
      success: false,
      status: 'server_error',
      message: 'เกิดข้อผิดพลาดในการตรวจสอบคีย์: ' + err.message
    });
  }
};

router.post('/verify', handleVerifyLicense);
router.get('/verify', handleVerifyLicense);

// -------------------------------------------------------------
// 2. ADMIN LICENSE MANAGEMENT ENDPOINTS (PROTECTED BY ADMIN AUTH)
// -------------------------------------------------------------

// List all licenses
router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const licenses = await LicenseKey.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Auto update expired status on read
    const now = Date.now();
    const formatted = licenses.map((item) => {
      const plain = item.toJSON();
      if (!plain.isLifetime && plain.expiresAt && new Date(plain.expiresAt).getTime() <= now && plain.status === 'active') {
        plain.status = 'expired';
      }
      plain.remainingMs = plain.isLifetime ? null : (plain.expiresAt ? Math.max(0, new Date(plain.expiresAt).getTime() - now) : null);
      plain.remainingFormatted = plain.isLifetime ? 'ถาวร (ตลอดชีพ)' : (plain.remainingMs ? formatRemainingTime(plain.remainingMs) : (plain.status === 'unused' ? 'ยังไม่เริ่มนับ (เริ่มเมื่อเปิดใช้)' : 'หมดอายุแล้ว'));
      return plain;
    });

    res.json({ success: true, licenses: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch licenses: ' + err.message });
  }
});

// Create new license key(s)
router.post('/admin/create', requireAdmin, async (req, res) => {
  try {
    const {
      keyType, // 'auto' | 'custom'
      customKey,
      prefix = 'HEX-',
      count = 1,
      appName = 'General Application',
      gameId = null,
      productId = null,
      durationHours = 24,
      isLifetime = false,
      note = '',
      addToProductStock = false
    } = req.body;

    const createdKeys = [];
    const keyCount = Math.min(Math.max(1, parseInt(count) || 1), 100);

    for (let i = 0; i < keyCount; i++) {
      let finalKey = '';
      if (keyType === 'custom' && customKey) {
        finalKey = (keyCount === 1 ? customKey : `${customKey}-${i + 1}`).trim();
      } else {
        const randStr1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randStr2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randStr3 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'HEX-';
        finalKey = `${cleanPrefix}${randStr1}-${randStr2}-${randStr3}`;
      }

      // Check unique
      const existing = await LicenseKey.findOne({ where: { key: finalKey } });
      if (existing) {
        if (keyType === 'custom') {
          return res.status(400).json({ success: false, message: `รหัสคีย์ "${finalKey}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` });
        }
        continue;
      }

      const newLicense = await LicenseKey.create({
        key: finalKey,
        appName: appName || 'General Application',
        gameId: gameId || null,
        productId: productId ? parseInt(productId) : null,
        durationHours: isLifetime ? 0 : parseInt(durationHours) || 24,
        isLifetime: Boolean(isLifetime),
        status: 'unused',
        note: note || null,
        createdBy: req.user?.username || 'Admin'
      });

      createdKeys.push(newLicense);

      // If addToProductStock is true and productId is provided, add to ProductKey pool too
      if (addToProductStock && productId) {
        try {
          await ProductKey.create({
            productId: parseInt(productId),
            keyString: finalKey,
            isUsed: false
          });
          // Update product stock count
          const p = await Product.findByPk(productId);
          if (p) {
            p.stock = (p.stock || 0) + 1;
            await p.save();
          }
        } catch (stockErr) {
          console.warn('Failed to add to product stock:', stockErr);
        }
      }
    }

    res.json({
      success: true,
      message: `สร้างคีย์สำเร็จเรียบร้อยแล้ว (${createdKeys.length} คีย์)`,
      keys: createdKeys
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create license keys: ' + err.message });
  }
});

// Reset Bound HWID
router.post('/admin/reset-hwid', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    const license = await LicenseKey.findByPk(id);
    if (!license) return res.status(404).json({ success: false, message: 'ไม่พบคีย์นี้' });

    license.hwid = null;
    await license.save();

    res.json({ success: true, message: `ปลดล็อก HWID ของคีย์ "${license.key}" เรียบร้อยแล้ว (ลูกค้าย้ายเครื่องได้แล้ว)` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reset HWID failed: ' + err.message });
  }
});

// Add Time to License Key
router.post('/admin/add-time', requireAdmin, async (req, res) => {
  try {
    const { id, addHours } = req.body;
    const license = await LicenseKey.findByPk(id);
    if (!license) return res.status(404).json({ success: false, message: 'ไม่พบคีย์นี้' });

    const hours = parseInt(addHours) || 24;
    const addMs = hours * 3600 * 1000;

    if (license.isLifetime) {
      return res.json({ success: true, message: 'คีย์นี้เป็นแบบถาวร (ตลอดชีพ) อยู่แล้ว ไม่จำเป็นต้องเพิ่มเวลา' });
    }

    if (license.activatedAt && license.expiresAt) {
      const currentExpiry = new Date(license.expiresAt).getTime();
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      license.expiresAt = new Date(baseTime + addMs);
      license.status = 'active';
      license.durationHours = (license.durationHours || 0) + hours;
    } else {
      license.durationHours = (license.durationHours || 0) + hours;
    }

    await license.save();

    res.json({
      success: true,
      message: `เพิ่มเวลาให้คีย์ "${license.key}" อีก ${hours} ชม. สำเร็จเรียบร้อย`,
      expiresAt: license.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Add time failed: ' + err.message });
  }
});

// Toggle Ban/Revoke License
router.post('/admin/toggle-ban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    const license = await LicenseKey.findByPk(id);
    if (!license) return res.status(404).json({ success: false, message: 'ไม่พบคีย์นี้' });

    if (license.status === 'banned') {
      // Unban
      if (!license.activatedAt) {
        license.status = 'unused';
      } else if (!license.isLifetime && license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now()) {
        license.status = 'expired';
      } else {
        license.status = 'active';
      }
    } else {
      license.status = 'banned';
    }

    await license.save();

    res.json({
      success: true,
      status: license.status,
      message: license.status === 'banned' ? `ระงับคีย์ "${license.key}" เรียบร้อยแล้ว` : `ปลดระงับคีย์ "${license.key}" แล้ว`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Toggle ban failed: ' + err.message });
  }
});

// Delete License Key
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const license = await LicenseKey.findByPk(id);
    if (!license) return res.status(404).json({ success: false, message: 'ไม่พบคีย์นี้' });

    const keyStr = license.key;
    await license.destroy();

    res.json({ success: true, message: `ลบคีย์ "${keyStr}" ออกจากระบบเรียบร้อยแล้ว` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed: ' + err.message });
  }
});

module.exports = router;
