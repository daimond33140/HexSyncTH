// server/test_amount_enforce.js
const { User, SlipTransaction } = require('./models');

async function testAmountEnforcement() {
  console.log('=== TESTING STRICT AMOUNT ENFORCEMENT ===');

  const [testUser] = await User.findOrCreate({
    where: { username: 'scamtestuser' },
    defaults: { email: 'scamtest@example.com', passwordHash: 'hash', creditBalance: 10 }
  });

  const testRef = 'TESTREF_' + Date.now();
  // BOT Mini QR for 1.00 baht or Tag 54 = 1.00 baht
  // Tag 54 = 1.00
  const qrWith1Baht = `00380006000001010300602${testRef.length}${testRef}54041.005802TH`;

  const fakeBase64 = 'data:image/png;base64,' + Buffer.from('TEST_SLIP_AMT_' + Date.now()).toString('base64');

  // Case 1: User tries to cheat by requesting 1000 baht with 1 baht slip
  console.log('\n[Case 1] Submitting requestedAmount = 1000 with 1.00 THB slip...');
  const res1 = await fetch('http://localhost:4000/api/topup/bank-slip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'scamtestuser',
      amount: 1000,
      slipImage: fakeBase64,
      clientQrData: qrWith1Baht
    })
  });

  const data1 = await res1.json();
  console.log('Status 1:', res1.status, data1);
  if (res1.status === 400 && data1.message.includes('ยอดเงินไม่ตรง')) {
    console.log('✅ PASS: Cheating attempt was successfully BLOCKED! Message:', data1.message);
  } else {
    console.error('❌ FAIL: Cheating attempt was not blocked properly!');
    process.exit(1);
  }

  // Reload user to verify balance is STILL 10 (not 1000!)
  await testUser.reload();
  console.log('User balance after blocked attempt:', testUser.creditBalance, '(Must be 10)');
  if (testUser.creditBalance !== 10) {
    console.error('❌ FAIL: User balance changed when it was supposed to be blocked!');
    process.exit(1);
  }

  // Case 2: User submits matching amount = 1 baht
  console.log('\n[Case 2] Submitting requestedAmount = 1 with 1.00 THB slip...');
  const res2 = await fetch('http://localhost:4000/api/topup/bank-slip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'scamtestuser',
      amount: 1,
      slipImage: fakeBase64,
      clientQrData: qrWith1Baht
    })
  });

  const data2 = await res2.json();
  console.log('Status 2:', res2.status, data2);
  if (res2.status === 200) {
    console.log('✅ PASS: Legitimate 1 baht transfer was approved!');
  } else {
    console.error('❌ FAIL: Legitimate 1 baht was not approved!');
    process.exit(1);
  }

  await testUser.reload();
  console.log('User balance after 1 baht topup:', testUser.creditBalance, '(Must be 11)');
  if (testUser.creditBalance !== 11) {
    console.error('❌ FAIL: User balance should be 11!');
    process.exit(1);
  }

  // Cleanup
  await SlipTransaction.destroy({ where: { transRef: testRef } });
  await User.destroy({ where: { username: 'scamtestuser' } });
  console.log('=== ALL AMOUNT ENFORCEMENT TESTS PASSED ===');
  process.exit(0);
}

testAmountEnforcement().catch(err => {
  console.error(err);
  process.exit(1);
});
