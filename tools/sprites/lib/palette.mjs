// Paleta única do JokenGhost. Toda sprite usa apenas estas cores,
// o que mantém o jogo visualmente coeso.
export const PALETTE = {
  // contorno e neutros
  k:   '#0e0b16', // contorno
  k2:  '#1c1729',
  g1:  '#2f2a3d',
  g2:  '#4a4559',
  g3:  '#6e6a80',
  g4:  '#9b98ab',
  g5:  '#c9c7d4',
  w:   '#f4f2fa',

  // fantasmagórico (azul pálido)
  gh1: '#3d4f86',
  gh2: '#6f88c4',
  gh3: '#a9c1ec',
  gh4: '#dbe8ff',
  gh5: '#f7fbff',

  // vermelhos
  r1: '#4a0e1e',
  r2: '#8e1a2e',
  r3: '#d23a3a',
  r4: '#ff7563',
  r5: '#ffb3a0',

  // laranja / fogo
  o1: '#7a2e14',
  o2: '#c45a1e',
  o3: '#f08c2a',
  o4: '#ffc04d',

  // amarelo / ouro
  y1: '#8a5a12',
  y2: '#cf9a22',
  y3: '#f6d548',
  y4: '#fff3a6',

  // verde
  v1: '#0f2c22',
  v2: '#1b4a30',
  v3: '#2f7a3e',
  v4: '#5fb24a',
  v5: '#a8e070',
  v6: '#e2ffb0',

  // ciano espiritual
  c1: '#0d3340',
  c2: '#16697a',
  c3: '#2fb5b5',
  c4: '#7cf0dc',
  c5: '#d4fff5',

  // azul
  b1: '#141a3c',
  b2: '#22327a',
  b3: '#3a5cc4',
  b4: '#6f96f0',
  b5: '#b8d0ff',

  // roxo
  p1: '#1e0f33',
  p2: '#3c1d63',
  p3: '#6a34a3',
  p4: '#a35fd9',
  p5: '#d9a8ff',

  // marrom / madeira
  m1: '#22140f',
  m2: '#43271a',
  m3: '#6b4029',
  m4: '#9a6438',
  m5: '#c99358',
  m6: '#ecc58a',

  // pele
  s1: '#3b2116',
  s2: '#6a3d26',
  s3: '#9a6038',
  s4: '#c98a58',
  s5: '#f0bd8c',

  // porcelana / pele pálida
  q1: '#8a7a8e',
  q2: '#c4b4c4',
  q3: '#eadde6',
  q4: '#fff6fa',

  // pedra
  t1: '#262833',
  t2: '#3c3f4f',
  t3: '#5a5e70',
  t4: '#7f8496',
  t5: '#aab0c0',
};

// Rampas de cor (escuro -> claro) usadas pelo sombreamento automático.
export const RAMPS = [
  ['k', 'k2', 'g1', 'g2', 'g3', 'g4', 'g5', 'w'],
  ['gh1', 'gh2', 'gh3', 'gh4', 'gh5'],
  ['r1', 'r2', 'r3', 'r4', 'r5'],
  ['o1', 'o2', 'o3', 'o4', 'y4'],
  ['y1', 'y2', 'y3', 'y4'],
  ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
  ['c1', 'c2', 'c3', 'c4', 'c5'],
  ['b1', 'b2', 'b3', 'b4', 'b5'],
  ['p1', 'p2', 'p3', 'p4', 'p5'],
  ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
  ['s1', 's2', 's3', 's4', 's5'],
  ['q1', 'q2', 'q3', 'q4'],
  ['t1', 't2', 't3', 't4', 't5'],
];

const rampOf = new Map();
for (const ramp of RAMPS) ramp.forEach((c, i) => rampOf.set(c, { ramp, i }));

/** Desloca uma cor na sua rampa (negativo = mais escuro). */
export function shift(color, amount) {
  const info = rampOf.get(color);
  if (!info) return color;
  const i = Math.max(0, Math.min(info.ramp.length - 1, info.i + amount));
  return info.ramp[i];
}

/** Converte chave da paleta (ou '#rrggbb[aa]') em [r,g,b,a]. */
export function toRGBA(color) {
  const hex = (PALETTE[color] || color).replace('#', '');
  const n = (o) => parseInt(hex.slice(o, o + 2), 16);
  return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 255];
}
