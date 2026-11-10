// PachinkoGame.js - Interactive Tokyo Pachinko 777 Pinboard for Million Dollar City
import AudioManager from '../engine/AudioManager.js';

export class PachinkoGame {
  constructor(economyManager) {
    this.economy = economyManager;
    this.canvas = null;
    this.ctx = null;
    this.animId = null;

    this.width = 460;
    this.height = 540;

    this.pegs = [];
    this.catchers = [];
    this.balls = []; // active balls: { x, y, vx, vy, radius, color, active }
    this.betPerBall = 50;
    this.lastWin = 0;
    this.totalWin = 0;
    this.lastHitAudioTime = 0;
    this.landedHistory = [];

    this.initBoard();
  }

  attachCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.startLoop();
  }

  initBoard() {
    this.pegs = [];
    const rows = 10;
    const startY = 85;
    const spacingY = 34;
    const spacingX = 38;

    for (let r = 0; r < rows; r++) {
      const isOffset = r % 2 === 1;
      const count = isOffset ? 10 : 9;
      const startX = isOffset ? 41 : 60;

      for (let c = 0; c < count; c++) {
        this.pegs.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          radius: 4.5,
          hitTime: 0
        });
      }
    }

    // 7 Contiguous catchers spanning entire bottom with zero dead zones
    this.catchers = [
      { x: 12,  width: 62, mult: 0.2, label: '0.2X',    color: '#334155', textColor: '#94a3b8' },
      { x: 74,  width: 62, mult: 1.5, label: '1.5X',    color: '#0284c7', textColor: '#ffffff' },
      { x: 136, width: 62, mult: 5.0, label: '5X',      color: '#059669', textColor: '#ffffff' },
      { x: 198, width: 64, mult: 50.0, label: '★ 777 ★', color: '#eab308', textColor: '#000000', isJackpot: true },
      { x: 262, width: 62, mult: 5.0, label: '5X',      color: '#059669', textColor: '#ffffff' },
      { x: 324, width: 62, mult: 1.5, label: '1.5X',    color: '#0284c7', textColor: '#ffffff' },
      { x: 386, width: 62, mult: 0.2, label: '0.2X',    color: '#334155', textColor: '#94a3b8' }
    ];
  }

  launchBalls(count = 5, betAmount = 50) {
    const bet = Math.max(1, parseInt(betAmount, 10) || 50);
    const totalCost = count * bet;

    if (this.economy.getCash() < totalCost) {
      throw new Error(`Necesitas $${totalCost.toLocaleString()} en efectivo para lanzar ${count} bolas.`);
    }

    this.betPerBall = bet;
    this.economy.modifyCash(-totalCost, `Pachinko ${count} Bolas`);
    AudioManager.playChipClick();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // Launch ball near top center with horizontal variation
        const launchX = 230 + (Math.random() - 0.5) * 50;
        this.balls.push({
          x: launchX,
          y: 35,
          vx: (Math.random() - 0.5) * 4.0,
          vy: Math.random() * 2 + 1.8,
          radius: 6.5,
          color: '#ffd700',
          active: true
        });
      }, i * 90);
    }
  }

  update() {
    const gravity = 0.55;
    const bounce = 0.52;
    const now = performance.now();

    for (const b of this.balls) {
      if (!b.active) continue;

      b.vy += gravity;
      // Air resistance / terminal velocity cap
      b.vx *= 0.985;
      b.vy = Math.min(b.vy, 15);

      b.x += b.vx;
      b.y += b.vy;

      // Outer Side Walls
      if (b.x < 14 + b.radius) {
        b.x = 14 + b.radius;
        b.vx = -b.vx * bounce;
      } else if (b.x > this.width - 14 - b.radius) {
        b.x = this.width - 14 - b.radius;
        b.vx = -b.vx * bounce;
      }

      // Peg collisions
      for (const p of this.pegs) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const distSq = dx * dx + dy * dy;
        const minDist = b.radius + p.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          let nx = dx / dist;
          let ny = dy / dist;

          // If hitting the very top of a peg, force a decisive sideways deflection
          const sign = (nx >= 0 ? 1 : -1);
          if (Math.abs(nx) < 0.35) {
            nx = sign * 0.45;
          }

          // Separation to avoid sticking
          b.x = p.x + nx * minDist;
          b.y = p.y + ny * minDist;

          // Velocity deflection: lively sideways scatter and solid downward drop
          b.vx = (b.vx * 0.35 + sign * (Math.random() * 2.8 + 1.5)) * bounce;
          b.vy = Math.max(3.2, Math.abs(b.vy) * 0.7);

          p.hitTime = now;

          // Sound effect throttled
          if (now - this.lastHitAudioTime > 55) {
            this.lastHitAudioTime = now;
            AudioManager.playSlotSpinTick();
          }
        }
      }

      // Bottom Catcher Bucket check
      if (b.y >= this.height - 48) {
        b.active = false;
        let matched = false;

        for (const c of this.catchers) {
          if (b.x >= c.x && b.x <= c.x + c.width) {
            matched = true;
            const payout = Math.floor(this.betPerBall * c.mult);
            this.lastWin = payout;
            this.totalWin += payout;

            if (payout > 0) {
              this.economy.modifyCash(payout, `Premio Pachinko ${c.label}`);
              AudioManager.playCasinoWin(c.isJackpot || c.mult >= 5);
            } else {
              AudioManager.playCasinoLoss();
            }

            const eventData = { multiplier: c.mult, payout, label: c.label, isJackpot: !!c.isJackpot };
            this.landedHistory.push(eventData);

            window.dispatchEvent(new CustomEvent('pachinko:ball_landed', {
              detail: eventData
            }));
            break;
          }
        }

        // Fallback for edge cases
        if (!matched) {
          const fallback = this.catchers[0];
          const payout = Math.floor(this.betPerBall * fallback.mult);
          if (payout > 0) {
            this.economy.modifyCash(payout, `Premio Pachinko ${fallback.label}`);
          }
          const eventData = { multiplier: fallback.mult, payout, label: fallback.label, isJackpot: false };
          this.landedHistory.push(eventData);
          window.dispatchEvent(new CustomEvent('pachinko:ball_landed', {
            detail: eventData
          }));
        }
      }
    }

    // Clean up finished balls
    this.balls = this.balls.filter(b => b.active);
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = performance.now();

    // Dark cyber gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#070a14');
    bgGrad.addColorStop(1, '#0e1726');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Glowing Neon Frame border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, this.width - 12, this.height - 12);

    // Title banner
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌸 TOKYO PACHINKO 777 🌸', this.width / 2, 26);

    // Top funnel guide arcs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 50);
    ctx.lineTo(190, 50);
    ctx.moveTo(270, 50);
    ctx.lineTo(this.width - 12, 50);
    ctx.stroke();

    // Draw Pegs with hit glow
    for (const p of this.pegs) {
      const isGlowing = (now - p.hitTime) < 180;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (isGlowing) {
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw Catchers at bottom
    const catcherY = this.height - 48;
    for (const c of this.catchers) {
      // Bucket background
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, catcherY, c.width, 38);

      // Bucket border
      ctx.strokeStyle = c.isJackpot ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = c.isJackpot ? 2 : 1;
      ctx.strokeRect(c.x, catcherY, c.width, 38);

      // Multiplier label
      ctx.fillStyle = c.textColor;
      ctx.font = c.isJackpot ? 'bold 12px monospace' : 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x + c.width / 2, catcherY + 24);
    }

    // Draw bucket vertical dividers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i <= this.catchers.length; i++) {
      const divX = i === 0 ? this.catchers[0].x : this.catchers[i - 1].x + this.catchers[i - 1].width;
      ctx.beginPath();
      ctx.moveTo(divX, catcherY - 8);
      ctx.lineTo(divX, this.height - 10);
      ctx.stroke();
    }

    // Draw Active Balls with shine and shadow
    for (const b of this.balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Specular highlight
      ctx.beginPath();
      ctx.arc(b.x - 2, b.y - 2, b.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  startLoop() {
    this.stopLoop();
    this.timerId = setInterval(() => {
      this.update();
      this.draw();
    }, 16);
  }

  stopLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
