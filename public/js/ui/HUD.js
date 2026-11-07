export class HUD {
  constructor() {
    this.container = document.getElementById('hud');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    // Elements
    this.cashEl = document.getElementById('hud-cash');
    this.bankEl = document.getElementById('hud-bank');
    this.goalProgressEl = document.getElementById('goal-progress-bar');
    this.goalPercentEl = document.getElementById('goal-percent-text');
    this.healthBarEl = document.getElementById('health-bar-fill');
    this.armorBarEl = document.getElementById('armor-bar-fill');
    this.wantedStarsEl = document.getElementById('wanted-stars');
    this.ammoEl = document.getElementById('ammo-display');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.interactionPromptEl = document.getElementById('interaction-prompt');
    this.missionTitleEl = document.getElementById('mission-title');
    this.missionObjectiveEl = document.getElementById('mission-objective');

    // Combat Reticle & Overlays
    this.crosshairEl = document.getElementById('crosshair');
    this.hitmarkerEl = document.getElementById('hitmarker');
    this.sniperScopeEl = document.getElementById('sniper-scope');

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('weapon:hitmarker', (e) => {
      if (!this.hitmarkerEl) return;
      this.hitmarkerEl.classList.remove('active', 'headshot');
      void this.hitmarkerEl.offsetWidth; // force reflow
      this.hitmarkerEl.classList.add('active');
      if (e.detail?.isHeadshot) {
        this.hitmarkerEl.classList.add('headshot');
      }
      setTimeout(() => {
        if (this.hitmarkerEl) {
          this.hitmarkerEl.classList.remove('active', 'headshot');
        }
      }, 140);
    });

    window.addEventListener('economy:updated', (e) => {
      const { cash, bank, progress } = e.detail;
      if (this.cashEl) this.cashEl.textContent = `$${cash.toLocaleString()}`;
      if (this.bankEl) this.bankEl.textContent = `$${bank.toLocaleString()}`;
      if (this.goalProgressEl) this.goalProgressEl.style.width = `${progress}%`;
      if (this.goalPercentEl) this.goalPercentEl.textContent = `${progress.toFixed(1)}%`;
    });

    window.addEventListener('weapon:updated', (e) => {
      const { name, currentAmmo, reserveAmmo, isReloading } = e.detail;
      if (this.weaponNameEl) this.weaponNameEl.textContent = name;
      if (this.ammoEl) {
        this.ammoEl.textContent = isReloading ? 'RECARGANDO...' : `${currentAmmo} / ${reserveAmmo}`;
      }
    });

    window.addEventListener('wanted:updated', (e) => {
      const { stars, isFlashing } = e.detail;
      if (!this.wantedStarsEl) return;
      this.wantedStarsEl.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = `star ${i <= stars ? 'active' : ''} ${isFlashing ? 'flashing' : ''}`;
        star.textContent = '★';
        this.wantedStarsEl.appendChild(star);
      }
    });

    window.addEventListener('mission:updated', (e) => {
      const { title, objective } = e.detail;
      if (this.missionTitleEl) this.missionTitleEl.textContent = title;
      if (this.missionObjectiveEl) this.missionObjectiveEl.textContent = objective;
    });

    window.addEventListener('player:wasted', () => {
      const wastedScreen = document.getElementById('wasted-screen');
      if (wastedScreen) {
        wastedScreen.classList.add('visible');
        setTimeout(() => {
          wastedScreen.classList.remove('visible');
        }, 4000);
      }
    });

    window.addEventListener('game:victory', (e) => {
      const victoryScreen = document.getElementById('victory-screen');
      if (victoryScreen) victoryScreen.classList.add('visible');
    });
  }

  showInteractionPrompt(text) {
    if (this.interactionPromptEl) {
      this.interactionPromptEl.textContent = text;
      this.interactionPromptEl.classList.add('visible');
    }
  }

  hideInteractionPrompt() {
    if (this.interactionPromptEl) {
      this.interactionPromptEl.classList.remove('visible');
    }
  }

  setAiming(isAiming, weaponId = 'pistol') {
    if (this.crosshairEl) {
      if (isAiming) {
        this.crosshairEl.classList.add('aiming');
      } else {
        this.crosshairEl.classList.remove('aiming');
      }
    }

    if (this.sniperScopeEl) {
      if (isAiming && weaponId === 'sniper') {
        this.sniperScopeEl.classList.add('visible');
      } else {
        this.sniperScopeEl.classList.remove('visible');
      }
    }
  }

  updatePlayerVitals(health, maxHealth, armor, maxArmor) {
    if (this.healthBarEl) {
      const hPercent = Math.max(0, (health / maxHealth) * 100);
      this.healthBarEl.style.width = `${hPercent}%`;
    }
    if (this.armorBarEl) {
      const aPercent = Math.max(0, (armor / maxArmor) * 100);
      this.armorBarEl.style.width = `${aPercent}%`;
    }
  }

  // -------------------------------------------------------------
  // FUNCTIONAL RADAR / MINIMAP RENDERING
  // -------------------------------------------------------------

  renderRadar(playerPos, playerHeading, waypoints = []) {
    if (!this.radarCtx || !playerPos) return;
    const ctx = this.radarCtx;
    const size = 180;
    const half = size / 2;
    const scale = 0.55; // pixels per world meter

    ctx.clearRect(0, 0, size, size);

    // Save context for radar rotation (heads-up display rotating with player)
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-playerHeading);

    // Dark radar background
    ctx.beginPath();
    ctx.arc(0, 0, half - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0e1118';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    // Range rings
    [25, 50, 75].forEach(r => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.stroke();
    });

    // Draw main boulevard road on radar
    const roadX = (0 - playerPos.x) * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(roadX - 12 * scale, -180, 24 * scale, 360);

    // Draw Waypoints & Landmark Blips
    for (const wp of waypoints) {
      if (!wp.pos) continue;
      const relX = (wp.pos.x - playerPos.x) * scale;
      const relZ = (wp.pos.z - playerPos.z) * scale;

      ctx.beginPath();
      ctx.arc(relX, relZ, 5, 0, Math.PI * 2);
      ctx.fillStyle = wp.color || '#ffb703';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();

    // Draw Player Arrow in center (always pointing UP)
    ctx.save();
    ctx.translate(half, half);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // North Compass Indicator
    ctx.save();
    const northAngle = -playerHeading - Math.PI / 2;
    const nx = half + Math.cos(northAngle) * (half - 12);
    const ny = half + Math.sin(northAngle) * (half - 12);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('N', nx - 4, ny + 4);
    ctx.restore();
  }
}
