import AudioManager from '../engine/AudioManager.js';

export class RouletteGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.currentBets = []; // [{ type: 'red', amount: 100 }, { type: 'straight', number: 17, amount: 50 }]
    this.isSpinning = false;
    this.lastResult = null;
    this.minBet = 10;
    this.maxBet = 2000;

    // European Roulette Numbers Wheel Sequence
    this.wheelNumbers = [
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    this.redNumbers = new Set([
      1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
    ]);
  }

  setBetLimits(min, max) {
    this.minBet = min;
    this.maxBet = max;
  }

  addBet(betType, amount, targetNumber = null) {
    if (this.isSpinning) return { success: false, message: 'La ruleta ya está girando' };

    if (amount < this.minBet || amount > this.maxBet) {
      return { success: false, message: `La ficha debe ser entre $${this.minBet} y $${this.maxBet}` };
    }

    if (this.economy.getCash() < amount) {
      return { success: false, message: 'No tienes suficiente efectivo en mano' };
    }

    this.economy.modifyCash(-amount, `Apuesta Ruleta (${betType}${targetNumber !== null ? ' #' + targetNumber : ''})`);
    AudioManager.playChipClick();

    this.currentBets.push({
      type: betType,
      amount,
      number: targetNumber
    });

    return {
      success: true,
      currentBets: this.currentBets,
      totalBet: this.getTotalBet()
    };
  }

  clearBets() {
    if (this.isSpinning) return;
    for (const b of this.currentBets) {
      this.economy.modifyCash(b.amount, 'Reembolso Ruleta');
    }
    this.currentBets = [];
  }

  getTotalBet() {
    return this.currentBets.reduce((acc, b) => acc + b.amount, 0);
  }

  spin(onTick, onComplete) {
    if (this.isSpinning) return;
    if (this.currentBets.length === 0) {
      return { success: false, message: 'Debes colocar al menos una ficha en el tapete' };
    }

    this.isSpinning = true;

    // Pick random outcome
    const winningIndex = Math.floor(Math.random() * this.wheelNumbers.length);
    const winningNumber = this.wheelNumbers[winningIndex];

    // Play ticking animation decelerating over 3.2 seconds
    let elapsed = 0;
    let tickDelay = 60;
    const totalDuration = 3200;

    const tick = () => {
      elapsed += tickDelay;
      tickDelay *= 1.07; // decelerate
      AudioManager.playRouletteTick();
      if (onTick) onTick(elapsed / totalDuration);

      if (elapsed < totalDuration) {
        setTimeout(tick, tickDelay);
      } else {
        // Spin finished
        this.isSpinning = false;
        const result = this.evaluateSpin(winningNumber);
        this.lastResult = result;
        this.currentBets = [];
        if (onComplete) onComplete(result);
      }
    };

    setTimeout(tick, tickDelay);
    return { success: true };
  }

  evaluateSpin(winningNumber) {
    const isRed = this.redNumbers.has(winningNumber);
    const isZero = winningNumber === 0;
    const isEven = !isZero && winningNumber % 2 === 0;
    const isLow = !isZero && winningNumber >= 1 && winningNumber <= 18;

    let totalWin = 0;

    for (const bet of this.currentBets) {
      let won = false;
      let multiplier = 0;

      switch (bet.type) {
        case 'straight':
          if (bet.number === winningNumber) {
            won = true;
            multiplier = 36; // 35:1 profit + original bet
          }
          break;
        case 'red':
          if (isRed) { won = true; multiplier = 2; }
          break;
        case 'black':
          if (!isRed && !isZero) { won = true; multiplier = 2; }
          break;
        case 'even':
          if (isEven) { won = true; multiplier = 2; }
          break;
        case 'odd':
          if (!isEven && !isZero) { won = true; multiplier = 2; }
          break;
        case 'low': // 1-18
          if (isLow) { won = true; multiplier = 2; }
          break;
        case 'high': // 19-36
          if (!isLow && !isZero) { won = true; multiplier = 2; }
          break;
        case 'dozen1': // 1-12
          if (winningNumber >= 1 && winningNumber <= 12) { won = true; multiplier = 3; }
          break;
        case 'dozen2': // 13-24
          if (winningNumber >= 13 && winningNumber <= 24) { won = true; multiplier = 3; }
          break;
        case 'dozen3': // 25-36
          if (winningNumber >= 25 && winningNumber <= 36) { won = true; multiplier = 3; }
          break;
        case 'col1': // 1, 4, 7...
          if (!isZero && (winningNumber - 1) % 3 === 0) { won = true; multiplier = 3; }
          break;
        case 'col2': // 2, 5, 8...
          if (!isZero && (winningNumber - 2) % 3 === 0) { won = true; multiplier = 3; }
          break;
        case 'col3': // 3, 6, 9...
          if (!isZero && winningNumber % 3 === 0) { won = true; multiplier = 3; }
          break;
      }

      if (won) {
        totalWin += bet.amount * multiplier;
      }
    }

    const colorStr = isZero ? 'Verde' : (isRed ? 'Rojo' : 'Negro');

    if (totalWin > 0) {
      this.economy.modifyCash(totalWin, `Premio Ruleta (#${winningNumber} ${colorStr})`);
      AudioManager.playCasinoWin(totalWin >= 1000);
    } else {
      AudioManager.playCasinoLoss();
    }

    return {
      winningNumber,
      color: colorStr,
      isZero,
      totalWin,
      message: totalWin > 0 ?
        `¡Número #${winningNumber} (${colorStr})! Has ganado $${totalWin.toLocaleString()}` :
        `Número #${winningNumber} (${colorStr}). Suerte para la próxima.`
    };
  }
}
