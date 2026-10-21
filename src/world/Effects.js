// Efeitos de uma vez (folhas fx/*), textos flutuantes e projéteis.
import { PX } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';

export class Effects {
  constructor(assets) {
    this.assets = assets;
    this.items = [];
  }

  /** Toca uma folha de efeito centrada em (x, y). Resolve ao terminar. */
  play(key, x, y, { fps = 14, scale = PX, flipX = false } = {}) {
    return new Promise((resolve) => {
      this.items.push({ kind: 'fx', key, x, y, fps, scale, flipX, frame: 0, frames: this.assets.frames(key), resolve });
    });
  }

  /** Texto que sobe e some (dano, moedas, avisos). */
  text(str, x, y, { color = '#f4f2fa', size = 24, life = 1100, rise = 60, delay = 0 } = {}) {
    // se ainda há um texto parecido no mesmo lugar, este nasce acima dele em vez de sobrepor
    const stacked = this.items.filter(i => i.kind === 'text' && i.t < i.life * 0.7 && Math.abs(i.x - x) < 48 && Math.abs(i.baseY - y) < 24).length;
    this.items.push({ kind: 'text', str, x, y: y - stacked * (size + 8), baseY: y, color, size, life, rise, t: -delay });
  }

  /** Sprite que viaja de A até B (estaca arremessada, orbe...). */
  projectile(key, from, to, { ms = 260, scale = PX, flipX = false, arc = 0 } = {}) {
    return new Promise((resolve) => {
      this.items.push({ kind: 'proj', key, from, to, ms, t: 0, scale, flipX, arc, resolve, frame: 0 });
    });
  }

  update(dt) {
    for (const it of this.items) {
      if (it.kind === 'fx') {
        it.frame += dt * it.fps / 1000;
        if (it.frame >= it.frames) { it.done = true; it.resolve(); }
      } else if (it.kind === 'text') {
        it.t += dt;
        if (it.t >= it.life) it.done = true;
      } else if (it.kind === 'proj') {
        it.t += dt;
        it.frame += dt * 10 / 1000;
        if (it.t >= it.ms) { it.done = true; it.resolve(); }
      }
    }
    this.items = this.items.filter(i => !i.done);
  }

  /** @param {import('../core/Renderer.js').Renderer} r */
  draw(r) {
    for (const it of this.items) {
      if (it.kind === 'fx') {
        r.sprite(it.key, it.frame, it.x, it.y, { scale: it.scale, flipX: it.flipX });
      } else if (it.kind === 'proj') {
        const k = it.t / it.ms;
        const x = it.from.x + (it.to.x - it.from.x) * k;
        const y = it.from.y + (it.to.y - it.from.y) * k - Math.sin(k * Math.PI) * it.arc;
        r.sprite(it.key, it.frame, x, y, { scale: it.scale, flipX: it.flipX });
      } else if (it.kind === 'text' && it.t >= 0) {
        const k = it.t / it.life;
        const pop = k < 0.15 ? Ease.outBack(k / 0.15) : 1;
        const size = Math.round((it.size * (0.6 + 0.4 * pop)) / 8) * 8 || 8;
        r.text(it.str, it.x, it.y - Ease.outCubic(k) * it.rise, {
          size, color: it.color, align: 'center', alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1,
        });
      }
    }
  }

  clear() { this.items = []; }
}
