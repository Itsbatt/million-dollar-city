// ==============================================================
// MILLION DOLLAR CITY - PROCEDURAL WEB AUDIO ENGINE
// Realistic real-time audio synthesis (No external asset dependency)
// ==============================================================

class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Vehicle engine state
    this.engineNodes = null;
    this.engineRunning = false;

    // Police siren state
    this.sirenNodes = null;
    this.sirenActive = false;

    // Radio station state
    this.radioPlaying = false;
    this.radioTimer = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output (calibrated to comfortable, non-fatiguing levels)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus (soft, warm dynamics)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.40, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
      console.log('[Audio] Procedural Web Audio Engine Initialized');
    } catch (e) {
      console.warn('[Audio] Web Audio API not supported:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // -----------------------------------------------------------------
  // PLAYER ACTIONS
  // -----------------------------------------------------------------

  playFootstep(surface = 'concrete') {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(surface === 'carpet' ? 400 : 1200, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playJump() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  // -----------------------------------------------------------------
  // WEAPONS & COMBAT
  // -----------------------------------------------------------------

  playGunshot(type = 'pistol') {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const isSniper = type === 'sniper';
    const isShotgun = type === 'shotgun';

    // 1. Noise transient (Crack)
    const bufferSize = this.ctx.sampleRate * (isSniper ? 0.35 : 0.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isShotgun ? 900 : (isSniper ? 1800 : 2200), now);
    filter.Q.setValueAtTime(isSniper ? 2.5 : 1.5, now);

    const noiseGain = this.ctx.createGain();
    const duration = isSniper ? 0.38 : (isShotgun ? 0.30 : (type === 'rifle' ? 0.16 : 0.12));
    noiseGain.gain.setValueAtTime(isSniper ? 0.38 : 0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration + 0.02);

    // 2. Low Frequency Punch (Bass Thud)
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(isSniper ? 180 : (isShotgun ? 140 : 110), now);
    bass.frequency.exponentialRampToValueAtTime(25, now + (isSniper ? 0.32 : 0.18));

    bassGain.gain.setValueAtTime(isSniper ? 0.45 : 0.32, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + (isSniper ? 0.35 : 0.20));

    bass.connect(bassGain);
    bassGain.connect(this.sfxGain);
    bass.start(now);
    bass.stop(now + (isSniper ? 0.45 : 0.26));

    // 3. Brass shell casing drop after 0.25s
    setTimeout(() => {
      this.playShellCasing();
    }, isSniper ? 450 : 250);
  }

  playHitmarker(isHeadshot = false) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isHeadshot ? 'sawtooth' : 'sine';
    const startFreq = isHeadshot ? 2800 : 1800;
    const endFreq = isHeadshot ? 3400 : 2200;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);

    gain.gain.setValueAtTime(isHeadshot ? 0.3 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playWheelTick() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.025);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  playShellCasing() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200 + Math.random() * 800, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playReload() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    // Click clack
    [0, 0.15, 0.35].forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 - idx * 200, now + delay);
      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  }

  // -----------------------------------------------------------------
  // VEHICLE ENGINE & SOUNDS
  // -----------------------------------------------------------------

  startEngine(vehicleType = 'sports') {
    if (!this.initialized || this.engineRunning) return;
    const now = this.ctx.currentTime;

    // Pleasant, warm acoustic rumble (smooth low-passed triangles + sub-sine)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    subOsc.type = 'sine';

    const baseFreq = vehicleType === 'sports' ? 44 : 36;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);

    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);

    this.engineNodes = { osc1, osc2, subOsc, filter, gain, baseFreq };
    this.engineRunning = true;
  }

  updateEngine(rpmRatio = 0, isAccelerating = false) {
    if (!this.engineRunning || !this.engineNodes) return;
    const now = this.ctx.currentTime;
    const { osc1, osc2, subOsc, filter, gain, baseFreq } = this.engineNodes;

    const targetPitch = baseFreq + rpmRatio * (baseFreq * 2.2);
    const filterCutoff = 220 + rpmRatio * 420 + (isAccelerating ? 120 : 0);
    const volume = 0.08 + rpmRatio * 0.08 + (isAccelerating ? 0.03 : 0);

    osc1.frequency.setTargetAtTime(targetPitch, now, 0.08);
    osc2.frequency.setTargetAtTime(targetPitch * 1.5, now, 0.08);
    subOsc.frequency.setTargetAtTime(targetPitch * 0.5, now, 0.08);
    filter.frequency.setTargetAtTime(filterCutoff, now, 0.1);
    gain.gain.setTargetAtTime(volume, now, 0.1);
  }

  stopEngine() {
    if (!this.engineRunning || !this.engineNodes) return;
    const now = this.ctx.currentTime;
    try {
      this.engineNodes.gain.gain.setTargetAtTime(0.001, now, 0.15);
      setTimeout(() => {
        if (this.engineNodes) {
          this.engineNodes.osc1.stop();
          this.engineNodes.osc2.stop();
          this.engineNodes.subOsc.stop();
          this.engineNodes = null;
          this.engineRunning = false;
        }
      }, 200);
    } catch (e) {
      this.engineRunning = false;
      this.engineNodes = null;
    }
  }

  playTireSkid(intensity = 0.5) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.25, Math.max(0.05, intensity * 0.25));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  playHorn() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(370, now); // F#
    osc2.frequency.setValueAtTime(440, now); // A

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.42);
    osc2.stop(now + 0.42);
  }

  // -----------------------------------------------------------------
  // CASINO & GAMBLING SOUNDS
  // -----------------------------------------------------------------

  playChipClick() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Soft organic ceramic chip clink (lowered pitch, smooth decay)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.035);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playHeartbeat() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Organic double thump "Lub-Dub"
    [0, 0.14].forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 58 : 46, now + delay);
      osc.frequency.exponentialRampToValueAtTime(25, now + delay + 0.12);

      gain.gain.setValueAtTime(0.28, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.16);
    });
  }

  playGulp() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCardDeal() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.07;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.08);
  }

  playRouletteTick() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1800 + Math.random() * 200, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  playSlotSpinTick() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 100, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  playCasinoWin(isJackpot = false) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const notes = isJackpot ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const delay = idx * (isJackpot ? 0.09 : 0.12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.28, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.38);
    });

    if (isJackpot) {
      // Coin waterfall cascade
      for (let i = 0; i < 12; i++) {
        setTimeout(() => this.playChipClick(), 400 + i * 80);
      }
    }
  }

  playCasinoLoss() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    [320, 290, 240].forEach((freq, idx) => {
      const delay = idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + delay);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now + delay);

      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });
  }

  // -----------------------------------------------------------------
  // CASINO AMBIENCE (Lounge chords + soft chip clinks & bell pings)
  // -----------------------------------------------------------------

  startCasinoAmbience() {
    if (!this.initialized || this.casinoAmbienceActive) return;
    this.casinoAmbienceActive = true;

    // Atmospheric warm pad oscillator
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime); // A2 warm drone

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start();
      this.casinoAmbienceNode = { osc, gain };

      // Subtle background chip/coin trickle loop
      this.casinoLoopTimer = setInterval(() => {
        if (!this.casinoAmbienceActive) return;
        const rand = Math.random();
        if (rand > 0.6) {
          this.playChipClick();
        } else if (rand < 0.25) {
          this.playSlotSpinTick();
        }
      }, 1200);
    } catch (e) {
      console.warn('[Audio] Failed to start casino ambience:', e);
    }
  }

  stopCasinoAmbience() {
    if (!this.casinoAmbienceActive) return;
    this.casinoAmbienceActive = false;
    if (this.casinoLoopTimer) {
      clearInterval(this.casinoLoopTimer);
      this.casinoLoopTimer = null;
    }
    if (this.casinoAmbienceNode) {
      try {
        const { osc, gain } = this.casinoAmbienceNode;
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
        setTimeout(() => {
          try { osc.stop(); } catch (err) {}
        }, 850);
      } catch (err) {}
      this.casinoAmbienceNode = null;
    }
  }

  // -----------------------------------------------------------------
  // POLICE SIREN (Dynamic 2-Tone Wail)
  // -----------------------------------------------------------------

  startPoliceSiren() {
    if (!this.initialized || this.sirenActive) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.4, now); // ~2.5s cycle
    lfoGain.gain.setValueAtTime(200, now); // modulate between 550Hz and 950Hz

    lfo.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);

    gain.gain.setValueAtTime(0.065, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    lfo.start(now);

    this.sirenNodes = { osc, lfo, gain };
    this.sirenActive = true;
  }

  stopPoliceSiren() {
    if (!this.sirenActive || !this.sirenNodes) return;
    const now = this.ctx.currentTime;
    try {
      this.sirenNodes.gain.gain.setTargetAtTime(0.001, now, 0.2);
      setTimeout(() => {
        if (this.sirenNodes) {
          this.sirenNodes.osc.stop();
          this.sirenNodes.lfo.stop();
          this.sirenNodes = null;
          this.sirenActive = false;
        }
      }, 250);
    } catch (e) {
      this.sirenActive = false;
      this.sirenNodes = null;
    }
  }

  // -----------------------------------------------------------------
  // PROCEDURAL RETROWAVE / SYNTH RADIO
  // -----------------------------------------------------------------

  toggleRadio() {
    if (this.radioPlaying) {
      this.stopRadio();
      return false;
    } else {
      this.startRadio();
      return true;
    }
  }

  startRadio() {
    if (!this.initialized) this.init();
    if (this.radioPlaying) return;
    this.radioPlaying = true;

    // Chords progression for Neon Night drive: Am - F - C - G
    const chords = [
      [220, 261.63, 329.63, 440], // Am
      [174.61, 220, 261.63, 349.23], // F
      [261.63, 329.63, 392, 523.25], // C
      [196, 246.94, 293.66, 392] // G
    ];

    let chordIndex = 0;
    let step = 0;

    const playStep = () => {
      if (!this.radioPlaying) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[chordIndex];
      const noteFreq = currentChord[step % currentChord.length];

      // Arpeggio synth note
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.22);

      // Bass punch on step 0
      if (step === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(currentChord[0] * 0.5, now);
        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.65);
      }

      step++;
      if (step >= 8) {
        step = 0;
        chordIndex = (chordIndex + 1) % chords.length;
      }

      this.radioTimer = setTimeout(playStep, 150); // 100 BPM 16th notes
    };

    playStep();
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioTimer) {
      clearTimeout(this.radioTimer);
      this.radioTimer = null;
    }
  }

  // Distortion curve generator
  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}

export default new AudioManager();
