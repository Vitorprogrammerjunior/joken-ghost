// Interpolações baseadas no tempo do jogo (pausam junto com a cena).

export const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  pingPong: t => (t < 0.5 ? t * 2 : 2 - t * 2),
};

export class Tweens {
  #items = [];

  /** Anima propriedades numéricas de `target`. Retorna uma Promise. */
  to(target, props, ms, ease = Ease.outQuad) {
    return new Promise((resolve) => {
      const from = {};
      for (const k of Object.keys(props)) from[k] = target[k];
      this.#items.push({ target, from, props, ms: Math.max(1, ms), t: 0, ease, resolve });
    });
  }

  /** Espera `ms` milissegundos de jogo. */
  wait(ms) {
    return new Promise((resolve) => this.#items.push({ ms: Math.max(1, ms), t: 0, resolve }));
  }

  update(dt) {
    const done = [];
    for (const it of this.#items) {
      it.t = Math.min(it.ms, it.t + dt);
      if (it.target) {
        const k = it.ease(it.t / it.ms);
        for (const p of Object.keys(it.props)) it.target[p] = it.from[p] + (it.props[p] - it.from[p]) * k;
      }
      if (it.t >= it.ms) done.push(it);
    }
    if (done.length) {
      this.#items = this.#items.filter(it => !done.includes(it));
      for (const it of done) it.resolve();
    }
  }

  clear() { this.#items = []; }
  get busy() { return this.#items.length > 0; }
}
