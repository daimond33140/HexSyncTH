// server/routes/updates.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const UPDATES_DIR = path.resolve(__dirname, '../data/updates');
const MANIFEST_PATH = path.join(UPDATES_DIR, 'update_manifest.json');
const ZIP_PATH = path.join(UPDATES_DIR, 'latest_update.zip');

// GET /api/system/update-check
router.get('/update-check', (req, res) => {
  try {
    let manifest = {
      version: '9.1.2',
      minRequiredVersion: '9.0.0',
      releaseDate: '2026-09-11',
      changelog: 'ระบบทำงานในเวอร์ชันล่าสุด',
      downloadPath: 'latest_update.zip'
    };

    if (fs.existsSync(MANIFEST_PATH)) {
      try {
        const raw = fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/^\uFEFF/, '');
        manifest = JSON.parse(raw);
      } catch (err) {
        console.error('[Update Router] Error reading manifest:', err.message);
      }
    }

    let host = req.get('x-forwarded-host') || req.get('host') || 'hexsyncth.site';
    if (host.includes('127.0.0.1') || host.includes('localhost') || host.includes(':')) {
      host = 'hexsyncth.site';
    }
    const downloadUrl = `https://${host}/api/system/download-update`;

    const hasZip = fs.existsSync(ZIP_PATH);
    const zipSize = hasZip ? fs.statSync(ZIP_PATH).size : 0;

    res.json({
      success: true,
      latestVersion: manifest.version,
      releaseDate: manifest.releaseDate,
      changelog: manifest.changelog,
      minRequiredVersion: manifest.minRequiredVersion,
      downloadUrl: downloadUrl,
      hasUpdateZip: hasZip,
      sizeBytes: zipSize
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/system/download-update
router.get('/download-update', (req, res) => {
  try {
    if (!fs.existsSync(ZIP_PATH)) {
      return res.status(404).json({
        success: false,
        message: 'ยังไม่มีไฟล์แพตช์อัปเดตบนเซิร์ฟเวอร์ กรุณารอแอดมินเผยแพร่เวอร์ชันใหม่'
      });
    }

    res.download(ZIP_PATH, 'hexsync_update.zip', (err) => {
      if (err) {
        console.error('[Update Router] Download error:', err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
