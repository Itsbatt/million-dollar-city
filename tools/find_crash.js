const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function testCrash() {
  const tempDir = path.join(os.tmpdir(), 'edge_debug_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--disable-cache',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json', (res) => {
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

  const uncaughtExceptions = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.exceptionThrown') {
      uncaughtExceptions.push(msg.params.exceptionDetails);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  // Inject error tracking before script execution
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.lastErrors = [];
      window.addEventListener('error', (e) => {
        window.lastErrors.push({
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          stack: e.error ? e.error.stack : 'no stack'
        });
      });
      window.addEventListener('unhandledrejection', (e) => {
        window.lastErrors.push({
          type: 'unhandledrejection',
          reason: String(e.reason)
        });
      });
    `
  });

  await send('Page.navigate', { url: 'http://localhost:3000/' });

  await new Promise(r => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        errors: window.lastErrors,
        gameExists: !!window.game,
        frameCheck: window.game?.cameraManager?.currentTarget
      };
    })()`,
    returnByValue: true
  });

  console.log('--- CRASH REPORT ---');
  console.log(JSON.stringify(result.result?.value, null, 2));
  console.log('CDP Exceptions:', uncaughtExceptions);

  ws.close();
  proc.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

testCrash().catch(console.error);
