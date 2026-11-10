const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testCasinoMinigames() {
  const tempDir = path.join(os.tmpdir(), 'brave_casino_' + Date.now());
  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--remote-debugging-port=9231',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`,
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9231/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
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

  await new Promise(r => setTimeout(r, 2000));

  const testResults = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g || !g.casinoUI) return { error: 'No casino UI' };

      // 1. Test Video Poker
      const vp = g.casinoUI.videoPoker;
      const dealRes = vp.deal(100);
      vp.toggleHold(0);
      vp.toggleHold(1);
      const drawRes = vp.draw();

      // 2. Test Craps
      const craps = g.casinoUI.craps;
      craps.placeBet('passLine', 50);
      craps.placeBet('field', 50);
      const rollRes = craps.roll();

      // 3. Test Pachinko
      const pachinko = g.casinoUI.pachinko;
      pachinko.launchBalls(3, 50);

      return {
        videoPoker: {
          handCount: dealRes.hand.length,
          finalRank: drawRes.rankName,
          payout: drawRes.payout
        },
        craps: {
          dice: rollRes.dice,
          sum: rollRes.sum,
          point: rollRes.point,
          payout: rollRes.payout,
          message: rollRes.message
        },
        pachinko: {
          pegsCount: pachinko.pegs.length,
          catchersCount: pachinko.catchers.length,
          ballsLaunched: pachinko.balls.length
        }
      };
    })()`,
    returnByValue: true
  });

  console.log('--- CASINO GAMES ENGINE VERIFICATION ---');
  console.log(JSON.stringify(testResults.result?.value, null, 2));

  ws.close();
  proc.kill();
}

testCasinoMinigames().catch(console.error);
