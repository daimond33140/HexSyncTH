// server/middleware/wafSecurity.js
const { getClientIp, banIpImmediately, isIpBanned, isIpWhitelisted } = require('./ipBan');
const { autoJailMap } = require('./antiFlood');
const { Log } = require('../models');

// In-memory sliding trackers for stateful attack detection
const fuzzerTrackingMap = new Map(); // ip -> { count404: number, windowStart: number }
const loginAttemptMap = new Map();   // ip -> { failedCount: number, windowStart: number, usernames: Set }
const exploitAttemptMap = new Map(); // ip -> { count: number, windowStart: number }

// Periodically clean up stale state maps every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of fuzzerTrackingMap.entries()) {
    if (now - data.windowStart > 30000) fuzzerTrackingMap.delete(ip);
  }
  for (const [ip, data] of loginAttemptMap.entries()) {
    if (now - data.windowStart > 15 * 60 * 1000) loginAttemptMap.delete(ip);
  }
  for (const [ip, data] of exploitAttemptMap.entries()) {
    if (now - data.windowStart > 60000) exploitAttemptMap.delete(ip);
  }
}, 60000);

// 1. Known Reconnaissance & Vulnerability Scanner User-Agents
const MALICIOUS_USER_AGENTS = [
  // Reconnaissance & Fingerprinting (Nmap, Shodan, Masscan, etc.)
  /nmap/i,
  /shodan/i,
  /masscan/i,
  /zgrab/i,
  /censys/i,
  /amass/i,
  /sublist3r/i,
  /projectdiscovery/i,
  /whatweb/i,
  /wappalyzer/i,
  /dnsrecon/i,
  /theharvester/i,
  /recon-ng/i,
  /aquatone/i,

  // Vulnerability Scanners (Nikto, Nuclei, ZAP, Nessus, OpenVAS, etc.)
  /nikto/i,
  /nuclei/i,
  /zap/i,
  /owasp/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /w3af/i,
  /arachni/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /ffuf/i,
  /feroxbuster/i,
  /rustbuster/i,
  /cortex/i,
  /burpcollaborator/i,

  // Exploitation Tools (sqlmap, hydra, metasploit, havok)
  /sqlmap/i,
  /hydra/i,
  /metasploit/i,
  /havoc/i
];

// 2. Honeypot Trap Paths (Paths scanned exclusively by malicious bots and hackers)
const HONEYPOT_PATHS = [
  // Sensitive environment & config files
  /^\/\.env(\.|$|\/)/i,
  /^\/\.git(\.|$|\/)/i,
  /^\/\.svn(\.|$|\/)/i,
  /^\/\.hg(\.|$|\/)/i,
  /^\/\.bzr(\.|$|\/)/i,
  /^\/\.aws(\.|$|\/)/i,
  /^\/\.ssh(\.|$|\/)/i,
  /^\/config\.(json|env|ini|yml|yaml|php)$/i,
  /^\/web\.config$/i,
  /^\/\.ds_store$/i,
  /^\/composer\.(json|lock)$/i,
  /^\/package-lock\.json$/i,
  /^\/id_rsa$/i,

  // Backups and SQL dumps
  /^\/(database|db|backup|dump|data|users|site)\.(sql|tar|tar\.gz|zip|bak|old)$/i,
  /^\/backup\//i,

  // PHP & CMS Probing (WordPress, phpMyAdmin, Adminer, etc.)
  /^\/wp-admin(\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/wp-content\//i,
  /^\/wp-includes\//i,
  /^\/xmlrpc\.php/i,
  /^\/phpmyadmin(\/|$)/i,
  /^\/pma(\/|$)/i,
  /^\/adminer(\.php|\/|$)/i,
  /^\/myadmin(\/|$)/i,
  /^\/sqladmin(\/|$)/i,
  /^\/dbadmin(\/|$)/i,
  /^\/manager\/html/i,
  /^\/solr(\/|$)/i,
  /^\/actuator(\/|$)/i,
  /^\/swagger-ui(\/|$)/i,
  /^\/v2\/api-docs/i,
  /^\/cgi-bin\//i,
  /^\/shell\.php/i,
  /^\/cmd\.php/i,
  /^\/alfa\.php/i,
  /^\/eval-stdin/i
];

// 3. Exploit Payload Patterns (SQLi, XSS, LFI/RFI, RCE, Path Traversal)
const EXPLOIT_PATTERNS = [
  // SQL Injection (SQLi)
  {
    type: 'SQL_INJECTION',
    pattern: /(\bUNION\b[\s\S]+?\bSELECT\b|\b(OR|AND)\b\s+['"\d\w]+?\s*=\s*['"\d\w]+?|\bWAITFOR\s+DELAY\b|\bSLEEP\s*\(\s*\d+\s*\)|\bBENCHMARK\s*\(\s*\d+|\bINFORMATION_SCHEMA\b|\b(LOAD_FILE|INTO\s+(OUT|DUMP)FILE)\b|;\s*(DROP|ALTER|CREATE|EXEC|EXECUTE)\b|EXTRACTVALUE\s*\(|UPDATEXML\s*\(|xp_cmdshell)/i,
    severity: 'critical'
  },
  // Cross-Site Scripting (XSS)
  {
    type: 'XSS_PAYLOAD',
    pattern: /(<script[\s\S]*?>[\s\S]*?<\/script>|javascript\s*:|data:text\/html|\bon(load|error|click|mouseover|submit|focus)\s*=|alert\s*\(\s*['"]?XSS|\b<iframe|<object|<embed)/i,
    severity: 'high'
  },
  // Path Traversal & LFI/RFI
  {
    type: 'PATH_TRAVERSAL_LFI',
    pattern: /(\.\.[\/\\]|%2e%2e|\/etc\/passwd|\/etc\/shadow|\/proc\/self|c:\\windows\\system32|win\.ini|boot\.ini|php:\/\/input|php:\/\/filter|data:\/\/text)/i,
    severity: 'critical'
  },
  // Remote Code Execution / Command Injection (RCE)
  {
    type: 'COMMAND_INJECTION',
    pattern: /([;&|`]\s*(cat|ls|whoami|id|uname|bash|sh|cmd|powershell|curl|wget|nc|netcat|python|perl)\b|\$\(\s*(cat|ls|whoami|id|uname|bash|sh|cmd|powershell|curl|wget))/i,
    severity: 'critical'
  },
  // Null-Byte Injection
  {
    type: 'NULL_BYTE_INJECTION',
    pattern: /(%00|\\x00|\0)/i,
    severity: 'high'
  }
];

/**
 * Deep inspection helper to scan objects, arrays, and strings recursively
 */
function scanValueForExploit(value, depth = 0) {
  if (depth > 5 || !value) return null;

  if (typeof value === 'string') {
    // Check all exploit patterns
    for (const rule of EXPLOIT_PATTERNS) {
      if (rule.pattern.test(value)) {
        return { type: rule.type, severity: rule.severity, matched: value.slice(0, 100) };
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // Scan key name
      const keyViolation = scanValueForExploit(key, depth + 1);
      if (keyViolation) return keyViolation;

      // Scan key value
      const valViolation = scanValueForExploit(value[key], depth + 1);
      if (valViolation) return valViolation;
    }
  }

  return null;
}

/**
 * Main Web Application Firewall (WAF) Middleware
 */
async function wafSecurityMiddleware(req, res, next) {
  // Always allow CORS preflight handshakes
  if (req.method === 'OPTIONS') {
    return next();
  }

  const ip = getClientIp(req);

  // Whitelist and Localhost bypass
  if (isIpWhitelisted(ip) || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return next();
  }

  const userAgent = (req.headers['user-agent'] || '').toString();
  const requestPath = req.path || req.url || '';

  // 1. RECONNAISSANCE & FOOTPRINTING: Filter known scanning tools
  for (const uaRegex of MALICIOUS_USER_AGENTS) {
    if (uaRegex.test(userAgent)) {
      console.warn(`[WAF Block] 🚨 Scanner User-Agent blocked from ${ip}: ${userAgent}`);
      await banIpImmediately(ip, `ตรวจพบเครื่องมือสแกนเจาะระบบ (Scanner/Recon User-Agent): ${userAgent.slice(0, 80)}`);
      try {
        await Log.create({
          action: 'SCANNER_AGENT_BLOCKED',
          detail: `บล็อกเครื่องมือสแกน: ${userAgent} บนเส้นทาง ${requestPath}`,
          username: 'Attacker/Bot',
          ip
        });
      } catch {}
      return res.status(403).json({
        banned: true,
        message: 'การเข้าถึงถูกปฏิเสธโดย HexSyncTH WAF (Scanner/Recon User-Agent Detected)',
        reason: 'ตรวจพบเครื่องมือสแกนหรือการรวบรวมข้อมูลที่ไม่ได้รับอนุญาต'
      });
    }
  }

  // 2. HONEYPOT TRAP: Trap bots probing sensitive server files and configs
  for (const honeyRegex of HONEYPOT_PATHS) {
    if (honeyRegex.test(requestPath)) {
      console.warn(`[WAF Honeypot] 🪤 Honeypot tripped by ${ip} on path: ${requestPath}`);
      await banIpImmediately(ip, `[Honeypot Trap] ตรวจพบการสแกนหาไฟล์ลับ/ระบบ: ${requestPath}`);
      try {
        await Log.create({
          action: 'HONEYPOT_TRIPPED',
          detail: `ติดบ่อล่อโจร (Honeypot): พยายามเข้าถึงไฟล์ลับ ${requestPath}`,
          username: 'Attacker/Recon',
          ip
        });
      } catch {}
      return res.status(403).json({
        banned: true,
        message: 'คุณถูกระงับการเข้าใช้งานเนื่องจากตรวจพบการสแกนหาช่องโหว่/ไฟล์ระบบ (Honeypot Triggered)',
        reason: `พยายามสแกนหาไฟล์ลับหรือโครงสร้างระบบ: ${requestPath}`
      });
    }
  }

  // 3. EXPLOITATION & WEB TESTING: Deep inspection of URL, Query String, and Body
  // Bypass inspection for administrative product management when authenticated as Admin
  const isExcludedAdminUpload = req.isAdmin && (requestPath.startsWith('/api/products') || requestPath.startsWith('/api/settings'));

  if (!isExcludedAdminUpload) {
    // Scan URL / Path
    let violation = scanValueForExploit(decodeURIComponent(req.originalUrl || requestPath));

    // Scan Query parameters
    if (!violation && req.query) {
      violation = scanValueForExploit(req.query);
    }

    // Scan Body payload (if JSON or urlencoded)
    if (!violation && req.body && typeof req.body === 'object') {
      violation = scanValueForExploit(req.body);
    }

    if (violation) {
      console.warn(`[WAF Exploit Shield] 🛡️ Blocked ${violation.type} from ${ip} on ${requestPath}`);

      // Track exploit attempts per IP
      const now = Date.now();
      let expData = exploitAttemptMap.get(ip) || { count: 0, windowStart: now };
      if (now - expData.windowStart > 60000) {
        expData = { count: 0, windowStart: now };
      }
      expData.count++;
      exploitAttemptMap.set(ip, expData);

      // If critical severity or repeated payload attempts -> Ban IP immediately
      if (violation.severity === 'critical' || expData.count >= 2) {
        await banIpImmediately(ip, `ตรวจพบ Payload โจมตีระบบ (${violation.type}): ${violation.matched}`);
      }

      try {
        await Log.create({
          action: `WAF_${violation.type}`,
          detail: `ตรวจพบและบล็อกการโจมตี (${violation.type}) บน ${requestPath}: ${violation.matched}`,
          username: 'Attacker/Exploit',
          ip
        });
      } catch {}

      return res.status(403).json({
        banned: true,
        message: 'การส่งข้อมูลถูกปฏิเสธโดย HexSyncTH WAF (Malicious Payload Detected)',
        violationType: violation.type,
        detail: 'ตรวจพบชุดคำสั่งหรือ Payload ที่พยายามเจาะระบบเว็บไซต์'
      });
    }
  }

  // 4. VULNERABILITY SCANNING & FUZZING: Anti-Directory Fuzzing / Gobuster / FFUF Detection
  // Intercept res.status to count rapid 404 responses (exclude 400 validation errors)
  const originalEnd = res.end;
  res.end = function (...args) {
    if (res.statusCode === 404) {
      const now = Date.now();
      let fuzzerData = fuzzerTrackingMap.get(ip);
      if (!fuzzerData || (now - fuzzerData.windowStart > 10000)) {
        fuzzerData = { count404: 1, windowStart: now };
        fuzzerTrackingMap.set(ip, fuzzerData);
      } else {
        fuzzerData.count404++;
        if (fuzzerData.count404 >= 50) {
          // IP is rapidly probing non-existent routes (Directory brute force)
          console.warn(`[WAF Anti-Fuzzing] 🚨 Fuzzing sweep detected from ${ip} (${fuzzerData.count404} errors in 10s)`);
          banIpImmediately(ip, `[Vulnerability Fuzzer] ตรวจพบการสแกนและ Fuzzing ไดเรกทอรีผิดปกติ (Gobuster/Dirbuster/FFUF)`).catch(() => {});
          autoJailMap.set(ip, now + 15 * 60 * 1000); // 15-min jail
        }
      }
    }
    return originalEnd.apply(this, args);
  };

  // 5. SERVER FINGERPRINT MASKING & HARDENING
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Server', 'HexSyncTH-Shield/MAX');

  next();
}

/**
 * Intelligent Brute-Force & Credential Stuffing Guard for Login
 */
function recordFailedLogin(ip, username = '') {
  if (isIpWhitelisted(ip)) {
    return { blocked: false, remaining: 99 };
  }

  const now = Date.now();
  let attempt = loginAttemptMap.get(ip);
  if (!attempt || (now - attempt.windowStart > 5 * 60 * 1000)) {
    attempt = { failedCount: 1, windowStart: now, usernames: new Set([username]) };
  } else {
    attempt.failedCount++;
    if (username) attempt.usernames.add(username);
  }
  loginAttemptMap.set(ip, attempt);

  // Check 1: Credential Stuffing / Password Spraying (Trying > 14 different usernames from same IP in short window)
  if (attempt.usernames.size >= 15) {
    console.warn(`[WAF Brute-Force] 🚨 Credential Stuffing / Password Spraying detected from IP ${ip}`);
    banIpImmediately(ip, 'ตรวจพบการสุ่มรหัสผ่านข้ามหลายบัญชี (Credential Stuffing / Hydra Attack)').catch(() => {});
    return { blocked: true, reason: 'CREDENTIAL_STUFFING', ban: true };
  }

  // Check 2: Brute Force threshold (>= 15 failed attempts on single IP)
  if (attempt.failedCount >= 15) {
    autoJailMap.set(ip, now + 5 * 60 * 1000); // 5 min jail
    console.warn(`[WAF Brute-Force] 🔒 IP ${ip} quarantined for 5 minutes due to 15+ failed logins`);
    return { blocked: true, reason: 'TOO_MANY_FAILED_LOGINS', jailMinutes: 5 };
  }

  return { blocked: false, remaining: 15 - attempt.failedCount };
}

function clearFailedLogin(ip) {
  loginAttemptMap.delete(ip);
}

function checkLoginLockout(ip) {
  const now = Date.now();
  const jailExpiry = autoJailMap.get(ip);
  if (jailExpiry && now < jailExpiry) {
    const remainingSec = Math.ceil((jailExpiry - now) / 1000);
    return { locked: true, remainingSec };
  }
  const attempt = loginAttemptMap.get(ip);
  if (attempt && attempt.failedCount >= 6 && (now - attempt.windowStart < 15 * 60 * 1000)) {
    return { locked: true, remainingSec: Math.ceil((15 * 60 * 1000 - (now - attempt.windowStart)) / 1000) };
  }
  return { locked: false };
}

module.exports = {
  wafSecurityMiddleware,
  recordFailedLogin,
  clearFailedLogin,
  checkLoginLockout,
  MALICIOUS_USER_AGENTS,
  HONEYPOT_PATHS,
  EXPLOIT_PATTERNS
};
