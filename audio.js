/**
 * Web Audio API synthesizer for Kiko & Gua Kristal.
 * Procedural retro sound effects without external audio assets.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = typeof localStorage !== 'undefined' && localStorage.getItem('kiko_muted') === 'true';
    this.masterGain = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('kiko_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  createOscillator(type, freq, startTime) {
    if (!this.ctx || this.isMuted) return null;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    return osc;
  }

  playJump() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('square', 240, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playDoubleJump() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('triangle', 440, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDash() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Noise whoosh simulation using rapid FM modulation
    const osc = this.createOscillator('sawtooth', 360, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.linearRampToValueAtTime(140, now + 0.18);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playGem(type = 'blue') {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = type === 'red' ? [880, 1320] : type === 'green' ? [660, 990] : [520, 780];

    freqs.forEach((f, i) => {
      const osc = this.createOscillator('sine', f, now + i * 0.04);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.12);
    });
  }

  playFish() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((f, i) => {
      const osc = this.createOscillator('triangle', f, now + i * 0.06);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.14);
    });
  }

  playPowerup() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const osc = this.createOscillator('sine', f, now + i * 0.05);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.18);
    });
  }

  playSpring() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('sine', 160, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.linearRampToValueAtTime(580, now + 0.1);
    osc.frequency.linearRampToValueAtTime(320, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playHurt() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('sawtooth', 180, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playEnemyDefeat() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('square', 320, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCrumble() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('triangle', 90, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(110, now);
    osc.frequency.setValueAtTime(70, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playRockFall() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.createOscillator('sawtooth', 90, now);
    if (!osc) return;
    const gain = this.ctx.createGain();

    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playCheckpoint() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const osc = this.createOscillator('sine', f, now + i * 0.08);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  playLevelComplete() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784, 659, 1046];
    const delays = [0, 0.1, 0.2, 0.3, 0.42];
    notes.forEach((f, i) => {
      const osc = this.createOscillator('triangle', f, now + delays[i]);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now + delays[i]);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delays[i]);
      osc.stop(now + delays[i] + 0.28);
    });
  }

  playGameOver() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 415, 392, 349];
    notes.forEach((f, i) => {
      const osc = this.createOscillator('sawtooth', f, now + i * 0.16);
      if (!osc) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.24);
    });
  }
}

export const sounds = new SoundSystem();
