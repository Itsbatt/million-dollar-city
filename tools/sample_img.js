const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

async function inspectUploadedImage() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tempDir = path.join(os.tmpdir(), 'img_test_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const imgPath = 'C:/Users/bat/.gemini/antigravity/brain/df204f92-3866-4c98-9ebd-1eed62b1ae45/.user_uploaded/media_1793973627206_de209e5f.png';
  const imgData = fs.readFileSync(imgPath).toString('base64');

  const proc = execFile(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`
  ]);

  await new Promise(r => setTimeout(r, 1500));

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

  await send('Runtime.enable');
  await send('Page.enable');

  const evalRes = await send('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Sample center
        const p1 = ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
        // Sample inside radar (e.g. 100, img.height - 100)
        const pRadar = ctx.getImageData(60, img.height - 100, 1, 1).data;
        // Sample top right cash
        const pCash = ctx.getImageData(img.width - 100, 80, 1, 1).data;

        resolve({
          width: img.width,
          height: img.height,
          centerHex: '#' + [p1[0], p1[1], p1[2]].map(x => x.toString(16).padStart(2, '0')).join(''),
          radarHex: '#' + [pRadar[0], pRadar[1], pRadar[2]].map(x => x.toString(16).padStart(2, '0')).join(''),
          cashHex: '#' + [pCash[0], pCash[1], pCash[2]].map(x => x.toString(16).padStart(2, '0')).join('')
        });
      };
      img.src = 'data:image/png;base64,${imgData}';
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Sample result:', JSON.stringify(evalRes.result?.value, null, 2));

  ws.close();
  proc.kill();
}

inspectUploadedImage().catch(console.error);
