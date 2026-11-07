import AudioManager from '../engine/AudioManager.js';

export class BlackjackGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.deck = [];
    this.playerHand = [];
    this.dealerHand = [];
    this.currentBet = 0;
    this.gameState = 'BETTING'; // 'BETTING', 'PLAYER_TURN', 'DEALER_TURN', 'RESOLVED'
    this.minBet = 25;
    this.maxBet = 5000;
  }

  setBetLimits(min, max) {
    this.minBet = min;
    this.maxBet = max;
  }

  generateDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.deck = [];

    for (let d = 0; d < 4; d++) { // 4-deck shoe
      for (const suit of suits) {
        for (const rank of ranks) {
          let value = parseInt(rank, 10);
          if (['J', 'Q', 'K'].includes(rank)) value = 10;
          if (rank === 'A') value = 11;
          this.deck.push({ rank, suit, value });
        }
      }
    }

    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCard() {
    if (this.deck.length < 15) this.generateDeck();
    return this.deck.pop();
  }

  calculateHand(hand) {
    let sum = 0;
    let aces = 0;

    for (const card of hand) {
      sum += card.value;
      if (card.rank === 'A') aces++;
    }

    // Reduce Aces from 11 to 1 if busted
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }

    return sum;
  }

  startNewGame(betAmount) {
    if (betAmount < this.minBet || betAmount > this.maxBet) {
      return { success: false, message: `La apuesta debe estar entre $${this.minBet} y $${this.maxBet}` };
    }

    if (this.economy.getCash() < betAmount) {
      return { success: false, message: 'Fondos en efectivo insuficientes para esta apuesta' };
    }

    // Deduct bet from cash
    this.economy.modifyCash(-betAmount, 'Apuesta Blackjack');
    AudioManager.playChipClick();
    this.currentBet = betAmount;

    this.generateDeck();
    this.playerHand = [];
    this.dealerHand = [];

    // Deal 2 cards to player, 2 to dealer
    this.playerHand.push(this.drawCard());
    AudioManager.playCardDeal();

    this.dealerHand.push(this.drawCard());

    this.playerHand.push(this.drawCard());
    AudioManager.playCardDeal();

    this.dealerHand.push(this.drawCard());

    this.gameState = 'PLAYER_TURN';

    // Check Natural Blackjack
    const playerTotal = this.calculateHand(this.playerHand);
    const dealerTotal = this.calculateHand(this.dealerHand);

    if (playerTotal === 21) {
      if (dealerTotal === 21) {
        // Push
        return this.resolveGame('PUSH');
      } else {
        // Player Blackjack! (Pays 3:2)
        return this.resolveGame('BLACKJACK');
      }
    }

    return {
      success: true,
      gameState: this.gameState,
      playerHand: this.playerHand,
      dealerVisible: [this.dealerHand[0]], // dealer's second card is hidden
      playerTotal,
      currentBet: this.currentBet
    };
  }

  hit() {
    if (this.gameState !== 'PLAYER_TURN') return { success: false };

    const newCard = this.drawCard();
    this.playerHand.push(newCard);
    AudioManager.playCardDeal();

    const playerTotal = this.calculateHand(this.playerHand);

    if (playerTotal > 21) {
      return this.resolveGame('BUST');
    }

    return {
      success: true,
      gameState: this.gameState,
      playerHand: this.playerHand,
      dealerVisible: [this.dealerHand[0]],
      playerTotal,
      currentBet: this.currentBet
    };
  }

  stand() {
    if (this.gameState !== 'PLAYER_TURN') return { success: false };

    this.gameState = 'DEALER_TURN';

    // Dealer draws cards until total >= 17
    let dealerTotal = this.calculateHand(this.dealerHand);
    while (dealerTotal < 17) {
      this.dealerHand.push(this.drawCard());
      dealerTotal = this.calculateHand(this.dealerHand);
      AudioManager.playCardDeal();
    }

    const playerTotal = this.calculateHand(this.playerHand);

    if (dealerTotal > 21) {
      return this.resolveGame('DEALER_BUST');
    } else if (playerTotal > dealerTotal) {
      return this.resolveGame('PLAYER_WIN');
    } else if (playerTotal < dealerTotal) {
      return this.resolveGame('DEALER_WIN');
    } else {
      return this.resolveGame('PUSH');
    }
  }

  doubleDown() {
    if (this.gameState !== 'PLAYER_TURN' || this.playerHand.length !== 2) {
      return { success: false, message: 'Solo puedes doblar con las 2 primeras cartas' };
    }

    if (this.economy.getCash() < this.currentBet) {
      return { success: false, message: 'Fondos insuficientes para doblar la apuesta' };
    }

    // Deduct additional bet
    this.economy.modifyCash(-this.currentBet, 'Doblar Apuesta Blackjack');
    AudioManager.playChipClick();
    this.currentBet *= 2;

    // Draw exactly one card then stand
    const card = this.drawCard();
    this.playerHand.push(card);
    AudioManager.playCardDeal();

    const playerTotal = this.calculateHand(this.playerHand);
    if (playerTotal > 21) {
      return this.resolveGame('BUST');
    }

    return this.stand();
  }

  resolveGame(outcome) {
    this.gameState = 'RESOLVED';
    const playerTotal = this.calculateHand(this.playerHand);
    const dealerTotal = this.calculateHand(this.dealerHand);
    let winAmount = 0;
    let message = '';

    if (outcome === 'BLACKJACK') {
      winAmount = Math.floor(this.currentBet * 2.5); // bet + 1.5x profit
      message = `¡BLACKJACK! Ganaste $${winAmount.toLocaleString()}`;
      this.economy.modifyCash(winAmount, 'Victoria Blackjack 3:2');
      AudioManager.playCasinoWin(true);
    } else if (outcome === 'PLAYER_WIN' || outcome === 'DEALER_BUST') {
      winAmount = this.currentBet * 2;
      message = outcome === 'DEALER_BUST' ?
        `¡La casa se pasó! Ganaste $${winAmount.toLocaleString()}` :
        `¡Mano ganadora! Ganaste $${winAmount.toLocaleString()}`;
      this.economy.modifyCash(winAmount, 'Victoria Blackjack');
      AudioManager.playCasinoWin(false);
    } else if (outcome === 'PUSH') {
      winAmount = this.currentBet;
      message = `Empate. Se devuelve tu apuesta de $${winAmount.toLocaleString()}`;
      this.economy.modifyCash(winAmount, 'Empate Blackjack');
      AudioManager.playChipClick();
    } else {
      // BUST or DEALER_WIN
      message = outcome === 'BUST' ? '¡Te pasaste de 21! La casa gana.' : 'La banca tiene mejor mano. Pierdes la apuesta.';
      AudioManager.playCasinoLoss();
    }

    return {
      success: true,
      gameState: this.gameState,
      outcome,
      message,
      playerHand: this.playerHand,
      dealerHand: this.dealerHand,
      playerTotal,
      dealerTotal,
      winAmount,
      currentBet: this.currentBet
    };
  }
}
