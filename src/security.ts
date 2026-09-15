// src/security.ts - Anti-DevTools, Anti-Inspect, Forensic Capture & 3-Strikes Protection
import html2canvas from 'html2canvas';
import { getPersistentDeviceId } from './deviceInfo';

export interface SecurityViolationDetail {
  reason: string;
  strikeCount: number;
  banned: boolean;
  bannedUntil?: string | null;
  timestamp: string;
  screenshot?: string | null;
}

let isCapturing = false;

export function initClientSecurity() {
  if (typeof window === 'undefined') return;

  const triggerViolation = async (actionName: string) => {
    if (isCapturing) return;
    isCapturing = true;

    try {
      // 1. Get current strike count from sessionStorage (persists across page reloads in same session)
      let currentStrikes = 0;
      try {
        const bannedSaved = sessionStorage.getItem('hexsync_banned_info') || localStorage.getItem('hexsync_banned_info');
        const userBannedSaved = sessionStorage.getItem('hexsync_user_banned_info') || localStorage.getItem('hexsync_user_banned_info');
        const isActuallyBanned = Boolean(bannedSaved || userBannedSaved);

        currentStrikes = parseInt(sessionStorage.getItem('hexsync_sec_strikes') || '0', 10);
        // If not banned, and previous strikes was >= 3, it means the user was unbanned! Reset to 0
        if (!isActuallyBanned && currentStrikes >= 3) {
          currentStrikes = 0;
        }
      } catch {}
      currentStrikes += 1;
      try {
        sessionStorage.setItem('hexsync_sec_strikes', currentStrikes.toString());
      } catch {}

      // 2. Capture Screenshot silently using html2canvas
      let screenshotBase64: string | null = null;
      try {
        const canvas = await html2canvas(document.body, {
          logging: false,
          scale: 0.6, // optimize size
          useCORS: true,
          allowTaint: true,
          ignoreElements: (element) => {
            // Don't capture sensitive password fields if any
            return element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'password';
          }
        });
        screenshotBase64 = canvas.toDataURL('image/jpeg', 0.6);
      } catch {
        // Fallback canvas if html2canvas fails on certain cross-origin DOM
      }

      // 3. Capture Browser Cookies
      const rawCookies = typeof document !== 'undefined' ? (document.cookie || 'NO_COOKIES_FOUND') : '';

      // 4. Retrieve Current User info from localStorage if logged in
      let currentUsername = 'Anonymous';
      try {
        const u = localStorage.getItem('hexsync_user');
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed && parsed.username) currentUsername = parsed.username;
        }
      } catch {}

      const deviceId = getPersistentDeviceId();

      // 5. Transmit Forensic Security Report to Backend
      let reportResponse: any = null;
      try {
        const token = localStorage.getItem('hexsync_token');
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        };
        if (token) {
          reqHeaders['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/security/report-threat', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            threatType: actionName.includes('F12') ? 'F12_DEVTOOLS' : (actionName.includes('คลิกขวา') ? 'CONTEXT_MENU' : 'INSPECT_ATTEMPT'),
            detail: actionName,
            strikeCount: currentStrikes,
            cookies: rawCookies,
            screenshot: screenshotBase64,
            pageUrl: window.location.href,
            deviceId,
            username: currentUsername,
          }),
        });
        if (res.ok) {
          reportResponse = await res.json();
          // Synchronize authoritative normalized strike count from server (e.g. reset to 1 after unban)
          if (reportResponse && typeof reportResponse.strikeCount === 'number') {
            currentStrikes = reportResponse.strikeCount;
            try {
              sessionStorage.setItem('hexsync_sec_strikes', currentStrikes.toString());
            } catch {}
          }
        }
      } catch {}

      const isBanned = (reportResponse && reportResponse.banned !== undefined)
        ? Boolean(reportResponse.banned)
        : (currentStrikes >= 3);
      const bannedUntil = reportResponse?.bannedUntil || (isBanned ? new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString() : null);

      if (!isBanned) {
        try {
          sessionStorage.removeItem('hexsync_banned_info');
          localStorage.removeItem('hexsync_banned_info');
          sessionStorage.removeItem('hexsync_user_banned_info');
          localStorage.removeItem('hexsync_user_banned_info');
        } catch {}
      }

      const detail: SecurityViolationDetail = {
        reason: actionName,
        strikeCount: currentStrikes,
        banned: isBanned,
        bannedUntil,
        timestamp: new Date().toISOString(),
        screenshot: screenshotBase64,
      };

      try {
        sessionStorage.setItem('hexsync_security_violation', JSON.stringify(detail));
      } catch {}

      // If strike 3 or banned -> redirect to #banned with countdown
      if (isBanned) {
        try {
          const bInfo = {
            banned: true,
            banType: 'ip',
            reason: `ละเมิดความปลอดภัยขั้นสูงครบ 3 ครั้ง: ${actionName}`,
            bannedAt: new Date().toISOString(),
            bannedUntil,
            bannedBy: 'HexSyncTH Anti-Hack 3-Strikes'
          };
          sessionStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
          localStorage.setItem('hexsync_banned_info', JSON.stringify(bInfo));
        } catch {}
        window.location.hash = '#banned';
      }

      // Dispatch global event for App.tsx to display Warning Modal or Ban Screen
      window.dispatchEvent(
        new CustomEvent('hexsync:security-violation', {
          detail
        })
      );
    } catch {
      // Ignored
    } finally {
      setTimeout(() => {
        isCapturing = false;
      }, 1500);
    }
  };

  // 1. Disable Right-Click (Context Menu) - Allow accidental clicks, trigger violation ONLY if clicked > 15 times within 1 minute
  let rightClickTimestamps: number[] = [];
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const now = Date.now();
    // Filter timestamps within the last 60 seconds (1 minute)
    rightClickTimestamps = rightClickTimestamps.filter(t => now - t < 60000);
    rightClickTimestamps.push(now);

    if (rightClickTimestamps.length > 15) {
      rightClickTimestamps = []; // reset after triggering
      triggerViolation('พยายามคลิกขวาซ้ำๆ เกิน 15 ครั้งใน 1 นาที (Spam Right-Click)');
    }
    return false;
  }, { capture: true });

  // 2. Block and intercept F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
  document.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;
    const key = (e.key || '').toUpperCase();
    const keyCode = e.keyCode || e.which;

    // F12 key
    if (e.key === 'F12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามกดปุ่ม F12 เพื่อดูซอร์สโค้ดหรือแกะระบบ');
      return false;
    }

    // Ctrl + Shift + I (Inspect) or Ctrl + Shift + J (Console) or Ctrl + Shift + C (Element selector)
    if (isCtrlOrCmd && isShift && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามเปิดเครื่องมือนักพัฒนา (Developer Tools / Inspect Element)');
      return false;
    }

    // Mac: Cmd + Option + I / J / C / U
    if (isCtrlOrCmd && isAlt && (key === 'I' || key === 'J' || key === 'C' || key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามใช้คีย์ลัด Mac เพื่อเปิด DevTools');
      return false;
    }

    // Ctrl + U (View Source)
    if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามกดดูซอร์สโค้ดของเว็บไซต์ (View Page Source)');
      return false;
    }

    // Ctrl + S (Save Page / Dump HTML & Assets)
    if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามบันทึกหน้าเว็บหรือดูดไฟล์ระบบ (Save Page / Dump)');
      return false;
    }

    // Ctrl + Shift + K (Firefox Console)
    if (isCtrlOrCmd && isShift && (key === 'K' || keyCode === 75)) {
      e.preventDefault();
      e.stopPropagation();
      triggerViolation('พยายามเปิดคอนโซลนักพัฒนา (Browser Console)');
      return false;
    }

    // Ctrl + Shift + E (Network Tab)
    if (isCtrlOrCmd && isShift && (key === 'E' || keyCode === 69)) {
      e.preventDefault();
      e.stopPropagation();
      lockdownDevTools('พยายามเปิดแท็บ Network ของเบราว์เซอร์');
      return false;
    }

    // Ctrl + P (Print / Save to PDF)
    if (isCtrlOrCmd && (key === 'P' || keyCode === 80)) {
      e.preventDefault();
      e.stopPropagation();
      lockdownDevTools('พยายามพิมพ์หรือดัมพ์หน้าเว็บเป็นไฟล์ (Print / Save)');
      return false;
    }
  }, { capture: true });

  // 3. Prevent Dragging of images & links
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  // 4. INSTANT LOCKDOWN, ANTI-DEBUGGER & FREEZER TRAP
  let isDevToolsLocked = false;
  let antiDebugInterval: any = null;

  function startAntiDebugger() {
    if (antiDebugInterval) return;

    const execDebugger = () => {
      try {
        // Dynamic constructor prevents bundlers/transpilers from stripping debugger
        (function() {
          return false;
        }['constructor']('debugger')());
      } catch {}
    };

    // Immediate burst trap
    for (let i = 0; i < 5; i++) {
      execDebugger();
    }

    antiDebugInterval = setInterval(execDebugger, 35);
  }

  function stopAntiDebugger() {
    if (antiDebugInterval) {
      clearInterval(antiDebugInterval);
      antiDebugInterval = null;
    }
  }

  // If user is already banned on page load -> immediately lock & freeze DevTools
  try {
    const isBanSaved = Boolean(
      sessionStorage.getItem('hexsync_banned_info') ||
      localStorage.getItem('hexsync_banned_info') ||
      sessionStorage.getItem('hexsync_user_banned_info') ||
      localStorage.getItem('hexsync_user_banned_info') ||
      window.location.hash === '#banned'
    );
    if (isBanSaved) {
      startAntiDebugger();
    }
  } catch {}

  function lockdownDevTools(_reason?: string) {
    if (isDevToolsLocked) return;
    isDevToolsLocked = true;

    // A. Freeze DevTools with unskippable debugger trap loop
    startAntiDebugger();

    // B. Blank out and hide the application DOM immediately
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.display = 'none';
      rootEl.style.visibility = 'hidden';
    }

    // C. Inject Full-Screen High-Tech Lockout Curtain
    let curtain = document.getElementById('hexsync-security-curtain');
    if (!curtain) {
      curtain = document.createElement('div');
      curtain.id = 'hexsync-security-curtain';
      curtain.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: #060204;
        color: #ffffff;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        text-align: center;
        padding: 2rem;
        user-select: none;
      `;
      curtain.innerHTML = `
        <div style="width: 86px; height: 86px; border-radius: 50%; background: rgba(255, 26, 64, 0.15); border: 2.5px solid #ff1a40; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; box-shadow: 0 0 40px rgba(255, 26, 64, 0.55);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff1a40" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <div style="display: inline-block; background: rgba(255, 26, 64, 0.15); border: 1px solid rgba(255, 26, 64, 0.45); border-radius: 20px; padding: 4px 14px; color: #ff4d6d; font-size: 0.76rem; font-weight: 800; letter-spacing: 1px; margin-bottom: 1rem; text-transform: uppercase;">
          HexSyncTH Security MAX — Access Prohibited
        </div>
        <h1 style="color: #ffffff; font-size: 1.85rem; font-weight: 900; margin-bottom: 0.6rem; letter-spacing: 0.5px;">
          ⛔ ไม่อนุญาตให้เปิดใช้งาน Developer Tools
        </h1>
        <p style="color: #b89ca2; font-size: 0.95rem; max-width: 500px; line-height: 1.6; margin-bottom: 1.5rem;">
          ระบบตรวจพบว่าคุณกำลังเปิดเครื่องมือนักพัฒนา (Inspect / Console / Network) เพื่อความปลอดภัยสูงสุด ระบบได้ทำการระงับการเข้าถึงหน้าร้านค้าและล็อกการทำงานทั้งหมดทันที
        </p>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 0.8rem 1.4rem; font-size: 0.82rem; color: #ff4d6d; margin-bottom: 1.75rem;">
          ⚠️ กรุณาปิดเครื่องมือนักพัฒนา (DevTools) ให้สนิท แล้วกดปุ่มด้านล่างเพื่อรีเฟรชเข้าใช้งานใหม่
        </div>
        <button onclick="window.location.reload()" style="padding: 0.9rem 2.5rem; background: linear-gradient(135deg, #ff1a40, #b3001e); color: #fff; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 25px rgba(255, 26, 64, 0.5);">
          รีเฟรชหน้าเว็บ (Reload Page)
        </button>
      `;
      document.body.appendChild(curtain);
    }
  }

  function unlockDevTools() {
    if (!isDevToolsLocked) return;
    isDevToolsLocked = false;
    stopAntiDebugger();
    const curtain = document.getElementById('hexsync-security-curtain');
    if (curtain) curtain.remove();
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.display = '';
      rootEl.style.visibility = '';
    }
  }

  // 5. RUNTIME DETECTORS:
  // A. Docked DevTools Detector (Window Outer vs Inner Size Differential)
  const checkDockedDevTools = () => {
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) return;
    if (window.innerWidth < 650) return; // ignore small mobile screens
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > 240 || heightDiff > 240) {
      lockdownDevTools('ตรวจพบการเปิด Developer Tools ตรวจสอบเว็บไซต์ (Docked Inspect)');
    } else if (isDevToolsLocked && widthDiff <= 180 && heightDiff <= 180) {
      unlockDevTools();
    }
  };

  window.addEventListener('resize', checkDockedDevTools, { passive: true });
  setInterval(checkDockedDevTools, 800);

  // B. Undocked / Floating DevTools Detector (Debugger Timing Check)
  const checkDebuggerTiming = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const start = performance.now();
    try {
      (function() {
        return false;
      }['constructor']('debugger')());
    } catch {}
    const duration = performance.now() - start;
    if (duration > 100) {
      lockdownDevTools('ตรวจพบการหยุดเบรกพอยต์หรือเปิด DevTools แยกหน้าต่าง (Debugger Timing)');
    }
  };
  setInterval(checkDebuggerTiming, 1000);

  // 6. Overwrite and Mute Console to prevent memory & object dumping
  try {
    const noop = () => {};
    window.console.clear = noop;
    window.console.log = noop;
    window.console.info = noop;
    window.console.warn = noop;
    window.console.error = noop;
    window.console.debug = noop;
    window.console.dir = noop;
    window.console.table = noop;
    window.console.trace = noop;
  } catch {}
}


