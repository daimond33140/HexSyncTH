// server/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');

const dbDialect = (process.env.DB_DIALECT || 'sqlite').toLowerCase();
let sequelize;

if (dbDialect === 'postgres' && process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });
  console.log('[Database] Connected to PostgreSQL');
} else {
  // SQLite: Self-contained database file for easy portable installation on customer's PC
  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  });
  console.log(`[Database] Connected to SQLite: ${dbPath}`);
}

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'member', // 'member' or 'admin'
  },
  creditBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  lastIp: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1',
  },
  registerIp: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1',
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  banReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bannedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bannedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  bannedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deviceFingerprint: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastDeviceModel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  locationUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

// Product Model
const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.STRING,
    defaultValue: 'games',
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  originalPrice: {
    type: DataTypes.FLOAT,
  },
  key: {
    type: DataTypes.TEXT,
  },
  downloadUrl: {
    type: DataTypes.STRING,
    defaultValue: 'https://store.steampowered.com',
  },
  description: {
    type: DataTypes.TEXT,
  },
  image: {
    type: DataTypes.TEXT,
  },
  badge: {
    type: DataTypes.STRING,
    defaultValue: 'HOT',
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

// Category Model (Game Categories & Banners)
const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  bannerImage: {
    type: DataTypes.TEXT,
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'gamepad',
  },
  description: {
    type: DataTypes.TEXT,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

// ProductKey Model - individual license keys in stock pool
const ProductKey = sequelize.define('ProductKey', {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  keyString: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  usedBy: {
    type: DataTypes.STRING,
  },
  usedAt: {
    type: DataTypes.DATE,
  }
});

Product.hasMany(ProductKey, { foreignKey: 'productId', as: 'stockKeys' });
ProductKey.belongsTo(Product, { foreignKey: 'productId' });

// Purchase Model
const Purchase = sequelize.define('Purchase', {
  userId: {
    type: DataTypes.INTEGER,
  },
  username: {
    type: DataTypes.STRING,
  },
  productId: {
    type: DataTypes.INTEGER,
  },
  productName: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.FLOAT,
  },
  key: {
    type: DataTypes.TEXT,
  },
  downloadUrl: {
    type: DataTypes.STRING,
  },
  purchaseDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

// Audit Log Model
const Log = sequelize.define('Log', {
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  detail: {
    type: DataTypes.TEXT,
  },
  username: {
    type: DataTypes.STRING,
    defaultValue: 'System',
  },
  ip: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1',
  }
});

// Site Settings Model
const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
  }
});

// Gift Code Model (Redeem credit)
const GiftCode = sequelize.define('GiftCode', {
  code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  creditAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: 'admin',
  }
});

// Discount Coupon Model (Product purchase discount)
const Coupon = sequelize.define('Coupon', {
  code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  discountType: {
    type: DataTypes.STRING, // 'fixed' (฿ discount) or 'percent' (% discount)
    defaultValue: 'fixed',
  },
  discountValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  minSpend: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: 'admin',
  }
});

// Bank Slip Transaction Model
const SlipTransaction = sequelize.define('SlipTransaction', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  slipImageUrl: {
    type: DataTypes.TEXT,
  },
  slipHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transRef: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  qrData: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sendingBank: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  verifiedVia: {
    type: DataTypes.STRING,
    defaultValue: 'auto',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'approved', // 'approved', 'pending', 'rejected'
  }
});

// PaymentOrder Model (Dynamic Single-use PromptPay QR Orders with 30-min auto expiration)
const PaymentOrder = sequelize.define('PaymentOrder', {
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  qrPayload: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  promptpayNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending', // 'pending', 'paid', 'expired', 'cancelled'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  transRef: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Banned IP Model (IP Blacklist)
const BannedIP = sequelize.define('BannedIP', {
  ip: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  reason: {
    type: DataTypes.STRING,
    defaultValue: 'แบนโดยแอดมิน (Violation of rules)',
  },
  bannedBy: {
    type: DataTypes.STRING,
    defaultValue: 'Admin',
  },
  bannedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  bannedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

// Banned Device Model (Hardware / Device ID Blacklist)
const BannedDevice = sequelize.define('BannedDevice', {
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  deviceModel: {
    type: DataTypes.STRING,
    defaultValue: 'ไม่ทราบรุ่น (Unknown Device)',
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gpu: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  screenResolution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastIp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reason: {
    type: DataTypes.STRING,
    defaultValue: 'แบนเลขเครื่องโดยแอดมิน (Hardware Ban)',
  },
  bannedBy: {
    type: DataTypes.STRING,
    defaultValue: 'Admin',
  },
  bannedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  bannedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

// Whitelisted IP Model (IPs exempt from DDoS & Ban rules, e.g. School, Home, Office)
const WhitelistedIP = sequelize.define('WhitelistedIP', {
  ip: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  note: {
    type: DataTypes.STRING,
    defaultValue: 'เครือข่ายที่เชื่อถือได้ (School / Office / Admin)',
  },
  addedBy: {
    type: DataTypes.STRING,
    defaultValue: 'Admin',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

// Security Threat Log Model (High-Risk Hacking, F12, DevTools & Exploit Forensics)
const SecurityThreatLog = sequelize.define('SecurityThreatLog', {
  threatType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  detail: {
    type: DataTypes.TEXT,
  },
  username: {
    type: DataTypes.STRING,
    defaultValue: 'Anonymous',
  },
  ip: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1',
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceModel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  strikeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  banned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  bannedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cookies: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  screenshot: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

module.exports = {
  sequelize,
  User,
  Product,
  ProductKey,
  Purchase,
  Log,
  Setting,
  GiftCode,
  Coupon,
  SlipTransaction,
  PaymentOrder,
  BannedIP,
  BannedDevice,
  WhitelistedIP,
  SecurityThreatLog,
  Category,
};

