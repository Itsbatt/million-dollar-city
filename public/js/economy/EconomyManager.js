export class EconomyManager {
  constructor() {
    this.token = localStorage.getItem('mdc_auth_token') || null;
    this.user = null;
    this.playerId = 'guest_' + Math.floor(Math.random() * 10000);
    this.username = 'Ciudadano';
    this.isAdmin = false;

    this.cash = 250;
    this.bank = 500;
    this.targetGoal = 1000000;
    this.transactionHistory = [];
    this.hasWonGame = false;

    this.initSession();
  }

  async initSession() {
    if (this.token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const data = await res.json();
        if (data.success && data.player) {
          this.user = data.user;
          this.playerId = data.user.id;
          this.username = data.user.username;
          this.cash = data.player.cash;
          this.bank = data.player.bank;
          this.isAdmin = (this.username.toLowerCase() === 'itsbat_' || !!data.user?.is_admin || !!data.player?.is_admin);
          this.notifyChange();
          window.dispatchEvent(new CustomEvent('admin:status_changed', { detail: { isAdmin: this.isAdmin } }));
          console.log(`[Economy] Sesión autenticada: ${this.username} (ID: ${this.playerId}, OP: ${this.isAdmin})`);
          this.loadHistory();
          return;
        }
      } catch (e) {
        console.warn('[Economy] Falló validación de token:', e);
      }
    }

    // Fallback: guest initialization
    this.loadFromStorage();
  }

  async register(username, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    this.token = data.user.token;
    localStorage.setItem('mdc_auth_token', this.token);
    this.user = data.user;
    this.playerId = data.user.id;
    this.username = data.user.username;
    this.cash = data.user.cash;
    this.bank = data.user.bank;
    this.isAdmin = (this.username.toLowerCase() === 'itsbat_' || !!data.user.is_admin);
    this.notifyChange();
    window.dispatchEvent(new CustomEvent('admin:status_changed', { detail: { isAdmin: this.isAdmin } }));
    return data.user;
  }

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    this.token = data.session.token;
    localStorage.setItem('mdc_auth_token', this.token);
    this.user = { id: data.session.id, username: data.session.username, is_admin: data.session.is_admin };
    this.playerId = data.session.id;
    this.username = data.session.username;
    this.cash = data.session.player.cash;
    this.bank = data.session.player.bank;
    this.isAdmin = (this.username.toLowerCase() === 'itsbat_' || !!data.session.is_admin || !!data.session.player?.is_admin);
    this.notifyChange();
    window.dispatchEvent(new CustomEvent('admin:status_changed', { detail: { isAdmin: this.isAdmin } }));
    this.loadHistory();
    return data.session;
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('mdc_auth_token');
    window.location.reload();
  }

  async loadFromStorage() {
    try {
      const res = await fetch(`/api/player/${this.playerId}?username=${encodeURIComponent(this.username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.player) {
          this.cash = data.player.cash ?? 250;
          this.bank = data.player.bank ?? 500;
          this.notifyChange();
          this.loadHistory();
          return;
        }
      }
    } catch (e) {}
  }

  async loadHistory() {
    try {
      const res = await fetch(`/api/transactions/${this.playerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          this.transactionHistory = data.history.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
        }
      }
    } catch (e) {}
  }

  async saveToStorage() {
    try {
      await fetch(`/api/player/${this.playerId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: this.cash,
          bank: this.bank
        })
      });
    } catch (e) {}
  }

  getCash() { return this.cash; }
  getBank() { return this.bank; }
  getNetWorth() { return this.cash + this.bank; }
  getProgressPercentage() {
    return Math.min(100, Math.max(0, (this.getNetWorth() / this.targetGoal) * 100));
  }

  modifyCash(amount, description = 'Transacción Efectivo') {
    this.cash += amount;
    if (this.cash < 0) this.cash = 0;
    this.logTransaction('cash', amount, description);
    this.notifyChange(amount);
    this.saveToStorage();
    this.checkVictoryCondition();
    return this.cash;
  }

  modifyBank(amount, description = 'Operación Bancaria') {
    this.bank += amount;
    if (this.bank < 0) this.bank = 0;
    this.logTransaction('bank', amount, description);
    this.notifyChange(amount);
    this.saveToStorage();
    this.checkVictoryCondition();
    return this.bank;
  }

  // Direct Player-to-Player Wire Transfer (Authoritative Server Endpoint)
  async sendWireTransfer(recipientUsernameOrId, amount, note = '') {
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) return { success: false, error: 'Cantidad inválida' };
    if (this.bank < amt) return { success: false, error: 'Saldo bancario insuficiente' };

    try {
      const res = await fetch('/api/bank/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: this.playerId,
          recipient: recipientUsernameOrId,
          amount: amt,
          note: note || 'Transferencia Maze Bank'
        })
      });

      const data = await res.json();
      if (!data.success) return { success: false, error: data.error };

      this.bank = data.result.sender.newBank;
      this.logTransaction('transfer_sent', -amt, `Envío a ${data.result.recipient.username}: ${note || 'Transferencia'}`);
      this.notifyChange(-amt);
      return { success: true, result: data.result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async atmDeposit(amount) {
    if (amount <= 0 || this.cash < amount) return { success: false, message: 'Fondos insuficientes' };
    try {
      const res = await fetch('/api/atm/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, type: 'deposit', amount })
      });
      const data = await res.json();
      if (data.success) {
        this.cash = data.cash;
        this.bank = data.bank;
        this.notifyChange();
        return { success: true, message: `Depósito completado: +$${amount.toLocaleString()}` };
      }
      return { success: false, message: data.error };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async atmWithdraw(amount) {
    if (amount <= 0 || this.bank < amount) return { success: false, message: 'Fondos insuficientes' };
    try {
      const res = await fetch('/api/atm/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, type: 'withdraw', amount })
      });
      const data = await res.json();
      if (data.success) {
        this.cash = data.cash;
        this.bank = data.bank;
        this.notifyChange();
        return { success: true, message: `Retirada completada: +$${amount.toLocaleString()}` };
      }
      return { success: false, message: data.error };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  logTransaction(type, amount, description) {
    this.transactionHistory.unshift({
      id: Date.now(),
      type,
      amount,
      description,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (this.transactionHistory.length > 25) this.transactionHistory.pop();
  }

  checkVictoryCondition() {
    if (!this.hasWonGame && this.getNetWorth() >= this.targetGoal) {
      this.hasWonGame = true;
      window.dispatchEvent(new CustomEvent('game:victory', {
        detail: { netWorth: this.getNetWorth() }
      }));
    }
  }

  notifyChange(deltaAmount = 0) {
    window.dispatchEvent(new CustomEvent('economy:updated', {
      detail: {
        cash: this.cash,
        bank: this.bank,
        netWorth: this.getNetWorth(),
        progress: this.getProgressPercentage(),
        delta: deltaAmount
      }
    }));
  }

  // -------------------------------------------------------------
  // OP / ADMIN COMMAND CLIENT HELPERS
  // -------------------------------------------------------------

  async adminGiveMoney(cashDelta, bankDelta, isExact = false) {
    try {
      const res = await fetch('/api/admin/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerToken: this.token,
          target: this.playerId,
          cashDelta,
          bankDelta,
          isExact
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        this.cash = data.result.cash;
        this.bank = data.result.bank;
        this.notifyChange();
        return { success: true, result: data.result };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async adminUnlockAllWeapons() {
    try {
      const res = await fetch('/api/admin/weapons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerToken: this.token,
          target: this.playerId
        })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async adminFetchPlayers() {
    try {
      const res = await fetch('/api/admin/players', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      return data.players || [];
    } catch (e) {
      return [];
    }
  }
}
