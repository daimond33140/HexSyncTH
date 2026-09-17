// src/deviceInfo.ts
// Deep Hardware, Phone Model, and Persistent Device ID (UDID) Inspector

export interface DeviceInfoData {
  deviceId: string; // Persistent Hardware UUID / UDID (e.g. HEX-DID-...)
  hardwareHash: string; // Deterministic Canvas & WebGL Hardware Fingerprint (e.g. HEX-HW-...)
  brand: string; // e.g. Apple, Samsung, Xiaomi, Windows, Google
  model: string; // e.g. iPhone 15 Pro Max, Galaxy S24, Windows 11 PC
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string; // e.g. iOS 17.5, Android 14, Windows 11 64-bit
  browser: string; // e.g. Safari Mobile 17.5, Chrome 128
  gpuVendor: string; // e.g. Apple, Qualcomm, NVIDIA
  gpuRenderer: string; // e.g. Apple GPU, Adreno 740, RTX 4070
  screenResolution: string; // e.g. 1179x2556 (Retina 3x)
  colorDepth: string; // e.g. 24-bit
  cpuCores: number | string; // e.g. 8 cores
  ramGb: string; // e.g. 8 GB
  touchPoints: number; // e.g. 5
  timezone: string; // e.g. Asia/Bangkok
  language: string; // e.g. th-TH
  connectionType: string; // e.g. 4g, wifi
  capturedAt: string;
}


// Simple fast 32-bit FNV-1a hash function for strings
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

// Deterministic Canvas 2D Graphics Fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'NO_2D_CANVAS';

    // Canvas drawing with geometric shapes, text, gradient, and emoji
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial", "Helvetica", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('HexSyncTH🔒HW-BAN🛡️', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Anti-VPN-Proxy-Pass!@#', 4, 35);

    const grad = ctx.createLinearGradient(0, 0, 240, 0);
    grad.addColorStop(0, '#ff1a40');
    grad.addColorStop(0.5, '#00d2ff');
    grad.addColorStop(1, '#ffdf00');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 5, 220, 48);

    return fnv1aHash(canvas.toDataURL());
  } catch {
    return 'CANVAS_ERR';
  }
}

// Compute Deterministic Hardware Fingerprint (Persists across Incognito, VPN, and Cache clears)
export function getHardwareFingerprint(): string {
  if (typeof window === 'undefined') return 'HEX-HW-SERVER';

  try {
    const canvasHash = getCanvasFingerprint();
    const gpu = getWebGlGpuInfo();
    const screenRes = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth || 24}x${window.devicePixelRatio || 1}`;
    const cpuCores = (navigator as any).hardwareConcurrency || 4;
    const ramGb = (navigator as any).deviceMemory || 8;
    const platform = navigator.platform || 'Unknown';
    const touchPoints = navigator.maxTouchPoints || 0;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';

    const rawHardwareSignature = [
      canvasHash,
      gpu.renderer,
      gpu.vendor,
      screenRes,
      cpuCores,
      ramGb,
      platform,
      touchPoints,
      timezone
    ].join('###');

    const hash1 = fnv1aHash(rawHardwareSignature);
    const hash2 = fnv1aHash(rawHardwareSignature.split('').reverse().join(''));

    return `HEX-HW-${hash1}-${hash2}`;
  } catch {
    return 'HEX-HW-FALLBACK';
  }
}

// Generate or retrieve persistent Device ID (UDID) stored in localStorage and cookies
export function getPersistentDeviceId(): string {
  const STORAGE_KEY = 'hexsync_device_udid';

  // 1. Try localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.startsWith('HEX-DID-')) {
      return saved;
    }
  } catch {}

  // 2. Try Cookie
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + STORAGE_KEY + '=([^;]*)'));
    if (match && match[2] && match[2].startsWith('HEX-DID-')) {
      try {
        localStorage.setItem(STORAGE_KEY, match[2]);
      } catch {}
      return match[2];
    }
  } catch {}

  // 3. Generate brand new cryptographic hardware UUID
  let uuidPart = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuidPart = crypto.randomUUID().toUpperCase();
  } else {
    // Fallback pseudo-random
    uuidPart = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }

  const newDid = `HEX-DID-${uuidPart}`;

  // Persist in both localStorage and cookie (valid for 5 years)
  try {
    localStorage.setItem(STORAGE_KEY, newDid);
  } catch {}

  try {
    const expires = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${STORAGE_KEY}=${newDid}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}

  return newDid;
}

// WebGL Unmasked GPU & Renderer extraction
function getWebGlGpuInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: 'Standard Graphics', renderer: 'Standard WebGL' };

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return {
        vendor: cleanGpuString(vendor),
        renderer: cleanGpuString(renderer),
      };
    }
    return { vendor: 'Generic GPU', renderer: 'WebGL Supported' };
  } catch {
    return { vendor: 'Unavailable', renderer: 'Unavailable' };
  }
}

function cleanGpuString(str: string): string {
  if (!str) return 'Unknown';
  return str
    .replace(/ANGLE \((.+)\)/, '$1')
    .replace(/Direct3D.+/, '')
    .trim();
}

// Identify exact iPhone/iPad models by resolution, aspect ratio & pixel ratio
function detectAppleDeviceModel(): string {
  const w = window.screen.width;
  const h = window.screen.height;
  const pr = window.devicePixelRatio || 1;
  const portraitW = Math.min(w, h);
  const portraitH = Math.max(w, h);

  // Exact physical pixel dimensions: (portraitW * pr) x (portraitH * pr)
  const physW = Math.round(portraitW * pr);
  const physH = Math.round(portraitH * pr);

  // iPhone Models
  if (physW === 1290 && physH === 2796) return 'iPhone 14/15/16 Pro Max';
  if (physW === 1179 && physH === 2556) return 'iPhone 15 / 15 Pro / 16';
  if (physW === 1170 && physH === 2532) return 'iPhone 12 / 13 / 14 (Pro)';
  if (physW === 1284 && physH === 2778) return 'iPhone 12/13 Pro Max / 14 Plus';
  if (physW === 1080 && physH === 2340) return 'iPhone 12/13 mini';
  if (physW === 1125 && physH === 2436) return 'iPhone X / XS / 11 Pro';
  if (physW === 1242 && physH === 2688) return 'iPhone XS Max / 11 Pro Max';
  if (physW === 828 && physH === 1792) return 'iPhone 11 / XR';
  if (physW === 1242 && physH === 2208) return 'iPhone 6/7/8 Plus';
  if (physW === 750 && physH === 1334) return 'iPhone SE / 7 / 8';

  // iPad Models
  if (portraitW >= 1024) return 'iPad Pro 12.9"';
  if (portraitW >= 834) return 'iPad Pro 11" / iPad Air';
  if (portraitW >= 768) return 'iPad / iPad mini';

  return 'Apple iPhone / iOS Device';
}

// Extract model and brand from User Agent & Client Hints
async function detectDeviceBrandAndModel(ua: string): Promise<{ brand: string; model: string; deviceType: 'mobile' | 'tablet' | 'desktop' }> {
  // Check High Entropy Client Hints if supported (Chrome, Edge, Samsung Browser)
  const navAny = navigator as any;
  if (navAny.userAgentData && typeof navAny.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navAny.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hints.model && hints.model.trim()) {
        const rawModel = hints.model.trim();
        let brand = 'Android Phone';
        if (/SM-|Galaxy/i.test(rawModel)) brand = 'Samsung';
        else if (/Pixel/i.test(rawModel)) brand = 'Google Pixel';
        else if (/Xiaomi|Redmi|POCO/i.test(rawModel) || /2[0-9]{3}/.test(rawModel)) brand = 'Xiaomi';
        else if (/CPH|RMX/i.test(rawModel)) brand = 'Oppo / Realme';
        else if (/V[0-9]{4}/i.test(rawModel)) brand = 'Vivo';

        return {
          brand,
          model: `${brand} (${rawModel})`,
          deviceType: navAny.userAgentData.mobile ? 'mobile' : 'desktop',
        };
      }
    } catch {}
  }

  // Apple devices
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const isTablet = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const model = detectAppleDeviceModel();
    return {
      brand: 'Apple',
      model,
      deviceType: isTablet ? 'tablet' : 'mobile',
    };
  }

  // Mac desktop
  if (/Macintosh|Mac OS X/.test(ua) && navigator.maxTouchPoints <= 1) {
    return {
      brand: 'Apple',
      model: 'MacBook / Mac Computer',
      deviceType: 'desktop',
    };
  }

  // Android devices: Parse phone brand & model tokens from UA
  if (/Android/i.test(ua)) {
    const isTablet = /Tablet|Nexus 7|Nexus 10/i.test(ua) || window.screen.width >= 768;
    let brand = 'Android';
    let model = 'อุปกรณ์ Android';

    const match = ua.match(/;\s*([^;)]+)\s*Build\/([A-Za-z0-9_.-]+)/i);
    if (match && match[1]) {
      const deviceToken = match[1].trim();
      if (/SM-|SAMSUNG/i.test(deviceToken)) {
        brand = 'Samsung';
        model = `Samsung Galaxy (${deviceToken.replace(/SAMSUNG /i, '')})`;
      } else if (/Xiaomi|Redmi|POCO|2[0-9]{4}/i.test(deviceToken)) {
        brand = 'Xiaomi';
        model = `Xiaomi / Redmi (${deviceToken})`;
      } else if (/CPH|OPPO/i.test(deviceToken)) {
        brand = 'OPPO';
        model = `OPPO (${deviceToken})`;
      } else if (/V[0-9]{4}|vivo/i.test(deviceToken)) {
        brand = 'vivo';
        model = `vivo (${deviceToken})`;
      } else if (/RMX|Realme/i.test(deviceToken)) {
        brand = 'realme';
        model = `realme (${deviceToken})`;
      } else if (/Pixel/i.test(deviceToken)) {
        brand = 'Google';
        model = deviceToken;
      } else if (/Huawei|HMA|VOG|ELE/i.test(deviceToken)) {
        brand = 'Huawei';
        model = `Huawei (${deviceToken})`;
      } else if (/Infinix|X[0-9]{3}/i.test(deviceToken)) {
        brand = 'Infinix';
        model = `Infinix (${deviceToken})`;
      } else {
        model = `Android (${deviceToken})`;
      }
    } else if (/Samsung/i.test(ua)) {
      brand = 'Samsung';
      model = 'Samsung Galaxy Phone';
    }

    return {
      brand,
      model,
      deviceType: isTablet ? 'tablet' : 'mobile',
    };
  }

  // Windows Desktop
  if (/Windows NT 10.0/i.test(ua)) {
    return {
      brand: 'Microsoft / PC',
      model: 'Windows 11 / Windows 10 PC',
      deviceType: 'desktop',
    };
  }
  if (/Windows NT/i.test(ua)) {
    return {
      brand: 'Microsoft / PC',
      model: 'Windows Desktop PC',
      deviceType: 'desktop',
    };
  }

  // Linux
  if (/Linux/i.test(ua)) {
    return {
      brand: 'Linux',
      model: 'Linux PC / Workstation',
      deviceType: 'desktop',
    };
  }

  return {
    brand: 'Generic Device',
    model: 'เบราว์เซอร์ทั่วไป (Desktop/Laptop)',
    deviceType: 'desktop',
  };
}

// Detect Operating System
function detectOS(ua: string): string {
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 11 / 10 64-bit';
  if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6.1/i.test(ua)) return 'Windows 7';

  // iOS detection with version
  const iosMatch = ua.match(/OS (\d+[_.]\d+)/i);
  if (iosMatch) return `iOS ${iosMatch[1].replace('_', '.')}`;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS (Apple)';

  // Android detection with version
  const androidMatch = ua.match(/Android (\d+(\.\d+)?)/i);
  if (androidMatch) return `Android ${androidMatch[1]}`;
  if (/Android/i.test(ua)) return 'Android OS';

  // Mac OS X
  const macMatch = ua.match(/Mac OS X (\d+[_.]\d+)/i);
  if (macMatch) return `macOS ${macMatch[1].replace('_', '.')}`;
  if (/Macintosh/i.test(ua)) return 'macOS';

  if (/CrOS/i.test(ua)) return 'ChromeOS';
  if (/Linux/i.test(ua)) return 'Linux';

  return 'Unknown OS';
}

// Detect Browser
function detectBrowser(ua: string): string {
  if (/SamsungBrowser\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/SamsungBrowser\/(\d+(\.\d+)?)/i);
    return `Samsung Internet ${m ? m[1] : ''}`;
  }
  if (/Edg\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/Edg\/(\d+(\.\d+)?)/i);
    return `Microsoft Edge ${m ? m[1] : ''}`;
  }
  if (/OPR\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/OPR\/(\d+(\.\d+)?)/i);
    return `Opera ${m ? m[1] : ''}`;
  }
  if (/Chrome\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+(\.\d+)?)/i);
    return `Google Chrome ${m ? m[1] : ''}`;
  }
  if (/Version\/(\d+(\.\d+)?).*Safari/i.test(ua)) {
    const m = ua.match(/Version\/(\d+(\.\d+)?)/i);
    return `Safari ${m ? m[1] : ''}`;
  }
  if (/Firefox\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+(\.\d+)?)/i);
    return `Mozilla Firefox ${m ? m[1] : ''}`;
  }
  return 'Web Browser';
}

// Master function: Gathers complete, rich device metadata
export async function collectFullDeviceInfo(): Promise<DeviceInfoData> {
  const ua = navigator.userAgent || '';
  const deviceId = getPersistentDeviceId();
  const gpu = getWebGlGpuInfo();
  const brandAndModel = await detectDeviceBrandAndModel(ua);
  const os = detectOS(ua);
  const browser = detectBrowser(ua);

  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const dpr = window.devicePixelRatio || 1;
  const colorDepth = window.screen.colorDepth ? `${window.screen.colorDepth}-bit` : '24-bit';
  const screenResStr = `${screenW} x ${screenH} (${Math.round(screenW * dpr)} x ${Math.round(screenH * dpr)} @ ${dpr}x)`;

  const navAny = navigator as any;
  const cpuCores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : 'ไม่ระบุ';
  const ramGb = navAny.deviceMemory ? `${navAny.deviceMemory} GB` : '4+ GB';
  const touchPoints = navigator.maxTouchPoints || 0;

  // Timezone and Locale
  let timezone = 'Asia/Bangkok';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';
  } catch {}

  const language = navigator.language || 'th-TH';

  // Network connection
  let connectionType = 'ปกติ (Online)';
  if (navAny.connection) {
    const eff = navAny.connection.effectiveType;
    const type = navAny.connection.type;
    connectionType = eff ? `${eff.toUpperCase()} (${type || 'Cellular/WiFi'})` : 'Online';
  }

  return {
    deviceId,
    hardwareHash: getHardwareFingerprint(),
    brand: brandAndModel.brand,
    model: brandAndModel.model,
    deviceType: brandAndModel.deviceType,
    os,
    browser,
    gpuVendor: gpu.vendor,
    gpuRenderer: gpu.renderer,
    screenResolution: screenResStr,
    colorDepth,
    cpuCores,
    ramGb,
    touchPoints,
    timezone,
    language,
    connectionType,
    capturedAt: new Date().toISOString(),
  };
}


// ==========================================
// STEALTH MULTI-VECTOR DEVICE TRACKING FLAG
// Supports: iOS Safari/Chrome, Android, Windows/Mac/Linux PC
// Vectors: 1) Long-Lived Cookie 2) IndexedDB 3) LocalStorage 4) SessionStorage
// ==========================================

const STEALTH_KEY = '__hx_sys_pref';

function openStealthDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('__hx_sys_store', 1);
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains('meta')) {
            req.result.createObjectStore('meta');
          }
        } catch {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getFromIndexedDB(): Promise<string | null> {
  const db = await openStealthDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get(STEALTH_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setToIndexedDB(val: string): Promise<void> {
  const db = await openStealthDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      store.put(val, STEALTH_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function deleteFromIndexedDB(): Promise<void> {
  const db = await openStealthDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      store.delete(STEALTH_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Get stealth device tracking flag across 4 resilient storage layers
 * Self-heals across layers if one is cleared!
 */
export async function getStealthDeviceFlag(): Promise<string> {
  let flag: string | null = null;

  // 1. Try LocalStorage
  try {
    const ls = localStorage.getItem(STEALTH_KEY);
    if (ls && ls.startsWith('HEX-FLAG-')) flag = ls;
  } catch {}

  // 2. Try Cookie (10-year expiration)
  if (!flag) {
    try {
      const match = document.cookie.match(new RegExp('(^|;\\s*)' + STEALTH_KEY + '=([^;]*)'));
      if (match && match[2] && match[2].startsWith('HEX-FLAG-')) flag = decodeURIComponent(match[2]);
    } catch {}
  }

  // 3. Try SessionStorage
  if (!flag) {
    try {
      const ss = sessionStorage.getItem(STEALTH_KEY);
      if (ss && ss.startsWith('HEX-FLAG-')) flag = ss;
    } catch {}
  }

  // 4. Try IndexedDB
  if (!flag) {
    try {
      const idb = await getFromIndexedDB();
      if (idb && idb.startsWith('HEX-FLAG-')) flag = idb;
    } catch {}
  }

  // Self-heal: If found in any layer, replicate to all other layers silently
  if (flag) {
    setStealthDeviceFlag(flag).catch(() => {});
    return flag;
  }

  return '';
}

/**
 * Persist stealth device tracking flag silently into all 4 vectors
 */
export async function setStealthDeviceFlag(flagToken: string): Promise<void> {
  if (!flagToken) return;

  // 1. LocalStorage
  try {
    localStorage.setItem(STEALTH_KEY, flagToken);
  } catch {}

  // 2. SessionStorage
  try {
    sessionStorage.setItem(STEALTH_KEY, flagToken);
  } catch {}

  // 3. Cookie (Expires in 10 years, SameSite=Lax)
  try {
    const exp = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toUTCString();
    document.cookie = `${STEALTH_KEY}=${encodeURIComponent(flagToken)}; expires=${exp}; path=/; SameSite=Lax`;
  } catch {}

  // 4. IndexedDB
  try {
    await setToIndexedDB(flagToken);
  } catch {}
}

/**
 * Remove stealth device tracking flag from all vectors upon legitimate admin unban
 */
export async function clearStealthDeviceFlag(): Promise<void> {
  // 1. LocalStorage
  try {
    localStorage.removeItem(STEALTH_KEY);
  } catch {}

  // 2. SessionStorage
  try {
    sessionStorage.removeItem(STEALTH_KEY);
  } catch {}

  // 3. Cookie (Expire immediately)
  try {
    document.cookie = `${STEALTH_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {}

  // 4. IndexedDB
  try {
    await deleteFromIndexedDB();
  } catch {}
}
