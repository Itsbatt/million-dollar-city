const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testAllMissions() {
  const tempDir = path.join(os.tmpdir(), 'brave_missions_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9229/json', (res) => {
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

  const exceptions = [];
  const inPageLogs = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const txt = msg.params.args.map(a => a.value || a.description).join(' ');
      inPageLogs.push(txt);
      if (txt.includes('[TestMissions]') || txt.includes('[Missions]')) {
        console.log('PAGE LOG:', txt);
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('Navigating to http://localhost:3000...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss lobby and ensure in-game
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

  // Run test for each mission sequentially
  const missionResults = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      const mm = g?.missions || g?.missionManager;
      if (!g || !mm) return { error: 'Game or missions not found' };

      const logs = [];

      function log(m) {
        logs.push(m);
        console.log('[TestMissions]', m);
      }

      function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
      }

      // -------------------------------------------------------------
      // MISSION 1: Bautismo en el Diamond Strip
      // -------------------------------------------------------------
      log('--- Testing Mission 1: ' + mm.activeMission.title + ' ---');
      if (mm.currentMissionIndex !== 0) {
        mm.startMission(0);
        await sleep(100);
      }
      log('Mission 1 Step 0 Text: ' + mm.activeMission.steps[0].text);

      // Advance Step 0 by reaching targetPos { x: -19, z: 35 }
      g.player.position.set(-19, 0.8, 35);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), g.police.getWantedLevel());
      await sleep(200);

      log('Mission 1 Step after moving to Casino: ' + mm.currentStep + ' (' + mm.activeMission.steps[mm.currentStep].text + ')');
      if (mm.currentStep !== 1) throw new Error('Mission 1 step 0 failed to advance');

      // Advance Step 1 by placing a casino bet
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
      await sleep(300);
      log('Mission 1 completed! Current cash: ' + g.economy.cash);

      // Wait 4.2s for transition to Mission 2
      await sleep(4200);

      // -------------------------------------------------------------
      // MISSION 2: Embargo de Alta Gama (Z: -90 Garage)
      // -------------------------------------------------------------
      log('--- Testing Mission 2: ' + mm.activeMission.title + ' ---');
      if (mm.currentMissionIndex !== 1) throw new Error('Did not advance to Mission 2');
      log('Mission 2 Step 0 Text: ' + mm.activeMission.steps[0].text);

      // Step 0: Enter vehicle
      g.enterVehicle(g.playerCar);
      await sleep(200);
      log('Mission 2 Step after entering vehicle: ' + mm.currentStep + ' (' + mm.activeMission.steps[mm.currentStep].text + ')');
      if (mm.currentStep !== 1) throw new Error('Mission 2 step 0 failed to advance on vehicle enter');

      // Step 1: Evade police (has 2 stars)
      log('Police wanted level: ' + g.police.getWantedLevel());
      g.police.clearWantedLevel();
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(200);
      log('Mission 2 Step after evading police: ' + mm.currentStep + ' (' + mm.activeMission.steps[mm.currentStep].text + ')');
      if (mm.currentStep !== 2) throw new Error('Mission 2 step 1 failed to advance on police evasion');

      // Step 2: Deliver sports car to Garaje de Ocultacion at { x: 18, z: -90 }
      log('Step 2 targetPos: ' + JSON.stringify(mm.activeMission.steps[2].targetPos));
      g.playerCar.position.set(18, 0, -90);
      g.playerCar.mesh.position.copy(g.playerCar.position);
      g.player.position.copy(g.playerCar.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(300);
      log('Mission 2 completed! Current cash: ' + g.economy.cash);

      // Wait 4.2s for transition to Mission 3
      await sleep(4200);

      // -------------------------------------------------------------
      // MISSION 3: El Gran Golpe a Vault 21
      // -------------------------------------------------------------
      log('--- Testing Mission 3: ' + mm.activeMission.title + ' ---');
      if (mm.currentMissionIndex !== 2) throw new Error('Did not advance to Mission 3');
      log('Mission 3 Step 0 Text: ' + mm.activeMission.steps[0].text);

      // Step 0: Reach Bank entrance at { x: 23, z: 30 }
      g.exitVehicle();
      g.player.position.set(23, 0.8, 30);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(200);
      log('Mission 3 Step after reaching bank: ' + mm.currentStep + ' (' + mm.activeMission.steps[mm.currentStep].text + ')');
      if (mm.currentStep !== 1) throw new Error('Mission 3 step 0 failed to advance');

      // Step 1: Loot Vault safe
      g.coopHeists.robVaultBank(g.player);
      await sleep(200);
      log('Mission 3 Step after looting vault: ' + mm.currentStep + ' (' + mm.activeMission.steps[mm.currentStep].text + ')');
      if (mm.currentStep !== 2) throw new Error('Mission 3 step 1 failed to advance on vault loot');

      // Step 2: Evade 3 stars police
      g.police.clearWantedLevel();
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(300);
      log('Mission 3 completed! Current cash: ' + g.economy.cash);

      // Wait 4.2s for transition to Mission 4
      await sleep(4200);

      // -------------------------------------------------------------
      // MISSION 4: Arsenal Táctico y Guerra Callejera
      // -------------------------------------------------------------
      log('--- Testing Mission 4: ' + mm.activeMission.title + ' ---');
      if (mm.currentMissionIndex !== 3) throw new Error('Did not advance to Mission 4');
      log('Mission 4 Step 0 Text: ' + mm.activeMission.steps[0].text);

      // Step 0: Reach Ammu-Nation at { x: 28, z: -45 }
      g.player.position.set(28, 0.8, -45);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(200);
      log('Mission 4 Step after reaching Ammu-Nation: ' + mm.currentStep);
      if (mm.currentStep !== 1) throw new Error('Mission 4 step 0 failed to advance');

      // Step 1: Purchase weapon or armor
      window.dispatchEvent(new CustomEvent('armory:purchased'));
      await sleep(200);
      log('Mission 4 Step after purchasing equipment: ' + mm.currentStep);
      if (mm.currentStep !== 2) throw new Error('Mission 4 step 1 failed to advance');

      // Step 2: Reach Extraction Point at { x: -35, z: 140 }
      g.player.position.set(-35, 0.8, 140);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(300);
      log('Mission 4 completed! Current cash: ' + g.economy.cash);

      // Wait 4.2s for transition to Mission 5
      await sleep(4200);

      // -------------------------------------------------------------
      // MISSION 5: El Magnate de Million Dollar City
      // -------------------------------------------------------------
      log('--- Testing Mission 5: ' + mm.activeMission.title + ' ---');
      if (mm.currentMissionIndex !== 4) throw new Error('Did not advance to Mission 5');
      log('Mission 5 Step 0 Text: ' + mm.activeMission.steps[0].text);

      // Step 0: Reach Velvet Lounge at { x: -26, z: -45 }
      g.player.position.set(-26, 0.8, -45);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(200);
      log('Mission 5 Step after reaching Velvet Lounge: ' + mm.currentStep);
      if (mm.currentStep !== 1) throw new Error('Mission 5 step 0 failed to advance');

      // Step 1: Bet in VIP Casino
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
      await sleep(200);
      log('Mission 5 Step after VIP casino bet: ' + mm.currentStep);
      if (mm.currentStep !== 2) throw new Error('Mission 5 step 1 failed to advance');

      // Step 2: Claim Suite Presidencial at Dynasty 8 Plaza { x: 52, z: -110 }
      g.player.position.set(52, 0.8, -110);
      g.player.mesh.position.copy(g.player.position);
      mm.update(0.1, g.player.getPosition(), 0);
      await sleep(300);
      log('Mission 5 completed! Final cash: ' + g.economy.cash);

      // Position player and camera facing the Garaje de Ocultacion for visual QA screenshot
      g.player.position.set(16, 0.8, -82);
      g.player.mesh.position.copy(g.player.position);
      g.playerCar.position.set(18, 0, -90);
      g.playerCar.mesh.position.copy(g.playerCar.position);
      g.cameraManager.camera.position.set(16, 4, -74);
      g.cameraManager.camera.lookAt(18, 2, -90);

      return {
        success: true,
        finalCash: g.economy.cash,
        allMissionsPassed: true,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== RAW EVALUATE RESULT ===');
  console.log(JSON.stringify(missionResults, null, 2));

  // Capture screenshot of the Garaje de Ocultacion
  await new Promise(r => setTimeout(r, 1000));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_garage_mission2.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved screenshot of Garaje de Ocultación to', outPath);

  ws.close();
  proc.kill();
}

testAllMissions().catch(console.error);
