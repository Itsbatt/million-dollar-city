// VideoPokerGame.js - Authentic Jacks or Better Video Poker for Million Dollar City

export class VideoPokerGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.suits = ['♠', '♥', '♦', '♣'];
    this.values = [
      { name: '2', val: 2 }, { name: '3', val: 3 }, { name: '4', val: 4 },
      { name: '5', val: 5 }, { name: '6', val: 6 }, { name: '7', val: 7 },
      { name: '8', val: 8 }, { name: '9', val: 9 }, { name: '10', val: 10 },
      { name: 'J', val: 11 }, { name: 'Q', val: 12 }, { name: 'K', val: 13 }, { name: 'A', val: 14 }
    ];

    this.deck = [];
    this.hand = []; // 5 cards: { suit, name, val, held }
    this.bet = 100;
    this.phase = 'BETTING'; // 'BETTING' | 'HOLD' | 'RESULT'
    this.lastWin = 0;
    this.lastHandRank = '';
  }

  createDeck() {
    this.deck = [];
    for (const s of this.suits) {
      for (const v of this.values) {
        this.deck.push({
          suit: s,
          name: v.name,
          val: v.val,
          isRed: (s === '♥' || s === '♦'),
          held: false
        });
      }
    }
    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  deal(betAmount) {
    if (this.phase === 'HOLD') {
      throw new Error('Debes descartar o robar para terminar la mano actual');
    }

    const bet = Math.max(50, Number(betAmount) || 100);
    if (!this.economy.deductCash(bet)) {
      throw new Error('No tienes suficiente efectivo para apostar $' + bet.toLocaleString());
    }

    this.bet = bet;
    this.createDeck();
    this.hand = [];

    for (let i = 0; i < 5; i++) {
      const card = this.deck.pop();
      card.held = false;
      this.hand.push(card);
    }

    this.phase = 'HOLD';
    this.lastWin = 0;
    this.lastHandRank = '';

    return {
      hand: this.hand,
      phase: this.phase,
      bet: this.bet
    };
  }

  toggleHold(index) {
    if (this.phase !== 'HOLD') return;
    if (index >= 0 && index < this.hand.length) {
      this.hand[index].held = !this.hand[index].held;
    }
    return this.hand;
  }

  draw() {
    if (this.phase !== 'HOLD') {
      throw new Error('Primero debes repartir las cartas');
    }

    // Replace non-held cards
    for (let i = 0; i < this.hand.length; i++) {
      if (!this.hand[i].held) {
        this.hand[i] = this.deck.pop();
        this.hand[i].held = false;
      }
    }

    this.phase = 'RESULT';
    const evalResult = this.evaluateHand(this.hand);
    this.lastHandRank = evalResult.rankName;

    const payout = Math.floor(this.bet * evalResult.multiplier);
    this.lastWin = payout;

    if (payout > 0) {
      this.economy.addCash(payout);
    }

    return {
      hand: this.hand,
      phase: this.phase,
      rankName: evalResult.rankName,
      multiplier: evalResult.multiplier,
      payout,
      isWin: payout > 0
    };
  }

  evaluateHand(hand) {
    const sorted = [...hand].sort((a, b) => a.val - b.val);
    const vals = sorted.map(c => c.val);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);

    // Check Straight (including A-2-3-4-5 low straight)
    let isStraight = false;
    if (vals[4] - vals[0] === 4 && new Set(vals).size === 5) {
      isStraight = true;
    } else if (vals[0] === 2 && vals[1] === 3 && vals[2] === 4 && vals[3] === 5 && vals[4] === 14) {
      isStraight = true;
    }

    const counts = {};
    for (const v of vals) {
      counts[v] = (counts[v] || 0) + 1;
    }
    const freq = Object.values(counts).sort((a, b) => b - a);

    // Royal Flush
    if (isFlush && isStraight && vals[4] === 14 && vals[0] === 10) {
      return { rankName: '¡ESCALERA REAL DE COLOR! 👑', multiplier: 250 };
    }
    // Straight Flush
    if (isFlush && isStraight) {
      return { rankName: '¡Escalera de Color! 🌟', multiplier: 50 };
    }
    // 4 of a Kind (Póker)
    if (freq[0] === 4) {
      return { rankName: '¡Póker! (4 Iguales) 💎', multiplier: 25 };
    }
    // Full House
    if (freq[0] === 3 && freq[1] === 2) {
      return { rankName: '¡Full House! 🏰', multiplier: 9 };
    }
    // Flush (Color)
    if (isFlush) {
      return { rankName: 'Color (Flush) 🎨', multiplier: 6 };
    }
    // Straight (Escalera)
    if (isStraight) {
      return { rankName: 'Escalera (Straight) 📈', multiplier: 4 };
    }
    // 3 of a Kind (Trío)
    if (freq[0] === 3) {
      return { rankName: 'Trío (Three of a Kind) 🎯', multiplier: 3 };
    }
    // Two Pair (Doble Pareja)
    if (freq[0] === 2 && freq[1] === 2) {
      return { rankName: 'Doble Pareja ✌️', multiplier: 2 };
    }
    // Jacks or Better (Pareja de Jotas o Superior: J, Q, K, A)
    if (freq[0] === 2) {
      const pairVal = Number(Object.keys(counts).find(k => counts[k] === 2));
      if (pairVal >= 11) {
        return { rankName: 'Jacks or Better (J, Q, K o As) 🃏', multiplier: 1 };
      }
    }

    return { rankName: 'Carta Alta (Sin Premio)', multiplier: 0 };
  }
}
