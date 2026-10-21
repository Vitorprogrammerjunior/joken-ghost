// Personagem animado (Caçador ou monstro) desenhado a partir das folhas 64x64.
import { PX } from '../core/Renderer.js';

const FPS = { idle: 6, attack: 10, hurt: 8, win: 4, ko: 1 };

export class Fighter {
  /**
   * @param {import('../core/Assets.js').Assets} assets
   * @param {object} o
   * @param {string} o.base     prefixo das folhas: 'hunter' ou 'enemy/fantasma'
   */
  constructor(assets, { base, x, y, scale = PX, flying = false, flipX = false }) {
    this.assets = assets;
    this.base = base;
    this.x = x;            // centro dos pés
    this.y = y;
    this.scale = scale;
    this.flying = flying;
    this.flipX = flipX;
    // deslocamentos animáveis (tweens)
    this.ox = 0; this.oy = 0; this.alpha = 1; this.sx = 1; this.sy = 1;
    this.flash = 0;        // 0..1 brilho branco
    this.flashColor = '#ffffff';
    this.tint = null;      // [cor, alfa] permanente (fases do chefe)
    this.shakeT = 0; this.shakeMag = 0;
    this.anim = 'idle';
    this.frame = 0;
    this.loop = true;
    this.onAnimEnd = null;
    this.t = Math.random() * 1000;
    this.hold = false;
  }

  has(anim) { return this.assets.has(`${this.base}/${anim}`); }

  /** Toca uma animação. Retorna Promise que resolve ao terminar (se não for loop). */
  play(anim, { loop = false, hold = false } = {}) {
    if (!this.has(anim)) anim = 'idle';
    this.anim = anim;
    this.frame = 0;
    this.loop = loop;
    this.hold = hold;
    return new Promise((resolve) => {
      this.onAnimEnd = loop ? null : resolve;
      if (loop) resolve();
    });
  }

  idle() { return this.play('idle', { loop: true }); }

  shake(ms = 300, mag = 6) { this.shakeT = ms; this.shakeMag = mag; }

  update(dt) {
    this.t += dt;
    const frames = this.assets.frames(`${this.base}/${this.anim}`);
    this.frame += dt * (FPS[this.anim] ?? 8) / 1000;
    if (this.frame >= frames) {
      if (this.loop) this.frame %= frames;
      else {
        this.frame = frames - 1;
        const done = this.onAnimEnd;
        this.onAnimEnd = null;
        if (!this.hold) { this.anim = 'idle'; this.loop = true; this.frame = 0; }
        done?.();
      }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt / 250);
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
  }

  /** Posição dos pés, incluindo flutuação dos voadores. */
  get drawX() {
    const shake = this.shakeT > 0 ? (Math.random() * 2 - 1) * this.shakeMag * (this.shakeT / 300) : 0;
    return this.x + this.ox + shake;
  }

  get drawY() {
    const hover = this.flying ? -24 + Math.sin(this.t / 420) * 6 : 0;
    return this.y + this.oy + hover;
  }

  /** Centro do corpo (para efeitos e textos). */
  get center() {
    return { x: this.drawX, y: this.drawY - 32 * this.scale };
  }

  /** Retângulo clicável em coordenadas de tela. */
  hitbox() {
    const s = 64 * this.scale;
    return { x: this.drawX - s * 0.35, y: this.drawY - s * 0.9, w: s * 0.7, h: s * 0.9 };
  }

  contains(px, py) {
    const b = this.hitbox();
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  /** @param {import('../core/Renderer.js').Renderer} r */
  draw(r, { shadow = true } = {}) {
    if (this.alpha <= 0) return;
    if (shadow) {
      const w = 34 * this.scale * this.sx;
      const k = this.flying ? 0.7 + Math.sin(this.t / 420) * 0.1 : 1;
      r.rect(this.x + this.ox - w * k / 2, this.y - 2 * this.scale, w * k, 3 * this.scale, '#0e0b16', 0.35 * this.alpha);
    }
    const flashing = this.flash > 0;
    r.sprite(`${this.base}/${this.anim}`, this.frame, this.drawX, this.drawY, {
      scale: this.scale, anchor: 'feet', flipX: this.flipX, alpha: this.alpha,
      tint: flashing ? this.flashColor : this.tint?.[0] ?? null,
      tintAlpha: flashing ? this.flash : this.tint?.[1] ?? 0,
      sx: this.sx, sy: this.sy,
    });
  }
}
