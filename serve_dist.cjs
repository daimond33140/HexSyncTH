// serve_dist.cjs - Lightweight, zero-dependency SPA Static Server for HexSyncTH Frontend
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || 5173;
const DIST_DIR = path.resolve(__dirname, 'dist');

// Read Backend port from site_config.json or environment
let BACKEND_PORT = 4000;
try {
  const configPath = path.resolve(__dirname, 'site_config.json');
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (cfg.BackendPort) BACKEND_PORT = Number(cfg.BackendPort);
  }
} catch (e) {}
if (process.env.BACKEND_PORT) {
  BACKEND_PORT = Number(process.env.BACKEND_PORT);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.drawio': 'application/xml',
  '.xml': 'application/xml'
};

const server = http.createServer((req, res) => {
  // 1. Reverse Proxy for API requests to Backend (Port 4000)
  if (req.url.startsWith('/api/') || req.url === '/api') {
    const options = {
      hostname: '127.0.0.1',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${BACKEND_PORT}`,
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
        'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
        'x-forwarded-host': req.headers['host'] || '127.0.0.1'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Frontend Proxy] Cannot reach Backend on port ${BACKEND_PORT}: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'ระบบเซิร์ฟเวอร์ Backend กำลังเริ่มต้นหรือยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง',
        error: err.message
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Normalize url for Static File Serving
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
  
  let filePath = path.join(DIST_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err) {
      if (stats.isFile()) {
        sendFile(filePath, res);
        return;
      }
      if (stats.isDirectory()) {
        const dirIndex = path.join(filePath, 'index.html');
        if (fs.existsSync(dirIndex)) {
          sendFile(dirIndex, res);
          return;
        }
      }
    }

    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      try {
        if (fs.statSync(htmlPath).isFile()) {
          sendFile(htmlPath, res);
          return;
        }
      } catch (e) {}
    }

    if (/\.drawio$/i.test(filePath) || /\.xml$/i.test(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Diagram file not found');
      return;
    }

    // SPA Fallback: send index.html for client-side routing
    const indexPath = path.join(DIST_DIR, 'index.html');
    sendFile(indexPath, res);
  });
});

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
    });
    res.end(data);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Frontend] HexSyncTH Static Server listening at http://0.0.0.0:${PORT} (Proxying /api -> http://127.0.0.1:${BACKEND_PORT})`);
});
