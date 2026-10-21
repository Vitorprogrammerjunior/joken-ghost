// Desenho no canvas 1280x720 com escala inteira (pixel art nítida).
import { FRAME_SIZE } from './Assets.js';

export const GW = 1280;
export const GH = 720;
export const PX = 2; // 1 pixel de arte = 2 pixels de tela

export class Renderer {
  /** @param {HTMLCanvasElement} canvas  @param {import('./Assets.js').Assets} assets */
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.camera = { x: 0, y: 0 };
    this.tintCache = new Map();
  }

  begin() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, GW, GH);
    ctx.translate(Math.round(this.camera.x), Math.round(this.camera.y));
  }

  /** Versão da folha pintada de uma cor (para piscar ao levar dano). */
  #tinted(key, img, color) {
    const id = `${key}|${color}`;
    let c = this.tintCache.get(id);
    if (!c) {
      c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      this.tintCache.set(id, c);
    }
    return c;
  }

  /**
   * Desenha um frame de uma folha.
   * anchor 'feet': (x, y) é o centro dos pés; 'center': centro; 'topleft': canto.
   */
  sprite(key, frame, x, y, { scale = PX, flipX = false, alpha = 1, tint = null, tintAlpha = 1, anchor = 'center', sx = 1, sy = 1 } = {}) {
    const sheet = this.assets.get(key);
    if (!sheet || alpha <= 0) return;
    const f = ((Math.floor(frame) % sheet.frames) + sheet.frames) % sheet.frames;
    const size = FRAME_SIZE * scale;
    const w = size * sx, h = size * sy;
    let dx = x, dy = y;
    if (anchor === 'feet') { dx = x - w / 2; dy = y - h + 3 * scale * sy; }
    else if (anchor === 'center') { dx = x - w / 2; dy = y - h / 2; }
    dx = Math.round(dx); dy = Math.round(dy);

    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (flipX) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); dx = 0; dy = 0; }
    ctx.drawImage(sheet.img, f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, dx, dy, w, h);
    if (tint) {
      ctx.globalAlpha *= tintAlpha;
      ctx.drawImage(this.#tinted(key, sheet.img, tint), f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, dx, dy, w, h);
    }
    ctx.restore();
  }

  /** Repete um tile na horizontal entre x0 e x1. */
  tileRow(key, y, { x0 = 0, x1 = GW, scale = PX, frame = 0, offset = 0, alpha = 1 } = {}) {
    const size = FRAME_SIZE * scale;
    const start = x0 - (((offset % size) + size) % size);
    for (let x = start; x < x1; x += size) this.sprite(key, frame, x, y, { scale, anchor: 'topleft', alpha });
  }

  rect(x, y, w, h, color, alpha = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  /** Texto na fonte pixel, com contorno de 1 pixel de arte. */
  text(str, x, y, { size = 16, color = '#f4f2fa', align = 'left', outline = '#0e0b16', alpha = 1, baseline = 'alphabetic' } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${size}px JokenPixel, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    x = Math.round(x); y = Math.round(y);
    const o = Math.max(2, Math.round(size / 8));
    if (outline) {
      ctx.fillStyle = outline;
      for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]]) ctx.fillText(str, x + dx, y + dy);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  /** Barra de vida em pixel art. */
  bar(x, y, w, h, ratio, { fill = '#5fb24a', back = '#1c1729', frame = '#0e0b16', ghost = null } = {}) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x - 2, y - 2, w + 4, h + 4, frame);
    this.rect(x, y, w, h, back);
    if (ghost != null) this.rect(x, y, w * Math.max(0, Math.min(1, ghost)), h, '#f4f2fa', 0.7);
    this.rect(x, y, w * Math.max(0, Math.min(1, ratio)), h, fill);
    this.rect(x, y, w * Math.max(0, Math.min(1, ratio)), 2, '#ffffff', 0.25);
  }
}

/** Cor da barra de vida conforme a porcentagem. */
export function hpColor(ratio) {
  return ratio > 0.6 ? '#5fb24a' : ratio > 0.3 ? '#f6d548' : '#d23a3a';
}
