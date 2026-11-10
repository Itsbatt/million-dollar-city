const express = require('express');
const compression = require('compression');
const http = require('http');
const path = require('path');
const cors = require('cors');
const os = require('os');
const { Server } = require('socket.io');
const DatabaseManager = require('./database');

const app = express();
app.use(compression());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// LAN Match Rooms Store
const lanMatchRooms = new Map(); // roomCode -> { code, name, hostUsername, hostSocketId, maxPlayers, passCode, createdAt, players: [] }

// Middleware & Aggressive Anti-Caching for School Networks
app.set('etag', false);
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
}));

// Client Error Diagnostics
app.post('/api/client-error', (req, res) => {
  console.error('\n[🚨 CLIENT ERROR FROM BROWSER]:', JSON.stringify(req.body, null, 2), '\n');
  res.json({ ok: true });
});

// LAN & Local Network Information Helper
function getLocalIPv4Addresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: name, address: net.address });
      }
    }
  }
  addresses.sort((a, b) => {
    const isVirtualA = a.address.startsWith('192.168.56.') || a.iface.toLowerCase().includes('virtual');
    const isVirtualB = b.address.startsWith('192.168.56.') || b.iface.toLowerCase().includes('virtual');
    if (!isVirtualA && isVirtualB) return -1;
    if (isVirtualA && !isVirtualB) return 1;
    return a.address.localeCompare(b.address);
  });
  return addresses;
}

app.get('/api/network/lan-info', (req, res) => {
  const ips = getLocalIPv4Addresses();
  const primaryIp = ips[0] ? ips[0].address : 'localhost';
  res.json({
    success: true,
    hostname: os.hostname(),
    port: PORT,
    primaryIp,
    allIps: ips,
    lanUrl: `http://${primaryIp}:${PORT}`,
    activePlayers: connectedPlayers.size,
    activeMatchesCount: lanMatchRooms.size
  });
});

app.get('/api/match/list', (req, res) => {
  const list = Array.from(lanMatchRooms.values()).map(r => ({
    code: r.code,
    name: r.name,
    hostUsername: r.hostUsername,
    currentPlayers: r.players.length,
    maxPlayers: r.maxPlayers,
    hasPassword: !!r.passCode,
    createdAt: r.createdAt
  }));
  res.json({ success: true, matches: list });
});

app.post('/api/match/create', (req, res) => {
  const { name, hostUsername, maxPlayers, passCode } = req.body;
  const code = 'MDC-' + Math.floor(1000 + Math.random() * 9000);
  const match = {
    code,
    name: (name || 'Partida de ' + (hostUsername || 'Anfitrión')).slice(0, 40),
    hostUsername: hostUsername || 'Anfitrión',
    maxPlayers: Math.min(32, Math.max(2, Number(maxPlayers) || 8)),
    passCode: passCode ? String(passCode).trim() : null,
    createdAt: new Date().toISOString(),
    players: [{ username: hostUsername || 'Anfitrión', isHost: true }]
  };
  lanMatchRooms.set(code, match);
  res.json({ success: true, match });
});

app.post('/api/match/join', (req, res) => {
  const { code, username, passCode } = req.body;
  const match = lanMatchRooms.get((code || '').toUpperCase().trim());
  if (!match) return res.status(404).json({ success: false, error: 'Código de sala no encontrado' });
  if (match.passCode && match.passCode !== String(passCode || '').trim()) {
    return res.status(403).json({ success: false, error: 'Contraseña de sala incorrecta' });
  }
  if (match.players.length >= match.maxPlayers) {
    return res.status(400).json({ success: false, error: 'La sala está completa' });
  }
  if (!match.players.some(p => p.username.toLowerCase() === (username || '').toLowerCase())) {
    match.players.push({ username: username || 'Invitado', isHost: false });
  }
  res.json({ success: true, match });
});

// -------------------------------------------------------------
// REST API: AUTHENTICATION & ACCOUNTS
// -------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await DatabaseManager.register(username, password);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const session = await DatabaseManager.login(username, password);
    res.json({ success: true, session });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    const user = await DatabaseManager.getUserByToken(token);
    if (!user) return res.status(401).json({ success: false, error: 'Sesión no válida o caducada' });
    const player = await DatabaseManager.getPlayer(user.id);
    res.json({ success: true, user, player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Player profile endpoint
app.get('/api/player/:id', async (req, res) => {
  try {
    const username = req.query.username || 'Ciudadano';
    const player = await DatabaseManager.getPlayer(req.params.id, username);
    res.json({ success: true, player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/player/:id/save', async (req, res) => {
  try {
    const result = await DatabaseManager.savePlayer(req.params.id, req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// REST API: OP & ADMIN CONTROL PANEL (FOR ITSBAT_)
// -------------------------------------------------------------

app.post('/api/admin/funds', async (req, res) => {
  try {
    const { callerToken, target, cashDelta, bankDelta, isExact } = req.body;
    const caller = await DatabaseManager.getUserByToken(callerToken);
    if (!caller || (caller.username.toLowerCase() !== 'itsbat_' && caller.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado: solo Administrador OP' });
    }

    const result = await DatabaseManager.adminUpdatePlayerFunds(target || caller.id, Number(cashDelta || 0), Number(bankDelta || 0), isExact);

    io.emit('admin:money_updated', {
      playerId: result.id,
      username: result.username,
      cash: result.cash,
      bank: result.bank
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/weapons', async (req, res) => {
  try {
    const { callerToken, target } = req.body;
    const caller = await DatabaseManager.getUserByToken(callerToken);
    if (!caller || (caller.username.toLowerCase() !== 'itsbat_' && caller.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const result = await DatabaseManager.adminGiveAllWeapons(target || caller.id);
    io.emit('admin:weapons_unlocked', { playerId: result.id, weapons: result.weapons });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/players', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    const caller = await DatabaseManager.getUserByToken(token);
    if (!caller || (caller.username.toLowerCase() !== 'itsbat_' && caller.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const players = await DatabaseManager.adminGetAllPlayers();
    res.json({ success: true, players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// REST API: BANKING & ATOMIC WIRE TRANSFERS
// -------------------------------------------------------------

app.post('/api/bank/transfer', async (req, res) => {
  try {
    const { senderId, recipient, amount, note } = req.body;
    if (!senderId || !recipient || !amount) {
      return res.status(400).json({ success: false, error: 'Parámetros incompletos para la transferencia' });
    }

    const result = await DatabaseManager.transferBankFunds(senderId, recipient, amount, note);

    // Notify recipient in real time via Socket.IO if online
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      s => s.playerData && (s.playerData.id === result.recipient.id || s.playerData.username.toLowerCase() === result.recipient.username.toLowerCase())
    );

    if (targetSocket) {
      targetSocket.emit('bank:transfer_received', {
        sender: result.sender.username,
        amount: result.amount,
        newBank: result.recipient.newBank,
        note: note || 'Transferencia recibida'
      });
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/atm/transaction', async (req, res) => {
  try {
    const { playerId, type, amount } = req.body;
    const player = await DatabaseManager.getPlayer(playerId);
    let newCash = player.cash;
    let newBank = player.bank;

    if (type === 'deposit') {
      if (newCash < amount) return res.status(400).json({ success: false, error: 'Efectivo insuficiente' });
      newCash -= amount;
      newBank += amount;
    } else if (type === 'withdraw') {
      if (newBank < amount) return res.status(400).json({ success: false, error: 'Saldo en cuenta insuficiente' });
      newBank -= amount;
      newCash += amount;
    } else {
      return res.status(400).json({ success: false, error: 'Operación desconocida' });
    }

    await DatabaseManager.savePlayer(playerId, { cash: newCash, bank: newBank });
    await DatabaseManager.logTransaction(playerId, type, amount, newCash, newBank, `ATM ${type}: $${amount.toLocaleString()}`);

    res.json({ success: true, cash: newCash, bank: newBank });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const history = await DatabaseManager.getRecentTransactions(req.params.id, 20);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// REST API: ORGANIZATIONS & GANGS
// -------------------------------------------------------------

app.post('/api/org/create', async (req, res) => {
  try {
    const { leaderId, name, tag, description } = req.body;
    const org = await DatabaseManager.createOrganization(leaderId, name, tag, description);
    res.json({ success: true, org });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/org/my/:userId', async (req, res) => {
  try {
    const org = await DatabaseManager.getOrganizationByUser(req.params.userId);
    res.json({ success: true, org });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/org/deposit', async (req, res) => {
  try {
    const { userId, orgId, amount } = req.body;
    const result = await DatabaseManager.depositToOrgVault(userId, orgId, amount);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/org/leaderboard', async (req, res) => {
  try {
    const topOrgs = await DatabaseManager.getOrgLeaderboard();
    res.json({ success: true, organizations: topOrgs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// REST API: SOCIAL & RANKINGS
// -------------------------------------------------------------

app.get('/api/social/online', (req, res) => {
  const online = Array.from(connectedPlayers.values()).map(p => ({
    id: p.id,
    username: p.username,
    level: p.level || 1,
    reputation: p.reputation || 0,
    inVehicle: p.inVehicle || false
  }));
  res.json({ success: true, players: online });
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await DatabaseManager.getLeaderboard(15);
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// REST API: SERVER-AUTHORITATIVE CASINO ODDS & ENGINE
// -------------------------------------------------------------

app.post('/api/casino/roulette/spin', async (req, res) => {
  try {
    const { playerId, bets } = req.body; // bets = [{ type: 'red', amount: 100 }, ...]
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ success: false, error: 'No se enviaron apuestas' });
    }

    const totalBet = bets.reduce((acc, b) => acc + (parseInt(b.amount, 10) || 0), 0);
    const player = await DatabaseManager.getPlayer(playerId);

    if (player.cash < totalBet) {
      return res.status(400).json({ success: false, error: 'Fondos en efectivo insuficientes para la ruleta' });
    }

    // Authoritative European Roulette RNG
    const winningNumber = Math.floor(Math.random() * 37); // 0 to 36
    const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const isRed = redNumbers.has(winningNumber);
    const isZero = winningNumber === 0;

    let totalWin = 0;
    for (const b of bets) {
      const amt = parseInt(b.amount, 10);
      if (b.type === 'straight' && b.number === winningNumber) totalWin += amt * 36;
      else if (b.type === 'red' && isRed) totalWin += amt * 2;
      else if (b.type === 'black' && !isRed && !isZero) totalWin += amt * 2;
      else if (b.type === 'even' && !isZero && winningNumber % 2 === 0) totalWin += amt * 2;
      else if (b.type === 'odd' && !isZero && winningNumber % 2 !== 0) totalWin += amt * 2;
      else if (b.type === 'low' && winningNumber >= 1 && winningNumber <= 18) totalWin += amt * 2;
      else if (b.type === 'high' && winningNumber >= 19 && winningNumber <= 36) totalWin += amt * 2;
      else if (b.type === 'dozen1' && winningNumber >= 1 && winningNumber <= 12) totalWin += amt * 3;
      else if (b.type === 'dozen2' && winningNumber >= 13 && winningNumber <= 24) totalWin += amt * 3;
      else if (b.type === 'dozen3' && winningNumber >= 25 && winningNumber <= 36) totalWin += amt * 3;
    }

    const netChange = totalWin - totalBet;
    const newCash = player.cash + netChange;
    await DatabaseManager.savePlayer(playerId, { cash: newCash });

    if (totalWin > 0) {
      await DatabaseManager.logTransaction(playerId, 'casino_win', totalWin, newCash, player.bank, `Premio Ruleta #${winningNumber}`);
    } else {
      await DatabaseManager.logTransaction(playerId, 'casino_loss', -totalBet, newCash, player.bank, `Apuesta Ruleta fallida #${winningNumber}`);
    }

    res.json({
      success: true,
      winningNumber,
      color: isZero ? 'Verde' : (isRed ? 'Rojo' : 'Negro'),
      totalWin,
      netChange,
      newCash
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/casino/slots/spin', async (req, res) => {
  try {
    const { playerId, betAmount } = req.body;
    const bet = parseInt(betAmount, 10);
    if (!bet || bet <= 0) return res.status(400).json({ success: false, error: 'Apuesta inválida' });

    const player = await DatabaseManager.getPlayer(playerId);
    if (player.cash < bet) return res.status(400).json({ success: false, error: 'Efectivo insuficiente' });

    const symbols = [
      { id: 'cherry', icon: '🍒', weight: 35 },
      { id: 'bell', icon: '🔔', weight: 22 },
      { id: 'bar', icon: 'BAR', weight: 16 },
      { id: 'diamond', icon: '💎', weight: 10 },
      { id: 'seven', icon: '7️⃣', weight: 6 },
      { id: 'dollar', icon: '💵', weight: 3 }
    ];

    const pool = [];
    symbols.forEach(s => { for (let i = 0; i < s.weight; i++) pool.push(s); });

    const r1 = pool[Math.floor(Math.random() * pool.length)];
    const r2 = pool[Math.floor(Math.random() * pool.length)];
    const r3 = pool[Math.floor(Math.random() * pool.length)];

    let multiplier = 0;
    if (r1.id === r2.id && r2.id === r3.id) {
      if (r1.id === 'dollar') multiplier = 100;
      else if (r1.id === 'seven') multiplier = 50;
      else if (r1.id === 'diamond') multiplier = 30;
      else if (r1.id === 'bar') multiplier = 18;
      else if (r1.id === 'bell') multiplier = 12;
      else if (r1.id === 'cherry') multiplier = 6;
    } else {
      const cherryCount = [r1, r2, r3].filter(r => r.id === 'cherry').length;
      if (cherryCount === 2) multiplier = 2.5;
      else if (cherryCount === 1) multiplier = 1.0;
    }

    const winAmount = Math.floor(bet * multiplier);
    const netChange = winAmount - bet;
    const newCash = player.cash + netChange;

    await DatabaseManager.savePlayer(playerId, { cash: newCash });

    if (winAmount > 0) {
      await DatabaseManager.logTransaction(playerId, 'slots_win', winAmount, newCash, player.bank, `Premio Tragaperras x${multiplier}`);
      if (multiplier >= 50) {
        await DatabaseManager.recordJackpot(playerId, player.username, 'Tragaperras', bet, winAmount, multiplier);
      }
    }

    res.json({
      success: true,
      reels: [r1, r2, r3],
      multiplier,
      winAmount,
      newCash
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    game: 'Million Dollar City',
    version: '2.0.0-multiplayer',
    onlinePlayers: connectedPlayers.size,
    timestamp: Date.now()
  });
});

// -------------------------------------------------------------
// REAL-TIME MULTIPLAYER (SOCKET.IO)
// -------------------------------------------------------------

const connectedPlayers = new Map(); // socket.id -> PlayerData
const activeVehicles = new Map();   // vehicleId -> VehicleData
const activeHeists = new Map();     // heistRoomId -> HeistData

io.on('connection', (socket) => {
  console.log(`[Socket] Conectado: ${socket.id}`);

  // 1. Player joins open world
  socket.on('player:join', async (data) => {
    let username = data.username || `Ciudadano_${socket.id.slice(0, 4)}`;
    let userId = data.id || `usr_${socket.id.slice(0, 8)}`;

    // Verify token if supplied
    if (data.token) {
      const authUser = await DatabaseManager.getUserByToken(data.token);
      if (authUser) {
        username = authUser.username;
        userId = authUser.id;
      }
    }

    const profile = await DatabaseManager.getPlayer(userId, username);

    const playerData = {
      socketId: socket.id,
      id: userId,
      username,
      x: profile.position?.x || 0,
      y: profile.position?.y || 0.8,
      z: profile.position?.z || 28,
      rotY: 0,
      animState: 'idle',
      health: profile.health || 100,
      currentWeapon: profile.current_weapon || 'pistol',
      inVehicle: false,
      vehicleId: null,
      level: profile.level || 1,
      reputation: profile.reputation || 0,
      orgId: profile.org_id || null
    };

    socket.playerData = playerData;
    connectedPlayers.set(socket.id, playerData);

    // Send world snapshot (existing other players & vehicles)
    const existingPlayers = Array.from(connectedPlayers.values()).filter(p => p.socketId !== socket.id);
    const existingVehicles = Array.from(activeVehicles.values());

    socket.emit('world:init_state', {
      players: existingPlayers,
      vehicles: existingVehicles,
      myProfile: profile
    });

    // Broadcast new player joined to all others
    socket.broadcast.emit('player:joined', playerData);
    io.emit('social:online_count', connectedPlayers.size);
    console.log(`[Multiplayer] ${username} se unió a Million Dollar City (${connectedPlayers.size} online)`);
  });

  // 2. Continuous Movement & Transform Sync
  socket.on('player:move', (data) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.z = data.z;
    player.rotY = data.rotY;
    player.animState = data.animState;
    player.inVehicle = data.inVehicle || false;
    player.vehicleId = data.vehicleId || null;
    player.currentWeapon = data.currentWeapon;

    // Broadcast delta to other clients
    socket.broadcast.emit('player:moved', {
      id: player.id,
      socketId: socket.id,
      x: player.x,
      y: player.y,
      z: player.z,
      rotY: player.rotY,
      animState: player.animState,
      inVehicle: player.inVehicle,
      vehicleId: player.vehicleId,
      currentWeapon: player.currentWeapon
    });
  });

  // 3. Vehicles Sync (Real-time driving replication)
  socket.on('vehicle:occupy', (data) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    player.inVehicle = true;
    player.vehicleId = data.vehicleId;

    activeVehicles.set(data.vehicleId, {
      vehicleId: data.vehicleId,
      driverSocketId: socket.id,
      driverId: player.id,
      driverName: player.username,
      x: data.x,
      y: data.y,
      z: data.z,
      rotY: data.rotY
    });

    io.emit('vehicle:occupied', {
      vehicleId: data.vehicleId,
      driverId: player.id,
      driverName: player.username
    });
  });

  socket.on('vehicle:sync', (data) => {
    const veh = activeVehicles.get(data.vehicleId);
    if (veh && veh.driverSocketId === socket.id) {
      veh.x = data.x;
      veh.y = data.y;
      veh.z = data.z;
      veh.rotY = data.rotY;
      veh.speed = data.speed;
      veh.steeringAngle = data.steeringAngle;

      socket.broadcast.emit('vehicle:updated', {
        vehicleId: data.vehicleId,
        x: data.x,
        y: data.y,
        z: data.z,
        rotY: data.rotY,
        speed: data.speed,
        steeringAngle: data.steeringAngle,
        headlights: data.headlights,
        sirens: data.sirens
      });
    }
  });

  socket.on('vehicle:exit', (data) => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      player.inVehicle = false;
      player.vehicleId = null;
    }

    activeVehicles.delete(data.vehicleId);
    io.emit('vehicle:vacated', {
      vehicleId: data.vehicleId,
      x: data.x,
      y: data.y,
      z: data.z
    });
  });

  // 4. Combat & Gunfire Sync
  socket.on('player:shoot', (data) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) return;

    socket.broadcast.emit('player:shot', {
      id: player.id,
      socketId: socket.id,
      origin: data.origin,
      direction: data.direction,
      weapon: data.weapon
    });
  });

  // Weapon damage specs (authoritative validation)
  const WEAPON_DAMAGE_MAP = {
    pistol: { min: 18, max: 26, range: 45 },
    smg: { min: 14, max: 22, range: 35 },
    shotgun: { min: 45, max: 75, range: 25 },
    rifle: { min: 28, max: 38, range: 65 },
    sniper: { min: 85, max: 110, range: 180 }
  };

  socket.on('player:hit', (data) => {
    const attacker = socket.playerData;
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      s => s.playerData && s.playerData.id === data.targetPlayerId
    );
    if (!targetSocket || !targetSocket.playerData) return;

    const weaponKey = data.weapon || 'pistol';
    const spec = WEAPON_DAMAGE_MAP[weaponKey] || WEAPON_DAMAGE_MAP.pistol;

    // Validate distance if attacker and victim positions exist
    if (attacker && attacker.x !== undefined && targetSocket.playerData.x !== undefined) {
      const dx = attacker.x - targetSocket.playerData.x;
      const dz = attacker.z - targetSocket.playerData.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > spec.range * 1.5) {
        return; // out of range hit rejected
      }
    }

    // Authoritative damage calculation
    const rawDamage = Number(data.damage) || spec.min;
    const validatedDamage = Math.min(spec.max, Math.max(spec.min, rawDamage));

    targetSocket.playerData.health = Math.max(0, (targetSocket.playerData.health || 100) - validatedDamage);

    targetSocket.emit('player:damaged', {
      damage: validatedDamage,
      attacker: attacker ? attacker.username : 'Enemigo',
      remainingHealth: targetSocket.playerData.health
    });

    if (targetSocket.playerData.health <= 0) {
      io.emit('player:killed', {
        victimId: targetSocket.playerData.id,
        victimName: targetSocket.playerData.username,
        killerId: attacker ? attacker.id : null,
        killerName: attacker ? attacker.username : 'Desconocido',
        weapon: weaponKey
      });
      targetSocket.playerData.health = 100; // Reset for respawn
    }
  });

  // 5. Multi-Channel Chat System (Global, Proximity, Private, Group, Org)
  socket.on('chat:send', (data) => {
    const sender = connectedPlayers.get(socket.id);
    if (!sender) return;

    const channel = data.channel || 'global';
    const text = (data.text || '').slice(0, 150).trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messagePayload = {
      channel,
      senderId: sender.id,
      username: sender.username,
      text,
      time
    };

    if (channel === 'global') {
      io.emit('chat:broadcast', messagePayload);
    } else if (channel === 'proximity') {
      // Proximity check: Euclidean distance <= 30m
      const senderX = sender.x || 0;
      const senderZ = sender.z || 0;

      for (const [sId, p] of connectedPlayers) {
        const dx = (p.x || 0) - senderX;
        const dz = (p.z || 0) - senderZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= 30.0) {
          io.to(sId).emit('chat:broadcast', messagePayload);
        }
      }
    } else if (channel === 'private') {
      // Direct message
      const targetUser = data.targetUserId;
      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        s => s.playerData && (s.playerData.id === targetUser || s.playerData.username.toLowerCase() === (targetUser || '').toLowerCase())
      );

      if (targetSocket) {
        targetSocket.emit('chat:broadcast', messagePayload);
        socket.emit('chat:broadcast', messagePayload); // echo to sender
      } else {
        socket.emit('chat:system_alert', { message: `El usuario '${targetUser}' no está conectado.` });
      }
    } else if (channel === 'group') {
      // Heist crew channel
      const heist = Array.from(activeHeists.values()).find(h => h.members.some(m => m.userId === sender.id));
      if (heist) {
        for (const m of heist.members) {
          if (m.socketId) io.to(m.socketId).emit('chat:broadcast', messagePayload);
        }
      }
    } else if (channel === 'org') {
      // Organization channel
      if (sender.orgId) {
        for (const [sId, p] of connectedPlayers) {
          if (p.orgId === sender.orgId) {
            io.to(sId).emit('chat:broadcast', messagePayload);
          }
        }
      }
    }
  });

  // 6. Cooperative Heists Lobby & Synchronization
  socket.on('heist:create', (data) => {
    const leader = connectedPlayers.get(socket.id);
    if (!leader) return;

    const roomId = 'heist_' + Date.now();
    const heistData = {
      roomId,
      heistId: data.heistId || 'vault21',
      heistTitle: data.heistTitle || 'Atraco al Banco Central',
      leaderId: leader.id,
      leaderName: leader.username,
      totalLoot: data.totalLoot || 200000,
      state: 'LOBBY', // 'LOBBY', 'IN_PROGRESS', 'COMPLETED'
      members: [
        {
          userId: leader.id,
          username: leader.username,
          socketId: socket.id,
          role: 'Líder',
          cutPercent: 40,
          ready: true
        }
      ]
    };

    activeHeists.set(roomId, heistData);
    socket.emit('heist:lobby_state', heistData);
    console.log(`[Heist] ${leader.username} organizó el golpe '${heistData.heistTitle}'`);
  });

  socket.on('heist:invite', (data) => {
    const sender = connectedPlayers.get(socket.id);
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      s => s.playerData && (s.playerData.id === data.targetUserId || s.playerData.username.toLowerCase() === (data.targetUserId || '').toLowerCase())
    );

    if (targetSocket) {
      targetSocket.emit('heist:invitation_received', {
        roomId: data.roomId,
        heistTitle: data.heistTitle,
        leaderName: sender ? sender.username : 'Líder del Golpe'
      });
    }
  });

  socket.on('heist:join', (data) => {
    const heist = activeHeists.get(data.roomId);
    const player = connectedPlayers.get(socket.id);
    if (heist && player && heist.members.length < 6) {
      if (!heist.members.some(m => m.userId === player.id)) {
        heist.members.push({
          userId: player.id,
          username: player.username,
          socketId: socket.id,
          role: 'Combatiente',
          cutPercent: Math.floor(60 / heist.members.length),
          ready: false
        });
      }

      // Broadcast updated lobby
      for (const m of heist.members) {
        if (m.socketId) io.to(m.socketId).emit('heist:lobby_state', heist);
      }
    }
  });

  socket.on('heist:set_role', (data) => {
    const heist = activeHeists.get(data.roomId);
    if (heist) {
      const member = heist.members.find(m => m.userId === data.userId);
      if (member) {
        member.role = data.role;
        for (const m of heist.members) {
          if (m.socketId) io.to(m.socketId).emit('heist:lobby_state', heist);
        }
      }
    }
  });

  socket.on('heist:set_cuts', (data) => {
    const heist = activeHeists.get(data.roomId);
    const sender = connectedPlayers.get(socket.id);
    if (heist && sender && heist.leaderId === sender.id) {
      // Validate cuts sum to 100
      const totalCut = (data.cuts || []).reduce((acc, c) => acc + (parseInt(c.cutPercent, 10) || 0), 0);
      if (totalCut === 100) {
        for (const c of data.cuts) {
          const m = heist.members.find(mem => mem.userId === c.userId);
          if (m) m.cutPercent = c.cutPercent;
        }
        for (const m of heist.members) {
          if (m.socketId) io.to(m.socketId).emit('heist:lobby_state', heist);
        }
      }
    }
  });

  socket.on('heist:launch', (data) => {
    const heist = activeHeists.get(data.roomId);
    const sender = connectedPlayers.get(socket.id);
    if (heist && sender && heist.leaderId === sender.id) {
      heist.state = 'IN_PROGRESS';
      heist.currentPhase = 1;

      // Broadcast mission start to all squad members
      for (const m of heist.members) {
        if (m.socketId) {
          io.to(m.socketId).emit('heist:started', {
            roomId: heist.roomId,
            heistId: heist.heistId,
            heistTitle: heist.heistTitle,
            role: m.role,
            members: heist.members
          });
        }
      }
    }
  });

  socket.on('heist:phase_advance', (data) => {
    const heist = activeHeists.get(data.roomId);
    if (heist && heist.state === 'IN_PROGRESS') {
      heist.currentPhase = (heist.currentPhase || 1) + 1;
      for (const m of heist.members) {
        if (m.socketId) {
          io.to(m.socketId).emit('heist:phase_synced', {
            roomId: heist.roomId,
            currentPhase: heist.currentPhase,
            objective: data.nextObjective || `Fase ${heist.currentPhase} en curso`,
            waypoint: data.nextWaypoint || null
          });
        }
      }
    }
  });

  socket.on('heist:complete', async (data) => {
    const heist = activeHeists.get(data.roomId);
    if (!heist || heist.state === 'COMPLETED') return;

    heist.state = 'COMPLETED';

    // Calculate individual payout shares
    const crewShares = heist.members.map(m => ({
      userId: m.userId,
      username: m.username,
      role: m.role,
      cutPercent: m.cutPercent,
      shareAmount: Math.floor((heist.totalLoot * m.cutPercent) / 100)
    }));

    // Authoritative SQLite Loot Distribution
    await DatabaseManager.recordHeistLootDistribution(
      heist.heistId,
      heist.heistTitle,
      heist.leaderId,
      crewShares,
      heist.totalLoot
    );

    // Notify all squad members of success & their individual earnings
    for (const m of crewShares) {
      const memberSocket = Array.from(io.sockets.sockets.values()).find(
        s => s.playerData && s.playerData.id === m.userId
      );
      if (memberSocket) {
        memberSocket.emit('heist:payout_awarded', {
          heistTitle: heist.heistTitle,
          totalLoot: heist.totalLoot,
          myCut: m.shareAmount,
          role: m.role,
          crewShares
        });
      }
    }

    activeHeists.delete(data.roomId);
    console.log(`[Heist] ¡Golpe '${heist.heistTitle}' completado con éxito! Botín $${heist.totalLoot.toLocaleString()} repartido.`);
  });

  // 7. Disconnection
  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`[Multiplayer] ${player.username} se desconectó`);

      // Free vehicle if driving
      if (player.inVehicle && player.vehicleId) {
        activeVehicles.delete(player.vehicleId);
        io.emit('vehicle:vacated', { vehicleId: player.vehicleId, x: player.x, y: player.y, z: player.z });
      }

      connectedPlayers.delete(socket.id);
      io.emit('player:left', { socketId: socket.id, id: player.id });
      io.emit('social:online_count', connectedPlayers.size);
    }
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  ★ MILLION DOLLAR CITY — MULTIPLAYER ONLINE REAL-TIME SERVER ★`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`================================================================`);
});
