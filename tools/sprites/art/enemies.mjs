// Inimigos do Ato I no estilo de volume (lib/volume.mjs): desenhados em 32x32 e ampliados para 64x64.
// Todos olham para a ESQUERDA (o Caçador fica à esquerda) e têm idle (4 frames), attack (4) e hurt (2).
// Quem anda encosta os pés em y = 29 da grade (59 no quadro); quem voa fica perto do meio.
import { sheet } from '../lib/grid.mjs';
import { Model, mat } from '../lib/volume.mjs';
import {
  OURO, PRATA, METAL, FERRO, MADEIRA, OSSO, BRANCO, ECTO, VERMELHO, AMARELO, ROXO, LILAS, PEDRA, SOMBRA, CIANO,
} from './materiais.mjs';

/** Monta as três folhas a partir de uma função de frame e das poses de cada animação. */
export function folhas(frame, { idle, attack, hurt }) {
  return { idle: sheet(idle.map(frame)), attack: sheet(attack.map(frame)), hurt: sheet(hurt.map(frame)) };
}

// ═══════════════════════════════════════════════════════════════
//  FANTASMA — um olho só, cauda enrolada para a direita
// ═══════════════════════════════════════════════════════════════
function fantasma({ dx = 0, dy = 0, wave = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = 4 + dy, w = wave % 2;
  m.part(ECTO, 'sphere', (p) => p.ellipse(X + 8, Y + 13, 3, 2, 'x'), { light: -1 });
  m.part(ECTO, 'sphere', (p) => {
    p.ellipse(X, Y + 9, 9, 9, 'x');
    p.poly([[X - 9, Y + 9], [X + 9, Y + 9], [X + 8, Y + 15], [X + 11, Y + 18 + w], [X + 13, Y + 22 + w], [X + 9, Y + 21],
      [X + 5, Y + 18 - w], [X + 1, Y + 20 - w], [X - 3, Y + 17 + w], [X - 7, Y + 19], [X - 9, Y + 14]], 'x');
  });
  const reach = mood === 'attack' ? 2 : 0;
  m.part(ECTO, 'sphere', (p) => p.ellipse(X - 9 - reach, Y + 12 - reach / 2, 3, 2, 'x'));
  m.paint((g) => {
    const ex = X - 4, ey = Y + 7;   // olho grande, olhando para a esquerda
    if (mood === 'hurt') {
      g.line(ex - 2, ey - 2, ex + 2, ey + 2, 'p1').line(ex - 2, ey + 2, ex + 2, ey - 2, 'p1');
    } else {
      g.circle(ex, ey, 3, 'w');
      g.circle(ex - 1, ey, 2, 'r3');
      g.rect(ex - 1, ey - 1, 1, 3, 'k');
      g.set(ex - 2, ey - 1, 'r5');
    }
    if (mood === 'attack') { g.ellipse(X - 3, Y + 15, 2, 2, 'p1'); g.rect(X - 4, Y + 16, 3, 1, 'r2'); }
    else g.px([[X - 5, Y + 14], [X - 3, Y + 14], [X - 1, Y + 14]], 'p1');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  FOGO-FÁTUO — chama ciano com carinha
// ═══════════════════════════════════════════════════════════════
const CHAMA = { tones: ['c1', 'c2', 'c3', 'c4', 'c5'], line: 'c1' };
function fogoFatuo({ dx = 0, dy = 0, lick = 0, stretch = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = 20 + dy;
  m.part(CHAMA, 'sphere', (p) => {
    p.circle(X, Y, 7, 'x');
    const tips = [[-5, 9 + lick], [-1, 14 + stretch], [3, 11 - lick + stretch], [6, 7]];
    for (const [ox, h] of tips) p.poly([[X + ox - 3, Y - 2], [X + ox + 3, Y - 2], [X + ox + 1 - stretch, Y - h]], 'x');
  });
  m.part(mat('c5', { line: 'c3' }), 'sphere', (p) => p.ellipse(X - 1, Y + 1, 4, 4, 'x'), { edge: false });
  m.paint((g) => {
    if (mood === 'hurt') { g.line(X - 4, Y - 1, X - 2, Y + 1, 'c1'); g.line(X + 1, Y - 1, X + 3, Y + 1, 'c1'); }
    else { g.rect(X - 4, Y - 1, 2, 3, 'c1'); g.rect(X + 1, Y - 1, 2, 3, 'c1'); }
    if (mood === 'attack') g.ellipse(X - 1, Y + 4, 2, 1, 'c1'); else g.rect(X - 2, Y + 4, 3, 1, 'c2');
  });
  m.overlay((g) => {
    for (const [x, y] of [[X - 7 - lick, Y - 13], [X + 6, Y - 15 + lick], [X - 1, Y - 17 - stretch]]) g.set(x, Math.max(1, y), 'c4');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  MORCEGO VAMPIRO — asas que batem
// ═══════════════════════════════════════════════════════════════
const ASA = mat('p2', { line: 'k' });
function morcego({ dx = 0, dy = 0, wing = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = 15 + dy;
  const tip = [-7, -2, 4][wing + 1];   // asa em cima, no meio, embaixo
  for (const side of [-1, 1]) {
    m.part(ASA, 'flat', (p) => {
      const sx = X + side * 3;
      p.poly([[sx, Y - 2], [sx + side * 10, Y + tip], [sx + side * 9, Y + tip + 4], [sx + side * 6, Y + 3], [sx + side * 3, Y + 6], [sx, Y + 4]], 'x');
    });
  }
  m.part(ROXO, 'sphere', (p) => {
    p.ellipse(X, Y + 2, 5, 6, 'x');
    p.poly([[X - 4, Y - 2], [X - 3, Y - 8], [X - 1, Y - 3]], 'x');
    p.poly([[X + 4, Y - 2], [X + 3, Y - 8], [X + 1, Y - 3]], 'x');
  });
  m.part(LILAS, 'sphere', (p) => p.ellipse(X, Y + 4, 3, 3, 'x'), { edge: false });
  m.paint((g) => {
    if (mood === 'hurt') { g.rect(X - 3, Y, 2, 1, 'k'); g.rect(X + 1, Y, 2, 1, 'k'); }
    else { g.rect(X - 3, Y - 1, 2, 2, 'r3'); g.rect(X + 1, Y - 1, 2, 2, 'r3'); g.set(X - 3, Y - 1, 'r5'); }
    g.set(X - 1, Y + 3, 'w'); g.set(X + 1, Y + 3, 'w');
    if (mood === 'attack') g.rect(X - 1, Y + 2, 3, 1, 'k');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  GÁRGULA — estátua agachada que ganha vida
// ═══════════════════════════════════════════════════════════════
const PEDRA_ESCURA = mat('t2', { line: 'k' });
function gargula({ dx = 0, dy = 0, reach = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  // asa de pedra atrás
  m.part(PEDRA_ESCURA, 'flat', (p) => p.poly([[X + 3, 14 + Y], [X + 12, 2 + Y], [X + 12, 10 + Y], [X + 10, 15 + Y], [X + 8, 20 + Y]], 'x'));
  // corpo agachado e perna de trás
  m.part(PEDRA, 'sphere', (p) => { p.ellipse(X + 3, 20 + Y, 9, 7, 'x'); p.rect(X + 4, 22, 8, 7, 'x'); });
  // cabeça com chifres
  const hx = X - 6 - reach, hy = 12 + Y;
  m.part(PEDRA, 'sphere', (p) => {
    p.ellipse(hx, hy, 5, 5, 'x');
    p.poly([[hx - 1, hy - 3], [hx + 1, hy - 9], [hx + 3, hy - 3]], 'x');
    p.poly([[hx + 3, hy - 2], [hx + 7, hy - 7], [hx + 6, hy - 1]], 'x');
    p.rect(hx - 7, hy, 4, 4, 'x');   // focinho
  });
  // braço / garra da frente
  m.part(PEDRA, 'cylinder', (p) => { p.stroke(X - 1, 19 + Y, X - 4 - reach * 2, 26 - reach, 3, 'x'); p.rect(X - 7 - reach * 2, 26 - reach, 5, 3, 'x'); });
  m.part(PEDRA, 'cylinder', (p) => p.rect(X - 2, 25, 6, 4, 'x'), { light: -1 });
  m.paint((g) => {
    if (mood === 'hurt') g.rect(hx - 4, hy - 1, 3, 1, 'k');
    else { g.rect(hx - 4, hy - 2, 3, 2, 'y3'); g.set(hx - 4, hy - 2, 'y4'); }
    if (mood === 'attack') { g.rect(hx - 7, hy + 2, 4, 2, 'k'); g.set(hx - 6, hy + 2, 'w'); g.set(hx - 4, hy + 2, 'w'); }
    else g.rect(hx - 7, hy + 3, 4, 1, 't1');
    g.line(X + 1, 17 + Y, X + 5, 23 + Y, 't2');   // rachadura
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  BONECA POSSUÍDA — porcelana, maria-chiquinha e vestido vermelho
// ═══════════════════════════════════════════════════════════════
const CABELO = mat('m3', { line: 'm1' });
const VESTIDO = mat('r2', { line: 'r1' });
function boneca({ dx = 0, dy = 0, arm = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  // pernas e sapatos
  m.part(BRANCO, 'cylinder', (p) => { p.rect(X - 4, 23, 2, 5, 'x'); p.rect(X + 2, 23, 2, 5, 'x'); });
  m.part(mat('g1', { line: 'k' }), 'hcylinder', (p) => { p.rect(X - 5, 27, 4, 2, 'x'); p.rect(X + 1, 27, 4, 2, 'x'); });
  // vestido com babado
  m.part(VESTIDO, 'cylinder', (p) => p.poly([[X - 4, 13 + Y], [X + 4, 13 + Y], [X + 8, 24], [X - 8, 24]], 'x'));
  // braço (estica no ataque)
  m.part(OSSO, 'cylinder', (p) => p.stroke(X - 5, 15 + Y, X - 8 - arm * 3, 20 + Y - arm * 4, 2, 'x'));
  // cabelo atrás, rosto, maria-chiquinha
  m.part(CABELO, 'sphere', (p) => p.ellipse(X, 7 + Y, 7, 6, 'x'));
  m.part(OSSO, 'sphere', (p) => p.ellipse(X - 1, 9 + Y, 5, 5, 'x'));
  m.part(CABELO, 'sphere', (p) => { p.circle(X - 8, 10 + Y, 3, 'x'); p.circle(X + 7, 10 + Y, 3, 'x'); });
  m.part(CABELO, 'sphere', (p) => p.ellipse(X, 4 + Y, 6, 2, 'x'), { edge: false });
  m.paint((g) => {
    for (let x = X - 7; x <= X + 7; x += 2) g.set(x, 24, 'w');   // babado
    g.set(X - 8, 8 + Y, 'r3'); g.set(X + 7, 8 + Y, 'r3');           // laços
    g.set(X, 15 + Y, 'y3');                                        // broche
    if (mood === 'hurt') { g.rect(X - 4, 9 + Y, 2, 1, 'k'); g.rect(X, 8 + Y, 2, 2, 'k'); }
    else { g.rect(X - 4, 8 + Y, 2, 2, 'k'); g.rect(X, 8 + Y, 2, 2, 'k'); g.set(X - 4, 8 + Y, 'r3'); }
    if (mood === 'attack') { g.rect(X - 3, 11 + Y, 3, 2, 'k'); g.set(X - 2, 11 + Y, 'w'); }
    else { g.rect(X - 3, 12 + Y, 4, 1, 'r1'); g.set(X - 3, 11 + Y, 'r1'); g.set(X, 11 + Y, 'r1'); }
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  ARMADURA ASSOMBRADA — vazia, com olhos roxos na viseira
// ═══════════════════════════════════════════════════════════════
function armadura({ dx = 0, dy = 0, sword = 'down', mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = dy;
  // espada
  if (sword === 'down') m.part(PRATA, 'cylinder', (p) => { p.rect(X - 9, 15 + Y, 2, 14, 'x'); });
  if (sword === 'up') m.part(PRATA, 'cylinder', (p) => p.rect(X - 9, 2 + Y, 2, 13, 'x'));
  if (sword === 'thrust') m.part(PRATA, 'hcylinder', (p) => p.rect(X - 15, 17 + Y, 7, 2, 'x'));
  // pernas
  m.part(METAL, 'cylinder', (p) => { p.rect(X - 4, 21, 3, 8, 'x'); p.rect(X + 1, 21, 3, 8, 'x'); });
  // tronco
  m.part(METAL, 'cylinder', (p) => p.poly([[X - 6, 11 + Y], [X + 6, 11 + Y], [X + 5, 22], [X - 5, 22]], 'x'));
  m.part(FERRO, 'sphere', (p) => { p.circle(X - 6, 12 + Y, 3, 'x'); p.circle(X + 6, 12 + Y, 3, 'x'); });
  // braço com a mão na espada
  const hand = { down: [X - 8, 17 + Y], up: [X - 8, 13 + Y], thrust: [X - 9, 18 + Y] }[sword];
  m.part(METAL, 'cylinder', (p) => p.stroke(X - 5, 13 + Y, hand[0], hand[1], 3, 'x'));
  m.part(OURO, 'hcylinder', (p) => (sword === 'thrust' ? p.rect(X - 9, 16 + Y, 2, 4, 'x') : p.rect(hand[0] - 2, hand[1] - 1, 6, 2, 'x')));
  // elmo com pluma
  m.part(VERMELHO, 'sphere', (p) => p.poly([[X + 1, 3 + Y], [X + 7, 1 + Y], [X + 9, 5 + Y], [X + 3, 5 + Y]], 'x'));
  m.part(PRATA, 'cylinder', (p) => { p.rect(X - 4, 3 + Y, 9, 9, 'x'); p.ellipse(X, 4 + Y, 4, 2, 'x'); });
  m.paint((g) => {
    g.rect(X - 4, 7 + Y, 8, 2, 'k');
    if (mood === 'hurt') g.rect(X - 3, 8 + Y, 2, 1, 'p2');
    else { g.rect(X - 3, 7 + Y, 2, 2, 'p4'); g.rect(X + 1, 7 + Y, 1, 2, 'p3'); }
    g.rect(X - 5, 20, 11, 1, 't2');
  });
  return m.render();
}

// ═══════════════════════════════════════════════════════════════
//  KASTLE — o Bobo da Corte das trevas (chefe)
// ═══════════════════════════════════════════════════════════════
const CHAPEU = mat('c3', { line: 'c1' });
function kastle({ dx = 0, dy = 0, mouth = 0, bells = 0, arms = 0, mood = 'idle' } = {}) {
  const m = new Model();
  const X = 16 + dx, Y = 2 + dy;
  // sapatos de bico e pernas listradas
  m.part(ROXO, 'hcylinder', (p) => { p.poly([[X - 6, 26], [X - 1, 26], [X - 1, 29], [X - 9, 29], [X - 9, 26]], 'x'); p.poly([[X + 2, 26], [X + 7, 26], [X + 10, 25], [X + 9, 29], [X + 2, 29]], 'x'); });
  m.part(AMARELO, 'cylinder', (p) => { p.rect(X - 5, 21, 3, 6, 'x'); p.rect(X + 2, 21, 3, 6, 'x'); });
  // túnica em losangos
  m.part(ROXO, 'cylinder', (p) => p.poly([[X - 7, 14 + Y], [X + 7, 14 + Y], [X + 8, 23], [X - 8, 23]], 'x'));
  m.part(AMARELO, 'cylinder', (p) => { p.poly([[X, 14 + Y], [X + 4, 18 + Y], [X, 23], [X - 4, 18 + Y]], 'x'); }, { edge: false });
  // braços (sobem no ataque)
  for (const s of [-1, 1]) {
    m.part(s < 0 ? AMARELO : ROXO, 'cylinder', (p) => p.stroke(X + s * 7, 16 + Y, X + s * (9 + arms / 2), 21 + Y - arms * 4, 3, 'x'));
    m.part(BRANCO, 'sphere', (p) => p.circle(X + s * (9 + arms / 2), 21 + Y - arms * 4, 2, 'x'));
  }
  // gola de babados
  m.part(BRANCO, 'hcylinder', (p) => { for (let i = -3; i <= 3; i++) p.circle(X + i * 2.3, 14 + Y, 2, 'x'); });
  // cabeça escura
  m.part(SOMBRA, 'sphere', (p) => p.ellipse(X, 9 + Y, 7, 6, 'x'));
  // chapéu de três pontas com guizos: duas abas ciano caídas para os lados e a do meio roxa
  const tips = [[X - 11, 5 + Y + bells], [X, 2 + Y], [X + 11, 5 + Y - bells]];
  m.part(CHAPEU, 'sphere', (p) => {
    p.poly([[X - 7, 7 + Y], [X - 1, 7 + Y], [X - 3, 2 + Y], [X - 8, 1 + Y], tips[0]], 'x');
    p.poly([[X + 1, 7 + Y], [X + 7, 7 + Y], tips[2], [X + 8, 1 + Y], [X + 3, 2 + Y]], 'x');
  });
  m.part(ROXO, 'sphere', (p) => p.poly([[X - 4, 7 + Y], [X + 4, 7 + Y], [X + 2, 2 + Y], tips[1], [X - 2, 2 + Y]], 'x'));
  m.part(AMARELO, 'hcylinder', (p) => p.rect(X - 7, 6 + Y, 15, 2, 'x'));
  m.part(LILAS, 'sphere', (p) => { for (const [tx, ty] of tips) p.circle(tx, ty, 1.5, 'x'); });
  m.paint((g) => {
    if (mood === 'hurt') { g.line(X - 5, 9 + Y, X - 2, 10 + Y, 'p4'); g.line(X + 1, 10 + Y, X + 4, 9 + Y, 'p4'); }
    else { g.rect(X - 5, 9 + Y, 2, 2, 'p5'); g.rect(X + 1, 9 + Y, 2, 2, 'p5'); g.set(X - 5, 9 + Y, 'w'); }
    // sorriso largo; no ataque a bocarra abre com dentes
    if (mouth > 0.5) {
      g.rect(X - 5, 12 + Y, 9, 3, 'r1');
      for (let x = X - 5; x <= X + 3; x += 2) { g.set(x, 12 + Y, 'w'); g.set(x + 1, 14 + Y, 'w'); }
    } else {
      g.rect(X - 4, 13 + Y, 7, 1, 'w');
      g.set(X - 5, 12 + Y, 'w'); g.set(X + 3, 12 + Y, 'w');
    }
  });
  return m.render();
}

export function enemySheets() {
  return {
    fantasma: folhas(fantasma, {
      idle: [{}, { dy: -1, wave: 1 }, { dy: -1 }, { wave: 1 }],
      attack: [{ dx: 1 }, { dx: -1, mood: 'attack' }, { dx: -1, mood: 'attack', wave: 1 }, { dx: -1 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt', wave: 1 }],
    }),
    fogo_fatuo: folhas(fogoFatuo, {
      idle: [{}, { lick: 1, dy: -1 }, { lick: 2, dy: -1 }, { lick: 1 }],
      attack: [{ dx: 1, stretch: 1 }, { dx: -2, stretch: 2, mood: 'attack' }, { dx: -4, stretch: 3, lick: 1, mood: 'attack' }, { dx: -1, lick: 1 }],
      hurt: [{ dx: 2, dy: 1, mood: 'hurt' }, { dx: 1, dy: 1, lick: 1, mood: 'hurt' }],
    }),
    morcego: folhas(morcego, {
      idle: [{ wing: -1 }, { wing: 0, dy: 1 }, { wing: 1, dy: 2 }, { wing: 0, dy: 1 }],
      attack: [{ wing: -1, dx: 1 }, { wing: 1, dx: -1, dy: 2, mood: 'attack' }, { wing: 1, dx: -2, dy: 3, mood: 'attack' }, { wing: 0, dx: -1 }],
      hurt: [{ wing: 1, dx: 1, dy: 2, mood: 'hurt' }, { wing: 1, dx: 1, dy: 3, mood: 'hurt' }],
    }),
    gargula: folhas(gargula, {
      idle: [{}, { dy: 1 }, { dy: 1 }, {}],
      attack: [{ dx: 1 }, { reach: 1, mood: 'attack' }, { reach: 1.5, dx: -1, mood: 'attack' }, { reach: 1 }],
      hurt: [{ dx: 1, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    boneca: folhas(boneca, {
      idle: [{}, { dy: 1 }, { dy: 1, arm: 0.3 }, {}],
      attack: [{ dx: 1 }, { arm: 1, mood: 'attack' }, { arm: 1.6, dx: -1, mood: 'attack' }, { arm: 0.5 }],
      hurt: [{ dx: 2, mood: 'hurt' }, { dx: 1, mood: 'hurt' }],
    }),
    armadura: folhas(armadura, {
      idle: [{}, { dy: 1 }, { dy: 1 }, {}],
      attack: [{ sword: 'up', dy: 1 }, { sword: 'up' }, { sword: 'thrust', mood: 'attack' }, { dx: -1 }],
      hurt: [{ dx: 2, dy: 1, mood: 'hurt' }, { dx: 1, dy: 1, mood: 'hurt' }],
    }),
    kastle: folhas(kastle, {
      idle: [{}, { bells: 1, dy: -1 }, { bells: 1 }, { dy: -1 }],
      attack: [{ arms: 1, dx: 1 }, { arms: 2, mouth: 1, bells: 1 }, { arms: 2, mouth: 1, dx: -1, dy: 1, bells: 1 }, { arms: 1 }],
      hurt: [{ dx: 1, mood: 'hurt' }, { dx: 1, mood: 'hurt', bells: 1 }],
    }),
  };
}

// usado pelo preview: achata { inimigo: { anim: grid } } em { 'inimigo.anim': grid }
export function previewAll() {
  const out = {};
  for (const [name, anims] of Object.entries(enemySheets())) {
    for (const [anim, g] of Object.entries(anims)) out[`${name}.${anim}`] = g;
  }
  return out;
}
