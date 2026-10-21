// Partículas quadradas (pixels) para faíscas, vagalumes, brasas, poeira...
import { PX } from './Renderer.js';

export class Particles {
  constructor() { this.list = []; }

  /**
   * @param {object} p
   * x, y, vx, vy (px/s), life (ms), color, size (pixels de arte), gravity, fade, glow
   */
  spawn(p) {
    this.list.push({ vx: 0, vy: 0, life: 800, size: 1, gravity: 0, fade: true, t: 0, wobble: 0, ...p });
  }

  burst(x, y, { count = 12, speed = 160, colors = ['#fff3a6', '#f6d548'], life = 600, gravity = 300, size = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3,
        life: life * (0.6 + Math.random() * 0.4), gravity, size,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt) {
    const s = dt / 1000;
    for (const p of this.list) {
      p.t += dt;
      p.vy += p.gravity * s;
      p.x += (p.vx + (p.wobble ? Math.sin(p.t / 300 + p.seed) * p.wobble : 0)) * s;
      p.y += p.vy * s;
    }
    this.list = this.list.filter(p => p.t < p.life);
  }

  /** @param {import('./Renderer.js').Renderer} r */
  draw(r) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      const alpha = p.fade ? Math.min(1, k * 2) : 1;
      const size = p.size * PX;
      // alinha na grade de pixels de arte
      const x = Math.round(p.x / PX) * PX, y = Math.round(p.y / PX) * PX;
      if (p.glow) r.rect(x - size, y - size, size * 3, size * 3, p.color, alpha * 0.25);
      r.rect(x, y, size, size, p.color, alpha);
    }
  }

  clear() { this.list = []; }
}
