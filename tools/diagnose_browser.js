const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function main() {
  console.log('[Diag] Launching Edge headless...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = execFile(edgePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\bat\\.gemini\\antigravity\\scratch\\million-dollar-city\\.edge_temp_diag'
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

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[CONSOLE ${msg.params.type.toUpperCase()}]: ${args}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error(`[EXCEPTION THROWN]:`, JSON.stringify(msg.params.exceptionDetails, null, 2));
    } else if (msg.method === 'Log.entryAdded') {
      console.log(`[BROWSER LOG]:`, msg.params.entry);
    } else if (msg.method === 'Network.loadingFailed') {
      console.error(`[NETWORK FAILED]:`, msg.params.requestId, msg.params.errorText);
    } else if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        console.error(`[NETWORK HTTP ${msg.params.response.status}]:`, msg.params.response.url);
      }
    }
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Page.enable');

  console.log('[Diag] Navigating to http://localhost:3000/ ...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });

  await new Promise(r => setTimeout(r, 4000));

  // Check errors from window
  const checkErrors = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        scripts: Array.from(document.scripts).map(s => s.src || 'inline'),
        bodyHtmlLength: document.body.innerHTML.length,
        documentTitle: document.title
      };
    })()`,
    returnByValue: true
  });
  console.log('[Diag] In-page check:', checkErrors.result?.value);

  ws.close();
  proc.kill();
}

main().catch(console.error);
