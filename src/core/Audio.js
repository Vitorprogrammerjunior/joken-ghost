// Música (mp3) + efeitos sonoros 8-bit sintetizados com Web Audio.

const MUSIC_SRC = 'assets/audio/cursed-save-slot.mp3';
const IMPACT_SRC = 'assets/audio/impact.mp3';

/** Receitas dos efeitos: lista de notas [freqInicial, freqFinal, duraçãoMs, onda, atrasoMs, volume]. */
const SFX = {
  click: [[660, 880, 50, 'square', 0, 0.25]],
  hover: [[520, 520, 25, 'square', 0, 0.08]],
  select: [[440, 660, 60, 'square', 0, 0.2], [880, 880, 60, 'square', 60, 0.15]],
  back: [[520, 330, 80, 'square', 0, 0.2]],
  error: [[180, 140, 140, 'sawtooth', 0, 0.2]],
  coin: [[988, 988, 60, 'square', 0, 0.2], [1319, 1319, 140, 'square', 60, 0.2]],
  beat: [[220, 110, 90, 'square', 0, 0.3]],
  go: [[330, 660, 160, 'square', 0, 0.3]],
  swing: [[900, 200, 120, 'noise', 0, 0.25]],
  hit: [[180, 60, 160, 'square', 0, 0.35], [400, 50, 120, 'noise', 0, 0.3]],
  super: [[520, 1040, 90, 'square', 0, 0.25], [780, 1560, 140, 'square', 80, 0.25]],
  hurt: [[300, 80, 260, 'sawtooth', 0, 0.3], [200, 40, 200, 'noise', 0, 0.25]],
  block: [[1200, 1200, 40, 'triangle', 0, 0.3], [1600, 900, 160, 'triangle', 40, 0.25]],
  heal: [[523, 523, 80, 'triangle', 0, 0.25], [659, 659, 80, 'triangle', 80, 0.25], [784, 784, 160, 'triangle', 160, 0.25]],
  poof: [[300, 40, 400, 'noise', 0, 0.3]],
  draw: [[440, 440, 80, 'triangle', 0, 0.2], [440, 440, 80, 'triangle', 120, 0.2]],
  phase: [[110, 55, 600, 'sawtooth', 0, 0.3], [116, 58, 600, 'sawtooth', 0, 0.2]],
  win: [[523, 523, 120, 'square', 0, 0.2], [659, 659, 120, 'square', 130, 0.2], [784, 784, 120, 'square', 260, 0.2], [1047, 1047, 360, 'square', 390, 0.22]],
  lose: [[392, 392, 200, 'triangle', 0, 0.25], [330, 330, 200, 'triangle', 220, 0.25], [262, 196, 600, 'triangle', 440, 0.25]],
  type: [[1400, 1400, 12, 'square', 0, 0.04]],
};

export class AudioManager {
  constructor(options) {
    this.options = options;
    this.music = new Audio(MUSIC_SRC);
    this.music.loop = true;
    this.music.preload = 'auto';
    this.impact = new Audio(IMPACT_SRC);
    this.impact.preload = 'auto';
    this.ctx = null;
    this.noiseBuffer = null;
    this.applyVolumes();
  }

  /** Navegadores só liberam áudio depois de um gesto do usuário. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    const o = this.options;
    this.music.volume = (o.musicVol / 100) * 0.8;
    this.music.muted = o.muted;
    this.impact.volume = o.sfxVol / 100;
  }

  playMusic() {
    if (this.options.muted) return;
    this.music.play().catch(() => {});
  }

  stopMusic() { this.music.pause(); }

  setMuted(muted) {
    this.options.muted = muted;
    this.applyVolumes();
    if (!muted) this.playMusic();
  }

  play(name) {
    if (this.options.muted || !this.options.sfxVol) return;
    if (name === 'hit' || name === 'hurt') {
      this.impact.currentTime = 0;
      this.impact.play().catch(() => {});
    }
    const recipe = SFX[name];
    if (!recipe || !this.ctx) return;
    const master = this.options.sfxVol / 100;
    const now = this.ctx.currentTime;
    for (const [f0, f1, ms, wave, delay, vol] of recipe) {
      const t0 = now + delay / 1000, t1 = t0 + ms / 1000;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * master, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t1);
      gain.connect(this.ctx.destination);
      let src;
      if (wave === 'noise') {
        src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(f0 * 4, t0);
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1 * 4), t1);
        src.connect(filter).connect(gain);
      } else {
        src = this.ctx.createOscillator();
        src.type = wave;
        src.frequency.setValueAtTime(f0, t0);
        src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t1);
        src.connect(gain);
      }
      src.start(t0);
      src.stop(t1 + 0.02);
    }
  }
}
