// Sprite animada dentro de um <canvas> no DOM (retratos, monstruário, personagens).
import { h } from './dom.js';
import { FRAME_SIZE } from '../core/Assets.js';

const running = new Set();
let raf = 0;

function tick(t) {
  for (const s of running) {
    if (!s.canvas.isConnected) { running.delete(s); continue; }
    const f = Math.floor(t / s.msPerFrame) % s.sheet.frames;
    s.ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    s.ctx.drawImage(s.sheet.img, f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
  }
  raf = running.size ? requestAnimationFrame(tick) : 0;
}

/**
 * @param {import('../core/Assets.js').Assets} assets
 * @param {string} key  folha (ex.: 'char/luna/side/idle')
 */
export function spriteCanvas(assets, key, { size = 128, msPerFrame = 160, cls = '', dim = false } = {}) {
  const canvas = h('canvas', { width: FRAME_SIZE, height: FRAME_SIZE, class: `sprite-canvas ${cls}`, style: { width: `${size}px`, height: `${size}px` } });
  const sheet = assets.get(key);
  if (!sheet) return canvas;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (dim) canvas.style.filter = 'brightness(0) opacity(0.6)';
  running.add({ canvas, ctx, sheet, msPerFrame });
  if (!raf) raf = requestAnimationFrame(tick);
  return canvas;
}

/** Troca a folha de um canvas já criado (ex.: avatar do lobby). */
export function setSprite(assets, canvas, key, msPerFrame = 160) {
  for (const s of running) if (s.canvas === canvas) running.delete(s);
  const sheet = assets.get(key);
  if (!sheet) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  running.add({ canvas, ctx, sheet, msPerFrame });
  if (!raf) raf = requestAnimationFrame(tick);
}
