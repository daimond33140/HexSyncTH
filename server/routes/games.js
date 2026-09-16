const express = require('express');
const router = express.Router();
const { Setting } = require('../models');
const { requireAdmin } = require('../middleware/auth');

const DEFAULT_GAMES = [
  {
    id: 'game-1',
    title: 'GAME XX1 (VIP)',
    subtitle: 'ระบบเช็คสถานะ & เมนูช่วยเล่น VIP',
    version: 'v2.4.1 (Latest)',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    category: 'FPS / Action',
    updatedAt: '2026-09-15',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    downloadCount: 12450,
    driveNote: 'รหัสแตกไฟล์ zip คือ: xx1vip (แนะนำปิด Antivirus ชั่วคราวก่อนแตกไฟล์)',
  },
  {
    id: 'game-2',
    title: 'GAME XX2 (Mod Menu)',
    subtitle: 'Mod Menu & Script Loader',
    version: 'v1.8.0',
    status: 'detected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    category: 'Battle Royale',
    updatedAt: '2026-09-14',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    downloadCount: 8930,
    driveNote: 'สถานะตอนนี้ Detected! ห้ามใช้งานเด็ดขาด ทีมงานกำลังแก้ปัญหาอยู่',
  },
  {
    id: 'game-3',
    title: 'GAME XX3 (Auto Farm)',
    subtitle: 'Auto Farm & Quest Helper',
    version: 'v3.1.0',
    status: 'updating',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    category: 'MMORPG / RPG',
    updatedAt: '2026-09-15',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    downloadCount: 5410,
    driveNote: 'กำลังปรับปรุงระบบ รอรับแพตช์เกมเวอร์ชันล่าสุด เร็วๆ นี้',
  },
  {
    id: 'game-4',
    title: 'GAME XX4 (Skin / Tool)',
    subtitle: 'Skin Changer & Crosshair Tool',
    version: 'v1.0.5',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    category: 'Utilities',
    updatedAt: '2026-09-13',
    bannerUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=600&q=80',
    downloadCount: 3200,
    driveNote: 'ปลอดภัย 100% ใช้งานง่าย รหัสแตกไฟล์: hexsync',
  }
];

const DEFAULT_SETTINGS = {
  globalMaintenance: false,
  maintenanceMessage: 'ระบบปิดปรับปรุงชั่วคราว เพื่อความปลอดภัยสูงสุด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
  announcementText: '📢 ข่าวสารล่าสุด: ระบบอัปเดตเวอร์ชันใหม่เรียบร้อยแล้ว! ทุกเกมปลอดภัย 100%',
  announcementActive: true,
};

// GET /api/games - Public endpoint for fetching latest games status
router.get('/', async (req, res) => {
  try {
    const s = await Setting.findOne({ where: { key: 'hexsync_games_status' } });
    if (s && s.value) {
      try {
        const games = JSON.parse(s.value);
        if (Array.isArray(games) && games.length > 0) {
          return res.json({ success: true, games });
        }
      } catch {}
    }
    return res.json({ success: true, games: DEFAULT_GAMES });
  } catch (err) {
    console.error('Error fetching games status:', err);
    return res.json({ success: true, games: DEFAULT_GAMES });
  }
});

// POST /api/games - Admin endpoint for saving games status
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { games } = req.body;
    if (!Array.isArray(games)) {
      return res.status(400).json({ success: false, message: 'ข้อมูลเกมไม่ถูกต้อง' });
    }

    const [setting] = await Setting.findOrCreate({
      where: { key: 'hexsync_games_status' },
      defaults: { value: JSON.stringify(games) }
    });

    setting.value = JSON.stringify(games);
    await setting.save();

    return res.json({ success: true, message: 'บันทึกข้อมูลสถานะเกมสำเร็จ', games });
  } catch (err) {
    console.error('Error saving games status:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// GET /api/games/settings - Public endpoint for status settings
router.get('/settings', async (req, res) => {
  try {
    const s = await Setting.findOne({ where: { key: 'hexsync_status_settings' } });
    if (s && s.value) {
      try {
        const settings = JSON.parse(s.value);
        return res.json({ success: true, settings });
      } catch {}
    }
    return res.json({ success: true, settings: DEFAULT_SETTINGS });
  } catch (err) {
    console.error('Error fetching status settings:', err);
    return res.json({ success: true, settings: DEFAULT_SETTINGS });
  }
});

// POST /api/games/settings - Admin endpoint for status settings
router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ success: false, message: 'ข้อมูลการตั้งค่าไม่ถูกต้อง' });
    }

    const [setting] = await Setting.findOrCreate({
      where: { key: 'hexsync_status_settings' },
      defaults: { value: JSON.stringify(settings) }
    });

    setting.value = JSON.stringify(settings);
    await setting.save();

    return res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ', settings });
  } catch (err) {
    console.error('Error saving status settings:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' });
  }
});

module.exports = router;
