// server/routes/coupons.js
const express = require('express');
const { Coupon, Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// 1. Get all coupons (Admin Only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลคูปองไม่สำเร็จ' });
  }
});

// 2. Create coupon (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minSpend, maxUses, adminUsername } = req.body;
    if (!code || !discountValue || Number(discountValue) <= 0) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสคูปองและมูลค่าส่วนลดให้ถูกต้อง' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ message: 'มีรหัสคูปองนี้อยู่ในระบบแล้ว' });
    }

    const newCoupon = await Coupon.create({
      code: cleanCode,
      discountType: discountType === 'percent' ? 'percent' : 'fixed',
      discountValue: Number(discountValue),
      minSpend: Number(minSpend) || 0,
      maxUses: Number(maxUses) || 100,
      usedCount: 0,
      isActive: true,
      createdBy: adminUsername || 'Admin',
    });

    await Log.create({
      action: 'ADMIN_CREATE_COUPON',
      detail: `สร้างคูปองส่วนลด ${cleanCode} (${newCoupon.discountType === 'percent' ? newCoupon.discountValue + '%' : '฿' + newCoupon.discountValue}) โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: `สร้างคูปอง ${cleanCode} สำเร็จ`, coupon: newCoupon });
  } catch (err) {
    res.status(500).json({ message: 'สร้างคูปองไม่สำเร็จ: ' + err.message });
  }
});

// 3. Delete coupon (Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUsername } = req.query;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ message: 'ไม่พบคูปองนี้' });

    await coupon.destroy();

    await Log.create({
      action: 'ADMIN_DELETE_COUPON',
      detail: `ลบคูปองส่วนลด ${coupon.code} โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    res.json({ message: 'ลบคูปองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ลบคูปองไม่สำเร็จ' });
  }
});

// 4. Validate coupon (Checkout)
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    const total = Number(cartTotal) || 0;

    if (!code) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสคูปองส่วนลด' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ where: { code: cleanCode } });

    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ message: 'รหัสคูปองไม่ถูกต้อง หรือหมดอายุแล้ว' });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: 'สิทธิ์การใช้งานคูปองนี้เต็มแล้ว' });
    }

    if (total < coupon.minSpend) {
      return res.status(400).json({
        message: `ยอดสั่งซื้อขั้นต่ำสำหรับคูปองนี้คือ ฿${coupon.minSpend.toLocaleString()} บาท (ปัจจุบัน ฿${total.toLocaleString()})`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percent') {
      discountAmount = Math.round((total * coupon.discountValue) / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, total);
    const netTotal = Math.max(0, total - discountAmount);

    res.json({
      valid: true,
      message: `ใช้คูปองส่วนลด ${coupon.code} สำเร็จ! ลดทันที ฿${discountAmount.toLocaleString()} บาท`,
      discountAmount,
      netTotal,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'ตรวจสอบคูปองไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
