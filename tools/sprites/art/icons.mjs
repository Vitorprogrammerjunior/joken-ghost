// Ícones 64x64: armas, ataques inimigos, itens, HUD e perks.
import { Grid, stamp } from '../lib/grid.mjs';

const finish = (g, { shade = true, outline = 'k' } = {}) => {
  if (shade) g.shade();
  if (outline) g.outline(outline);
  return g;
};

/** Barra diagonal com largura `w` entre dois pontos (para estacas, espadas...). */
function bar(g, x0, y0, x1, y1, w, c) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len * w / 2, ny = (x1 - x0) / len * w / 2;
  g.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
}

// ─── armas do Caçador ─────────────────────────────────────────
export function estaca() {
  const g = new Grid();
  bar(g, 10, 54, 38, 26, 14, 'm4');
  g.poly([[32, 21], [43, 32], [56, 8]], 'm5');     // ponta afiada
  g.shade({ depth: 2 });
  // lascas da ponta talhada
  g.line(36, 25, 52, 12, 'm6').line(40, 29, 50, 17, 'm6');
  // veios da madeira
  g.line(14, 44, 30, 28, 'm3').line(18, 50, 34, 34, 'm3').line(22, 42, 27, 37, 'm2');
  // anel de ferro
  bar(g, 15, 39, 25, 49, 5, 'g4');
  g.line(16, 41, 23, 48, 'g5');
  g.px([[55, 9], [54, 11]], 'r3');                 // sangue na ponta
  g.set(52, 13, 'r2');
  return finish(g, { shade: false });
}

export function aspirador() {
  const g = new Grid();
  const B = new Grid();
  B.rect(8, 22, 26, 30, 'g3');
  B.rect(10, 20, 22, 2, 'g3'); B.rect(10, 52, 22, 2, 'g3');
  B.shade();
  B.rect(12, 26, 14, 14, 'v2');
  B.rect(13, 27, 12, 12, 'v4');
  B.rect(15, 29, 5, 5, 'v6');
  B.rect(12, 44, 18, 4, 'g2');
  B.set(30, 24, 'r3');
  g.blit(B);
  // mangueira e bocal
  g.stroke(30, 46, 38, 48, 4, 'g2');
  g.stroke(38, 48, 44, 40, 4, 'g2');
  const N = new Grid();
  bar(N, 42, 42, 56, 26, 7, 'g4');
  N.poly([[52, 22], [60, 28], [58, 30], [50, 24]], 'g5');
  N.shade();
  g.blit(N);
  // sucção
  g.px([[60, 18], [57, 16], [62, 22], [55, 13]], 'v5');
  return finish(g, { shade: false });
}

export function cruz() {
  const g = new Grid();
  // raios de luz sagrada
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    g.line(32 + Math.cos(a) * 14, 23 + Math.sin(a) * 14, 32 + Math.cos(a) * 26, 23 + Math.sin(a) * 26, 'y4');
  }
  const C = new Grid();
  C.rect(27, 6, 10, 52, 'y3');
  C.rect(14, 18, 36, 10, 'y3');
  C.shade({ depth: 2 });
  C.rect(29, 21, 6, 4, 'r3');
  C.set(30, 22, 'r5');
  C.px([[29, 9], [29, 10], [16, 20], [17, 20]], 'w');
  g.blit(C);
  return finish(g, { shade: false });
}

// ─── ataques inimigos ─────────────────────────────────────────
function possessao() {
  const g = new Grid();
  // mão fantasmagórica roxa saindo de fumaça
  g.ellipse(32, 52, 18, 7, 'p2');
  g.ellipse(32, 36, 11, 10, 'p4');
  const fingers = [[20, 30, 18, 14], [26, 27, 25, 8], [32, 26, 32, 6], [38, 27, 39, 9], [43, 34, 49, 22]];
  for (const [x0, y0, x1, y1] of fingers) g.stroke(x0, y0, x1, y1, 5, 'p4');
  g.rect(24, 40, 16, 12, 'p4');
  g.shade({ depth: 2 });
  for (const [, , x1, y1] of fingers) g.set(x1, y1 - 2, 'p5');
  g.px([[14, 50], [50, 48], [22, 56], [44, 56]], 'p1');
  return finish(g, { shade: false });
}

function assombracao() {
  const g = new Grid();
  // ondas de grito
  for (const r of [26, 20]) g.ring(32, 32, r, 2, 'gh2');
  const F = new Grid();
  F.ellipse(32, 30, 12, 13, 'gh4');
  F.rect(20, 30, 25, 14, 'gh4');
  for (let x = 20; x <= 44; x += 6) F.ellipse(x + 2, 44, 3, 2, 'gh4');
  F.shade();
  g.blit(F);
  g.ellipse(27, 26, 2, 3, 'k'); g.ellipse(37, 26, 2, 3, 'k');
  g.ellipse(32, 36, 4, 5, 'k');
  return finish(g, { shade: false });
}

function maldicao() {
  const g = new Grid();
  // chamas roxas
  for (const [x, h] of [[18, 14], [26, 22], [34, 26], [42, 20], [48, 12]]) g.poly([[x - 6, 50], [x + 6, 50], [x, 50 - h - 20]], 'p3');
  // caveira
  const S = new Grid();
  S.ellipse(32, 30, 13, 12, 'g5');
  S.rect(24, 38, 17, 8, 'g5');
  S.shade();
  g.blit(S);
  g.ellipse(27, 30, 3, 3, 'p1'); g.ellipse(37, 30, 3, 3, 'p1');
  g.set(27, 30, 'p5'); g.set(37, 30, 'p5');
  g.px([[31, 36], [33, 36], [32, 37]], 'k2');
  for (let x = 26; x <= 38; x += 3) g.rect(x, 42, 1, 4, 'g3');
  return finish(g, { shade: false });
}

// ─── itens da loja ────────────────────────────────────────────
function flask(liquid, { big = false, cross = false } = {}) {
  const g = new Grid();
  const r = big ? 17 : 13, cy = big ? 38 : 40;
  const G = new Grid();
  G.rect(27, cy - r - 10, 10, 12, 'gh4');           // gargalo
  G.circle(32, cy, r, 'gh4');
  G.shade();
  g.blit(G);
  const L = new Grid();
  L.circle(32, cy, r - 2, liquid);
  L.erase((x, y) => y < cy - r / 3);
  L.shade();
  g.blit(L);
  g.rect(28, cy - r - 2, 8, 2, liquid);
  g.px([[25, cy - 6], [24, cy - 4], [26, cy - 8]], 'w');            // reflexo
  // rolha
  const K = new Grid();
  K.rect(26, cy - r - 15, 12, 6, 'm4');
  K.shade();
  g.blit(K);
  if (cross) { g.rect(30, cy - 2, 4, 12, 'w'); g.rect(26, cy + 1, 12, 4, 'w'); }
  // bolhas
  g.px([[35, cy + 2], [30, cy + 6], [38, cy - 1]], 'w@70');
  return finish(g, { shade: false });
}

function elixir() {
  const g = new Grid();
  const G = new Grid();
  G.poly([[26, 22], [38, 22], [44, 54], [20, 54]], 'gh4');
  G.rect(28, 12, 8, 10, 'gh4');
  G.shade();
  g.blit(G);
  const L = new Grid();
  L.poly([[24, 34], [40, 34], [43, 52], [21, 52]], 'o3');
  L.shade();
  g.blit(L);
  g.rect(27, 7, 10, 6, 'p3');
  g.px([[24, 26], [23, 30]], 'w');
  for (const [x, y] of [[48, 16], [14, 22], [50, 40]]) { g.set(x, y, 'y4'); g.set(x - 1, y, 'y3'); g.set(x + 1, y, 'y3'); g.set(x, y - 1, 'y3'); g.set(x, y + 1, 'y3'); }
  return finish(g, { shade: false });
}

function amuleto() {
  const g = new Grid();
  // corrente
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + i * 0.0875);
    g.ring(32 + Math.cos(a) * 20, 30 - Math.sin(a) * 22, 2, 1, 'y2');
  }
  const P = new Grid();
  P.poly([[32, 26], [46, 38], [32, 58], [18, 38]], 'y3');
  P.shade({ depth: 2 });
  g.blit(P);
  const J = new Grid();
  J.poly([[32, 31], [41, 38], [32, 51], [23, 38]], 'b4');
  J.shade();
  g.blit(J);
  g.px([[30, 35], [29, 36], [30, 37]], 'w');
  return finish(g, { shade: false });
}

function vela() {
  const g = new Grid();
  const C = new Grid();
  C.rect(25, 28, 14, 26, 'q3');
  C.ellipse(32, 28, 7, 2, 'q3');
  C.ellipse(28, 34, 2, 4, 'q3');  // cera escorrendo
  C.shade();
  g.blit(C);
  const P = new Grid();
  P.ellipse(32, 56, 14, 4, 'y2');
  P.shade();
  g.blit(P);
  g.rect(31, 22, 2, 5, 'k2');
  g.ellipse(32, 17, 4, 6, 'o3');
  g.ellipse(32, 18, 2, 4, 'y3');
  g.set(32, 19, 'w');
  return finish(g, { shade: false });
}

// ─── HUD ──────────────────────────────────────────────────────
function moeda() {
  const g = new Grid();
  const C = new Grid();
  C.circle(32, 32, 22, 'y3');
  C.shade({ depth: 3 });
  g.blit(C);
  g.ring(32, 32, 16, 1, 'y2');
  // caveirinha cunhada
  g.ellipse(32, 29, 7, 6, 'y2');
  g.rect(28, 33, 9, 5, 'y2');
  g.px([[29, 29], [30, 29], [34, 29], [35, 29]], 'y1');
  g.px([[30, 36], [32, 36], [34, 36]], 'y3');
  g.px([[20, 20], [21, 19], [19, 21]], 'y4');
  return finish(g, { shade: false });
}

function coracao(fill = 'r3') {
  const g = new Grid();
  g.circle(23, 24, 11, fill);
  g.circle(41, 24, 11, fill);
  g.poly([[12, 28], [52, 28], [32, 52]], fill);
  g.shade({ depth: 2 });
  g.px([[18, 18], [19, 17], [20, 17], [17, 19]], 'w');
  return finish(g, { shade: false });
}

function speaker(on) {
  const g = new Grid();
  g.rect(10, 24, 10, 16, 'g4');
  g.poly([[18, 24], [32, 12], [32, 52], [18, 40]], 'g4');
  g.shade();
  if (on) {
    // ondas sonoras: só a metade direita dos anéis
    const ring = new Grid();
    ring.ring(30, 32, 10, 3, 'w'); ring.ring(30, 32, 18, 3, 'w');
    ring.erase((x) => x < 37);
    g.blit(ring);
  } else {
    g.stroke(38, 22, 54, 42, 4, 'r3');
    g.stroke(54, 22, 38, 42, 4, 'r3');
  }
  return finish(g, { shade: false });
}

function cadeado() {
  const g = new Grid();
  g.ring(32, 24, 12, 4, 'g4');
  const B = new Grid();
  B.rect(16, 28, 32, 26, 'y3');
  B.shade({ depth: 2 });
  g.blit(B);
  g.circle(32, 38, 3, 'k2');
  g.rect(31, 40, 3, 7, 'k2');
  return finish(g, { shade: false });
}

function estrela(fill = 'y3') {
  const g = new Grid();
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26;
    pts.push([32 + Math.cos(a) * r, 34 + Math.sin(a) * r]);
  }
  g.poly(pts, fill);
  g.shade({ depth: 2 });
  if (fill === 'y3') g.px([[30, 16], [31, 15], [29, 18]], 'w');
  return finish(g, { shade: false });
}

function caveira() {
  const g = new Grid();
  const S = new Grid();
  S.ellipse(32, 28, 18, 17, 'g5');
  S.rect(21, 38, 23, 14, 'g5');
  S.shade({ depth: 2 });
  g.blit(S);
  g.ellipse(25, 29, 5, 5, 'k2'); g.ellipse(39, 29, 5, 5, 'k2');
  g.set(24, 28, 'r3'); g.set(38, 28, 'r3');
  g.poly([[32, 35], [29, 41], [35, 41]], 'k2');
  for (let x = 24; x <= 40; x += 4) g.rect(x, 46, 1, 6, 'g3');
  return finish(g, { shade: false });
}

function livro() {
  const g = new Grid();
  const B = new Grid();
  B.rect(12, 10, 38, 46, 'p3');
  B.shade({ depth: 2 });
  g.blit(B);
  g.rect(48, 12, 5, 43, 'q3');       // páginas
  for (let y = 14; y < 54; y += 3) g.rect(49, y, 4, 1, 'q2');
  g.rect(12, 10, 4, 46, 'p2');       // lombada
  g.frame(19, 16, 25, 34, 'y2');
  // olho no meio
  g.ellipse(31, 33, 8, 5, 'w');
  g.circle(31, 33, 3, 'r3');
  g.rect(31, 31, 1, 5, 'k');
  return finish(g, { shade: false });
}

function sacola() {
  const g = new Grid();
  const S = new Grid();
  S.ellipse(32, 40, 19, 16, 'm4');
  S.poly([[22, 26], [42, 26], [38, 16], [26, 16]], 'm4');
  S.shade({ depth: 2 });
  g.blit(S);
  g.rect(23, 24, 18, 3, 'm2');         // amarração
  g.ellipse(26, 13, 4, 3, 'm4'); g.ellipse(38, 13, 4, 3, 'm4');
  // cifrão
  stamp(g, 28, 33, [
    '..##..',
    '.####.',
    '##....',
    '.###..',
    '...##.',
    '####..',
    '..#...',
  ], { '#': 'y3' });
  return finish(g, { shade: false });
}

function espadas() {
  const g = new Grid();
  for (const flip of [false, true]) {
    const s = new Grid();
    bar(s, 12, 52, 50, 12, 6, 'g5');
    s.poly([[46, 10], [54, 8], [52, 16]], 'g5');
    s.shade();
    s.line(16, 46, 48, 13, 'w');
    bar(s, 14, 40, 24, 50, 4, 'y2');   // guarda
    bar(s, 8, 56, 16, 48, 4, 'm3');    // cabo
    g.blit(flip ? s.flipX() : s);
  }
  return finish(g, { shade: false });
}

function pausa() {
  const g = new Grid();
  g.rect(16, 12, 11, 40, 'w'); g.rect(37, 12, 11, 40, 'w');
  return finish(g);
}

function fechar() {
  const g = new Grid();
  g.stroke(16, 16, 48, 48, 9, 'r3');
  g.stroke(48, 16, 16, 48, 9, 'r3');
  return finish(g);
}

function seta(dir) {
  const g = new Grid();
  g.poly([[18, 10], [50, 32], [18, 54]], 'w');
  g.shade();
  g.outline('k');
  return dir === 'left' ? g.flipX() : g;
}

function engrenagem() {
  const g = new Grid();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    g.rect(Math.round(32 + Math.cos(a) * 20) - 4, Math.round(32 + Math.sin(a) * 20) - 4, 9, 9, 'g4');
  }
  g.circle(32, 32, 18, 'g4');
  g.shade({ depth: 2 });
  g.circle(32, 32, 7, null);
  g.erase((x, y) => Math.hypot(x - 32, y - 32) < 7);
  return finish(g, { shade: false });
}

function disquete() {
  const g = new Grid();
  g.poly([[10, 10], [46, 10], [54, 18], [54, 54], [10, 54]], 'b3');
  g.shade({ depth: 2 });
  g.rect(18, 10, 26, 16, 'g5');
  g.rect(34, 13, 6, 10, 'b2');
  g.rect(16, 34, 32, 20, 'w');
  g.rect(19, 39, 26, 1, 'g4'); g.rect(19, 44, 26, 1, 'g4'); g.rect(19, 49, 20, 1, 'g4');
  return finish(g, { shade: false });
}

function duelo() {
  const g = new Grid();
  // fantasminha à direita
  const G = new Grid();
  G.ellipse(44, 28, 12, 12, 'gh4'); G.rect(32, 28, 25, 16, 'gh4');
  for (let x = 33; x <= 56; x += 6) G.ellipse(x + 2, 44, 3, 2, 'gh4');
  G.shade();
  g.blit(G);
  g.circle(41, 27, 3, 'w'); g.circle(40, 27, 2, 'r3'); g.set(40, 27, 'k');
  // cabeça do caçador à esquerda
  const H = new Grid();
  H.ellipse(18, 22, 12, 10, 'k2');
  H.ellipse(22, 32, 10, 10, 's3');
  H.shade();
  g.blit(H);
  g.rect(24, 30, 2, 3, 'w'); g.set(25, 31, 'k');
  g.rect(8, 44, 26, 12, 'p3');
  // raio "VS"
  g.poly([[30, 12], [36, 12], [32, 22], [37, 22], [27, 38], [30, 26], [26, 26]], 'y3');
  return finish(g, { shade: false });
}

function pergaminho() {
  const g = new Grid();
  const P = new Grid();
  P.rect(14, 14, 36, 36, 'm6');
  P.shade();
  g.blit(P);
  g.ellipse(14, 16, 5, 5, 'm5'); g.rect(9, 16, 10, 36, 'm5');
  g.ellipse(50, 48, 5, 5, 'm5'); g.rect(45, 12, 10, 36, 'm5');
  for (let y = 22; y < 44; y += 5) g.rect(21, y, 20, 1, 'm3');
  return finish(g);
}

function trofeu() {
  const g = new Grid();
  const T = new Grid();
  T.poly([[16, 10], [48, 10], [44, 30], [20, 30]], 'y3');
  T.ellipse(32, 30, 12, 6, 'y3');
  T.rect(29, 34, 6, 10, 'y3');
  T.rect(20, 44, 24, 5, 'y3');
  T.rect(16, 49, 32, 6, 'm3');
  T.shade({ depth: 2 });
  g.blit(T);
  g.ring(14, 20, 6, 2, 'y2').ring(50, 20, 6, 2, 'y2');
  g.blit(T);
  g.px([[22, 14], [22, 15], [22, 16]], 'w');
  return finish(g, { shade: false });
}

function check() {
  const g = new Grid();
  g.stroke(12, 34, 26, 48, 9, 'v4');
  g.stroke(26, 48, 52, 16, 9, 'v4');
  return finish(g);
}

function alvo() {
  const g = new Grid();
  g.ring(32, 32, 20, 3, 'r3');
  g.rect(30, 4, 4, 16, 'r3'); g.rect(30, 44, 4, 16, 'r3');
  g.rect(4, 30, 16, 4, 'r3'); g.rect(44, 30, 16, 4, 'r3');
  g.circle(32, 32, 3, 'r4');
  return finish(g, { shade: false });
}

function interrogacao() {
  const small = stamp(new Grid(16, 16), 0, 0, [
    '..######..',
    '.########.',
    '###....###',
    '##......##',
    '........##',
    '.......###',
    '.....####.',
    '....###...',
    '....##....',
    '..........',
    '....##....',
    '....##....',
  ], { '#': 'g5' });
  // ampliado 4x para preencher o ícone
  const g = new Grid();
  small.forEach((x, y, c) => g.rect(12 + x * 4, 8 + y * 4, 4, 4, c));
  return finish(g);
}

function jogar() {
  const g = new Grid();
  g.poly([[18, 10], [52, 32], [18, 54]], 'v4');
  return finish(g);
}

function casa() {
  const g = new Grid();
  g.poly([[8, 32], [32, 10], [56, 32]], 'r2');
  g.rect(14, 30, 36, 24, 'm5');
  g.shade();
  g.rect(27, 38, 10, 16, 'm2');
  g.rect(18, 36, 6, 6, 'y3');
  return finish(g, { shade: false });
}

function repetir() {
  const g = new Grid();
  g.ring(32, 32, 18, 6, 'w');
  g.erase((x, y) => x > 34 && y < 30);
  g.poly([[36, 6], [52, 16], [36, 26]], 'w');
  return finish(g);
}

/**
 * Balão de pensamento das pistas, desenhado em escala 2: a nuvem (centro em 34,24)
 * cabe um ícone de golpe em escala 1 por cima. A cauda aponta para o monstro.
 */
function pista() {
  const g = new Grid();
  for (const [x, y, r] of [[24, 20, 13], [38, 16, 13], [48, 26, 12], [36, 34, 13], [22, 32, 12]]) g.circle(x, y, r, 'q4');
  g.circle(12, 50, 4, 'q4');
  g.circle(6, 58, 3, 'q4');
  g.shade({ light: 0, dark: 1 });
  return finish(g, { shade: false });
}

/** Martelo da oficina. */
function martelo() {
  const g = new Grid();
  bar(g, 14, 54, 38, 26, 7, 'm4');
  const H = new Grid();
  H.poly([[26, 14], [44, 4], [58, 24], [40, 34]], 't4');
  H.shade({ depth: 2 });
  H.line(30, 16, 44, 8, 't5');
  g.blit(H);
  g.rect(12, 50, 6, 6, 'm2');
  return finish(g, { shade: false });
}

/** Bolsa de itens da fase (limite de usos). */
function bolsa() {
  const g = new Grid();
  g.ellipse(32, 38, 20, 18, 'm4');
  g.poly([[20, 22], [44, 22], [40, 14], [24, 14]], 'm4');
  g.shade({ depth: 2 });
  g.rect(18, 22, 28, 4, 'm2');
  g.rect(29, 26, 6, 8, 'y3');
  g.set(31, 28, 'y4');
  return finish(g, { shade: false });
}

// ─── perks do multiplayer ─────────────────────────────────────
function escudo() {
  const g = new Grid();
  g.poly([[12, 12], [52, 12], [50, 36], [32, 56], [14, 36]], 'b3');
  g.shade({ depth: 2 });
  g.poly([[32, 12], [52, 12], [50, 36], [32, 56]], 'b2');
  g.rect(29, 18, 6, 26, 'y3'); g.rect(21, 24, 22, 6, 'y3');
  return finish(g, { shade: false });
}

function golpeDuplo() {
  const g = new Grid();
  for (const [ox, oy] of [[-8, 6], [8, -6]]) {
    const f = new Grid();
    f.rect(20 + ox, 22 + oy, 22, 18, 's4');
    for (let i = 0; i < 4; i++) f.rect(20 + ox + i * 6, 18 + oy, 5, 6, 's4');
    f.rect(16 + ox, 28 + oy, 6, 10, 's4');
    f.shade();
    for (let i = 1; i < 4; i++) f.rect(19 + ox + i * 6, 19 + oy, 1, 5, 's2');
    f.outline('k');
    g.blit(f);
  }
  g.px([[54, 10], [56, 8], [8, 52], [6, 54]], 'y3');
  return g;
}

function empateForte() {
  const g = new Grid();
  g.rect(31, 10, 3, 40, 'y2');
  g.rect(10, 14, 45, 3, 'y2');
  g.rect(22, 50, 21, 5, 'y2');
  for (const x of [16, 48]) {
    g.line(x - 6, 30, x, 16, 'g4').line(x + 6, 30, x, 16, 'g4');
    g.ellipse(x, 32, 9, 3, 'y3');
  }
  return finish(g);
}

export function visao() {
  const g = new Grid();
  g.poly([[4, 32], [20, 18], [44, 18], [60, 32], [44, 46], [20, 46]], 'w');
  g.shade();
  g.circle(32, 32, 11, 'p3');
  g.circle(32, 32, 6, 'k');
  g.px([[28, 28], [29, 27]], 'w');
  return finish(g, { shade: false });
}

function resistencia() {
  const g = new Grid();
  // torre de pedra
  g.rect(16, 18, 32, 38, 't4');
  for (let i = 0; i < 4; i++) g.rect(14 + i * 10, 10, 7, 8, 't4');
  g.shade({ depth: 2 });
  for (let y = 24; y < 56; y += 6) g.rect(16, y, 32, 1, 't2');
  for (let y = 24; y < 56; y += 12) { g.rect(28, y, 1, 6, 't2'); g.rect(38, y + 6, 1, 6, 't2'); }
  g.rect(27, 42, 10, 14, 'k2');
  return finish(g, { shade: false });
}

function sorte() {
  const g = new Grid();
  for (const [x, y] of [[24, 22], [40, 22], [24, 38], [40, 38]]) g.circle(x, y, 10, 'v4');
  g.stroke(32, 34, 38, 58, 3, 'v3');
  g.shade({ depth: 2 });
  g.px([[20, 18], [36, 18]], 'v6');
  return finish(g, { shade: false });
}


// ─── perks novos (cartas) ─────────────────────────────────────
function cura() {
  const g = coracao('r3');
  g.rect(28, 22, 8, 22, 'w'); g.rect(21, 29, 22, 8, 'w');
  g.rect(29, 23, 6, 20, 'v4'); g.rect(22, 30, 20, 6, 'v4');
  return g;
}

function espinhos() {
  const g = new Grid();
  // bola de espinhos: espinhos brancos em volta de um núcleo verde
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const c = [32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14];
    const tip = [32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28];
    const n = [-Math.sin(a) * 5, Math.cos(a) * 5];
    g.poly([[c[0] + n[0], c[1] + n[1]], [c[0] - n[0], c[1] - n[1]], tip], 'g5');
  }
  g.shade();
  const B = new Grid();
  B.circle(32, 32, 15, 'v3');
  B.shade({ depth: 2 });
  g.blit(B);
  g.px([[26, 26], [27, 25], [28, 25]], 'v6');
  g.rect(27, 33, 4, 2, 'k'); g.rect(34, 33, 4, 2, 'k');   // carinha brava
  g.line(26, 31, 30, 32, 'k').line(39, 31, 35, 32, 'k');
  return finish(g, { shade: false });
}

function vampirismo() {
  const g = new Grid();
  const M = new Grid();
  M.ellipse(32, 24, 20, 12, 'r1');
  M.erase((x, y) => y < 22);
  g.blit(M);
  g.rect(12, 20, 40, 4, 'q3');
  g.poly([[18, 22], [24, 22], [21, 36]], 'w');
  g.poly([[40, 22], [46, 22], [43, 36]], 'w');
  g.ellipse(43, 46, 4, 6, 'r3');
  g.poly([[39, 44], [47, 44], [43, 36]], 'r3');
  g.ellipse(21, 46, 3, 4, 'r3');
  g.shade();
  g.set(42, 44, 'r5');
  return finish(g, { shade: false });
}

function furia() {
  const g = new Grid();
  for (const [x, h] of [[18, 22], [26, 30], [34, 34], [42, 26], [48, 18]]) g.poly([[x - 7, 40], [x + 7, 40], [x, 40 - h]], 'o3');
  for (const [x, h] of [[24, 18], [32, 24], [40, 18]]) g.poly([[x - 5, 40], [x + 5, 40], [x, 40 - h]], 'y3');
  const F = new Grid();
  F.rect(20, 32, 24, 20, 's4');
  for (let i = 0; i < 4; i++) F.rect(20 + i * 6, 27, 5, 7, 's4');
  F.shade();
  for (let i = 1; i < 4; i++) F.rect(19 + i * 6, 28, 1, 6, 's2');
  g.blit(F);
  return finish(g, { shade: false });
}

function escudoSagrado() {
  const g = new Grid();
  g.ring(32, 10, 12, 2, 'y4');
  g.poly([[12, 16], [52, 16], [50, 38], [32, 58], [14, 38]], 'y3');
  g.shade({ depth: 2 });
  g.poly([[18, 20], [46, 20], [44, 37], [32, 51], [20, 37]], 'w');
  g.rect(30, 24, 4, 20, 'y2'); g.rect(24, 29, 16, 4, 'y2');
  for (const [x, y] of [[6, 30], [58, 30], [8, 46], [56, 46]]) g.px([[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], 'y4');
  return finish(g, { shade: false });
}

function juizo() {
  const g = new Grid();
  for (const [x, y, r] of [[20, 18, 9], [32, 14, 11], [44, 18, 9], [32, 22, 10]]) g.circle(x, y, r, 'g2');
  g.shade({ light: 1, dark: 0 });
  g.poly([[34, 26], [42, 26], [34, 40], [40, 40], [24, 62], [28, 44], [22, 44]], 'y3');
  g.poly([[35, 28], [39, 28], [32, 40], [36, 40], [27, 54]], 'y4');
  return finish(g, { shade: false });
}

// ─── ligas do ranking ─────────────────────────────────────────
function liga(fill, extra) {
  const g = new Grid();
  g.poly([[14, 8], [50, 8], [50, 34], [32, 58], [14, 34]], fill);
  g.shade({ depth: 2 });
  g.poly([[20, 14], [44, 14], [44, 32], [32, 48], [20, 32]], 'k2');
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 10;
    pts.push([32 + Math.cos(a) * r, 29 + Math.sin(a) * r]);
  }
  g.poly(pts, fill);
  if (extra === 'coroa') {
    g.poly([[18, 8], [22, 0], [27, 6], [32, 0], [37, 6], [42, 0], [46, 8]], 'y3');
    g.set(32, 2, 'r3');
  }
  return finish(g, { shade: false });
}

export function iconSheets() {
  return {
    estaca: estaca(), aspirador: aspirador(), cruz: cruz(),
    possessao: possessao(), assombracao: assombracao(), maldicao: maldicao(),
    pocao: flask('r3'), pocao_grande: flask('r3', { big: true }), agua_benta: flask('b4', { cross: true }),
    elixir: elixir(), amuleto: amuleto(), vela: vela(),
    moeda: moeda(), coracao: coracao(), coracao_vazio: coracao('g2'),
    som_on: speaker(true), som_off: speaker(false),
    cadeado: cadeado(), estrela: estrela(), estrela_vazia: estrela('g2'),
    caveira: caveira(), livro: livro(), sacola: sacola(), espadas: espadas(),
    pausa: pausa(), fechar: fechar(), seta_esq: seta('left'), seta_dir: seta('right'),
    engrenagem: engrenagem(), disquete: disquete(), duelo: duelo(), pergaminho: pergaminho(),
    trofeu: trofeu(), check: check(), alvo: alvo(), interrogacao: interrogacao(),
    jogar: jogar(), casa: casa(), repetir: repetir(), pista: pista(), bolsa: bolsa(), martelo: martelo(),
    perk_escudo: escudo(), perk_golpe_duplo: golpeDuplo(), perk_empate_forte: empateForte(),
    perk_visao: visao(), perk_resistencia: resistencia(), perk_sorte: sorte(),
    perk_cura: cura(), perk_espinhos: espinhos(), perk_vampirismo: vampirismo(),
    perk_furia: furia(), perk_escudo_sagrado: escudoSagrado(), perk_juizo: juizo(),
    liga_bronze: liga('o2'), liga_prata: liga('t4'), liga_ouro: liga('y3'), liga_platina: liga('c4'), liga_lenda: liga('p4', 'coroa'),
  };
}
