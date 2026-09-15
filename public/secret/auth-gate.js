// HexSyncTH Cyber Security Auth Gate
// Integrates with Main Website Database (SQLite via /api/auth)

(function () {
  const TOKEN_KEY = 'hexsync_token';
  const USER_KEY = 'hexsync_user';

  // Helper to get elements
  const el = (id) => document.getElementById(id);

  // Initialize Auth Gate on page load
  window.addEventListener('DOMContentLoaded', initAuthGate);

  async function initAuthGate() {
    renderAuthModalIfMissing();
    attachAuthEventListeners();
    await verifyCurrentSession();
  }

  // 1. Verify if user is already logged in (Token in localStorage or Cookie)
  async function verifyCurrentSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const overlay = el('auth-gate-overlay');
    const content = el('portal-content') || document.body;

    if (!token) {
      lockPortal();
      return;
    }

    try {
      const res = await fetch('/api/auth/check-status', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      const data = await res.json();

      if (data && data.loggedIn && data.user) {
        // Valid session
        if (data.isBanned || data.user.isBanned) {
          showAuthAlert('บัญชีนี้ถูกระงับการใช้งานในระบบหลัก', 'error');
          lockPortal();
          return;
        }

        // Save active user info
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        unlockPortal(data.user);
      } else {
        // Invalid or expired token
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        lockPortal();
      }
    } catch (err) {
      console.warn('[AuthGate] Check status connection fallback:', err.message);
      // If server temporarily unreachable but token exists in storage, check cached user
      const cached = localStorage.getItem(USER_KEY);
      if (cached) {
        try {
          const u = JSON.parse(cached);
          unlockPortal(u);
          return;
        } catch (_) {}
      }
      lockPortal();
    }
  }

  // 2. Lock / Unlock helpers
  function lockPortal() {
    const overlay = el('auth-gate-overlay');
    const content = el('portal-content');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
    if (content) {
      content.classList.add('portal-locked');
    }
  }

  function unlockPortal(user) {
    const overlay = el('auth-gate-overlay');
    const content = el('portal-content');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => {
        if (overlay.classList.contains('hidden')) overlay.style.display = 'none';
      }, 400);
    }
    if (content) {
      content.classList.remove('portal-locked');
    }

    // Update Top Session Bar
    updateUserSessionBar(user);
  }

  // 3. Handle Login Submit
  async function handleLoginSubmit(e) {
    if (e) e.preventDefault();

    const usernameInput = el('auth-username');
    const passwordInput = el('auth-password');
    const submitBtn = el('auth-submit-btn');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      showAuthAlert('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน', 'error');
      return;
    }

    // Set Loading State
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⚡ กำลังตรวจสอบฐานข้อมูล...</span>';
    }
    hideAuthAlert();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        showAuthAlert(errorMsg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>🚀 ยืนยันการเข้าสู่ระบบ (ACCESS PORTAL)</span>';
        }
        return;
      }

      // Login Successful
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      showAuthAlert(`✓ ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับ ${data.user?.username || ''}`, 'success');

      if (submitBtn) {
        submitBtn.innerHTML = '<span>✓ เข้าสู่ระบบสำเร็จ</span>';
      }

      setTimeout(() => {
        unlockPortal(data.user || { username, role: 'member' });
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>🚀 ยืนยันการเข้าสู่ระบบ (ACCESS PORTAL)</span>';
        }
      }, 700);

    } catch (err) {
      console.error('[AuthGate] Login error:', err);
      showAuthAlert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀 ยืนยันการเข้าสู่ระบบ (ACCESS PORTAL)</span>';
      }
    }
  }

  // 4. Handle Logout
  window.handleAuthLogout = function () {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      const usernameInput = el('auth-username');
      const passwordInput = el('auth-password');
      if (usernameInput) usernameInput.value = '';
      if (passwordInput) passwordInput.value = '';
      hideAuthAlert();
      lockPortal();
    }
  };

  // 5. Update Session Bar
  function updateUserSessionBar(user) {
    const userDisplay = el('auth-user-display');
    const roleDisplay = el('auth-role-display');
    if (userDisplay && user) {
      userDisplay.textContent = user.username || 'User';
    }
    if (roleDisplay && user) {
      const role = (user.role || 'member').toLowerCase();
      roleDisplay.textContent = role.toUpperCase();
      roleDisplay.className = 'auth-role-tag ' + role;
    }
  }

  function showAuthAlert(msg, type) {
    const alertBox = el('auth-alert-msg');
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'auth-alert ' + type;
    alertBox.style.display = 'block';
  }

  function hideAuthAlert() {
    const alertBox = el('auth-alert-msg');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'auth-alert';
    }
  }

  function attachAuthEventListeners() {
    const form = el('auth-login-form');
    if (form) {
      form.addEventListener('submit', handleLoginSubmit);
    }

    const togglePwd = el('auth-toggle-pwd-btn');
    const pwdInput = el('auth-password');
    if (togglePwd && pwdInput) {
      togglePwd.addEventListener('click', () => {
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
          togglePwd.textContent = '👁️‍🗨️';
        } else {
          pwdInput.type = 'password';
          togglePwd.textContent = '👁️';
        }
      });
    }
  }

  // 6. Inject Auth Modal HTML if not present in markup
  function renderAuthModalIfMissing() {
    if (el('auth-gate-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-gate-overlay';
    overlay.innerHTML = `
      <div class="auth-grid-bg"></div>
      <div class="auth-card">
        <div class="auth-shield-icon">🛡️</div>
        <div class="auth-badge">DATABASE AUTHENTICATION REQUIRED</div>
        <h2 class="auth-title">HEXSYNC SECURITY GATEWAY</h2>
        <p class="auth-subtitle">ระบบจำเป็นต้องยืนยันตัวตนเพื่อเข้าถึง DFD Portal & AI Studio</p>

        <div class="auth-db-note">
          <span>🔒 <strong>ใช้รหัสผ่านเดียวกับเว็บหลัก:</strong> บัญชีจากฐานข้อมูล HexSyncTH</span>
        </div>

        <form id="auth-login-form" class="auth-form" autocomplete="off">
          <div class="auth-field">
            <label class="auth-label" for="auth-username">
              <span>👤</span> ชื่อผู้ใช้ หรือ อีเมล (Username / Email)
            </label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">👤</span>
              <input type="text" id="auth-username" class="auth-input" placeholder="กรอก Username หรือ Email ในเว็บ" required autocomplete="username" />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="auth-password">
              <span>🔑</span> รหัสผ่าน (Password)
            </label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">🔒</span>
              <input type="password" id="auth-password" class="auth-input" placeholder="กรอกรหัสผ่านของคุณ" required autocomplete="current-password" />
              <button type="button" id="auth-toggle-pwd-btn" class="auth-toggle-pwd" title="แสดง/ซ่อนรหัสผ่าน">👁️</button>
            </div>
          </div>

          <button type="submit" id="auth-submit-btn" class="auth-btn-submit">
            <span>🚀 ยืนยันการเข้าสู่ระบบ (ACCESS PORTAL)</span>
          </button>
        </form>

        <div id="auth-alert-msg" class="auth-alert"></div>

        <div class="auth-footer-status">
          <span class="dot"></span>
          <span>HexSyncTH Database Online (SQLite Verified)</span>
        </div>
      </div>
    `;

    document.body.prepend(overlay);
  }
})();
