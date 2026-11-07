const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testCompleteSuite() {
  console.log('[Test] Launching Edge headless instance...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--window-size=1280,720',
    '--user-data-dir=C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\.edge_suite_profile',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2200));

  const list = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = list.find(t => t.type === 'page');
  if (!page) throw new Error('No page found');

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
    console.log('[Test] WebSocket CDP connected');

    const errors = [];
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const txt = msg.params.args.map(a => a.value || a.description).join(' ');
        if (msg.params.type === 'error') {
          console.error('[BROWSER ERROR]', txt);
          errors.push(txt);
        } else {
          console.log('[BROWSER LOG]', txt);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
        errors.push(msg.params.exceptionDetails?.text || 'Exception');
      }
    });

    await send('Runtime.enable');
    await send('Page.enable');

    await new Promise(r => setTimeout(r, 2000));

    // 1. Log in as Itsbat_ using economy.login
    console.log('[Test] Logging in as Itsbat_...');
    const loginRes = await evalCode(`(async () => {
      try {
        const res = await window.game.economy.login('Itsbat_', 'bat123');
        window.game.authModal.close();
        return { success: true, username: res.username, is_admin: res.is_admin, cash: res.player.cash, bank: res.player.bank };
      } catch(e) {
        return { success: false, error: e.message };
      }
    })()`);
    console.log('[Test] Login Result:', JSON.stringify(loginRes));

    await new Promise(r => setTimeout(r, 600));

    // 2. Verify Admin Panel & Pill
    const adminCheck = await evalCode(`({
      isAdmin: window.game.economy.isAdmin,
      pillDisplay: document.getElementById('hud-admin-pill')?.style.display,
      currentZone: window.game.currentZone
    })`);
    console.log('[Test] Admin Status:', JSON.stringify(adminCheck));

    // Open Admin Panel
    await evalCode(`window.game.adminModal.open()`);
    await new Promise(r => setTimeout(r, 800));
    await takeScreenshot('screenshot_admin_panel.png');
    await evalCode(`window.game.adminModal.close()`);

    // 3. Teleport to Casino Interior
    console.log('[Test] Teleporting into Casino Interior...');
    await evalCode(`window.game.enterCasino()`);
    // Walk forward into the casino aisle to see the Mega Wheel of Fortune
    await evalCode(`(() => {
      window.game.player.position.set(0, -119.15, 20.0);
      window.game.player.mesh.position.copy(window.game.player.position);
      window.game.cameraManager.yaw = Math.PI; // Face the wheel
      window.game.cameraManager.pitch = 0.18;
      window.game.cameraManager.snapToTarget(window.game.player);
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    const casinoState = await evalCode(`({
      currentZone: window.game.currentZone,
      interactablesCount: window.game.casinoInterior.interactables.length,
      hasWheel: !!window.game.casinoInterior.wheelOfFortuneDisc,
      hasAnimatedReels: window.game.casinoInterior.animatedReels.length,
      playerPos: window.game.player.getPosition()
    })`);
    console.log('[Test] Casino State:', JSON.stringify(casinoState));
    await takeScreenshot('screenshot_casino_mega_wheel.png');

    // 4. Test Weapon Aiming (ADS) & Sniper Rifle
    console.log('[Test] Equipping Sniper Rifle and aiming ADS...');
    await evalCode(`(() => {
      window.game.weapons.equip('sniper');
      window.game.inputManager.mouse.isRightDown = true;
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    const adsCheck = await evalCode(`({
      isAiming: window.game.player.isAiming,
      cameraFov: window.game.cameraManager.camera.fov,
      scopeVisible: document.getElementById('sniper-scope')?.classList.contains('visible'),
      crosshairAiming: document.getElementById('crosshair')?.classList.contains('aiming')
    })`);
    console.log('[Test] ADS Aiming State:', JSON.stringify(adsCheck));
    await takeScreenshot('screenshot_sniper_ads.png');

    // 5. Test shooting weapon with hitmarker
    console.log('[Test] Testing gunshot and hitmarker...');
    await evalCode(`(() => {
      const dummyTarget = {
        getPosition: () => ({ x: 0, y: -120, z: 25 }),
        takeDamage: (amt) => { console.log('Target took damage: ' + amt); }
      };
      window.game.weapons.shoot([dummyTarget], true, window.game.cameraManager);
    })()`);
    await new Promise(r => setTimeout(r, 500));

    console.log('[Test] All tests executed successfully! Errors encountered:', errors.length);

    ws.close();
    proc.kill();
  };
}

testCompleteSuite().catch(err => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
