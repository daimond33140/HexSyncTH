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
    id: 'rov-vip',
    title: 'ROV กันรี+กันแบน (VIP)',
    subtitle: 'Rov VIP กันรายงาน',
    version: 'v3.1.0 (Latest)',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
    category: 'MOBA',
    updatedAt: '2026-09-15',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    downloadCount: 12450,
    driveNote: 'รองรับGBOX ไม่รองรับPC',
  },
  {
    id: 'rov-normal',
    title: 'Rov ไม่กันรี',
    subtitle: 'Rov HackMap ฟังชั่นเกรียนๆมากมาย',
    version: 'v10.1.1',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
    category: 'MOBA',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    downloadCount: 8930,
    driveNote: 'Rov HackMap ฟังชั่นเกรียนๆมากมาย',
  },
  {
    id: 'ff-max',
    title: 'FF / FF MAX',
    subtitle: 'มอง ล็อค ขยายดาเมจ เมนู',
    version: 'v1.0.0',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
    category: 'FPS',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    downloadCount: 15420,
    driveNote: 'มอง ล็อค ขยายดาเมจ เมนู',
  },
  {
    id: 'pubgm-vip',
    title: 'PUBG Mobile (VIP)',
    subtitle: 'PUBG Mobile VIP แท้ ปลอดภัยสูง',
    version: 'v3.2.0',
    status: 'updating',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    isFree: false,
    category: 'Battle Royale',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    downloadCount: 9400,
    driveNote: 'กำลังอัปเดตรองรับเวอร์ชันล่าสุด',
  },
  {
    id: 'pubgm-crack',
    title: 'PUBG Mobile (Crack)',
    subtitle: 'PUBG Mobile Crack ตัวเต็ม',
    version: 'v3.2.0',
    status: 'updating',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: false,
    isFree: false,
    category: 'FPS',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=600&q=80',
    downloadCount: 6700,
    driveNote: 'กำลังอัปเดตรองรับตัวเกมใหม่',
  },
  {
    id: 'hexsync-src',
    title: 'ระบบเว็บ HexSyncTH (Full Source)',
    subtitle: 'Source code ระบบเว็บ HexSyncTH v2.0 และระบบความปลอดภัยครบชุด',
    version: 'v2.0',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: false,
    category: 'Utilities',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    downloadCount: 3200,
    driveNote: 'ซอร์สโค้ดพร้อมใช้งาน 100% พร้อมคู่มือติดตั้ง',
  },
  {
    id: 'test-system',
    title: 'ทดสอบระบบ',
    subtitle: 'รายการสำหรับทดสอบการทำงานของระบบ',
    version: 'v1.0',
    status: 'undetected',
    downloadUrl: 'https://drive.google.com',
    isDownloadEnabled: true,
    isFree: true,
    category: 'Utilities',
    updatedAt: '2026-09-17',
    bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    downloadCount: 120,
    driveNote: 'สำหรับแอดมินทดสอบระบบ',
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

// Helper to get current games list (Cached & Synced with latest custom images)
async function getGamesList(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedGamesList && now < cachedGamesExpiry) {
    return cachedGamesList;
  }
  let games = null;
  try {
    const s = await Setting.findOne({ where: { key: 'hexsync_games_status' } });
    if (s && s.value) {
      const parsed = JSON.parse(s.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        games = parsed;
      }
    }
  } catch {}

  if (!games || games.length === 0) {
    games = DEFAULT_GAMES;
  }

  // Sync with latest custom images from admin settings (e.g. ROV cover)
  try {
    const customSetting = await Setting.findOne({ where: { key: 'hexsync_game_custom_images' } });
    if (customSetting && customSetting.value) {
      const customMap = JSON.parse(customSetting.value);
      games = games.map((g) => {
        const foundKey = Object.keys(customMap).find(k => {
          const cleanK = k.trim().toLowerCase();
          const cleanTitle = (g.title || '').trim().toLowerCase();
          return cleanK === cleanTitle || cleanTitle.includes(cleanK) || cleanK.includes(cleanTitle);
        });
        const match = foundKey ? customMap[foundKey] : null;
        if (match && (match.bannerImage || match.image)) {
          return {
            ...g,
            bannerUrl: match.bannerImage || match.image || g.bannerUrl,
          };
        }
        return g;
      });
    }
  } catch {}

  cachedGamesList = games;
  cachedGamesExpiry = now + 1000; // 1 second micro-cache
  return games;
}

// GET /api/games - Public endpoint for fetching latest games status
router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const bypassCache = Boolean(req.query._t || req.headers['cache-control'] === 'no-cache');
    if (bypassCache) {
      invalidateGamesCache();
    }
    const games = await getGamesList(bypassCache);
    return res.json({ success: true, games });
  } catch (err) {
    console.error('Error fetching games status:', err);
    return res.json({ success: true, games: DEFAULT_GAMES });
  }
});

function getResolvedDirectDownloadUrl(rawUrl) {
  if (!rawUrl) return 'https://drive.google.com';
  const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                     rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                     rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  }
  return rawUrl;
}

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

    const resolvedUrl = getResolvedDirectDownloadUrl(game.downloadUrl);

    if (game.isFree) {
      return res.json({ success: true, isFree: true, title: game.title, downloadUrl: resolvedUrl });
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
      return res.json({ success: true, isAdmin: true, title: game.title, downloadUrl: resolvedUrl });
    }

    const activeLicense = await Purchase.findOne({
      where: {
        userId: decoded.id,
        [Op.or]: [
          { linkedGameId: game.id },
          { linkedGameId: { [Op.like]: `%${game.id}%` } }
        ],
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!activeLicense) {
      return res.status(403).json({
        success: false,
        message: `🔒 คุณยังไม่มีสิทธิ์เช่าเกม "${game.title}" หรือเวลาเช่าของคุณหมดอายุแล้ว กรุณาเช่าเกมในร้านค้าก่อนดาวน์โหลด`
      });
    }

    return res.json({ success: true, isFree: false, title: game.title, downloadUrl: resolvedUrl, expiresAt: activeLicense.expiresAt });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' + err.message });
  }
});

// GET /api/games/:id/download - Direct download redirect (resolves clean download URL, 0ms latency)
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
            [Op.or]: [
              { linkedGameId: game.id },
              { linkedGameId: { [Op.like]: `%${game.id}%` } }
            ],
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

    // Resolve direct download URL and redirect browser directly
    const downloadUrl = getResolvedDirectDownloadUrl(game.downloadUrl);
    return res.redirect(downloadUrl);
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
