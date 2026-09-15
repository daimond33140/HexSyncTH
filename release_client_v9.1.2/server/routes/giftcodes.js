// server/routes/giftcodes.js
const express = require('express');
const { GiftCode, User, Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// 1. Get all gift codes (Admin Only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const codes = await GiftCode.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ giftCodes: codes });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโค้ดของขวัญ' });
  }
});

// 2. Create a new gift code (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { code, creditAmount, maxUses, adminUsername } = req.body;
    if (!code || !creditAmount || Number(creditAmount) <= 0) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสโค้ดและจำนวนเงินเครดิตให้ถูกต้อง' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await GiftCode.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ message: 'มีรหัสโค้ดนี้อยู่ในระบบแล้ว' });
    }

    const newCode = await GiftCode.create({
      code: cleanCode,
      creditAmount: Number(creditAmount),
      maxUses: Number(maxUses) || 1,
      usedCount: 0,
      isActive: true,
      createdBy: adminUsername || 'Admin',
    });

    await Log.create({
      action: 'ADMIN_CREATE_GIFTCODE',
      detail: `สร้างโค้ดเครดิตฟรี ${cleanCode} แจก ฿${creditAmount} (${newCode.maxUses} สิทธิ์) โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: `สร้างโค้ด ${cleanCode} สำเร็จ`, giftCode: newCode });
  } catch (err) {
    res.status(500).json({ message: 'สร้างโค้ดไม่สำเร็จ: ' + err.message });
  }
});

// 3. Delete a gift code (Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUsername } = req.query;
    const giftCode = await GiftCode.findByPk(id);
    if (!giftCode) return res.status(404).json({ message: 'ไม่พบโค้ดนี้' });

    await giftCode.destroy();

    await Log.create({
      action: 'ADMIN_DELETE_GIFTCODE',
      detail: `ลบโค้ดเครดิต ${giftCode.code} โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: 'ลบโค้ดเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ message: 'ลบโค้ดไม่สำเร็จ' });
  }
});

// 4. Redeem gift code (User)
router.post('/redeem', async (req, res) => {
  try {
    const { code, username } = req.body;
    if (!code || !username) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสโค้ดและเข้าสู่ระบบ' });
    }

    const cleanCode = code.trim().toUpperCase();
    const giftCode = await GiftCode.findOne({ where: { code: cleanCode } });

    if (!giftCode || !giftCode.isActive) {
      return res.status(400).json({ message: 'รหัสโค้ดไม่ถูกต้อง หรือถูกปิดการใช้งานแล้ว' });
    }

    if (giftCode.usedCount >= giftCode.maxUses) {
      return res.status(400).json({ message: 'สิทธิ์การใช้งานโค้ดนี้เต็มแล้ว' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    // Apply credit
    giftCode.usedCount += 1;
    if (giftCode.usedCount >= giftCode.maxUses) {
      giftCode.isActive = false;
    }
    await giftCode.save();

    user.creditBalance = Number(user.creditBalance || 0) + Number(giftCode.creditAmount);
    await user.save();

    await Log.create({
      action: 'USER_REDEEM_GIFTCODE',
      detail: `ผู้ใช้ ${username} นำโค้ด ${cleanCode} มารับเครดิตฟรี +฿${giftCode.creditAmount}`,
      username,
    });

    res.json({
      message: `🎉 แลกรับโค้ดสำเร็จ! ได้รับเครดิตฟรี +฿${giftCode.creditAmount.toLocaleString()} บาท`,
      amount: giftCode.creditAmount,
      balance: user.creditBalance,
    });
  } catch (err) {
    res.status(500).json({ message: 'แลกรับโค้ดไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
