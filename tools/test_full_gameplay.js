const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testFullGameplay() {
  const tempDir = path.join(os.tmpdir(), 'brave_gameplay_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9228/json', (res) => {
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

  const exceptions = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  console.log('--- Step 1: Entering City from Lobby ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('lan-play-solo-btn')?.click();
      // Also close auth modal if shown as guest
      const guestBtn = document.querySelector('.btn-guest');
      if (guestBtn) guestBtn.click();
      return { inGame: true };
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- Step 2: Testing Bank Interior (Vault 21) ---');
  const bankTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'No game' };
      g.enterBank();
      const pos = g.player.getPosition();
      const zone = g.currentZone;
      // Rob Vault
      const initialCash = g.economy.cash;
      g.coopHeists.robVaultBank(g.player);
      const postCash = g.economy.cash;
      const wanted = g.police.getWantedLevel();
      g.exitBank();
      const exitPos = g.player.getPosition();
      const exitZone = g.currentZone;
      return {
        enterPos: pos,
        enterZone: zone,
        initialCash,
        postCash,
        cashGained: postCash - initialCash,
        wantedLevel: wanted,
        exitPos,
        exitZone
      };
    })()`,
    returnByValue: true
  });
  console.log('Bank Test Result:', JSON.stringify(bankTest.result?.value, null, 2));

  console.log('--- Step 3: Testing Ammu-Nation Interior & Armor/Ammo Buying ---');
  const armoryTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'No game' };
      g.enterArmory();
      const pos = g.player.getPosition();
      const zone = g.currentZone;
      g.openArmoryStore();
      const modalOpen = document.getElementById('armory-modal')?.classList.contains('visible');
      // Buy Kevlar Armor
      document.getElementById('buy-armor-btn')?.click();
      const armor = g.player.armor;
      // Buy Ammo
      document.getElementById('buy-ammo-btn')?.click();
      const curWep = g.weapons.weapons[g.weapons.currentWeaponId];
      // Close Armory Store
      g.closeArmoryStore();
      g.exitArmory();
      return {
        pos,
        zone,
        modalOpen,
        armorEquipped: armor,
        reserveAmmo: curWep?.reserveAmmo,
        exitZone: g.currentZone
      };
    })()`,
    returnByValue: true
  });
  console.log('Armory Test Result:', JSON.stringify(armoryTest.result?.value, null, 2));

  console.log('--- Step 4: Testing Casino Games (Video Poker, Pachinko, Craps) ---');
  const casinoTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'No game' };
      g.enterCasino();

      // Video Poker
      const vp = g.casinoUI.videoPoker;
      let vpDealt = false;
      if (vp) {
        vp.deal();
        vpDealt = vp.stage === 'DRAW';
      }

      // Pachinko
      const pach = g.casinoUI.pachinko;
      let pachFired = false;
      if (pach) {
        pach.launchBall();
        pachFired = pach.balls.length > 0;
      }

      // Craps
      const craps = g.casinoUI.craps;
      let crapsRolled = false;
      if (craps) {
        craps.setBetType('pass_line');
        craps.rollDice();
        crapsRolled = craps.dice[0] >= 1;
      }

      g.exitCasino();

      return {
        casinoZone: g.currentZone,
        vpDealt,
        pachFired,
        crapsRolled
      };
    })()`,
    returnByValue: true
  });
  console.log('Casino Test Result:', JSON.stringify(casinoTest.result?.value, null, 2));

  console.log('--- Step 5: Testing Vehicle Driving & Particle Drifting ---');
  const carTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g || !g.playerCar) return { error: 'No car' };
      const car = g.playerCar;
      car.enterDriver(g.player);
      // Simulate gas pedal
      car.update(0.5, { keys: { forward: true, backward: false, left: false, right: false, handbrake: true }, mouse: {} }, g.allColliders);
      const speed = car.currentSpeed;
      const particlesCount = g.particles?.particles?.length || 0;
      car.exitDriver(g.player);
      return {
        speed,
        particlesEmitted: particlesCount > 0,
        driverInCar: g.player.inVehicle
      };
    })()`,
    returnByValue: true
  });
  console.log('Car Test Result:', JSON.stringify(carTest.result?.value, null, 2));

  console.log('Runtime Exceptions during full test:', JSON.stringify(exceptions, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_full_gameplay.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved full gameplay screenshot to', outPath);

  ws.close();
  proc.kill();
}

testFullGameplay().catch(console.error);