const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function profileFrame() {
  const tempDir = path.join(os.tmpdir(), 'brave_prof_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9231',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9231/json', (res) => {
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

  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 4500));

  // Dismiss modals
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

  const profile = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'No game' };

      // Measure execution time of systems over 50 simulated update cycles
      const times = {
        pedestrians: [],
        police: [],
        interactions: [],
        radar: []
      };

      for (let i = 0; i < 50; i++) {
        // Pedestrians
        const t0 = performance.now();
        g.pedestrians.update(0.016, g.player.getPosition());
        times.pedestrians.push(performance.now() - t0);

        // Police
        const t1 = performance.now();
        g.police.update(0.016);
        times.police.push(performance.now() - t1);

        // Interactions
        const t2 = performance.now();
        g.checkInteractions();
        times.interactions.push(performance.now() - t2);

        // Radar
        const t3 = performance.now();
        g.hud.renderRadar(g.player.getPosition(), g.player.heading, g._activeRadarWaypoints);
        times.radar.push(performance.now() - t3);
      }

      const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4);
      const max = (arr) => Math.max(...arr).toFixed(4);

      return {
        pedestriansAvgMs: avg(times.pedestrians),
        pedestriansMaxMs: max(times.pedestrians),
        policeAvgMs: avg(times.police),
        policeMaxMs: max(times.police),
        interactionsAvgMs: avg(times.interactions),
        interactionsMaxMs: max(times.interactions),
        radarAvgMs: avg(times.radar),
        radarMaxMs: max(times.radar),
        totalUpdateAvgMs: (
          parseFloat(avg(times.pedestrians)) +
          parseFloat(avg(times.police)) +
          parseFloat(avg(times.interactions)) +
          parseFloat(avg(times.radar))
        ).toFixed(4)
      };
    })()`,
    returnByValue: true
  });

  console.log('=== PROFILE RESULTS ===');
  console.log(JSON.stringify(profile.result.value, null, 2));

  ws.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

profileFrame().catch(console.error);
