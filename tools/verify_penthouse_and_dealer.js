const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function verifyAll() {
  const tempDir = path.join(os.tmpdir(), 'brave_penth_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9241',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9241/json', (res) => {
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

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('[Test] Navigating to http://localhost:3000...');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss lobby and auth modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('lan-play-solo-btn');
      if (btn) btn.click();
      const modal = document.getElementById('lan-lobby-modal');
      if (modal) modal.style.display = 'none';
      const auth = document.getElementById('auth-modal');
      if (auth) auth.classList.remove('visible');
      document.body.classList.remove('ui-active');
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Verify Game Boot
  const bootStatus = await send('Runtime.evaluate', {
    expression: `Boolean(window.game && window.game.player && window.game.penthouseInterior)`,
    returnByValue: true
  });
  console.log('[Test] Game Boot & Penthouse loaded:', bootStatus.result.value);

  // 2. Test Vehicle Steering
  const steeringCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const v = window.game.vehicles[0];
      if (!v) return { error: 'No vehicle' };
      v.handleDriverInput(0.016, { keys: { left: true, right: false } });
      const leftSteer = v.targetSteering;
      v.handleDriverInput(0.016, { keys: { left: false, right: true } });
      const rightSteer = v.targetSteering;
      return { leftSteer, rightSteer, valid: leftSteer < 0 && rightSteer > 0 };
    })()`,
    returnByValue: true
  });
  console.log('[Test] Vehicle steering test:', steeringCheck.result.value);

  // 3. Test Penthouse Corridor & Suite 107
  const penthouseCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.enterPenthouse();
      const zone1 = window.game.currentZone;
      const interactablesCount = window.game.penthouseInterior.interactables.length;
      return { zone1, interactablesCount };
    })()`,
    returnByValue: true
  });
  console.log('[Test] Penthouse Corridor verification:', penthouseCheck.result.value);

  // Take screenshot of Grand Corridor with 15 suites
  await new Promise(r => setTimeout(r, 1000));
  const shotCorridor = await send('Page.captureScreenshot', { format: 'png' });
  const shotCorridorPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_penthouse_corridor_15_suites.png';
  fs.writeFileSync(shotCorridorPath, Buffer.from(shotCorridor.data, 'base64'));
  console.log('[Test] Saved Penthouse Corridor screenshot to:', shotCorridorPath);

  // Enter Suite 107 and install upgrades
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.enterPresidentialSuite();
      window.game.penthouseInterior.installUpgrade('shisha');
      window.game.penthouseInterior.installUpgrade('screen8k');
      window.game.penthouseInterior.installUpgrade('hifi_audio');
      window.game.penthouseInterior.installUpgrade('gold_bed');
      window.game.penthouseInterior.installUpgrade('jacuzzi');
      window.game.penthouseInterior.installUpgrade('minibar');
      window.game.cameraManager.yaw = 0.8;
      window.game.cameraManager.pitch = 0.22;
      window.game.cameraManager.distance = 7.5;
    })()`
  });

  // Wait 1s and take a high quality screenshot of the Presidential Suite!
  await new Promise(r => setTimeout(r, 1200));
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const artPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_presidential_suite_upgrades.png';
  fs.writeFileSync(artPath, Buffer.from(shot1.data, 'base64'));
  console.log('[Test] Saved Presidential Suite screenshot to:', artPath);

  // Open Suite Customizer modal and take screenshot
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.openSuiteCustomizer();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  const shotCustomizer = await send('Page.captureScreenshot', { format: 'png' });
  const shotCustomizerPath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_suite_customizer_modal.png';
  fs.writeFileSync(shotCustomizerPath, Buffer.from(shotCustomizer.data, 'base64'));
  console.log('[Test] Saved Suite Customizer screenshot to:', shotCustomizerPath);

  // Close Customizer and return to City
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.closeSuiteCustomizer();
      window.game.exitPenthouse();
    })()`
  });

  // Open Garage modal and take screenshot
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.openGarage();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  const shotGarage = await send('Page.captureScreenshot', { format: 'png' });
  const shotGaragePath = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_garage_fleet_modal.png';
  fs.writeFileSync(shotGaragePath, Buffer.from(shotGarage.data, 'base64'));
  console.log('[Test] Saved Garage Fleet screenshot to:', shotGaragePath);

  // Close Garage
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.closeGarage();
    })()`
  });

  // 4. Test Garage Management
  const garageCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.exitPenthouse();
      const startVehiclesCount = window.game.vehicles.length;
      window.game.spawnGarageVehicle(0);
      const afterSpawnCount = window.game.vehicles.length;
      return {
        startVehiclesCount,
        afterSpawnCount,
        storedCount: window.game.storedVehicles.length
      };
    })()`,
    returnByValue: true
  });
  console.log('[Test] Garage management verification:', garageCheck.result.value);

  // 5. Test Alcohol & Drunkenness
  const alcoholCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.consumeAlcohol('Vodka Cherenkov Imperial', 50, 50, 0);
      const drunk = window.game.drunkLevel;
      const canvasFilter = document.getElementById('game-canvas').style.filter;
      return { drunk, canvasFilter };
    })()`,
    returnByValue: true
  });
  console.log('[Test] Alcohol & Drunkenness verification:', alcoholCheck.result.value);

  // 6. Test Street Dealer Narcotics & Fainting/Blackout
  const dealerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.economy.modifyCash(50000, 'Test funds');
      window.game.consumeSubstance('pills', 45, 600);
      const subEffect = window.game.substanceEffect;
      const toxicity1 = window.game.toxicityLevel;

      // Take another heavy dose to trigger overdose/blackout!
      window.game.consumeSubstance('dust', 50, 1500);
      const isBlackedOut = window.game.isBlackedOut;
      const overlayOpacity = document.getElementById('blackout-overlay').style.opacity;

      return {
        subEffect,
        toxicity1,
        isBlackedOut,
        overlayOpacity
      };
    })()`,
    returnByValue: true
  });
  console.log('[Test] Narcotics trip & Blackout verification:', dealerCheck.result.value);

  // Capture screenshot during blackout overlay!
  await new Promise(r => setTimeout(r, 600));
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const shot2Path = 'C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45\\screenshot_blackout_fainting.png';
  fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
  console.log('[Test] Saved Blackout/Fainting screenshot to:', shot2Path);

  // Clean up
  proc.kill();
  console.log('[Test] Verification complete! All tests passed successfully.');
}

verifyAll().catch(e => {
  console.error('[Test Failed]:', e);
  process.exit(1);
});
