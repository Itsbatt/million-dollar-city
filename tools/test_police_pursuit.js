const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testPolicePursuit() {
  const tempDir = path.join(os.tmpdir(), 'brave_police_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9230/json', (res) => {
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
      const txt = msg.params.args.map(a => a.value || a.description).join(' ');
      if (txt.includes('[TestPolice]') || txt.includes('[Police]')) {
        console.log('PAGE LOG:', txt);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('EXCEPTION:', msg.params.exceptionDetails);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('Navigating to http://localhost:3000...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss lobby
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('lan-play-solo-btn')?.click();
      const guestBtn = document.querySelector('.btn-guest');
      if (guestBtn) guestBtn.click();
      if (window.game && window.game.authModal) window.game.authModal.close();
      if (window.game && window.game.lobbyUI) window.game.lobbyUI.close();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Test police pursuit AI
  const testResults = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g || !g.police) return { error: 'PoliceManager not found' };

      const logs = [];
      function log(m) {
        logs.push(m);
        console.log('[TestPolice]', m);
      }

      function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
      }

      // Step 1: Trigger 2 Stars Crime
      log('Triggering 2 Stars Crime...');
      g.police.addCrime(2);
      await sleep(500);

      const initialCount = g.police.policeUnits.length;
      log('Police cruisers spawned: ' + initialCount);
      if (initialCount === 0) throw new Error('No police cruisers spawned!');

      const cruiser1 = g.police.policeUnits[0];
      const startPos = cruiser1.getPosition().clone();
      log('Cruiser 1 starting pos: ' + JSON.stringify(startPos));

      // Player starts at (0, 0.8, 28)
      // Step 2: Let police pursue player for 1.5 seconds
      await sleep(1500);

      const midPos = cruiser1.getPosition().clone();
      const pPos = g.player.getPosition();
      const distToPlayer1 = cruiser1.getPosition().distanceTo(pPos);
      log('Cruiser 1 pos after 1.5s: ' + JSON.stringify(midPos) + ', dist to player: ' + distToPlayer1.toFixed(1));

      // Step 3: Player teleports / turns 180 degrees behind the police cruiser!
      log('Player moves 30m BEHIND the police cruiser to test U-turn and turning ability...');
      // Position player behind cruiser:
      const behindX = cruiser1.position.x - Math.sin(cruiser1.mesh.rotation.y) * 25;
      const behindZ = cruiser1.position.z - Math.cos(cruiser1.mesh.rotation.y) * 25;
      g.player.position.set(behindX, 0.8, behindZ);
      g.player.mesh.position.copy(g.player.position);

      const angleBefore = cruiser1.mesh.rotation.y;
      log('Cruiser rotation before turn: ' + angleBefore.toFixed(2));

      // Step 4: Run physics for 2 seconds to see if cruiser detects player behind and turns around
      await sleep(2200);

      const angleAfter = cruiser1.mesh.rotation.y;
      const finalDist = cruiser1.getPosition().distanceTo(g.player.getPosition());
      log('Cruiser rotation after turn: ' + angleAfter.toFixed(2));
      log('Cruiser distance to player: ' + finalDist.toFixed(1));

      // Check if angle changed significantly (turned around)
      let diff = Math.abs(angleAfter - angleBefore);
      while (diff > Math.PI * 2) diff -= Math.PI * 2;
      log('Cruiser angular rotation magnitude: ' + diff.toFixed(2) + ' rad');

      const turnedAround = diff > 0.8 || finalDist < 25;
      log('Turned around successfully toward player? ' + turnedAround);

      // Check max distance across all active units (none should be > 90m)
      const allDistances = g.police.policeUnits.map(u => u.getPosition().distanceTo(g.player.getPosition()));
      log('All cruiser distances to player: ' + JSON.stringify(allDistances));
      const anyWentToInfinity = allDistances.some(d => d > 90);

      // Position camera for screenshot
      g.cameraManager.camera.position.set(cruiser1.position.x - 8, cruiser1.position.y + 5, cruiser1.position.z - 12);
      g.cameraManager.camera.lookAt(cruiser1.position.x, cruiser1.position.y + 1, cruiser1.position.z);

      return {
        success: true,
        initialCount,
        turnedAround,
        anyWentToInfinity,
        distances: allDistances,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== POLICE TEST RESULT ===');
  console.log(JSON.stringify(testResults, null, 2));

  // Capture screenshot
  await new Promise(r => setTimeout(r, 600));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_police_turn.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved police screenshot to', outPath);

  ws.close();
  proc.kill();
}

testPolicePursuit().catch(console.error);
