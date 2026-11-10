const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testPerformance() {
  const tempDir = path.join(os.tmpdir(), 'brave_perf_' + Date.now());
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

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Opening game for performance benchmark...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss modals
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

  // Profile 120 animation frames measuring delta time variance & stutters
  const benchResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const frameTimes = [];
      let last = performance.now();

      await new Promise(resolve => {
        let count = 0;
        function tick() {
          const now = performance.now();
          frameTimes.push(now - last);
          last = now;
          count++;
          if (count < 120) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(tick);
      });

      // Skip first frame
      const valid = frameTimes.slice(1);
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      const max = Math.max(...valid);
      const min = Math.min(...valid);
      const stuttersOver33ms = valid.filter(t => t > 33.3).length; // drops below 30 fps

      return {
        totalFrames: valid.length,
        avgFrameTimeMs: avg.toFixed(2),
        minFrameTimeMs: min.toFixed(2),
        maxFrameTimeMs: max.toFixed(2),
        estimatedFPS: (1000 / avg).toFixed(1),
        stuttersOver33ms
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Benchmark Result:', benchResult.result.value);

  ws.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

testPerformance().catch(err => {
  console.error('Bench error:', err);
  process.exit(1);
});
