import { WheelOfFortuneGame } from '../casino/WheelOfFortune.js';

export class CasinoUI {
  constructor(blackjackGame, rouletteGame, slotGame, economyManager) {
    this.blackjack = blackjackGame;
    this.roulette = rouletteGame;
    this.slots = slotGame;
    this.wheel = new WheelOfFortuneGame(economyManager);
    this.economy = economyManager;

    this.activeModal = null; // 'blackjack' | 'roulette' | 'slots' | 'atm' | 'wheel'
    this.wheelRotation = 0;
    this.currentWheel3DRef = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.bjModal = document.getElementById('blackjack-modal');
    this.rouletteModal = document.getElementById('roulette-modal');
    this.slotsModal = document.getElementById('slots-modal');
    this.atmModal = document.getElementById('atm-modal');
    this.wheelModal = document.getElementById('wheel-modal');
    this.wheelCanvas = document.getElementById('wheel-canvas');
    this.wheelCtx = this.wheelCanvas ? this.wheelCanvas.getContext('2d') : null;
  }

  bindEvents() {
    // -----------------------------------------------------------
    // BLACKJACK UI BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.bj-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bet = parseInt(e.target.dataset.bet, 10);
        this.startBlackjackRound(bet);
      });
    });

    document.getElementById('bj-hit-btn')?.addEventListener('click', () => {
      const res = this.blackjack.hit();
      this.renderBlackjackState(res);
    });

    document.getElementById('bj-stand-btn')?.addEventListener('click', () => {
      const res = this.blackjack.stand();
      this.renderBlackjackState(res);
    });

    document.getElementById('bj-double-btn')?.addEventListener('click', () => {
      const res = this.blackjack.doubleDown();
      this.renderBlackjackState(res);
    });

    document.getElementById('bj-close-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // -----------------------------------------------------------
    // ROULETTE UI BUTTONS
    // -----------------------------------------------------------
    let selectedRouletteChip = 50;
    document.querySelectorAll('.roulette-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.roulette-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRouletteChip = parseInt(btn.dataset.chip, 10);
      });
    });

    document.querySelectorAll('.roulette-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const betType = cell.dataset.type;
        const number = cell.dataset.number ? parseInt(cell.dataset.number, 10) : null;
        const res = this.roulette.addBet(betType, selectedRouletteChip, number);
        if (res.success) {
          this.updateRouletteBetsUI();
        } else {
          alert(res.message);
        }
      });
    });

    document.getElementById('roulette-spin-btn')?.addEventListener('click', () => {
      const statusEl = document.getElementById('roulette-status-msg');
      if (statusEl) statusEl.textContent = 'GIRANDO LA RULETA...';

      this.roulette.spin(
        (progress) => {
          // progress tick
        },
        (result) => {
          if (statusEl) statusEl.textContent = result.message;
          const numDisplay = document.getElementById('roulette-winning-number');
          if (numDisplay) {
            numDisplay.textContent = result.winningNumber;
            numDisplay.className = `winning-number ${result.color.toLowerCase()}`;
          }
          this.updateRouletteBetsUI();
        }
      );
    });

    document.getElementById('roulette-clear-btn')?.addEventListener('click', () => {
      this.roulette.clearBets();
      this.updateRouletteBetsUI();
    });

    document.getElementById('roulette-close-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // -----------------------------------------------------------
    // SLOTS UI BUTTONS
    // -----------------------------------------------------------
    document.getElementById('slots-spin-btn')?.addEventListener('click', () => {
      const bet = parseInt(document.getElementById('slots-bet-input')?.value || '50', 10);
      const statusEl = document.getElementById('slots-status-msg');
      if (statusEl) statusEl.textContent = '¡Rodillos girando!';

      this.slots.spin(
        bet,
        (currentSymbols) => {
          document.getElementById('reel-1').textContent = currentSymbols[0].icon;
          document.getElementById('reel-2').textContent = currentSymbols[1].icon;
          document.getElementById('reel-3').textContent = currentSymbols[2].icon;
        },
        (result) => {
          if (statusEl) statusEl.textContent = result.message;
        }
      );
    });

    document.getElementById('slots-close-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // -----------------------------------------------------------
    // ATM BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.atm-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const amount = parseInt(btn.dataset.amount, 10);
        const statusEl = document.getElementById('atm-status-msg');

        if (action === 'deposit') {
          const actualAmount = amount === -1 ? this.economy.getCash() : amount;
          const res = await this.economy.atmDeposit(actualAmount);
          if (statusEl) statusEl.textContent = res.message;
        } else if (action === 'withdraw') {
          const actualAmount = amount === -1 ? this.economy.getBank() : amount;
          const res = await this.economy.atmWithdraw(actualAmount);
          if (statusEl) statusEl.textContent = res.message;
        }
        this.updateATMDisplay();
      });
    });

    document.getElementById('atm-close-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    // -----------------------------------------------------------
    // WHEEL OF FORTUNE UI BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.wheel-quick-bet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bet = e.target.dataset.bet;
        const input = document.getElementById('wheel-bet-input');
        if (input) input.value = bet;
      });
    });

    document.getElementById('wheel-spin-btn')?.addEventListener('click', () => {
      const bet = parseInt(document.getElementById('wheel-bet-input')?.value || '100', 10);
      const statusEl = document.getElementById('wheel-status-msg');
      if (statusEl) statusEl.textContent = '¡GIRANDO LA GRAN RULETA...! 🎡';

      const spinBtn = document.getElementById('wheel-spin-btn');
      if (spinBtn) spinBtn.disabled = true;

      this.wheel.spin(
        bet,
        (currentDeg, t) => {
          this.wheelRotation = currentDeg;
          this.drawWheel2D(currentDeg);
          // Also sync with 3D model if reference exists!
          if (this.currentWheel3DRef) {
            this.currentWheel3DRef.rotation.z = (currentDeg * Math.PI) / 180;
          }
        },
        (result) => {
          if (spinBtn) spinBtn.disabled = false;
          if (statusEl) statusEl.textContent = result.message;
        }
      );
    });

    document.getElementById('wheel-close-btn')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  // -------------------------------------------------------------
  // OPEN / CLOSE MODALS
  // -------------------------------------------------------------

  openWheelOfFortune(item = null) {
    this.currentWheel3DRef = item?.discRef || null;
    this.activeModal = 'wheel';
    document.body.classList.add('ui-active');
    if (this.wheelModal) this.wheelModal.classList.add('visible');
    this.drawWheel2D(this.wheelRotation);
    document.exitPointerLock?.();
  }

  drawWheel2D(angleDeg = 0) {
    if (!this.wheelCtx || !this.wheelCanvas) return;
    const ctx = this.wheelCtx;
    const size = 280;
    const half = size / 2;
    const segments = this.wheel.segments;
    const count = segments.length;
    const segAngle = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(half, half);
    ctx.rotate((angleDeg * Math.PI) / 180);

    for (let i = 0; i < count; i++) {
      const seg = segments[i];
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, half - 6, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd700';
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = seg.isJackpot ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, half - 18, 5);
      ctx.restore();
    }

    // Central golden hub
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }

  openVideoPoker(item = null) {
    // Opens slots modal with video poker theme and rewards
    this.openSlots();
    const title = document.querySelector('#slots-modal .modal-title');
    if (title) title.textContent = '🃏 VIDEO POKER JACKS OR BETTER VIP 🃏';
  }

  openPachinko(item = null) {
    this.openSlots();
    const title = document.querySelector('#slots-modal .modal-title');
    if (title) title.textContent = '🎌 TOKYO CYBER NEON PACHINKO 777 🎌';
  }

  openCraps(item = null) {
    this.openRoulette(item?.minBet || 25, item?.maxBet || 5000);
    const title = document.querySelector('#roulette-modal .modal-title');
    if (title) title.textContent = '🎲 DADOS / CRAPS DE LAS VEGAS 🎲';
  }

  openBlackjack(minBet = 25, maxBet = 5000) {
    this.blackjack.setBetLimits(minBet, maxBet);
    this.activeModal = 'blackjack';
    document.body.classList.add('ui-active');
    if (this.bjModal) this.bjModal.classList.add('visible');
    document.exitPointerLock?.();
  }

  openRoulette(minBet = 10, maxBet = 2000) {
    this.roulette.setBetLimits(minBet, maxBet);
    this.activeModal = 'roulette';
    document.body.classList.add('ui-active');
    if (this.rouletteModal) this.rouletteModal.classList.add('visible');
    this.updateRouletteBetsUI();
    document.exitPointerLock?.();
  }

  openSlots() {
    this.activeModal = 'slots';
    document.body.classList.add('ui-active');
    if (this.slotsModal) this.slotsModal.classList.add('visible');
    document.exitPointerLock?.();
  }

  openATM() {
    this.activeModal = 'atm';
    document.body.classList.add('ui-active');
    if (this.atmModal) this.atmModal.classList.add('visible');
    this.updateATMDisplay();
    document.exitPointerLock?.();
  }

  closeModal() {
    document.body.classList.remove('ui-active');
    if (this.bjModal) this.bjModal.classList.remove('visible');
    if (this.rouletteModal) this.rouletteModal.classList.remove('visible');
    if (this.slotsModal) this.slotsModal.classList.remove('visible');
    if (this.atmModal) this.atmModal.classList.remove('visible');
    if (this.wheelModal) this.wheelModal.classList.remove('visible');
    this.activeModal = null;

    window.dispatchEvent(new CustomEvent('casino:ui_closed'));
  }

  // -------------------------------------------------------------
  // RENDERING HELPERS
  // -------------------------------------------------------------

  startBlackjackRound(bet) {
    const res = this.blackjack.startNewGame(bet);
    if (!res.success) {
      alert(res.message);
      return;
    }
    this.renderBlackjackState(res);
  }

  renderBlackjackState(state) {
    if (!state || !state.success) return;

    const playerContainer = document.getElementById('bj-player-cards');
    const dealerContainer = document.getElementById('bj-dealer-cards');
    const statusMsg = document.getElementById('bj-status-msg');
    const actionsGroup = document.getElementById('bj-actions-group');
    const bettingGroup = document.getElementById('bj-betting-group');

    // Render Player Cards
    if (playerContainer) {
      playerContainer.innerHTML = '';
      for (const card of state.playerHand || []) {
        playerContainer.appendChild(this.createCardElement(card));
      }
    }

    // Render Dealer Cards
    if (dealerContainer) {
      dealerContainer.innerHTML = '';
      if (state.gameState === 'PLAYER_TURN') {
        dealerContainer.appendChild(this.createCardElement(state.dealerVisible[0]));
        // Hidden card
        const hidden = document.createElement('div');
        hidden.className = 'playing-card card-back';
        hidden.textContent = '🂠';
        dealerContainer.appendChild(hidden);
      } else {
        for (const card of state.dealerHand || []) {
          dealerContainer.appendChild(this.createCardElement(card));
        }
      }
    }

    // Controls visibility
    if (state.gameState === 'PLAYER_TURN') {
      if (actionsGroup) actionsGroup.style.display = 'flex';
      if (bettingGroup) bettingGroup.style.display = 'none';
      if (statusMsg) statusMsg.textContent = `Tu turno (Total: ${state.playerTotal}). Elige acción.`;
    } else {
      if (actionsGroup) actionsGroup.style.display = 'none';
      if (bettingGroup) bettingGroup.style.display = 'flex';
      if (statusMsg) statusMsg.textContent = state.message || 'Ronda finalizada. Coloca tu apuesta.';
    }
  }

  createCardElement(card) {
    const el = document.createElement('div');
    const isRed = ['♥', '♦'].includes(card.suit);
    el.className = `playing-card ${isRed ? 'red' : 'black'}`;
    el.innerHTML = `
      <div class="card-corner top-left">${card.rank}<br>${card.suit}</div>
      <div class="card-suit-center">${card.suit}</div>
      <div class="card-corner bottom-right">${card.rank}<br>${card.suit}</div>
    `;
    return el;
  }

  updateRouletteBetsUI() {
    const betTotalEl = document.getElementById('roulette-total-bet');
    if (betTotalEl) betTotalEl.textContent = `$${this.roulette.getTotalBet().toLocaleString()}`;
  }

  updateATMDisplay() {
    const cashEl = document.getElementById('atm-cash-val');
    const bankEl = document.getElementById('atm-bank-val');
    if (cashEl) cashEl.textContent = `$${this.economy.getCash().toLocaleString()}`;
    if (bankEl) bankEl.textContent = `$${this.economy.getBank().toLocaleString()}`;
  }
}
