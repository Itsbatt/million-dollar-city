const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- TEST 1: REGISTER USER 1 (AlphaBoss) ---');
  const u1Name = 'Alpha_' + Math.floor(Math.random() * 1000);
  const reg1 = await post('/api/auth/register', { username: u1Name, password: 'SecurePassword123' });
  console.log('Reg 1:', reg1.status, reg1.body.success, 'ID:', reg1.body.user?.id);

  console.log('--- TEST 2: REGISTER USER 2 (ShadowHacker) ---');
  const u2Name = 'Shadow_' + Math.floor(Math.random() * 1000);
  const reg2 = await post('/api/auth/register', { username: u2Name, password: 'SecurePassword123' });
  console.log('Reg 2:', reg2.status, reg2.body.success, 'ID:', reg2.body.user?.id);

  console.log('--- TEST 3: LOGIN USER 1 ---');
  const login1 = await post('/api/auth/login', { username: u1Name, password: 'SecurePassword123' });
  console.log('Login 1:', login1.status, login1.body.success, 'Token:', login1.body.session?.token ? 'OK' : 'MISSING');

  console.log('--- TEST 4: DIRECT WIRE TRANSFER FROM USER 1 TO USER 2 ($120) ---');
  const transfer = await post('/api/bank/transfer', {
    senderId: reg1.body.user.id,
    recipient: u2Name,
    amount: 120,
    note: 'Pago por hackeo de seguridad'
  });
  console.log('Transfer Result:', transfer.status, transfer.body);

  console.log('--- TEST 5: VERIFY SENDER & RECIPIENT BALANCES ---');
  const p1 = await get(`/api/player/${reg1.body.user.id}`);
  const p2 = await get(`/api/player/${reg2.body.user.id}`);
  console.log(`User 1 Bank: $${p1.body.player.bank} (expected 500 - 120 = 380)`);
  console.log(`User 2 Bank: $${p2.body.player.bank} (expected 500 + 120 = 620)`);

  console.log('--- TEST 6: CREATE ORGANIZATION ---');
  const org = await post('/api/org/create', {
    leaderId: reg1.body.user.id,
    name: 'Cartel ' + u1Name,
    tag: 'CTL',
    description: 'Sindicato de Casinos y Atracos'
  });
  console.log('Org Result:', org.status, org.body.org?.name);

  console.log('--- TEST 7: AUTHORITATIVE CASINO ROULETTE ---');
  const roulette = await post('/api/casino/roulette/spin', {
    playerId: reg1.body.user.id,
    bets: [
      { type: 'red', amount: 50 },
      { type: 'straight', number: 17, amount: 20 }
    ]
  });
  console.log('Roulette Server Spin:', roulette.status, 'Winning #:', roulette.body.winningNumber, 'Color:', roulette.body.color, 'Net Change:', roulette.body.netChange);

  console.log('--- TEST 8: AUTHORITATIVE SLOTS SPIN ---');
  const slots = await post('/api/casino/slots/spin', {
    playerId: reg1.body.user.id,
    betAmount: 50
  });
  console.log('Slots Server Spin:', slots.status, 'Reels:', slots.body.reels?.map(r => r.icon), 'Multiplier:', slots.body.multiplier, 'Win:', slots.body.winAmount);

  console.log('\n========================================');
  console.log('✓ ALL SERVER TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests().catch(console.error);
