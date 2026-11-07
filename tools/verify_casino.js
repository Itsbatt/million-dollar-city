const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

async function testCasino() {
  console.log('[Casino Test] Launching clean Edge headless...');
  const tmpProfile = path.join(os.tmpdir(), 'edge_casino_' + Date.now());
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless',
    '--window-size=1920,1080',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--disable-cache',
    '--disk-cache-size=0',
    '--media-cache-size=0',
    `--user-data-dir=${tmpProfile}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise(r => ws.on('open', r));

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[BROWSER]: ${args}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error(`[BROWSER EXCEPTION]:`, JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('[Casino Test] Navigating to http://localhost:3000/ ...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });

  // Poll until window.game and city are fully initialized
  console.log('[Casino Test] Waiting for engine and world generation...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!(window.game && window.game.casinoInterior && window.game.player)',
      returnByValue: true
    });
    if (check.result?.value) {
      console.log(`[Casino Test] Game engine ready! (waited ${(i + 1) * 300}ms)`);
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  if (!ready) {
    console.error('[Casino Test] Game failed to initialize in time!');
    ws.close();
    proc.kill();
    return;
  }

  // Dismiss auth modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.game.authModal) {
        window.game.authModal.close();
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  // 1. Enter Casino Interior
  console.log('[Casino Test] Calling game.enterCasino()...');
  const enterInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.enterCasino();
      const p = window.game.player.getPosition();
      const c = window.game.cameraManager.camera.position;
      return {
        zone: window.game.currentZone,
        playerPos: { x: p.x, y: p.y, z: p.z },
        cameraPos: { x: c.x, y: c.y, z: c.z },
        animatedReels: window.game.casinoInterior.animatedReels.length,
        interactables: window.game.casinoInterior.interactables.map(i => ({ id: i.id, name: i.name, type: i.type, pos: i.position })),
        renderInfo: {
          calls: window.game.renderer.renderer.info.render.calls,
          triangles: window.game.renderer.renderer.info.render.triangles
        }
      };
    })()`,
    returnByValue: true
  });
  console.log('[Casino Test] Casino status:', JSON.stringify(enterInfo.result?.value, null, 2));

  // Render 30 frames inside casino
  await new Promise(r => setTimeout(r, 1500));

  console.log('[Casino Test] Capturing screenshot of Casino Grand Foyer...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\screenshot_casino_foyer.png', Buffer.from(shot1.data, 'base64'));

  // Walk forward into the center of the casino floor facing slot machine banks
  console.log('[Casino Test] Moving into main slot machine gaming hall...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.player.position.set(0, -119.15, -12);
      window.game.player.mesh.position.copy(window.game.player.position);
      window.game.cameraManager.yaw = Math.PI; // Face North towards slot banks
      window.game.cameraManager.snapToTarget(window.game.player);
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('[Casino Test] Capturing screenshot of Animated Slot Machines...');
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\screenshot_casino_slots.png', Buffer.from(shot2.data, 'base64'));

  // Move near roulette table and blackjack tables
  console.log('[Casino Test] Moving to Blackjack and Roulette tables...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.player.position.set(8, -119.15, 8);
      window.game.player.mesh.position.copy(window.game.player.position);
      window.game.cameraManager.yaw = Math.PI * 0.7;
      window.game.cameraManager.snapToTarget(window.game.player);
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('[Casino Test] Capturing screenshot of Tables with Dealers & Roulette...');
  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\screenshot_casino_tables.png', Buffer.from(shot3.data, 'base64'));

  console.log('[Casino Test] All screenshots captured successfully.');
  ws.close();
  proc.kill();
  try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch (e) {}
}

testCasino().catch(console.error);
