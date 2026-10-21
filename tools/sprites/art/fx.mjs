// Efeitos animados (frames 64x64) tocados sobre os personagens.
import { Grid, sheet, rng } from '../lib/grid.mjs';

const TAU = Math.PI * 2;
const frames = (n, fn) => sheet(Array.from({ length: n }, (_, i) => fn(i / (n - 1 || 1), i)));

/** Estrela de impacto genérica. */
function hit(t) {
  const g = new Grid();
  const r = 6 + t * 20, inner = 2 + t * 6;
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16, rad = i % 2 ? inner : r;
    pts.push([32 + Math.cos(a) * rad, 32 + Math.sin(a) * rad]);
  }
  if (t < 0.9) g.poly(pts, t < 0.4 ? 'w' : 'y4');
  if (t < 0.6) g.circle(32, 32, inner, 'w');
  if (t > 0.3) g.erase((x, y) => Math.hypot(x - 32, y - 32) < (t - 0.3) * 30);
  return g;
}

/** Estaca: lascas de madeira voando a partir do impacto. */
function estacaFx(t, i) {
  const r = rng(7);
  const g = hit(Math.min(1, t * 1.3));
  for (let k = 0; k < 10; k++) {
    const a = r() * TAU, d = 4 + t * (14 + r() * 14);
    const x = 32 + Math.cos(a) * d, y = 32 + Math.sin(a) * d + t * t * 10;
    if (t < 1) g.stroke(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, r() > 0.5 ? 'm4' : 'm5');
  }
  if (i === 0) g.circle(32, 32, 8, 'w');
  return g;
}

/** Aspirador: vórtice verde em espiral que gira e encolhe. */
function aspiradorFx(t) {
  const g = new Grid();
  const arms = 3;
  for (let a = 0; a < arms; a++) {
    for (let s = 0; s < 40; s++) {
      const u = s / 40;
      const ang = a * TAU / arms + u * 5 - t * 9;
      const rad = (1 - u) * 26 * (1 - t * 0.5);
      const x = 32 + Math.cos(ang) * rad, y = 32 + Math.sin(ang) * rad * 0.7;
      g.set(x, y, u < 0.3 ? 'v3' : u < 0.7 ? 'v5' : 'v6');
      g.set(x + 1, y, u < 0.5 ? 'v4' : 'w');
    }
  }
  g.circle(32, 32, 3 + Math.round(t * 3), 'w');
  if (t > 0.8) g.erase((x, y) => (x + y) % 2 === 0);
  return g;
}

/** Cruz: luz sagrada em forma de cruz que cresce com raios. */
function cruzFx(t) {
  const g = new Grid();
  const s = Math.min(1, t * 1.6);
  const L = Math.round(6 + s * 22), W = Math.round(2 + s * 3);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 + t;
    const r0 = 8 + t * 10, r1 = r0 + 6 + t * 10;
    if (t > 0.15) g.line(32 + Math.cos(a) * r0, 32 + Math.sin(a) * r0, 32 + Math.cos(a) * r1, 32 + Math.sin(a) * r1, 'y4');
  }
  g.rect(32 - W, 32 - L, W * 2, L * 2, 'y3');
  g.rect(32 - Math.round(L * 0.7), 32 - Math.round(L * 0.4) - W, Math.round(L * 1.4), W * 2, 'y3');
  g.rect(32 - W + 1, 32 - L + 1, W * 2 - 2, L * 2 - 2, 'w');
  g.rect(32 - Math.round(L * 0.7) + 1, 32 - Math.round(L * 0.4) - W + 1, Math.round(L * 1.4) - 2, W * 2 - 2, 'w');
  if (t > 0.75) g.erase((x, y) => (x * 3 + y) % 3 !== 0);
  return g;
}

/** Possessão: mão sombria que surge do chão e agarra. */
function possessaoFx(t) {
  const g = new Grid();
  const rise = Math.min(1, t * 2);
  const grab = Math.max(0, (t - 0.5) * 2);
  const by = 60 - rise * 34;
  g.ellipse(32, 58, 18, 4, 'p1');
  g.rect(26, by, 12, 60 - by, 'p3');
  for (let f = 0; f < 4; f++) {
    const fx = 24 + f * 5;
    const tipY = by - 10 + grab * 8;
    const tipX = fx + (2 - f) * grab * 2;
    g.stroke(fx + 2, by, tipX + 2, tipY, 4, 'p4');
  }
  g.stroke(38, by + 4, 44 - grab * 6, by - 4, 4, 'p4');
  g.outline('p1');
  if (t > 0.85) g.erase((x, y) => (x + y) % 2 === 0);
  return g;
}

/** Assombração: anéis de grito se expandindo. */
function assombracaoFx(t) {
  const g = new Grid();
  for (let k = 0; k < 3; k++) {
    const r = 4 + ((t + k / 3) % 1) * 28;
    g.ring(32, 32, r, 2, k % 2 ? 'gh3' : 'gh4');
  }
  g.erase((x, y) => x > 32 + (1 - t) * 6 && Math.abs(y - 32) < 30 && x > 50);
  return g;
}

/** Maldição: caveira roxa que sobe e se desfaz. */
function maldicaoFx(t) {
  const g = new Grid();
  const y = 40 - t * 16;
  g.ellipse(32, y, 10, 9, 'p4');
  g.rect(26, y + 5, 13, 6, 'p4');
  g.ellipse(28, y, 2, 2, 'p1'); g.ellipse(36, y, 2, 2, 'p1');
  for (let x = 27; x <= 37; x += 3) g.rect(x, y + 8, 1, 3, 'p2');
  const r = rng(3);
  for (let k = 0; k < 8; k++) g.set(20 + r() * 24, y + 12 + r() * 14 * (1 + t), r() > 0.5 ? 'p3' : 'p5');
  g.outline('p1');
  if (t > 0.7) g.erase((x, yy) => (x + yy * 2) % 3 === 0);
  return g;
}

/** Fumaça de quando um inimigo é derrotado. */
function poof(t) {
  const g = new Grid();
  const r = rng(11);
  for (let k = 0; k < 9; k++) {
    const a = k * TAU / 9 + r(), d = t * 20;
    const rad = Math.max(1, 9 * (1 - t) + r() * 3);
    g.circle(32 + Math.cos(a) * d, 32 + Math.sin(a) * d - t * 6, rad, t < 0.5 ? 'g5' : 'g4');
  }
  if (t < 0.3) g.circle(32, 32, 10, 'w');
  g.shade();
  if (t > 0.6) g.erase((x, y) => (x + y) % 2 === 0);
  return g;
}

/** Brilhos verdes de cura subindo. */
function heal(t) {
  const g = new Grid();
  const r = rng(5);
  for (let k = 0; k < 6; k++) {
    const x = 14 + r() * 36, y = 56 - ((t + r()) % 1) * 50;
    const c = r() > 0.5 ? 'v5' : 'v6';
    g.rect(x - 1, y - 3, 3, 7, c);
    g.rect(x - 3, y - 1, 7, 3, c);
    g.set(x, y, 'w');
  }
  return g;
}

/** Moeda girando. */
function coin(t, i) {
  const g = new Grid();
  const w = [10, 7, 3, 1, 3, 7][i];
  g.ellipse(32, 32, w, 10, 'y3');
  if (w > 3) g.ellipse(32, 32, w - 3, 7, 'y2');
  if (w > 6) g.rect(31, 28, 2, 8, 'y4');
  g.outline('k');
  return g;
}

/** Bolha de escudo do amuleto. */
function shield(t) {
  const g = new Grid();
  const r = 22 + Math.sin(t * TAU) * 2;
  g.ring(32, 34, r, 2, 'b4');
  g.ring(32, 34, r - 3, 1, 'b5@50');
  g.px([[20, 20], [21, 19], [22, 18]], 'w');
  return g;
}

/** Estaca voando (projétil). */
function projEstaca() {
  const g = new Grid();
  g.rect(14, 29, 28, 6, 'm4');
  g.poly([[42, 28], [42, 36], [54, 32]], 'm5');
  g.shade();
  g.rect(10, 31, 4, 2, 'm2');
  g.outline('k');
  for (let x = 2; x < 12; x += 3) g.set(x, 32, 'w@60');
  return g;
}

/** Orbe roxo (projétil inimigo). */
function projOrb(t) {
  const g = new Grid();
  g.circle(32, 32, 9 + Math.round(t), 'p3');
  g.circle(30, 30, 5, 'p4');
  g.circle(29, 29, 2, 'p5');
  g.outline('p1');
  for (let x = 44; x < 58; x += 4) g.set(x, 32 + (t ? 1 : -1), 'p4@60');
  return g;
}

export function fxSheets() {
  return {
    hit: frames(5, hit),
    estaca: frames(6, estacaFx),
    aspirador: frames(6, aspiradorFx),
    cruz: frames(6, cruzFx),
    possessao: frames(6, possessaoFx),
    assombracao: frames(6, assombracaoFx),
    maldicao: frames(6, maldicaoFx),
    poof: frames(6, poof),
    heal: frames(6, heal),
    coin: frames(6, coin),
    shield: frames(4, shield),
    proj_estaca: projEstaca(),
    proj_orb: sheet([projOrb(0), projOrb(1)]),
  };
}
