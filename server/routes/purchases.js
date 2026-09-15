// server/routes/purchases.js
const express = require('express');
const { Purchase, Product, ProductKey, User, Log, Coupon, sequelize } = require('../models');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get purchase history for user or all (if admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { username, userId } = req.query;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    
    const where = {};
    if (isAdmin) {
      if (username) where.username = username;
      if (userId) where.userId = userId;
    } else {
      // Non-admins can strictly only see their own purchases
      where.username = req.user.username;
    }

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
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { username, items, couponCode } = req.body; // items: [{ productId, quantity }]
    if (!username || !items || !items.length) {
      return res.status(400).json({ message: 'ข้อมูลการสั่งซื้อไม่ถูกต้อง' });
    }

    // Enforce identity: Caller must be the account owner or an admin
    if (req.user && req.user.username !== username && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '❌ สิทธิ์การเข้าถึงถูกปฏิเสธ ไม่อนุญาตให้สั่งซื้อโดยใช้ยอดเงินของบัญชีผู้อื่น' });
    }

    // Execute checkout inside an ACID database transaction to prevent race conditions & double-spending
    const result = await sequelize.transaction(async (t) => {
      const user = await User.findOne({ where: { username }, transaction: t });
      if (!user) {
        throw new Error('ไม่พบบัญชีผู้ใช้');
      }

      let totalPrice = 0;
      const orderItems = [];

      // Verify products, stock keys availability, and calculate total
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (!product) {
          throw new Error(`ไม่พบสินค้า ID: ${item.productId}`);
        }

        const availableKeysCount = await ProductKey.count({
          where: { productId: product.id, isUsed: false },
          transaction: t
        });

        const reqQty = item.quantity || 1;
        if (availableKeysCount < reqQty) {
          throw new Error(`สินค้า "${product.name}" สต็อกไม่เพียงพอ (มีคีย์ว่าง ${availableKeysCount} ชิ้น แต่ต้องการ ${reqQty} ชิ้น)`);
        }

        totalPrice += product.price * reqQty;
        orderItems.push({ product, quantity: reqQty });
      }

      // Apply coupon discount if provided
      let discountAmount = 0;
      let appliedCoupon = null;

      if (couponCode) {
        const cleanCoupon = couponCode.trim().toUpperCase();
        const coupon = await Coupon.findOne({ where: { code: cleanCoupon }, transaction: t });
        if (coupon && coupon.isActive && coupon.usedCount < coupon.maxUses && totalPrice >= coupon.minSpend) {
          if (coupon.discountType === 'percent') {
            discountAmount = Math.round((totalPrice * coupon.discountValue) / 100);
          } else {
            discountAmount = coupon.discountValue;
          }
          discountAmount = Math.min(discountAmount, totalPrice);
          appliedCoupon = coupon;

          // Increment coupon usage atomically
          coupon.usedCount += 1;
          if (coupon.usedCount >= coupon.maxUses) {
            coupon.isActive = false;
          }
          await coupon.save({ transaction: t });
        }
      }

      const finalPrice = Math.max(0, totalPrice - discountAmount);

      // Check user balance
      if (Number(user.creditBalance) < finalPrice) {
        throw new Error(`ยอดเงินไม่เพียงพอ (ต้องการ ฿${finalPrice.toLocaleString()} แต่มี ฿${Number(user.creditBalance).toLocaleString()}) กรุณาเติมเงิน`);
      }

      // Deduct balance atomically
      user.creditBalance = Number(user.creditBalance) - finalPrice;
      await user.save({ transaction: t });

      const createdPurchases = [];

      // Process each item and pop unique real keys
      for (const order of orderItems) {
        const p = order.product;
        for (let i = 0; i < order.quantity; i++) {
          // Find next unused distinct key
          const pKey = await ProductKey.findOne({
            where: { productId: p.id, isUsed: false },
            order: [['id', 'ASC']],
            transaction: t
          });

          if (!pKey) {
            throw new Error(`คีย์สินค้า "${p.name}" หมดระหว่างการสั่งซื้อ`);
          }

          // Mark key as used
          pKey.isUsed = true;
          pKey.usedBy = user.username;
          pKey.usedAt = new Date();
          await pKey.save({ transaction: t });

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
          }, { transaction: t });
          createdPurchases.push(purchase);
        }

        // Update remaining stock count
        const remainingStock = await ProductKey.count({
          where: { productId: p.id, isUsed: false },
          transaction: t
        });
        p.stock = remainingStock;
        await p.save({ transaction: t });
      }

      await Log.create({
        action: 'PURCHASE_COMPLETED',
        detail: `ผู้ใช้ ${user.username} สั่งซื้อสำเร็จ ${createdPurchases.length} รายการ รวม ฿${totalPrice.toLocaleString()} บาท (จ่ายจริง ฿${finalPrice.toLocaleString()})`,
        username: user.username,
      }, { transaction: t });

      return {
        createdPurchases,
        newBalance: user.creditBalance
      };
    });

    try {
      const { invalidateProductCache } = require('./products');
      if (typeof invalidateProductCache === 'function') invalidateProductCache();
    } catch {}

    res.status(201).json({
      message: 'การสั่งซื้อสำเร็จ ระบบได้ดึงคีย์จริงออกจากสต็อกเรียบร้อยแล้ว',
      purchases: result.createdPurchases,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(400).json({ message: err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ' });
  }
});

module.exports = router;
