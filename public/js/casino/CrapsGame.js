// CrapsGame.js - Authentic Casino Craps & Street Dice for Million Dollar City

export class CrapsGame {
  constructor(economyManager) {
    this.economy = economyManager;

    this.point = null; // null or 4, 5, 6, 8, 9, 10
    this.bets = {
      passLine: 0,
      field: 0,
      anySeven: 0,
      anyCraps: 0
    };

    this.lastDice = [1, 1];
    this.lastSum = 2;
    this.lastPayout = 0;
    this.lastMessage = 'Haz tus apuestas y lanza los dados';
  }

  placeBet(type, amount) {
    const betVal = Math.max(50, Number(amount) || 50);
    if (!this.economy.deductCash(betVal)) {
      throw new Error('Efectivo insuficiente para apostar $' + betVal.toLocaleString());
    }

    this.bets[type] = (this.bets[type] || 0) + betVal;
    return this.bets;
  }

  clearBets() {
    this.bets = { passLine: 0, field: 0, anySeven: 0, anyCraps: 0 };
    return this.bets;
  }

  roll() {
    const totalWager = Object.values(this.bets).reduce((a, b) => a + b, 0);
    if (totalWager <= 0) {
      throw new Error('Debes colocar al menos una apuesta antes de tirar los dados');
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    this.lastDice = [d1, d2];
    this.lastSum = sum;

    let payout = 0;
    const logMessages = [];

    // 1. Evaluate Field Bet (Single Roll)
    if (this.bets.field > 0) {
      const fBet = this.bets.field;
      if (sum === 2) {
        const win = fBet * 3; // 2:1 profit + return
        payout += win;
        logMessages.push(`¡Field Ganador en 2 (Doble)! +$${win.toLocaleString()}`);
      } else if (sum === 12) {
        const win = fBet * 4; // 3:1 profit + return
        payout += win;
        logMessages.push(`¡Field Ganador en 12 (Triple)! +$${win.toLocaleString()}`);
      } else if ([3, 4, 9, 10, 11].includes(sum)) {
        const win = fBet * 2; // 1:1 profit + return
        payout += win;
        logMessages.push(`¡Field Ganador! +$${win.toLocaleString()}`);
      } else {
        logMessages.push(`Field Perdido (${sum})`);
      }
      this.bets.field = 0; // Field is always a 1-roll proposition
    }

    // 2. Evaluate Any Seven (Single Roll, pays 4:1)
    if (this.bets.anySeven > 0) {
      if (sum === 7) {
        const win = this.bets.anySeven * 5;
        payout += win;
        logMessages.push(`¡Any Seven Ganador! +$${win.toLocaleString()}`);
      } else {
        logMessages.push(`Any Seven Perdido`);
      }
      this.bets.anySeven = 0;
    }

    // 3. Evaluate Any Craps (Single Roll: 2, 3, 12 pays 7:1)
    if (this.bets.anyCraps > 0) {
      if ([2, 3, 12].includes(sum)) {
        const win = this.bets.anyCraps * 8;
        payout += win;
        logMessages.push(`¡Any Craps Ganador (${sum})! +$${win.toLocaleString()}`);
      } else {
        logMessages.push(`Any Craps Perdido`);
      }
      this.bets.anyCraps = 0;
    }

    // 4. Evaluate Pass Line (Multi-Roll Game)
    if (this.bets.passLine > 0) {
      const passBet = this.bets.passLine;

      if (this.point === null) {
        // Come-Out Roll
        if (sum === 7 || sum === 11) {
          const win = passBet * 2;
          payout += win;
          logMessages.push(`¡LÍNEA DE PASE GANADORA! (${sum} Natural) +$${win.toLocaleString()}`);
          this.bets.passLine = 0;
        } else if (sum === 2 || sum === 3 || sum === 12) {
          logMessages.push(`¡Craps (${sum})! Línea de Pase Perdida.`);
          this.bets.passLine = 0;
        } else {
          this.point = sum;
          logMessages.push(`¡PUNTO ESTABLECIDO EN [${sum}]! Tira otra vez.`);
        }
      } else {
        // Point is active
        if (sum === this.point) {
          const win = passBet * 2;
          payout += win;
          logMessages.push(`¡PUNTO CONSEGUIDO [${this.point}]! +$${win.toLocaleString()}`);
          this.point = null;
          this.bets.passLine = 0;
        } else if (sum === 7) {
          logMessages.push(`¡Seven Out (7)! Línea de Pase Perdida.`);
          this.point = null;
          this.bets.passLine = 0;
        } else {
          logMessages.push(`Tirada: ${sum}. Buscando el Punto [${this.point}].`);
        }
      }
    }

    this.lastPayout = payout;
    if (payout > 0) {
      this.economy.addCash(payout);
    }

    this.lastMessage = logMessages.join(' | ') || `Tirada: ${sum}`;

    return {
      dice: [d1, d2],
      sum,
      point: this.point,
      payout,
      isWin: payout > 0,
      message: this.lastMessage,
      remainingBets: this.bets
    };
  }
}
