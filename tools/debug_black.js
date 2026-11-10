const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function debugCanvasAndScene() {
  const tempDir = path.join(os.tmpdir(), 'edge_debug_black_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json', (res) => {
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

  const consoleLogs = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
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

  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 3000));

  // Dismiss auth modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const guestBtn = document.getElementById('auth-guest-btn');
      if (guestBtn) guestBtn.click();
      if (window.game && window.game.authModal) window.game.authModal.close();
    })()`
  });

  await new Promise(r => setTimeout(r, 2000));

  // Comprehensive diagnosis
  const diag = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('#game-container canvas');
      const radarCanvas = document.getElementById('radar-canvas');
      const hud = document.getElementById('hud');
      const container = document.getElementById('game-container');

      // Check all elements covering the center of screen (960, 540)
      const centerEls = [];
      const elAtPoint = document.elementFromPoint(960, 540);
      let curr = elAtPoint;
      while (curr) {
        centerEls.push({ tag: curr.tagName, id: curr.id, className: curr.className, zIndex: window.getComputedStyle(curr).zIndex, bg: window.getComputedStyle(curr).backgroundColor });
        curr = curr.parentElement;
      }

      // Check camera & player
      const g = window.game;
      let camInfo = null;
      let lightsInfo = [];
      if (g) {
        camInfo = {
          camPos: g.cameraManager?.camera?.position,
          camRot: g.cameraManager?.camera?.rotation,
          near: g.cameraManager?.camera?.near,
          far: g.cameraManager?.camera?.far,
          fov: g.cameraManager?.camera?.fov,
          target: g.cameraManager?.currentTarget,
          mode: g.cameraManager?.mode,
          playerPos: g.player?.getPosition(),
          playerMeshPos: g.player?.mesh?.position,
          playerMeshVisible: g.player?.mesh?.visible
        };

        if (g.scene) {
          g.scene.traverse((obj) => {
            if (obj.isLight) {
              lightsInfo.push({
                type: obj.type,
                color: '#' + obj.color.getHexString(),
                intensity: obj.intensity,
                visible: obj.visible,
                pos: obj.position
              });
            }
          });
        }
      }

      return {
        hasCanvas: !!canvas,
        canvasStyle: canvas ? {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          display: window.getComputedStyle(canvas).display,
          visibility: window.getComputedStyle(canvas).visibility,
          opacity: window.getComputedStyle(canvas).opacity
        } : null,
        containerStyle: container ? {
          width: container.clientWidth,
          height: container.clientHeight,
          zIndex: window.getComputedStyle(container).zIndex,
          display: window.getComputedStyle(container).display
        } : null,
        centerElementStack: centerEls,
        camInfo,
        lightsCount: lightsInfo.length,
        lights: lightsInfo.slice(0, 10),
        radarCanvasDrawn: radarCanvas ? {
          w: radarCanvas.width,
          h: radarCanvas.height
        } : null
      };
    })()`,
    returnByValue: true
  });

  console.log('--- DIAGNOSTIC RESULTS ---');
  console.log(JSON.stringify(diag.result?.value, null, 2));

  console.log('--- CONSOLE LOGS ---');
  console.log(consoleLogs.filter(l => l.type === 'error' || l.type === 'warning' || l.args.some(a => String(a).includes('Error'))));

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_diag_black.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved screenshot to', outPath);

  ws.close();
  proc.kill();
}

debugCanvasAndScene().catch(console.error);
