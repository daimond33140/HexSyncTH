// src/deviceInfo.ts
// Deep Hardware, Phone Model, and Persistent Device ID (UDID) Inspector

export interface DeviceInfoData {
  deviceId: string; // Persistent Hardware UUID / UDID (e.g. HEX-DID-...)
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
