const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testDriveRoads() {
  const tempDir = path.join(os.tmpdir(), 'brave_drive_' + Date.now());
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
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4000));

  console.log('--- Simulating Vehicle Driving Along Diamond Strip Boulevard ---');
  const driveResult = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const g = window.game;
        if (!g || !g.playerCar) return { error: 'No car' };
        const car = g.playerCar;
        car.enterDriver(g.player);

        // Start at Z = -100 on right lane (X = 6.5)
        car.position.set(6.5, 0, -100);
        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = 0; // facing +Z

        const positions = [];

        // Simulate driving straight south across Z = -100 to Z = +100
        for (let step = 0; step < 160; step++) {
          const delta = 0.05;
          car.update(delta, { keys: { forward: true, backward: false, left: false, right: false, handbrake: false }, mouse: {} }, g.allColliders);
          
          if (step % 20 === 0) {
            positions.push({ step, x: +car.position.x.toFixed(2), z: +car.position.z.toFixed(2), speed: +car.currentSpeed.toFixed(2) });
          }
        }

        const endZ = +car.position.z.toFixed(2);

        // Now drive across Fortune Way from West to East (X = -100 to X = +100 at Z = 0)
        car.position.set(-100, 0, 0);
        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = Math.PI / 2; // facing +X
        car.currentSpeed = 0;
        const crossPositions = [];

        for (let step = 0; step < 160; step++) {
          const delta = 0.05;
          car.update(delta, { keys: { forward: true, backward: false, left: false, right: false, handbrake: false }, mouse: {} }, g.allColliders);
          
          if (step % 20 === 0) {
            crossPositions.push({ step, x: +car.position.x.toFixed(2), z: +car.position.z.toFixed(2), speed: +car.currentSpeed.toFixed(2) });
          }
        }

        const endX = +car.position.x.toFixed(2);
        car.exitDriver(g.player);

        return {
          northSouthDrive: {
            startZ: -100,
            endZ,
            positions
          },
          eastWestDrive: {
            startX: -100,
            endX,
            crossPositions
          }
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('=== ROAD DRIVE TEST RESULTS ===');
  console.log(JSON.stringify(driveResult.result?.value, null, 2));

  ws.close();
  proc.kill();
}

testDriveRoads().catch(console.error);