// Inimigos. Todos olham para a esquerda (na direção do Caçador).
// Cada um tem: idle (4 frames), attack (4), hurt (2).
import { Grid, sheet, rng } from '../lib/grid.mjs';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════════════════════
//  FANTASMA — lençol pálido com um grande olho vermelho
// ═══════════════════════════════════════════════════════════════
function ghost({ dy = 0, dx = 0, phase = 0, mood = 'idle', arms = 0 } = {}) {
  const g = new Grid();
  const B = new Grid();
  const cx = 32 + dx, cy = 24 + dy;
  const squash = mood === 'hurt' ? 2 : 0;
  B.ellipse(cx, cy, 13 + squash, 12 - squash, 'gh3');
  B.rect(cx - 13 - squash, cy, 27 + squash * 2, 16, 'gh3');
  // cauda ondulada que se arrasta para a direita
  for (let x = cx - 13 - squash; x <= cx + 13 + squash; x++) {
    const t = (x - (cx - 13)) / 26;
    const bottom = cy + 16 + Math.round(2.2 * Math.sin(t * 10 + phase * TAU)) + Math.round(t * 6);
    B.rect(x, cy + 14, 1, bottom - (cy + 14), 'gh3');
  }
  // ponta da cauda
  const tp = Math.round(2 * Math.sin(phase * TAU));
  B.ellipse(cx + 15, cy + 22 + tp, 3, 2, 'gh3');
  B.ellipse(cx + 18, cy + 21 + tp, 2, 2, 'gh3');
  // bracinhos
  const ay = arms ? -3 : Math.round(Math.sin(phase * TAU + 1));
  B.ellipse(cx - 15 - (arms ? 3 : 0), cy + 10 + ay, 3, 2, 'gh3');
  B.ellipse(cx + 13, cy + 11 - ay, 2, 2, 'gh3');
  B.shade({ depth: 2 });
  B.set(cx - 6, cy - 9, 'gh5'); B.set(cx - 5, cy - 10, 'gh5'); B.set(cx - 7, cy - 8, 'gh5');
  g.blit(B);

  // olho
  const ex = cx - 4, ey = cy - 1;
  if (mood === 'hurt') {
    g.line(ex - 3, ey - 3, ex + 3, ey + 3, 'k').line(ex - 3, ey + 3, ex + 3, ey - 3, 'k');
  } else {
    g.ellipse(ex, ey, 5, 5, 'w');
    g.ellipse(ex - 1, ey, 3, 4, 'r3');
    g.ellipse(ex - 1, ey + 1, 2, 2, 'r2');
    g.rect(ex - 1, ey - 2, 1, 5, 'k');
    g.set(ex - 3, ey - 2, 'w'); g.set(ex - 2, ey - 3, 'w');
    if (mood === 'attack') g.rect(ex - 5, ey - 5, 11, 2, 'gh2'); // pálpebra brava
  }
  // boca
  const mx = cx - 8, my = cy + 8;
  if (mood === 'attack') {
    g.ellipse(mx + 4, my + 3, 5, 4, 'k2');
    g.ellipse(mx + 4, my + 4, 3, 2, 'r2');
    for (let i = 0; i < 4; i++) { g.set(mx + 1 + i * 2, my, 'w'); g.set(mx + 2 + i * 2, my + 6, 'w'); }
  } else if (mood === 'hurt') {
    g.rect(mx + 1, my + 2, 7, 2, 'k2');
    g.px([[mx + 2, my + 2], [mx + 4, my + 3], [mx + 6, my + 2]], 'gh4');
  } else {
    g.rect(mx, my, 9, 3, 'k2');
    for (let i = 0; i < 4; i++) g.set(mx + 1 + i * 2, my, 'w');
  }
  g.outline('k');
  return g;
}

function ghostSheets() {
  return {
    idle: sheet([0, 1, 2, 3].map(i => ghost({ dy: [0, -1, -2, -1][i], phase: i / 4 }))),
    attack: sheet([
      ghost({ dx: 2, dy: -2, phase: 0.1, mood: 'attack' }),
      ghost({ dx: -6, dy: 0, phase: 0.3, mood: 'attack', arms: 1 }),
      ghost({ dx: -8, dy: 1, phase: 0.5, mood: 'attack', arms: 1 }),
      ghost({ dx: -2, dy: 0, phase: 0.8, mood: 'idle' }),
    ]),
    hurt: sheet([ghost({ dx: 4, mood: 'hurt', phase: 0.2 }), ghost({ dx: 2, dy: -1, mood: 'hurt', phase: 0.4 })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  FOGO-FÁTUO — chama espiritual ciano com carinha
// ═══════════════════════════════════════════════════════════════
function wisp({ seed = 1, dy = 0, dx = 0, tall = 0, mood = 'idle' } = {}) {
  const r = rng(seed);
  const g = new Grid();
  const cx = 32 + dx, cy = 38 + dy;
  const shrink = mood === 'hurt' ? 2 : 0;
  const layers = [['c2', 12 - shrink, 0], ['c3', 9 - shrink, 3], ['c4', 6 - shrink, 6], ['c5', 3, 8]];
  for (const [c, rad, inset] of layers) {
    g.circle(cx, cy, rad, c);
    // línguas de fogo
    const tongues = 3;
    for (let i = 0; i < tongues; i++) {
      const bx = cx - rad + 3 + i * ((rad * 2 - 6) / (tongues - 1));
      const h = rad + 6 + tall + Math.floor(r() * 6) - inset / 2;
      const lean = mood === 'attack' ? -5 : Math.floor(r() * 3) - 1;
      g.poly([[bx - 3, cy - 2], [bx + 3, cy - 2], [bx + lean, cy - h]], c);
    }
  }
  // faíscas
  for (let i = 0; i < 4; i++) {
    g.set(cx - 14 + Math.floor(r() * 28), cy - 22 - Math.floor(r() * 10) - tall, r() > 0.5 ? 'c4' : 'c3');
  }
  // rosto
  if (mood === 'hurt') {
    g.px([[cx - 6, cy - 1], [cx - 5, cy], [cx - 6, cy + 1], [cx + 2, cy - 1], [cx + 1, cy], [cx + 2, cy + 1]], 'c1');
  } else {
    g.rect(cx - 6, cy - 2, 3, 4, 'c1');
    g.rect(cx + 1, cy - 2, 3, 4, 'c1');
    g.set(cx - 6, cy - 2, 'w'); g.set(cx + 1, cy - 2, 'w');
  }
  if (mood === 'attack') g.ellipse(cx - 2, cy + 5, 3, 2, 'c1');
  else g.rect(cx - 3, cy + 4, 3, 1, 'c1');
  g.outline('c1');
  return g;
}

function wispSheets() {
  return {
    idle: sheet([0, 1, 2, 3].map(i => wisp({ seed: 10 + i, dy: [0, -1, -1, 0][i] }))),
    attack: sheet([
      wisp({ seed: 20, tall: 2, dx: 2, mood: 'attack' }),
      wisp({ seed: 21, tall: 6, dx: -4, mood: 'attack' }),
      wisp({ seed: 22, tall: 8, dx: -8, mood: 'attack' }),
      wisp({ seed: 23, tall: 2, dx: -2 }),
    ]),
    hurt: sheet([wisp({ seed: 30, dx: 4, mood: 'hurt' }), wisp({ seed: 31, dx: 2, mood: 'hurt' })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  MORCEGO VAMPIRO — asas que batem, olhos vermelhos
// ═══════════════════════════════════════════════════════════════
function bat({ wing = 0, dy = 0, dx = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const cx = 32 + dx, cy = 30 + dy;
  // asas: wing -1 (baixo) .. 1 (cima)
  const W = new Grid();
  const tipY = cy - 14 * wing;
  for (const side of [-1, 1]) {
    const reach = mood === 'attack' ? 14 : 24;
    const pts = [
      [cx + side * 4, cy - 4],
      [cx + side * (reach * 0.55), tipY - 4],
      [cx + side * reach, tipY + 2],
      [cx + side * (reach - 3), cy + 8 - wing * 3],
      [cx + side * (reach * 0.6), cy + 5 - wing * 4],
      [cx + side * (reach * 0.35), cy + 9 - wing * 2],
      [cx + side * 4, cy + 5],
    ];
    W.poly(pts, 'p2');
    // ossos da asa
    W.line(cx + side * 4, cy - 3, cx + side * reach, tipY + 2, 'p3');
    W.line(cx + side * (reach * 0.55), tipY - 3, cx + side * (reach * 0.6), cy + 4 - wing * 4, 'p1');
  }
  g.blit(W);
  // corpo
  const B = new Grid();
  B.ellipse(cx, cy + 2, 7, 8, 'p3');
  B.ellipse(cx - 1, cy - 6, 6, 5, 'p3');
  // orelhas
  B.poly([[cx - 6, cy - 8], [cx - 4, cy - 16], [cx - 1, cy - 9]], 'p3');
  B.poly([[cx + 1, cy - 9], [cx + 4, cy - 15], [cx + 5, cy - 7]], 'p3');
  B.shade();
  B.ellipse(cx - 1, cy + 4, 4, 4, 'p4'); // barriga
  g.blit(B);
  // rosto
  if (mood === 'hurt') {
    g.rect(cx - 5, cy - 6, 3, 1, 'k'); g.rect(cx, cy - 6, 3, 1, 'k');
  } else {
    g.rect(cx - 5, cy - 7, 3, 2, 'r3'); g.rect(cx, cy - 7, 3, 2, 'r3');
    g.set(cx - 5, cy - 7, 'r5'); g.set(cx, cy - 7, 'r5');
  }
  if (mood === 'attack') {
    g.rect(cx - 4, cy - 3, 6, 3, 'r1');
    g.px([[cx - 4, cy - 3], [cx + 1, cy - 3], [cx - 4, cy - 2], [cx + 1, cy - 2]], 'w');
  } else {
    g.rect(cx - 3, cy - 3, 4, 1, 'k');
    g.set(cx - 3, cy - 2, 'w'); g.set(cx, cy - 2, 'w');
  }
  // pezinhos
  g.rect(cx - 3, cy + 10, 2, 2, 'p2'); g.rect(cx + 1, cy + 10, 2, 2, 'p2');
  g.outline('k');
  return g;
}

function batSheets() {
  return {
    idle: sheet([
      bat({ wing: 1, dy: 1 }), bat({ wing: 0.3, dy: 0 }), bat({ wing: -0.6, dy: -1 }), bat({ wing: 0.3, dy: 0 }),
    ]),
    attack: sheet([
      bat({ wing: 1, dy: -3, dx: 3, mood: 'attack' }),
      bat({ wing: 0.6, dy: 2, dx: -6, mood: 'attack' }),
      bat({ wing: -0.4, dy: 3, dx: -10, mood: 'attack' }),
      bat({ wing: 0.3, dx: -3 }),
    ]),
    hurt: sheet([bat({ wing: -1, dx: 4, dy: 2, mood: 'hurt' }), bat({ wing: -0.5, dx: 2, dy: 1, mood: 'hurt' })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  GÁRGULA — estátua de pedra agachada com olhos acesos
// ═══════════════════════════════════════════════════════════════
function gargoyle({ wing = 0, glow = 0, dx = 0, dy = 0, mood = 'idle' } = {}) {
  const g = new Grid();
  const X = dx, Y = dy;
  // asa de trás
  const Wg = new Grid();
  const lift = Math.round(wing * 6);
  Wg.poly([[36 + X, 30 + Y], [50 + X, 12 + Y - lift], [58 + X, 14 + Y - lift], [56 + X, 26 + Y - lift / 2], [52 + X, 24 + Y], [48 + X, 34 + Y], [40 + X, 40 + Y]], 't2');
  Wg.line(38 + X, 32 + Y, 56 + X, 15 + Y - lift, 't3');
  Wg.line(50 + X, 13 + Y - lift, 49 + X, 33 + Y, 't1');
  g.blit(Wg);
  // cada parte é sombreada e contornada separadamente para ganhar volume
  const part = (draw) => { const p = new Grid(); draw(p); p.shade({ depth: 2 }); p.outline('t1'); g.blit(p); };
  // corpo agachado
  part(B => {
    B.ellipse(36 + X, 42 + Y, 12, 10, 't3');
    B.rect(26 + X, 50 + Y, 20, 8, 't3');
    B.rect(22 + X, 56 + Y, 10, 3, 't3');
    B.ellipse(33 + X, 44 + Y, 5, 6, 't4'); // peito
  });
  // perna dobrada
  part(L => { L.ellipse(44 + X, 51 + Y, 6, 6, 't3'); L.rect(38 + X, 56 + Y, 12, 3, 't3'); });
  // cabeça
  const hx = (mood === 'attack' ? -4 : 0) + X, hy = Y + (mood === 'hurt' ? 2 : 0);
  part(H => {
    H.poly([[22 + hx, 23 + hy], [27 + hx, 14 + hy], [27 + hx, 24 + hy]], 't4');
    H.poly([[28 + hx, 24 + hy], [34 + hx, 16 + hy], [32 + hx, 27 + hy]], 't4');
    H.ellipse(24 + hx, 30 + hy, 9, 8, 't3');
    H.rect(14 + hx, 31 + hy, 8, 6, 't3'); // focinho
  });
  // braço
  part(A => A.stroke(30 + X, 40 + Y, 22 + X + (mood === 'attack' ? -6 : 0), 50 + Y, 4, 't3'));
  // garras
  const cxw = 20 + X + (mood === 'attack' ? -6 : 0);
  g.px([[cxw, 52 + Y], [cxw + 2, 53 + Y], [cxw + 4, 53 + Y]], 'g5');
  g.px([[21 + X, 59 + Y], [23 + X, 59 + Y], [25 + X, 59 + Y]], 'g5');
  // olhos e boca
  const eyeC = ['y2', 'y3', 'y4'][glow];
  if (mood === 'hurt') {
    g.rect(18 + hx, 28 + hy, 4, 1, 'k'); g.rect(24 + hx, 28 + hy, 3, 1, 'k');
    g.line(26 + hx, 22 + hy, 30 + hx, 30 + hy, 't1'); g.line(36 + X, 36 + Y, 40 + X, 44 + Y, 't1');
  } else {
    g.rect(18 + hx, 27 + hy, 4, 2, eyeC); g.rect(24 + hx, 27 + hy, 3, 2, eyeC);
    g.set(17 + hx, 26 + hy, 'k'); g.set(22 + hx, 26 + hy, 'k');
  }
  if (mood === 'attack') {
    g.rect(14 + hx, 34 + hy, 9, 4, 'k2');
    g.px([[15 + hx, 34 + hy], [17 + hx, 34 + hy], [19 + hx, 34 + hy], [16 + hx, 37 + hy], [18 + hx, 37 + hy]], 'w');
  } else {
    g.rect(14 + hx, 35 + hy, 7, 1, 'k2');
    g.set(15 + hx, 34 + hy, 'g5'); g.set(19 + hx, 34 + hy, 'g5');
  }
  g.set(14 + hx, 32 + hy, 'k2'); // narina
  // musgo
  g.px([[30 + X, 34 + Y], [31 + X, 35 + Y], [40 + X, 47 + Y], [41 + X, 47 + Y], [27 + X, 57 + Y]], 'v3');
  g.outline('k');
  return g;
}

function gargoyleSheets() {
  return {
    idle: sheet([
      gargoyle({ glow: 0 }), gargoyle({ glow: 1, wing: 0.2 }), gargoyle({ glow: 2, wing: 0.4 }), gargoyle({ glow: 1, wing: 0.2 }),
    ]),
    attack: sheet([
      gargoyle({ glow: 2, wing: 1, dy: -2, dx: 2, mood: 'attack' }),
      gargoyle({ glow: 2, wing: 1, dx: -4, mood: 'attack' }),
      gargoyle({ glow: 2, wing: 0.6, dx: -7, dy: 1, mood: 'attack' }),
      gargoyle({ glow: 1, wing: 0.2, dx: -2 }),
    ]),
    hurt: sheet([gargoyle({ dx: 3, mood: 'hurt' }), gargoyle({ dx: 2, mood: 'hurt', wing: -0.3 })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  BONECA POSSUÍDA — porcelana rachada, vestido vermelho
// ═══════════════════════════════════════════════════════════════
function doll({ dy = 0, dx = 0, tilt = 0, mood = 'idle', glow = 0 } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // vestido
  const D = new Grid();
  D.poly([[X - 6, 34 + Y], [X + 6, 34 + Y], [X + 13, 54 + Y], [X - 13, 54 + Y]], 'r2');
  for (let i = -12; i <= 12; i += 4) D.rect(X + i, 54 + Y, 3, 2, 'r2'); // babado
  D.shade();
  D.rect(X - 6, 34 + Y, 12, 3, 'w');     // gola
  D.rect(X - 1, 37 + Y, 2, 2, 'y3');     // broche
  g.blit(D);
  // braços
  const armY = mood === 'attack' ? -6 : 0;
  g.stroke(X - 7, 38 + Y, X - 12 - (mood === 'attack' ? 4 : 0), 46 + Y + armY, 3, 'q3');
  g.stroke(X + 7, 38 + Y, X + 11, 46 + Y, 3, 'q3');
  // pernas
  g.rect(X - 5, 56 + Y, 3, 3, 'q3'); g.rect(X + 2, 56 + Y, 3, 3, 'q3');
  g.rect(X - 6, 59 + Y, 4, 1, 'k2'); g.rect(X + 2, 59 + Y, 4, 1, 'k2');
  // cabeça (com inclinação)
  const H = new Grid();
  const hx = X + tilt, hy = 20 + Y;
  H.ellipse(hx, hy, 11, 11, 'm2');                 // cabelo atrás
  H.ellipse(hx - 13, hy + 6, 4, 6, 'm2');          // marias-chiquinhas
  H.ellipse(hx + 13, hy + 6, 4, 6, 'm2');
  H.shade({ light: 1, dark: 1 });
  const F = new Grid();
  F.ellipse(hx - 1, hy + 2, 9, 9, 'q3');
  F.shade();
  H.blit(F);
  H.poly([[hx - 11, hy - 4], [hx + 8, hy - 9], [hx + 11, hy - 1], [hx - 2, hy - 4]], 'm3'); // franja
  H.rect(hx - 13, hy + 1, 3, 2, 'r3'); H.rect(hx + 11, hy + 1, 3, 2, 'r3'); // laços
  // olhos de botão
  const eye = ['r2', 'r3', 'r4'][glow];
  if (mood === 'hurt') {
    H.rect(hx - 7, hy + 1, 4, 1, 'k'); H.rect(hx + 1, hy + 1, 4, 1, 'k');
  } else {
    H.circle(hx - 5, hy + 1, 2, 'k'); H.circle(hx + 3, hy + 1, 2, 'k');
    H.set(hx - 5, hy + 1, eye); H.set(hx + 3, hy + 1, eye);
  }
  H.set(hx - 9, hy + 5, 'r4'); H.set(hx + 5, hy + 5, 'r4'); // bochechas
  // boca costurada
  if (mood === 'attack') {
    H.ellipse(hx - 1, hy + 7, 4, 3, 'k2');
    H.px([[hx - 4, hy + 5], [hx - 2, hy + 5], [hx, hy + 5], [hx + 2, hy + 5]], 'w');
  } else {
    H.rect(hx - 4, hy + 7, 7, 1, 'k2');
    for (let i = -3; i <= 2; i += 2) H.set(hx + i, hy + 8, 'k2');
  }
  // rachadura
  H.line(hx + 2, hy - 6, hx + 4, hy - 2, 'q1').line(hx + 4, hy - 2, hx + 3, hy, 'q1');
  if (mood === 'hurt') H.line(hx - 6, hy + 3, hx - 2, hy + 9, 'q1');
  g.blit(H);
  g.outline('k');
  return g;
}

function dollSheets() {
  return {
    idle: sheet([
      doll({ tilt: 0 }), doll({ tilt: 1, dy: -1, glow: 1 }), doll({ tilt: 2, dy: -1, glow: 2 }), doll({ tilt: 1, glow: 1 }),
    ]),
    attack: sheet([
      doll({ tilt: -1, dy: -3, dx: 2, mood: 'attack', glow: 2 }),
      doll({ tilt: -2, dy: -2, dx: -6, mood: 'attack', glow: 2 }),
      doll({ tilt: -2, dx: -9, mood: 'attack', glow: 2 }),
      doll({ tilt: 0, dx: -2, glow: 1 }),
    ]),
    hurt: sheet([doll({ dx: 4, tilt: 3, mood: 'hurt' }), doll({ dx: 2, tilt: 2, mood: 'hurt' })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  ARMADURA ASSOMBRADA — elmo vazio com brilho roxo e espada
// ═══════════════════════════════════════════════════════════════
function armor({ dy = 0, dx = 0, glow = 0, sword = 'down', mood = 'idle' } = {}) {
  const g = new Grid();
  const X = dx, Y = dy;
  // espada (atrás quando erguida)
  const S = new Grid();
  if (sword === 'up') {
    S.stroke(20 + X, 30 + Y, 20 + X, 4 + Y, 3, 'g5');
    S.line(20 + X, 30 + Y, 20 + X, 6 + Y, 'w');
    S.rect(15 + X, 30 + Y, 11, 2, 'y2');
  }
  g.blit(S);
  const A = new Grid();
  // pluma
  A.poly([[34 + X, 9 + Y], [44 + X, 4 + Y], [48 + X, 10 + Y], [40 + X, 13 + Y]], 'r3');
  // elmo
  A.rect(26 + X, 10 + Y, 15, 15, 't4');
  A.ellipse(33 + X, 11 + Y, 7, 4, 't4');
  // ombreiras e peitoral
  A.ellipse(24 + X, 30 + Y, 5, 4, 't4');
  A.ellipse(43 + X, 30 + Y, 5, 4, 't4');
  A.poly([[25 + X, 27 + Y], [42 + X, 27 + Y], [40 + X, 44 + Y], [27 + X, 44 + Y]], 't4');
  // saiote e pernas
  A.poly([[26 + X, 44 + Y], [41 + X, 44 + Y], [43 + X, 49 + Y], [24 + X, 49 + Y]], 't3');
  A.rect(27 + X, 49 + Y, 5, 8, 't4');
  A.rect(36 + X, 49 + Y, 5, 8, 't4');
  A.rect(25 + X, 57 + Y, 8, 3, 't3');
  A.rect(35 + X, 57 + Y, 8, 3, 't3');
  // braço da frente
  const handX = sword === 'forward' ? 12 : sword === 'up' ? 20 : 22;
  const handY = sword === 'forward' ? 34 : sword === 'up' ? 31 : 42;
  A.stroke(25 + X, 31 + Y, handX + X, handY + Y, 4, 't3');
  A.shade({ depth: 1 });
  // detalhes
  A.rect(27 + X, 33 + Y, 13, 1, 't2');
  A.rect(33 + X, 28 + Y, 1, 15, 't2');
  A.rect(26 + X, 22 + Y, 15, 1, 't2');
  g.blit(A);
  // visor com brilho fantasma
  const vc = ['p3', 'p4', 'p5'][glow];
  g.rect(27 + X, 16 + Y, 13, 3, 'k');
  if (mood === 'hurt') {
    g.rect(28 + X, 17 + Y, 11, 1, 'p2');
  } else {
    g.rect(28 + X, 17 + Y, 11, 1, vc);
    g.rect(29 + X, 17 + Y, 2, 1, 'w'); g.rect(35 + X, 17 + Y, 2, 1, 'w');
  }
  // fumaça roxa escapando
  g.px([[25 + X, 15 + Y - glow], [24 + X, 13 + Y - glow], [42 + X, 19 + Y], [43 + X, 17 + Y]], `${vc}@70`);
  // espada na frente
  if (sword === 'down') {
    g.stroke(20 + X, 44 + Y, 20 + X, 60 + Y, 3, 'g5');
    g.line(21 + X, 46 + Y, 21 + X, 60 + Y, 'g4');
    g.rect(16 + X, 41 + Y, 9, 2, 'y2');
    g.rect(19 + X, 37 + Y, 3, 4, 'm3');
  } else if (sword === 'forward') {
    g.stroke(10 + X, 34 + Y, -2 + X, 36 + Y, 3, 'g5');
    g.line(10 + X, 33 + Y, 0 + X, 35 + Y, 'w');
    g.rect(11 + X, 30 + Y, 2, 9, 'y2');
    g.rect(13 + X, 33 + Y, 4, 3, 'm3');
  }
  g.outline('k');
  return g;
}

function armorSheets() {
  return {
    idle: sheet([
      armor({ glow: 0 }), armor({ glow: 1 }), armor({ glow: 2, dy: -1 }), armor({ glow: 1, dy: -1 }),
    ]),
    attack: sheet([
      armor({ glow: 2, sword: 'up', dx: 2 }),
      armor({ glow: 2, sword: 'up', dx: -2, dy: -1 }),
      armor({ glow: 2, sword: 'forward', dx: -6 }),
      armor({ glow: 1, dx: -2 }),
    ]),
    hurt: sheet([armor({ dx: 4, mood: 'hurt' }), armor({ dx: 2, mood: 'hurt', glow: 0 })]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  KASTLE — o Bobo da Corte das trevas (chefe final)
// ═══════════════════════════════════════════════════════════════
function kastle({ dy = 0, dx = 0, mouth = 0, bells = 0, mood = 'idle', glow = 0 } = {}) {
  const g = new Grid();
  const X = 32 + dx, Y = dy;
  // corpo curvo amarelo (como uma cauda de cobra)
  const B = new Grid();
  B.poly([[X - 4, 36 + Y], [X + 5, 36 + Y], [X + 9, 46 + Y], [X + 18, 54 + Y], [X + 20, 59 + Y], [X - 2, 59 + Y], [X - 8, 54 + Y], [X - 4, 46 + Y]], 'y2');
  B.shade({ depth: 2 });
  for (let i = 0; i < 4; i++) B.rect(X - 4 + i * 4, 42 + Y + i * 4, 3, 1, 'c2'); // listras
  g.blit(B);
  // gola com babados
  for (let i = -3; i <= 3; i++) g.circle(X + i * 3, 36 + Y, 2, i % 2 ? 'p4' : 'w');
  // cabeça
  const open = mouth;
  const hy = 24 + Y - Math.round(open * 2);
  const H = new Grid();
  H.ellipse(X, hy + 2, 12 + Math.round(open * 3), 10 + Math.round(open * 3), 'k2');
  H.shade({ light: 1, dark: 0 });
  g.blit(H);
  // chapéu de bobo (três pontas)
  const C = new Grid();
  const hw = 14 + Math.round(open * 3);
  C.poly([[X - hw, hy - 4], [X + hw, hy - 4], [X + hw - 2, hy - 9], [X - hw + 2, hy - 9]], 'c3');
  C.poly([[X - hw + 2, hy - 8], [X - 4, hy - 9], [X - 20 - bells, hy + 4 + bells]], 'c3');
  C.poly([[X + 4, hy - 9], [X + hw - 2, hy - 8], [X + 21 + bells, hy + 3 - bells]], 'c3');
  C.poly([[X - 5, hy - 8], [X + 5, hy - 8], [X + 2, hy - 16 - bells]], 'c3');
  C.shade();
  C.rect(X - hw, hy - 5, hw * 2 + 1, 2, 'y3'); // faixa dourada
  g.blit(C);
  // guizos
  g.circle(X - 21 - bells, hy + 5 + bells, 2, 'p4');
  g.circle(X + 22 + bells, hy + 4 - bells, 2, 'p4');
  g.circle(X + 2, hy - 17 - bells, 2, 'p4');
  g.px([[X - 22 - bells, hy + 4 + bells], [X + 21 + bells, hy + 3 - bells], [X + 1, hy - 18 - bells]], 'p5');
  // olhos rosados
  const ec = ['p4', 'p5', 'w'][glow];
  if (mood === 'hurt') {
    g.line(X - 7, hy - 1, X - 3, hy + 1, ec).line(X + 1, hy + 1, X + 5, hy - 1, ec);
  } else {
    g.circle(X - 5, hy, 2, 'p3'); g.circle(X + 3, hy, 2, 'p3');
    g.set(X - 5, hy, ec); g.set(X + 3, hy, ec);
    g.set(X - 6, hy - 1, 'w'); g.set(X + 2, hy - 1, 'w');
  }
  // bocarra
  const mw = 7 + Math.round(open * 6), mh = 1 + Math.round(open * 9);
  const my = hy + 5;
  g.rect(X - mw, my, mw * 2, mh + 1, 'r1');
  if (open > 0.3) g.rect(X - mw + 1, my + 1, mw * 2 - 2, mh - 1, 'r2');
  for (let x = X - mw; x < X + mw; x += 2) {
    g.set(x, my, 'w');
    g.set(x + 1, my + mh, 'w');
  }
  if (open > 0.5) for (let x = X - mw + 1; x < X + mw; x += 3) g.rect(x, my + 1, 1, mh - 1, 'o3'); // grades da boca
  g.outline('k');
  return g;
}

function kastleSheets() {
  return {
    idle: sheet([
      kastle({ glow: 0, bells: 0 }), kastle({ glow: 1, bells: 1, dy: -1 }), kastle({ glow: 2, bells: 1, dy: -1, mouth: 0.1 }), kastle({ glow: 1, bells: 0 }),
    ]),
    attack: sheet([
      kastle({ mouth: 0.4, glow: 2, dx: 2, bells: 2 }),
      kastle({ mouth: 1, glow: 2, dx: -2, bells: 2, dy: 1 }),
      kastle({ mouth: 1, glow: 2, dx: -5, bells: 1, dy: 2 }),
      kastle({ mouth: 0.2, glow: 1, dx: -1 }),
    ]),
    hurt: sheet([kastle({ dx: 3, mood: 'hurt', mouth: 0.3 }), kastle({ dx: 2, mood: 'hurt', bells: 1 })]),
  };
}

export function enemySheets() {
  return {
    fantasma: ghostSheets(),
    fogo_fatuo: wispSheets(),
    morcego: batSheets(),
    gargula: gargoyleSheets(),
    boneca: dollSheets(),
    armadura: armorSheets(),
    kastle: kastleSheets(),
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
