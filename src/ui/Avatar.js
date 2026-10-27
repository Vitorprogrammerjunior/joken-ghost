// Avatar do perfil: o rosto de um caçador (retrato animado) ou o desenho do Ateliê,
// com a moldura equipada por cima. O mesmo componente aparece no lobby, ranking, Arena...
import { h, icon } from './dom.js';
import { spriteCanvas } from './SpriteCanvas.js';
import { frameSprite } from '../config/multiplayer.js';
import { ART_SIZE, ART_PALETTE, decodeArt } from '../domain/avatar.js';

const BLINK_MS = 300;

/** Pinta um desenho (1 pixel do desenho = 1 pixel do canvas; o CSS amplia sem borrar). */
export function paintArt(canvas, art) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ART_SIZE, ART_SIZE);
  decodeArt(art).forEach((c, i) => {
    if (!c) return;
    ctx.fillStyle = ART_PALETTE[c];
    ctx.fillRect(i % ART_SIZE, Math.floor(i / ART_SIZE), 1, 1);
  });
}

export function artCanvas(art, cls = 'avatar-art') {
  const canvas = h('canvas', { class: cls, width: ART_SIZE, height: ART_SIZE });
  if (art) paintArt(canvas, art);
  return canvas;
}

/** Só a figura (sem moldura): rosto animado ou desenho. */
export function avatarPicture(assets, avatar) {
  return avatar?.kind === 'art'
    ? artCanvas(avatar.art)
    : spriteCanvas(assets, `char/${avatar?.hunter ?? 'cacador'}/portrait/idle`, { size: null, msPerFrame: BLINK_MS, cls: 'avatar-art' });
}

/**
 * @param {import('../core/Assets.js').Assets} assets
 * @param {{ avatar?: { kind: 'hunter'|'art', hunter?: string, art?: string }, frame?: string|null }} look
 * @param {{ size?: number, cls?: string }} [opts]  tamanho em px
 */
export function avatarEl(assets, { avatar, frame = null }, { size = 64, cls = '' } = {}) {
  return h('div', { class: `avatar${frame ? ' framed' : ''} ${cls}`, style: { width: `${size}px`, height: `${size}px` } },
    avatarPicture(assets, avatar),
    frame ? icon(frameSprite(frame), 'avatar-frame') : null);
}
