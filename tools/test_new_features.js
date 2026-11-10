const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function testNewFeatures() {
  const tempDir = path.join(os.tmpdir(), 'brave_features_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9232',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9232/json', (res) => {
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

  const results = await send('Runtime.evaluate', {
    expression: `(async () => {
      const g = window.game;
      if (!g) return { error: 'No game instance' };

      const logs = [];
      const assert = (cond, msg) => {
        if (!cond) throw new Error(msg);
        logs.push('✓ ' + msg);
      };

      // 1. Verify OP quick button is removed from DOM
      const opBtn = document.getElementById('auth-admin-quick-btn');
      assert(!opBtn, 'Boton publico OP eliminado del menu');

      // 2. Verify Secret Admin User authentication (. bat / @L3ix2010)
      const loginRes = await g.economy.login('. bat', '@L3ix2010');
      assert(loginRes && loginRes.is_admin === 1, 'Login de usuario secreto (. bat) exitoso con is_admin = 1');
      assert(g.economy.isAdmin === true, 'EconomyManager reconoce privilegios OP');

      // Give cash for high-roller betting test
      g.economy.cash = 2000000;
      g.economy.notifyChange();

      // 3. Verify Casino Machine limits removed
      // Blackjack $100k bet
      const bjRes = g.casinoUI.blackjack.startNewGame(100000);
      assert(bjRes && bjRes.success !== false, 'Blackjack acepta apuesta ilimitada de $100,000');

      // Roulette $100k bet
      const rRes = g.casinoUI.roulette.addBet('red', 100000);
      assert(rRes && rRes.success !== false, 'Ruleta acepta ficha ilimitada de $100,000');

      // Slots high bet
      assert(g.casinoUI.slots.maxBet === Infinity, 'Tragaperras tiene maxBet = Infinity (sin limite)');

      // 4. Verify Rectified Casino Entrance coordinates
      const casinoDoor = g.doors.find(d => d.id === 'casino_entrance');
      assert(casinoDoor && Math.abs(casinoDoor.position.z - 50.0) < 1.0, 'Puerta del Casino rectificada a Z: 50.0 (alineada con alfombra roja y edificio)');

      // Test entering and exiting casino
      g.enterCasino();
      assert(g.currentZone === 'CASINO_INTERIOR', 'Jugador entra con exito al interior del Casino');
      g.exitCasino();
      assert(g.currentZone === 'CITY', 'Jugador sale a la ciudad');
      assert(Math.abs(g.player.position.z - 50.0) < 1.0, 'Spawn exterior del casino alineado a Z: 50.0');

      // 5. Verify Liquor Store
      const liquorDoor = g.doors.find(d => d.id === 'liquor_store');
      assert(liquorDoor && Math.abs(liquorDoor.position.z - (-15.0)) < 1.0, 'Tienda de licores 24/7 colocada en X: -27, Z: -15');
      
      // Test buying alcohol / drink
      g.player.health = 50;
      const initialCash = g.economy.cash;
      document.querySelector('.buy-drink-btn[data-item="beer"]')?.click();
      assert(g.player.health > 50, 'Comprar cerveza cura la salud del jugador (+25 HP)');
      assert(g.economy.cash === initialCash - 25, 'Se descuenta correctamente el precio de la cerveza');

      // 6. Verify Car Dealership
      const dealerDoor = g.doors.find(d => d.id === 'car_dealership');
      assert(dealerDoor && Math.abs(dealerDoor.position.z - 120.0) < 1.0, 'Concesionario Luxury Motorsport colocado en X: 25, Z: 120');

      // Test buying a vehicle (Vapid Dominator SS, $75,000)
      const preCarsCount = g.vehicles.length;
      document.querySelector('.buy-car-btn[data-vehicle="muscle"]')?.click();
      assert(g.vehicles.length === preCarsCount + 1, 'Coche comprado aparece instanciado en el mundo');
      const latestCar = g.vehicles[g.vehicles.length - 1];
      assert(latestCar.name === 'Vapid Dominator SS', 'El coche entregado es Vapid Dominator SS');
      assert(Math.abs(latestCar.position.x - 22.0) < 1.0 && Math.abs(latestCar.position.z - 120.0) < 1.0, 'Vehiculo entregado en la bahia de carga en X: 22, Z: 120');

      return {
        success: true,
        logs
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('=== TEST NEW FEATURES RESULTS ===');
  console.log(JSON.stringify(results.result.value, null, 2));

  // Take screenshot of Dealership and Liquor Store
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  const scrPath = path.join('C:\\Users\\bat\\.gemini\\antigravity\\brain\\df204f92-3866-4c98-9ebd-1eed62b1ae45', 'screenshot_new_features.png');
  fs.writeFileSync(scrPath, Buffer.from(scr.data, 'base64'));
  console.log('Saved screenshot to', scrPath);

  ws.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

testNewFeatures().catch(console.error);
