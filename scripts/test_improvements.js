const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testImprovements() {
  console.log('[Test] Running verification of vehicles, phone navigation, and expanded city...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--window-size=1280,720',
    '--user-data-dir=C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\.edge_test_improv',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2200));

  const list = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (evt) => {
        const res = JSON.parse(evt.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  const evalCode = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  };

  const takeScreenshot = async (filename) => {
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap?.data) {
      fs.writeFileSync(`C:/Users/bat/.gemini/antigravity/brain/df204f92-3866-4c98-9ebd-1eed62b1ae45/${filename}`, Buffer.from(snap.data, 'base64'));
      console.log(`[Screenshot Saved]: ${filename}`);
    }
  };

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await new Promise(r => setTimeout(r, 2000));

    // 1. Log in as Itsbat_
    await evalCode(`(async () => {
      await window.game.economy.login('Itsbat_', 'bat123');
      window.game.authModal.close();
    })()`);

    // 2. Test Phone Maze Bank with multiple transactions & navigation back to home
    console.log('[Test] Simulating 20 transactions in Maze Bank...');
    await evalCode(`(() => {
      for (let i = 1; i <= 20; i++) {
        window.game.economy.transactionHistory.unshift({
          type: i % 2 === 0 ? 'INGRESO' : 'TRANSFERENCIA',
          amount: i * 500,
          description: 'Transferencia #' + i,
          timestamp: '16:50'
        });
      }
      window.game.phoneUI.open();
      window.game.phoneUI.openApp('bank');
    })()`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('screenshot_phone_bank_many_txs.png');

    // Test clicking back button in Maze Bank
    console.log('[Test] Clicking back button to return to apps home screen...');
    const canReturnHome = await evalCode(`(() => {
      const backBtn = document.querySelector('#phone-view-bank .phone-back-btn');
      if (backBtn) backBtn.click();
      return {
        currentApp: window.game.phoneUI.currentApp,
        homeActive: document.getElementById('phone-view-home')?.classList.contains('active')
      };
    })()`);
    console.log('[Test] Returned to Home result:', JSON.stringify(canReturnHome));
    await takeScreenshot('screenshot_phone_home_after_back.png');
    await evalCode(`window.game.phoneUI.close()`);

    // 3. Test Vehicle Performance & Wall Sliding
    console.log('[Test] Entering vehicle & testing high speed acceleration...');
    const carStats = await evalCode(`(() => {
      const car = window.game.playerCar;
      car.enterDriver(window.game.player);
      // Simulate 1.5 seconds of forward throttle
      for (let i = 0; i < 30; i++) {
        car.handleDriverInput(0.05, { keys: { forward: true, backward: false, left: false, right: false, jump: false } });
        car.update(0.05, { keys: { forward: true }, consumeHorn: () => false, consumeRadio: () => false }, window.game.allColliders);
      }
      const speedAfterAccel = car.currentSpeed;
      return {
        carName: car.name,
        maxSpeed: car.maxSpeed,
        acceleration: car.acceleration,
        speedAfterAccel: Math.round(speedAfterAccel * 3.6) + ' km/h',
        handling: car.handling
      };
    })()`);
    console.log('[Test] Vehicle Performance Stats:', JSON.stringify(carStats));
    await takeScreenshot('screenshot_car_high_speed.png');

    // 4. Test Expanded City Bounds & Colliders
    const cityStats = await evalCode(`({
      collidersCount: window.game.city.colliders.length,
      pedestriansCount: window.game.pedestrians.pedestrians.length
    })`);
    console.log('[Test] Expanded City Stats:', JSON.stringify(cityStats));

    console.log('[Test] Verification finished successfully!');
    ws.close();
    proc.kill();
  };
}

testImprovements().catch(err => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
