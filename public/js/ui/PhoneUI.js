import AudioManager from '../engine/AudioManager.js';

export class PhoneUI {
  constructor(economyManager, player, networkClient, vehicleSpawner) {
    this.economy = economyManager;
    this.player = player;
    this.network = networkClient;
    this.vehicleSpawner = vehicleSpawner;

    this.isOpen = false;
    this.currentApp = 'home';
    this.activeChatChannel = 'global';
    this.selectedDmRecipient = null;

    // GPS Map state
    this.mapZoom = 1.0;
    this.mapCenter = { x: 0, z: 0 };
    this.mapWaypoints = [];
    this.hoveredLandmark = null;

    this.phoneContainer = document.getElementById('smartphone-container');
    this.notificationBadge = document.getElementById('phone-notif-banner');

    this.initEvents();
    this.initMapEvents();
  }

  initMapEvents() {
    document.getElementById('map-zoom-in-btn')?.addEventListener('click', () => {
      this.mapZoom = Math.min(2.5, this.mapZoom + 0.3);
      this.renderGpsMap();
    });

    document.getElementById('map-zoom-out-btn')?.addEventListener('click', () => {
      this.mapZoom = Math.max(0.6, this.mapZoom - 0.3);
      this.renderGpsMap();
    });

    document.getElementById('map-recenter-btn')?.addEventListener('click', () => {
      const pos = this.player.getPosition();
      this.mapCenter = { x: pos.x, z: pos.z };
      this.mapZoom = 1.0;
      this.renderGpsMap();
    });

    const canvas = document.getElementById('phone-map-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.handleMapHover(mouseX, mouseY);
    });

    canvas.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('map-tooltip');
      if (tooltip) tooltip.style.display = 'none';
      this.hoveredLandmark = null;
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.handleMapClick(mouseX, mouseY);
    });
  }

  initEvents() {
    // 1. Navigation through App Icons
    document.querySelectorAll('.phone-app-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        const app = icon.dataset.app;
        this.openApp(app);
      });
    });

    // 2. Home Navigation Pill & Back Buttons
    document.getElementById('phone-home-btn')?.addEventListener('click', () => {
      this.openApp('home');
    });

    document.querySelectorAll('.phone-back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openApp('home');
      });
    });

    // 3. Bank App: Transfer Submission
    document.getElementById('phone-transfer-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recipient = document.getElementById('phone-transfer-recipient').value.trim();
      const amount = parseInt(document.getElementById('phone-transfer-amount').value, 10);
      const note = document.getElementById('phone-transfer-note').value.trim();
      const statusEl = document.getElementById('phone-transfer-status');

      if (!recipient || isNaN(amount) || amount <= 0) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff3344">Datos de transferencia inválidos</span>';
        return;
      }

      if (statusEl) statusEl.innerHTML = '<span style="color:#ffd700">Procesando transferencia...</span>';

      const res = await this.economy.sendWireTransfer(recipient, amount, note);
      if (res.success) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#00ff88">✓ Transferencia enviada con éxito: $${amount.toLocaleString()}</span>`;
        document.getElementById('phone-transfer-amount').value = '';
        document.getElementById('phone-transfer-note').value = '';
        AudioManager.playCasinoWin(false);
        this.refreshBankBalances();
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ff3344">Error: ${res.error}</span>`;
      }
    });

    // 4. Chat App: Channel Tabs
    document.querySelectorAll('.phone-chat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.phone-chat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeChatChannel = tab.dataset.channel;
        this.updateChatChannelUI();
        this.filterChatMessages();
      });
    });

    // Chat Message Send
    document.getElementById('phone-chat-send-btn')?.addEventListener('click', () => this.sendChatMessage());
    document.getElementById('phone-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // 5. Heists App: Create Lobby
    document.getElementById('create-heist-btn')?.addEventListener('click', () => {
      const select = document.getElementById('heist-type-select');
      const heistId = select.value;
      const heistTitle = select.options[select.selectedIndex].text;
      const loot = heistId === 'casino' ? 350000 : (heistId === 'armored' ? 80000 : 200000);

      if (this.network && this.network.socket) {
        this.network.socket.emit('heist:create', {
          heistId,
          heistTitle,
          totalLoot: loot
        });
      }
    });

    // Launch Heist
    document.getElementById('launch-heist-btn')?.addEventListener('click', () => {
      if (this.network?.activeHeistLobby && this.network.socket) {
        this.network.socket.emit('heist:launch', {
          roomId: this.network.activeHeistLobby.roomId
        });
      }
    });

    // 6. Market App Purchases
    document.querySelectorAll('.market-buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = btn.dataset.item;
        const price = parseInt(btn.dataset.price, 10);
        this.handleMarketPurchase(item, price);
      });
    });

    // Global Listeners
    window.addEventListener('chat:message_received', (e) => this.appendChatMessage(e.detail));
    window.addEventListener('phone:notification', (e) => this.showBanner(e.detail.message));
    window.addEventListener('heist:lobby_updated', (e) => this.renderHeistLobby(e.detail));
    window.addEventListener('heist:invite_popup', (e) => this.showHeistInvitePrompt(e.detail));
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.phoneContainer?.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      AudioManager.playChipClick();
      this.updateClock();
      this.openApp(this.currentApp || 'home');
    } else {
      this.phoneContainer?.classList.remove('visible');
      document.body.classList.remove('ui-active');
    }
  }

  open() {
    if (!this.isOpen) this.toggle();
  }

  close() {
    if (this.isOpen) this.toggle();
  }

  openApp(appName) {
    this.currentApp = appName;
    document.querySelectorAll('.phone-screen-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`phone-view-${appName}`);
    if (targetView) targetView.classList.add('active');

    if (appName === 'bank') this.refreshBankBalances();
    if (appName === 'contacts') this.refreshContactsList();
    if (appName === 'map') this.renderGpsMap();
    if (appName === 'chat') this.filterChatMessages();
  }

  // -------------------------------------------------------------
  // APP 1: MAZE BANK ONLINE
  // -------------------------------------------------------------

  refreshBankBalances() {
    const cashEl = document.getElementById('phone-bank-cash');
    const bankEl = document.getElementById('phone-bank-balance');
    const totalEl = document.getElementById('phone-bank-total');

    if (cashEl) cashEl.textContent = `$${this.economy.getCash().toLocaleString()}`;
    if (bankEl) bankEl.textContent = `$${this.economy.getBank().toLocaleString()}`;
    if (totalEl) totalEl.textContent = `$${this.economy.getNetWorth().toLocaleString()}`;

    // Render Recent Transactions
    const list = document.getElementById('phone-trans-list');
    if (list) {
      list.innerHTML = '';
      const txs = this.economy.transactionHistory.slice(0, 10);
      if (txs.length === 0) {
        list.innerHTML = '<div style="color:#777; font-size:11px; text-align:center;">Sin movimientos recientes</div>';
      }
      for (const t of txs) {
        const item = document.createElement('div');
        item.className = 'phone-trans-item';
        const isPos = t.amount >= 0;
        item.innerHTML = `
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:11px;">${t.description}</span>
            <small style="color:#888; font-size:9px;">${t.time}</small>
          </div>
          <b style="color:${isPos ? '#00ff88' : '#ff4d4d'}; font-size:12px;">${isPos ? '+' : ''}$${Math.abs(t.amount).toLocaleString()}</b>
        `;
        list.appendChild(item);
      }
    }
  }

  // -------------------------------------------------------------
  // APP 2: CONTACTOS & JUGADORES ONLINE
  // -------------------------------------------------------------

  async refreshContactsList() {
    const container = document.getElementById('phone-contacts-list');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; color:#aaa; font-size:11px;">Cargando ciudadanos conectados...</div>';

    try {
      const res = await fetch('/api/social/online');
      const data = await res.json();

      container.innerHTML = '';
      if (!data.players || data.players.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; font-size:11px;">No hay otros ciudadanos en línea en este momento.</div>';
        return;
      }

      for (const p of data.players) {
        if (p.id === this.economy.playerId) continue; // skip self
        const row = document.createElement('div');
        row.className = 'phone-contact-row';
        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="contact-avatar">👤</div>
            <div>
              <b style="font-size:12px; color:#fff;">${p.username}</b>
              <div style="font-size:10px; color:#00f0ff;">Nivel ${p.level} • Rep: ${p.reputation}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="phone-action-btn btn-wire" title="Transferir dinero">💸</button>
            <button class="phone-action-btn btn-dm" title="Mensaje Privado">💬</button>
            <button class="phone-action-btn btn-heist" title="Invitar al Golpe">🎯</button>
          </div>
        `;

        // Direct Transfer click
        row.querySelector('.btn-wire').addEventListener('click', () => {
          this.openApp('bank');
          const input = document.getElementById('phone-transfer-recipient');
          if (input) input.value = p.username;
        });

        // Direct DM click
        row.querySelector('.btn-dm').addEventListener('click', () => {
          this.selectedDmRecipient = p.username;
          this.openApp('chat');
          document.querySelector('[data-channel="private"]')?.click();
          const chatInput = document.getElementById('phone-chat-input');
          if (chatInput) chatInput.placeholder = `Mensaje privado a @${p.username}...`;
        });

        // Invite to Heist
        row.querySelector('.btn-heist').addEventListener('click', () => {
          if (this.network?.activeHeistLobby && this.network.socket) {
            this.network.socket.emit('heist:invite', {
              roomId: this.network.activeHeistLobby.roomId,
              heistTitle: this.network.activeHeistLobby.heistTitle,
              targetUserId: p.id
            });
            alert(`Invitación enviada a ${p.username}`);
          } else {
            alert('Crea primero una sala de Golpe en la App de Atracos');
            this.openApp('heists');
          }
        });

        container.appendChild(row);
      }
    } catch (e) {
      container.innerHTML = '<div style="color:#ff3344; font-size:11px;">Error cargando contactos.</div>';
    }
  }

  // -------------------------------------------------------------
  // APP 3: MULTI-CHANNEL CHAT
  // -------------------------------------------------------------

  updateChatChannelUI() {
    const banner = document.getElementById('phone-chat-channel-banner');
    const indicator = document.getElementById('chat-recipient-indicator');
    const input = document.getElementById('phone-chat-input');

    if (this.activeChatChannel === 'global') {
      if (banner) banner.textContent = 'Canal Global de Million Dollar City (Todo el Servidor)';
      if (indicator) indicator.textContent = '';
      if (input) input.placeholder = 'Mensaje global (Enter)...';
    } else if (this.activeChatChannel === 'proximity') {
      if (banner) banner.textContent = 'Canal de Proximidad (< 30 metros a tu alrededor)';
      if (indicator) indicator.textContent = '📍 Cerca';
      if (input) input.placeholder = 'Hablar a ciudadanos cercanos...';
    } else if (this.activeChatChannel === 'private') {
      const target = this.selectedDmRecipient ? `@${this.selectedDmRecipient}` : 'nadie seleccionado';
      if (banner) banner.textContent = `Mensaje Directo Privado con ${target}`;
      if (indicator) indicator.textContent = this.selectedDmRecipient ? `🔒 @${this.selectedDmRecipient}` : '';
      if (input) input.placeholder = this.selectedDmRecipient ? `DM para @${this.selectedDmRecipient}...` : 'Selecciona un contacto en la app Contactos...';
    } else if (this.activeChatChannel === 'group') {
      if (banner) banner.textContent = 'Canal de Banda & Miembros de Golpe Activo';
      if (indicator) indicator.textContent = '🎯 Crew';
      if (input) input.placeholder = 'Mensaje a compañeros de atraco...';
    }
  }

  sendChatMessage() {
    const input = document.getElementById('phone-chat-input');
    const text = input?.value.trim();
    if (!text) return;

    if (this.activeChatChannel === 'private' && !this.selectedDmRecipient) {
      alert('Para enviar un mensaje privado, selecciona primero un usuario en la app de Contactos (botón 💬).');
      return;
    }

    this.network.sendChat(this.activeChatChannel, text, this.selectedDmRecipient);
    input.value = '';
  }

  appendChatMessage(msg) {
    const list = document.getElementById('phone-chat-messages');
    if (!list) return;

    const div = document.createElement('div');
    div.className = `chat-bubble channel-${msg.channel}`;
    div.dataset.channel = msg.channel;

    const channelTag = msg.channel === 'global' ? '[GLOBAL]' :
                       msg.channel === 'proximity' ? '[PROX]' :
                       msg.channel === 'private' ? '[DM]' :
                       msg.channel === 'group' ? '[GOLPE]' : '[BANDA]';

    const isSelf = msg.username === this.economy.username;
    const authorColor = isSelf ? '#00f0ff' : '#ffd700';

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:9px; color:#888;">
        <b style="color:${authorColor};">${channelTag} ${msg.username}${isSelf ? ' (Tú)' : ''}</b>
        <span>${msg.time || new Date().toLocaleTimeString().slice(0, 5)}</span>
      </div>
      <div style="font-size:12px; color:#fff; margin-top:2px; line-height:1.4;">${this.escapeHtml(msg.text)}</div>
    `;

    list.appendChild(div);
    list.scrollTop = list.scrollHeight;

    // Filter by active tab
    if (this.activeChatChannel !== 'all' && msg.channel !== this.activeChatChannel && this.activeChatChannel !== 'global') {
      div.style.display = 'none';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  filterChatMessages() {
    this.updateChatChannelUI();
    document.querySelectorAll('#phone-chat-messages .chat-bubble').forEach(b => {
      if (this.activeChatChannel === 'all' || this.activeChatChannel === 'global') {
        b.style.display = 'block';
      } else {
        b.style.display = b.dataset.channel === this.activeChatChannel ? 'block' : 'none';
      }
    });
  }

  // -------------------------------------------------------------
  // APP 4: COOP HEISTS HUB
  // -------------------------------------------------------------

  renderHeistLobby(heist) {
    const lobbyContainer = document.getElementById('heist-lobby-view');
    const crewList = document.getElementById('heist-crew-list');
    const titleEl = document.getElementById('heist-lobby-title');
    const lootEl = document.getElementById('heist-lobby-loot');
    const launchBtn = document.getElementById('launch-heist-btn');

    if (!lobbyContainer) return;

    lobbyContainer.style.display = 'flex';
    document.getElementById('heist-create-view').style.display = 'none';

    if (titleEl) titleEl.textContent = heist.heistTitle;
    if (lootEl) lootEl.textContent = `$${heist.totalLoot.toLocaleString()}`;

    if (crewList) {
      crewList.innerHTML = '';
      for (const m of heist.members) {
        const item = document.createElement('div');
        item.className = 'heist-crew-item';
        item.innerHTML = `
          <div>
            <b>${m.username}</b>
            <span class="role-pill">${m.role}</span>
          </div>
          <div><b>${m.cutPercent}%</b> ($${Math.floor(heist.totalLoot * m.cutPercent / 100).toLocaleString()})</div>
        `;
        crewList.appendChild(item);
      }
    }

    if (launchBtn) {
      launchBtn.disabled = heist.leaderId !== this.economy.playerId;
      launchBtn.textContent = heist.leaderId === this.economy.playerId ? 'INICIAR GOLPE COOPERATIVO 🚀' : 'ESPERANDO AL LÍDER...';
    }
  }

  showHeistInvitePrompt(data) {
    const banner = document.createElement('div');
    banner.className = 'heist-invite-popup';
    banner.innerHTML = `
      <div style="font-weight:bold; font-size:12px; color:#ffd700;">INVITACIÓN A GOLPE</div>
      <div style="font-size:11px;"><b>${data.leaderName}</b> te invita al golpe <b>${data.heistTitle}</b></div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button id="accept-heist-btn" class="casino-btn" style="padding:4px 10px; font-size:11px;">ACEPTAR</button>
        <button id="decline-heist-btn" class="casino-btn secondary" style="padding:4px 10px; font-size:11px;">RECHAZAR</button>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('#accept-heist-btn').addEventListener('click', () => {
      this.network.socket.emit('heist:join', { roomId: data.roomId });
      this.openApp('heists');
      banner.remove();
    });

    banner.querySelector('#decline-heist-btn').addEventListener('click', () => {
      banner.remove();
    });

    setTimeout(() => banner.remove(), 15000);
  }

  // -------------------------------------------------------------
  // APP 5: MAPA GPS INTERACTIVO & PUNTOS DE INTERÉS EN VIVO
  // -------------------------------------------------------------

  getCityLandmarks() {
    return [
      { id: 'dynasty8_plaza', name: 'Dynasty 8 Plaza (Suite Presidencial)', type: 'penthouse', worldX: 29, worldZ: -110, color: '#ffd700', icon: '👑', desc: 'Ático Presidencial de Lujo • Objetivo Final del Millón' },
      { id: 'casino_mirage', name: 'Casino The Royal Mirage', type: 'casino', worldX: -42, worldZ: 50, color: '#ffd700', icon: '🎰', desc: 'Ruleta, Blackjack, Tragaperras y Mega Rueda' },
      { id: 'bank_vault21', name: 'Banco Central Vault 21', type: 'bank', worldX: 45, worldZ: 38, color: '#00ff88', icon: '🏦', desc: 'Cajeros, Transferencias y Bóveda del Golpe' },
      { id: 'ammunation', name: 'Ammu-Nation Armería', type: 'weapons', worldX: 45, worldZ: -45, color: '#ff3344', icon: '🎯', desc: 'Venta de rifles, chalecos antibalas y munición' },
      { id: 'lspd_hq', name: 'Comisaría Central LSPD & Prisión', type: 'police', worldX: -28, worldZ: -130, color: '#0055ff', icon: '🚓', desc: 'Sede policial, celdas y pago de fianzas' },
      { id: 'dealership', name: 'Concesionario Luxury Motorsport', type: 'cars', worldX: 25, worldZ: 120, color: '#00f0ff', icon: '🏎️', desc: 'Superdeportivos e hipercoches de élite' },
      { id: 'liquor_store', name: 'Licorería 24/7 Diamond Drinks', type: 'store', worldX: -27, worldZ: -15, color: '#52b788', icon: '🍺', desc: 'Bebidas energéticas, licores y botiquines' },
      { id: 'street_dealer', name: 'Dealer Callejero Clandestino', type: 'dealer', worldX: -26, worldZ: 18, color: '#c77dff', icon: '💊', desc: 'Química clandestina y estupefacientes' },
      { id: 'chop_shop', name: 'Garaje Chop Shop & Flota Privada', type: 'garage', worldX: 18, worldZ: -90, color: '#ff0055', icon: '🚗', desc: 'Gestión de flota, guardado y tuning' },
      { id: 'club_velvet', name: 'Club Nocturno Velvet', type: 'nightlife', worldX: -42, worldZ: -50, color: '#ff007f', icon: '🍸', desc: 'Zona VIP de ocio nocturno y música synth' },
      { id: 'boutiques', name: 'Boutiques & Café Terraza', type: 'commercial', worldX: 45, worldZ: 85, color: '#ff9e00', icon: '☕', desc: 'Zona comercial y terrazas al aire libre' },
      { id: 'centurion_tower', name: 'Torre Centurion Financial', type: 'office', worldX: -50, worldZ: 110, color: '#3a86ff', icon: '🏢', desc: 'Rascacielos financiero' },
      { id: 'maze_financial', name: 'Maze Financial Tower', type: 'office', worldX: 50, worldZ: 110, color: '#3a86ff', icon: '🏢', desc: 'Sede corporativa' },
      { id: 'bellagio_casino', name: 'The Bellagio Luxe Resort', type: 'casino', worldX: -65, worldZ: 250, color: '#ffd700', icon: '🏰', desc: 'Megacasino y resort norte' },
      { id: 'caesars_palace', name: 'Caesars Grand Palace', type: 'casino', worldX: 65, worldZ: 250, color: '#ffd700', icon: '🏛️', desc: 'Casino temático imperial' },
      { id: 'port_logistics', name: 'Terminal Logística del Puerto', type: 'industrial', worldX: -65, worldZ: -250, color: '#9d4edd', icon: '⚓', desc: 'Muelles y almacenes de carga' },
      { id: 'federal_cargo', name: 'Terminal Federal de Carga', type: 'industrial', worldX: 65, worldZ: -250, color: '#9d4edd', icon: '📦', desc: 'Depósito aduanero' }
    ];
  }

  handleMapHover(mouseX, mouseY) {
    const canvas = document.getElementById('phone-map-canvas');
    const tooltip = document.getElementById('map-tooltip');
    if (!canvas || !tooltip) return;

    const hit = this.getMapItemAtCoords(mouseX, mouseY);
    if (hit) {
      this.hoveredLandmark = hit;
      tooltip.style.display = 'block';
      tooltip.style.left = `${mouseX}px`;
      tooltip.style.top = `${mouseY}px`;
      tooltip.innerHTML = `<b>${hit.icon || '📍'} ${hit.name}</b><br><span style="color:#aaa; font-size:9px;">${hit.desc || 'Clic para fijar GPS'}</span>`;
    } else {
      this.hoveredLandmark = null;
      tooltip.style.display = 'none';
    }
  }

  handleMapClick(mouseX, mouseY) {
    const hit = this.getMapItemAtCoords(mouseX, mouseY);
    if (hit) {
      // Toggle GPS Waypoint marker
      const existingIdx = this.mapWaypoints.findIndex(w => w.name === hit.name);
      if (existingIdx >= 0) {
        this.mapWaypoints.splice(existingIdx, 1);
        AudioManager.playChipClick();
      } else {
        this.mapWaypoints.push({ name: hit.name, worldX: hit.worldX, worldZ: hit.worldZ, icon: hit.icon });
        AudioManager.playChipClick();
      }
      this.renderGpsMap();
    }
  }

  getMapItemAtCoords(mouseX, mouseY) {
    const canvas = document.getElementById('phone-map-canvas');
    if (!canvas) return null;
    const w = canvas.width;
    const h = canvas.height;

    const pPos = this.player.getPosition();
    const cx = this.mapCenter.x !== undefined ? this.mapCenter.x : pPos.x;
    const cz = this.mapCenter.z !== undefined ? this.mapCenter.z : pPos.z;
    const scale = 0.45 * this.mapZoom;

    // Check landmarks
    for (const lm of this.getCityLandmarks()) {
      const screenX = w / 2 + (lm.worldX - cx) * scale;
      const screenY = h / 2 + (lm.worldZ - cz) * scale;
      const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
      if (dist <= 14) return lm;
    }

    // Check remote players
    for (const rp of this.network?.getRemotePlayers() || []) {
      const screenX = w / 2 + (rp.targetPos.x - cx) * scale;
      const screenY = h / 2 + (rp.targetPos.z - cz) * scale;
      const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
      if (dist <= 12) {
        return { name: `Jugador: ${rp.username}`, icon: '👤', desc: `Coordenadas: [${Math.round(rp.targetPos.x)}, ${Math.round(rp.targetPos.z)}]`, worldX: rp.targetPos.x, worldZ: rp.targetPos.z };
      }
    }

    return null;
  }

  renderGpsMap() {
    const canvas = document.getElementById('phone-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pPos = this.player.getPosition();
    const cx = this.mapCenter.x !== undefined ? this.mapCenter.x : pPos.x;
    const cz = this.mapCenter.z !== undefined ? this.mapCenter.z : pPos.z;
    const scale = 0.45 * this.mapZoom;

    // Background terrain
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0, 0, w, h);

    // Subtle district background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 30 * this.mapZoom;
    for (let x = (w / 2 - cx * scale) % gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = (h / 2 - cz * scale) % gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 1. Draw Road Network
    ctx.fillStyle = '#1c2237';
    // Diamond Strip (X: -14 to 14, Z: -360 to 360)
    const boulevardScreenX = w / 2 + (-14 - cx) * scale;
    const boulevardWidth = 28 * scale;
    const boulevardScreenY = h / 2 + (-360 - cz) * scale;
    const boulevardHeight = 720 * scale;
    ctx.fillRect(boulevardScreenX, boulevardScreenY, boulevardWidth, boulevardHeight);

    // Parallel Avenues (Ocean Drive East X: 110, Vinewood West X: -110)
    const oceanX = w / 2 + (110 - 9 - cx) * scale;
    const oceanW = 18 * scale;
    ctx.fillRect(oceanX, boulevardScreenY, oceanW, boulevardHeight);

    const vinewoodX = w / 2 + (-110 - 9 - cx) * scale;
    ctx.fillRect(vinewoodX, boulevardScreenY, oceanW, boulevardHeight);

    // Cross Streets (Z: 0, Z: 165, Z: -165)
    [-165, 0, 165].forEach(streetZ => {
      const sy = h / 2 + (streetZ - 10 - cz) * scale;
      const sh = 20 * scale;
      const sx = w / 2 + (-260 - cx) * scale;
      const sw = 520 * scale;
      ctx.fillRect(sx, sy, sw, sh);
    });

    // Road yellow dividers
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 + (0 - cx) * scale, boulevardScreenY);
    ctx.lineTo(w / 2 + (0 - cx) * scale, boulevardScreenY + boulevardHeight);
    ctx.stroke();

    // 2. Landmarks & Points of Interest
    for (const lm of this.getCityLandmarks()) {
      const lx = w / 2 + (lm.worldX - cx) * scale;
      const ly = h / 2 + (lm.worldZ - cz) * scale;

      // Skip offscreen markers with margin
      if (lx < -20 || lx > w + 20 || ly < -20 || ly > h + 20) continue;

      // Outer beacon aura
      ctx.beginPath();
      ctx.arc(lx, ly, 10, 0, Math.PI * 2);
      ctx.fillStyle = `${lm.color}22`;
      ctx.fill();

      // Pin badge
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fillStyle = lm.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon & Label
      ctx.font = '10px sans-serif';
      ctx.fillText(lm.icon, lx - 6, ly - 8);

      if (this.mapZoom >= 1.0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 8px Chakra Petch, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name.replace(/(Casino |Torre |Terminal )/g, ''), lx, ly + 14);
        ctx.textAlign = 'start';
      }
    }

    // 3. User GPS Waypoints
    for (const wp of this.mapWaypoints) {
      const wx = w / 2 + (wp.worldX - cx) * scale;
      const wy = h / 2 + (wp.worldZ - cz) * scale;

      ctx.beginPath();
      ctx.arc(wx, wy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '10px sans-serif';
      ctx.fillText('🎯', wx - 6, wy + 4);
    }

    // 4. Remote Players in real time
    for (const rp of this.network?.getRemotePlayers() || []) {
      const rx = w / 2 + (rp.targetPos.x - cx) * scale;
      const ry = h / 2 + (rp.targetPos.z - cz) * scale;

      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(rp.username, rx + 7, ry + 3);
    }

    // 5. Local Player Protagonist (Directional Arrow & Radar Pulse)
    const px = w / 2 + (pPos.x - cx) * scale;
    const py = h / 2 + (pPos.z - cz) * scale;

    // Glowing Radar Ping
    const pingRadius = (Date.now() % 1600) / 1600 * 18;
    ctx.beginPath();
    ctx.arc(px, py, pingRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 136, ${1 - pingRadius / 18})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Directional Player Triangle
    const yaw = this.player.heading || 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-yaw + Math.PI); // Coordinate align with Three.js camera yaw

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------
  // APP 6: MERCADO & BLACK MARKET
  // -------------------------------------------------------------

  handleMarketPurchase(item, price) {
    if (this.economy.getBank() < price) {
      alert(`Fondos bancarios insuficientes. Cuesta $${price.toLocaleString()}`);
      return;
    }

    this.economy.modifyBank(-price, `Compra en Mercado: ${item}`);
    AudioManager.playCasinoWin(false);

    if (item === 'viper_gt' || item === 'dominator') {
      alert(`¡Vehículo ${item.toUpperCase()} adquirido! Solicítalo en la app de Valet.`);
    } else if (item === 'm4_rifle') {
      window.game?.weapons?.equip('rifle');
      alert('¡Rifle de Asalto Carbine M4 entregado y equipado!');
    } else if (item === 'armor_heavy') {
      this.player.armor = 100;
      alert('¡Chaleco antibalas pesado de kevlar equipado (100% Blindaje)!');
    }
    this.refreshBankBalances();
  }

  showBanner(msg) {
    if (!this.notificationBadge) return;
    this.notificationBadge.textContent = msg;
    this.notificationBadge.classList.add('visible');
    setTimeout(() => this.notificationBadge.classList.remove('visible'), 4500);
  }

  updateClock() {
    const el = document.getElementById('phone-status-time');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
