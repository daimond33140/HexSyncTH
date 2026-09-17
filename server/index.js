// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const purchaseRoutes = require('./routes/purchases');
const topupRoutes = require('./routes/topup');
const logRoutes = require('./routes/logs');
const settingRoutes = require('./routes/settings');
const giftCodeRoutes = require('./routes/giftcodes');
const categoryRoutes = require('./routes/categories');
const couponRoutes = require('./routes/coupons');
const bannedIpRoutes = require('./routes/bannedIps');
const deviceRoutes = require('./routes/devices');
const securityRoutes = require('./routes/security');
const superadminRoutes = require('./routes/superadmin');
const updateRoutes = require('./routes/updates');
const gamesRoutes = require('./routes/games');
const licenseRoutes = require('./routes/license');
const { ipBanMiddleware, getClientIp, isIpWhitelisted } = require('./middleware/ipBan');
const { antiFloodMiddleware } = require('./middleware/antiFlood');
const { wafSecurityMiddleware } = require('./middleware/wafSecurity');

const app = express();

// Trust Cloudflare and reverse proxy headers
app.set('trust proxy', 1);

// 1. First Line of Defense: Ultra-fast in-memory Anti-DDoS & Flood Shield
app.use(antiFloodMiddleware);

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Vite / External images compatibility
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
app.use(cors({ origin: true, credentials: true }));

// Payload Bomb Protection: General API requests capped at 1MB
// Specific upload endpoints are allowed up to 30MB below
app.use('/api/topup/slip', express.json({ limit: '30mb' }));
app.use('/api/products', express.json({ limit: '30mb' }));
app.use('/api/games', express.json({ limit: '30mb' }));
app.use('/api/categories', express.json({ limit: '30mb' }));
app.use('/api/security/report-threat', express.json({ limit: '15mb' })); // Allow base64 screenshots
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 2. IP & Device Ban Enforcement Middleware
app.use(ipBanMiddleware);

// 3. Web Application Firewall (WAF): Anti-Recon, Anti-Scanner & Anti-Exploit Shield
app.use(wafSecurityMiddleware);

// Global Rate Limiter: 1,500 requests per 1 minute (Supports shared school labs & high-traffic NAT)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || isIpWhitelisted(getClientIp(req)),
  message: { message: 'คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' },
});
app.use('/api', globalLimiter);

// Auth Rate Limiter: Max 60 attempts per 15 minutes (Allow multiple students from school IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || isIpWhitelisted(getClientIp(req)),
  message: { message: 'พยายามเข้าสู่ระบบหรือสมัครสมาชิกบ่อยเกินไป กรุณารอ 15 นาที' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Topup Slip Limiter: Max 30 attempts per 5 minutes
const topupLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || isIpWhitelisted(getClientIp(req)),
  message: { message: 'ส่งคำขอเติมเงินบ่อยเกินไป กรุณารอ 5 นาที' },
});
app.use('/api/topup/slip', topupLimiter);

app.get('/', (req, res) => {
  res.send('<h2>HexSyncTH API Server is running securely!</h2><p>Database connected and protected with Anti-Hack & Rate Limiting.</p>');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/topup', topupRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/gift-codes', giftCodeRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/banned-ips', bannedIpRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/system', updateRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/license', licenseRoutes);

// iOS Mod / Payload Legacy Endpoint Aliases
app.all(['/ack.php', '/ack2.php'], (req, res, next) => {
  const queryPart = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = '/verify' + queryPart;
  licenseRoutes(req, res, next);
});
app.get('/contact.php', (req, res) => res.json({ status: 200, success: true }));

const PORT = process.env.PORT || 4000;
const isSqlite = sequelize.getDialect() === 'sqlite';
sequelize.sync().then(() => {
  console.log(`Database (${sequelize.getDialect()}) synced successfully with models`);
  const server = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  
  // Slowloris & Socket Exhaustion Attack Protection
  server.headersTimeout = 10000; // Max 10s to receive HTTP headers
  server.requestTimeout = 15000; // Max 15s to finish request
  server.keepAliveTimeout = 5000; // 5s keep-alive timeout
}).catch(err => {
  console.error('Database sync error:', err);
});
