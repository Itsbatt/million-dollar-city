/**
 * Million Dollar City - JailUI.js
 * Handles the Busted / Arrest & Bail System for LSPD Central Jail
 */
import AudioManager from '../engine/AudioManager.js';

export class JailUI {
  constructor(game) {
    this.game = game;
    this.modal = document.getElementById('jail-modal');
    this.closeBtn = document.getElementById('jail-close-btn');
    this.reasonText = document.getElementById('jail-reason-text');
    this.starsContainer = document.getElementById('jail-stars-container');
    this.bailAmountEl = document.getElementById('jail-bail-amount');
    this.userCashEl = document.getElementById('jail-user-cash');
    this.userBankEl = document.getElementById('jail-user-bank');
    this.statusMsgEl = document.getElementById('jail-status-msg');

    this.actionsBox = document.getElementById('jail-actions-box');
    this.sentenceBox = document.getElementById('jail-sentence-timer-box');
    this.countdownEl = document.getElementById('jail-countdown-seconds');

    this.payBailBtn = document.getElementById('jail-pay-bail-btn');
    this.serveSentenceBtn = document.getElementById('jail-serve-sentence-btn');

    this.currentBail = 1000;
    this.currentStars = 1;
    this.isServingSentence = false;
    this.isStrictBusted = false;
    this.sentenceTimer = null;

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('police:busted', (e) => {
      this.handleBusted(e.detail);
    });

    this.payBailBtn?.addEventListener('click', () => {
      this.payBail();
    });

    this.serveSentenceBtn?.addEventListener('click', () => {
      this.startSentence();
    });

    this.closeBtn?.addEventListener('click', () => {
      // Can only close freely if not serving active sentence and not strictly busted without paying
      if (this.isServingSentence) return;
      if (this.game.police && this.game.police.getWantedLevel() === 0 && !this.isStrictBusted) {
        this.close();
      } else {
        if (this.statusMsgEl) {
          this.statusMsgEl.textContent = '⚠️ Debes pagar la fianza o cumplir tu condena para salir del recinto.';
          this.statusMsgEl.style.color = '#ffaa00';
        }
      }
    });
  }

  handleBusted(detail = {}) {
    this.currentStars = detail.stars || 1;
    this.currentBail = detail.bail || Math.max(500, this.currentStars * 500);
    this.isStrictBusted = true;
    this.isServingSentence = false;
    if (this.sentenceTimer) {
      clearInterval(this.sentenceTimer);
      this.sentenceTimer = null;
    }

    // Release mouse pointer lock so the player can click the UI
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch (e) {}

    // Populate UI
    if (this.reasonText) {
      const reasonLabel = detail.reason === 'subdued'
        ? 'Neutralizado por disparos tácticos de las patrullas del LSPD'
        : 'Acorralado e inmovilizado por persecución policial del LSPD';
      this.reasonText.textContent = reasonLabel;
    }

    if (this.starsContainer) {
      this.starsContainer.textContent = '⭐'.repeat(this.currentStars);
    }

    if (this.bailAmountEl) {
      this.bailAmountEl.textContent = `$${this.currentBail.toLocaleString()}`;
    }

    if (this.payBailBtn) this.payBailBtn.style.display = 'block';
    if (this.serveSentenceBtn) this.serveSentenceBtn.style.display = 'block';

    this.updateUserFunds();

    if (this.actionsBox) this.actionsBox.style.display = 'flex';
    if (this.sentenceBox) this.sentenceBox.style.display = 'none';
    if (this.statusMsgEl) {
      this.statusMsgEl.textContent = 'Elige cómo resolver tus cargos judiciales para recuperar tu libertad.';
      this.statusMsgEl.style.color = '#00a2ff';
    }

    this.modal?.classList.add('visible');
    AudioManager.playCasinoLoss();
  }

  openStationVisit() {
    this.isStrictBusted = false;
    const currentStars = this.game.police ? this.game.police.getWantedLevel() : 0;
    this.currentStars = Math.max(0, currentStars);
    this.currentBail = this.currentStars > 0 ? this.currentStars * 500 : 0;

    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch (e) {}

    if (this.reasonText) {
      this.reasonText.textContent = this.currentStars > 0
        ? 'Tienes una orden de busca y captura activa del LSPD.'
        : 'Comisaría Central del LSPD • Atención Ciudadana y Fianzas';
    }

    if (this.starsContainer) {
      this.starsContainer.textContent = this.currentStars > 0 ? '⭐'.repeat(this.currentStars) : 'Sin antecedentes penales activos';
    }

    if (this.bailAmountEl) {
      this.bailAmountEl.textContent = `$${this.currentBail.toLocaleString()}`;
    }

    this.updateUserFunds();

    if (this.actionsBox) this.actionsBox.style.display = 'flex';
    if (this.sentenceBox) this.sentenceBox.style.display = 'none';

    if (this.currentStars === 0) {
      if (this.payBailBtn) this.payBailBtn.style.display = 'none';
      if (this.serveSentenceBtn) this.serveSentenceBtn.style.display = 'none';
      if (this.statusMsgEl) {
        this.statusMsgEl.textContent = '✓ No tienes antecedentes ni causas pendientes con el LSPD. ¡Circule seguro!';
        this.statusMsgEl.style.color = '#00ff88';
      }
    } else {
      if (this.payBailBtn) this.payBailBtn.style.display = 'block';
      if (this.serveSentenceBtn) this.serveSentenceBtn.style.display = 'block';
      if (this.statusMsgEl) {
        this.statusMsgEl.textContent = 'Paga la fianza administrativa para limpiar de inmediato tus estrellas delictivas.';
        this.statusMsgEl.style.color = '#ffd700';
      }
    }

    this.modal?.classList.add('visible');
  }

  updateUserFunds() {
    const cash = this.game.economy ? this.game.economy.cash : 0;
    const bank = this.game.economy ? this.game.economy.bank : 0;
    if (this.userCashEl) this.userCashEl.textContent = `$${cash.toLocaleString()}`;
    if (this.userBankEl) this.userBankEl.textContent = `$${bank.toLocaleString()}`;
  }

  payBail() {
    const cash = this.game.economy ? this.game.economy.cash : 0;
    const bank = this.game.economy ? this.game.economy.bank : 0;
    const totalFunds = cash + bank;

    if (totalFunds < this.currentBail) {
      AudioManager.playCasinoLoss();
      if (this.statusMsgEl) {
        this.statusMsgEl.textContent = `❌ Fondos insuficientes ($${totalFunds.toLocaleString()} de $${this.currentBail.toLocaleString()}). Debes cumplir la condena penitenciaria de 15s.`;
        this.statusMsgEl.style.color = '#ff3333';
      }
      return;
    }

    // Deduct bail amount
    let remaining = this.currentBail;
    if (cash >= remaining) {
      this.game.economy.modifyCash(-remaining, `Fianza penal LSPD (${this.currentStars}★)`);
    } else {
      remaining -= cash;
      this.game.economy.modifyCash(-cash, `Fianza penal LSPD (${this.currentStars}★)`);
      this.game.economy.modifyBank(-remaining, `Fianza penal LSPD cargo bancario`);
    }

    AudioManager.playCasinoWin();
    this.releasePlayer(`👮 ¡Fianza de $${this.currentBail.toLocaleString()} pagada! Has sido puesto en libertad condicional.`);
  }

  startSentence() {
    if (this.isServingSentence) return;
    this.isServingSentence = true;

    if (this.actionsBox) this.actionsBox.style.display = 'none';
    if (this.sentenceBox) this.sentenceBox.style.display = 'block';
    if (this.statusMsgEl) {
      this.statusMsgEl.textContent = 'Cumpliendo pena en el pabellón de celdas del LSPD...';
      this.statusMsgEl.style.color = '#ffaa00';
    }

    let timeLeft = 15;
    if (this.countdownEl) this.countdownEl.textContent = `${timeLeft}s`;

    this.sentenceTimer = setInterval(() => {
      timeLeft--;
      if (this.countdownEl) this.countdownEl.textContent = `${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(this.sentenceTimer);
        this.sentenceTimer = null;
        this.isServingSentence = false;
        AudioManager.playChipClick();
        this.releasePlayer('🏛️ ¡Has cumplido tu condena penitenciaria! El LSPD te ha concedido la libertad.');
      }
    }, 1000);
  }

  releasePlayer(message) {
    if (this.sentenceTimer) {
      clearInterval(this.sentenceTimer);
      this.sentenceTimer = null;
    }
    this.isServingSentence = false;
    this.isStrictBusted = false;

    // Reset police wanted stars
    if (this.game.police) {
      this.game.police.clearWantedLevel();
    }

    // Restore full player health and armor
    if (this.game.player) {
      this.game.player.health = this.game.player.maxHealth;
      // Teleport safely outside the LSPD front sidewalk
      const releasePos = { x: -16.5, y: 0.2, z: -125.0 };
      this.game.player.respawn(releasePos);
      if (this.game.player.mesh) this.game.player.mesh.visible = true;
    }

    if (this.game.hud && this.game.player) {
      this.game.hud.updatePlayerVitals(
        this.game.player.health,
        this.game.player.maxHealth,
        this.game.player.armor,
        this.game.player.maxArmor
      );
    }

    this.close();

    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: {
        message: message || 'Has salido de prisión. ¡Mantén la cabeza baja!',
        type: 'success'
      }
    }));

    // Trigger auto save
    window.dispatchEvent(new CustomEvent('save:state_requested'));
  }

  close() {
    this.modal?.classList.remove('visible');
  }
}
