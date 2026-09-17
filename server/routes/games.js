const express = require('express');
const router = express.Router();
const { Setting, Purchase, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const https = require('https');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c';

const DEFAULT_GAMES = [
  {
    id: 'game-1',
    title: 'GAME XX1 (VIP)',
    subtitle: 'ระบบเช็คสถานะ & เมนูช่วยเล่น VIP',
    version: 'v2.4.1 (Latest)',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
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
    status: 'risk',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
    category: 'Battle Royale',
    updatedAt: '2026-09-14',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    downloadCount: 8930,
    driveNote: 'สถานะตอนนี้ Use At Own Risk เสี่ยงปานกลาง แนะนำใช้ไอดีไก่เท่านั้น',
  },
  {
    id: 'game-3',
    title: 'GAME XX3 (Auto Farm)',
    subtitle: 'Auto Farm & Quest Helper',
    version: 'v3.1.0',
    status: 'updating',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    isFree: false,
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
    isFree: true,
    category: 'Utilities',
    updatedAt: '2026-09-13',
    bannerUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=600&q=80',
    downloadCount: 3200,
    driveNote: 'ปลอดภัย 100% ใช้งานง่าย รหัสแตกไฟล์: hexsync (แจกฟรีสำหรับทุกคน)',
  }
];

const DEFAULT_SETTINGS = {
  globalMaintenance: false,
  maintenanceMessage: 'ระบบปิดปรับปรุงชั่วคราว เพื่อความปลอดภัยสูงสุด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
  announcementText: '📢 ข่าวสารล่าสุด: ระบบอัปเดตเวอร์ชันใหม่เรียบร้อยแล้ว! ทุกเกมปลอดภัย 100%',
  announcementActive: true,
};

// Helper to stream/proxy file download directly to client without exposing Google Drive or opening new tabs
function streamFileFromUrl(targetUrl, res, filename, cookies = '', redirectCount = 0) {
  if (redirectCount > 8) {
    return res.status(500).send('Too many redirects');
  }

  try {
    const urlObj = new URL(targetUrl);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(cookies ? { 'Cookie': cookies } : {})
      }
    };

    const req = lib.request(options, (remoteRes) => {
      let newCookies = cookies;
      if (remoteRes.headers['set-cookie']) {
        const parsedCookies = remoteRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        newCookies = newCookies ? `${newCookies}; ${parsedCookies}` : parsedCookies;
      }

      // Handle 301, 302, 303, 307 redirects
      if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        let nextUrl = remoteRes.headers.location;
        if (!nextUrl.startsWith('http')) {
          nextUrl = new URL(nextUrl, targetUrl).toString();
        }
        return streamFileFromUrl(nextUrl, res, filename, newCookies, redirectCount + 1);
      }

      // If Google Drive returns HTML virus-scan bypass confirmation page (>100MB files)
      const contentType = remoteRes.headers['content-type'] || '';
      if (contentType.includes('text/html') && targetUrl.includes('drive.google.com')) {
        let body = '';
        remoteRes.on('data', chunk => body += chunk);
        remoteRes.on('end', () => {
          const confirmMatch = body.match(/confirm=([a-zA-Z0-9_-]+)/) || body.match(/name="confirm" value="([a-zA-Z0-9_-]+)"/);
          const idMatch = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (confirmMatch && idMatch) {
            const confirmCode = confirmMatch[1];
            const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmCode}&id=${idMatch[1]}`;
            return streamFileFromUrl(confirmUrl, res, filename, newCookies, redirectCount + 1);
          }

          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.send(body);
        });
        return;
      }

      // Extract filename from remote headers if available, or use fallback
      let finalFilename = filename;
      if (remoteRes.headers['content-disposition']) {
        const match = remoteRes.headers['content-disposition'].match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/);
        if (match && match[1]) {
          try {
            finalFilename = decodeURIComponent(match[1]);
          } catch {}
        }
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
      res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'application/octet-stream');
      if (remoteRes.headers['content-length']) {
        res.setHeader('Content-Length', remoteRes.headers['content-length']);
      }

      remoteRes.pipe(res);
    });

    req.on('error', (err) => {
      console.error('Download stream error:', err);
      res.redirect(targetUrl);
    });

    req.end();
  } catch (err) {
    console.error('URL parse error in streamFileFromUrl:', err);
    res.redirect(targetUrl);
  }
}

// In-memory cache for instant games status
let cachedGamesList = null;
let cachedGamesExpiry = 0;

function invalidateGamesCache() {
  cachedGamesList = null;
  cachedGamesExpiry = 0;
}

// Helper to get current games list (Cached)
async function getGamesList() {
  const now = Date.now();
  if (cachedGamesList && now < cachedGamesExpiry) {
    return cachedGamesList;
  }
  try {
    const s = await Setting.findOne({ where: { key: 'hexsync_games_status' } });
    if (s && s.value) {
      const games = JSON.parse(s.value);
      if (Array.isArray(games) && games.length > 0) {
        cachedGamesList = games;
        cachedGamesExpiry = now + 60000; // 60s cache
        return games;
      }
    }
  } catch {}
  cachedGamesList = DEFAULT_GAMES;
  cachedGamesExpiry = now + 60000;
  return DEFAULT_GAMES;
}

// GET /api/games - Public endpoint for fetching latest games status
router.get('/', async (req, res) => {
  try {
    const games = await getGamesList();
    return res.json({ success: true, games });
  } catch (err) {
    console.error('Error fetching games status:', err);
    return res.json({ success: true, games: DEFAULT_GAMES });
  }
});

// GET /api/games/:id/download-check - Verifies user download permission before initiating download
router.get('/:id/download-check', async (req, res) => {
  try {
    const { id } = req.params;
    const games = await getGamesList();
    const game = games.find(g => g.id === id);

    if (!game) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเกมที่ต้องการดาวน์โหลด' });
    }

    if (!game.isDownloadEnabled) {
      return res.status(403).json({ success: false, message: 'เกมนี้ถูกปิดการดาวน์โหลดชั่วคราว' });
    }

    if (game.isFree) {
      return res.json({ success: true, isFree: true, title: game.title });
    }

    let token = req.query.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนดาวน์โหลดเกมนี้' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'เซสชันของคุณหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่' });
    }

    const isAdmin = decoded.role === 'admin' || decoded.role === 'superadmin';
    if (isAdmin) {
      return res.json({ success: true, isAdmin: true, title: game.title });
    }

    const activeLicense = await Purchase.findOne({
      where: {
        userId: decoded.id,
        linkedGameId: game.id,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!activeLicense) {
      return res.status(403).json({
        success: false,
        message: `🔒 คุณยังไม่มีสิทธิ์เช่าเกม "${game.title}" หรือเวลาเช่าของคุณหมดอายุแล้ว กรุณาเช่าเกมในร้านค้าก่อนดาวน์โหลด`
      });
    }

    return res.json({ success: true, isFree: false, title: game.title, expiresAt: activeLicense.expiresAt });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' + err.message });
  }
});

// GET /api/games/:id/download - Direct proxy download (hides Google Drive URL, triggers native download)
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const games = await getGamesList();
    const game = games.find(g => g.id === id);

    if (!game) {
      return res.status(404).send('ไม่พบข้อมูลเกมที่ต้องการดาวน์โหลด');
    }

    if (!game.isDownloadEnabled) {
      return res.status(403).send('เกมนี้ถูกปิดการดาวน์โหลดชั่วคราว');
    }

    // Check Authorization: If not free, user MUST have active rental license or be admin
    if (!game.isFree) {
      let token = req.query.token;
      if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).send('กรุณาเข้าสู่ระบบก่อนดาวน์โหลดเกม');
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).send('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      const isAdmin = decoded.role === 'admin' || decoded.role === 'superadmin';
      if (!isAdmin) {
        // Query active rental license
        const activeLicense = await Purchase.findOne({
          where: {
            userId: decoded.id,
            linkedGameId: game.id,
            expiresAt: { [Op.gt]: new Date() }
          }
        });

        if (!activeLicense) {
          return res.status(403).send('คุณยังไม่มีสิทธิ์เช่าเกมนี้ หรือสิทธิ์เช่าหมดอายุแล้ว กรุณาเช่าเกมในร้านค้า');
        }
      }
    }

    // Increment download count asynchronously
    (async () => {
      try {
        const s = await Setting.findOne({ where: { key: 'hexsync_games_status' } });
        if (s && s.value) {
          const allGames = JSON.parse(s.value);
          const idx = allGames.findIndex(g => g.id === id);
          if (idx !== -1) {
            allGames[idx].downloadCount = (allGames[idx].downloadCount || 0) + 1;
            s.value = JSON.stringify(allGames);
            await s.save();
          }
        }
      } catch {}
    })();

    // Resolve download URL
    let downloadUrl = game.downloadUrl || 'https://drive.google.com';
    let fileId = null;

    // Check if it is a Google Drive link
    const driveMatch = downloadUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                       downloadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                       downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (driveMatch) {
      fileId = driveMatch[1];
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    const cleanFilename = `${game.title.replace(/[\\/:*?"<>|]/g, '_')}_v${game.version.replace(/[\\/:*?"<>|]/g, '_')}.zip`;

    // Stream download directly to client
    return streamFileFromUrl(downloadUrl, res, cleanFilename);
  } catch (err) {
    console.error('Error handling game download:', err);
    return res.status(500).send('เกิดข้อผิดพลาดในการดาวน์โหลด: ' + err.message);
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
    invalidateGamesCache();

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
