const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testBrave() {
  const tempDir = path.join(os.tmpdir(), 'brave_debug_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9227/json', (res) => {
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

  const logs = [];
  const exceptions = [];
  const networkFails = [];

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails);
    }
    if (msg.method === 'Network.loadingFailed') {
      networkFails.push(msg.params);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4000));

  console.log('=== BRAVE LOGS ===');
  console.log('Exceptions:', JSON.stringify(exceptions, null, 2));
  console.log('Network Fails:', JSON.stringify(networkFails, null, 2));
  console.log('All Console Logs:', JSON.stringify(logs, null, 2));

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        gameExists: !!window.game,
        clientErrors: window.__clientErrors,
        canvas: !!document.querySelector('#game-container canvas'),
        authModalVisible: document.getElementById('auth-modal')?.classList.contains('visible')
      };
    })()`,
    returnByValue: true
  });

  console.log('=== BRAVE IN-PAGE STATE ===');
  console.log(JSON.stringify(state.result?.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_brave.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved Brave screenshot to', outPath);

  ws.close();
  proc.kill();
}

testBrave().catch(console.error);
