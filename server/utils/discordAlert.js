// server/utils/discordAlert.js
const https = require('https');
const http = require('http');
const crypto = require('crypto');

let cachedConfig = null;
let lastCacheCheck = 0;

const JWT_SECRET = process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c';

async function getDiscordConfig() {
  const now = Date.now();
  if (cachedConfig !== null && now - lastCacheCheck < 30000) {
    return cachedConfig;
  }

  let webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK || '';
  let botToken = process.env.DISCORD_BOT_TOKEN || '';
  let channelId = process.env.DISCORD_ALERT_CHANNEL_ID || '';

  try {
    const { Setting } = require('../models');
    const settings = await Setting.findAll({
      where: {
        key: ['discord_security_webhook', 'discord_webhook_url', 'discord_bot_token', 'discord_alert_channel_id']
      }
    });

    settings.forEach((s) => {
      if ((s.key === 'discord_security_webhook' || s.key === 'discord_webhook_url') && s.value && s.value.trim().startsWith('http')) {
        webhookUrl = s.value.trim();
      }
      if (s.key === 'discord_bot_token' && s.value && s.value.trim()) {
        botToken = s.value.trim();
      }
      if (s.key === 'discord_alert_channel_id' && s.value && s.value.trim()) {
        channelId = s.value.trim();
      }
    });
  } catch (_) {}

  cachedConfig = { webhookUrl, botToken, channelId };
  lastCacheCheck = now;
  return cachedConfig;
}

/**
 * Generate Secure HMAC signature and Quick Unban URL for 1-Click Discord Unban
 */
function getQuickUnbanUrl(ip, username = '', req = null) {
  const safeIp = (ip || '').toString().trim();
  const safeUser = (username || '').toString().trim();
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`unban_${safeIp}_${safeUser}`).digest('hex');

  let baseUrl = 'http://localhost:4000';
  if (req && req.get && req.get('host')) {
    const proto = req.secure || req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    baseUrl = `${proto}://${req.get('host')}`;
  } else if (process.env.APP_URL) {
    baseUrl = process.env.APP_URL.replace(/\/$/, '');
  }

  return `${baseUrl}/api/banned-ips/quick-unban?ip=${encodeURIComponent(safeIp)}&user=${encodeURIComponent(safeUser)}&sig=${sig}`;
}

/**
 * Send Rich Discord Security Embed Alert (Supports both Bot Token and Webhook)
 */
async function sendDiscordSecurityAlert({ title, description, color = 0xef4444, fields = [], footerText }) {
  try {
    const config = await getDiscordConfig();

    const embed = {
      title: title || '🚨 การแจ้งเตือนความปลอดภัย (Security Alert)',
      description: description || '',
      color: color,
      fields: fields,
      footer: {
        text: footerText || 'HexSyncTH Zero-Trust Defense Shield'
      },
      timestamp: new Date().toISOString()
    };

    // Mode 1: Send via Discord Bot Token directly to Channel ID
    if (config.botToken && config.channelId) {
      const payload = JSON.stringify({
        embeds: [embed]
      });

      return new Promise((resolve) => {
        const req = https.request({
          hostname: 'discord.com',
          path: `/api/v10/channels/${config.channelId}/messages`,
          method: 'POST',
          headers: {
            'Authorization': `Bot ${config.botToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        });

        req.on('error', (err) => {
          console.warn('[Discord Bot Alert] Request error:', err.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    }

    // Mode 2: Send via Discord Webhook URL
    if (config.webhookUrl && config.webhookUrl.startsWith('http')) {
      const payload = JSON.stringify({
        username: 'HEX AI 🛡️ Security Shield',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        embeds: [embed]
      });

      const parsed = new URL(config.webhookUrl);
      const lib = parsed.protocol === 'https:' ? https : http;

      return new Promise((resolve) => {
        const req = lib.request(parsed, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        });

        req.on('error', (err) => {
          console.warn('[Discord Webhook Alert] Error:', err.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    }

    return false;
  } catch (err) {
    console.warn('[Discord Alert] Failed to send alert:', err.message);
    return false;
  }
}

/**
 * Detailed Suspicious / Malicious Activity Alert (Tailored for Hacker / Threat Detection)
 */
async function sendSuspiciousActivityAlert({
  req = null,
  user = null,
  username = '',
  attemptedPassword = '',
  report = 'พยายามเข้าถึงหรือกระทำการผิดปกติกับระบบ',
  actionTaken = 'แบน IP / user ถาวร',
  ip = '',
  deviceId = '',
  color = 0xdc2626
}) {
  const targetIp = (ip || (req && (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress)) || '127.0.0.1').toString().trim();
  const rawUser = username || user?.username || req?.user?.username || '';
  const isLoggedIn = Boolean(rawUser && rawUser !== 'ยังไม่ Login เข้าเว็บ' && rawUser !== 'Anonymous');
  const displayUser = isLoggedIn ? rawUser : 'ยังไม่ Login เข้าเว็บ';

  const rawDeviceId = deviceId || req?.headers?.['x-device-id'] || req?.body?.deviceId || user?.deviceFingerprint || 'ไม่ระบุ / อุปกรณ์นิรนาม';
  const thaiTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const unbanUrl = getQuickUnbanUrl(targetIp, isLoggedIn ? rawUser : '', req);

  let displayPassword = '-';
  if (attemptedPassword) {
    displayPassword = attemptedPassword;
  } else if (isLoggedIn) {
    displayPassword = '[อยู่ในระบบแล้ว / รหัสผ่านแฮช Bcrypt]';
  }

  const fields = [
    { name: '👤 User', value: isLoggedIn ? `\`${displayUser}\`` : '⚠️ **ยังไม่ Login เข้าเว็บ**', inline: true },
    { name: '🔑 Pass', value: `\`${displayPassword}\``, inline: true },
    { name: '🌐 IP Address', value: `\`${targetIp}\``, inline: true },
    { name: '📱 UDID / HWID', value: `\`${rawDeviceId}\``, inline: true },
    { name: '⏰ เวลา', value: `${thaiTime}`, inline: true },
    { name: '🛡️ สถานะ', value: `🔴 **${actionTaken}**`, inline: true },
    { name: '🚨 Report (พฤติกรรมที่ตรวจพบ)', value: `>>> ${report}`, inline: false },
    { name: '⚡ การจัดการ (Quick Unban Action)', value: `👉 [**[🔓 คลิกที่นี่เพื่อปลดแบนทันที]**](${unbanUrl})`, inline: false }
  ];

  return sendDiscordSecurityAlert({
    title: '🚨 ตรวจพบพฤติกรรมผิดปกติ / พยายามบุกรุกระบบ (Intrusion Alert)',
    description: `ระบบตรวจจับภัยคุกคามตรวจพบการกระทำผิดปกติ และได้สั่งดำเนินการเรียบร้อยแล้ว`,
    color: color,
    fields: fields,
    footerText: 'HexSyncTH Zero-Trust Anti-Hack Shield'
  });
}

/**
 * Topup Completed Alert
 */
async function sendTopupAlert({ username, amount, method = 'PromptPay Dynamic QR', transRef = '-', balance = 0, ip = '', deviceId = '', req = null }) {
  const targetIp = (ip || (req && (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress)) || '-').toString().trim();
  const thaiTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  return sendDiscordSecurityAlert({
    title: `💰 สมาชิกเติมเงินสำเร็จ (+฿${Number(amount || 0).toLocaleString()} THB)`,
    description: `ผู้ใช้งาน \`${username}\` ทำรายการเติมเงินเข้าสู่กระเป๋าเครดิตสำเร็จ`,
    color: 0x10b981, // Green
    fields: [
      { name: '👤 ผู้ใช้งาน', value: `\`${username}\``, inline: true },
      { name: '💵 ยอดเงินที่เติม', value: `**+฿${Number(amount || 0).toLocaleString()}** บาท`, inline: true },
      { name: '💳 ช่องทาง', value: method, inline: true },
      { name: '🧾 รหัสอ้างอิง', value: `\`${transRef || '-'}\``, inline: true },
      { name: '💼 เครดิตคงเหลือใหม่', value: `฿${Number(balance || 0).toLocaleString()} บาท`, inline: true },
      { name: '🌐 IP Address', value: `\`${targetIp}\``, inline: true },
      { name: '⏰ เวลา', value: thaiTime, inline: true }
    ],
    footerText: 'HexSyncTH Payment Gateway'
  });
}

/**
 * New User Registered Alert
 */
async function sendRegisterAlert({ username, email, ip = '', deviceId = '', deviceModel = 'ไม่ระบุ', req = null }) {
  const targetIp = (ip || (req && (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress)) || '-').toString().trim();
  const thaiTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  return sendDiscordSecurityAlert({
    title: '🎉 สมาชิกใหม่ลงทะเบียน (New User Registered)',
    description: `มีผู้ใช้งานสมัครสมาชิกใหม่เข้าสู่ระบบ HexSyncTH`,
    color: 0x3b82f6, // Blue
    fields: [
      { name: '👤 Username', value: `\`${username}\``, inline: true },
      { name: '📧 Email', value: `\`${email}\``, inline: true },
      { name: '🌐 IP Address', value: `\`${targetIp}\``, inline: true },
      { name: '📱 UDID / HWID', value: `\`${deviceId || 'N/A'}\``, inline: true },
      { name: '💻 อุปกรณ์/เบราว์เซอร์', value: deviceModel || 'ไม่ระบุ', inline: true },
      { name: '⏰ เวลา', value: thaiTime, inline: true }
    ],
    footerText: 'HexSyncTH Member System'
  });
}

/**
 * Purchase Completed Alert
 */
async function sendPurchaseAlert({ username, items = [], totalAmount = 0, balance = 0, ip = '', deviceId = '', req = null }) {
  const targetIp = (ip || (req && (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress)) || '-').toString().trim();
  const thaiTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const itemListStr = Array.isArray(items) && items.length > 0
    ? items.map((it) => `• **${it.name || it.productName || 'สินค้า'}** (x${it.quantity || 1}) - ฿${Number(it.price || 0).toLocaleString()} บาท`).join('\n')
    : 'ไม่มีรายละเอียดรายการ';

  return sendDiscordSecurityAlert({
    title: '🛒 สมาชิกสั่งซื้อสินค้าสำเร็จ (Purchase Completed)',
    description: `ผู้ใช้งาน \`${username}\` ได้สั่งซื้อสินค้าและตัดยอดเงินในระบบเรียบร้อยแล้ว`,
    color: 0x8b5cf6, // Purple
    fields: [
      { name: '👤 ผู้ซื้อ', value: `\`${username}\``, inline: true },
      { name: '💵 ยอดรวมที่ชำระ', value: `**฿${Number(totalAmount || 0).toLocaleString()}** บาท`, inline: true },
      { name: '💼 เครดิตคงเหลือ', value: `฿${Number(balance || 0).toLocaleString()} บาท`, inline: true },
      { name: '📦 รายการสินค้าที่ซื้อ', value: itemListStr, inline: false },
      { name: '🌐 IP Address', value: `\`${targetIp}\``, inline: true },
      { name: '⏰ เวลา', value: thaiTime, inline: true }
    ],
    footerText: 'HexSyncTH Store System'
  });
}

module.exports = {
  sendDiscordSecurityAlert,
  sendSuspiciousActivityAlert,
  sendTopupAlert,
  sendRegisterAlert,
  sendPurchaseAlert,
  getQuickUnbanUrl
};



