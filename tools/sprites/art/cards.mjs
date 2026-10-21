// Cartas de perk (estilo baralho) dentro de um frame 64x64.
// A carta ocupa x 9..54 e y 1..62; o ícone e o nome entram por cima no DOM.
//   janela da arte: x 13..50, y 6..40   faixa do nome: x 12..51, y 43..52
import { Grid } from '../lib/grid.mjs';

const RARITY = {
  comum:    { border: 't4', dark: 't2', bg: 't1', glow: 't3', gems: 1 },
  raro:     { border: 'b4', dark: 'b2', bg: 'b1', glow: 'b3', gems: 2 },
  epico:    { border: 'p4', dark: 'p2', bg: 'p1', glow: 'p3', gems: 3 },
  lendario: { border: 'y3', dark: 'y1', bg: 'k2', glow: 'y2', gems: 4 },
};

function rounded(g, x, y, w, h, r, c) {
  g.rect(x + r, y, w - r * 2, h, c);
  g.rect(x, y + r, w, h - r * 2, c);
  for (let i = 0; i < r; i++) {
    const cut = r - i;
    g.rect(x + cut, y + i, w - cut * 2, 1, c);
    g.rect(x + cut, y + h - 1 - i, w - cut * 2, 1, c);
  }
}

function front(kind) {
  const R = RARITY[kind];
  const g = new Grid();
  rounded(g, 9, 1, 46, 62, 4, 'k');
  rounded(g, 10, 2, 44, 60, 3, R.border);
  g.rect(11, 3, 42, 1, 'w@40');                      // brilho da borda
  rounded(g, 12, 4, 40, 56, 2, R.dark);
  // janela da arte com raios de fundo
  g.rect(13, 6, 38, 35, 'k');
  g.rect(14, 7, 36, 33, R.bg);
  const rays = new Grid();
  for (let i = 0; i < 16; i += 2) {
    const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
    rays.poly([[32, 23], [32 + Math.cos(a0) * 40, 23 + Math.sin(a0) * 40], [32 + Math.cos(a1) * 40, 23 + Math.sin(a1) * 40]], R.glow);
  }
  rays.erase((x, y) => x < 14 || x > 49 || y < 7 || y > 39);
  rays.erase((x, y) => (x + y) % 2 === 0); // pontilhado discreto
  g.blit(rays);
  // faixa do nome
  g.rect(12, 43, 40, 10, 'k');
  g.rect(13, 44, 38, 8, 'm6');
  g.rect(13, 44, 38, 1, 'w@60');
  g.rect(13, 51, 38, 1, 'm5');
  // gemas de raridade
  const gx = 32 - R.gems * 3;
  for (let i = 0; i < R.gems; i++) {
    const x = gx + i * 6 + 1;
    g.px([[x + 1, 55], [x, 56], [x + 1, 56], [x + 2, 56], [x + 1, 57]], R.border);
    g.set(x + 1, 56, 'w');
  }
  if (kind === 'lendario') {
    for (const [x, y] of [[11, 3], [52, 3], [11, 60], [52, 60]]) g.px([[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], 'y4');
  }
  return g;
}

function back() {
  const g = new Grid();
  rounded(g, 9, 1, 46, 62, 4, 'k');
  rounded(g, 10, 2, 44, 60, 3, 'y2');
  rounded(g, 12, 4, 40, 56, 2, 'p2');
  // losangos
  for (let y = 4; y < 60; y += 6) for (let x = 12 + ((y / 6) % 2) * 3; x < 52; x += 6) g.set(x, y, 'p3');
  g.frame(14, 6, 36, 52, 'y1');
  // emblema: caveira com chapéu de caçador
  g.ellipse(32, 31, 9, 8, 'p4');
  g.ellipse(32, 31, 7, 6, 'q3');
  g.rect(28, 35, 9, 4, 'q3');
  g.ellipse(29, 31, 1, 2, 'p1'); g.ellipse(35, 31, 1, 2, 'p1');
  g.rect(31, 34, 2, 1, 'p1');
  g.rect(26, 22, 13, 2, 'm2'); g.rect(29, 18, 7, 4, 'm2');      // chapéu
  g.rect(29, 21, 7, 1, 'y2');
  return g;
}

export function cardSheets() {
  return {
    card_comum: front('comum'),
    card_raro: front('raro'),
    card_epico: front('epico'),
    card_lendario: front('lendario'),
    card_verso: back(),
  };
}
