// LobbyUI.js - LAN Multiplayer Hub & Pre-Game Matchmaker for Million Dollar City

export class LobbyUI {
  constructor(onStartGameCallback, qualitySettings) {
    this.onStartGame = onStartGameCallback;
    this.quality = qualitySettings;

    this.modal = document.getElementById('lan-lobby-modal');
    this.lanInfo = null;
    this.currentMatch = null;
    this.selectedTab = 'solo'; // 'solo' | 'host' | 'join'

    this.initElements();
    this.fetchLanInfo();
    this.bindEvents();
  }

  initElements() {
    this.tabs = document.querySelectorAll('.lan-tab-btn');
    this.tabPanels = document.querySelectorAll('.lan-tab-content');

    // Host elements
    this.hostIpEl = document.getElementById('lan-host-ip-display');
    this.hostCodeEl = document.getElementById('lan-host-code-display');
    this.hostPlayersList = document.getElementById('lan-host-players-list');
    this.copyIpBtn = document.getElementById('lan-copy-ip-btn');
    this.copyCodeBtn = document.getElementById('lan-copy-code-btn');

    // Join elements
    this.joinInput = document.getElementById('lan-join-code-input');
    this.joinStatusEl = document.getElementById('lan-join-status');
    this.joinConnectBtn = document.getElementById('lan-join-connect-btn');

    // Quality selector
    this.qualitySelect = document.getElementById('lan-quality-select');
    if (this.qualitySelect && this.quality) {
      this.qualitySelect.value = this.quality.currentPresetKey;
      this.qualitySelect.addEventListener('change', (e) => {
        this.quality.setPreset(e.target.value);
      });
    }
  }

  async fetchLanInfo() {
    try {
      const res = await fetch('/api/network/lan-info');
      const data = await res.json();
      if (data.success) {
        this.lanInfo = data;
        if (this.hostIpEl) {
          this.hostIpEl.textContent = `${data.primaryIp}:${data.port}`;
        }
      }
    } catch (e) {
      console.warn('[Lobby] No se pudo obtener información LAN del servidor:', e);
    }
  }

  bindEvents() {
    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });

    // Copy IP / Enlace
    this.copyIpBtn?.addEventListener('click', () => {
      let text = window.location.origin;
      // Si estamos en localhost, ofrecer la IP LAN si existe para jugar en red local clásica
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && this.lanInfo?.primaryIp) {
        text = `http://${this.lanInfo.primaryIp}:${this.lanInfo.port}`;
      }
      navigator.clipboard?.writeText(text).then(() => {
        this.copyIpBtn.textContent = '¡COPIADO! ✓';
        setTimeout(() => { this.copyIpBtn.textContent = 'COPIAR ENLACE'; }, 2000);
      });
    });

    // Copy Match Code
    this.copyCodeBtn?.addEventListener('click', () => {
      const code = this.hostCodeEl?.textContent || '';
      navigator.clipboard?.writeText(code).then(() => {
        this.copyCodeBtn.textContent = '¡COPIADO! ✓';
        setTimeout(() => { this.copyCodeBtn.textContent = 'COPIAR'; }, 2000);
      });
    });

    // Solo Play button
    document.getElementById('lan-play-solo-btn')?.addEventListener('click', () => {
      this.close();
      if (this.onStartGame) this.onStartGame({ mode: 'SOLO' });
    });

    // Host Play button
    document.getElementById('lan-launch-host-btn')?.addEventListener('click', async () => {
      const roomName = document.getElementById('lan-host-name-input')?.value.trim() || 'Partida de Clase LAN';
      const user = localStorage.getItem('mdc_auth_username') || 'Anfitrión';

      try {
        const res = await fetch('/api/match/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roomName, hostUsername: user, maxPlayers: 16 })
        });
        const data = await res.json();
        if (data.success && data.match) {
          this.currentMatch = data.match;
          if (this.hostCodeEl) this.hostCodeEl.textContent = data.match.code;
        }
      } catch (err) {
        console.warn('[Lobby] Falló registro de sala en backend:', err);
      }

      this.close();
      if (this.onStartGame) this.onStartGame({ mode: 'HOST', match: this.currentMatch });
    });

    // Join Match button
    this.joinConnectBtn?.addEventListener('click', async () => {
      const inputVal = (this.joinInput?.value || '').trim();
      if (!inputVal) {
        if (this.joinStatusEl) this.joinStatusEl.textContent = 'Introduce un código de partida o IP';
        return;
      }

      // Check if input is full URL / IP or Code
      if (inputVal.includes('.') || inputVal.includes(':')) {
        // Direct redirect to that host IP
        let targetUrl = inputVal;
        if (!targetUrl.startsWith('http')) targetUrl = 'http://' + targetUrl;
        if (this.joinStatusEl) this.joinStatusEl.textContent = `Conectando con ${targetUrl}...`;
        window.location.href = targetUrl;
        return;
      }

      // Query room code on current backend
      if (this.joinStatusEl) this.joinStatusEl.textContent = 'Buscando sala...';
      try {
        const user = localStorage.getItem('mdc_auth_username') || 'Invitado';
        const res = await fetch('/api/match/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inputVal, username: user })
        });
        const data = await res.json();
        if (data.success) {
          if (this.joinStatusEl) this.joinStatusEl.textContent = `¡Unido con éxito a ${data.match.name}!`;
          setTimeout(() => {
            this.close();
            if (this.onStartGame) this.onStartGame({ mode: 'CLIENT', match: data.match });
          }, 600);
        } else {
          if (this.joinStatusEl) this.joinStatusEl.textContent = data.error || 'Código de sala no encontrado';
        }
      } catch (e) {
        if (this.joinStatusEl) this.joinStatusEl.textContent = 'Error al conectar con la sala';
      }
    });
  }

  switchTab(tabKey) {
    this.selectedTab = tabKey;
    this.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    this.tabPanels.forEach(p => p.classList.toggle('active', p.id === `lan-tab-${tabKey}`));
  }

  open() {
    if (this.modal) {
      this.modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
      document.body.classList.remove('ui-active');
    }
  }
}
