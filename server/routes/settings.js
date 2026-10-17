// server/routes/settings.js
const express = require('express');
const { Setting, Log, Purchase, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const DEFAULT_SETTINGS = {
  // Site Lockdown / Maintenance mode
  site_lockdown_enabled: 'false',
  site_lockdown_title: 'HEXSYNCTH SYSTEM UNDER MAINTENANCE',
  site_lockdown_message: 'เว็บไซต์กำลังอยู่ระหว่างปิดปรับปรุงระบบชั่วคราว เพื่ออัปเกรดความเสถียรและความปลอดภัยสูงสุด ขออภัยในความไม่สะดวกครับ',
  site_lockdown_discord: 'https://discord.gg',
  site_title: 'HexSyncTH — บริการโปรเเกรมช่วยเล่นที่ดีที่สุดในไทย',
  hero_title: 'HexSyncTH บริการโปรเเกรมช่วยเล่นที่ดีที่สุดในไทย',
  hero_subtitle: 'บริการโปรแกรมช่วยเล่น บอท สคริปต์ และคีย์แท้คุณภาพสูง ส่งออโต้ 24 ชั่วโมง',
  banner_announcement: 'ระบบจัดส่งคีย์อัตโนมัติ 100% รวดเร็วใน 3 วินาที พร้อมรับประกันคีย์ทุกชิ้น',
  brand_name: 'HexSyncTH',
  brand_tag: 'No.1 in TH',
  logo_url: '/logo.png',
  primary_color: '#ff1a40',

  // 3 Hero Features (Editable from admin panel)
  hero_feat_1: 'คีย์แท้ถาวร ส่งคีย์จริงจากสต็อก',
  hero_feat_2: 'รับของทันที มีปุ่มดาวน์โหลด',
  hero_feat_3: 'เติมเงินซองอั่งเปา TrueMoney อัตโนมัติ',

  // Bank transfer info
  bank_name: 'ธนาคารกสิกรไทย (KBank)',
  bank_account_name: 'บจก. คีย์ช็อป ดิจิทัล (KeyShop Co., Ltd.)',
  bank_account_number: '123-4-56789-0',
  promptpay_number: '0812345678',

  // Dashboard Stats (Auto or Custom Override)
  dashboard_override_enabled: 'false',
  custom_stat_sales: '154,200',
  custom_stat_orders: '1,280',
  custom_stat_users: '450',

  // SlipOK API configuration for 100% bank slip verification
  slipok_branch_id: '',
  slipok_api_key: '',

  // Background Music configuration (Editable from Admin)
  bg_music_enabled: 'true',
  bg_music_url: 'https://youtu.be/h_VCgsWLmY4?si=BvgFsmrHWlMFvwkT&t=8',
  bg_music_title: 'MMM',
  bg_music_volume: '30',
  bg_music_autoplay: 'true',

  // Discord Security & Alerts (Supports Webhook URL or Bot Token + Channel ID)
  discord_security_webhook: '',
  discord_bot_token: '',
  discord_alert_channel_id: '',
};

const jwt = require('jsonwebtoken');

// In-memory micro-cache for Anti-DDoS / Traffic Spike absorption
let cachedSettings = null;
let settingsCacheExpiry = 0;
let cachedStats = null;
let statsCacheExpiry = 0;

function invalidateSettingsCache() {
  cachedSettings = null;
  settingsCacheExpiry = 0;
  cachedStats = null;
  statsCacheExpiry = 0;
}

// Get all settings (High-speed cached)
router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const now = Date.now();
    const bypassCache = req.query._t || req.headers['cache-control'] === 'no-cache';

    let isAdmin = false;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
      try {
        const parts = authHeader.split(' ');
        const token = parts.length === 2 ? parts[1] : parts[0];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c');
        if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
          isAdmin = true;
        }
      } catch (_) {}
    }

    if (!isAdmin && !bypassCache && cachedSettings && now < settingsCacheExpiry) {
      return res.json({ settings: cachedSettings });
    }

    const settingsList = await Setting.findAll();
    const settingsMap = { ...DEFAULT_SETTINGS };
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    if (!isAdmin) {
      // Never expose internal sensitive keys, API tokens, bot tokens, or webhook URLs to public
      delete settingsMap.emergency_master_key;
      delete settingsMap.slipok_api_key;
      delete settingsMap.slipok_branch_id;
      delete settingsMap.superadmin_security_passcode;
      delete settingsMap.angpao_phone;
      delete settingsMap.webhook_secret;
      delete settingsMap.superadmin_master_secret;
      delete settingsMap.discord_security_webhook;
      delete settingsMap.discord_bot_token;
      delete settingsMap.discord_alert_channel_id;

      cachedSettings = settingsMap;
      settingsCacheExpiry = now + 2000; // 2s micro-cache
    }

    res.json({ settings: settingsMap });
  } catch (err) {
    if (cachedSettings) {
      return res.json({ settings: cachedSettings });
    }
    res.json({ settings: DEFAULT_SETTINGS });
  }
});

// Test Discord connection (Admin only - supports Webhook URL or Bot Token + Channel ID)
router.post('/test-discord-webhook', requireAdmin, async (req, res) => {
  try {
    const { webhookUrl, botToken, channelId, adminUsername } = req.body;
    
    // Save temporary if passed so test uses newest input
    if (botToken) {
      const [s] = await Setting.findOrCreate({ where: { key: 'discord_bot_token' }, defaults: { value: String(botToken).trim() } });
      s.value = String(botToken).trim();
      await s.save();
    }
    if (channelId) {
      const [s] = await Setting.findOrCreate({ where: { key: 'discord_alert_channel_id' }, defaults: { value: String(channelId).trim() } });
      s.value = String(channelId).trim();
      await s.save();
    }
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      const [s] = await Setting.findOrCreate({ where: { key: 'discord_security_webhook' }, defaults: { value: String(webhookUrl).trim() } });
      s.value = String(webhookUrl).trim();
      await s.save();
    }

    const { sendDiscordSecurityAlert } = require('../utils/discordAlert');
    const success = await sendDiscordSecurityAlert({
      title: '🎉 ทดสอบการเชื่อมต่อ HEX AI สำเร็จ (Discord Connected!)',
      description: 'ระบบหลังบ้าน HexSyncTH เชื่อมต่อกับบอท Discord เรียบร้อยแล้ว พร้อมส่งการแจ้งเตือนความปลอดภัยตลอด 24 ชั่วโมง',
      color: 0x10b981,
      fields: [
        { name: 'สถานะบอท', value: '🟢 ออนไลน์และพร้อมส่งการแจ้งเตือน 24/7', inline: true },
        { name: 'ผู้ทดสอบ', value: adminUsername || req.user?.username || 'Admin', inline: true },
        { name: 'การตรวจจับความปลอดภัย', value: '• ป้องกันสลิปปลอม & Auto-Ban\n• WAF ดักจับแฮกเกอร์ & Honeypot\n• แจ้งเตือนการสั่งซื้อคีย์ & เติมเงิน\n• แจ้งเตือนการสมัครสมาชิกใหม่', inline: false }
      ]
    });

    if (success) {
      return res.json({ success: true, message: 'บอทส่งข้อความทดสอบเข้าห้องดิสคอร์ดเรียบร้อยแล้ว!' });
    } else {
      return res.status(500).json({ success: false, message: 'ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบว่า Bot Token และ ID ห้องถูกต้อง หรือบอทมีสิทธิ์ส่งข้อความในห้องนั้น' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการทดสอบ Discord: ' + err.message });
  }
});

// Get computed & customized store statistics (High-speed cached)
router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedStats && now < statsCacheExpiry) {
      return res.json(cachedStats);
    }

    const [purchases, usersCount] = await Promise.all([
      Purchase.findAll({ attributes: ['price'] }),
      User.count(),
    ]);

    const realTotalSales = purchases.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const realItemsSold = purchases.length;
    const realTotalUsers = usersCount;

    // Fetch settings for override
    const settingsList = await Setting.findAll();
    const settingsMap = { ...DEFAULT_SETTINGS };
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const isOverride = settingsMap.dashboard_override_enabled === 'true';

    const displayStats = {
      totalSales: isOverride && settingsMap.custom_stat_sales ? settingsMap.custom_stat_sales : `฿${realTotalSales.toLocaleString()}`,
      itemsSold: isOverride && settingsMap.custom_stat_orders ? settingsMap.custom_stat_orders : `${realItemsSold.toLocaleString()}`,
      totalUsers: isOverride && settingsMap.custom_stat_users ? settingsMap.custom_stat_users : `${realTotalUsers.toLocaleString()}`,
      isOverride,
      real: {
        totalSales: realTotalSales,
        itemsSold: realItemsSold,
        totalUsers: realTotalUsers,
      },
      custom: {
        sales: settingsMap.custom_stat_sales,
        orders: settingsMap.custom_stat_orders,
        users: settingsMap.custom_stat_users,
      },
    };

    cachedStats = displayStats;
    statsCacheExpiry = now + 4000;

    res.json(displayStats);
  } catch (err) {
    if (cachedStats) {
      return res.json(cachedStats);
    }
    res.status(500).json({
      totalSales: '฿0',
      itemsSold: '0',
      totalUsers: '0',
      isOverride: false,
      real: { totalSales: 0, itemsSold: 0, totalUsers: 0 },
    });
  }
});

// Update settings (Admin Only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { settings, adminUsername } = req.body;
    if (!settings) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลการตั้งค่า' });

    for (const [key, value] of Object.entries(settings)) {
      const [setting] = await Setting.findOrCreate({
        where: { key },
        defaults: { value: String(value) },
      });
      setting.value = String(value);
      await setting.save();
    }

    try {
      await Log.create({
        action: 'ADMIN_UPDATE_THEME',
        detail: `ปรับแต่งธีม สถิติ และการตั้งค่าเว็บไซต์โดย ${adminUsername || 'Admin'}`,
        username: adminUsername || 'Admin',
      });
    } catch (logErr) {
      console.warn('Non-fatal error logging admin update:', logErr.message);
    }

    invalidateSettingsCache();
    res.json({ success: true, message: 'บันทึกการตั้งค่าตกแต่งเว็บไซต์สำเร็จ' });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ success: false, message: 'บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
module.exports.invalidateSettingsCache = invalidateSettingsCache;
