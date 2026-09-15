// server/utils/create_clean_template_db.js
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

async function createCleanDatabase(targetSqlitePath) {
  console.log(`[Clean DB Generator] Creating pristine template database at: ${targetSqlitePath}`);

  if (fs.existsSync(targetSqlitePath)) {
    try {
      fs.unlinkSync(targetSqlitePath);
    } catch (e) {
      console.warn('Could not remove existing file:', e.message);
    }
  }

  const dir = path.dirname(targetSqlitePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: targetSqlitePath,
    logging: false,
  });

  // Define User
  const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'member' },
    creditBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
    lastIp: { type: DataTypes.STRING, defaultValue: '127.0.0.1' },
    registerIp: { type: DataTypes.STRING, defaultValue: '127.0.0.1' },
    isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
    banReason: { type: DataTypes.STRING, allowNull: true },
    bannedBy: { type: DataTypes.STRING, allowNull: true },
    bannedAt: { type: DataTypes.DATE, allowNull: true },
    bannedUntil: { type: DataTypes.DATE, allowNull: true },
    lastActive: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deviceFingerprint: { type: DataTypes.STRING, allowNull: true },
    lastDeviceModel: { type: DataTypes.STRING, allowNull: true },
    deviceInfo: { type: DataTypes.TEXT, allowNull: true },
    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    region: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    isp: { type: DataTypes.STRING, allowNull: true },
    locationUpdatedAt: { type: DataTypes.DATE, allowNull: true }
  });

  // Define Category
  const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    bannerImage: { type: DataTypes.TEXT },
    icon: { type: DataTypes.STRING, defaultValue: 'gamepad' },
    description: { type: DataTypes.TEXT },
    displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  // Define Product
  const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    categoryId: { type: DataTypes.STRING, defaultValue: 'general' },
    price: { type: DataTypes.FLOAT, allowNull: false },
    originalPrice: { type: DataTypes.FLOAT },
    key: { type: DataTypes.TEXT },
    downloadUrl: { type: DataTypes.STRING, defaultValue: 'https://store.steampowered.com' },
    description: { type: DataTypes.TEXT },
    image: { type: DataTypes.TEXT },
    badge: { type: DataTypes.STRING, defaultValue: 'HOT' },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  // Define ProductKey
  const ProductKey = sequelize.define('ProductKey', {
    productId: { type: DataTypes.INTEGER, allowNull: false },
    keyString: { type: DataTypes.TEXT, allowNull: false },
    isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
    usedBy: { type: DataTypes.STRING },
    usedAt: { type: DataTypes.DATE }
  });

  Product.hasMany(ProductKey, { foreignKey: 'productId', as: 'stockKeys' });
  ProductKey.belongsTo(Product, { foreignKey: 'productId' });

  // Define Other Models for full schema compatibility
  const Purchase = sequelize.define('Purchase', {
    userId: { type: DataTypes.INTEGER },
    username: { type: DataTypes.STRING },
    productId: { type: DataTypes.INTEGER },
    productName: { type: DataTypes.STRING },
    price: { type: DataTypes.FLOAT },
    key: { type: DataTypes.TEXT },
    downloadUrl: { type: DataTypes.STRING },
    purchaseDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const Log = sequelize.define('Log', {
    action: { type: DataTypes.STRING, allowNull: false },
    detail: { type: DataTypes.TEXT },
    username: { type: DataTypes.STRING, defaultValue: 'System' },
    ip: { type: DataTypes.STRING, defaultValue: '127.0.0.1' }
  });

  const Setting = sequelize.define('Setting', {
    key: { type: DataTypes.STRING, unique: true, allowNull: false },
    value: { type: DataTypes.TEXT }
  });

  const GiftCode = sequelize.define('GiftCode', {
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    creditAmount: { type: DataTypes.FLOAT, allowNull: false },
    maxUses: { type: DataTypes.INTEGER, defaultValue: 1 },
    usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.STRING, defaultValue: 'admin' }
  });

  const Coupon = sequelize.define('Coupon', {
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    discountType: { type: DataTypes.STRING, defaultValue: 'fixed' },
    discountValue: { type: DataTypes.FLOAT, allowNull: false },
    minSpend: { type: DataTypes.FLOAT, defaultValue: 0 },
    maxUses: { type: DataTypes.INTEGER, defaultValue: 100 },
    usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.STRING, defaultValue: 'admin' }
  });

  const SlipTransaction = sequelize.define('SlipTransaction', {
    username: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    slipImageUrl: { type: DataTypes.TEXT },
    slipHash: { type: DataTypes.STRING, allowNull: true },
    transRef: { type: DataTypes.STRING, allowNull: true },
    qrData: { type: DataTypes.TEXT, allowNull: true },
    sendingBank: { type: DataTypes.STRING, allowNull: true },
    verifiedVia: { type: DataTypes.STRING, defaultValue: 'auto' },
    status: { type: DataTypes.STRING, defaultValue: 'approved' }
  });

  const PaymentOrder = sequelize.define('PaymentOrder', {
    orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
    username: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    qrPayload: { type: DataTypes.TEXT, allowNull: false },
    promptpayNumber: { type: DataTypes.STRING, allowNull: true },
    accountName: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    transRef: { type: DataTypes.STRING, allowNull: true }
  });

  const BannedIP = sequelize.define('BannedIP', {
    ip: { type: DataTypes.STRING, allowNull: false, unique: true },
    reason: { type: DataTypes.STRING, defaultValue: 'แบนโดยแอดมิน' },
    bannedBy: { type: DataTypes.STRING, defaultValue: 'Admin' },
    bannedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    bannedUntil: { type: DataTypes.DATE, allowNull: true }
  });

  const BannedDevice = sequelize.define('BannedDevice', {
    deviceId: { type: DataTypes.STRING, allowNull: false, unique: true },
    deviceModel: { type: DataTypes.STRING, defaultValue: 'Unknown' },
    os: { type: DataTypes.STRING, allowNull: true },
    browser: { type: DataTypes.STRING, allowNull: true },
    gpu: { type: DataTypes.STRING, allowNull: true },
    screenResolution: { type: DataTypes.STRING, allowNull: true },
    lastIp: { type: DataTypes.STRING, allowNull: true },
    reason: { type: DataTypes.STRING, defaultValue: 'Hardware Ban' },
    bannedBy: { type: DataTypes.STRING, defaultValue: 'Admin' },
    bannedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    bannedUntil: { type: DataTypes.DATE, allowNull: true }
  });

  const WhitelistedIP = sequelize.define('WhitelistedIP', {
    ip: { type: DataTypes.STRING, allowNull: false, unique: true },
    note: { type: DataTypes.STRING, defaultValue: 'Trusted Network' },
    addedBy: { type: DataTypes.STRING, defaultValue: 'Admin' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const SecurityThreatLog = sequelize.define('SecurityThreatLog', {
    threatType: { type: DataTypes.STRING, allowNull: false },
    detail: { type: DataTypes.TEXT },
    username: { type: DataTypes.STRING, defaultValue: 'Anonymous' },
    ip: { type: DataTypes.STRING, defaultValue: '127.0.0.1' },
    deviceId: { type: DataTypes.STRING, allowNull: true },
    deviceModel: { type: DataTypes.STRING, allowNull: true },
    strikeCount: { type: DataTypes.INTEGER, defaultValue: 1 },
    banned: { type: DataTypes.BOOLEAN, defaultValue: false },
    bannedUntil: { type: DataTypes.DATE, allowNull: true },
    cookies: { type: DataTypes.TEXT, allowNull: true },
    screenshot: { type: DataTypes.TEXT, allowNull: true },
    pageUrl: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true }
  });

  // Sync schema
  await sequelize.sync({ force: true });
  console.log('[Clean DB Generator] Tables created successfully.');

  // 1. Seed Clean Admin User
  const adminPasswordHash = await bcrypt.hash('daimond33140', 10);
  await User.create({
    username: 'admin',
    email: 'admin@hexsyncth.site',
    passwordHash: adminPasswordHash,
    role: 'superadmin',
    creditBalance: 0,
    registerIp: '127.0.0.1',
    lastIp: '127.0.0.1'
  });
  console.log('[Clean DB Generator] Seeded clean superadmin account (admin / daimond33140)');

  // 2. Seed Default Category
  const defaultCategory = await Category.create({
    name: 'สินค้าทั่วไป',
    slug: 'general',
    icon: 'box',
    description: 'หมวดหมู่สินค้าทั่วไปและสินค้าดิจิทัล',
    displayOrder: 1,
    isActive: true,
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80'
  });

  // 3. Seed Sample Product: "Test product" price 50 THB
  const sampleProduct = await Product.create({
    name: 'Test product',
    categoryId: 'general',
    price: 50,
    originalPrice: 100,
    key: 'SAMPLE-KEY-TEST-001',
    downloadUrl: 'https://store.steampowered.com',
    description: 'ตัวอย่างสินค้าทดสอบระบบ (Test Product) ราคา 50 บาท สำหรับให้ลูกค้าทดลองสั่งซื้อและเปิดใช้งานระบบ',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    badge: 'SAMPLE',
    stock: 5,
    active: true,
    isFeatured: true
  });

  // 4. Seed 5 Sample Stock Keys for "Test product"
  for (let i = 1; i <= 5; i++) {
    await ProductKey.create({
      productId: sampleProduct.id,
      keyString: `SAMPLE-TEST-KEY-000${i}`,
      isUsed: false
    });
  }
  console.log('[Clean DB Generator] Seeded "Test product" (50 THB) with 5 sample stock keys.');

  // 5. Seed Clean Site Settings
  const defaultSettings = [
    { key: 'site_title', value: 'HexSyncTH Store' },
    { key: 'brand_name', value: 'HexSyncTH' },
    { key: 'logo_url', value: '/logo.png' },
    { key: 'announcement', value: 'ยินดีต้อนรับสู่ระบบร้านค้าอัตโนมัติ 24 ชม.' },
    { key: 'min_topup', value: '10' },
    { key: 'promptpay_number', value: '' },
    { key: 'promptpay_name', value: '' },
    { key: 'discord_url', value: '' },
    { key: 'facebook_url', value: '' },
    { key: 'line_url', value: '' },
    { key: 'youtube_bg_id', value: '' },
    { key: 'theme_color', value: '#ff1a40' },
    { key: 'music_autoplay', value: 'false' },
    { key: 'maintenance_mode', value: 'false' }
  ];

  for (const s of defaultSettings) {
    await Setting.create(s);
  }

  // 6. Seed initial Log
  await Log.create({
    action: 'INIT_SYSTEM',
    detail: 'สร้างฐานข้อมูลเริ่มต้นสำหรับลูกค้าระบบเรียบร้อยแล้ว',
    username: 'System',
    ip: '127.0.0.1'
  });

  await sequelize.close();
  console.log('[Clean DB Generator] Complete! Clean database ready.');
}

if (require.main === module) {
  const target = process.argv[2] || path.resolve(__dirname, '../data/clean_template_database.sqlite');
  createCleanDatabase(target)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createCleanDatabase };
