// Inimigos do Ato II (O Reino das Sombras) no estilo de volume. Mesmo padrão de enemies.mjs:
// olham para a esquerda e têm idle (4 frames), attack (4) e hurt (2).
import { Model, mat } from '../lib/volume.mjs';
import { folhas } from './enemies.mjs';
import {
  OURO, PRATA, METAL, FERRO, MADEIRA, MADEIRA_CLARA, OSSO, BRANCO, VIDRO, ECTO, VERMELHO, AMARELO, LARANJA,
  VERDE, VERDE_ESCURO, AZUL, ROXO, LILAS, CINZA, CINZA_ESCURO, SOMBRA,
} from './materiais.mjs';

const CALCA = mat('m2', { line: 'm1' });

// ═══════════════════════════════════════════════════════════════
//  ZUMBI — pele verde, camisa rasgada, braços esticados
// ═══════════════════════════════════════════════════════════════
function zumbi({ dx = 0, dy = 0, lean = 0, reach = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx + lean, Y = dy;
  m.part(VERDE_ESCURO, 'cylinder', (p) => p.stroke(X - 3, 15 + Y, X - 11 - reach * 3, 16 + Y - reach, 3, 'x'));   // braço de trás
  m.part(CALCA, 'cylinder', (p) => { p.rect(X - 4, 21, 3, 7, 'x'); p.rect(X + 1, 21, 3, 7, 'x'); });
  m.part(CINZA_ESCURO, 'hcylinder', (p) => { p.rect(X - 5, 27, 4, 2, 'x'); p.rect(X + 1, 27, 4, 2, 'x'); });
  m.part(AZUL, 'cylinder', (p) => p.poly([[X - 5, 13 + Y], [X + 5, 13 + Y], [X + 5, 22], [X + 3, 23], [X - 1, 22], [X - 5, 23]], 'x'));
  m.part(VERDE, 'cylinder', (p) => p.stroke(X - 4, 15 + Y, X - 13 - reach * 3, 15 + Y - reach, 3, 'x'));          // braço da frente
  m.part(VERDE, 'sphere', (p) => p.ellipse(X - 1, 8 + Y, 5, 5, 'x'));
  m.part(mat('k2', { line: 'k' }), 'hcylinder', (p) => p.rect(X - 5, 2 + Y, 9, 3, 'x'));
  m.paint((g) => {
    g.ellipse(X + 1, 18 + Y, 1, 1, 'v3');      // pele no rasgo
    g.line(X - 2, 15 + Y, X, 19 + Y, 'b2');
    if (mood === 'hurt') { g.line(X - 4, 7 + Y, X - 2, 9 + Y, 'k').line(X - 4, 9 + Y, X - 2, 7 + Y, 'k'); }
    else { g.rect(X - 4, 7 + Y, 2, 2, 'y4'); g.set(X - 4, 8 + Y, 'r3'); g.set(X, 7 + Y, 'k'); }
    g.rect(X - 4, 11 + Y, 4, mood === 'attack' ? 2 : 1, 'k2');
    g.px([[X + 1, 5 + Y], [X + 2, 6 + Y]], 'v2');  // pontos na testa
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  CORVO AGOURENTO — penas negras, bico amarelo, olho vermelho
// ═══════════════════════════════════════════════════════════════
const PENAS = mat('g1', { line: 'k' });
function corvo({ dx = 0, dy = 0, wing = 0, beak = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = 16 + dy;
  m.part(PENAS, 'flat', (p) => p.poly([[X + 3, Y - 1], [X + 9, Y - 2], [X + 12, Y - 9 - wing * 4], [X + 4, Y - 6 - wing * 3]], 'x'));  // asa de trás
  m.part(PENAS, 'sphere', (p) => {
    p.ellipse(X + 2, Y + 3, 8, 5, 'x');
    p.poly([[X + 8, Y + 1], [X + 16, Y + 3], [X + 15, Y + 6], [X + 8, Y + 6]], 'x');   // cauda
    p.circle(X - 5, Y - 1, 4, 'x');                                                    // cabeça
  });
  m.part(AMARELO, 'sphere', (p) => {
    p.poly([[X - 8, Y - 2], [X - 14, Y - 1 - beak], [X - 8, Y]], 'x');
    if (beak) p.poly([[X - 8, Y + 1], [X - 13, Y + 2 + beak], [X - 8, Y + 2]], 'x');
  });
  m.part(mat('g2', { line: 'k' }), 'flat', (p) => p.poly([[X - 2, Y + 1], [X + 7, Y], [X + 9, Y - 6 - wing * 5], [X + 1, Y - 4 - wing * 3]], 'x'));  // asa da frente
  m.part(LARANJA, 'cylinder', (p) => { p.rect(X - 1, Y + 7, 1, 3, 'x'); p.rect(X + 3, Y + 7, 1, 3, 'x'); });
  m.paint((g) => {
    if (mood === 'hurt') g.rect(X - 7, Y - 2, 2, 1, 'r1');
    else { g.rect(X - 7, Y - 3, 2, 2, 'r3'); g.set(X - 7, Y - 3, 'r5'); }
    g.set(X - 4, Y - 3, 'b3'); g.set(X + 4, Y + 1, 'b2');   // brilho azulado nas penas
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  ESQUELETO — caveira grande, costelas e um osso na mão
// ═══════════════════════════════════════════════════════════════
function esqueleto({ dx = 0, dy = 0, arm = 'down', mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  m.part(OSSO, 'cylinder', (p) => { p.rect(X - 4, 20, 2, 9, 'x'); p.rect(X + 2, 20, 2, 9, 'x'); p.rect(X - 6, 27, 4, 2, 'x'); p.rect(X + 2, 27, 4, 2, 'x'); });
  m.part(OSSO, 'cylinder', (p) => p.stroke(X + 4, 13 + Y, X + 6, 21 + Y, 2, 'x'), { light: -1 });  // braço de trás
  m.part(OSSO, 'hcylinder', (p) => { p.rect(X - 4, 12 + Y, 9, 8, 'x'); p.rect(X - 4, 19, 9, 2, 'x'); });
  m.cut((p) => { for (const y of [13, 15, 17]) { p.rect(X - 3, y + Y, 3, 1, 'x'); p.rect(X + 1, y + Y, 3, 1, 'x'); } });
  // braço da frente (com o osso)
  const hand = { down: [X - 6, 21 + Y], up: [X - 7, 5 + Y], swing: [X - 13, 13 + Y] }[arm];
  m.part(OSSO, 'cylinder', (p) => p.stroke(X - 4, 13 + Y, hand[0], hand[1], 2, 'x'));
  if (arm !== 'down') m.part(BRANCO, 'cylinder', (p) => {
    const [hx, hy] = hand;
    if (arm === 'up') { p.rect(hx - 1, hy - 7, 2, 8, 'x'); p.circle(hx - 1, hy - 8, 1.5, 'x'); p.circle(hx + 1, hy - 8, 1.5, 'x'); }
    else { p.rect(hx - 7, hy - 1, 8, 2, 'x'); p.circle(hx - 8, hy - 1, 1.5, 'x'); p.circle(hx - 8, hy + 1, 1.5, 'x'); }
  });
  m.part(OSSO, 'sphere', (p) => { p.ellipse(X - 1, 6 + Y, 6, 6, 'x'); p.rect(X - 4, 9 + Y, 6, 3, 'x'); });
  m.paint((g) => {
    if (mood === 'hurt') { g.line(X - 5, 4 + Y, X - 3, 6 + Y, 'k').line(X - 5, 6 + Y, X - 3, 4 + Y, 'k'); g.line(X - 1, 4 + Y, X + 1, 6 + Y, 'k').line(X - 1, 6 + Y, X + 1, 4 + Y, 'k'); }
    else { g.rect(X - 5, 4 + Y, 3, 3, 'k'); g.rect(X - 1, 4 + Y, 3, 3, 'k'); g.set(X - 4, 5 + Y, 'r3'); g.set(X, 5 + Y, 'r3'); }
    g.set(X - 2, 8 + Y, 'k2');
    for (const x of [X - 4, X - 2, X]) g.set(x, 11 + Y, 'q1');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  MÚMIA — faixas, olhos amarelos e uma ponta solta
// ═══════════════════════════════════════════════════════════════
const FAIXA = { tones: ['m4', 'm5', 'm6', 'q3', 'q4'], line: 'm3' };
function mumia({ dx = 0, dy = 0, reach = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  m.part(FAIXA, 'flat', (p) => p.poly([[X + 4, 16 + Y], [X + 6, 15 + Y], [X + 11, 26], [X + 9, 27]], 'x'), { light: -1 });  // ponta solta
  m.part(FAIXA, 'cylinder', (p) => { p.rect(X - 4, 20, 3, 9, 'x'); p.rect(X + 1, 20, 3, 9, 'x'); });
  m.part(FAIXA, 'cylinder', (p) => p.rect(X - 5, 12 + Y, 10, 10, 'x'));
  m.part(FAIXA, 'cylinder', (p) => p.stroke(X - 4, 14 + Y, X - 13 - reach * 3, 14 + Y - reach, 3, 'x'));
  m.part(FAIXA, 'sphere', (p) => p.ellipse(X - 1, 7 + Y, 5, 5, 'x'));
  m.paint((g) => {
    for (const y of [4, 7, 10]) g.line(X - 5, y + Y, X + 3, y + Y + 1, 'm4');
    for (const y of [14, 17, 20]) g.line(X - 5, y + Y, X + 4, y + Y - 1, 'm4');
    for (const y of [22, 25]) { g.line(X - 4, y, X - 2, y + 1, 'm4'); g.line(X + 1, y, X + 3, y + 1, 'm4'); }
    g.rect(X - 5, 6 + Y, 7, 2, 'k2');
    if (mood === 'hurt') g.rect(X - 4, 7 + Y, 5, 1, 'y2');
    else { g.rect(X - 4, 6 + Y, 2, 2, 'y3'); g.rect(X - 1, 6 + Y, 2, 2, 'y3'); g.set(X - 4, 6 + Y, 'y4'); }
    if (mood === 'attack') g.rect(X - 4, 10 + Y, 3, 2, 'k2');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  LOBISOMEM — curvado, focinho para a esquerda e garras
// ═══════════════════════════════════════════════════════════════
const PELO = mat('m3', { line: 'm1' });
const BARRIGA = mat('m5', { line: 'm2' });
function lobisomem({ dx = 0, dy = 0, reach = 0, jaw = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  m.part(PELO, 'cylinder', (p) => { p.rect(X - 3, 21, 4, 8, 'x'); p.rect(X + 3, 21, 4, 8, 'x'); });
  m.part(PELO, 'sphere', (p) => { p.ellipse(X + 1, 16 + Y, 8, 8, 'x'); p.poly([[X + 7, 12 + Y], [X + 12, 18 + Y], [X + 8, 20 + Y]], 'x'); });
  m.part(BARRIGA, 'sphere', (p) => p.ellipse(X - 1, 18 + Y, 4, 5, 'x'), { edge: false });
  // cabeça com focinho e orelhas pontudas
  const hx = X - 4 - reach, hy = 8 + Y;
  m.part(PELO, 'sphere', (p) => {
    p.ellipse(hx + 1, hy, 5, 5, 'x');
    p.poly([[hx - 3, hy - 1], [hx - 10, hy + 1], [hx - 9, hy + 4], [hx - 2, hy + 4]], 'x');
    p.poly([[hx + 1, hy - 3], [hx + 3, hy - 9], [hx + 5, hy - 2]], 'x');
  });
  if (jaw) m.part(PELO, 'sphere', (p) => p.poly([[hx - 2, hy + 4], [hx - 9, hy + 5 + jaw], [hx - 3, hy + 6]], 'x'));
  // braço com garras
  m.part(PELO, 'cylinder', (p) => p.stroke(X - 3, 14 + Y, X - 9 - reach * 3, 17 + Y - reach * 2, 3, 'x'));
  m.paint((g) => {
    const cx = X - 11 - reach * 3, cy = 16 + Y - reach * 2;
    g.px([[cx, cy], [cx - 1, cy + 1], [cx, cy + 2], [cx - 1, cy + 3]], 'w');   // garras
    if (mood === 'hurt') g.rect(hx - 3, hy - 1, 3, 1, 'k');
    else { g.rect(hx - 3, hy - 1, 2, 2, 'r3'); g.set(hx - 3, hy - 1, 'r5'); }
    g.set(hx - 10, hy + 1, 'k');                 // nariz
    g.set(hx - 6, hy + 4, 'w'); g.set(hx - 4, hy + 4, 'w');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  BANSHEE — espírito de mulher com cabelos roxos ao vento
// ═══════════════════════════════════════════════════════════════
const ESPECTRO = mat('gh4', { line: 'gh1' });
function banshee({ dx = 0, dy = 0, hair = 0, scream = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 14 + dx, Y = 3 + dy;
  m.part(ROXO, 'sphere', (p) => {
    p.ellipse(X + 3, Y + 7, 6, 6, 'x');
    p.poly([[X + 4, Y + 2], [X + 17, Y + 9 + hair], [X + 15, Y + 13 + hair], [X + 18, Y + 17 + hair], [X + 7, Y + 14]], 'x');
  });
  m.part(ESPECTRO, 'cylinder', (p) => p.poly([[X - 3, Y + 11], [X + 5, Y + 11], [X + 10, Y + 22], [X + 14, Y + 27], [X + 3, Y + 25], [X - 2, Y + 22]], 'x'));
  m.part(ESPECTRO, 'cylinder', (p) => p.stroke(X - 2, Y + 13, X - 7 - scream * 2, Y + 17 - scream * 3, 2, 'x'));
  m.part(ESPECTRO, 'sphere', (p) => p.ellipse(X, Y + 7, 4, 5, 'x'));
  m.part(ROXO, 'sphere', (p) => p.ellipse(X + 2, Y + 2, 4, 2, 'x'), { edge: false });
  m.paint((g) => {
    if (mood === 'hurt') { g.line(X - 3, Y + 6, X - 1, Y + 7, 'p1'); g.line(X + 1, Y + 7, X + 3, Y + 6, 'p1'); }
    else { g.rect(X - 3, Y + 6, 2, 2, 'k'); g.rect(X + 1, Y + 6, 2, 2, 'k'); }
    g.ellipse(X - 1, Y + 10, 1, scream ? 2 : 1, 'k');
  });
  if (scream) m.overlay((g) => { for (const r of [3, 6]) { g.ring(X - 4, Y + 10, r + scream, 1, 'gh3'); } g.erase((x) => x > X - 3); });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  COVEIRO — cartola, barba, sobretudo, pá e lampião (chefe)
// ═══════════════════════════════════════════════════════════════
const CASACO = mat('g2', { line: 'k' });
function coveiro({ dx = 0, dy = 0, shovel = 'rest', mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  // lampião na mão de trás
  m.part(FERRO, 'cylinder', (p) => p.rect(X + 8, 18 + Y, 4, 6, 'x'));
  // pá
  const blade = { rest: [[X - 9, 29], [X - 9, 10 + Y]], up: [[X - 4, 2 + Y], [X - 2, 20 + Y]], swing: [[X - 15, 22 + Y], [X - 3, 15 + Y]] }[shovel];
  m.part(MADEIRA, 'cylinder', (p) => p.stroke(blade[0][0], blade[0][1], blade[1][0], blade[1][1], 2, 'x'));
  m.part(METAL, 'sphere', (p) => p.ellipse(blade[0][0], blade[0][1] - (shovel === 'rest' ? 1 : 0), 2, 3, 'x'));
  // sobretudo
  m.part(CASACO, 'cylinder', (p) => p.poly([[X - 5, 12 + Y], [X + 6, 12 + Y], [X + 9, 29], [X - 7, 29]], 'x'));
  m.part(CASACO, 'cylinder', (p) => p.stroke(X - 4, 14 + Y, blade[1][0], blade[1][1] + 2, 3, 'x'), { light: 1 });
  // rosto, barba e cartola
  m.part(mat('s4', { line: 's1' }), 'sphere', (p) => p.ellipse(X - 1, 8 + Y, 4, 4, 'x'));
  m.part(BRANCO, 'sphere', (p) => p.poly([[X - 5, 9 + Y], [X + 2, 9 + Y], [X, 16 + Y], [X - 3, 15 + Y]], 'x'));
  m.part(mat('m2', { line: 'm1' }), 'cylinder', (p) => { p.rect(X - 4, 0 + Y, 8, 6, 'x'); p.rect(X - 7, 5 + Y, 13, 2, 'x'); });
  m.paint((g) => {
    for (const y of [15, 19, 23]) g.set(X, y + Y, 'y3');                    // botões
    g.rect(X - 4, 4 + Y, 8, 1, 'r2');                                          // fita da cartola
    g.rect(X + 9, 20 + Y, 2, 3, 'y4'); g.set(X + 9, 20 + Y, 'w');               // luz do lampião
    if (mood === 'hurt') g.rect(X - 4, 8 + Y, 3, 1, 'k');
    else { g.rect(X - 4, 7 + Y, 2, 2, 'k'); g.set(X - 1, 7 + Y, 'k'); }
    g.line(X - 5, 6 + Y, X - 2, 6 + Y, 'g5');                                  // sobrancelha
  });
  m.backdrop((g) => g.circle(X + 10, 21 + Y, 4, 'y4@35'));
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  RELOJOEIRO — relógio de pêndulo vivo, com engrenagem e chave (chefe)
// ═══════════════════════════════════════════════════════════════
function relojoeiro({ dx = 0, dy = 0, tilt = 0, swing = 0, hands = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 15 + dx, Y = dy;
  // engrenagem atrás, à direita
  m.part(LARANJA, 'sphere', (p) => {
    p.circle(X + 9, 15 + Y, 4, 'x');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + hands * 0.4; p.rect(Math.round(X + 9 + Math.cos(a) * 5) - 1, Math.round(15 + Y + Math.sin(a) * 5) - 1, 2, 2, 'x'); }
  });
  m.cut((p) => p.circle(X + 9, 15 + Y, 1, 'x'));
  // caixa do relógio
  m.part(MADEIRA, 'cylinder', (p) => p.poly([[X - 6 + tilt, 10 + Y], [X + 6 + tilt, 10 + Y], [X + 6, 29], [X - 6, 29]], 'x'));
  m.part(OURO, 'hcylinder', (p) => { p.rect(X - 7, 27, 15, 2, 'x'); p.rect(X - 7 + tilt, 9 + Y, 15, 2, 'x'); });
  // janela do pêndulo
  m.part(mat('m1', { line: 'k' }), 'flat', (p) => p.rect(X - 3 + tilt, 14 + Y, 7, 11, 'x'), { edge: false });
  m.part(OURO, 'sphere', (p) => { p.line(X + tilt, 14 + Y, X + tilt + swing * 2, 21 + Y, 'x'); p.circle(X + tilt + swing * 2, 22 + Y, 2, 'x'); }, { edge: false });
  // mostrador
  m.part(OURO, 'sphere', (p) => p.circle(X + tilt, 5 + Y, 6, 'x'));
  m.part(BRANCO, 'sphere', (p) => p.circle(X + tilt, 5 + Y, 4, 'x'), { edge: false, light: 1 });
  // braço com a chave de dar corda
  m.part(METAL, 'cylinder', (p) => p.stroke(X - 6, 18 + Y, X - 10 - swing, 15 + Y - Math.abs(swing), 2, 'x'));
  m.paint((g) => {
    const cx = X + tilt, cy = 5 + Y;
    const a = hands * Math.PI / 3;
    g.line(cx, cy, Math.round(cx + Math.cos(a - Math.PI / 2) * 3), Math.round(cy + Math.sin(a - Math.PI / 2) * 3), mood === 'hurt' ? 'r1' : 'k');
    g.line(cx, cy, Math.round(cx + Math.cos(a * 2) * 2), Math.round(cy + Math.sin(a * 2) * 2), 'r3');
    for (const [ox, oy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) g.set(cx + ox, cy + oy, 'g3');
  });
  m.overlay((g) => { const kx = X - 11 - swing, ky = 14 + Y - Math.abs(swing); g.rect(kx - 1, ky - 1, 3, 2, 't5'); g.set(kx, ky - 2, 't5'); });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  MORGANA — a Rainha Banshee: coroa, vestido roxo, magia na mão (chefe)
// ═══════════════════════════════════════════════════════════════
const VESTIDO = mat('p3', { line: 'p1' });
function morgana({ dx = 0, dy = 0, hair = 0, cast = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 14 + dx, Y = 2 + dy;
  // cabelo branco ao vento
  m.part(BRANCO, 'sphere', (p) => {
    p.ellipse(X + 2, Y + 8, 6, 6, 'x');
    p.poly([[X + 4, Y + 3], [X + 16, Y + 10 + hair], [X + 13, Y + 14 + hair], [X + 17, Y + 20 + hair], [X + 6, Y + 18]], 'x');
  });
  // vestido que some numa cauda
  m.part(VESTIDO, 'cylinder', (p) => p.poly([[X - 3, Y + 12], [X + 5, Y + 12], [X + 9, Y + 22], [X + 13, Y + 29], [X + 2, Y + 27], [X - 5, Y + 24]], 'x'));
  m.part(LILAS, 'cylinder', (p) => p.poly([[X - 1, Y + 14], [X + 3, Y + 14], [X + 4, Y + 24], [X, Y + 24]], 'x'), { edge: false });
  // braço lançando magia
  m.part(ESPECTRO, 'cylinder', (p) => p.stroke(X - 2, Y + 14, X - 7 - cast * 2, Y + 17 - cast * 3, 2, 'x'));
  // rosto e coroa
  m.part(ESPECTRO, 'sphere', (p) => p.ellipse(X, Y + 8, 4, 5, 'x'));
  m.part(OURO, 'cylinder', (p) => p.poly([[X - 4, Y + 4], [X + 4, Y + 4], [X + 4, Y - 1], [X + 2, Y + 1], [X, Y - 2], [X - 2, Y + 1], [X - 4, Y - 1]], 'x'));
  m.paint((g) => {
    g.set(X, Y + 2, 'r3');
    if (mood === 'hurt') { g.line(X - 3, Y + 7, X - 1, Y + 8, 'p1'); g.line(X + 1, Y + 8, X + 3, Y + 7, 'p1'); }
    else { g.rect(X - 3, Y + 7, 2, 2, 'p1'); g.rect(X + 1, Y + 7, 2, 2, 'p1'); g.set(X - 3, Y + 7, 'p5'); }
    g.rect(X - 1, Y + 11, 2, cast ? 2 : 1, 'p1');
  });
  if (cast) {
    m.part(LILAS, 'sphere', (p) => p.circle(X - 9 - cast * 2, Y + 15 - cast * 3, 1 + cast, 'x'), { light: 1 });
    m.overlay((g) => { for (const [ox, oy] of [[-3, -2], [2, -3], [-1, 3]]) g.set(X - 9 - cast * 2 + ox, Y + 15 - cast * 3 + oy, 'p5'); });
  }
  return m.render();
}

export function enemySheets2() {
  return {
    zumbi: folhas(zumbi, {
      idle: [{}, { lean: -1, dy: 1 }, { lean: -1, dy: 1, reach: 0.4 }, {}],
      attack: [{ lean: 1 }, { lean: -2, reach: 1, mood: 'attack' }, { lean: -3, reach: 1.5, mood: 'attack' }, { lean: -1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    corvo: folhas(corvo, {
      idle: [{ wing: 0 }, { wing: 1, dy: -1 }, { wing: 0.5, dy: -1 }, { wing: 0 }],
      attack: [{ wing: 1, dx: 1 }, { wing: 0, dx: -3, beak: 1, mood: 'attack' }, { wing: -0.5, dx: -5, dy: 1, beak: 2, mood: 'attack' }, { wing: 0.5, dx: -1 }],
      hurt: [{ wing: -0.5, dx: 2, dy: 1, mood: 'hurt' }, { wing: 0, dx: 1, dy: 1, mood: 'hurt' }],
    }),
    esqueleto: folhas(esqueleto, {
      idle: [{}, { dy: 1 }, { dy: 1 }, {}],
      attack: [{ arm: 'up' }, { arm: 'up', dy: -1 }, { arm: 'swing', dx: -2, mood: 'attack' }, { dx: -1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    mumia: folhas(mumia, {
      idle: [{}, { dy: 1 }, { dy: 1, reach: 0.3 }, {}],
      attack: [{ dx: 1 }, { reach: 1, dx: -1, mood: 'attack' }, { reach: 1.6, dx: -2, mood: 'attack' }, { reach: 0.5 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    lobisomem: folhas(lobisomem, {
      idle: [{}, { dy: 1 }, { dy: 1, jaw: 1 }, {}],
      attack: [{ dx: 1 }, { reach: 1, dx: -1, jaw: 2, mood: 'attack' }, { reach: 2, dx: -2, jaw: 2, mood: 'attack' }, { reach: 1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    banshee: folhas(banshee, {
      idle: [{}, { hair: 1, dy: -1 }, { hair: 1 }, { dy: -1 }],
      attack: [{ dx: 1 }, { scream: 1, dx: -1, hair: 1, mood: 'attack' }, { scream: 2, dx: -2, hair: 2, mood: 'attack' }, { scream: 1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, hair: 1, mood: 'hurt' }],
    }),
    coveiro: folhas(coveiro, {
      idle: [{}, { dy: 1 }, { dy: 1 }, {}],
      attack: [{ shovel: 'up' }, { shovel: 'up', dy: -1 }, { shovel: 'swing', dx: -2, mood: 'attack' }, { dx: -1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    relojoeiro: folhas(relojoeiro, {
      idle: [{ swing: -1 }, { swing: 0, hands: 1 }, { swing: 1, hands: 2 }, { swing: 0, hands: 3 }],
      attack: [{ swing: 1, tilt: 1 }, { swing: -2, tilt: -1, hands: 1, mood: 'attack' }, { swing: -3, tilt: -2, hands: 2, dx: -1, mood: 'attack' }, { swing: 0 }],
      hurt: [{ dx: 2, tilt: 1, mood: 'hurt' }, { dx: 1, tilt: 1, hands: 2, mood: 'hurt' }],
    }),
    morgana: folhas(morgana, {
      idle: [{}, { hair: 1, dy: -1 }, { hair: 1 }, { dy: -1 }],
      attack: [{ cast: 1 }, { cast: 2, dx: -1, hair: 1, mood: 'attack' }, { cast: 3, dx: -2, hair: 2, mood: 'attack' }, { cast: 1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, hair: 1, mood: 'hurt' }],
    }),
  };
}
