// server/routes/categories.js
const express = require('express');
const { Category, Product, Log } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Auto seed default categories if none exist
async function ensureCategories() {
  try {
    const count = await Category.count();
    if (count === 0) {
      await Category.bulkCreate([
        {
          name: 'ROV (Realm of Valor)',
          slug: 'rov',
          bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
          icon: 'gamepad',
          description: 'โปร ROV ล็อคเป้า มองแมพ กันแบน 100% เล่นได้ทั้งมือถือและคอมพิวเตอร์',
          displayOrder: 1,
          isActive: true,
        },
        {
          name: 'Valorant',
          slug: 'valorant',
          bannerImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
          icon: 'crosshair',
          description: 'โปร Valorant คีย์แท้ VIP มองทะลุ ล็อคหัว บายพาส Vanguard ปลอดภัยสูง',
          displayOrder: 2,
          isActive: true,
        },
        {
          name: 'Free Fire',
          slug: 'freefire',
          bannerImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
          icon: 'zap',
          description: 'โปร Free Fire ล็อคหัว 100% วิ่งไว มองทะลุกำแพง ยิงทะลุสิ่งกีดขวาง',
          displayOrder: 3,
          isActive: true,
        },
        {
          name: 'GTA V / FiveM',
          slug: 'fivem',
          bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
          icon: 'shield',
          description: 'โปร FiveM เสกเงิน วาป ล็อคหัว ล็อคเป้า ปลดแบน HWID ปลอดภัยสูงสุด',
          displayOrder: 4,
          isActive: true,
        },
        {
          name: 'ซอฟต์แวร์ & ทั่วไป (Software)',
          slug: 'software',
          bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
          icon: 'laptop',
          description: 'ซอฟต์แวร์ อุปกรณ์เสริม คีย์วินโดว์แท้ และบริการเกมมิ่งอื่นๆ',
          displayOrder: 5,
          isActive: true,
        },
      ]);
      console.log('Seeded default game categories with banners');
    }

    // Also migrate any existing products with categoryId 'games' to 'rov' if needed
    await Product.update({ categoryId: 'rov' }, { where: { categoryId: 'games' } });
  } catch (err) {
    console.error('Error ensuring categories:', err.message);
  }
}
ensureCategories();

// In-memory cache for fast category listing
let cachedCategories = null;
let cacheExpiry = 0;

function invalidateCategoryCache() {
  cachedCategories = null;
  cacheExpiry = 0;
}

// GET all active categories (Public)
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedCategories && now < cacheExpiry) {
      return res.json({ categories: cachedCategories });
    }

    const categories = await Category.findAll({
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    // Also attach product count for each category
    const results = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.count({
          where: { categoryId: cat.slug, active: true },
        });
        const c = cat.toJSON();
        c.productCount = productCount;
        return c;
      })
    );

    cachedCategories = results;
    cacheExpiry = now + 4000; // 4s micro-cache

    res.json({ categories: results });
  } catch (err) {
    if (cachedCategories) {
      return res.json({ categories: cachedCategories });
    }
    res.status(500).json({ message: 'ไม่สามารถโหลดหมวดหมู่ได้' });
  }
});

// POST create category (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, slug, bannerImage, description, icon, displayOrder, isActive, adminUsername } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อหมวดหมู่' });
    }

    const categorySlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `cat-${Date.now()}`;

    // Check slug uniqueness
    const existing = await Category.findOne({ where: { slug: categorySlug } });
    if (existing) {
      return res.status(400).json({ message: 'รหัสหมวดหมู่ (Slug) นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น' });
    }

    const newCategory = await Category.create({
      name: name.trim(),
      slug: categorySlug,
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      description: description || '',
      icon: icon || 'gamepad',
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive !== false,
    });

    await Log.create({
      action: 'ADMIN_CREATE_CATEGORY',
      detail: `สร้างหมวดหมู่ใหม่: "${newCategory.name}" (Slug: ${newCategory.slug})`,
      username: adminUsername || 'Admin',
    });

    invalidateCategoryCache();
    res.status(201).json({ success: true, message: 'สร้างหมวดหมู่สำเร็จ', category: newCategory });
  } catch (err) {
    res.status(500).json({ message: 'สร้างหมวดหมู่ไม่สำเร็จ: ' + err.message });
  }
});

// PUT update category (Admin Only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, bannerImage, description, icon, displayOrder, isActive, adminUsername } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้' });
    }

    const oldSlug = category.slug;

    // Check if slug changed and is taken
    if (slug && slug !== oldSlug) {
      const existing = await Category.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({ message: 'รหัสหมวดหมู่ (Slug) ซ้ำกับหมวดอื่น' });
      }
      // Also update products pointing to old slug
      await Product.update({ categoryId: slug }, { where: { categoryId: oldSlug } });
    }

    await category.update({
      name: name !== undefined ? name.trim() : category.name,
      slug: slug !== undefined ? slug.trim() : category.slug,
      bannerImage: bannerImage !== undefined ? bannerImage : category.bannerImage,
      description: description !== undefined ? description : category.description,
      icon: icon !== undefined ? icon : category.icon,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : category.displayOrder,
      isActive: isActive !== undefined ? isActive : category.isActive,
    });

    await Log.create({
      action: 'ADMIN_UPDATE_CATEGORY',
      detail: `แก้ไขหมวดหมู่ ID: ${id} ("${category.name}")`,
      username: adminUsername || 'Admin',
    });

    invalidateCategoryCache();
    res.json({ success: true, message: 'อัปเดตหมวดหมู่สำเร็จ', category });
  } catch (err) {
    res.status(500).json({ message: 'อัปเดตหมวดหมู่ไม่สำเร็จ: ' + err.message });
  }
});

// DELETE category (Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้' });
    }

    const name = category.name;
    const slug = category.slug;

    // Destroy category
    await category.destroy();

    await Log.create({
      action: 'ADMIN_DELETE_CATEGORY',
      detail: `ลบหมวดหมู่ ID: ${id} ("${name}", slug: ${slug})`,
      username: req.query.adminUsername || req.body?.adminUsername || 'Admin',
    });

    invalidateCategoryCache();
    res.json({ success: true, message: `ลบหมวดหมู่ "${name}" สำเร็จ`, id: Number(id) });
  } catch (err) {
    res.status(500).json({ message: 'ลบหมวดหมู่ไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
module.exports.invalidateCategoryCache = invalidateCategoryCache;
