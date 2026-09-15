const http = require('http');
const jwt = require('../server/node_modules/jsonwebtoken');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path,
      method: 'POST',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testFlow() {
  const secret = 'd35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c';
  const token = jwt.sign({ id: 1, username: 'admin', role: 'superadmin' }, secret, { expiresIn: '1h' });
  console.log('1. Testing create QR order with token...');
  const res = await post('/api/topup/create-qr-order', { amount: 50, username: 'admin' }, token);
  const orderId = res.data.order?.orderId;
  console.log('Order created:', res.status, orderId, res.data.order?.qrPayload ? 'Has QR Payload' : 'No QR');

  if (orderId) {
    console.log('2. Testing confirm-qr-payment (without bank webhook)...');
    const conf = await post('/api/topup/confirm-qr-payment', { orderId, username: 'admin' }, token);
    console.log('Confirm response status:', conf.status, 'Message:', conf.data.message);
  }

  console.log('3. Testing unverified bank slip upload (should route to pending)...');
  const fakeSlipImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const slipRes = await post('/api/topup/bank-slip', {
    username: 'admin',
    amount: 100,
    slipImage: fakeSlipImage,
    clientQrData: null
  }, token);
  console.log('Slip response status:', slipRes.status, 'Pending:', slipRes.data.pending, 'Message:', slipRes.data.message);
}

testFlow().catch(console.error);
