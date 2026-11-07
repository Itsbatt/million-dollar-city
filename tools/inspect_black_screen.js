const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function inspect() {
  const tempDir = path.join(os.tmpdir(), 'edge_debug_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--disable-cache',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json', (res) => {
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

  await new Promise(r => setTimeout(r, 3500));

  // Check canvas pixels and WebGL context
  const pixelCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('#game-container canvas');
      if (!canvas) return { error: 'No canvas found' };
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'No webgl context' };
      
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const pixels = new Uint8Array(4 * 10 * 10);
      gl.readPixels(Math.floor(width / 2) - 5, Math.floor(height / 2) - 5, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let nonZeroCount = 0;
      let sampleColors = [];
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 0 || pixels[i+1] > 0 || pixels[i+2] > 0) {
          nonZeroCount++;
        }
        if (sampleColors.length < 5) {
          sampleColors.push([pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]]);
        }
      }

      return {
        canvasFound: true,
        bufferSize: { width, height },
        clientSize: { w: canvas.clientWidth, h: canvas.clientHeight },
        nonZeroPixels: nonZeroCount,
        sampleColors,
        rendererClearColor: window.game?.scene?.background ? '#' + window.game.scene.background.getHexString() : null,
        fogColor: window.game?.scene?.fog ? '#' + window.game.scene.fog.color.getHexString() : null,
        playerPos: window.game?.player?.getPosition(),
        cameraPos: window.game?.cameraManager?.camera?.position,
        cameraTarget: window.game?.cameraManager?.currentTarget
      };
    })()`,
    returnByValue: true
  });

  console.log('--- PIXEL & WEBGL CHECK ---');
  console.log(JSON.stringify(pixelCheck.result?.value, null, 2));

  ws.close();
  proc.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

inspect().catch(console.error);
