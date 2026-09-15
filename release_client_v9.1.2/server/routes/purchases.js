// server/routes/purchases.js
const express = require('express');
const { Purchase, Product, ProductKey, User, Log, Coupon } = require('../models');
const router = express.Router();

// Get purchase history for user or all (if admin)
router.get('/', async (req, res) => {
  try {
    const { username, userId } = req.query;
    const where = {};
    if (username) where.username = username;
    if (userId) where.userId = userId;
    const purchases = await Purchase.findAll({
      where,
      order: [['id', 'DESC']],
    });
    res.json({ purchases });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถโหลดประวัติการซื้อได้' });
  }
});

// Checkout items (cart or single) - pulls individual distinct keys from ProductKey pool
router.post('/checkout', async (req, res) => {
  try {
    const { username, items, couponCode } = req.body; // items: [{ productId, quantity }]
    if (!username || !items || !items.length) {
      return res.status(400).json({ message: 'ข้อมูลการสั่งซื้อไม่ถูกต้อง' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    let totalPrice = 0;
    const orderItems = [];

    // Verify products, stock keys availability, and calculate total
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        return res.status(404).json({ message: `ไม่พบสินค้า ID: ${item.productId}` });
      }

      const availableKeysCount = await ProductKey.count({
        where: { productId: product.id, isUsed: false }
      });

      const reqQty = item.quantity || 1;
      if (availableKeysCount < reqQty) {
        return res.status(400).json({
          message: `สินค้า "${product.name}" สต็อกไม่เพียงพอ (มีคีย์ว่าง ${availableKeysCount} ชิ้น แต่ต้องการ ${reqQty} ชิ้น)`
        });
      }

      totalPrice += product.price * reqQty;
      orderItems.push({ product, quantity: reqQty });
    }

    // Apply coupon discount if provided
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({ where: { code: cleanCoupon } });
      if (coupon && coupon.isActive && coupon.usedCount < coupon.maxUses && totalPrice >= coupon.minSpend) {
        if (coupon.discountType === 'percent') {
          discountAmount = Math.round((totalPrice * coupon.discountValue) / 100);
        } else {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.min(discountAmount, totalPrice);
        appliedCoupon = coupon;

        // Increment coupon usage
        coupon.usedCount += 1;
        if (coupon.usedCount >= coupon.maxUses) {
          coupon.isActive = false;
        }
        await coupon.save();
      }
    }

    const finalPrice = Math.max(0, totalPrice - discountAmount);

    // Check user balance
    if (user.creditBalance < finalPrice) {
      return res.status(400).json({
        message: `ยอดเงินไม่เพียงพอ (ต้องการ ฿${finalPrice.toLocaleString()} แต่มี ฿${user.creditBalance.toLocaleString()}) กรุณาเติมเงิน`
      });
    }

    // Deduct balance
    user.creditBalance -= finalPrice;
    await user.save();

    const createdPurchases = [];

    // Process each item and pop unique real keys
    for (const order of orderItems) {
      const p = order.product;
      for (let i = 0; i < order.quantity; i++) {
        // Find next unused distinct key
        const pKey = await ProductKey.findOne({
          where: { productId: p.id, isUsed: false },
          order: [['id', 'ASC']]
        });

        if (!pKey) {
          throw new Error(`คีย์สินค้า "${p.name}" หมดระหว่างการสั่งซื้อ`);
        }

        // Mark key as used
        pKey.isUsed = true;
        pKey.usedBy = user.username;
        pKey.usedAt = new Date();
        await pKey.save();

        // Create purchase record with real unique key
        const purchase = await Purchase.create({
          userId: user.id,
          username: user.username,
          productId: p.id,
          productName: p.name,
          price: p.price,
          key: pKey.keyString,
          downloadUrl: p.downloadUrl || 'https://store.steampowered.com',
          purchaseDate: new Date(),
        });
        createdPurchases.push(purchase);
      }

      // Update remaining stock count
      const remainingStock = await ProductKey.count({
        where: { productId: p.id, isUsed: false }
      });
      p.stock = remainingStock;
      await p.save();
    }

    await Log.create({
      action: 'PURCHASE_COMPLETED',
      detail: `ผู้ใช้ ${user.username} สั่งซื้อสำเร็จ ${createdPurchases.length} รายการ รวม ฿${totalPrice.toLocaleString()} บาท`,
      username: user.username,
    });

    try {
      const { invalidateProductCache } = require('./products');
      if (typeof invalidateProductCache === 'function') invalidateProductCache();
    } catch {}

    res.status(201).json({
      message: 'การสั่งซื้อสำเร็จ ระบบได้ดึงคีย์จริงออกจากสต็อกเรียบร้อยแล้ว',
      purchases: createdPurchases,
      newBalance: user.creditBalance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสั่งซื้อ: ' + err.message });
  }
});

module.exports = router;
