// Inimigos do Ato II (O Reino das Sombras). Mesmo padrão de enemies.mjs:
// todos olham para a esquerda e têm idle (4 frames), attack (4) e hurt (2).
import { Grid, sheet } from '../lib/grid.mjs';

/** Desenha uma parte com sombreamento e contorno próprios (ganha volume) e cola em `g`. */
function part(g, draw, { depth = 1, outline = null } = {}) {
  const p = new Grid();
  draw(p);
  p.shade({ depth });
  if (outline) p.outline(outline);
  g.blit(p);
}

/** Monta as três folhas a partir de uma função de frame e das poses de cada animação. */
function sheets(frame, { idle, attack, hurt }) {
  return { idle: sheet(idle.map(frame)), attack: sheet(attack.map(frame)), hurt: sheet(hurt.map(frame)) };
}

// ═══════════════════════════════════════════════════════════════
//  ZUMBI — pele verde, camisa rasgada, braços esticados
// ═══════════════════════════════════════════════════════════════
function zombie({ dx = 0, dy = 0, lean = 0, reach = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // braço de trás
  g.stroke(X - 4 + lean, 31 + Y, X - 18 - reach * 5 + lean, 35 + Y - reach * 2, 4, 'v2');
  // pernas
  part(g, (L) => {
    L.rect(X - 6, 46 + Y, 5, 12, 'm2'); L.rect(X + 2, 46 + Y, 5, 12, 'm2');
    L.rect(X - 7, 57 + Y, 6, 3, 'g1'); L.rect(X + 2, 57 + Y, 6, 3, 'g1');
  });
  // camisa rasgada
  part(g, (T) => {
    T.poly([[X - 9 + lean, 28 + Y], [X + 8 + lean, 28 + Y], [X + 9, 48 + Y], [X - 9, 48 + Y]], 'b3');
    for (const [x, y] of [[-9, 46], [-8, 47], [-4, 47], [5, 46], [8, 47], [9, 45]]) T.set(X + x, y + Y, null);
  }, { depth: 2 });
  g.ellipse(X + 2 + lean, 40 + Y, 3, 2, 'v3'); // pele aparecendo
  g.line(X - 5 + lean, 32 + Y, X - 2 + lean, 38 + Y, 'b2');
  // braço da frente
  part(g, (A) => A.stroke(X - 6 + lean, 31 + Y, X - 20 - reach * 6 + lean, 32 + Y - reach * 3, 4, 'v3'));
  g.rect(X - 23 - reach * 6 + lean, 30 + Y - reach * 3, 4, 4, 'v4');
  // cabeça
  const hx = X - 2 + lean, hy = 19 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => {
    H.ellipse(hx, hy, 8, 9, 'v4');
    H.rect(hx - 6, hy - 9, 12, 3, 'k2'); // cabelo ralo
    H.set(hx - 7, hy - 7, 'k2'); H.set(hx + 5, hy - 6, 'k2');
  });
  g.line(hx + 1, hy - 5, hx + 5, hy - 5, 'v2'); // pontos na testa
  g.px([[hx + 2, hy - 6], [hx + 4, hy - 4]], 'v2');
  if (mood === 'hurt') {
    g.line(hx - 6, hy - 2, hx - 3, hy + 1, 'k').line(hx - 6, hy + 1, hx - 3, hy - 2, 'k');
    g.rect(hx + 1, hy - 1, 3, 1, 'k');
  } else {
    g.circle(hx - 4, hy - 1, 2, 'y4'); g.set(hx - 4, hy - 1, 'r3'); // olho saltado
    g.rect(hx + 1, hy - 1, 3, 2, 'k');
  }
  const open = mood === 'attack' ? 3 : 1;
  g.rect(hx - 6, hy + 4, 8, open, 'k2');
  g.px([[hx - 5, hy + 4], [hx - 2, hy + 4], [hx, hy + 4 + open - 1]], 'q3');
  g.outline('k');
  return g;
}

const zumbi = () => sheets(zombie, {
  idle: [{ lean: 0 }, { lean: -1, dy: 1 }, { lean: -2, dy: 1, reach: 0.3 }, { lean: -1 }],
  attack: [{ lean: 1, dx: 2 }, { lean: -2, dx: -4, reach: 1, mood: 'attack' }, { lean: -3, dx: -8, reach: 1.4, mood: 'attack' }, { lean: -1, dx: -2 }],
  hurt: [{ dx: 4, lean: 2, mood: 'hurt' }, { dx: 2, lean: 1, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  CORVO AGOURENTO — penas negras com brilho azulado e olho vermelho
// ═══════════════════════════════════════════════════════════════
function crow({ wing = 0, dx = 0, dy = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 34 + dx, Y = 30 + dy;
  // asa de trás
  g.poly([[X - 2, Y - 2], [X + 8, Y - 2], [X + 12, Y - 12 - wing * 8], [X + 2, Y - 10 - wing * 6]], 'k2');
  part(g, (B) => {
    B.ellipse(X, Y + 4, 11, 8, 'g1');                                                  // corpo
    B.poly([[X + 8, Y + 2], [X + 21, Y - 2], [X + 22, Y + 6], [X + 9, Y + 10]], 'g1'); // cauda
    B.circle(X - 9, Y - 4, 6, 'g1');                                                   // cabeça
  }, { depth: 2 });
  // asa da frente
  part(g, (W) => {
    const tip = Y - 14 - wing * 12;
    // asa em leque, com três penas nas pontas
    W.poly([[X - 4, Y], [X + 12, Y + 1], [X + 18, tip + 8], [X + 14, tip + 4], [X + 11, tip + 6], [X + 7, tip], [X + 4, tip + 3], [X - 2, Y - 6]], 'k2');
    W.line(X - 2, Y - 4, X + 6, tip + 2, 'g2'); // borda de ataque
  });
  // bico
  const open = mood === 'attack' ? 3 : 0;
  g.poly([[X - 14, Y - 6], [X - 23, Y - 4 - open], [X - 14, Y - 3]], 'y2');
  g.poly([[X - 14, Y - 2], [X - 21, Y - 1 + open], [X - 14, Y]], 'y1');
  // olho
  if (mood === 'hurt') g.line(X - 12, Y - 6, X - 9, Y - 4, 'r3');
  else { g.rect(X - 12, Y - 6, 3, 3, 'r3'); g.set(X - 12, Y - 6, 'r5'); }
  // pés
  g.px([[X - 2, Y + 12], [X - 2, Y + 13], [X + 2, Y + 12], [X + 2, Y + 13], [X - 3, Y + 14], [X + 3, Y + 14]], 'y1');
  g.outline('k');
  return g;
}

const corvo = () => sheets(crow, {
  idle: [{ wing: 1 }, { wing: 0.3, dy: 1 }, { wing: -0.6, dy: 2 }, { wing: 0.3, dy: 1 }],
  attack: [{ wing: 1, dx: 3, dy: -2 }, { wing: 0.5, dx: -6, dy: 2, mood: 'attack' }, { wing: -0.5, dx: -10, dy: 4, mood: 'attack' }, { wing: 0.3, dx: -2 }],
  hurt: [{ wing: -1, dx: 4, mood: 'hurt' }, { wing: -0.5, dx: 2, dy: 1, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  ESQUELETO — ossos com brilho ciano nos olhos, segura um fêmur
// ═══════════════════════════════════════════════════════════════
function skeleton({ dx = 0, dy = 0, club = 'down', jaw = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  const bone = (x0, y0, x1, y1) => {
    g.stroke(x0, y0, x1, y1, 3, 'g5');
    g.circle(x0, y0, 2, 'g5'); g.circle(x1, y1, 2, 'g5');
  };
  // pernas e bacia
  bone(X - 4, 44 + Y, X - 6, 58 + Y);
  bone(X + 4, 44 + Y, X + 6, 58 + Y);
  g.ellipse(X, 44 + Y, 7, 3, 'g5');
  g.rect(X - 9, 58 + Y, 5, 2, 'g4'); g.rect(X + 5, 58 + Y, 5, 2, 'g4');
  // coluna e costelas
  g.rect(X - 1, 26 + Y, 2, 18, 'g4');
  for (let i = 0; i < 4; i++) {
    const w = 8 - i;
    g.rect(X - w, 28 + Y + i * 4, w * 2, 2, 'g5');
    g.set(X - w, 29 + Y + i * 4, 'g3');
  }
  // braço de trás
  bone(X + 7, 28 + Y, X + 10, 40 + Y);
  // crânio
  const hx = X - 1, hy = 16 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => {
    H.ellipse(hx, hy, 9, 8, 'q4');
    H.rect(hx - 6, hy + 5, 12, 4 + jaw, 'q4'); // mandíbula
  });
  if (mood === 'hurt') {
    g.line(hx - 6, hy - 2, hx - 2, hy + 2, 'k').line(hx - 6, hy + 2, hx - 2, hy - 2, 'k');
    g.line(hx + 1, hy - 2, hx + 5, hy + 2, 'k').line(hx + 1, hy + 2, hx + 5, hy - 2, 'k');
  } else {
    g.circle(hx - 4, hy, 3, 'k'); g.circle(hx + 3, hy, 3, 'k');
    g.set(hx - 4, hy, 'c4'); g.set(hx + 3, hy, 'c4');
  }
  g.poly([[hx - 1, hy + 3], [hx + 1, hy + 3], [hx, hy + 5]], 'k');
  for (let i = -5; i <= 4; i += 2) g.rect(hx + i, hy + 6 + Math.round(jaw / 2), 1, 2, 'k2');
  // braço da frente com o fêmur
  const hand = club === 'up' ? [X - 12, 14 + Y] : club === 'forward' ? [X - 18, 30 + Y] : [X - 11, 40 + Y];
  bone(X - 7, 28 + Y, hand[0], hand[1]);
  const end = club === 'up' ? [hand[0] - 2, hand[1] - 14] : club === 'forward' ? [hand[0] - 14, hand[1] - 2] : [hand[0] - 2, hand[1] + 12];
  g.stroke(hand[0], hand[1], end[0], end[1], 4, 'q3');
  g.circle(end[0], end[1], 3, 'q3');
  g.outline('k');
  return g;
}

const esqueleto = () => sheets(skeleton, {
  idle: [{}, { dy: 1, jaw: 1 }, { dy: 1 }, { jaw: 1 }],
  attack: [{ club: 'up', dx: 2 }, { club: 'up', dx: -2, jaw: 2, mood: 'attack' }, { club: 'forward', dx: -6, jaw: 2, mood: 'attack' }, { dx: -2 }],
  hurt: [{ dx: 4, mood: 'hurt' }, { dx: 2, dy: 1, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  MÚMIA — faixas encardidas, olhos amarelos e uma faixa solta
// ═══════════════════════════════════════════════════════════════
function mummy({ dx = 0, dy = 0, sway = 0, reach = 0, glow = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // faixa solta balançando atrás
  g.stroke(X + 8, 30 + Y, X + 16 + sway, 44 + Y, 2, 'm5');
  g.stroke(X + 16 + sway, 44 + Y, X + 20 + sway * 2, 52 + Y, 2, 'm5');
  part(g, (B) => {
    B.rect(X - 8, 26 + Y, 17, 22, 'm6');  // tronco
    B.rect(X - 7, 46 + Y, 6, 13, 'm6');   // pernas
    B.rect(X + 2, 46 + Y, 6, 13, 'm6');
    B.ellipse(X - 1, 17 + Y, 8, 9, 'm6'); // cabeça
  }, { depth: 2 });
  // listras das faixas
  for (let y = 10; y < 58; y += 4) {
    const w = y < 26 ? 7 : 9;
    g.line(X - w, y + Y, X + w - 1, y + 2 + Y, 'm4');
  }
  // braços esticados
  part(g, (A) => {
    A.stroke(X - 6, 30 + Y, X - 18 - reach * 5, 30 + Y - reach * 2, 5, 'm6');
    A.stroke(X + 6, 31 + Y, X - 6 - reach * 4, 36 + Y, 4, 'm5');
  });
  // fresta dos olhos
  g.rect(X - 7, 14 + Y, 12, 4, 'k2');
  const eye = ['y2', 'y3', 'y4'][glow];
  if (mood === 'hurt') g.rect(X - 6, 16 + Y, 10, 1, 'y1');
  else { g.rect(X - 6, 15 + Y, 3, 2, eye); g.rect(X, 15 + Y, 3, 2, eye); }
  if (mood === 'attack') g.rect(X - 4, 20 + Y, 5, 2, 'k2');
  g.outline('k');
  return g;
}

const mumia = () => sheets(mummy, {
  idle: [{ sway: 0 }, { sway: 1, glow: 1 }, { sway: 2, glow: 2, dy: 1 }, { sway: 1, glow: 1 }],
  attack: [{ dx: 2, glow: 2 }, { dx: -4, reach: 1, glow: 2, mood: 'attack' }, { dx: -8, reach: 1.5, glow: 2, sway: -2, mood: 'attack' }, { dx: -2 }],
  hurt: [{ dx: 4, sway: 3, mood: 'hurt' }, { dx: 2, sway: 2, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  LOBISOMEM — pelo marrom, focinho comprido e garras
// ═══════════════════════════════════════════════════════════════
function werewolf({ dx = 0, dy = 0, breath = 0, claw = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 34 + dx, Y = dy;
  // braço de trás
  g.stroke(X + 6, 30 + Y, X + 10, 44 + Y, 5, 'm2');
  part(g, (B) => {
    B.ellipse(X, 36 + Y + breath, 12, 13, 'm3');                      // tronco curvado
    B.rect(X - 8, 46 + Y, 6, 12, 'm3'); B.rect(X + 3, 46 + Y, 6, 12, 'm3'); // pernas
    B.rect(X - 11, 57 + Y, 9, 3, 'm2'); B.rect(X + 2, 57 + Y, 9, 3, 'm2');
  }, { depth: 2 });
  g.ellipse(X - 3, 36 + Y + breath, 6, 7, 'm5'); // peito claro
  // cabeça
  const hx = X - 8, hy = 20 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => {
    H.ellipse(hx + 2, hy, 9, 8, 'm3');
    H.poly([[hx - 4, hy - 1], [hx - 16, hy + 3], [hx - 15, hy + 7], [hx - 2, hy + 6]], 'm3'); // focinho
    H.poly([[hx + 2, hy - 6], [hx + 5, hy - 16], [hx + 8, hy - 5]], 'm3');                  // orelha
    H.poly([[hx - 3, hy - 6], [hx - 2, hy - 14], [hx + 2, hy - 6]], 'm2');
  }, { depth: 2 });
  g.rect(hx - 17, hy + 2, 3, 2, 'k');                 // nariz
  if (mood === 'hurt') g.line(hx - 3, hy - 2, hx + 1, hy, 'k');
  else { g.rect(hx - 3, hy - 2, 3, 2, 'r3'); g.set(hx - 3, hy - 2, 'y4'); }
  const open = mood === 'attack' ? 3 : 1;
  g.rect(hx - 14, hy + 6, 11, open, 'r1');
  g.px([[hx - 13, hy + 6], [hx - 10, hy + 6], [hx - 7, hy + 6], [hx - 12, hy + 5 + open], [hx - 8, hy + 5 + open]], 'w');
  // braço da frente com garras
  const hand = [X - 16 - claw * 6, 36 + Y - claw * 8];
  part(g, (A) => A.stroke(X - 6, 30 + Y, hand[0], hand[1], 5, 'm3'));
  for (let i = 0; i < 3; i++) g.line(hand[0] - 2, hand[1] - 2 + i * 2, hand[0] - 5, hand[1] - 3 + i * 2, 'g5');
  // tufos de pelo
  g.px([[X + 10, 28 + Y], [X + 12, 32 + Y], [X + 11, 40 + Y], [X - 9, 52 + Y], [X + 8, 52 + Y]], 'm4');
  g.outline('k');
  return g;
}

const lobisomem = () => sheets(werewolf, {
  idle: [{ breath: 0 }, { breath: 1 }, { breath: 1, dy: 1 }, { breath: 0 }],
  attack: [{ dx: 2, claw: 1 }, { dx: -3, claw: 1.4, mood: 'attack' }, { dx: -7, claw: 0.4, mood: 'attack' }, { dx: -2 }],
  hurt: [{ dx: 4, mood: 'hurt' }, { dx: 2, breath: 1, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  BANSHEE — espírito pálido de cabelos longos, sempre gritando
// ═══════════════════════════════════════════════════════════════
function bansheeFrame({ dx = 0, dy = 0, wave = 0, scream = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // cabelo atrás, esvoaçando para a direita
  for (let i = 0; i < 5; i++) {
    const y0 = 14 + i * 4 + Y;
    g.stroke(X + 2, y0, X + 14 + i * 2 + Math.round(Math.sin(wave + i) * 2), y0 + 10, 3, i % 2 ? 'p2' : 'p1');
  }
  // vestido-cauda de fumaça
  part(g, (B) => {
    B.poly([[X - 7, 26 + Y], [X + 7, 26 + Y], [X + 12, 42 + Y], [X + 18, 54 + Y + Math.round(Math.sin(wave) * 2)], [X + 4, 50 + Y], [X - 6, 46 + Y]], 'gh3');
  }, { depth: 2 });
  // braços
  const up = mood === 'attack' ? 8 : 0;
  g.stroke(X - 5, 28 + Y, X - 13, 36 + Y - up, 2, 'gh4');
  g.stroke(X + 5, 28 + Y, X + 10, 38 + Y - up, 2, 'gh4');
  // rosto
  const hy = 17 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => H.ellipse(X - 1, hy, 7, 8, 'gh4'));
  g.poly([[X - 9, hy - 6], [X + 6, hy - 9], [X + 7, hy - 2], [X - 2, hy - 5]], 'p2'); // franja
  if (mood === 'hurt') {
    g.line(X - 5, hy - 1, X - 3, hy + 1, 'k').line(X, hy + 1, X + 2, hy - 1, 'k');
  } else {
    g.rect(X - 5, hy - 1, 2, 3, 'k'); g.rect(X + 1, hy - 1, 2, 3, 'k');
    g.set(X - 5, hy - 1, 'c4'); g.set(X + 1, hy - 1, 'c4');
  }
  const mh = 2 + scream;
  g.ellipse(X - 1, hy + 5, 2, mh / 2 + 0.5, 'k2');
  // ondas do grito
  if (scream >= 2) {
    for (const r of [4, 8]) g.px([[X - 8 - r, hy + 2], [X - 9 - r, hy + 4], [X - 8 - r, hy + 6]], 'gh4@70');
  }
  g.outline('k');
  return g;
}

const banshee = () => sheets(bansheeFrame, {
  idle: [{ wave: 0 }, { wave: 1.5, dy: -1 }, { wave: 3, dy: -2, scream: 1 }, { wave: 4.5, dy: -1 }],
  attack: [{ wave: 0, dx: 2, scream: 1 }, { wave: 1, dx: -4, scream: 3, mood: 'attack' }, { wave: 2, dx: -7, scream: 4, mood: 'attack' }, { wave: 3, dx: -2 }],
  hurt: [{ dx: 4, wave: 1, mood: 'hurt' }, { dx: 2, wave: 2, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  COVEIRO (chefe) — velho corcunda com pá, chapéu e lampião
// ═══════════════════════════════════════════════════════════════
function gravedigger({ dx = 0, dy = 0, shovel = 'rest', lamp = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 34 + dx, Y = dy;
  // lampião na mão de trás
  const lx = X + 14, ly = 40 + Y + lamp;
  g.line(X + 10, 34 + Y, lx, ly - 4, 'g3');
  g.rect(lx - 3, ly - 4, 7, 9, 'g2');
  g.rect(lx - 2, ly - 3, 5, 7, ['y3', 'y4', 'o4'][Math.abs(lamp) % 3]);
  g.rect(lx - 3, ly + 5, 7, 1, 'g2');
  // casaco comprido
  part(g, (C) => {
    C.poly([[X - 8, 24 + Y], [X + 8, 22 + Y], [X + 12, 58 + Y], [X - 12, 58 + Y]], 'g2');
    C.rect(X - 9, 58 + Y, 7, 2, 'k2'); C.rect(X + 3, 58 + Y, 7, 2, 'k2');
  }, { depth: 2 });
  g.line(X - 1, 26 + Y, X - 3, 56 + Y, 'g1');
  for (let i = 0; i < 3; i++) g.set(X - 2 - i, 32 + Y + i * 8, 'y2'); // botões
  // cabeça curvada para a frente
  const hx = X - 7, hy = 20 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => {
    H.ellipse(hx, hy, 7, 7, 's4');
    H.poly([[hx - 7, hy + 3], [hx + 4, hy + 3], [hx + 2, hy + 12], [hx - 4, hy + 13]], 'g5'); // barba
  });
  part(g, (Hat) => {
    Hat.rect(hx - 12, hy - 7, 22, 3, 'm2');
    Hat.rect(hx - 6, hy - 15, 11, 9, 'm2');
  });
  g.rect(hx - 6, hy - 8, 11, 1, 'r2'); // fita do chapéu
  if (mood === 'hurt') g.line(hx - 4, hy - 1, hx - 1, hy + 1, 'k');
  else { g.rect(hx - 4, hy - 1, 2, 2, 'k'); g.set(hx - 4, hy - 1, 'w'); }
  g.set(hx - 7, hy + 1, 's3'); // nariz
  if (mood === 'attack') g.rect(hx - 4, hy + 4, 4, 2, 'k2');
  // pá
  const grip = shovel === 'up' ? [X - 8, 22 + Y] : shovel === 'swing' ? [X - 14, 34 + Y] : [X - 10, 36 + Y];
  const blade = shovel === 'up' ? [X - 4, 2 + Y] : shovel === 'swing' ? [X - 28, 46 + Y] : [X - 14, 58 + Y];
  g.stroke(grip[0], grip[1], blade[0], blade[1], 2, 'm3');
  part(g, (S) => S.ellipse(blade[0], blade[1], 4, 3, 't4'), { outline: 'k' });
  part(g, (A) => A.stroke(X - 4, 28 + Y, grip[0], grip[1], 4, 'g2'));
  g.rect(grip[0] - 1, grip[1] - 1, 3, 3, 's4');
  g.outline('k');
  return g;
}

const coveiro = () => sheets(gravedigger, {
  idle: [{ lamp: 0 }, { lamp: 1, dy: 1 }, { lamp: 2, dy: 1 }, { lamp: 1 }],
  attack: [{ shovel: 'up', dx: 2, lamp: 2 }, { shovel: 'up', dx: -1, mood: 'attack' }, { shovel: 'swing', dx: -6, mood: 'attack', lamp: 1 }, { dx: -2 }],
  hurt: [{ dx: 4, mood: 'hurt', lamp: -1 }, { dx: 2, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  RELOJOEIRO (chefe) — corpo de latão, cabeça de relógio e pêndulo
// ═══════════════════════════════════════════════════════════════
function clockmaker({ dx = 0, dy = 0, tick = 0, swing = 0, arm = 'down', mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // engrenagem de trás girando
  const gear = (cx, cy, r, c, t) => {
    g.circle(cx, cy, r, c);
    for (let i = 0; i < 8; i++) {
      const a = t * 0.4 + i * Math.PI / 4;
      g.rect(Math.round(cx + Math.cos(a) * (r + 1)) - 1, Math.round(cy + Math.sin(a) * (r + 1)) - 1, 3, 3, c);
    }
    g.circle(cx, cy, 2, 'k2');
  };
  gear(X + 13, 30 + Y, 6, 'o2', tick);
  // corpo (caixa de relógio de pé)
  part(g, (B) => {
    B.rect(X - 9, 26 + Y, 19, 28, 'y2');
    B.rect(X - 11, 54 + Y, 23, 5, 'y1');
  }, { depth: 2 });
  g.rect(X - 6, 32 + Y, 13, 18, 'k2'); // janela do pêndulo
  const px = X + Math.round(swing * 4);
  g.line(X, 32 + Y, px, 45 + Y, 'y3');
  g.circle(px, 46 + Y, 3, 'y3'); g.set(px - 1, 45 + Y, 'y4');
  gear(X - 6, 52 + Y, 3, 'o3', -tick);
  // cabeça: mostrador
  const hy = 15 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => H.circle(X, hy, 10, 'y2'), { depth: 2 });
  g.circle(X, hy, 8, 'q4');
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.set(Math.round(X + Math.cos(a) * 7), Math.round(hy + Math.sin(a) * 7), 'g3');
  }
  const ah = -Math.PI / 2 + tick * Math.PI / 6, am = -Math.PI / 2 - tick * Math.PI / 3;
  g.line(X, hy, Math.round(X + Math.cos(ah) * 4), Math.round(hy + Math.sin(ah) * 4), 'k');
  g.line(X, hy, Math.round(X + Math.cos(am) * 6), Math.round(hy + Math.sin(am) * 6), 'r3');
  if (mood === 'hurt') g.line(X - 6, hy - 6, X + 6, hy + 6, 'g2');
  else { g.rect(X - 5, hy - 3, 2, 2, 'p3'); g.rect(X + 3, hy - 3, 2, 2, 'p3'); }
  g.rect(X - 1, hy - 13, 3, 3, 'y3'); // sininho no topo
  // braço com a chave de corda
  const hand = arm === 'up' ? [X - 14, 12 + Y] : arm === 'forward' ? [X - 22, 30 + Y] : [X - 13, 40 + Y];
  part(g, (A) => A.stroke(X - 8, 29 + Y, hand[0], hand[1], 4, 'y1'));
  g.circle(hand[0] - 2, hand[1], 3, 'g4'); g.circle(hand[0] - 2, hand[1], 1, 'k2');
  g.rect(hand[0] - 3, hand[1] + 2, 2, 5, 'g4');
  g.outline('k');
  return g;
}

const relojoeiro = () => sheets(clockmaker, {
  idle: [{ tick: 0, swing: -1 }, { tick: 1, swing: 0 }, { tick: 2, swing: 1 }, { tick: 3, swing: 0 }],
  attack: [{ tick: 4, arm: 'up', dx: 2 }, { tick: 5, arm: 'up', dx: -2, mood: 'attack' }, { tick: 6, arm: 'forward', dx: -6, swing: -1, mood: 'attack' }, { tick: 7, dx: -2 }],
  hurt: [{ tick: 9, dx: 4, swing: 1, mood: 'hurt' }, { tick: 9, dx: 2, swing: -1, mood: 'hurt' }],
});

// ═══════════════════════════════════════════════════════════════
//  MORGANA (chefe final) — a Rainha Banshee, coroa e vestido roxo
// ═══════════════════════════════════════════════════════════════
function queen({ dx = 0, dy = 0, wave = 0, arms = 0, glow = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // cabelo branco esvoaçando
  for (let i = 0; i < 6; i++) {
    const y0 = 10 + i * 4 + Y;
    g.stroke(X + 3, y0, X + 16 + i + Math.round(Math.sin(wave + i * 0.8) * 2), y0 + 12, 3, i % 2 ? 'q4' : 'q3');
  }
  // vestido que vira fumaça
  part(g, (D) => {
    D.poly([[X - 8, 24 + Y], [X + 8, 24 + Y], [X + 14, 44 + Y], [X + 20, 58 + Y + Math.round(Math.sin(wave) * 2)],
      [X + 6, 54 + Y], [X - 4, 58 + Y + Math.round(Math.cos(wave) * 2)], [X - 12, 46 + Y]], 'p3');
  }, { depth: 2 });
  g.poly([[X - 3, 24 + Y], [X + 3, 24 + Y], [X, 34 + Y]], 'p5'); // decote com joia
  g.set(X, 28 + Y, 'r4');
  // braços (erguidos no ataque)
  const up = arms * 10;
  g.stroke(X - 6, 27 + Y, X - 16, 36 + Y - up, 2, 'gh4');
  g.stroke(X + 6, 27 + Y, X + 12, 38 + Y - up, 2, 'gh4');
  if (arms > 0.5) for (const [x, y] of [[X - 18, 34 - up + Y], [X + 13, 36 - up + Y]]) g.circle(x, y, 2, ['p4', 'p5', 'w'][glow]);
  // rosto
  const hy = 16 + Y + (mood === 'hurt' ? 2 : 0);
  part(g, (H) => H.ellipse(X - 1, hy, 7, 8, 'gh5'));
  if (mood === 'hurt') {
    g.line(X - 5, hy - 1, X - 3, hy + 1, 'k').line(X, hy + 1, X + 2, hy - 1, 'k');
  } else {
    const e = ['p4', 'p5', 'w'][glow];
    g.rect(X - 5, hy - 1, 2, 2, 'p2'); g.rect(X + 1, hy - 1, 2, 2, 'p2');
    g.set(X - 5, hy - 1, e); g.set(X + 1, hy - 1, e);
  }
  if (mood === 'attack') g.ellipse(X - 1, hy + 5, 2, 2, 'k2');
  else g.rect(X - 3, hy + 4, 4, 1, 'p2');
  // coroa
  part(g, (C) => {
    C.rect(X - 7, hy - 9, 13, 3, 'y3');
    C.poly([[X - 7, hy - 9], [X - 5, hy - 14], [X - 3, hy - 9]], 'y3');
    C.poly([[X - 2, hy - 9], [X, hy - 16], [X + 2, hy - 9]], 'y3');
    C.poly([[X + 3, hy - 9], [X + 5, hy - 14], [X + 6, hy - 9]], 'y3');
  });
  g.set(X, hy - 11, 'r3'); g.set(X - 5, hy - 10, 'c4'); g.set(X + 5, hy - 10, 'c4');
  g.outline('k');
  return g;
}

const morgana = () => sheets(queen, {
  idle: [{ wave: 0 }, { wave: 1.5, dy: -1, glow: 1 }, { wave: 3, dy: -2, glow: 2 }, { wave: 4.5, dy: -1, glow: 1 }],
  attack: [{ wave: 0, arms: 0.6, dx: 2, glow: 1 }, { wave: 1, arms: 1, dx: -2, glow: 2, mood: 'attack' }, { wave: 2, arms: 1, dx: -6, glow: 2, mood: 'attack' }, { wave: 3, dx: -2 }],
  hurt: [{ dx: 4, wave: 1, mood: 'hurt' }, { dx: 2, wave: 2, mood: 'hurt' }],
});

export function enemySheets2() {
  return {
    zumbi: zumbi(), corvo: corvo(), esqueleto: esqueleto(), mumia: mumia(),
    lobisomem: lobisomem(), banshee: banshee(),
    coveiro: coveiro(), relojoeiro: relojoeiro(), morgana: morgana(),
  };
}
