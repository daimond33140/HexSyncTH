// server/routes/giftcodes.js
const express = require('express');
const { GiftCode, User, Log, sequelize } = require('../models');
const { requireAdmin, verifyToken } = require('../middleware/auth');
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
router.post('/redeem', verifyToken, async (req, res) => {
  try {
    const { code, username } = req.body;
    if (!code || !username) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสโค้ดและเข้าสู่ระบบ' });
    }

    if (req.user && req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '❌ สิทธิ์การเข้าถึงถูกปฏิเสธ ไม่อนุญาตให้แลกรับโค้ดแทนบัญชีผู้อื่น' });
    }

    // Atomic transaction to prevent concurrency / race condition exploits
    const result = await sequelize.transaction(async (t) => {
      // Check if user already redeemed this code inside transaction to prevent parallel race condition
      const alreadyRedeemed = await Log.findOne({
        where: {
          action: 'USER_REDEEM_GIFTCODE',
          username,
          detail: { [require('sequelize').Op.like]: `%${cleanCode}%` }
        },
        transaction: t
      });

      if (alreadyRedeemed) {
        throw new Error('❌ คุณเคยแลกรับโค้ดนี้ไปแล้ว ไม่สามารถรับซ้ำได้');
      }

      const giftCode = await GiftCode.findOne({ where: { code: cleanCode }, transaction: t });

      if (!giftCode || !giftCode.isActive) {
        throw new Error('รหัสโค้ดไม่ถูกต้อง หรือถูกปิดการใช้งานแล้ว');
      }

      if (giftCode.usedCount >= giftCode.maxUses) {
        throw new Error('สิทธิ์การใช้งานโค้ดนี้เต็มแล้ว');
      }

      const user = await User.findOne({ where: { username }, transaction: t });
      if (!user) throw new Error('ไม่พบบัญชีผู้ใช้');

      // Apply credit atomically
      giftCode.usedCount += 1;
      if (giftCode.usedCount >= giftCode.maxUses) {
        giftCode.isActive = false;
      }
      await giftCode.save({ transaction: t });

      user.creditBalance = Number(user.creditBalance || 0) + Number(giftCode.creditAmount);
      await user.save({ transaction: t });

      await Log.create({
        action: 'USER_REDEEM_GIFTCODE',
        detail: `ผู้ใช้ ${username} นำโค้ด ${cleanCode} มารับเครดิตฟรี +฿${giftCode.creditAmount}`,
        username,
      }, { transaction: t });

      return {
        amount: giftCode.creditAmount,
        balance: user.creditBalance
      };
    });

    res.json({
      message: `🎉 แลกรับโค้ดสำเร็จ! ได้รับเครดิตฟรี +฿${result.amount.toLocaleString()} บาท`,
      amount: result.amount,
      balance: result.balance,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'แลกรับโค้ดไม่สำเร็จ' });
  }
});

module.exports = router;
