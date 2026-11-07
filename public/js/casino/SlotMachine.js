import AudioManager from '../engine/AudioManager.js';

export class SlotMachineGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.isSpinning = false;
    this.minBet = 10;
    this.maxBet = 500;
    this.currentBet = 50;

    this.symbols = [
      { id: 'cherry', icon: '🍒', weight: 35, name: 'Cereza' },
      { id: 'bell', icon: '🔔', weight: 22, name: 'Campana' },
      { id: 'bar', icon: 'BAR', weight: 16, name: 'Barra' },
      { id: 'diamond', icon: '💎', weight: 10, name: 'Diamante' },
      { id: 'seven', icon: '7️⃣', weight: 6, name: 'Siete' },
      { id: 'dollar', icon: '💵', weight: 3, name: 'Bolsa de Millones' }
    ];

    // Build weighted pool for realistic probability
    this.pool = [];
    for (const sym of this.symbols) {
      for (let i = 0; i < sym.weight; i++) {
        this.pool.push(sym);
      }
    }
  }

  spin(betAmount, onReelTick, onComplete) {
    if (this.isSpinning) return { success: false, message: 'Los rodillos ya están girando' };

    const bet = betAmount || this.currentBet;
    if (bet < this.minBet || bet > this.maxBet) {
      return { success: false, message: `La apuesta debe estar entre $${this.minBet} y $${this.maxBet}` };
    }

    if (this.economy.getCash() < bet) {
      return { success: false, message: 'No tienes suficiente efectivo para tirar' };
    }

    this.isSpinning = true;
    this.currentBet = bet;
    this.economy.modifyCash(-bet, 'Tirada Tragaperras');
    AudioManager.playChipClick();

    // Determine final outcome
    const reel1 = this.pool[Math.floor(Math.random() * this.pool.length)];
    const reel2 = this.pool[Math.floor(Math.random() * this.pool.length)];
    const reel3 = this.pool[Math.floor(Math.random() * this.pool.length)];

    // Animate 3 reels stopping sequentially
    let ticks = 0;
    const maxTicks = 25;
    const interval = setInterval(() => {
      ticks++;
      AudioManager.playSlotSpinTick();

      // intermediate random symbols
      const r1 = ticks < 14 ? this.pool[Math.floor(Math.random() * this.pool.length)] : reel1;
      const r2 = ticks < 20 ? this.pool[Math.floor(Math.random() * this.pool.length)] : reel2;
      const r3 = ticks < 25 ? this.pool[Math.floor(Math.random() * this.pool.length)] : reel3;

      if (onReelTick) onReelTick([r1, r2, r3]);

      if (ticks >= maxTicks) {
        clearInterval(interval);
        this.isSpinning = false;
        const result = this.evaluatePaylines([reel1, reel2, reel3]);
        if (onComplete) onComplete(result);
      }
    }, 70);

    return { success: true };
  }

  evaluatePaylines(reels) {
    const [r1, r2, r3] = reels;
    let multiplier = 0;
    let isJackpot = false;

    if (r1.id === r2.id && r2.id === r3.id) {
      // 3 of a kind
      if (r1.id === 'dollar') { multiplier = 100; isJackpot = true; }
      else if (r1.id === 'seven') { multiplier = 50; isJackpot = true; }
      else if (r1.id === 'diamond') { multiplier = 30; }
      else if (r1.id === 'bar') { multiplier = 18; }
      else if (r1.id === 'bell') { multiplier = 12; }
      else if (r1.id === 'cherry') { multiplier = 6; }
    } else {
      // Special combinations
      const cherryCount = [r1, r2, r3].filter(r => r.id === 'cherry').length;
      if (cherryCount === 2) multiplier = 2.5;
      else if (cherryCount === 1) multiplier = 1.0;
    }

    const winAmount = Math.floor(this.currentBet * multiplier);

    if (winAmount > 0) {
      this.economy.modifyCash(winAmount, `Premio Tragaperras x${multiplier}`);
      AudioManager.playCasinoWin(isJackpot || multiplier >= 20);
    } else {
      AudioManager.playCasinoLoss();
    }

    return {
      reels,
      multiplier,
      winAmount,
      isJackpot,
      message: winAmount > 0 ?
        (isJackpot ? `★ ¡¡JACKPOT HISTÓRICO!! Ganaste $${winAmount.toLocaleString()} ★` : `¡Combinación ganadora! x${multiplier} -> $${winAmount.toLocaleString()}`) :
        'Sin premio en esta tirada. ¡Prueba otra vez!'
    };
  }
}
