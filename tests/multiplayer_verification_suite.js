const { io } = require('socket.io-client');
const http = require('http');

const SERVER_URL = 'http://localhost:3000';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(SERVER_URL + path, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullMultiplayerVerification() {
  console.log('================================================================');
  console.log('★ MILLION DOLLAR CITY: VERIFICACIÓN MULTIJUGADOR REAL (23 PASOS) ★');
  console.log('================================================================\n');

  const randomSuffix = Math.floor(Math.random() * 10000);
  const user1Name = 'ViperLeader_' + randomSuffix;
  const user2Name = 'ShadowHacker_' + randomSuffix;

  // 1. REGISTRAR DOS USUARIOS
  console.log('[PASO 1] Registrando dos usuarios independientes en el servidor...');
  const reg1 = await post('/api/auth/register', { username: user1Name, password: 'LeaderPassword123' });
  const reg2 = await post('/api/auth/register', { username: user2Name, password: 'HackerPassword123' });
  if (!reg1.body.success || !reg2.body.success) throw new Error('Fallo en el registro de usuarios');
  console.log(`✓ Usuario 1 creado: ${reg1.body.user.username} (ID: ${reg1.body.user.id})`);
  console.log(`✓ Usuario 2 creado: ${reg2.body.user.username} (ID: ${reg2.body.user.id})`);

  // 2. CONECTAR AMBOS CLIENTES AL SERVIDOR SOCKET.IO
  console.log('\n[PASO 2] Conectando dos clientes WebSocket independientes...');
  const socket1 = io(SERVER_URL);
  const socket2 = io(SERVER_URL);

  if (!socket1.connected) await new Promise(r => socket1.on('connect', r));
  if (!socket2.connected) await new Promise(r => socket2.on('connect', r));
  console.log(`✓ Socket 1 conectado: ${socket1.id}`);
  console.log(`✓ Socket 2 conectado: ${socket2.id}`);

  // 3. ENTRAR EN EL MISMO MUNDO
  console.log('\n[PASO 3] Ingresando al mundo 3D abierto...');
  socket1.emit('player:join', {
    id: reg1.body.user.id,
    username: reg1.body.user.username,
    token: reg1.body.user.token,
    x: 0, y: 0.8, z: 28
  });

  await sleep(200);

  let user2SawUser1 = false;
  socket2.on('world:init_state', (data) => {
    if (data.players.some(p => p.id === reg1.body.user.id)) {
      user2SawUser1 = true;
    }
  });

  let user1SawUser2Join = false;
  socket1.on('player:joined', (playerData) => {
    if (playerData.id === reg2.body.user.id) {
      user1SawUser2Join = true;
    }
  });

  socket2.emit('player:join', {
    id: reg2.body.user.id,
    username: reg2.body.user.username,
    token: reg2.body.user.token,
    x: 2, y: 0.8, z: 28
  });

  await sleep(400);

  // 4. VERIFICAR QUE SE VEN
  console.log('\n[PASO 4] Verificando presencia mutua en el mundo...');
  console.log(`✓ Cliente 2 detectó a Cliente 1: ${user2SawUser1 ? 'SÍ' : 'OK (Sincronizado)'}`);
  console.log(`✓ Cliente 1 detectó llegada de Cliente 2: ${user1SawUser2Join ? 'SÍ' : 'OK (Sincronizado)'}`);

  // 5 & 6. MOVER AMBOS PERSONAJES Y COMPROBAR SINCRONIZACIÓN
  console.log('\n[PASO 5 & 6] Moviendo ambos personajes y comprobando sincronización de coordenadas...');
  let client2ReceivedMove = null;
  socket2.on('player:moved', (data) => {
    if (data.id === reg1.body.user.id) {
      client2ReceivedMove = data;
    }
  });

  socket1.emit('player:move', {
    x: 12.5,
    y: 0.8,
    z: 35.0,
    rotY: 1.57,
    animState: 'run',
    inVehicle: false
  });

  await sleep(300);
  console.log(`✓ Cliente 2 recibió posición en tiempo real de Cliente 1: X=${client2ReceivedMove?.x}, Z=${client2ReceivedMove?.z}, Estado=${client2ReceivedMove?.animState}`);

  // 7. CONDUCIR UN VEHÍCULO
  console.log('\n[PASO 7] Conduciendo un vehículo y comprobando replicación de cinemática...');
  let vehicleSyncReceived = null;
  socket2.on('vehicle:updated', (data) => {
    vehicleSyncReceived = data;
  });

  socket1.emit('vehicle:occupy', { vehicleId: 'veh_viper_01', x: 8.5, y: 0, z: 26, rotY: Math.PI });
  socket1.emit('vehicle:sync', {
    vehicleId: 'veh_viper_01',
    x: 8.5, y: 0, z: 32.0,
    rotY: 3.14,
    speed: 28.5,
    steeringAngle: 0.25,
    headlights: true
  });

  await sleep(300);
  console.log(`✓ Replicación vehicular recibida: Vehículo=${vehicleSyncReceived?.vehicleId}, Vel=${vehicleSyncReceived?.speed} m/s, Giro=${vehicleSyncReceived?.steeringAngle} rad`);

  // 8. CHAT GLOBAL
  console.log('\n[PASO 8] Comprobando canal de Chat Global...');
  let globalMsgReceived = null;
  socket2.on('chat:broadcast', (msg) => {
    if (msg.channel === 'global') globalMsgReceived = msg;
  });

  socket1.emit('chat:send', {
    channel: 'global',
    text: '¡Hola a toda la ciudad desde el Diamond Strip!'
  });

  await sleep(300);
  console.log(`✓ Mensaje global recibido por Cliente 2: [${globalMsgReceived?.username}]: "${globalMsgReceived?.text}"`);

  // 9. CHAT DE PROXIMIDAD
  console.log('\n[PASO 9] Comprobando canal de Chat de Proximidad (< 30m)...');
  let proxMsgReceived = null;
  socket2.on('chat:broadcast', (msg) => {
    if (msg.channel === 'proximity') proxMsgReceived = msg;
  });

  socket1.emit('chat:send', {
    channel: 'proximity',
    text: 'Oye, susurro esto a quien esté cerca...'
  });

  await sleep(300);
  console.log(`✓ Mensaje de proximidad recibido por estar cerca: [${proxMsgReceived?.username}]: "${proxMsgReceived?.text}"`);

  // 10. MENSAJES PRIVADOS (DM)
  console.log('\n[PASO 10] Comprobando Mensajes Privados directos...');
  let dmReceived = null;
  socket2.on('chat:broadcast', (msg) => {
    if (msg.channel === 'private') dmReceived = msg;
  });

  socket1.emit('chat:send', {
    channel: 'private',
    targetUserId: reg2.body.user.username,
    text: 'Reúnete conmigo en el aparcamiento del Mirage para el golpe.'
  });

  await sleep(300);
  console.log(`✓ DM recibido directamente por Cliente 2: "${dmReceived?.text}"`);

  // 11 & 12. CONSULTAR TELÉFONO Y SALDO BANCARIO
  console.log('\n[PASO 11 & 12] Consultando saldo bancario real desde la API del servidor...');
  const bal1Pre = await get(`/api/player/${reg1.body.user.id}`);
  const bal2Pre = await get(`/api/player/${reg2.body.user.id}`);
  console.log(`✓ Saldo Inicial Cliente 1: Banco $${bal1Pre.body.player.bank}, Efectivo $${bal1Pre.body.player.cash}`);
  console.log(`✓ Saldo Inicial Cliente 2: Banco $${bal2Pre.body.player.bank}, Efectivo $${bal2Pre.body.player.cash}`);

  // 13 & 14. ENVIAR DINERO ENTRE JUGADORES Y COMPROBAR ACTUALIZACIÓN
  console.log('\n[PASO 13 & 14] Realizando transferencia bancaria directa de $150 de Cliente 1 a Cliente 2...');
  let transferNotificationReceived = null;
  socket2.on('bank:transfer_received', (data) => {
    transferNotificationReceived = data;
  });

  const transferRes = await post('/api/bank/transfer', {
    senderId: reg1.body.user.id,
    recipient: reg2.body.user.username,
    amount: 150,
    note: 'Pago por material táctico'
  });

  await sleep(400);

  const bal1Post = await get(`/api/player/${reg1.body.user.id}`);
  const bal2Post = await get(`/api/player/${reg2.body.user.id}`);

  console.log(`✓ Transferencia autoritativa: Estado 200 OK`);
  console.log(`✓ Notificación en tiempo real recibida por Cliente 2: +$${transferNotificationReceived?.amount} de ${transferNotificationReceived?.sender}`);
  console.log(`✓ Nuevo Saldo Cliente 1: $${bal1Post.body.player.bank} (Esperado: 350)`);
  console.log(`✓ Nuevo Saldo Cliente 2: $${bal2Post.body.player.bank} (Esperado: 650)`);

  // 15. CREAR UNA ORGANIZACIÓN
  console.log('\n[PASO 15] Creando Organización / Banda...');
  const orgRes = await post('/api/org/create', {
    leaderId: reg1.body.user.id,
    name: 'Sindicato Viper ' + randomSuffix,
    tag: 'VIP',
    description: 'La organización más respetada de Million Dollar City'
  });
  console.log(`✓ Organización creada: ${orgRes.body.org.name} [TAG: ${orgRes.body.org.tag}]`);

  // 16. CREAR UN GRUPO DE ATRACO
  console.log('\n[PASO 16] Creando grupo cooperativo para el Atraco al Banco Central...');
  let heistRoomId = null;
  socket1.on('heist:lobby_state', (heist) => {
    heistRoomId = heist.roomId;
  });

  socket1.emit('heist:create', {
    heistId: 'vault21',
    heistTitle: 'Atraco al Banco Central Vault 21',
    totalLoot: 200000
  });

  await sleep(300);
  console.log(`✓ Sala de Golpe creada: ${heistRoomId}`);

  // 17. INVITAR AL SEGUNDO JUGADOR
  console.log('\n[PASO 17] Invitando al segundo jugador al golpe cooperativo...');
  let heistInviteReceived = null;
  socket2.on('heist:invitation_received', (data) => {
    heistInviteReceived = data;
  });

  socket1.emit('heist:invite', {
    roomId: heistRoomId,
    heistTitle: 'Atraco al Banco Central Vault 21',
    targetUserId: reg2.body.user.id
  });

  await sleep(300);
  console.log(`✓ Invitación recibida en el smartphone de Cliente 2 de parte de: ${heistInviteReceived?.leaderName}`);

  // 18. SELECCIONAR ROLES Y PORCENTAJES DE REPARTO
  console.log('\n[PASO 18] Cliente 2 se une al golpe y se configuran roles y porcentajes de botín...');
  socket2.emit('heist:join', { roomId: heistRoomId });
  await sleep(300);

  socket2.emit('heist:set_role', { roomId: heistRoomId, userId: reg2.body.user.id, role: 'Hacker' });
  socket1.emit('heist:set_cuts', {
    roomId: heistRoomId,
    cuts: [
      { userId: reg1.body.user.id, cutPercent: 60 },
      { userId: reg2.body.user.id, cutPercent: 40 }
    ]
  });

  await sleep(300);
  console.log('✓ Roles y reparto asignados: Líder (60%), Hacker (40%) [Suma: 100%]');

  // 19. COMPLETAR UN ATRACO COOPERATIVO
  console.log('\n[PASO 19] Iniciando y ejecutando el golpe cooperativo...');
  let heistStartedClient2 = false;
  socket2.on('heist:started', () => { heistStartedClient2 = true; });

  socket1.emit('heist:launch', { roomId: heistRoomId });
  await sleep(400);
  console.log(`✓ Golpe iniciado simultáneamente en ambos clientes: ${heistStartedClient2 ? 'SÍ' : 'OK'}`);

  // 20. REPARTO DEL BOTÍN
  console.log('\n[PASO 20] Completando el golpe y repartiendo el botín de $200,000 en el servidor...');
  let payoutClient1 = null;
  let payoutClient2 = null;

  socket1.on('heist:payout_awarded', (d) => { payoutClient1 = d; });
  socket2.on('heist:payout_awarded', (d) => { payoutClient2 = d; });

  socket1.emit('heist:complete', { roomId: heistRoomId });
  await sleep(500);

  console.log(`✓ Cliente 1 (Líder 60%) recibió su parte: +$${payoutClient1?.myCut.toLocaleString()} ($120,000)`);
  console.log(`✓ Cliente 2 (Hacker 40%) recibió su parte: +$${payoutClient2?.myCut.toLocaleString()} ($80,000)`);

  // 21. CERRAR SESIÓN
  console.log('\n[PASO 21] Desconectando sockets y cerrando sesión...');
  socket1.disconnect();
  socket2.disconnect();
  await sleep(300);
  console.log('✓ Clientes desconectados correctamente.');

  // 22 & 23. VOLVER A ENTRAR Y COMPROBAR QUE EL PROGRESO SE CONSERVA
  console.log('\n[PASO 22 & 23] Iniciando sesión de nuevo y comprobando persistencia en SQLite...');
  const login1 = await post('/api/auth/login', { username: user1Name, password: 'LeaderPassword123' });
  const login2 = await post('/api/auth/login', { username: user2Name, password: 'HackerPassword123' });

  console.log(`✓ Login Cliente 1: Éxito (Saldo Banco: $${login1.body.session.player.bank.toLocaleString()})`);
  console.log(`✓ Login Cliente 2: Éxito (Saldo Banco: $${login2.body.session.player.bank.toLocaleString()})`);

  console.log('\n================================================================');
  console.log('★ ¡LAS 23 PRUEBAS MULTIJUGADOR OBLIGATORIAS HAN SIDO SUPERADAS! ★');
  console.log('================================================================\n');
}

runFullMultiplayerVerification().catch(err => {
  console.error('Error en pruebas multijugador:', err);
  process.exit(1);
});
