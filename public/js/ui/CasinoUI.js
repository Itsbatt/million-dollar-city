import { WheelOfFortuneGame } from '../casino/WheelOfFortune.js';
import { VideoPokerGame } from '../casino/VideoPokerGame.js';
import { PachinkoGame } from '../casino/PachinkoGame.js';
import { CrapsGame } from '../casino/CrapsGame.js';

export class CasinoUI {
  constructor(blackjackGame, rouletteGame, slotGame, economyManager) {
    this.blackjack = blackjackGame;
    this.roulette = rouletteGame;
    this.slots = slotGame;
    this.wheel = new WheelOfFortuneGame(economyManager);
    this.videoPoker = new VideoPokerGame(economyManager);
    this.pachinko = new PachinkoGame(economyManager);
    this.craps = new CrapsGame(economyManager);
    this.economy = economyManager;

    this.activeModal = null; // 'blackjack' | 'roulette' | 'slots' | 'atm' | 'wheel' | 'poker' | 'pachinko' | 'craps'
    this.wheelRotation = 0;
    this.currentWheel3DRef = null;
    this.selectedCrapsChip = 50;

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

    // Modern Minigame Modals
    this.vpModal = document.getElementById('video-poker-modal');
    this.pachinkoModal = document.getElementById('pachinko-modal');
    this.pachinkoCanvas = document.getElementById('pachinko-canvas');
    this.crapsModal = document.getElementById('craps-modal');
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
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    this.renderBlackjackState(res);
    });

    document.getElementById('bj-stand-btn')?.addEventListener('click', () => {
      const res = this.blackjack.stand();
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    this.renderBlackjackState(res);
    });

    document.getElementById('bj-double-btn')?.addEventListener('click', () => {
      const res = this.blackjack.doubleDown();
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    this.renderBlackjackState(res);
    });

    document.getElementById('bj-close-btn')?.addEventListener('click', () => this.closeModal());

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
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));

      this.roulette.spin(
        () => {},
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

    document.getElementById('roulette-close-btn')?.addEventListener('click', () => this.closeModal());

    // -----------------------------------------------------------
    // SLOTS UI BUTTONS
    // -----------------------------------------------------------
    const updateSlotBetDisplays = (bet) => {
      const input = document.getElementById('slots-bet-input');
      if (input) input.value = bet;
      const betDisplay = document.getElementById('slot-current-bet');
      if (betDisplay) betDisplay.textContent = `$${parseInt(bet, 10).toLocaleString()}`;
      if (this.slots?.setBet) this.slots.setBet(parseInt(bet, 10));
    };

    document.querySelectorAll('.slot-quick-bet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bet = e.target.dataset.bet;
        updateSlotBetDisplays(bet);
      });
    });

    document.querySelectorAll('.slot-bet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.slot-bet-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const bet = parseInt(btn.dataset.bet, 10);
        updateSlotBetDisplays(bet);
      });
    });

    document.getElementById('slots-bet-input')?.addEventListener('input', (e) => {
      const bet = parseInt(e.target.value, 10);
      if (!isNaN(bet) && bet >= 10) {
        updateSlotBetDisplays(bet);
      }
    });

    const triggerSlotSpin = () => {
      const spinBtn = document.getElementById('slots-spin-btn') || document.getElementById('slot-spin-btn');
      const betInput = document.getElementById('slots-bet-input');
      const betVal = betInput ? parseInt(betInput.value, 10) : 50;

      if (spinBtn) spinBtn.disabled = true;
      const statusEl = document.getElementById('slots-status-msg') || document.getElementById('slot-status-msg');
      if (statusEl) {
        statusEl.textContent = '¡GIRANDO RODILLOS...! 🎰';
        statusEl.style.color = '#ffd700';
      }
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));

      const res = this.slots.spin(
        betVal,
        (intermediateReels) => {
          const r1 = document.getElementById('reel-1');
          const r2 = document.getElementById('reel-2');
          const r3 = document.getElementById('reel-3');
          if (r1 && intermediateReels[0]) r1.textContent = intermediateReels[0].icon || intermediateReels[0];
          if (r2 && intermediateReels[1]) r2.textContent = intermediateReels[1].icon || intermediateReels[1];
          if (r3 && intermediateReels[2]) r3.textContent = intermediateReels[2].icon || intermediateReels[2];
        },
        (result) => {
          if (spinBtn) spinBtn.disabled = false;
          if (statusEl) {
            statusEl.textContent = result.message;
            statusEl.style.color = (result.winAmount > 0) ? '#00ff88' : '#ff4444';
          }

          const r1 = document.getElementById('reel-1');
          const r2 = document.getElementById('reel-2');
          const r3 = document.getElementById('reel-3');
          if (r1 && result.reels[0]) r1.textContent = result.reels[0].icon || result.reels[0];
          if (r2 && result.reels[1]) r2.textContent = result.reels[1].icon || result.reels[1];
          if (r3 && result.reels[2]) r3.textContent = result.reels[2].icon || result.reels[2];

          const payoutDisplay = document.getElementById('slot-last-win');
          const winVal = result.winAmount !== undefined ? result.winAmount : (result.payout || 0);
          if (payoutDisplay) payoutDisplay.textContent = `$${winVal.toLocaleString()}`;
        }
      );

      if (res && res.success === false) {
        if (spinBtn) spinBtn.disabled = false;
        if (statusEl) {
          statusEl.textContent = res.message;
          statusEl.style.color = '#ff4444';
        }
      }
    };

    document.getElementById('slots-spin-btn')?.addEventListener('click', triggerSlotSpin);
    document.getElementById('slot-spin-btn')?.addEventListener('click', triggerSlotSpin);

    document.getElementById('slots-close-btn')?.addEventListener('click', () => this.closeModal());

    // -----------------------------------------------------------
    // ATM UI BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.atm-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const amount = parseInt(e.target.dataset.amount || '0', 10);
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

    document.getElementById('atm-close-btn')?.addEventListener('click', () => this.closeModal());

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
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));

      const spinBtn = document.getElementById('wheel-spin-btn');
      if (spinBtn) spinBtn.disabled = true;

      this.wheel.spin(
        bet,
        (currentDeg) => {
          this.wheelRotation = currentDeg;
          this.drawWheel2D(currentDeg);
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

    document.getElementById('wheel-close-btn')?.addEventListener('click', () => this.closeModal());

    // -----------------------------------------------------------
    // VIDEO POKER UI BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.vp-quick-bet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const input = document.getElementById('vp-bet-input');
        if (input) input.value = e.target.dataset.bet;
      });
    });

    document.getElementById('vp-deal-btn')?.addEventListener('click', () => {
      const bet = parseInt(document.getElementById('vp-bet-input')?.value || '100', 10);
      const statusEl = document.getElementById('vp-status-msg');
      const dealBtn = document.getElementById('vp-deal-btn');
      const drawBtn = document.getElementById('vp-draw-btn');

      try {
        const res = this.videoPoker.deal(bet);
        window.dispatchEvent(new CustomEvent('casino:bet_placed'));
        this.renderVideoPokerHand(res.hand, true);
        if (statusEl) statusEl.textContent = 'Selecciona las cartas que quieres MANTENER y pulsa ROBAR';
        if (dealBtn) dealBtn.style.display = 'none';
        if (drawBtn) drawBtn.style.display = 'inline-block';
      } catch (e) {
        if (statusEl) statusEl.textContent = e.message;
      }
    });

    document.getElementById('vp-draw-btn')?.addEventListener('click', () => {
      const statusEl = document.getElementById('vp-status-msg');
      const dealBtn = document.getElementById('vp-deal-btn');
      const drawBtn = document.getElementById('vp-draw-btn');

      try {
        const res = this.videoPoker.draw();
        this.renderVideoPokerHand(res.hand, false);
        if (statusEl) {
          statusEl.textContent = `${res.rankName} ${res.isWin ? `— ¡GANASTE $${res.payout.toLocaleString()}!` : ''}`;
        }
        if (dealBtn) dealBtn.style.display = 'inline-block';
        if (drawBtn) drawBtn.style.display = 'none';
      } catch (e) {
        if (statusEl) statusEl.textContent = e.message;
      }
    });

    document.getElementById('vp-close-btn')?.addEventListener('click', () => this.closeModal());

    // -----------------------------------------------------------
    // PACHINKO UI BUTTONS
    // -----------------------------------------------------------
    const getPachinkoBet = () => {
      const input = document.getElementById('pachinko-bet-input');
      const select = document.getElementById('pachinko-bet-select');
      let val = input ? parseInt(input.value, 10) : 0;
      if (isNaN(val) || val < 1) {
        val = select ? parseInt(select.value, 10) : 50;
      }
      return Math.max(1, val);
    };

    document.getElementById('pachinko-bet-select')?.addEventListener('change', (e) => {
      const input = document.getElementById('pachinko-bet-input');
      if (input) input.value = e.target.value;
    });

    const launchPachinkoBalls = (count) => {
      const bet = getPachinkoBet();
      const statusEl = document.getElementById('pachinko-status-msg');
      try {
        this.pachinko.launchBalls(count, bet);
        window.dispatchEvent(new CustomEvent('casino:bet_placed'));
        if (statusEl) {
          statusEl.textContent = `⚪ ¡Lanzadas ${count} bolas ($${(bet * count).toLocaleString()})!`;
          statusEl.style.color = '#00f0ff';
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.message;
          statusEl.style.color = '#ff4444';
        }
      }
    };

    document.getElementById('pachinko-launch-1-btn')?.addEventListener('click', () => launchPachinkoBalls(1));
    document.getElementById('pachinko-launch-5-btn')?.addEventListener('click', () => launchPachinkoBalls(5));
    document.getElementById('pachinko-launch-10-btn')?.addEventListener('click', () => launchPachinkoBalls(10));
    document.getElementById('pachinko-launch-20-btn')?.addEventListener('click', () => launchPachinkoBalls(20));

    window.addEventListener('pachinko:ball_landed', (e) => {
      const statusEl = document.getElementById('pachinko-status-msg');
      if (!statusEl) return;
      const { multiplier, payout, label, isJackpot } = e.detail;
      if (payout > 0) {
        statusEl.textContent = isJackpot
          ? `★ ¡¡JACKPOT HISTÓRICO!! 777 — ¡Ganaste $${payout.toLocaleString()}! ★`
          : `¡Premio en ${label}! (x${multiplier}) -> +$${payout.toLocaleString()}`;
        statusEl.style.color = isJackpot ? '#ffd700' : '#00ff88';
      } else {
        statusEl.textContent = `Bola en ${label} (x${multiplier}) — $0`;
        statusEl.style.color = '#94a3b8';
      }
    });

    document.getElementById('pachinko-close-btn')?.addEventListener('click', () => this.closeModal());

    // -----------------------------------------------------------
    // CRAPS UI BUTTONS
    // -----------------------------------------------------------
    document.querySelectorAll('.craps-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.craps-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCrapsChip = parseInt(btn.dataset.chip, 10);
      });
    });

    document.querySelectorAll('.craps-bet-box').forEach(box => {
      box.addEventListener('click', () => {
        const betType = box.dataset.bet;
        try {
          const bets = this.craps.placeBet(betType, this.selectedCrapsChip);
          this.updateCrapsBetsUI(bets);
        } catch (e) {
          const status = document.getElementById('craps-status-msg');
          if (status) status.textContent = e.message;
        }
      });
    });

    document.getElementById('craps-clear-btn')?.addEventListener('click', () => {
      const bets = this.craps.clearBets();
      this.updateCrapsBetsUI(bets);
    });

    document.getElementById('craps-roll-btn')?.addEventListener('click', () => {
      const d1El = document.getElementById('dice-1');
      const d2El = document.getElementById('dice-2');
      const sumEl = document.getElementById('craps-sum-val');
      const puckEl = document.getElementById('craps-point-puck');
      const statusEl = document.getElementById('craps-status-msg');

      d1El?.classList.add('rolling');
      d2El?.classList.add('rolling');

      setTimeout(() => {
        d1El?.classList.remove('rolling');
        d2El?.classList.remove('rolling');

        try {
          const res = this.craps.roll();
          const diceGlyphs = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
          if (d1El) d1El.textContent = diceGlyphs[res.dice[0]];
          if (d2El) d2El.textContent = diceGlyphs[res.dice[1]];
          if (sumEl) sumEl.textContent = res.sum;
          if (puckEl) {
            puckEl.textContent = res.point ? `POINT: ${res.point}` : 'POINT: OFF';
            puckEl.style.background = res.point ? '#00f0ff' : '#d90429';
            puckEl.style.color = res.point ? '#000' : '#fff';
          }
          if (statusEl) statusEl.textContent = res.message;
          this.updateCrapsBetsUI(res.remainingBets);
        } catch (e) {
          if (statusEl) statusEl.textContent = e.message;
        }
      }, 350);
    });

    document.getElementById('craps-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  // -------------------------------------------------------------
  // OPEN / CLOSE MODALS
  // -------------------------------------------------------------

  openVideoPoker(item = null) {
    this.activeModal = 'poker';
    document.body.classList.add('ui-active');
    if (this.vpModal) this.vpModal.classList.add('visible');
    const container = document.getElementById('vp-cards-row');
    if (container && container.children.length === 0) {
      container.innerHTML = `
        <div class="vp-card-box"><div style="text-align:center; padding-top:40px; color:#aaa; font-weight:bold;">🂠</div></div>
        <div class="vp-card-box"><div style="text-align:center; padding-top:40px; color:#aaa; font-weight:bold;">🂠</div></div>
        <div class="vp-card-box"><div style="text-align:center; padding-top:40px; color:#aaa; font-weight:bold;">🂠</div></div>
        <div class="vp-card-box"><div style="text-align:center; padding-top:40px; color:#aaa; font-weight:bold;">🂠</div></div>
        <div class="vp-card-box"><div style="text-align:center; padding-top:40px; color:#aaa; font-weight:bold;">🂠</div></div>
      `;
    }
    document.exitPointerLock?.();
  }

  openPachinko(item = null) {
    this.activeModal = 'pachinko';
    document.body.classList.add('ui-active');
    if (this.pachinkoModal) this.pachinkoModal.classList.add('visible');
    if (this.pachinkoCanvas) this.pachinko.attachCanvas(this.pachinkoCanvas);
    document.exitPointerLock?.();
  }

  openCraps(item = null) {
    this.activeModal = 'craps';
    document.body.classList.add('ui-active');
    if (this.crapsModal) this.crapsModal.classList.add('visible');
    this.updateCrapsBetsUI(this.craps.bets);
    document.exitPointerLock?.();
  }

  openBlackjack(minBet = 25, maxBet = Infinity) {
    this.blackjack.setBetLimits(minBet, maxBet);
    this.activeModal = 'blackjack';
    document.body.classList.add('ui-active');
    if (this.bjModal) this.bjModal.classList.add('visible');
    document.exitPointerLock?.();
  }

  openRoulette(minBet = 10, maxBet = Infinity) {
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

  openWheelOfFortune(item = null) {
    this.currentWheel3DRef = item?.discRef || null;
    this.activeModal = 'wheel';
    document.body.classList.add('ui-active');
    if (this.wheelModal) this.wheelModal.classList.add('visible');
    this.drawWheel2D(this.wheelRotation);
    document.exitPointerLock?.();
  }

  closeModal() {
    document.body.classList.remove('ui-active');
    if (this.bjModal) this.bjModal.classList.remove('visible');
    if (this.rouletteModal) this.rouletteModal.classList.remove('visible');
    if (this.slotsModal) this.slotsModal.classList.remove('visible');
    if (this.atmModal) this.atmModal.classList.remove('visible');
    if (this.wheelModal) this.wheelModal.classList.remove('visible');
    if (this.vpModal) this.vpModal.classList.remove('visible');
    if (this.pachinkoModal) {
      this.pachinkoModal.classList.remove('visible');
      this.pachinko.stopLoop();
    }
    if (this.crapsModal) this.crapsModal.classList.remove('visible');
    this.activeModal = null;

    window.dispatchEvent(new CustomEvent('casino:ui_closed'));
  }

  // -------------------------------------------------------------
  // RENDERING HELPERS
  // -------------------------------------------------------------

  renderVideoPokerHand(hand, canHold = true) {
    const container = document.getElementById('vp-cards-row');
    if (!container) return;
    container.innerHTML = '';

    hand.forEach((card, idx) => {
      const box = document.createElement('div');
      box.className = `vp-card-box ${card.held ? 'held' : ''}`;
      box.style.color = card.isRed ? '#ff2a4d' : '#000';

      box.innerHTML = `
        ${card.held ? '<div class="vp-hold-tag">HELD</div>' : ''}
        <div style="font-weight:bold; font-size:16px;">${card.name}</div>
        <div style="font-size:32px; text-align:center;">${card.suit}</div>
        <div style="font-weight:bold; font-size:16px; text-align:right;">${card.name}</div>
      `;

      if (canHold) {
        box.addEventListener('click', () => {
          this.videoPoker.toggleHold(idx);
          this.renderVideoPokerHand(this.videoPoker.hand, true);
        });
      }

      container.appendChild(box);
    });
  }

  updateCrapsBetsUI(bets) {
    for (const [key, val] of Object.entries(bets || {})) {
      const el = document.getElementById(`wager-${key}`);
      if (el) el.textContent = `$${val.toLocaleString()}`;
    }
  }

  drawWheel2D(angleDeg = 0) {
    if (!this.wheelCtx || !this.wheelCanvas) return;
    const ctx = this.wheelCtx;
    const size = this.wheelCanvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((angleDeg * Math.PI) / 180);

    const segments = this.wheel.segments;
    const segAngle = (Math.PI * 2) / segments.length;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const startA = i * segAngle;
      const endA = startA + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffd700';
      ctx.stroke();

      ctx.save();
      ctx.rotate(startA + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(seg.label, radius - 15, 5);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }

  startBlackjackRound(bet) {
    const res = this.blackjack.startNewGame(bet);
    if (!res.success) {
      alert(res.message);
      return;
    }
    window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    this.renderBlackjackState(res);
  }

  renderBlackjackState(state) {
    if (!state || !state.success) return;

    const playerContainer = document.getElementById('bj-player-cards');
    const dealerContainer = document.getElementById('bj-dealer-cards');
    const statusMsg = document.getElementById('bj-status-msg');
    const actionsGroup = document.getElementById('bj-actions-group');
    const bettingGroup = document.getElementById('bj-betting-group');

    if (playerContainer) {
      playerContainer.innerHTML = '';
      for (const card of state.playerHand || []) {
        playerContainer.appendChild(this.createCardElement(card));
      }
    }

    if (dealerContainer) {
      dealerContainer.innerHTML = '';
      if (state.gameState === 'PLAYER_TURN') {
        dealerContainer.appendChild(this.createCardElement(state.dealerVisible[0]));
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
