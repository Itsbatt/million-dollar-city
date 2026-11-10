const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testArrestAndVehicle() {
  const tempDir = path.join(os.tmpdir(), 'brave_arrest_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9234',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9234/json', (res) => {
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

  const pageErrors = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const txt = msg.params.args.map(a => a.value || a.description).join(' ');
      if (txt.includes('[Test]') || txt.includes('[Police]') || txt.includes('[Jail]')) {
        console.log('PAGE LOG:', txt);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('EXCEPTION:', msg.params.exceptionDetails);
      pageErrors.push(msg.params.exceptionDetails);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

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
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Run comprehensive tests
  const testResults = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g) return { error: 'Game engine not found' };

      const logs = [];
      function log(m) {
        logs.push(m);
        console.log('[Test]', m);
      }

      function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
      }

      // TEST 1: VEHICLE ENTRY & MESH VISIBILITY
      log('--- TEST 1: Vehicle Entry & Visibility ---');
      const testCar = g.vehicles[0];
      if (!testCar) throw new Error('No test vehicle found');

      // Give player initial cash for testing bail
      g.economy.cash = 2500;
      g.economy.bank = 5000;
      g.economy.notifyChange();

      // Enter vehicle
      g.enterVehicle(testCar);
      await sleep(500);

      const inVehicle = g.player.inVehicle;
      const meshVisibleInCar = g.player.mesh ? g.player.mesh.visible : null;
      log('Player inVehicle: ' + inVehicle);
      log('Player mesh.visible while driving: ' + meshVisibleInCar);

      if (!inVehicle) throw new Error('Player did not enter vehicle!');
      if (meshVisibleInCar !== false) throw new Error('Player mesh was NOT hidden while in car!');

      // Exit vehicle
      g.exitVehicle();
      await sleep(400);
      const meshVisibleOnFoot = g.player.mesh ? g.player.mesh.visible : null;
      log('Player mesh.visible after exit: ' + meshVisibleOnFoot);
      if (meshVisibleOnFoot !== true) throw new Error('Player mesh was NOT restored upon vehicle exit!');

      // TEST 2: CRIME & POLICE PURSUIT
      log('--- TEST 2: Crime Trigger & Police Pursuit ---');
      g.police.addCrime(2);
      await sleep(600);

      const wantedStars = g.police.getWantedLevel();
      const policeUnitsCount = g.police.policeUnits.length;
      log('Wanted Stars: ' + wantedStars);
      log('Police Cruisers Active: ' + policeUnitsCount);

      if (wantedStars !== 2) throw new Error('Wanted stars mismatch, expected 2, got ' + wantedStars);
      if (policeUnitsCount === 0) throw new Error('No police cruisers spawned!');

      // TEST 3: BUSTED / ARREST & JAIL UI
      log('--- TEST 3: Arrest / Busted & Jail UI ---');
      // Trigger arrest
      g.police.triggerArrest('cornered');
      await sleep(600);

      const jailModal = document.getElementById('jail-modal');
      const isJailModalVisible = jailModal && jailModal.classList.contains('visible');
      const bailText = document.getElementById('jail-bail-amount')?.textContent;
      const playerPosInJail = g.player.getPosition();

      log('Jail Modal Visible: ' + isJailModalVisible);
      log('Bail Amount Displayed: ' + bailText);
      log('Player Pos in Jail: ' + JSON.stringify(playerPosInJail));

      if (!isJailModalVisible) throw new Error('Jail modal did not open upon arrest!');
      if (!bailText || (!bailText.includes('1,000') && !bailText.includes('1000'))) {
        throw new Error('Bail amount not calculated correctly: ' + bailText);
      }

      // Check player teleported to prison cell (Z: -130)
      if (Math.abs(playerPosInJail.z - (-130.0)) > 5) {
        throw new Error('Player was not placed in prison cell, pos: ' + JSON.stringify(playerPosInJail));
      }

      // TEST 4: PAY BAIL & RELEASE
      log('--- TEST 4: Pay Bail & Release ---');
      const cashBefore = g.economy.cash;
      document.getElementById('jail-pay-bail-btn')?.click();
      await sleep(600);

      const cashAfter = g.economy.cash;
      const isJailModalClosed = jailModal && !jailModal.classList.contains('visible');
      const playerPosAfterRelease = g.player.getPosition();
      const wantedStarsAfterRelease = g.police.getWantedLevel();
      const playerHealth = g.player.health;

      log('Cash before: $' + cashBefore + ' -> Cash after: $' + cashAfter);
      log('Jail Modal Closed: ' + isJailModalClosed);
      log('Player Pos after Release: ' + JSON.stringify(playerPosAfterRelease));
      log('Wanted Stars after Release: ' + wantedStarsAfterRelease);
      log('Player Health after Release: ' + playerHealth);

      if (cashAfter !== cashBefore - 1000) throw new Error('Bail of $1,000 was not correctly deducted from cash!');
      if (!isJailModalClosed) throw new Error('Jail modal did not close after paying bail!');
      if (wantedStarsAfterRelease !== 0) throw new Error('Wanted stars were not cleared after release!');
      if (playerHealth < 100) throw new Error('Player health was not restored to full!');

      // Check release coordinates (X: -16.5, Z: -125.0)
      if (Math.abs(playerPosAfterRelease.z - (-125.0)) > 3) {
        throw new Error('Player was not released outside LSPD entrance, pos: ' + JSON.stringify(playerPosAfterRelease));
      }

      // TEST 5: CUMPLIR CONDENA TIMER CHECK
      log('--- TEST 5: Serve Sentence Timer Test ---');
      g.police.triggerArrest('subdued');
      await sleep(500);

      document.getElementById('jail-serve-sentence-btn')?.click();
      await sleep(400);

      const timerBox = document.getElementById('jail-sentence-timer-box');
      const isTimerVisible = timerBox && timerBox.style.display !== 'none';
      const countdownText = document.getElementById('jail-countdown-seconds')?.textContent;
      log('Timer Box Visible: ' + isTimerVisible);
      log('Initial Countdown Text: ' + countdownText);

      if (!isTimerVisible) throw new Error('Sentence countdown box was not displayed!');

      // Clean up for photo
      g.jailUI.releasePlayer('Libertad condicional concedida para captura fotográfica');
      await sleep(400);

      return {
        success: true,
        inVehicle,
        meshVisibleInCar,
        meshVisibleOnFoot,
        wantedStars,
        policeUnitsCount,
        isJailModalVisible,
        bailText,
        cashDeductionCorrect: cashAfter === cashBefore - 1000,
        releasePos: playerPosAfterRelease,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== TEST ARREST & VEHICLE RESULTS ===');
  console.log(JSON.stringify(testResults, null, 2));

  // Trigger arrest one more time to take a beautiful screenshot of the Busted / Jail modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.police.triggerArrest('cornered');
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_lspd_jail_busted.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved Jail/Busted screenshot to', outPath);

  try {
    proc.kill();
  } catch(e) {}

  return testResults;
}

testArrestAndVehicle().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
