// server/routes/settings.js
const express = require('express');
const { Setting, Log, Purchase, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const DEFAULT_SETTINGS = {
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
  bg_music_url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
  bg_music_title: 'Cyberpunk Synthwave Beats',
  bg_music_volume: '30',
  bg_music_autoplay: 'true',
};

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
  try {
    const now = Date.now();
    if (cachedSettings && now < settingsCacheExpiry) {
      return res.json({ settings: cachedSettings });
    }

    const settingsList = await Setting.findAll();
    const settingsMap = { ...DEFAULT_SETTINGS };
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    // Never expose emergency master key to public
    delete settingsMap.emergency_master_key;

    cachedSettings = settingsMap;
    settingsCacheExpiry = now + 4000; // 4 seconds micro-cache

    res.json({ settings: settingsMap });
  } catch (err) {
    if (cachedSettings) {
      return res.json({ settings: cachedSettings });
    }
    res.json({ settings: DEFAULT_SETTINGS });
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
    if (!settings) return res.status(400).json({ message: 'ไม่มีข้อมูลการตั้งค่า' });

    for (const [key, value] of Object.entries(settings)) {
      const [setting] = await Setting.findOrCreate({
        where: { key },
        defaults: { value: String(value) },
      });
      setting.value = String(value);
      await setting.save();
    }

    await Log.create({
      action: 'ADMIN_UPDATE_THEME',
      detail: `ปรับแต่งธีม สถิติ และการตั้งค่าเว็บไซต์โดย ${adminUsername || 'Admin'}`,
      username: adminUsername || 'Admin',
    });

    invalidateSettingsCache();
    res.json({ message: 'บันทึกการตั้งค่าตกแต่งเว็บไซต์สำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message });
  }
});

module.exports = router;
module.exports.invalidateSettingsCache = invalidateSettingsCache;
