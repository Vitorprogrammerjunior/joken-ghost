// Trilha sonora: partituras Scrimshaw (assets/music/*.scrim) tocadas ao vivo com Web Audio.
// Cada música toca a introdução uma vez e depois repete o loop, como em jogos antigos.
import '../vendor/scrimshaw/score.js';
import '../vendor/scrimshaw/synth.js';

const LOOKAHEAD = 0.35;   // segundos agendados à frente
const PUMP_MS = 60;

export class Music {
  constructor() {
    this.cache = new Map();
    this.current = null;
    this.wanted = null;
    this.volume = 0.5;
  }

  /** Liga ao AudioContext (só depois de um gesto do usuário). */
  attach(ctx) {
    if (this.synth) return;
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(ctx.destination);
    this.synth = window.ScrimSynth.createSynth(ctx, this.gain);
    setInterval(() => this.#pump(), PUMP_MS);
    if (this.wanted) this.play(this.wanted);
  }

  setVolume(v) {
    this.volume = v;
    if (this.gain) this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
  }

  async #load(name) {
    if (!this.cache.has(name)) {
      this.cache.set(name, fetch(`assets/music/${name}.scrim`)
        .then(r => r.text())
        .then((text) => {
          const song = window.ScrimScore.compile(text);
          if (song.errors.length) console.warn(`Partitura ${name}:`, song.errors);
          return song;
        }));
    }
    return this.cache.get(name);
  }

  /** Pré-carrega partituras para não haver atraso na troca. */
  preload(names) { names.forEach(n => this.#load(n).catch(() => {})); }

  /** Toca uma música (não reinicia se já for a atual). */
  async play(name) {
    this.wanted = name;
    if (!this.synth || this.current?.name === name) return;
    const song = await this.#load(name).catch(() => null);
    if (!song || this.wanted !== name || this.current?.name === name) return;
    this.stop();
    this.synth.warm(song);
    const start = this.ctx.currentTime + 0.12;
    this.current = { name, song, sess: this.synth.session(song), phase: 'intro', idx: 0, offset: start };
  }

  stop(fade = 0.35) {
    this.current?.sess.stop(fade);
    this.current = null;
  }

  /** Agenda os eventos que caem dentro da janela de antecedência. */
  #pump() {
    const c = this.current;
    if (!c || c.done) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    for (let guard = 0; guard < 2000; guard++) {
      const tl = c.phase === 'intro' ? c.song.intro : c.song.loop;
      if (c.idx >= tl.events.length) {
        c.offset += tl.dur;
        c.idx = 0;
        if (c.phase === 'intro') c.phase = 'loop';
        if (!c.song.loop.dur || !c.song.loop.events.length) { c.done = c.phase === 'loop'; if (c.done) return; }
        if (c.offset > horizon) return;
        continue;
      }
      const ev = tl.events[c.idx];
      const t = c.offset + ev.t;
      if (t > horizon) return;
      c.sess.play(ev, t);
      c.idx++;
    }
  }
}
