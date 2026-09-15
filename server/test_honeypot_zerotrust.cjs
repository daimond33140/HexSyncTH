// scratch/test_honeypot_zerotrust.cjs
const http = require('http');
const jwt = require('jsonwebtoken');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🛡️ TESTING AUTO TRAP & ZERO-TRUST DATABASE CHECK');
  console.log('====================================================\n');

  const randSuffix = Math.floor(Math.random() * 200) + 10;
  const testIp1 = `203.0.113.${randSuffix}`;
  const testDev1 = `HACKER-DEVICE-${randSuffix}`;
  const testIp2 = `198.51.100.${randSuffix + 1}`;
  const testDev2 = `HACKER-DEVICE-${randSuffix + 1}`;
  const testIp3 = `198.51.100.${randSuffix + 2}`;
  const testDev3 = `MEMBER-DEVICE-${randSuffix + 2}`;
  const testIp4 = `198.51.100.${randSuffix + 3}`;
  const testDev4 = `TAMPERED-DEVICE-${randSuffix + 3}`;

  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
    }
  }

  // 1. Attack 1: Direct probe without token
  console.log('--- TEST 1: Unauthenticated outsider hits /api/users/1/adjust-balance ---');
  const res1 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/users/1/adjust-balance',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp1,
      'X-Device-Id': testDev1,
      'User-Agent': 'HackerTool/1.0',
    },
  }, { amount: 999999 });

  assert('Status is 403 Forbidden', res1.status === 403);
  assert('Trap error returned', res1.body.error === 'SECURITY_TRAP_TRIGGERED');
  assert('Banned flag is true', res1.body.banned === true);
  assert('10-year ban date returned', !!res1.body.bannedUntil);

  // Verify IP was actually banned on the next request from that IP
  const followUp1 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/categories',
    method: 'GET',
    headers: {
      'X-Forwarded-For': testIp1,
    },
  });
  assert('Follow-up request from banned IP is immediately blocked with 403 banType ip', followUp1.status === 403 && followUp1.body.banType === 'ip' && followUp1.body.banned === true);

  // Verify Device was also banned
  const followUpDevice = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/categories',
    method: 'GET',
    headers: {
      'X-Forwarded-For': `192.0.2.${randSuffix}`, // different IP
      'X-Device-Id': testDev1,
    },
  });
  assert('Follow-up request from banned Device is immediately blocked with 403 banType device', followUpDevice.status === 403 && followUpDevice.body.banType === 'device' && followUpDevice.body.banned === true);

  // 2. Attack 2: Attacker with forged token (fake secret)
  console.log('\n--- TEST 2: Attacker presents forged token signed with fake secret ---');
  const fakeToken = jwt.sign({ id: 1, role: 'admin', username: 'admin' }, 'FAKE_SECRET_ATTACKER_KEY', { expiresIn: '1d' });
  const res2 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${fakeToken}`,
      'X-Forwarded-For': testIp2,
      'X-Device-Id': testDev2,
    },
  });
  assert('Status is 403 Forbidden for forged token', res2.status === 403);
  assert('Trap triggered for forged token', res2.body.error === 'SECURITY_TRAP_TRIGGERED');
  assert('IP is banned', res2.body.banned === true);

  // 3. Attack 3: Normal member trying to access admin endpoint
  console.log('\n--- TEST 3: Authenticated normal member attempts admin endpoint ---');
  // First login or get token for member
  // Let's create a valid token signed with real server secret for a member account
  const { User } = require('./models');
  let member = await User.findOne({ where: { role: 'member' } });
  if (!member) {
    member = await User.create({
      username: 'test_member_honeypot',
      email: 'test_member_honeypot@hexsync.th',
      password: 'hashedpassword123',
      role: 'member',
      balance: 100,
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'keyshop_secret';
  const memberToken = jwt.sign({ id: member.id, role: 'member', username: member.username }, jwtSecret, { expiresIn: '1d' });

  const res3 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/users/1/adjust-balance',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${memberToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp3,
      'X-Device-Id': testDev3,
    },
  }, { amount: 50000 });

  assert('Status is 403 Forbidden for member probing admin route', res3.status === 403);
  assert('Trap triggered for unauthorized member', res3.body.error === 'SECURITY_TRAP_TRIGGERED');
  assert('Reason explains role mismatch', res3.body.reason.includes('role: member'));

  // 4. Attack 4: Privilege Escalation Attempt (Token claims 'admin', but DB says 'member')
  console.log('\n--- TEST 4: Zero-Trust Active DB Check detects Tampered Token (JWT says admin, DB says member) ---');
  const tamperedToken = jwt.sign({ id: member.id, role: 'admin', username: member.username }, jwtSecret, { expiresIn: '1d' });

  const res4 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tamperedToken}`,
      'X-Forwarded-For': testIp4,
      'X-Device-Id': testDev4,
    },
  });

  assert('Status is 403 Forbidden on tampered role token', res4.status === 403);
  assert('Zero-Trust Active DB catches it via User.findByPk', res4.body.error === 'SECURITY_TRAP_TRIGGERED');

  // 5. Legitimate Admin Path
  console.log('\n--- TEST 5: Legitimate Admin accesses admin endpoint ---');
  let admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) {
    admin = await User.findOne({ where: { role: 'superadmin' } });
  }

  const adminToken = jwt.sign({ id: admin.id, role: admin.role, username: admin.username }, jwtSecret, { expiresIn: '1d' });
  const res5 = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'X-Forwarded-For': '127.0.0.1', // Whitelisted local
    },
  });

  assert('Legitimate admin gets 200 OK', res5.status === 200);
  assert('User list returned successfully', Array.isArray(res5.body.users || res5.body));

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
