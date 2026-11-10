const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testArmoryClose() {
  const tempDir = path.join(os.tmpdir(), 'brave_armory_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9235',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9235/json', (res) => {
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

  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g) return { error: 'Game engine not found' };

      const logs = [];
      const modal = document.getElementById('armory-modal');
      const closeBtn = document.getElementById('armory-close-btn');

      // Test 1: Open store & close with X button
      g.openArmoryStore();
      const open1 = modal.classList.contains('visible');
      logs.push('Modal opened: ' + open1);

      closeBtn.click();
      const closed1 = !modal.classList.contains('visible');
      logs.push('Modal closed via armory-close-btn: ' + closed1);

      // Test 2: Open store & close with Escape key
      g.openArmoryStore();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
      const closed2 = !modal.classList.contains('visible');
      logs.push('Modal closed via Escape key: ' + closed2);

      // Test 3: Open store & close with backdrop click
      g.openArmoryStore();
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const closed3 = !modal.classList.contains('visible');
      logs.push('Modal closed via backdrop click: ' + closed3);

      return {
        success: open1 && closed1 && closed2 && closed3,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== ARMORY TEST RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  try {
    proc.kill();
  } catch(e) {}

  return result;
}

testArmoryClose().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
