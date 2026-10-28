// O "palco" do comercial: canvas 1080x1920 (9:16) com as ferramentas de desenho das cenas.
// Usa a arte do jogo: sprites do manifesto, cenários (world/Scenery.js) e a fonte JokenPixel.
import { FRAME_SIZE } from '../../../src/core/Assets.js';
import { Renderer, GW, GH } from '../../../src/core/Renderer.js';
import { Scenery } from '../../../src/world/Scenery.js';
import { seeded, clamp } from './motion.js';

export const W = 1080;
export const H = 1920;
export const FONT = 'JokenPixel';

export const COLORS = {
  ink: '#0e0b16', ink2: '#1c1729', ink3: '#2f2a3d', stone: '#4a4559', fog: '#c9c7d4', white: '#f4f2fa',
  gold: '#f6d548', gold2: '#cf9a22', orange: '#f08c2a', red: '#d23a3a', cyan: '#7cf0dc', purple: '#a35fd9', purpleDark: '#3c1d63',
};

/**
 * Cenário do jogo (1280x720) recortado em pé: uma janela de 360x640 pixels ampliada 3x
 * enche a tela 1080x1920 com a pixel art nítida. `pan` move a janela pelo cenário.
 */
class Backdrop {
  constructor(assets, kind) {
    this.assets = assets;
    this.kind = kind;
    this.canvas = document.createElement('canvas');
    this.canvas.width = GW; this.canvas.height = GH;
    this.renderer = new Renderer(this.canvas, assets);
    this.reset();
  }

  reset() { this.scenery = new Scenery(this.assets, this.kind); this.t = 0; }

  /** Avança a animação do cenário até o tempo t (em s) da cena. */
  advance(t) {
    if (t < this.t) this.reset();
    while (this.t < t) { this.scenery.update(1000 / 60); this.t += 1 / 60; }
    this.renderer.begin();
    this.scenery.drawBack(this.renderer);
    this.scenery.drawFront(this.renderer);
  }
}

export class Stage {
  /** @param {HTMLCanvasElement} canvas  @param {import('../../../src/core/Assets.js').Assets} assets */
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.backdrops = new Map();
    this.wipeOrder = (() => {
      const rng = seeded(7);
      return Array.from({ length: 12 * 22 }, () => rng());
    })();
  }

  begin() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(0, 0, W, H);
  }

  /** Tremida de câmera (deslocamento em px) aplicada até `restore`. */
  shake(mag, t, seed = 1) {
    const { ctx } = this;
    ctx.save();
    if (mag > 0.5) ctx.translate(Math.round(Math.sin(t * 91 + seed) * mag), Math.round(Math.cos(t * 77 + seed * 3) * mag));
  }

  restore() { this.ctx.restore(); }

  // ─── fundos ───
  backdrop(kind, t, { pan = 460, rise = 40, dim = 0 } = {}) {
    if (!this.backdrops.has(kind)) this.backdrops.set(kind, new Backdrop(this.assets, kind));
    const b = this.backdrops.get(kind);
    b.advance(t);
    const sx = Math.round(clamp(pan, 0, GW - 360)), sy = Math.round(clamp(rise, 0, GH - 640));
    this.ctx.drawImage(b.canvas, sx, sy, 360, 640, 0, 0, W, H);
    if (dim > 0) this.fill(COLORS.ink, dim);
  }

  fill(color, alpha = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.restore();
  }

  /** Brilho radial (luz de lua, aura, explosão). */
  glow(x, y, r, color, alpha = 1) {
    if (alpha <= 0) return;
    const { ctx } = this;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** Raios de luz girando atrás do logo. */
  rays(x, y, t, { count = 14, length = 1400, colors = ['rgba(124,240,220,0.10)', 'rgba(163,95,217,0.12)'], speed = 0.12 } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * speed);
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, length, i * step, i * step + step * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Escurece as bordas e dá textura de tela antiga (linhas finas). */
  finish() {
    const { ctx } = this;
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    v.addColorStop(0, 'rgba(14,11,22,0)');
    v.addColorStop(1, 'rgba(14,11,22,0.7)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(14,11,22,0.08)';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  }

  // ─── sprites ───
  /**
   * Um frame de uma folha do jogo. anchor: 'center' (meio) ou 'feet' (meio dos pés).
   * `scale` é quantos pixels de tela vale 1 pixel do quadro de 64x64.
   */
  sprite(key, frame, x, y, scale, { anchor = 'center', flipX = false, alpha = 1, rotate = 0, sx = 1, sy = 1 } = {}) {
    const sheet = this.assets.get(key);
    if (!sheet || alpha <= 0) return;
    const f = ((Math.floor(frame) % sheet.frames) + sheet.frames) % sheet.frames;
    const size = FRAME_SIZE * scale;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (rotate) ctx.rotate(rotate);
    ctx.scale((flipX ? -1 : 1) * sx, sy);
    const dy = anchor === 'feet' ? -size + 3 * scale : -size / 2;
    ctx.drawImage(sheet.img, f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, -size / 2, dy, size, size);
    ctx.restore();
  }

  /** A mesma sprite pintada de uma cor (clarão de dano). */
  silhouette(key, frame, x, y, scale, color, alpha, opts = {}) {
    if (alpha <= 0) return;
    const sheet = this.assets.get(key);
    if (!sheet) return;
    const size = FRAME_SIZE * scale;
    if (!this.tint || this.tint.width !== size) {
      this.tint = document.createElement('canvas');
      this.tint.width = size; this.tint.height = size;
    }
    const c = this.tint.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, size, size);
    const f = Math.floor(frame) % sheet.frames;
    c.drawImage(sheet.img, f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, 0, 0, size, size);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = color;
    c.fillRect(0, 0, size, size);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    const dy = opts.anchor === 'feet' ? -size + 3 * scale : -size / 2;
    ctx.translate(Math.round(x), Math.round(y));
    if (opts.flipX) ctx.scale(-1, 1);
    ctx.drawImage(this.tint, -size / 2, dy);
    ctx.restore();
  }

  /**
   * Painel 9-slice das sprites de interface (cantos de 16px no quadro de 64), como o border-image do CSS.
   * `scale` é quantos pixels de tela vale 1 pixel da sprite (o jogo usa 2).
   */
  panel(key, x, y, w, h, { scale = 4, alpha = 1 } = {}) {
    const sheet = this.assets.get(key);
    if (!sheet || alpha <= 0) return;
    const { ctx } = this;
    const s = 16, d = s * scale;
    const img = sheet.img;
    const cols = [[0, s, x, d], [s, FRAME_SIZE - 2 * s, x + d, w - 2 * d], [FRAME_SIZE - s, s, x + w - d, d]];
    const rows = [[0, s, y, d], [s, FRAME_SIZE - 2 * s, y + d, h - 2 * d], [FRAME_SIZE - s, s, y + h - d, d]];
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (const [sx, sw, dx, dw] of cols) for (const [sy, sh, dy, dh] of rows) ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  // ─── texto ───
  /**
   * Texto na fonte do jogo com contorno de pixel e sombra embaixo (como nos títulos do jogo).
   * reveal: quantos caracteres aparecem (efeito de máquina de escrever).
   */
  text(str, x, y, { size = 48, color = COLORS.white, align = 'center', outline = COLORS.ink, shadow = true, alpha = 1, reveal = Infinity, tracking = 0 } = {}) {
    if (alpha <= 0) return;
    const shown = str.slice(0, Math.max(0, Math.floor(reveal)));
    if (!shown) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${tracking}px`;
    // alinhamento calculado sobre o texto inteiro, para a máquina de escrever não "andar"
    const full = ctx.measureText(str).width;
    const left = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
    ctx.textAlign = 'left';
    const o = Math.max(2, Math.round(size / 12));
    if (shadow) { ctx.fillStyle = outline; ctx.fillText(shown, left, y + o * 2.5); }
    ctx.fillStyle = outline;
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]]) ctx.fillText(shown, left + dx, y + dy);
    ctx.fillStyle = color;
    ctx.fillText(shown, left, y);
    ctx.restore();
  }

  /** Largura de um texto na fonte do jogo. */
  measure(str, size, tracking = 0) {
    const { ctx } = this;
    ctx.save();
    ctx.font = `${size}px ${FONT}`;
    ctx.letterSpacing = `${tracking}px`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  /**
   * Tipografia cinética: cada letra entra caindo e quicando, uma depois da outra.
   * `k(i)` devolve o progresso 0..1 da letra i; `color(i)` a cor dela.
   */
  kinetic(str, x, y, k, { size = 120, color = () => COLORS.white, drop = 220, tracking = 4 } = {}) {
    const total = this.measure(str, size, tracking);
    let cx = x - total / 2;
    [...str].forEach((ch, i) => {
      const w = this.measure(ch, size, tracking);
      const p = k(i);
      if (p > 0) this.text(ch, cx, y - (1 - p) * drop, { size, color: color(i), align: 'left', alpha: Math.min(1, p * 2), tracking });
      cx += w;
    });
  }

  // ─── efeitos ───
  flash(alpha, color = COLORS.white) { if (alpha > 0) this.fill(color, Math.min(1, alpha)); }

  /**
   * Transição em pixels grandes: blocos escuros cobrem a tela em ordem aleatória.
   * p = 0 (nada) .. 1 (tela toda coberta).
   */
  wipe(p) {
    if (p <= 0) return;
    const { ctx } = this;
    const bw = W / 12, bh = H / 22;
    ctx.fillStyle = COLORS.ink;
    this.wipeOrder.forEach((v, i) => {
      if (v < p) ctx.fillRect(Math.floor((i % 12) * bw), Math.floor(Math.floor(i / 12) * bh), Math.ceil(bw) + 1, Math.ceil(bh) + 1);
    });
  }

  /** Faíscas/vaga-lumes com semente: sempre os mesmos para o mesmo t. */
  sparks(seed, count, t, { x = W / 2, y = H / 2, spread = 500, rise = 120, colors = [COLORS.cyan, COLORS.gold], size = 6, alpha = 1 } = {}) {
    const rng = seeded(seed);
    const { ctx } = this;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const px = x + (rng() - 0.5) * spread * 2, py = y + (rng() - 0.5) * spread;
      const speed = 0.4 + rng(), phase = rng() * 10;
      const yy = py - ((t * rise * speed + phase * 40) % (spread * 1.2));
      const tw = 0.5 + 0.5 * Math.sin(t * 4 * speed + phase);
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = colors[i % colors.length];
      const s = size * (0.6 + rng() * 0.8);
      ctx.fillRect(Math.round(px + Math.sin(t + phase) * 20), Math.round(yy), Math.round(s), Math.round(s));
    }
    ctx.restore();
  }

  /** Estouro de partículas a partir de (x, y), começando em t0. */
  burst(seed, count, t, t0, { x, y, speed = 900, colors = [COLORS.gold, COLORS.white, COLORS.cyan], size = 10, life = 0.8 } = {}) {
    const age = t - t0;
    if (age < 0 || age > life) return;
    const rng = seeded(seed);
    const { ctx } = this;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2, v = speed * (0.4 + rng() * 0.6);
      const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age + 600 * age * age;
      ctx.globalAlpha = 1 - age / life;
      ctx.fillStyle = colors[i % colors.length];
      const s = Math.round(size * (0.5 + rng()));
      ctx.fillRect(Math.round(px), Math.round(py), s, s);
    }
    ctx.restore();
  }
}
