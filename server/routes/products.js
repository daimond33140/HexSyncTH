// server/routes/products.js
const express = require('express');
const { Product, ProductKey, Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Auto seed default products and distinct stock keys into PostgreSQL (Only on initial empty database)
async function ensureProducts() {
  try {
    const totalCount = await Product.count();
    if (totalCount === 0) {
      // Create initial default ROV products only when database is completely brand new
      const rov1d = await Product.create({
        name: 'ROV 1D (รหัสคีย์ 1 วัน)',
        categoryId: 'games',
        price: 50,
        originalPrice: 100,
        downloadUrl: 'https://rov.in.th',
        description: 'คีย์แท้ใช้งานได้ 1 วันเต็ม รับประกันสินค้า 100% ส่งมอบทันที',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        badge: 'HOT',
        stock: 3,
        active: true,
      });
      await ProductKey.bulkCreate([
        { productId: rov1d.id, keyString: 'ROV1D-KEY-123' },
        { productId: rov1d.id, keyString: 'ROV1D-KEY-4124' },
        { productId: rov1d.id, keyString: 'ROV1D-KEY-8831' },
      ]);

      const rov3d = await Product.create({
        name: 'ROV 3D (รหัสคีย์ 3 วัน)',
        categoryId: 'games',
        price: 130,
        originalPrice: 250,
        downloadUrl: 'https://rov.in.th',
        description: 'คีย์แท้ใช้งานได้ 3 วันเต็ม ไม่จำกัดเวลา ออโต้ตัดรอบ',
        image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
        badge: 'BESTSELLER',
        stock: 2,
        active: true,
      });
      await ProductKey.bulkCreate([
        { productId: rov3d.id, keyString: 'ROV3D-GOLD-5501' },
        { productId: rov3d.id, keyString: 'ROV3D-GOLD-7712' },
      ]);

      const rov7d = await Product.create({
        name: 'ROV 7D (รหัสคีย์ 7 วัน)',
        categoryId: 'games',
        price: 280,
        originalPrice: 500,
        downloadUrl: 'https://rov.in.th',
        description: 'คีย์แท้ VIP ใช้งานได้ 7 วันเต็ม ซัพพอร์ตตลอดการใช้งาน',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        badge: 'VIP',
        stock: 3,
        active: true,
      });
      await ProductKey.bulkCreate([
        { productId: rov7d.id, keyString: 'ROV7D-VIP-3301' },
        { productId: rov7d.id, keyString: 'ROV7D-VIP-8819' },
        { productId: rov7d.id, keyString: 'ROV7D-VIP-9941' },
      ]);

      console.log('Seeded initial ROV products and stock keys');
    }

    // Set first 2 products as featured if none are featured yet
    const featuredCount = await Product.count({ where: { isFeatured: true } });
    if (featuredCount === 0) {
      const topProducts = await Product.findAll({ limit: 2, order: [['id', 'ASC']] });
      for (const p of topProducts) {
        await p.update({ isFeatured: true });
      }
    }
  } catch (err) {
    console.error('Error seeding products:', err.message);
  }
}
ensureProducts();

// In-memory micro-cache for Anti-DDoS / Traffic Spike absorption
let cachedProducts = null;
let cacheExpiry = 0;

function invalidateProductCache() {
  cachedProducts = null;
  cacheExpiry = 0;
}

// Get all products with actual dynamic stock count (High-speed cached)
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedProducts && now < cacheExpiry) {
      return res.json({ products: cachedProducts });
    }

    const products = await Product.findAll({ order: [['id', 'ASC']] });
    
    // Attach real live stock count based on unused ProductKey
    const results = await Promise.all(products.map(async (p) => {
      const realStock = await ProductKey.count({
        where: { productId: p.id, isUsed: false }
      });
      p.stock = realStock;
      return p;
    }));

    cachedProducts = results;
    cacheExpiry = now + 3000; // 3 seconds micro-cache

    res.json({ products: results });
  } catch (err) {
    if (cachedProducts) {
      return res.json({ products: cachedProducts });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการโหลดสินค้า' });
  }
});

// Get keys for a specific product (Admin Only)
router.get('/:id/keys', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const keys = await ProductKey.findAll({
      where: { productId: id },
      order: [['isUsed', 'ASC'], ['id', 'ASC']]
    });
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลคีย์ได้' });
  }
});

// Add stock keys to a product (Admin Only)
// Supports multi-line keys input: "KEY1\nKEY2\nKEY3"
router.post('/:id/keys', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { keysText, adminUsername } = req.body;
    if (!keysText || !keysText.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสคีย์ที่ต้องการเติม' });
    }

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'ไม่พบสินค้า' });

    // Split by newlines, trim and filter empty
    const lines = keysText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ message: 'ไม่พบคีย์ที่ถูกต้อง' });
    }

    const created = await ProductKey.bulkCreate(
      lines.map(k => ({
        productId: product.id,
        keyString: k,
        isUsed: false
      }))
    );

    const newTotalStock = await ProductKey.count({
      where: { productId: product.id, isUsed: false }
    });
    product.stock = newTotalStock;
    await product.save();

    await Log.create({
      action: 'ADMIN_ADD_KEYS',
      detail: `เติมสต็อกคีย์สินค้า "${product.name}" จำนวน ${lines.length} ชิ้น (สต็อกรวมปัจจุบัน: ${newTotalStock})`,
      username: adminUsername || 'Admin',
    });

    invalidateProductCache();
    res.status(201).json({
      message: `เติมสต็อกสำเร็จ +${lines.length} คีย์ (สต็อกคงเหลือ: ${newTotalStock})`,
      countAdded: lines.length,
      totalStock: newTotalStock,
      created
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเติมคีย์: ' + err.message });
  }
});

// Delete a key from stock (Admin Only)
router.delete('/:id/keys/:keyId', requireAdmin, async (req, res) => {
  try {
    const { id, keyId } = req.params;
    const pKey = await ProductKey.findOne({ where: { id: keyId, productId: id } });
    if (!pKey) return res.status(404).json({ message: 'ไม่พบคีย์นี้' });

    await pKey.destroy();

    const newTotalStock = await ProductKey.count({
      where: { productId: id, isUsed: false }
    });
    await Product.update({ stock: newTotalStock }, { where: { id } });

    invalidateProductCache();
    res.json({ message: 'ลบคีย์ออกจากสต็อกเรียบร้อย', totalStock: newTotalStock });
  } catch (err) {
    res.status(500).json({ message: 'ลบคีย์ไม่สำเร็จ' });
  }
});

// Toggle featured status (Admin Only)
router.patch('/:id/featured', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, adminUsername } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'ไม่พบสินค้า' });

    const newFeatured = isFeatured !== undefined ? Boolean(isFeatured) : !product.isFeatured;
    await product.update({ isFeatured: newFeatured });

    await Log.create({
      action: 'ADMIN_TOGGLE_FEATURED',
      detail: `${newFeatured ? 'ปักหมุด' : 'ยกเลิก'}สินค้าแนะนำหน้าแรก: "${product.name}" (ID: ${id})`,
      username: adminUsername || 'Admin',
    });

    invalidateProductCache();
    res.json({ success: true, isFeatured: newFeatured, message: `${newFeatured ? 'ตั้งเป็น' : 'ยกเลิก'}สินค้าแนะนำเรียบร้อย` });
  } catch (err) {
    res.status(500).json({ message: 'เปลี่ยนสถานะสินค้าแนะนำไม่สำเร็จ: ' + err.message });
  }
});

// Add new product (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, price, originalPrice, downloadUrl, description, image, badge, initialKeys, isFeatured } = req.body;
    const newProduct = await Product.create({
      name,
      categoryId: categoryId || 'rov',
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      downloadUrl: downloadUrl || 'https://store.steampowered.com',
      description: description || 'สินค้าคุณภาพพร้อมส่งมอบทันที',
      image: image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      badge: badge || 'NEW',
      stock: 0,
      active: true,
      isFeatured: Boolean(isFeatured),
    });

    // If initial keys provided
    if (initialKeys && initialKeys.trim()) {
      const lines = initialKeys.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        await ProductKey.bulkCreate(
          lines.map(k => ({ productId: newProduct.id, keyString: k, isUsed: false }))
        );
        newProduct.stock = lines.length;
        await newProduct.save();
      }
    }

    await Log.create({
      action: 'ADMIN_ADD_PRODUCT',
      detail: `เพิ่มสินค้าใหม่: ${newProduct.name} ราคา ${newProduct.price} บาท (สต็อกเริ่มต้น: ${newProduct.stock})`,
      username: req.body.adminUsername || 'Admin',
    });

    invalidateProductCache();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ message: 'เพิ่มสินค้าไม่สำเร็จ: ' + err.message });
  }
});

// Update product & download link (Admin Only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, price, originalPrice, downloadUrl, description, image, badge, active, isFeatured } = req.body;
    const safeUpdates = {};
    if (name !== undefined) safeUpdates.name = name;
    if (categoryId !== undefined) safeUpdates.categoryId = categoryId;
    if (price !== undefined) safeUpdates.price = Number(price);
    if (originalPrice !== undefined) safeUpdates.originalPrice = originalPrice ? Number(originalPrice) : null;
    if (downloadUrl !== undefined) safeUpdates.downloadUrl = downloadUrl;
    if (description !== undefined) safeUpdates.description = description;
    if (image !== undefined) safeUpdates.image = image;
    if (badge !== undefined) safeUpdates.badge = badge;
    if (active !== undefined) safeUpdates.active = Boolean(active);
    if (isFeatured !== undefined) safeUpdates.isFeatured = Boolean(isFeatured);

    await product.update(safeUpdates);

    await Log.create({
      action: 'ADMIN_UPDATE_PRODUCT',
      detail: `แก้ไขสินค้า ID: ${id} (${product.name}), ลิงก์ดาวน์โหลด: ${product.downloadUrl}`,
      username: req.body.adminUsername || 'Admin',
    });

    invalidateProductCache();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'อัปเดตสินค้าไม่สำเร็จ' });
  }
});

// Delete product (Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'ไม่พบสินค้า หรือสินค้านี้ถูกลบไปแล้ว' });
    }

    const name = product.name;
    // Destroy all stock keys associated with this product
    await ProductKey.destroy({ where: { productId: id } });
    
    // Destroy the product record
    await product.destroy();

    const adminUser = req.query.adminUsername || req.body?.adminUsername || 'Admin';
    await Log.create({
      action: 'ADMIN_DELETE_PRODUCT',
      detail: `ลบสินค้า ID: ${id} (${name}) พร้อมสต็อกคีย์ทั้งหมด`,
      username: adminUser,
    });

    invalidateProductCache();
    res.json({ success: true, message: `ลบสินค้า "${name}" สำเร็จ`, id: Number(id) });
  } catch (err) {
    console.error('DELETE product error:', err);
    res.status(500).json({ message: 'ลบสินค้าไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
module.exports.invalidateProductCache = invalidateProductCache;
