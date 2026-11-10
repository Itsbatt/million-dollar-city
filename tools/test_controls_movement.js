const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testControlsMovement() {
  const tempDir = path.join(os.tmpdir(), 'brave_ctrls_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9236',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9236/json', (res) => {
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
      if (!g || !g.player || !g.inputManager) return { error: 'Game not ready' };

      const logs = [];
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

      // 1. TEST WASD ON FOOT
      logs.push('--- TEST 1: WASD ON FOOT ---');
      g.player.position.set(0, 0, 28);
      g.player.mesh.position.set(0, 0, 28);
      g.cameraManager.yaw = 0;
      g.cameraManager.pitch = 0.25;

      // Test KeyW (Forward)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
      await sleep(400);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
      const posAfterW = g.player.getPosition().clone();
      const movedForward = posAfterW.z < 28;
      logs.push('Pressed W: initial Z=28 -> new Z=' + posAfterW.z.toFixed(2) + ' (Moved Forward: ' + movedForward + ')');

      // Test KeyS (Backward)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's' }));
      await sleep(400);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', key: 's' }));
      const posAfterS = g.player.getPosition().clone();
      const movedBackward = posAfterS.z > posAfterW.z;
      logs.push('Pressed S: new Z=' + posAfterS.z.toFixed(2) + ' (Moved Backward: ' + movedBackward + ')');

      // Test KeyA (Left)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      await sleep(400);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }));
      const posAfterA = g.player.getPosition().clone();
      const movedLeft = posAfterA.x < 0;
      logs.push('Pressed A: initial X=0 -> new X=' + posAfterA.x.toFixed(2) + ' (Moved Left: ' + movedLeft + ')');

      // Test KeyD (Right)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      await sleep(400);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
      const posAfterD = g.player.getPosition().clone();
      const movedRight = posAfterD.x > posAfterA.x;
      logs.push('Pressed D: new X=' + posAfterD.x.toFixed(2) + ' (Moved Right: ' + movedRight + ')');

      // 2. TEST MOUSE LOOK
      logs.push('--- TEST 2: MOUSE LOOK ---');
      const initialYaw = g.cameraManager.yaw;
      const initialPitch = g.cameraManager.pitch;

      // Simulate mouse horizontal move (turn right)
      g.inputManager.mouse.deltaX = 80;
      g.inputManager.mouse.deltaY = 0;
      await sleep(100);
      const yawAfter = g.cameraManager.yaw;
      const yawRotated = yawAfter < initialYaw;
      logs.push('Mouse Look X: initialYaw=' + initialYaw.toFixed(2) + ' -> yawAfter=' + yawAfter.toFixed(2) + ' (Rotated: ' + yawRotated + ')');

      // Simulate mouse vertical move UP (movementY = -60, should tilt up towards sky)
      g.inputManager.mouse.deltaX = 0;
      g.inputManager.mouse.deltaY = -60;
      await sleep(100);
      const pitchUp = g.cameraManager.pitch;
      const pitchLookedUp = pitchUp < initialPitch;
      logs.push('Mouse Look Y (Up): initialPitch=' + initialPitch.toFixed(2) + ' -> pitchUp=' + pitchUp.toFixed(2) + ' (Tilted Up: ' + pitchLookedUp + ')');

      // 3. TEST VEHICLE STEERING (A=Left, D=Right)
      logs.push('--- TEST 3: VEHICLE STEERING ---');
      const testCar = g.vehicles[0];
      testCar.position.set(0, 0, 0);
      testCar.mesh.position.set(0, 0, 0);
      testCar.mesh.rotation.y = 0;
      testCar.currentSpeed = 15; // driving forward
      g.enterVehicle(testCar);
      await sleep(200);

      // Steer Left (A)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      await sleep(350);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }));
      const carRotAfterA = testCar.mesh.rotation.y;
      const carTurnedLeft = carRotAfterA < 0; // heading turns left towards -X
      logs.push('Car Steer A (Left): rotY=' + carRotAfterA.toFixed(2) + ' (Turned Left: ' + carTurnedLeft + ')');

      // Steer Right (D)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      await sleep(550);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
      const carRotAfterD = testCar.mesh.rotation.y;
      const carTurnedRight = carRotAfterD > carRotAfterA;
      logs.push('Car Steer D (Right): rotY=' + carRotAfterD.toFixed(2) + ' (Turned Right: ' + carTurnedRight + ')');

      g.exitVehicle();

      return {
        success: movedForward && movedBackward && movedLeft && movedRight && yawRotated && pitchLookedUp && carTurnedLeft && carTurnedRight,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== TEST CONTROLS & MOVEMENT RESULTS ===');
  console.log(JSON.stringify(testResult, null, 2));

  try {
    proc.kill();
  } catch(e) {}

  return testResult;
}

testControlsMovement().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
