const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless',
    '--window-size=1920,1080',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\.edge_temp_car'
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

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2500));

  // Dismiss auth modal, put player in car
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.game) {
        window.game.authModal.close();
        const car = window.game.playerCar;
        if (car) {
          car.enterDriver(window.game.player);
          window.game.cameraManager.setMode('VEHICLE');
          return 'in car';
        }
      }
      return 'no car';
    })()`,
    returnByValue: true
  });
  console.log('[Screenshot] Car status:', res.result?.value);

  await new Promise(r => setTimeout(r, 1200));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\screenshot_vehicle_chase.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('[Screenshot] Saved car screenshot to:', outPath);

  ws.close();
  proc.kill();
}

capture().catch(console.error);
