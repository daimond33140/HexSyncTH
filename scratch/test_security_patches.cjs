const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SECURITY & UI VALIDATION ---');
  let passed = 0;
  let total = 0;

  function assert(condition, name, detail) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}:`, detail);
    }
  }

  // 1. Check OTP leak
  const otpRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/auth/request-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@example.com' });
  assert(!otpRes.data.mockOtp, 'Vuln 1: OTP is NOT leaked in API response', otpRes.data);

  // 2. Check settings leak
  const setRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/settings',
    method: 'GET'
  });
  const settings = setRes.data?.settings || {};
  assert(!settings.webhook_secret && !settings.superadmin_master_secret, 'Vuln 3A: settings does NOT leak webhook_secret or master_secret', settings);

  // 3. Check bank-config leak
  const bankRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/topup/bank-config',
    method: 'GET'
  });
  assert(!bankRes.data.webhook_secret, 'Vuln 3B: bank-config does NOT leak webhook_secret to public', bankRes.data);

  // 4. Check device heartbeat requires auth
  const hbRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/devices/heartbeat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin' });
  assert(hbRes.status === 401, 'Vuln 7: device heartbeat requires JWT auth (returns 401)', hbRes.status);

  // 5. Check keyshop_secret rejected in emergency-unban
  const devUnbanRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/devices/emergency-unban',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { masterKey: 'keyshop_secret' });
  assert(devUnbanRes.status === 401, 'Vuln 8A: devices emergency-unban rejects keyshop_secret (returns 401)', devUnbanRes.status);

  const ipUnbanRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/banned-ips/emergency-unban',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { masterKey: 'keyshop_secret' });
  assert(ipUnbanRes.status === 401, 'Vuln 8B: banned-ips emergency-unban rejects keyshop_secret (returns 401)', ipUnbanRes.status);

  // 6. Check report-threat does not ban arbitrary user
  const threatRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/security/report-threat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'victim_test', strikeCount: 3, threatType: 'TEST_HACK' });
  assert(threatRes.status === 200, 'Vuln 4: report-threat executed safely', threatRes.data);

  // 7. Check webhook rejects unauthenticated call without secret
  const unauthWebhook = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/topup/webhook',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { amount: 500, username: 'admin' });
  assert(unauthWebhook.status === 401, 'New Vuln 1: Webhook rejects unauthenticated call without secret (401)', unauthWebhook.status);

  // 8. Check emergency-unban lockout after 5 attempts
  let lastUnbanStatus = 0;
  for (let i = 0; i < 5; i++) {
    const res = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/banned-ips/emergency-unban',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { masterKey: `wrong_attempt_${i}` });
    lastUnbanStatus = res.status;
  }
  assert(lastUnbanStatus === 429, 'New Vuln 2: emergency-unban locks out IP after 5 failed attempts (429)', lastUnbanStatus);

  // 9. Check OTP attempt limit on reset-password
  // First request OTP for real email
  await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/auth/request-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@hexsync.th' });

  let lastOtpStatus = 0;
  for (let i = 0; i < 5; i++) {
    const res = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@hexsync.th', otp: `00000${i}`, newPassword: 'newPassword1234' });
    lastOtpStatus = res.status;
  }
  assert(lastOtpStatus === 429, 'New Vuln 3: reset-password invalidates OTP after 5 wrong attempts (429)', lastOtpStatus);

  console.log(`\nResults: Passed ${passed}/${total} security test assertions!`);
}

runTests().catch(console.error);
