const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function checkColliders() {
  const tempDir = path.join(os.tmpdir(), 'brave_colls_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const bravePath = 'C:\\Users\\bat\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  const proc = execFile(bravePath, [
    '--headless=new',
    '--window-size=1920,1080',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9229/json', (res) => {
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
  await new Promise(r => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (!g) return { error: 'No game' };

      const roads = [
        { name: 'Diamond Strip (Central)', minX: -14, maxX: 14, minZ: -360, maxZ: 360 },
        { name: 'Cross Street 1 (Fortune Way Z:0)', minX: -260, maxX: 260, minZ: -10, maxZ: 10 },
        { name: 'Cross Street 2 (Sunset Blvd Z:165)', minX: -260, maxX: 260, minZ: 155, maxZ: 175 },
        { name: 'Cross Street 3 (Highway Z:-165)', minX: -260, maxX: 260, minZ: -175, maxZ: -155 },
        { name: 'East Ave (X:110)', minX: 101, maxX: 119, minZ: -360, maxZ: 360 },
        { name: 'West Ave (X:-110)', minX: -119, maxX: -101, minZ: -360, maxZ: 360 }
      ];

      const colls = g.allColliders.map((item, idx) => {
        const box = item.box || item;
        return {
          idx,
          type: item.type || 'box',
          min: { x: box.min.x, y: box.min.y, z: box.min.z },
          max: { x: box.max.x, y: box.max.y, z: box.max.z }
        };
      });

      // Filter only colliders near street level (y between -5 and 50)
      const streetColls = colls.filter(c => c.max.y > -5 && c.min.y < 30);

      const roadOverlaps = [];
      for (const c of streetColls) {
        for (const r of roads) {
          // Check AABB overlap between collider and road
          const overlapX = (c.min.x < r.maxX) && (c.max.x > r.minX);
          const overlapZ = (c.min.z < r.maxZ) && (c.max.z > r.minZ);
          if (overlapX && overlapZ) {
            roadOverlaps.push({
              colliderIdx: c.idx,
              type: c.type,
              bounds: c,
              road: r.name,
              intersectionX: [Math.max(c.min.x, r.minX), Math.min(c.max.x, r.maxX)],
              intersectionZ: [Math.max(c.min.z, r.minZ), Math.min(c.max.z, r.maxZ)]
            });
          }
        }
      }

      return {
        totalColliders: colls.length,
        streetLevelColliders: streetColls.length,
        roadOverlaps
      };
    })()`,
    returnByValue: true
  });

  console.log('=== COLLIDER OVERLAP ANALYSIS ===');
  console.log(JSON.stringify(result.result?.value, null, 2));

  ws.close();
  proc.kill();
}

checkColliders().catch(console.error);