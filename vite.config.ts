import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import JavaScriptObfuscator from 'javascript-obfuscator'

function viteObfuscatorPlugin() {
  return {
    name: 'vite-plugin-javascript-obfuscator',
    apply: 'build' as const,
    enforce: 'post' as const,
    renderChunk(code: string, chunk: { fileName: string }) {
      if (!chunk.fileName.endsWith('.js')) return null;
      console.log(`[Shield Obfuscator] Encrypting all strings in ${chunk.fileName}...`);
      try {
        const obfuscated = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,
          identifierNamesGenerator: 'hexadecimal',
          selfDefending: false,
          simplify: true,
          splitStrings: false,
          stringArray: true,
          stringArrayCallsTransform: false,
          stringArrayEncoding: ['base64'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: false,
          stringArrayWrappersType: 'variable',
          stringArrayThreshold: 1.0, // 100% of all plain strings encrypted
          transformObjectKeys: false, // Do not break DOM or React properties
          numbersToExpressions: false,
        });
        console.log(`[Shield Obfuscator] Successfully encrypted ${chunk.fileName}`);
        return {
          code: obfuscated.getObfuscatedCode(),
          map: null,
        };
      } catch (err) {
        console.error('[Shield Obfuscator] Obfuscation failed:', err);
        return null;
      }
    },
  };
}

function renderBannedHtml(banInfo: any, clientIp: string) {
  const reason = (banInfo?.reason || 'ละเมิดความปลอดภัยขั้นสูง (เปิดดูซอร์สโค้ดหรือแฮกระบบ)').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bannedBy = (banInfo?.bannedBy || 'HexSyncTH Anti-Hack 3-Strikes').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const initialDeviceId = (banInfo?.deviceId || 'HEX-DEVICE-LOCKED').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bannedUntilIso = banInfo?.bannedUntil || new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString();
  const displayIp = clientIp || '127.0.0.1';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>การเข้าถึงถูกระงับ (Access Denied) - HexSyncTH</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0709;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Kanit", sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow-x: hidden;
    }
    .card {
      width: 100%;
      max-width: 540px;
      background: rgba(18, 9, 13, 0.96);
      border: 1.5px solid rgba(255, 26, 64, 0.45);
      border-radius: 24px;
      box-shadow: 0 0 50px rgba(255, 26, 64, 0.22);
      padding: 2.2rem 1.8rem;
      text-align: center;
      position: relative;
      z-index: 2;
    }
    .icon-box {
      width: 76px;
      height: 76px;
      border-radius: 22px;
      background: rgba(255, 26, 64, 0.12);
      border: 2px solid rgba(255, 26, 64, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 0 30px rgba(255, 26, 64, 0.35);
    }
    .badge {
      display: inline-block;
      color: #ff4d6d;
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }
    h1 {
      font-size: 1.55rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 0.75rem;
    }
    .device-tag {
      display: inline-block;
      background: rgba(0, 210, 255, 0.1);
      border: 1px solid rgba(0, 210, 255, 0.35);
      color: #00d2ff;
      padding: 0.35rem 0.95rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 1.3rem;
      word-break: break-all;
    }
    .info-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 26, 64, 0.25);
      border-radius: 14px;
      padding: 1.2rem;
      text-align: left;
      margin-bottom: 1.3rem;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .info-label {
      color: #ff88a3;
      font-weight: 700;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.2rem;
    }
    .info-val {
      color: #fff;
      font-weight: 600;
      margin-bottom: 0.8rem;
    }
    .reason-box {
      background: rgba(255, 26, 64, 0.08);
      border-left: 3px solid #ff1a40;
      padding: 0.6rem 0.8rem;
      color: #ffccd5;
      font-size: 0.82rem;
      border-radius: 0 8px 8px 0;
    }
    .timer-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 1.3rem;
    }
    .timer-col {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 26, 64, 0.2);
      border-radius: 10px;
      padding: 0.55rem 0.2rem;
    }
    .timer-num {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ff4d6d;
    }
    .timer-sub {
      font-size: 0.65rem;
      color: #a88a91;
    }
    .btn-reload {
      display: block;
      width: 100%;
      padding: 0.85rem;
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      color: #fff;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
    }
    .btn-reload:hover {
      filter: brightness(1.1);
    }
    .emergency-sec {
      border-top: 1px dashed rgba(255, 255, 255, 0.12);
      padding-top: 1rem;
      margin-top: 1rem;
    }
    .emergency-trigger {
      background: transparent;
      border: none;
      color: #ff4d6d;
      font-size: 0.82rem;
      text-decoration: underline;
      cursor: pointer;
      opacity: 0.8;
      font-family: inherit;
      transition: opacity 0.2s;
    }
    .emergency-trigger:hover {
      opacity: 1;
    }
    .emergency-box {
      display: none;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 77, 109, 0.35);
      border-radius: 12px;
      padding: 1rem;
      margin-top: 0.75rem;
      text-align: left;
    }
    .emergency-box.active {
      display: block;
    }
    .emergency-input-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .emergency-input {
      flex: 1;
      padding: 0.55rem 0.85rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 0.85rem;
      outline: none;
      font-family: inherit;
    }
    .emergency-input:focus {
      border-color: #10b981;
    }
    .btn-unban-submit {
      padding: 0.55rem 1rem;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    }
    .emergency-err {
      display: none;
      color: #ff4d6d;
      font-size: 0.78rem;
      margin-top: 0.5rem;
    }
    .btn-cancel {
      background: none;
      border: none;
      color: #888;
      font-size: 0.75rem;
      cursor: pointer;
      margin-top: 0.5rem;
      display: block;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ff1a40" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
    <div class="badge">ACCESS DENIED</div>
    <h1>อุปกรณ์เครื่องนี้ถูกระงับการใช้งาน</h1>
    <div class="device-tag" id="deviceTag">📱 UDID: ${initialDeviceId} | IP: ${displayIp}</div>

    <div class="info-box">
      <div class="info-label">คุณถูกแบนโดย (BANNED BY):</div>
      <div class="info-val">🛡️ ${bannedBy}</div>
      <div class="info-label">เหตุผลในการแบน (REASON):</div>
      <div class="reason-box">${reason}</div>
    </div>

    <div style="font-size: 0.75rem; color: #ff88a3; font-weight: 700; margin-bottom: 0.6rem;">
      ⚡ ระยะเวลาคงเหลือในการถูกระงับสิทธิ์ (COUNTDOWN)
    </div>
    <div class="timer-grid">
      <div class="timer-col"><div class="timer-num" id="t-yr">10</div><div class="timer-sub">ปี (YRS)</div></div>
      <div class="timer-col"><div class="timer-num" id="t-mo">09</div><div class="timer-sub">เดือน</div></div>
      <div class="timer-col"><div class="timer-num" id="t-day">15</div><div class="timer-sub">วัน</div></div>
      <div class="timer-col"><div class="timer-num" id="t-hr">08</div><div class="timer-sub">ชั่วโมง</div></div>
      <div class="timer-col"><div class="timer-num" id="t-min">43</div><div class="timer-sub">นาที</div></div>
      <div class="timer-col"><div class="timer-num" id="t-sec">10</div><div class="timer-sub">วินาที</div></div>
    </div>

    <button id="recheckBtn" onclick="handleRecheck()" class="btn-reload">
      🔄 ตรวจสอบสถานะการปลดแบน / กลับสู่หน้าร้านค้า
    </button>

    <!-- Emergency Admin Unban Section -->
    <div class="emergency-sec">
      <button type="button" id="triggerBtn" onclick="toggleEmergencyBox()" class="emergency-trigger">
        ⚙️ ปลดแบนฉุกเฉิน (เฉพาะแอดมินเจ้าของร้าน)
      </button>

      <form id="emergencyBox" class="emergency-box" onsubmit="handleEmergencySubmit(event)">
        <div style="font-size: 0.82rem; color: #ffb3c1; font-weight: 600;">
          🔑 ปลดแบนฉุกเฉินด้วย Master Key / รหัสแอดมิน:
        </div>
        <div class="emergency-input-row">
          <input
            type="password"
            id="masterKeyInput"
            class="emergency-input"
            placeholder="ใส่ Master Key ปลดแบนฉุกเฉินของคุณ"
            autocomplete="off"
          />
          <button type="submit" id="unbanSubmitBtn" class="btn-unban-submit">
            ปลดแบนทันที
          </button>
        </div>
        <div id="emergencyErr" class="emergency-err"></div>
        <button type="button" onclick="toggleEmergencyBox()" class="btn-cancel">
          ✕ ปิดฟอร์ม
        </button>
      </form>
    </div>
  </div>

  <script>
    (function() {
      // 1. Detect Real Device UDID from localStorage
      try {
        var did = localStorage.getItem('hexsync_did') || sessionStorage.getItem('hexsync_did') || '';
        if (did) {
          var tag = document.getElementById('deviceTag');
          if (tag) tag.innerHTML = '📱 UDID: ' + did + ' | IP: ${displayIp}';
        }
      } catch(e) {}

      // 2. Real-time Countdown Timer
      var targetDate = new Date('${bannedUntilIso}').getTime();
      function updateTimer() {
        var now = Date.now();
        var diff = targetDate - now;
        if (diff <= 0) {
          document.getElementById('t-yr').textContent = '00';
          document.getElementById('t-mo').textContent = '00';
          document.getElementById('t-day').textContent = '00';
          document.getElementById('t-hr').textContent = '00';
          document.getElementById('t-min').textContent = '00';
          document.getElementById('t-sec').textContent = '00';
          return;
        }
        var totalSec = Math.floor(diff / 1000);
        var sec = totalSec % 60;
        var totalMin = Math.floor(totalSec / 60);
        var min = totalMin % 60;
        var totalHr = Math.floor(totalMin / 60);
        var hr = totalHr % 24;
        var totalDays = Math.floor(totalHr / 24);
        var yr = Math.floor(totalDays / 365);
        var remDays = totalDays % 365;
        var mo = Math.floor(remDays / 30);
        var day = remDays % 30;

        document.getElementById('t-yr').textContent = yr < 10 ? '0' + yr : yr;
        document.getElementById('t-mo').textContent = mo < 10 ? '0' + mo : mo;
        document.getElementById('t-day').textContent = day < 10 ? '0' + day : day;
        document.getElementById('t-hr').textContent = hr < 10 ? '0' + hr : hr;
        document.getElementById('t-min').textContent = min < 10 ? '0' + min : min;
        document.getElementById('t-sec').textContent = sec < 10 ? '0' + sec : sec;
      }
      updateTimer();
      setInterval(updateTimer, 1000);

      // 3. Toggle Emergency Form
      window.toggleEmergencyBox = function() {
        var box = document.getElementById('emergencyBox');
        var err = document.getElementById('emergencyErr');
        if (box.classList.contains('active')) {
          box.classList.remove('active');
          if (err) err.style.display = 'none';
        } else {
          box.classList.add('active');
          var input = document.getElementById('masterKeyInput');
          if (input) input.focus();
        }
      };

      // 4. Re-check Ban Status
      window.handleRecheck = async function() {
        var btn = document.getElementById('recheckBtn');
        btn.textContent = '⏳ กำลังตรวจสอบสถานะการปลดแบน...';
        btn.disabled = true;
        try {
          var did = localStorage.getItem('hexsync_did') || '';
          var res = await fetch('/api/devices/check-ban?deviceId=' + encodeURIComponent(did), {
            headers: { 'x-device-id': did }
          });
          var data = await res.json();
          if (!data.banned) {
            alert('🎉 ตรวจสอบสำเร็จ: ระบบปลดแบนเรียบร้อยแล้ว ยินดีต้อนรับกลับสู่เว็บไซต์!');
            try {
              sessionStorage.clear();
              localStorage.removeItem('hexsync_banned_info');
              localStorage.removeItem('hexsync_sec_strikes');
              localStorage.removeItem('hexsync_security_violation');
            } catch(e) {}
            window.location.href = '/';
            window.location.reload();
            return;
          }
        } catch(e) {}
        alert('สถานะ: ยังคงถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ หรือใช้ Master Key ปลดแบน');
        btn.textContent = '🔄 ตรวจสอบสถานะการปลดแบน / กลับสู่หน้าร้านค้า';
        btn.disabled = false;
      };

      // 5. Emergency Unban Action (Master Key)
      window.handleEmergencySubmit = async function(e) {
        e.preventDefault();
        var keyInput = document.getElementById('masterKeyInput');
        var err = document.getElementById('emergencyErr');
        var submitBtn = document.getElementById('unbanSubmitBtn');
        var key = (keyInput.value || '').trim();

        if (!key) {
          err.textContent = '⚠️ กรุณากรอก Master Key หรือรหัสผ่านแอดมิน';
          err.style.display = 'block';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังปลดแบน...';
        err.style.display = 'none';

        try {
          var did = localStorage.getItem('hexsync_did') || '';
          var results = await Promise.all([
            fetch('/api/banned-ips/emergency-unban', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ masterKey: key, unbanAll: true })
            }),
            fetch('/api/devices/emergency-unban', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ masterKey: key, deviceId: did, unbanAll: true })
            })
          ]);

          var r1 = results[0];
          var r2 = results[1];
          var d1 = await r1.json().catch(function() { return {}; });
          var d2 = await r2.json().catch(function() { return {}; });

          if (r1.ok || r2.ok) {
            alert('🎉 ปลดแบนฉุกเฉินสำเร็จแล้ว! เว็บไซต์จะโหลดใหม่อัตโนมัติ');
            try {
              sessionStorage.clear();
              localStorage.removeItem('hexsync_banned_info');
              localStorage.removeItem('hexsync_sec_strikes');
              localStorage.removeItem('hexsync_security_violation');
            } catch(e) {}
            window.location.href = '/';
            window.location.reload();
          } else {
            err.textContent = '⚠️ ' + (d1.message || d2.message || 'Master Key ไม่ถูกต้อง');
            err.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'ปลดแบนทันที';
          }
        } catch(ex) {
          err.textContent = '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
          err.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'ปลดแบนทันที';
        }
      };
    })();
  </script>
</body>
</html>`;
}

function setupFirewallMiddleware(middlewares: any) {
  middlewares.use(async (req: any, res: any, next: any) => {
    const url = req.url || '';

    // 1. Block sourcemaps
    if (url.includes('.map')) {
      res.statusCode = 404;
      return res.end('Not Found');
    }

    // 2. Block sensitive files
    if (url.includes('/.env') || url.includes('package.json') || url.includes('tsconfig')) {
      res.statusCode = 403;
      return res.end('Access Denied');
    }

    // Bypass API requests to proxy
    if (url.startsWith('/api')) {
      return next();
    }

    // Never cache HTML entry point to prevent stale bundles
    if (!url.includes('.') || url.endsWith('.html') || url === '/' || url.startsWith('/?')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
    }

    // 3. Extract Client IP
    const cfIp = req.headers['cf-connecting-ip'];
    const xff = req.headers['x-forwarded-for'];
    const rawIp = (cfIp ? (Array.isArray(cfIp) ? cfIp[0] : cfIp.split(',')[0]) : (xff ? (Array.isArray(xff) ? xff[0] : xff.split(',')[0]) : req.socket?.remoteAddress || '')).trim();
    const clientIp = rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp;
    const deviceId = (req.headers['x-device-id'] || '').toString().trim();

    // Check if client is banned via backend
    let isBanned = false;
    let banInfo: any = null;

    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      try {
        const resp = await fetch(`http://127.0.0.1:4000/api/devices/check-ban?deviceId=${encodeURIComponent(deviceId)}`, {
          headers: {
            'cf-connecting-ip': clientIp,
            'x-forwarded-for': clientIp,
            'x-device-id': deviceId
          }
        });
        if (resp.ok) {
          const data: any = await resp.json();
          if (data && data.banned) {
            isBanned = true;
            banInfo = data;
          }
        }
      } catch {}
    }

    if (isBanned) {
      // If client is banned:
      // A. Block ALL JavaScript code bundle downloads!
      if (url.startsWith('/assets/') || url.endsWith('.js') || url.endsWith('.mjs')) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        return res.end('403 Forbidden: Device or IP is banned');
      }

      // B. For HTML / navigation / root page, render pure static HTML with ZERO <script> tags!
      if (!url.includes('.') || url.endsWith('.html') || url === '/' || url.startsWith('/?')) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        return res.end(renderBannedHtml(banInfo, clientIp));
      }
    }

    next();
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-og-transform',
      transformIndexHtml(html, ctx) {
        const req = (ctx as any).req || (ctx as any).server?.req;
        const rawHost = (req?.headers['x-forwarded-host'] || req?.headers['host'] || '') as string;
        const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
        const proto = (req?.headers['x-forwarded-proto'] as string) || (host && !host.includes('localhost') ? 'https' : 'http');
        
        let origin = '';
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          origin = `${proto}://${host}`;
        } else {
          origin = 'https://hexsyncth.site';
        }

        const ogImageUrl = `${origin}/og-image.png`;
        const siteUrl = `${origin}/`;

        return html
          .replace(/__OG_IMAGE_URL__/g, ogImageUrl)
          .replace(/__SITE_URL__/g, siteUrl);
      },
    },
    {
      name: 'anti-source-leak-and-ban-firewall',
      configureServer(server) {
        setupFirewallMiddleware(server.middlewares);
      },
      configurePreviewServer(server) {
        setupFirewallMiddleware(server.middlewares);
      },
    },
    viteObfuscatorPlugin(),
  ],
  server: {
    allowedHosts: true,
    host: true, // Listen on 0.0.0.0 for LAN/Wi-Fi and external access
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: true,
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
  },
})
