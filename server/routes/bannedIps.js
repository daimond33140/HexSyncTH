const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { BannedIP, Log, Setting, WhitelistedIP, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { getClientIp, refreshBannedIps, refreshWhitelistedIps, isIpWhitelisted } = require('../middleware/ipBan');
const { clearAllJails, clearIpJail, getJailedIps } = require('../middleware/antiFlood');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c';

// Helper to get active Master Key from database
async function getActiveMasterKey() {
  try {
    const s = await Setting.findOne({ where: { key: 'emergency_master_key' } });
    if (s && s.value && s.value.trim().length > 0) {
      return s.value.trim();
    }
  } catch {}
  return process.env.EMERGENCY_MASTER_KEY || null;
}

// 1. Public endpoint: View current client's detected IP
router.get('/my-ip', (req, res) => {
  const ip = getClientIp(req);
  res.json({ ip });
});

// 2. Public Real-time IP Check Endpoint: Called on website entrance
router.get('/check-my-ip', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const banRecord = await BannedIP.findOne({ where: { ip } });
    if (banRecord) {
      return res.json({
        banned: true,
        ip,
        reason: banRecord.reason || 'ละเมิดข้อกำหนดการใช้งานของเว็บไซต์',
        bannedAt: banRecord.bannedAt,
        bannedBy: banRecord.bannedBy
      });
    }
    res.json({
      banned: false,
      ip
    });
  } catch (err) {
    res.json({ banned: false, ip: getClientIp(req) });
  }
});

// Rate-limiting tracker for emergency unban
const unbanAttempts = new Map(); // ip -> { count, lockedUntil }

// 3. Emergency Self-Unban for Admin (In case of accidental self-ban or DDoS lockout)
router.post('/emergency-unban', async (req, res) => {
  try {
    const callerIp = getClientIp(req);
    const now = Date.now();
    const attempt = unbanAttempts.get(callerIp) || { count: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > now) {
      const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({
        message: `⚠️ ใส่ Master Key ผิดเกินกำหนด กรุณารออีก ${waitSec} วินาที ก่อนลองใหม่อีกครั้ง`
      });
    }

    const { masterKey, unbanAll } = req.body;
    const activeMasterKey = await getActiveMasterKey();

    const inputKey = (masterKey || '').toString().trim();
    const isMasterValid = Boolean(activeMasterKey && inputKey === activeMasterKey);
    if (!inputKey || !isMasterValid) {
      attempt.count += 1;
      if (attempt.count >= 5) {
        attempt.lockedUntil = now + 15 * 60 * 1000;
        unbanAttempts.set(callerIp, attempt);
        return res.status(429).json({ message: '⚠️ ใส่ Master Key ผิดครบ 5 ครั้ง ระบบถูกล็อกชั่วคราวเป็นเวลา 15 นาที' });
      }
      unbanAttempts.set(callerIp, attempt);
      return res.status(401).json({ message: `รหัส Master Key ไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - attempt.count} ครั้ง)` });
    }

    unbanAttempts.delete(callerIp);

    if (unbanAll) {
      await BannedIP.destroy({ where: {} });
      clearAllJails();
      await User.update(
        { isBanned: false, banReason: null, bannedBy: null, bannedAt: null, bannedUntil: null },
        { where: { isBanned: true } }
      );
    } else {
      await BannedIP.destroy({ where: { ip: callerIp } });
      clearIpJail(callerIp);
      const usersToUnban = await User.findAll({
        where: {
          isBanned: true,
          [Op.or]: [{ lastIp: callerIp }, { registerIp: callerIp }]
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
    }

    await refreshBannedIps();
    res.json({
      message: `ปลดแบนและเคลียร์ DDoS Shield สำหรับ IP ${callerIp} เรียบร้อยแล้ว สามารถเข้าใช้งานร้านค้าได้ทันที`,
      unbannedIp: callerIp
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถดำเนินการปลดแบนฉุกเฉินได้' });
  }
});

// 4. Public HMAC One-Click Quick Unban (Triggered from Discord Alert Button)
router.get('/quick-unban', async (req, res) => {
  try {
    const { ip, user, sig } = req.query;
    if (!ip || !sig) {
      return res.status(400).send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"/><title>Error</title></head>
        <body style="background:#0a0e17;color:#f87171;font-family:sans-serif;text-align:center;padding:50px;">
          <h2>❌ พารามิเตอร์ไม่ถูกต้อง (Missing Parameters)</h2>
        </body></html>
      `);
    }

    const safeIp = ip.toString().trim();
    const safeUser = (user || '').toString().trim();
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`unban_${safeIp}_${safeUser}`).digest('hex');

    if (sig !== expectedSig) {
      return res.status(403).send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"/><title>Access Denied</title></head>
        <body style="background:#0a0e17;color:#ef4444;font-family:sans-serif;text-align:center;padding:50px;">
          <h2>❌ ลิงก์ปลดแบนไม่ถูกต้องหรือถูกดัดแปลง (Invalid Signature)</h2>
          <p style="color:#94a3b8;">ระบบปฏิเสธการปลดแบนเนื่องจากลายเซ็นความปลอดภัยไม่ตรงกัน</p>
        </body></html>
      `);
    }

    // 1. Remove from BannedIP
    await BannedIP.destroy({ where: { ip: safeIp } });
    clearIpJail(safeIp);
    await refreshBannedIps();

    // 2. Unban specific user or associated users on this IP
    const unbannedUsers = [];
    if (safeUser && safeUser !== 'ยังไม่ Login เข้าเว็บ' && safeUser !== 'Anonymous') {
      const u = await User.findOne({ where: { username: safeUser } });
      if (u) {
        u.isBanned = false;
        u.banReason = null;
        u.bannedBy = null;
        u.bannedAt = null;
        u.bannedUntil = null;
        await u.save();
        unbannedUsers.push(u.username);
      }
    }

    const usersOnIp = await User.findAll({
      where: {
        isBanned: true,
        [Op.or]: [{ lastIp: safeIp }, { registerIp: safeIp }]
      }
    });
    for (const u of usersOnIp) {
      u.isBanned = false;
      u.banReason = null;
      u.bannedBy = null;
      u.bannedAt = null;
      u.bannedUntil = null;
      await u.save();
      if (!unbannedUsers.includes(u.username)) unbannedUsers.push(u.username);
    }

    // 3. Log admin action
    await Log.create({
      action: 'ADMIN_QUICK_UNBAN_DISCORD',
      detail: `ปลดแบนผ่านปุ่ม Discord: IP ${safeIp}${unbannedUsers.length > 0 ? ` พร้อมบัญชี (${unbannedUsers.join(', ')})` : ''}`,
      username: 'Discord Admin Quick-Action',
      ip: getClientIp(req)
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>HexSyncTH - ปลดแบนสำเร็จ</title>
        <style>
          body { background: #0a0e17; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #131c2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981; padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; margin-bottom: 20px; }
          h1 { margin: 0 0 12px; font-size: 22px; color: #fff; }
          p { margin: 0 0 16px; color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .info-box { background: #0b1120; border: 1px solid #1f2937; border-radius: 10px; padding: 14px; text-align: left; font-size: 13px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .info-row:last-child { margin-bottom: 0; }
          .info-label { color: #64748b; }
          .info-val { color: #f8fafc; font-weight: 600; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✅ UNBANNED COMPLETED</div>
          <h1>ปลดแบนสำเร็จเรียบร้อยแล้ว</h1>
          <p>ระบบ HexSync Zero-Trust ได้ดำเนินการปลดแบน IP และเคลียร์สถานะบัญชีออกจากระบบเรียบร้อยแล้ว</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">IP Address:</span><span class="info-val">${safeIp}</span></div>
            <div class="info-row"><span class="info-label">User Accounts:</span><span class="info-val">${unbannedUsers.length > 0 ? unbannedUsers.join(', ') : (safeUser || '-')}</span></div>
            <div class="info-row"><span class="info-label">เวลาปลดแบน:</span><span class="info-val">${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</span></div>
          </div>
          <p style="font-size: 12px; color: #64748b;">คุณสามารถปิดหน้าต่างนี้ได้ทันที</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`เกิดข้อผิดพลาดในการปลดแบน: ` + err.message);
  }
});

// Require Admin authorization for the endpoints below
router.use(requireAdmin);

// GET /api/banned-ips/master-key - Get active Master Key (Admin only)
router.get('/master-key', async (req, res) => {
  try {
    const masterKey = await getActiveMasterKey();
    res.json({ masterKey });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Master Key' });
  }
});

// PUT /api/banned-ips/master-key - Update or Generate new Master Key (Admin only)
router.put('/master-key', async (req, res) => {
  try {
    const { masterKey } = req.body;
    if (!masterKey || typeof masterKey !== 'string' || masterKey.trim().length < 4) {
      return res.status(400).json({ message: 'Master Key ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }

    const trimmedKey = masterKey.trim();
    const [setting] = await Setting.findOrCreate({
      where: { key: 'emergency_master_key' },
      defaults: { key: 'emergency_master_key', value: trimmedKey }
    });
    await setting.update({ value: trimmedKey });

    // Log admin action
    await Log.create({
      action: 'แก้ไข Master Key ฉุกเฉิน',
      detail: `ผู้ดูแลระบบเปลี่ยน Master Key ปลดแบนฉุกเฉิน`,
      username: req.user?.username || 'Admin',
      ip: getClientIp(req)
    });

    res.json({
      success: true,
      message: 'บันทึก Master Key ฉุกเฉินสำเร็จเรียบร้อยแล้ว',
      masterKey: trimmedKey
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถบันทึก Master Key ได้: ' + err.message });
  }
});

// GET /api/banned-ips - List all banned IPs
router.get('/', async (req, res) => {
  try {
    const list = await BannedIP.findAll({
      order: [['bannedAt', 'DESC']]
    });
    res.json({ bannedIps: list });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการ IP ที่ถูกแบน' });
  }
});

// POST /api/banned-ips - Ban an IP
router.post('/', async (req, res) => {
  try {
    let { ip, reason, bannedBy, force, bannedUntil } = req.body;
    if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุหมายเลข IP ที่ต้องการแบน' });
    }

    ip = ip.trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    // Safety: Prevent admin from accidentally banning their own active IP
    const callerIp = getClientIp(req);
    if (!force && (ip === callerIp || ip === '127.0.0.1' || ip === '::1')) {
      return res.status(400).json({
        message: `⚠️ ไม่สามารถแบน IP (${ip}) ของคุณเองได้ เพื่อป้องกันการล็อกตัวเองออกจากระบบ!`
      });
    }

    // Check if already banned
    const existing = await BannedIP.findOne({ where: { ip } });
    if (existing) {
      existing.reason = reason || existing.reason;
      existing.bannedBy = bannedBy || existing.bannedBy;
      existing.bannedAt = new Date();
      existing.bannedUntil = bannedUntil ? new Date(bannedUntil) : existing.bannedUntil;
      await existing.save();
    } else {
      await BannedIP.create({
        ip,
        reason: reason || 'แบนโดยแอดมิน (Violation of rules)',
        bannedBy: bannedBy || 'Admin',
        bannedAt: new Date(),
        bannedUntil: bannedUntil ? new Date(bannedUntil) : null,
      });
    }

    await refreshBannedIps();

    await Log.create({
      action: 'ADMIN_BAN_IP',
      detail: `แบน IP ${ip} (เหตุผล: ${reason || 'แบนโดยแอดมิน'}) โดย ${bannedBy || 'Admin'}`,
      username: bannedBy || 'Admin',
      ip: callerIp
    });

    const list = await BannedIP.findAll({ order: [['bannedAt', 'DESC']] });
    res.json({ message: `แบน IP ${ip} เรียบร้อยแล้ว`, bannedIps: list });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถแบน IP ได้: ' + err.message });
  }
});

// DELETE /api/banned-ips/:id - Unban by Record ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminUsername = req.query.adminUsername || req.body?.adminUsername || 'Admin';

    const record = await BannedIP.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'ไม่พบรายการ IP นี้ในระบบ' });
    }

    const unbannedIp = record.ip;
    await record.destroy();
    clearIpJail(unbannedIp);
    await refreshBannedIps();

    // Automatically unban any user accounts that were banned with/on this IP
    const usersToUnban = await User.findAll({
      where: {
        isBanned: true,
        [Op.or]: [{ lastIp: unbannedIp }, { registerIp: unbannedIp }]
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

    await Log.create({
      action: 'ADMIN_UNBAN_IP',
      detail: `ปลดแบน IP ${unbannedIp}${usersToUnban.length > 0 ? ` พร้อมปลดแบนยูสเซอร์ (${usersToUnban.map(u => u.username).join(', ')})` : ''} โดย ${adminUsername}`,
      username: adminUsername,
      ip: getClientIp(req)
    });

    const list = await BannedIP.findAll({ order: [['bannedAt', 'DESC']] });
    res.json({
      message: `ปลดแบน IP ${unbannedIp} สำเร็จ${usersToUnban.length > 0 ? ` (และปลดแบนยูสเซอร์ ${usersToUnban.map(u => u.username).join(', ')})` : ''}`,
      bannedIps: list
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถปลดแบน IP ได้' });
  }
});

// DELETE /api/banned-ips/by-ip/:ip - Unban by IP Address directly
router.delete('/by-ip/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip).trim();
    const adminUsername = req.query.adminUsername || 'Admin';

    const count = await BannedIP.destroy({ where: { ip } });
    clearIpJail(ip);
    await refreshBannedIps();

    // Automatically unban any user accounts that were banned with/on this IP
    const usersToUnban = await User.findAll({
      where: {
        isBanned: true,
        [Op.or]: [{ lastIp: ip }, { registerIp: ip }]
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

    if (count > 0 || usersToUnban.length > 0) {
      await Log.create({
        action: 'ADMIN_UNBAN_IP',
        detail: `ปลดแบน IP ${ip}${usersToUnban.length > 0 ? ` พร้อมปลดแบนยูสเซอร์ (${usersToUnban.map(u => u.username).join(', ')})` : ''} โดย ${adminUsername}`,
        username: adminUsername,
        ip: getClientIp(req)
      });
    }

    const list = await BannedIP.findAll({ order: [['bannedAt', 'DESC']] });
    res.json({
      message: `ปลดแบน IP ${ip} สำเร็จ${usersToUnban.length > 0 ? ` (และปลดแบนยูสเซอร์ ${usersToUnban.map(u => u.username).join(', ')})` : ''}`,
      bannedIps: list
    });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถปลดแบน IP ได้' });
  }
});

// GET /api/banned-ips/jailed - List currently auto-jailed IPs
router.get('/jailed/list', (req, res) => {
  res.json({ jailedIps: getJailedIps() });
});

// POST /api/banned-ips/clear-jail - Clear Anti-DDoS jail
router.post('/clear-jail', async (req, res) => {
  try {
    const { ip } = req.body;
    const adminUsername = req.query.adminUsername || req.body?.adminUsername || 'Admin';
    if (ip) {
      clearIpJail(ip);
      await Log.create({
        action: 'ADMIN_CLEAR_DDOS_JAIL',
        detail: `ปลดการกักกัน DDoS (Auto-Jail) สำหรับ IP ${ip} โดย ${adminUsername}`,
        username: adminUsername,
        ip: getClientIp(req)
      });
      return res.json({ message: `ปลดการกักกัน DDoS ของ IP ${ip} สำเร็จ`, jailedIps: getJailedIps() });
    } else {
      const count = clearAllJails();
      await Log.create({
        action: 'ADMIN_CLEAR_ALL_DDOS_JAIL',
        detail: `ล้างการกักกัน DDoS (Auto-Jail) ทั้งหมด (${count} รายการ) โดย ${adminUsername}`,
        username: adminUsername,
        ip: getClientIp(req)
      });
      return res.json({ message: `ปลดการกักกัน DDoS ทั้งหมดเรียบร้อยแล้ว`, clearedCount: count, jailedIps: [] });
    }
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเคลียร์การกักกัน: ' + err.message });
  }
});

// GET /api/banned-ips/whitelist - List all whitelisted IPs
router.get('/whitelist/list', async (req, res) => {
  try {
    const list = await WhitelistedIP.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ whitelistedIps: list });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการ Whitelist' });
  }
});

// POST /api/banned-ips/whitelist - Add IP to whitelist
router.post('/whitelist/add', async (req, res) => {
  try {
    let { ip, note, addedBy } = req.body;
    if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุหมายเลข IP ที่ต้องการเพิ่มใน Whitelist' });
    }
    ip = ip.trim().replace('::ffff:', '');
    addedBy = addedBy || 'Admin';

    // Remove from BannedIP and AutoJail if present
    await BannedIP.destroy({ where: { ip } });
    clearIpJail(ip);

    const [record, created] = await WhitelistedIP.findOrCreate({
      where: { ip },
      defaults: {
        ip,
        note: note || 'เครือข่ายที่เชื่อถือได้ (School / Office / Admin)',
        addedBy
      }
    });

    if (!created && note) {
      record.note = note;
      record.addedBy = addedBy;
      await record.save();
    }

    await refreshWhitelistedIps();
    await refreshBannedIps();

    await Log.create({
      action: 'ADMIN_ADD_IP_WHITELIST',
      detail: `เพิ่ม IP ${ip} เข้าสู่ Whitelist (${note || 'เครือข่ายที่เชื่อถือได้'}) โดย ${addedBy}`,
      username: addedBy,
      ip: getClientIp(req)
    });

    const list = await WhitelistedIP.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ message: `เพิ่ม IP ${ip} ลงใน Whitelist เรียบร้อยแล้ว (จะไม่มีวันถูกระบบ Anti-DDoS บล็อก)`, whitelistedIps: list });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถเพิ่ม IP เข้า Whitelist ได้: ' + err.message });
  }
});

// DELETE /api/banned-ips/whitelist/:id - Remove IP from whitelist
router.delete('/whitelist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminUsername = req.query.adminUsername || 'Admin';
    const record = await WhitelistedIP.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'ไม่พบรายการนี้ใน Whitelist' });
    }
    const removedIp = record.ip;
    await record.destroy();
    await refreshWhitelistedIps();

    await Log.create({
      action: 'ADMIN_REMOVE_IP_WHITELIST',
      detail: `ลบ IP ${removedIp} ออกจาก Whitelist โดย ${adminUsername}`,
      username: adminUsername,
      ip: getClientIp(req)
    });

    const list = await WhitelistedIP.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ message: `ลบ IP ${removedIp} ออกจาก Whitelist เรียบร้อยแล้ว`, whitelistedIps: list });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถลบ IP ออกจาก Whitelist ได้: ' + err.message });
  }
});

module.exports = router;
