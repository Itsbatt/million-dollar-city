const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testPersistence() {
  const tempDir = path.join(os.tmpdir(), 'brave_persist_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9231',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9231/json', (res) => {
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
      if (txt.includes('[SaveSystem]') || txt.includes('[Missions]') || txt.includes('[Economy]')) {
        console.log('PAGE LOG:', txt);
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('Step 1: Navigating to game...');
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

  console.log('Step 2: Modifying position, money, and mission progress...');
  const setupResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'Game not found' };

      // Set custom position in Sunset Strip: X: -8.5, Z: -25.0
      g.player.position.set(-8.5, 0.8, -25.0);
      g.player.mesh.position.copy(g.player.position);
      g.player.heading = 3.14;
      g.player.mesh.rotation.y = 3.14;

      // Set Mission 1 at Step 1 ("Entra al Casino y realiza tu primera apuesta")
      g.missions.setSavedProgress(0, 1);

      // Modify cash
      g.economy.modifyCash(25000, 'Test de Persistencia');

      // Force save
      g.saveCurrentState();

      return {
        savedPos: g.player.getPosition(),
        savedMission: g.missions.currentMissionIndex,
        savedStep: g.missions.currentStep,
        savedCash: g.economy.cash,
        localStorageData: localStorage.getItem('mdc_saved_state')
      };
    })()`,
    returnByValue: true
  });

  console.log('Setup Result before reload:', JSON.stringify(setupResult.result?.value, null, 2));

  // Wait 1.5 seconds for backend SQLite write
  await new Promise(r => setTimeout(r, 1500));

  console.log('Step 3: Simulating page reload (F5 / browser restart)...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss lobby on reloaded page
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

  console.log('Step 4: Checking restored state after reload...');
  const verifyResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'Game not found after reload' };

      const pPos = g.player.getPosition();
      const curMission = g.missions.currentMissionIndex;
      const curStep = g.missions.currentStep;
      const cash = g.economy.cash;
      const activeTitle = g.missions.activeMission?.title;
      const objectiveText = g.missions.activeMission?.steps[curStep]?.text;

      // Position should be restored near (-8.5, -25.0)
      const distToExpected = Math.hypot(pPos.x - (-8.5), pPos.z - (-25.0));
      const posRestored = distToExpected < 2.0;

      // Mission should be Mission 1 (index 0) at Step 1
      const missionRestored = curMission === 0 && curStep === 1;

      // Cash should be >= 25000
      const cashRestored = cash >= 25000;

      return {
        restoredPosition: { x: pPos.x, y: pPos.y, z: pPos.z },
        distToExpected,
        posRestored,
        curMission,
        curStep,
        activeTitle,
        objectiveText,
        missionRestored,
        cash,
        cashRestored,
        allPassed: posRestored && missionRestored && cashRestored
      };
    })()`,
    returnByValue: true
  });

  console.log('=== PERSISTENCE TEST RESULT ===');
  console.log(JSON.stringify(verifyResult.result?.value, null, 2));

  ws.close();
  proc.kill();
}

testPersistence().catch(console.error);
