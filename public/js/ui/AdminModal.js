export class AdminModal {
  constructor(game, economy, player, weapons, police, network) {
    this.game = game;
    this.economy = economy;
    this.player = player;
    this.weapons = weapons;
    this.police = police;
    this.network = network;

    this.isOpen = false;
    this.modal = null;
    this.adminPill = null;

    this.createDomElements();
    this.bindEvents();
  }

  createDomElements() {
    // Top HUD Admin Pill
    this.adminPill = document.createElement('button');
    this.adminPill.id = 'hud-admin-pill';
    this.adminPill.className = 'hud-admin-pill';
    this.adminPill.innerHTML = '<span>⚡</span> <b>OP ADMIN</b> <small>[F2]</small>';
    this.adminPill.style.display = 'none'; // hidden until admin verified
    document.querySelector('.hud-top-center')?.appendChild(this.adminPill);

    this.adminPill.addEventListener('click', () => this.toggle());

    // Master Modal Container
    this.modal = document.createElement('div');
    this.modal.id = 'admin-modal';
    this.modal.className = 'game-modal admin-modal-backdrop';

    this.modal.innerHTML = `
      <div class="modal-content-panel admin-panel-box">
        <div class="modal-header admin-panel-header">
          <div class="admin-header-title">
            <span class="admin-badge">OP ACCESS</span>
            <h2>⚡ PANEL DE CONTROL MAESTRO - ADMINISTRADOR</h2>
          </div>
          <button class="modal-close-btn" id="admin-close-btn">&times;</button>
        </div>

        <div class="admin-panel-subbar">
          <span>USUARIO AUTORIZADO: <b id="admin-user-tag" style="color:var(--primary-gold);">Itsbat_ [OP]</b></span>
          <span>ESTADO DEL SERVIDOR: <b style="color:var(--neon-green);">ONLINE 1.21.1 AUTORITATIVO</b></span>
          <span style="color:#aaa;">Atajo directo: Tecla [F2]</span>
        </div>

        <!-- Navigation Tabs -->
        <div class="admin-tabs-nav">
          <button class="admin-tab-btn active" data-tab="money">💰 FINANZAS ($)</button>
          <button class="admin-tab-btn" data-tab="godmode">🛡️ DIOS & PODERES</button>
          <button class="admin-tab-btn" data-tab="teleport">📍 TELETRANSPORTE</button>
          <button class="admin-tab-btn" data-tab="weapons">🔫 ARSENAL TOTAL</button>
          <button class="admin-tab-btn" data-tab="vehicles">🏎️ VEHÍCULOS</button>
          <button class="admin-tab-btn" data-tab="players">👥 JUGADORES</button>
        </div>

        <!-- Tab 1: Money & Economy -->
        <div class="admin-tab-content active" id="tab-admin-money">
          <h3 class="admin-section-title">GESTIÓN AUTORITATIVA DE FONDOS</h3>
          <p class="admin-hint">Inyecta o retira fondos directamente en la base de datos persistente SQLite.</p>
          
          <div class="admin-grid-buttons">
            <button class="admin-action-btn gold" id="adm-cash-10k">+10,000 $ Efectivo</button>
            <button class="admin-action-btn gold" id="adm-cash-100k">+100,000 $ Efectivo</button>
            <button class="admin-action-btn gold-glow" id="adm-cash-1m">★ +1,000,000 $ (MILLONARIO) ★</button>
            <button class="admin-action-btn gold-glow" id="adm-cash-10m">💎 +10,000,000 $ (MAGNATE) 💎</button>
            <button class="admin-action-btn cyan" id="adm-bank-100k">+100,000 $ Banco</button>
            <button class="admin-action-btn cyan" id="adm-bank-1m">+1,000,000 $ Banco</button>
            <button class="admin-action-btn danger" id="adm-cash-zero">Arruinar Efectivo ($0)</button>
            <button class="admin-action-btn danger" id="adm-bank-zero">Arruinar Banco ($0)</button>
          </div>

          <div class="admin-custom-input-row">
            <input type="number" id="admin-custom-amount" placeholder="Cantidad exacta..." min="0" step="1000" class="admin-input-field">
            <button class="admin-action-btn green" id="adm-set-cash-exact">Fijar Efectivo Exacto</button>
            <button class="admin-action-btn green" id="adm-set-bank-exact">Fijar Banco Exacto</button>
          </div>
        </div>

        <!-- Tab 2: Godmode & Superpowers -->
        <div class="admin-tab-content" id="tab-admin-godmode">
          <h3 class="admin-section-title">SUPERPODERES & MODO DIOS</h3>
          
          <div class="admin-toggle-row">
            <div class="admin-toggle-info">
              <b>Modo Dios (Invencibilidad Absoluta)</b>
              <small>Vida y armadura a 99,999. Inmunidad a disparos, caídas, atropellos y explosiones.</small>
            </div>
            <button class="admin-switch-btn" id="adm-toggle-godmode">ACTIVAR</button>
          </div>

          <div class="admin-toggle-row">
            <div class="admin-toggle-info">
              <b>Munición Infinita Sin Recarga</b>
              <small>Dispara continuamente sin gastar balas ni tiempo de recarga.</small>
            </div>
            <button class="admin-switch-btn" id="adm-toggle-infinite-ammo">ACTIVAR</button>
          </div>

          <div class="admin-toggle-row">
            <div class="admin-toggle-info">
              <b>Super Velocidad Flash (Sprint x2.5)</b>
              <small>Corre a velocidad supersónica por la ciudad y dentro de edificios.</small>
            </div>
            <button class="admin-switch-btn" id="adm-toggle-superspeed">ACTIVAR</button>
          </div>

          <h4 style="margin-top:16px; margin-bottom:8px; color:var(--primary-gold);">CONTROL POLICIAL (ESTRELLAS DE BÚSQUEDA)</h4>
          <div class="admin-grid-buttons">
            <button class="admin-action-btn green" id="adm-police-0">Limpiar Policía (0 ★)</button>
            <button class="admin-action-btn danger" id="adm-police-1">1 ★ Sospechoso</button>
            <button class="admin-action-btn danger" id="adm-police-3">3 ★ SWAT & Persecución</button>
            <button class="admin-action-btn danger-glow" id="adm-police-5">5 ★ MÁXIMA ALERTA MILITAR</button>
          </div>
        </div>

        <!-- Tab 3: Instant Teleport -->
        <div class="admin-tab-content" id="tab-admin-teleport">
          <h3 class="admin-section-title">TELETRANSPORTE INSTANTÁNEO</h3>
          <p class="admin-hint">Salta instantáneamente a cualquier punto clave de Million Dollar City sin pantallas de carga.</p>

          <div class="admin-grid-buttons">
            <button class="admin-action-btn gold" data-tp="casino_ext">🎰 Casino The Royal Mirage (Alfombra Roja)</button>
            <button class="admin-action-btn gold-glow" data-tp="casino_int">💎 Casino Interior (Sala de Tragaperras)</button>
            <button class="admin-action-btn gold" data-tp="casino_vip">👑 Casino Interior (Sala VIP High Roller)</button>
            <button class="admin-action-btn cyan" data-tp="bank_ext">🏛️ Banco Central Vault 21 (Entrada)</button>
            <button class="admin-action-btn cyan-glow" data-tp="bank_vault">💰 Banco Vault 21 (Bóveda Blindada)</button>
            <button class="admin-action-btn danger" data-tp="armory">🔫 Ammu-Nation (Tienda de Armas)</button>
            <button class="admin-action-btn cyan" data-tp="strip_center">🌆 Diamond Strip (Centro Avenida)</button>
            <button class="admin-action-btn cyan" data-tp="police_hq">🚨 Comisaría de Policía Central</button>
            <button class="admin-action-btn gold" data-tp="penthouse">🍾 Ático / Penthouse Presidencial</button>
          </div>
        </div>

        <!-- Tab 4: Weapons & Arsenal -->
        <div class="admin-tab-content" id="tab-admin-weapons">
          <h3 class="admin-section-title">ARSENAL OP COMPLETO</h3>
          <p class="admin-hint">Desbloquea instantáneamente todas las armas de combate con munición al máximo (999 balas).</p>

          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <button class="admin-action-btn gold-glow" style="flex:1; padding:16px;" id="adm-unlock-all-weapons">
              ★ DESBLOQUEAR TODAS LAS ARMAS + MUNICIÓN COMPLETA (999) ★
            </button>
          </div>

          <div class="admin-grid-buttons">
            <button class="admin-action-btn cyan" id="adm-equip-pistol">Equipar Pistola 9mm</button>
            <button class="admin-action-btn cyan" id="adm-equip-smg">Equipar Subfusil SMG</button>
            <button class="admin-action-btn cyan" id="adm-equip-shotgun">Equipar Escopeta Remington</button>
            <button class="admin-action-btn cyan" id="adm-equip-rifle">Equipar Rifle M4 Carbine</button>
            <button class="admin-action-btn gold-glow" id="adm-equip-sniper">Equipar Francotirador Barret .50</button>
          </div>
        </div>

        <!-- Tab 5: Vehicles Spawn -->
        <div class="admin-tab-content" id="tab-admin-vehicles">
          <h3 class="admin-section-title">SPAWN DE VEHÍCULOS VIP</h3>
          <p class="admin-hint">Haz aparecer coches deportivos y vehículos ejecutivos justo al lado de tu posición.</p>

          <div class="admin-grid-buttons">
            <button class="admin-action-btn gold-glow" id="adm-spawn-viper">🏎️ Supercar Viper GT (Dorado VIP)</button>
            <button class="admin-action-btn danger" id="adm-spawn-muscle">🔥 Muscle Car V8 Turbo</button>
            <button class="admin-action-btn cyan" id="adm-spawn-sedan">🚗 Sedan Ejecutivo Negro</button>
            <button class="admin-action-btn green" id="adm-repair-car">🔧 Reparar Coche Actual</button>
          </div>
        </div>

        <!-- Tab 6: Online Players -->
        <div class="admin-tab-content" id="tab-admin-players">
          <h3 class="admin-section-title">JUGADORES EN EL SERVIDOR</h3>
          <div class="admin-players-table-wrapper">
            <table class="admin-players-table" id="admin-players-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Efectivo</th>
                  <th>Banco</th>
                  <th>Nivel</th>
                  <th>Rango</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="admin-players-tbody">
                <tr><td colspan="6" style="text-align:center; color:#888;">Cargando jugadores...</td></tr>
              </tbody>
            </table>
          </div>
          <button class="admin-action-btn cyan" style="margin-top:12px;" id="adm-refresh-players">↻ Actualizar Lista</button>
        </div>

      </div>
    `;

    document.body.appendChild(this.modal);
  }

  bindEvents() {
    // F2 Key Listener
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        e.preventDefault();
        if (this.economy.isAdmin || this.economy.username?.toLowerCase() === 'itsbat_') {
          this.toggle();
        } else {
          this.showToast('⚡ Requiere privilegios OP (Inicia sesión como Itsbat_)');
        }
      }
    });

    // Listen for admin status update
    window.addEventListener('admin:status_changed', (e) => {
      if (e.detail?.isAdmin) {
        this.adminPill.style.display = 'flex';
        const tag = document.getElementById('admin-user-tag');
        if (tag) tag.textContent = `${this.economy.username} [OP]`;
      } else {
        this.adminPill.style.display = 'none';
      }
    });

    // Close button
    document.getElementById('admin-close-btn')?.addEventListener('click', () => this.close());

    // Click backdrop
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Tab Navigation
    this.modal.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.modal.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        this.modal.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = `tab-admin-${btn.dataset.tab}`;
        document.getElementById(targetId)?.classList.add('active');

        if (btn.dataset.tab === 'players') {
          this.refreshPlayersTable();
        }
      });
    });

    // Money Actions
    document.getElementById('adm-cash-10k')?.addEventListener('click', () => this.addMoney(10000, 0));
    document.getElementById('adm-cash-100k')?.addEventListener('click', () => this.addMoney(100000, 0));
    document.getElementById('adm-cash-1m')?.addEventListener('click', () => this.addMoney(1000000, 0));
    document.getElementById('adm-cash-10m')?.addEventListener('click', () => this.addMoney(10000000, 0));
    document.getElementById('adm-bank-100k')?.addEventListener('click', () => this.addMoney(0, 100000));
    document.getElementById('adm-bank-1m')?.addEventListener('click', () => this.addMoney(0, 1000000));
    document.getElementById('adm-cash-zero')?.addEventListener('click', () => this.setMoneyExact(0, null));
    document.getElementById('adm-bank-zero')?.addEventListener('click', () => this.setMoneyExact(null, 0));

    document.getElementById('adm-set-cash-exact')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('admin-custom-amount')?.value, 10);
      if (!isNaN(val)) this.setMoneyExact(val, null);
    });

    document.getElementById('adm-set-bank-exact')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('admin-custom-amount')?.value, 10);
      if (!isNaN(val)) this.setMoneyExact(null, val);
    });

    // Superpowers
    const godBtn = document.getElementById('adm-toggle-godmode');
    godBtn?.addEventListener('click', () => {
      this.player.isGodMode = !this.player.isGodMode;
      if (this.player.isGodMode) {
        this.player.health = 99999;
        this.player.maxHealth = 99999;
        this.player.armor = 99999;
        this.player.maxArmor = 99999;
        godBtn.textContent = 'DESACTIVAR';
        godBtn.classList.add('active');
        this.showToast('🛡️ Modo Dios ACTIVADO (Inmortalidad)');
      } else {
        this.player.health = 100;
        this.player.maxHealth = 100;
        this.player.armor = 100;
        this.player.maxArmor = 100;
        godBtn.textContent = 'ACTIVAR';
        godBtn.classList.remove('active');
        this.showToast('Modo Dios Desactivado');
      }
    });

    const ammoBtn = document.getElementById('adm-toggle-infinite-ammo');
    ammoBtn?.addEventListener('click', () => {
      this.weapons.infiniteAmmo = !this.weapons.infiniteAmmo;
      if (this.weapons.infiniteAmmo) {
        ammoBtn.textContent = 'DESACTIVAR';
        ammoBtn.classList.add('active');
        this.showToast('⚡ Munición Infinita ACTIVADA');
      } else {
        ammoBtn.textContent = 'ACTIVAR';
        ammoBtn.classList.remove('active');
        this.showToast('Munición Infinita Desactivada');
      }
    });

    const speedBtn = document.getElementById('adm-toggle-superspeed');
    speedBtn?.addEventListener('click', () => {
      this.player.isSuperSpeed = !this.player.isSuperSpeed;
      if (this.player.isSuperSpeed) {
        this.player.runSpeed = 22.0;
        this.player.walkSpeed = 10.0;
        speedBtn.textContent = 'DESACTIVAR';
        speedBtn.classList.add('active');
        this.showToast('⚡ Super Velocidad ACTIVADA (x2.5)');
      } else {
        this.player.runSpeed = 8.6;
        this.player.walkSpeed = 4.2;
        speedBtn.textContent = 'ACTIVAR';
        speedBtn.classList.remove('active');
        this.showToast('Super Velocidad Desactivada');
      }
    });

    // Police Wanted Level
    document.getElementById('adm-police-0')?.addEventListener('click', () => {
      this.police.setWantedLevel(0);
      this.showToast('🚨 Nivel policial limpio (0 ★)');
    });
    document.getElementById('adm-police-1')?.addEventListener('click', () => this.police.setWantedLevel(1));
    document.getElementById('adm-police-3')?.addEventListener('click', () => this.police.setWantedLevel(3));
    document.getElementById('adm-police-5')?.addEventListener('click', () => {
      this.police.setWantedLevel(5);
      this.showToast('🚨 ¡MÁXIMA ALERTA POLICIAL 5 ESTRELLAS!');
    });

    // Teleportation Destinations
    this.modal.querySelectorAll('[data-tp]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.teleportTo(btn.dataset.tp);
      });
    });

    // Weapon Arsenal
    document.getElementById('adm-unlock-all-weapons')?.addEventListener('click', async () => {
      for (const wId in this.weapons.weapons) {
        this.weapons.weapons[wId].reserveAmmo = 999;
        this.weapons.weapons[wId].currentAmmo = this.weapons.weapons[wId].magSize;
      }
      this.weapons.equip('sniper');
      await this.economy.adminUnlockAllWeapons();
      this.showToast('🔫 ¡Arsenal Completo Desbloqueado con 999 balas!');
    });

    document.getElementById('adm-equip-pistol')?.addEventListener('click', () => this.weapons.equip('pistol'));
    document.getElementById('adm-equip-smg')?.addEventListener('click', () => this.weapons.equip('smg'));
    document.getElementById('adm-equip-shotgun')?.addEventListener('click', () => this.weapons.equip('shotgun'));
    document.getElementById('adm-equip-rifle')?.addEventListener('click', () => this.weapons.equip('rifle'));
    document.getElementById('adm-equip-sniper')?.addEventListener('click', () => this.weapons.equip('sniper'));

    // Vehicle Spawns
    document.getElementById('adm-spawn-viper')?.addEventListener('click', () => {
      this.game.valetSpawnPlayerCar('supercar');
      this.showToast('🏎️ Supercar Viper GT VIP Spawneado al lado');
    });

    document.getElementById('adm-spawn-muscle')?.addEventListener('click', () => {
      this.game.valetSpawnPlayerCar('muscle');
      this.showToast('🔥 Muscle Car V8 Spawneado al lado');
    });

    document.getElementById('adm-spawn-sedan')?.addEventListener('click', () => {
      this.game.valetSpawnPlayerCar('sedan');
      this.showToast('🚗 Sedan Ejecutivo Spawneado al lado');
    });

    document.getElementById('adm-repair-car')?.addEventListener('click', () => {
      if (this.player.inVehicle && this.player.currentVehicle) {
        this.player.currentVehicle.damage = 0;
        this.showToast('🔧 Vehículo reparado al 100%');
      } else {
        this.showToast('No estás dentro de ningún vehículo');
      }
    });

    document.getElementById('adm-refresh-players')?.addEventListener('click', () => {
      this.refreshPlayersTable();
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.modal.classList.add('visible');
    document.body.classList.add('ui-active');
    document.exitPointerLock?.();
  }

  close() {
    this.isOpen = false;
    this.modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  async addMoney(cash, bank) {
    const res = await this.economy.adminGiveMoney(cash, bank, false);
    if (res.success) {
      this.showToast(`✓ Dinero añadido: +$${cash.toLocaleString()} Efectivo, +$${bank.toLocaleString()} Banco`);
    } else {
      this.showToast('Error: ' + res.error);
    }
  }

  async setMoneyExact(cash, bank) {
    const res = await this.economy.adminGiveMoney(cash !== null ? cash : this.economy.cash, bank !== null ? bank : this.economy.bank, true);
    if (res.success) {
      this.showToast(`✓ Fondos ajustados exactamente a $${(cash || 0).toLocaleString()}`);
    }
  }

  teleportTo(dest) {
    const coords = {
      casino_ext: { x: -16.0, y: 0.8, z: 35.0, zone: 'CITY' },
      casino_int: { x: 0, y: -119.15, z: 20.0, zone: 'CASINO_INTERIOR' },
      casino_vip: { x: -18.0, y: -118.8, z: -20.0, zone: 'CASINO_INTERIOR' },
      bank_ext: { x: 23.0, y: 0.8, z: 30.0, zone: 'CITY' },
      bank_vault: { x: 23.0, y: 0.8, z: 22.0, zone: 'CITY' },
      armory: { x: 28.0, y: 0.8, z: -45.0, zone: 'CITY' },
      strip_center: { x: 0, y: 0.8, z: 0, zone: 'CITY' },
      police_hq: { x: -25.0, y: 0.8, z: -35.0, zone: 'CITY' },
      penthouse: { x: -28.0, y: 55.0, z: 35.0, zone: 'CITY' }
    };

    const target = coords[dest];
    if (!target) return;

    if (target.zone !== this.game.currentZone) {
      if (target.zone === 'CASINO_INTERIOR') {
        this.game.enterCasino();
      } else {
        this.game.exitCasino();
      }
    }

    this.player.position.set(target.x, target.y, target.z);
    this.player.mesh.position.copy(this.player.position);
    this.player.velocity.set(0, 0, 0);
    this.game.cameraManager.snapToTarget(this.player);

    this.showToast(`📍 Teletransportado a: ${dest}`);
    this.close();
  }

  async refreshPlayersTable() {
    const tbody = document.getElementById('admin-players-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">Cargando...</td></tr>';

    const players = await this.economy.adminFetchPlayers();
    if (!players || players.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No hay otros jugadores registrados</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    for (const p of players) {
      const tr = document.createElement('tr');
      const isOp = p.username.toLowerCase() === 'itsbat_' || p.is_admin === 1;
      tr.innerHTML = `
        <td><b>${p.username}</b></td>
        <td style="color:var(--neon-green); font-family:monospace;">$${(p.cash || 0).toLocaleString()}</td>
        <td style="color:var(--primary-cyan); font-family:monospace;">$${(p.bank || 0).toLocaleString()}</td>
        <td>Nv.${p.level || 1}</td>
        <td><span class="admin-user-pill ${isOp ? 'op' : 'player'}">${isOp ? 'OP ADMIN' : 'CIUDADANO'}</span></td>
        <td>
          <button class="admin-mini-btn gold" data-give="${p.username}">+$50k</button>
        </td>
      `;

      tr.querySelector('[data-give]')?.addEventListener('click', async () => {
        await fetch('/api/admin/funds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callerToken: this.economy.token,
            target: p.username,
            cashDelta: 50000,
            bankDelta: 0
          })
        });
        this.showToast(`+$50,000 enviados a ${p.username}`);
        this.refreshPlayersTable();
      });

      tbody.appendChild(tr);
    }
  }

  showToast(text) {
    let toast = document.querySelector('.admin-toast-alert');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'admin-toast-alert';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2800);
  }
}
