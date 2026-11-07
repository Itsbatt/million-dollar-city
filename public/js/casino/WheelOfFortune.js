import AudioManager from '../engine/AudioManager.js';

export class WheelOfFortuneGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.isSpinning = false;
    this.minBet = 50;
    this.maxBet = 10000;

    this.segments = [
      { id: 0, label: '1X', mult: 1, color: '#3a86ff' },
      { id: 1, label: '2X', mult: 2, color: '#8338ec' },
      { id: 2, label: '5X', mult: 5, color: '#ff006e' },
      { id: 3, label: '1X', mult: 1, color: '#3a86ff' },
      { id: 4, label: '10X', mult: 10, color: '#fb5607' },
      { id: 5, label: '2X', mult: 2, color: '#8338ec' },
      { id: 6, label: '20X VIP', mult: 20, color: '#ffbe0b' },
      { id: 7, label: '1X', mult: 1, color: '#3a86ff' },
      { id: 8, label: '40X MEGA', mult: 40, color: '#00f0ff' },
      { id: 9, label: '2X', mult: 2, color: '#8338ec' },
      { id: 10, label: '5X', mult: 5, color: '#ff006e' },
      { id: 11, label: '💎 100X JACKPOT 💎', mult: 100, color: '#ffd700', isJackpot: true }
    ];
  }

  setBetLimits(min, max) {
    this.minBet = min;
    this.maxBet = max;
  }

  spin(bet, onTick, onComplete) {
    if (this.isSpinning) return { success: false, message: 'La ruleta ya está girando' };
    if (bet < this.minBet || bet > this.maxBet) {
      return { success: false, message: `La apuesta debe estar entre $${this.minBet} y $${this.maxBet}` };
    }
    if (!this.economy.hasCash(bet)) {
      return { success: false, message: 'No tienes suficiente efectivo para esta apuesta' };
    }

    this.economy.deductCash(bet);
    this.isSpinning = true;

    // Pick winning segment with weighted probabilities
    const rand = Math.random() * 100;
    let winningIndex = 0;
    if (rand < 2.0) winningIndex = 11; // 100X Jackpot (2%)
    else if (rand < 6.0) winningIndex = 8; // 40X (4%)
    else if (rand < 13.0) winningIndex = 6; // 20X (7%)
    else if (rand < 25.0) winningIndex = 4; // 10X (12%)
    else if (rand < 45.0) winningIndex = Math.random() > 0.5 ? 2 : 10; // 5X (20%)
    else if (rand < 70.0) winningIndex = [1, 5, 9][Math.floor(Math.random() * 3)]; // 2X (25%)
    else winningIndex = [0, 3, 7][Math.floor(Math.random() * 3)]; // 1X (30%)

    const segmentCount = this.segments.length;
    const degreesPerSeg = 360 / segmentCount;
    // Calculate final angle (extra 4-6 full spins + offset)
    const extraSpins = 5;
    const targetDeg = (extraSpins * 360) + ((segmentCount - winningIndex) * degreesPerSeg) - (degreesPerSeg / 2);

    let currentDeg = 0;
    const duration = 4800; // ms
    const startTime = performance.now();
    let lastTickAngle = 0;

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic deceleration
      const easeOut = 1 - Math.pow(1 - t, 3.2);
      currentDeg = easeOut * targetDeg;

      // Play click sound when passing pegs
      if (Math.abs(currentDeg - lastTickAngle) >= degreesPerSeg) {
        lastTickAngle = currentDeg;
        AudioManager.playWheelTick?.();
      }

      if (onTick) onTick(currentDeg, t);

      if (t < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        this.isSpinning = false;
        const winner = this.segments[winningIndex];
        const winAmount = bet * winner.mult;

        this.economy.addCash(winAmount);

        if (winner.isJackpot || winner.mult >= 20) {
          AudioManager.playCasinoWin(true);
        } else if (winner.mult >= 2) {
          AudioManager.playCasinoWin(false);
        }

        const res = {
          success: true,
          winningSegment: winner,
          winAmount,
          bet,
          isJackpot: !!winner.isJackpot,
          message: winner.isJackpot
            ? `👑 ¡¡¡JACKPOT 100X DE LA FORTUNA!!! GANASTE $${winAmount.toLocaleString()} 👑`
            : (winner.mult > 1 ? `🎉 ¡Premio ${winner.label}! Ganaste $${winAmount.toLocaleString()}!` : `Obtuviste $${winAmount.toLocaleString()} (1X)`)
        };

        if (onComplete) onComplete(res);
      }
    };

    requestAnimationFrame(animateSpin);
    return { success: true };
  }
}
