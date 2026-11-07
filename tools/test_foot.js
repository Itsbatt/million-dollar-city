const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

async function testFoot() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless',
    '--window-size=1920,1080',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--disable-cache',
    '--user-data-dir=C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\.edge_temp_test_foot'
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

  // Dismiss auth modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.game && window.game.authModal) {
        window.game.authModal.close();
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\screenshot_test_foot.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));

  const camInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      return {
        camPos: g.cameraManager.camera.position,
        camTarget: g.cameraManager.currentTarget,
        camYaw: g.cameraManager.yaw,
        camPitch: g.cameraManager.pitch,
        camNear: g.cameraManager.camera.near,
        camFar: g.cameraManager.camera.far,
        playerPos: g.player.getPosition(),
        calls: g.renderer.renderer.info.render.calls
      };
    })()`,
    returnByValue: true
  });
  console.log('Cam Info:', JSON.stringify(camInfo.result?.value, null, 2));
  console.log('Saved screenshot size:', fs.statSync(outPath).size);

  ws.close();
  proc.kill();
}

testFoot().catch(console.error);
