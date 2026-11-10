const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testPedestriansAndMission() {
  const tempDir = path.join(os.tmpdir(), 'brave_ped_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9237',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9237/json', (res) => {
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

  const testResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g || !g.player || !g.weapons || !g.pedestrians) return { error: 'Game not ready' };

      const logs = [];
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

      // -------------------------------------------------------------
      // TEST 1: SHOOTING PEDESTRIANS
      // -------------------------------------------------------------
      logs.push('--- TEST 1: SHOOTING PEDESTRIANS ---');
      const peds = g.pedestrians.getPedestrians();
      if (!peds || peds.length === 0) throw new Error('No pedestrians found');

      // Pick first living pedestrian
      const targetPed = peds[0];
      const pedPos = targetPed.pos.clone();
      const initialHealth = targetPed.health;
      logs.push('Target Pedestrian initial health: ' + initialHealth + ' at (' + pedPos.x.toFixed(1) + ', ' + pedPos.z.toFixed(1) + ')');

      // Position player right in front of pedestrian (5 meters away facing target)
      g.player.position.set(pedPos.x, 0.8, pedPos.z + 5.0);
      g.player.mesh.position.copy(g.player.position);
      g.cameraManager.yaw = 0; // facing towards -Z directly at pedestrian
      g.cameraManager.pitch = 0.05; // level aim at chest/head
      g.cameraManager.snapToTarget(g.player);

      // Update camera once so camera.lookAt updates matrices
      g.cameraManager.update(0.016, g.player, { x: 0, y: 0 }, false, 'rifle');
      g.weapons.equip('rifle');

      let hitmarkerFired = false;
      let hitDetails = null;
      const hitHandler = (e) => {
        hitmarkerFired = true;
        hitDetails = e.detail;
      };
      window.addEventListener('weapon:hitmarker', hitHandler);

      // Fire rifle at pedestrian
      g.weapons.shoot(peds, false, g.cameraManager);
      await sleep(150);

      window.removeEventListener('weapon:hitmarker', hitHandler);

      const healthAfter = targetPed.health;
      const tookDamage = healthAfter < initialHealth || targetPed.isDead;
      logs.push('Fired shot! Health after: ' + healthAfter + ', took damage: ' + tookDamage + ', hitmarker event: ' + hitmarkerFired);
      if (hitDetails) logs.push('Hitmarker details: ' + JSON.stringify(hitDetails));

      // Fire lethal shot to test elimination
      g.weapons.shoot(peds, true, g.cameraManager);
      await sleep(150);
      g.weapons.shoot(peds, true, g.cameraManager);
      await sleep(150);
      logs.push('Fired follow-up shots. Is pedestrian dead: ' + targetPed.isDead);

      // -------------------------------------------------------------
      // TEST 2: MISSION 5 (DYNASTY 8 PLAZA - SUITE PRESIDENCIAL)
      // -------------------------------------------------------------
      logs.push('--- TEST 2: DYNASTY 8 PLAZA MISSION ---');
      g.missions.startMission(4); // Mission 5: "El Magnate de Million Dollar City"
      g.missions.currentStep = 2; // Step 3: Reclama la Suite Presidencial en el ático de Dynasty 8 Plaza
      g.missions.notifyMissionUpdate();

      const curTarget = g.missions.getCurrentTarget();
      logs.push('Mission 5 Step 3 targetPos: ' + JSON.stringify(curTarget));
      if (!curTarget || curTarget.x !== 29 || curTarget.z !== -110) {
        throw new Error('Mission targetPos incorrect! Expected (29, -110), got ' + JSON.stringify(curTarget));
      }

      // Check radar waypoints inclusion
      const radarTargetFound = g._activeRadarWaypoints.some(wp => wp.pos && Math.abs(wp.pos.x - 29) < 2 && Math.abs(wp.pos.z - (-110)) < 2);
      logs.push('Target present in active radar waypoints: ' + radarTargetFound);

      // Check Dynasty 8 Plaza in Phone landmarks
      const phoneLandmarks = g.phoneUI ? g.phoneUI.getCityLandmarks() : [];
      const d8PhoneLandmark = phoneLandmarks.find(lm => lm.id === 'dynasty8_plaza');
      logs.push('Dynasty 8 Plaza present in Phone GPS Map: ' + !!d8PhoneLandmark);

      // Teleport player to Dynasty 8 Plaza entrance
      g.player.position.set(29.0, 0.8, -110.0);
      g.player.mesh.position.copy(g.player.position);
      g.missions.update(0.016, g.player.getPosition(), 0);

      const missionWon = g.missions.activeMission === null || g.missions.currentMissionIndex > 4 || g.missions.currentStep > 2;
      logs.push('Reached entrance (29, -110). Mission completed / advanced: ' + missionWon);

      return {
        success: tookDamage && hitmarkerFired && curTarget.x === 29 && !!d8PhoneLandmark && missionWon,
        tookDamage,
        hitmarkerFired,
        targetPedDead: targetPed.isDead,
        curTarget,
        d8PhoneLandmark: !!d8PhoneLandmark,
        missionWon,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== TEST RESULTS ===');
  console.log(JSON.stringify(testResult, null, 2));

  // Capture screenshot of Dynasty 8 Plaza entrance
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.cameraManager.camera.position.set(15, 6, -110);
      window.game.cameraManager.camera.lookAt(29, 4, -110);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_dynasty8_plaza_entrance.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved screenshot to', outPath);

  try {
    proc.kill();
  } catch(e) {}

  return testResult;
}

testPedestriansAndMission().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
