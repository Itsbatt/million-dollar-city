const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testPlinkoAndSlots() {
  const tempDir = path.join(os.tmpdir(), 'brave_casino_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9238',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9238/json', (res) => {
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

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description).join(' ');
      console.log('[BROWSER CONSOLE]', msg.params.type, args);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
    }
  });

  console.log('Navigating to http://localhost:3000...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss lobby / auth
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('lan-play-solo-btn')?.click();
      const guestBtn = document.querySelector('.btn-guest');
      if (guestBtn) guestBtn.click();
      if (window.game && window.game.authModal) window.game.authModal.close();
      if (window.game && window.game.lobbyUI) window.game.lobbyUI.close();
      // Ensure player has plenty of cash for testing
      if (window.game && window.game.economy) {
        window.game.economy.cash = 50000;
        window.game.economy.notifyChange();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  const testResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g || !g.casinoUI || !g.slots || !g.casinoUI.pachinko) return { error: 'Casino systems not initialized' };

      const logs = [];
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

      // -------------------------------------------------------------
      // TEST 1: SLOTS (TRAGAPERRAS)
      // -------------------------------------------------------------
      logs.push('--- TEST 1: SLOTS (TRAGAPERRAS) ---');
      g.casinoUI.openSlots();
      await sleep(300);

      const slotsModal = document.getElementById('slots-modal');
      const isSlotsVisible = slotsModal && slotsModal.classList.contains('visible');
      logs.push('Slots Modal visible: ' + isSlotsVisible);
      if (!isSlotsVisible) throw new Error('Slots modal did not open!');

      // Test quick bet button $10K
      const quickBetBtn = document.querySelector('.slot-quick-bet[data-bet="10000"]');
      if (quickBetBtn) quickBetBtn.click();
      await sleep(100);

      const betVal = parseInt(document.getElementById('slots-bet-input')?.value, 10);
      const currentBetDisplay = document.getElementById('slot-current-bet')?.textContent;
      logs.push('Slots Bet Input: $' + betVal + ', Display: ' + currentBetDisplay);

      // Now set affordable bet for spin test
      const bet50Btn = document.querySelector('.slot-quick-bet[data-bet="50"]');
      if (bet50Btn) bet50Btn.click();
      await sleep(100);

      const initialCash = g.economy.getCash();
      const spinBtn = document.getElementById('slots-spin-btn');
      logs.push('Spin button exists: ' + !!spinBtn + ', initial cash: $' + initialCash);
      if (!spinBtn) throw new Error('Slots spin button not found!');

      spinBtn.click();
      logs.push('Clicked spin button! Waiting for spinning reels...');
      await sleep(300);

      const intermediateReels = [
        document.getElementById('reel-1')?.textContent,
        document.getElementById('reel-2')?.textContent,
        document.getElementById('reel-3')?.textContent
      ];
      logs.push('Intermediate spinning reels: ' + intermediateReels.join(' | '));

      // Wait until spin completes cleanly
      let spinWait = 0;
      while (g.slots.isSpinning && spinWait < 4000) {
        await sleep(100);
        spinWait += 100;
      }
      await sleep(100);

      const finalReels = [
        document.getElementById('reel-1')?.textContent,
        document.getElementById('reel-2')?.textContent,
        document.getElementById('reel-3')?.textContent
      ];
      const statusMsg = document.getElementById('slots-status-msg')?.textContent;
      const lastWinText = document.getElementById('slot-last-win')?.textContent;
      const cashAfter = g.economy.getCash();
      logs.push('Final reels: ' + finalReels.join(' | '));
      logs.push('Status msg: ' + statusMsg);
      logs.push('Last win display: ' + lastWinText);
      logs.push('Cash after spin: $' + cashAfter);

      const slotsPassed = finalReels.every(r => r && !r.includes('[object')) && !spinBtn.disabled && !statusMsg.includes('GIRANDO');
      logs.push('Slots test passed: ' + slotsPassed);

      g.casinoUI.closeModal();
      await sleep(300);

      // -------------------------------------------------------------
      // TEST 2: PLINKO / PACHINKO
      // -------------------------------------------------------------
      logs.push('--- TEST 2: PLINKO / PACHINKO ---');
      g.casinoUI.openPachinko();
      await sleep(300);

      const pachinkoModal = document.getElementById('pachinko-modal');
      const isPachinkoVisible = pachinkoModal && pachinkoModal.classList.contains('visible');
      logs.push('Pachinko Modal visible: ' + isPachinkoVisible);
      if (!isPachinkoVisible) throw new Error('Pachinko modal did not open!');

      const canvas = document.getElementById('pachinko-canvas');
      logs.push('Canvas attached and dimensions: ' + canvas?.width + 'x' + canvas?.height);

      let landedEvents = [];
      const landedHandler = (e) => {
        landedEvents.push(e.detail);
      };
      window.addEventListener('pachinko:ball_landed', landedHandler);

      const pCashBefore = g.economy.getCash();
      // Click 5 balls launch
      const launch5Btn = document.getElementById('pachinko-launch-5-btn');
      logs.push('Launch 5 balls button exists: ' + !!launch5Btn);
      launch5Btn.click();

      // Wait until all 5 balls land or max 7 seconds
      let pWait = 0;
      await sleep(600); // allow all 5 balls to be added to active balls
      while ((g.casinoUI.pachinko.balls.length > 0 && g.casinoUI.pachinko.landedHistory.length < 5) && pWait < 7000) {
        await sleep(100);
        pWait += 100;
      }
      await sleep(300);

      window.removeEventListener('pachinko:ball_landed', landedHandler);

      const history = g.casinoUI.pachinko.landedHistory || [];
      const pStatusMsg = document.getElementById('pachinko-status-msg')?.textContent;
      const pCashAfter = g.economy.getCash();
      const currentBalls = g.casinoUI.pachinko.balls.map(b => 'x=' + b.x.toFixed(1) + ',y=' + b.y.toFixed(1) + ',vy=' + b.vy.toFixed(1));
      logs.push('Current balls in memory: ' + JSON.stringify(currentBalls));
      logs.push('TimerId: ' + g.casinoUI.pachinko.timerId);
      logs.push('Balls landed count - listener: ' + landedEvents.length + ', history: ' + history.length);
      logs.push('Pachinko status message: ' + pStatusMsg);
      logs.push('Landed multipliers: ' + (history.length > 0 ? history.map(e => e.label).join(', ') : landedEvents.map(e => e.label).join(', ')));
      logs.push('Pachinko Cash before: $' + pCashBefore + ', after: $' + pCashAfter);

      const totalLanded = Math.max(landedEvents.length, history.length);
      const plinkoPassed = totalLanded >= 3 && isPachinkoVisible;
      logs.push('Plinko test passed: ' + plinkoPassed);

      g.casinoUI.closeModal();

      return {
        success: slotsPassed && plinkoPassed,
        slotsPassed,
        plinkoPassed,
        finalReels,
        statusMsg,
        landedCount: landedEvents.length,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== TEST RESULTS ===');
  console.log(JSON.stringify(testResult, null, 2));

  try {
    proc.kill();
  } catch(e) {}

  return testResult;
}

testPlinkoAndSlots().then(() => {
  console.log('Test execution completed.');
  process.exit(0);
}).catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
