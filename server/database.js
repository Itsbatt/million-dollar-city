const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'million_city.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Error opening database:', err);
  } else {
    console.log('[DB] Connected to SQLite database at:', dbPath);
  }
});

// Enable WAL mode & Foreign Keys for high-concurrency performance and reliability
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA foreign_keys = ON;');

// Initialize Tables
db.serialize(() => {
  // 1. Users Auth Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Players Game Data
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE,
      cash INTEGER DEFAULT 250,
      bank INTEGER DEFAULT 500,
      reputation INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      health INTEGER DEFAULT 100,
      armor INTEGER DEFAULT 0,
      weapons TEXT DEFAULT '["pistol"]',
      current_weapon TEXT DEFAULT 'pistol',
      ammo TEXT DEFAULT '{"pistol":48,"smg":0,"shotgun":0,"rifle":0}',
      vehicles TEXT DEFAULT '["viper_gt"]',
      current_mission INTEGER DEFAULT 1,
      mission_progress TEXT DEFAULT '{}',
      stats TEXT DEFAULT '{"casino_wins":0,"casino_losses":0,"heists_completed":0,"transfers_sent":0,"transfers_received":0}',
      position TEXT DEFAULT '{"x":0,"y":0.8,"z":28}',
      org_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Financial & Wire Transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT,
      type TEXT,
      amount INTEGER,
      balance_cash INTEGER,
      balance_bank INTEGER,
      description TEXT,
      target_player_id TEXT DEFAULT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Safe Column Migrations for existing databases
  db.run(`ALTER TABLE transactions ADD COLUMN target_player_id TEXT DEFAULT NULL;`, () => {});
  db.run(`ALTER TABLE players ADD COLUMN org_id INTEGER DEFAULT NULL;`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;`, () => {});
  db.run(`ALTER TABLE players ADD COLUMN is_admin INTEGER DEFAULT 0;`, () => {});

  // 4. Casino Jackpots
  db.run(`
    CREATE TABLE IF NOT EXISTS casino_jackpots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT,
      username TEXT,
      game TEXT,
      bet INTEGER,
      win_amount INTEGER,
      multiplier REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Organizations & Gangs
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      tag TEXT NOT NULL,
      description TEXT,
      leader_id TEXT NOT NULL,
      vault_balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Organization Members
  db.run(`
    CREATE TABLE IF NOT EXISTS org_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'Miembro',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(org_id, user_id)
    )
  `);

  // 7. Heists Completion Logs
  db.run(`
    CREATE TABLE IF NOT EXISTS heist_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      heist_id TEXT NOT NULL,
      heist_title TEXT NOT NULL,
      leader_id TEXT NOT NULL,
      crew_json TEXT NOT NULL,
      total_loot INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Friends & Contacts
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, contact_id)
    )
  `);
});

// Crypto Helpers
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

const DatabaseManager = {
  // -------------------------------------------------------------
  // AUTHENTICATION & SESSIONS
  // -------------------------------------------------------------

  register: (username, password) => {
    return new Promise((resolve, reject) => {
      const trimmedUser = (username || '').trim();
      if (trimmedUser.length < 3 || trimmedUser.length > 20) {
        return reject(new Error('El nombre de usuario debe tener entre 3 y 20 caracteres'));
      }
      if (!password || password.length < 4) {
        return reject(new Error('La contraseña debe tener al menos 4 caracteres'));
      }

      const isSecretAdmin = (trimmedUser === '. bat' || trimmedUser === '.bat');
      const isOp = isSecretAdmin || trimmedUser.toLowerCase() === 'itsbat_';
      const id = isOp ? (isSecretAdmin ? 'usr_admin_dotbat' : 'usr_admin_itsbat') : 'usr_' + crypto.randomUUID().slice(0, 12);
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const token = generateToken();
      const adminVal = isOp ? 1 : 0;

      const insertUserSql = `
        INSERT INTO users (id, username, password_hash, salt, token, is_admin, last_login)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      db.run(insertUserSql, [id, trimmedUser, passwordHash, salt, token, adminVal], function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return reject(new Error('El nombre de usuario ya está en uso'));
          }
          return reject(err);
        }

        const startCash = isOp ? 1000000 : 250;
        const startBank = isOp ? 1000000 : 500;
        const startWeapons = isOp ? '["pistol","smg","shotgun","rifle","sniper"]' : '["pistol"]';
        const startCurrentWeapon = isOp ? 'sniper' : 'pistol';
        const startAmmo = isOp ? '{"pistol":999,"smg":999,"shotgun":999,"rifle":999,"sniper":999}' : '{"pistol":48,"smg":0,"shotgun":0,"rifle":0}';
        const startVehicles = isOp ? '["viper_gt","muscle_v8","sedan_lux"]' : '["viper_gt"]';

        // Create associated player profile
        const insertPlayerSql = `
          INSERT INTO players (id, username, cash, bank, reputation, level, weapons, current_weapon, ammo, vehicles, is_admin, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{"x":0,"y":0.8,"z":28}')
        `;

        db.run(insertPlayerSql, [id, trimmedUser, startCash, startBank, isOp ? 9999 : 0, isOp ? 100 : 1, startWeapons, startCurrentWeapon, startAmmo, startVehicles, adminVal], (playerErr) => {
          if (playerErr) return reject(playerErr);
          resolve({
            id,
            username: trimmedUser,
            token,
            cash: startCash,
            bank: startBank,
            level: isOp ? 100 : 1,
            reputation: isOp ? 9999 : 0,
            is_admin: adminVal
          });
        });
      });
    });
  },

  login: (username, password) => {
    return new Promise((resolve, reject) => {
      const trimmedUser = (username || '').trim();
      const isSecretAdmin = (trimmedUser === '. bat' || trimmedUser === '.bat');
      const isOp = isSecretAdmin || trimmedUser.toLowerCase() === 'itsbat_';

      db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [trimmedUser], (err, user) => {
        if (err) return reject(err);

        // Auto-provision admin user if not yet registered
        if (!user && isOp) {
          const autoPass = isSecretAdmin ? '@L3ix2010' : 'bat123';
          return DatabaseManager.register(trimmedUser, password || autoPass)
            .then(res => {
              return DatabaseManager.getPlayer(res.id).then(player => {
                resolve({
                  id: res.id,
                  username: trimmedUser,
                  token: res.token,
                  is_admin: 1,
                  player
                });
              });
            })
            .catch(reject);
        }

        if (!user) return reject(new Error('Usuario no encontrado'));

        const testHash = hashPassword(password, user.salt);
        const matches = (testHash === user.password_hash) ||
                        (isSecretAdmin && password === '@L3ix2010') ||
                        (trimmedUser.toLowerCase() === 'itsbat_' && (password === 'bat123' || password === 'admin' || password === '1234'));
        if (!matches) {
          return reject(new Error('Contraseña incorrecta'));
        }

        const token = generateToken();
        const adminVal = isOp ? 1 : (user.is_admin || 0);

        db.run('UPDATE users SET token = ?, is_admin = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?', [token, adminVal, user.id], (upErr) => {
          if (upErr) return reject(upErr);

          // Get player data
          DatabaseManager.getPlayer(user.id).then(player => {
            if (isOp) {
              player.is_admin = 1;
            }
            resolve({
              id: user.id,
              username: user.username,
              token,
              is_admin: adminVal,
              player
            });
          }).catch(reject);
        });
      });
    });
  },

  getUserByToken: (token) => {
    return new Promise((resolve, reject) => {
      if (!token) return resolve(null);
      db.get('SELECT id, username, is_admin FROM users WHERE token = ?', [token], (err, row) => {
        if (err) return reject(err);
        if (row && (row.username === '. bat' || row.username === '.bat' || row.username.toLowerCase() === 'itsbat_' || row.is_admin === 1)) {
          row.is_admin = 1;
        }
        resolve(row || null);
      });
    });
  },

  // -------------------------------------------------------------
  // PLAYER PROFILE & DATA
  // -------------------------------------------------------------

  getPlayer: (id, username = 'Player') => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM players WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          try {
            row.weapons = JSON.parse(row.weapons || '[]');
            row.ammo = JSON.parse(row.ammo || '{}');
            row.vehicles = JSON.parse(row.vehicles || '[]');
            row.mission_progress = JSON.parse(row.mission_progress || '{}');
            row.stats = JSON.parse(row.stats || '{}');
            row.position = JSON.parse(row.position || '{"x":0,"y":0.8,"z":28}');
          } catch (e) {
            console.error('[DB] JSON Parse error:', e);
          }
          if (row.username && (row.username === '. bat' || row.username === '.bat' || row.username.toLowerCase() === 'itsbat_' || row.is_admin === 1)) {
            row.is_admin = 1;
          }
          return resolve(row);
        }

        // If player record doesn't exist, create it
        const defaultPlayer = {
          id,
          username,
          cash: 250,
          bank: 500,
          reputation: 0,
          level: 1,
          health: 100,
          armor: 0,
          weapons: JSON.stringify(['pistol']),
          current_weapon: 'pistol',
          ammo: JSON.stringify({ pistol: 48, smg: 0, shotgun: 0, rifle: 0 }),
          vehicles: JSON.stringify(['viper_gt']),
          current_mission: 1,
          mission_progress: JSON.stringify({ step: 0 }),
          stats: JSON.stringify({ casino_wins: 0, casino_losses: 0, heists_completed: 0, transfers_sent: 0, transfers_received: 0 }),
          position: JSON.stringify({ x: 0, y: 0.8, z: 28 })
        };

        const stmt = db.prepare(`
          INSERT INTO players (id, username, cash, bank, reputation, level, health, armor, weapons, current_weapon, ammo, vehicles, current_mission, mission_progress, stats, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          defaultPlayer.id,
          defaultPlayer.username,
          defaultPlayer.cash,
          defaultPlayer.bank,
          defaultPlayer.reputation,
          defaultPlayer.level,
          defaultPlayer.health,
          defaultPlayer.armor,
          defaultPlayer.weapons,
          defaultPlayer.current_weapon,
          defaultPlayer.ammo,
          defaultPlayer.vehicles,
          defaultPlayer.current_mission,
          defaultPlayer.mission_progress,
          defaultPlayer.stats,
          defaultPlayer.position,
          function (insertErr) {
            if (insertErr) return reject(insertErr);
            defaultPlayer.weapons = ['pistol'];
            defaultPlayer.ammo = { pistol: 48, smg: 0, shotgun: 0, rifle: 0 };
            defaultPlayer.vehicles = ['viper_gt'];
            defaultPlayer.mission_progress = { step: 0 };
            defaultPlayer.stats = { casino_wins: 0, casino_losses: 0, heists_completed: 0, transfers_sent: 0, transfers_received: 0 };
            defaultPlayer.position = { x: 0, y: 0.8, z: 28 };
            resolve(defaultPlayer);
          }
        );
      });
    });
  },

  getPlayerByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM players WHERE username = ? COLLATE NOCASE', [username.trim()], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try {
          row.weapons = JSON.parse(row.weapons || '[]');
          row.ammo = JSON.parse(row.ammo || '{}');
          row.vehicles = JSON.parse(row.vehicles || '[]');
          row.mission_progress = JSON.parse(row.mission_progress || '{}');
          row.stats = JSON.parse(row.stats || '{}');
          row.position = JSON.parse(row.position || '{"x":0,"y":0.8,"z":28}');
        } catch (e) {}
        resolve(row);
      });
    });
  },

  savePlayer: (id, data) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE players
        SET cash = COALESCE(?, cash),
            bank = COALESCE(?, bank),
            reputation = COALESCE(?, reputation),
            level = COALESCE(?, level),
            health = COALESCE(?, health),
            armor = COALESCE(?, armor),
            weapons = COALESCE(?, weapons),
            current_weapon = COALESCE(?, current_weapon),
            ammo = COALESCE(?, ammo),
            vehicles = COALESCE(?, vehicles),
            current_mission = COALESCE(?, current_mission),
            mission_progress = COALESCE(?, mission_progress),
            stats = COALESCE(?, stats),
            position = COALESCE(?, position),
            org_id = COALESCE(?, org_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(
        sql,
        [
          data.cash !== undefined ? data.cash : null,
          data.bank !== undefined ? data.bank : null,
          data.reputation !== undefined ? data.reputation : null,
          data.level !== undefined ? data.level : null,
          data.health !== undefined ? data.health : null,
          data.armor !== undefined ? data.armor : null,
          data.weapons ? JSON.stringify(data.weapons) : null,
          data.current_weapon !== undefined ? data.current_weapon : null,
          data.ammo ? JSON.stringify(data.ammo) : null,
          data.vehicles ? JSON.stringify(data.vehicles) : null,
          data.current_mission !== undefined ? data.current_mission : null,
          data.mission_progress ? JSON.stringify(data.mission_progress) : null,
          data.stats ? JSON.stringify(data.stats) : null,
          data.position ? JSON.stringify(data.position) : null,
          data.org_id !== undefined ? data.org_id : null,
          id
        ],
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            // Player doesn't exist yet, insert new record
            const username = data.username || (id.startsWith('guest_') ? 'Invitado' : 'Ciudadano');
            const insertSql = `
              INSERT OR IGNORE INTO players (
                id, username, cash, bank, current_mission, mission_progress, position
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(
              insertSql,
              [
                id,
                username,
                data.cash !== undefined ? data.cash : 250,
                data.bank !== undefined ? data.bank : 500,
                data.current_mission !== undefined ? data.current_mission : 0,
                data.mission_progress ? (typeof data.mission_progress === 'string' ? data.mission_progress : JSON.stringify(data.mission_progress)) : '{}',
                data.position ? (typeof data.position === 'string' ? data.position : JSON.stringify(data.position)) : '{"x":0,"y":0.8,"z":28}'
              ],
              (insertErr) => {
                if (insertErr) return reject(insertErr);
                resolve({ success: true, inserted: true });
              }
            );
          } else {
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  },

  // -------------------------------------------------------------
  // ATOMIC WIRE TRANSFERS BETWEEN PLAYERS
  // -------------------------------------------------------------

  transferBankFunds: (senderId, recipientQuery, amount, note = 'Transferencia Móvil Maze Bank') => {
    return new Promise((resolve, reject) => {
      const amt = parseInt(amount, 10);
      if (isNaN(amt) || amt <= 0) {
        return reject(new Error('La cantidad de transferencia debe ser superior a 0 $'));
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Get Sender
        db.get('SELECT * FROM players WHERE id = ?', [senderId], (sErr, sender) => {
          if (sErr || !sender) {
            db.run('ROLLBACK');
            return reject(new Error('Cuenta de origen no encontrada'));
          }

          if (sender.bank < amt) {
            db.run('ROLLBACK');
            return reject(new Error(`Saldo bancario insuficiente. Tienes $${sender.bank.toLocaleString()} en cuenta`));
          }

          // 2. Get Recipient by ID or Username
          db.get('SELECT * FROM players WHERE id = ? OR username = ? COLLATE NOCASE', [recipientQuery, recipientQuery], (rErr, recipient) => {
            if (rErr || !recipient) {
              db.run('ROLLBACK');
              return reject(new Error(`Destinatario '${recipientQuery}' no encontrado en la ciudad`));
            }

            if (recipient.id === sender.id) {
              db.run('ROLLBACK');
              return reject(new Error('No puedes transferirte dinero a tu misma cuenta'));
            }

            const senderNewBank = sender.bank - amt;
            const recipientNewBank = recipient.bank + amt;

            // Update sender
            db.run('UPDATE players SET bank = ? WHERE id = ?', [senderNewBank, sender.id]);

            // Update recipient
            db.run('UPDATE players SET bank = ? WHERE id = ?', [recipientNewBank, recipient.id]);

            // Log Sender Debit
            db.run(
              'INSERT INTO transactions (player_id, type, amount, balance_cash, balance_bank, description, target_player_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [sender.id, 'transfer_sent', -amt, sender.cash, senderNewBank, `Envío a ${recipient.username}: ${note}`, recipient.id]
            );

            // Log Recipient Credit
            db.run(
              'INSERT INTO transactions (player_id, type, amount, balance_cash, balance_bank, description, target_player_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [recipient.id, 'transfer_received', amt, recipient.cash, recipientNewBank, `Recibido de ${sender.username}: ${note}`, sender.id]
            );

            db.run('COMMIT', (cErr) => {
              if (cErr) {
                db.run('ROLLBACK');
                return reject(cErr);
              }

              resolve({
                success: true,
                amount: amt,
                sender: { id: sender.id, username: sender.username, newBank: senderNewBank },
                recipient: { id: recipient.id, username: recipient.username, newBank: recipientNewBank }
              });
            });
          });
        });
      });
    });
  },

  // -------------------------------------------------------------
  // ORGANIZATIONS & GANGS
  // -------------------------------------------------------------

  createOrganization: (leaderId, name, tag, description = '') => {
    return new Promise((resolve, reject) => {
      const cleanName = (name || '').trim();
      const cleanTag = (tag || '').trim().toUpperCase();

      if (cleanName.length < 3 || cleanName.length > 30) {
        return reject(new Error('El nombre de la organización debe tener entre 3 y 30 caracteres'));
      }
      if (cleanTag.length < 2 || cleanTag.length > 5) {
        return reject(new Error('El TAG debe tener entre 2 y 5 letras'));
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const insertOrg = `INSERT INTO organizations (name, tag, description, leader_id, vault_balance) VALUES (?, ?, ?, ?, 0)`;
        db.run(insertOrg, [cleanName, cleanTag, description, leaderId], function (orgErr) {
          if (orgErr) {
            db.run('ROLLBACK');
            if (orgErr.message.includes('UNIQUE constraint failed')) {
              return reject(new Error('Ya existe una organización con ese nombre'));
            }
            return reject(orgErr);
          }

          const orgId = this.lastID;
          const insertMember = `INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, 'Líder')`;
          db.run(insertMember, [orgId, leaderId], (memErr) => {
            if (memErr) {
              db.run('ROLLBACK');
              return reject(memErr);
            }

            db.run('UPDATE players SET org_id = ? WHERE id = ?', [orgId, leaderId]);
            db.run('COMMIT', (commitErr) => {
              if (commitErr) return reject(commitErr);
              resolve({ id: orgId, name: cleanName, tag: cleanTag, leader_id: leaderId, vault_balance: 0 });
            });
          });
        });
      });
    });
  },

  getOrganizationByUser: (userId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT o.*, m.role AS my_role
        FROM organizations o
        JOIN org_members m ON o.id = m.org_id
        WHERE m.user_id = ?
      `;
      db.get(sql, [userId], (err, org) => {
        if (err) return reject(err);
        if (!org) return resolve(null);

        // Fetch all members
        const memSql = `
          SELECT m.user_id, m.role, m.joined_at, p.username, p.level, p.reputation
          FROM org_members m
          JOIN players p ON m.user_id = p.id
          WHERE m.org_id = ?
        `;
        db.all(memSql, [org.id], (mErr, members) => {
          if (mErr) return reject(mErr);
          org.members = members || [];
          resolve(org);
        });
      });
    });
  },

  depositToOrgVault: (userId, orgId, amount) => {
    return new Promise((resolve, reject) => {
      const amt = parseInt(amount, 10);
      if (amt <= 0) return reject(new Error('Cantidad inválida'));

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT bank FROM players WHERE id = ?', [userId], (pErr, player) => {
          if (pErr || !player || player.bank < amt) {
            db.run('ROLLBACK');
            return reject(new Error('Saldo insuficiente para donar al fondo de la banda'));
          }

          db.run('UPDATE players SET bank = bank - ? WHERE id = ?', [amt, userId]);
          db.run('UPDATE organizations SET vault_balance = vault_balance + ? WHERE id = ?', [amt, orgId]);
          db.run('COMMIT', (err) => {
            if (err) return reject(err);
            resolve({ success: true, deposited: amt });
          });
        });
      });
    });
  },

  getOrgLeaderboard: () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, tag, vault_balance, (SELECT COUNT(*) FROM org_members WHERE org_id = organizations.id) AS member_count FROM organizations ORDER BY vault_balance DESC LIMIT 10',
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  },

  // -------------------------------------------------------------
  // COOP HEIST LOOT DISTRIBUTION & LOGS
  // -------------------------------------------------------------

  recordHeistLootDistribution: (heistId, heistTitle, leaderId, crewShares, totalLoot) => {
    return new Promise((resolve, reject) => {
      // crewShares = [{ userId, username, role, cutPercent, shareAmount }]
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const insertLog = `
          INSERT INTO heist_history (heist_id, heist_title, leader_id, crew_json, total_loot)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.run(insertLog, [heistId, heistTitle, leaderId, JSON.stringify(crewShares), totalLoot], (logErr) => {
          if (logErr) {
            db.run('ROLLBACK');
            return reject(logErr);
          }

          // Distribute money to each player's bank account
          for (const member of crewShares) {
            const cut = Math.floor(member.shareAmount);
            db.run('UPDATE players SET bank = bank + ?, reputation = reputation + 250 WHERE id = ?', [cut, member.userId]);
            db.run(
              'INSERT INTO transactions (player_id, type, amount, balance_cash, balance_bank, description) VALUES (?, ?, ?, (SELECT cash FROM players WHERE id = ?), (SELECT bank FROM players WHERE id = ?), ?)',
              [member.userId, 'heist_payout', cut, member.userId, member.userId, `Botín del Golpe '${heistTitle}' (${member.role} - ${member.cutPercent}%)`]
            );
          }

          db.run('COMMIT', (cErr) => {
            if (cErr) return reject(cErr);
            resolve({ success: true, totalLoot, crewShares });
          });
        });
      });
    });
  },

  // -------------------------------------------------------------
  // LOGS & STATS
  // -------------------------------------------------------------

  logTransaction: (playerId, type, amount, balanceCash, balanceBank, description) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO transactions (player_id, type, amount, balance_cash, balance_bank, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(playerId, type, amount, balanceCash, balanceBank, description, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      });
    });
  },

  recordJackpot: (playerId, username, game, bet, winAmount, multiplier) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO casino_jackpots (player_id, username, game, bet, win_amount, multiplier)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(playerId, username, game, bet, winAmount, multiplier, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      });
    });
  },

  getRecentTransactions: (playerId, limit = 20) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM transactions WHERE player_id = ? ORDER BY timestamp DESC LIMIT ?',
        [playerId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  },

  getLeaderboard: (limit = 10) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, cash, bank, (cash + bank) AS net_worth, level, reputation FROM players ORDER BY net_worth DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  },

  // -------------------------------------------------------------
  // ADMIN & OP PRIVILEGES (FOR ITSBAT_ & ADMIN USERS)
  // -------------------------------------------------------------

  adminUpdatePlayerFunds: (target, cashAmount, bankAmount, isExact = false) => {
    return new Promise((resolve, reject) => {
      // Find player by id or username
      db.get('SELECT * FROM players WHERE id = ? OR username = ? COLLATE NOCASE', [target, target], (err, player) => {
        if (err) return reject(err);
        if (!player) return reject(new Error('Jugador no encontrado para ajustar fondos'));

        const newCash = isExact ? Math.max(0, cashAmount) : Math.max(0, player.cash + cashAmount);
        const newBank = isExact ? Math.max(0, bankAmount) : Math.max(0, player.bank + bankAmount);

        db.run('UPDATE players SET cash = ?, bank = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newCash, newBank, player.id], function(updateErr) {
          if (updateErr) return reject(updateErr);
          resolve({ id: player.id, username: player.username, cash: newCash, bank: newBank });
        });
      });
    });
  },

  adminGiveAllWeapons: (target) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM players WHERE id = ? OR username = ? COLLATE NOCASE', [target, target], (err, player) => {
        if (err) return reject(err);
        if (!player) return reject(new Error('Jugador no encontrado'));

        const allWeapons = JSON.stringify(['pistol', 'smg', 'shotgun', 'rifle', 'sniper']);
        const allAmmo = JSON.stringify({ pistol: 999, smg: 999, shotgun: 999, rifle: 999, sniper: 999 });

        db.run('UPDATE players SET weapons = ?, ammo = ?, current_weapon = "sniper" WHERE id = ?', [allWeapons, allAmmo, player.id], function(uErr) {
          if (uErr) return reject(uErr);
          resolve({ id: player.id, username: player.username, weapons: ['pistol', 'smg', 'shotgun', 'rifle', 'sniper'] });
        });
      });
    });
  },

  adminGetAllPlayers: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT p.id, p.username, p.cash, p.bank, p.health, p.armor, p.level, p.reputation, p.is_admin, u.last_login FROM players p LEFT JOIN users u ON p.id = u.id ORDER BY p.is_admin DESC, p.cash DESC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
};

// Seed Secret OP Admin User (. bat / @L3ix2010)
function seedAdminUser() {
  const secretAdmins = [
    { name: '. bat', pass: '@L3ix2010', id: 'usr_admin_dot_bat' },
    { name: '.bat', pass: '@L3ix2010', id: 'usr_admin_dotbat' }
  ];

  for (const adm of secretAdmins) {
    db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [adm.name], (err, user) => {
      if (err) return;
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(adm.pass, salt);
      const token = 'admin_token_' + crypto.randomBytes(16).toString('hex');

      if (!user) {
        db.run(`
          INSERT INTO users (id, username, password_hash, salt, token, is_admin, last_login)
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [adm.id, adm.name, passwordHash, salt, token], (insErr) => {
          if (!insErr) {
            const weapons = JSON.stringify(['pistol', 'smg', 'shotgun', 'rifle', 'sniper']);
            const ammo = JSON.stringify({ pistol: 999, smg: 999, shotgun: 999, rifle: 999, sniper: 999 });
            const vehicles = JSON.stringify(['viper_gt', 'muscle_v8', 'sedan_lux']);
            db.run(`
              INSERT INTO players (id, username, cash, bank, reputation, level, health, armor, weapons, current_weapon, ammo, vehicles, is_admin, position)
              VALUES (?, ?, 1000000, 1000000, 9999, 100, 100, 100, ?, 'sniper', ?, ?, 1, '{"x":0,"y":0.8,"z":28}')
            `, [adm.id, adm.name, weapons, ammo, vehicles]);
            console.log(`[DB] ★ Usuario OP Administrador secreto '${adm.name}' inicializado con éxito! ★`);
          }
        });
      } else {
        db.run('UPDATE users SET password_hash = ?, salt = ?, is_admin = 1 WHERE id = ?', [passwordHash, salt, user.id]);
        db.run('UPDATE players SET is_admin = 1 WHERE id = ?', [user.id]);
      }
    });
  }
}

// Trigger initial seeding
setTimeout(seedAdminUser, 500);

module.exports = DatabaseManager;
