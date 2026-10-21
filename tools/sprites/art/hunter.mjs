// Os Caçadores. Todos compartilham o mesmo desenho; cada personagem troca a paleta
// (jaqueta, cabelo, pele, brilho da mochila...). Duas vistas:
//   side — de lado, olhando para a direita (cenas, mapa e oponente no multiplayer)
//   back — de costas, estilo Pokémon (o jogador em primeiro plano na batalha)
import { Grid, sheet } from '../lib/grid.mjs';

/** Paletas dos personagens (ids iguais aos do servidor multiplayer). */
export const CHARACTERS = {
  cacador: {
    jacket: 'p3', shirt: 'w', emblem: 'raio', emblemC: ['y3', 'y2'], belt: 'm2', strap: 'm3',
    hair: 'k2', hairHi: 'g2', skin: 's3', pants: 'b3', shoes: 'r3', pack: 'g3', glow: ['v4', 'v5', 'v6', 'v2'],
  },
  luna: {
    jacket: 'g5', shirt: 'c3', emblem: 'none', belt: 'g3', strap: 'g3',
    hair: 'r3', hairHi: 'r4', skin: 's5', pants: 'g2', shoes: 'p3', pack: 't4', glow: ['c3', 'c4', 'c5', 'c1'],
  },
  bento: {
    jacket: 'k2', shirt: 'w', emblem: 'cruz', emblemC: ['y3', 'y2'], belt: 'p2', strap: 'm2',
    hair: 'g4', hairHi: 'g5', skin: 's4', pants: 'k2', shoes: 'm2', pack: 'm4', glow: ['y2', 'y3', 'y4', 'y1'],
  },
  helga: {
    jacket: 'r2', shirt: 'm5', emblem: 'none', belt: 'm2', strap: 'm2',
    hair: 'y3', hairHi: 'y4', skin: 's5', pants: 'm2', shoes: 'm3', pack: 'm4', glow: ['r3', 'r4', 'r5', 'r1'],
  },
  ze: {
    jacket: 'v3', shirt: 'y4', emblem: 'raio', emblemC: ['o3', 'o2'], belt: 'm2', strap: 'm3',
    hair: 'g5', hairHi: 'w', skin: 's2', pants: 'm3', shoes: 'k2', pack: 't3', glow: ['o3', 'o4', 'y4', 'o1'],
  },
  sombra: {
    jacket: 'p1', shirt: 'p2', emblem: 'none', belt: 'k2', strap: 'k2',
    hair: 'p2', hairHi: 'p3', skin: 'q2', pants: 'k2', shoes: 'k2', pack: 'g2', glow: ['p3', 'p4', 'p5', 'p1'],
  },
};

const darker = { s5: 's4', s4: 's3', s3: 's2', s2: 's1', s1: 's1', q2: 'q1' };

// ═══════════════════════════════════════════════════════════════
//  VISTA LATERAL
// ═══════════════════════════════════════════════════════════════
function side(C, {
  ux = 0, uy = 0,          // deslocamento do tronco/cabeça
  arm = 'idle',            // idle | back | forward | up | down
  eyes = 'open',           // open | closed | x | angry
  mouth = 'neutral',       // neutral | open | smile | grit
  legs = 'stand',          // stand | lunge | kneel
  glow = 0,                // 0..2 brilho da mochila
  flash = false,           // clarão no bocal
} = {}) {
  const out = new Grid();
  const kneel = legs === 'kneel';
  const by = kneel ? 6 : 0;
  const skinD = darker[C.skin];

  // ── pernas ──────────────────────────────────────────
  const L = new Grid();
  if (kneel) {
    L.stroke(27, 53, 25, 56, 5, C.pants);
    L.rect(16, 56, 10, 3, C.pants);
    L.rect(12, 55, 5, 4, C.shoes);
    L.stroke(34, 53, 39, 53, 5, C.pants);
    L.stroke(40, 53, 40, 56, 5, C.pants);
    L.rect(38, 57, 8, 2, C.shoes);
    L.rect(38, 59, 8, 1, 'g5');
  } else {
    const fx = legs === 'lunge' ? 4 : 0;
    const bx = legs === 'lunge' ? -2 : 0;
    L.poly([[25 + bx, 47], [30 + bx, 47], [30 + bx, 57], [25 + bx, 57]], C.pants);
    L.poly([[31, 47], [36, 47], [36 + fx, 57], [31 + fx, 57]], C.pants);
    L.rect(23 + bx, 56, 8, 3, C.shoes);
    L.rect(31 + fx, 56, 9, 3, C.shoes);
    L.rect(23 + bx, 59, 8, 1, 'g4');
    L.rect(31 + fx, 59, 9, 1, 'g5');
    L.set(38 + fx, 56, 'w');
  }
  L.shade();
  out.blit(L);

  const U = new Grid();
  const X = ux, Y = uy + by;

  if (arm !== 'up') {
    U.stroke(19 + X, 47 + Y, 25 + X, 51 + Y, 2, 'g2');
    U.stroke(25 + X, 51 + Y, 33 + X, 49 + Y, 2, 'g2');
  }

  // mochila-aspirador
  const P = new Grid();
  P.rect(12 + X, 31 + Y, 13, 17, C.pack);
  P.rect(13 + X, 30 + Y, 11, 1, C.pack);
  P.rect(13 + X, 48 + Y, 11, 1, C.pack);
  P.rect(14 + X, 44 + Y, 9, 2, 'g2');
  P.shade();
  P.rect(15 + X, 34 + Y, 7, 7, C.glow[3]);
  P.rect(16 + X, 35 + Y, 5, 5, C.glow[glow]);
  P.rect(17 + X, 36 + Y, 2, 2, glow ? 'w' : C.glow[2]);
  P.set(13 + X, 32 + Y, 'r3');
  U.blit(P);

  // tronco
  const T = new Grid();
  T.poly([[23 + X, 34 + Y], [26 + X, 32 + Y], [36 + X, 32 + Y], [39 + X, 35 + Y], [38 + X, 47 + Y], [24 + X, 47 + Y]], C.jacket);
  T.rect(35 + X, 33 + Y, 3, 13, C.shirt);
  T.shade();
  if (C.emblem === 'raio') {
    const [a, b] = C.emblemC;
    T.line(24 + X, 39 + Y, 28 + X, 37 + Y, a).line(28 + X, 37 + Y, 29 + X, 41 + Y, a).line(29 + X, 41 + Y, 34 + X, 38 + Y, a);
    T.line(24 + X, 40 + Y, 28 + X, 38 + Y, b).line(28 + X, 38 + Y, 29 + X, 42 + Y, b).line(29 + X, 42 + Y, 34 + X, 39 + Y, b);
  } else if (C.emblem === 'cruz') {
    T.rect(31 + X, 35 + Y, 2, 8, C.emblemC[0]);
    T.rect(29 + X, 37 + Y, 6, 2, C.emblemC[0]);
  }
  T.rect(24 + X, 45 + Y, 14, 2, C.belt);
  T.set(33 + X, 45 + Y, 'y3');
  T.line(27 + X, 32 + Y, 26 + X, 45 + Y, C.strap);
  U.blit(T);

  // cabeça
  const H = new Grid();
  const hx = X + (arm === 'down' ? 1 : 0), hy = Y + (eyes === 'x' ? 2 : 0);
  const Hr = new Grid();
  Hr.ellipse(28 + hx, 18 + hy, 10, 8, C.hair);
  Hr.ellipse(24 + hx, 24 + hy, 5, 5, C.hair);
  for (const [cx, cy, r] of [[20, 15, 3], [25, 11, 3], [31, 10, 3], [36, 13, 3], [19, 21, 3], [21, 27, 2]]) {
    Hr.circle(cx + hx, cy + hy, r, C.hair);
  }
  Hr.shade({ light: 1, dark: 0 });
  for (const [cx, cy] of [[23, 13], [28, 11], [33, 12], [21, 18], [26, 16], [30, 15], [20, 23], [24, 20], [35, 15]]) {
    Hr.set(cx + hx, cy + hy, C.hairHi);
  }
  H.blit(Hr);

  const F = new Grid();
  F.rect(30 + hx, 30 + hy, 5, 4, skinD);
  F.ellipse(34 + hx, 24 + hy, 7, 7, C.skin);
  F.shade();
  H.blit(F);
  for (const [cx, cy, r] of [[30, 18, 2], [34, 17, 2], [38, 18, 1.5]]) H.circle(cx + hx, cy + hy, r, C.hair);
  H.set(33 + hx, 16 + hy, C.hairHi); H.set(29 + hx, 17 + hy, C.hairHi);
  H.rect(27 + hx, 24 + hy, 2, 3, skinD);
  // olhos
  const ex = 37 + hx, ey = 22 + hy;
  if (eyes === 'closed') {
    H.rect(ex - 1, ey + 2, 3, 1, 'k');
    H.set(ex - 2, ey + 1, 'k');
  } else if (eyes === 'x') {
    H.px([[ex - 1, ey], [ex + 1, ey], [ex, ey + 1], [ex - 1, ey + 2], [ex + 1, ey + 2]], 'k');
  } else {
    H.rect(ex - 1, ey, 3, 4, 'w');
    H.rect(ex + 1, ey + 1, 1, 2, 'k');
    H.rect(ex, ey + 1, 1, 2, eyes === 'angry' ? 'k' : 'b2');
    if (eyes === 'angry') { H.rect(ex - 2, ey - 1, 3, 1, 'k'); H.set(ex + 1, ey, 'k'); }
    else H.rect(ex - 2, ey - 2, 4, 1, 'k');
  }
  H.rect(41 + hx, 24 + hy, 1, 3, skinD);
  H.set(40 + hx, 26 + hy, skinD);
  const mx = 37 + hx, my = 28 + hy;
  if (mouth === 'open') { H.rect(mx, my, 3, 2, 'r1'); H.set(mx + 1, my, 'w'); }
  else if (mouth === 'smile') { H.rect(mx, my + 1, 3, 1, 'k'); H.set(mx + 3, my, 'k'); H.set(mx - 1, my, 'k'); }
  else if (mouth === 'grit') { H.rect(mx, my, 4, 2, 'w'); H.rect(mx, my + 1, 4, 1, 'g4'); }
  else H.rect(mx + 1, my + 1, 2, 1, darker[skinD] ?? 's1');
  U.blit(H);

  // braço da frente + bocal
  const A = new Grid();
  const nozzle = (x0, y0, x1, y1) => { A.stroke(x0, y0, x1, y1, 3, 'g4'); A.stroke(x1, y1, x1, y1, 3, 'g2'); };
  if (arm === 'idle') {
    A.stroke(33 + X, 35 + Y, 36 + X, 42 + Y, 4, C.jacket);
    A.circle(37 + X, 44 + Y, 2, C.skin);
    nozzle(36 + X, 46 + Y, 44 + X, 45 + Y);
  } else if (arm === 'back') {
    A.stroke(32 + X, 35 + Y, 28 + X, 41 + Y, 4, C.jacket);
    A.circle(27 + X, 43 + Y, 2, C.skin);
    nozzle(25 + X, 44 + Y, 31 + X, 40 + Y);
  } else if (arm === 'forward') {
    A.stroke(33 + X, 35 + Y, 42 + X, 37 + Y, 4, C.jacket);
    A.circle(44 + X, 38 + Y, 2, C.skin);
    nozzle(44 + X, 39 + Y, 53 + X, 38 + Y);
  } else if (arm === 'up') {
    A.stroke(34 + X, 35 + Y, 38 + X, 26 + Y, 4, C.jacket);
    A.circle(39 + X, 24 + Y, 2, C.skin);
    nozzle(40 + X, 23 + Y, 44 + X, 15 + Y);
  } else if (arm === 'down') {
    A.stroke(33 + X, 35 + Y, 35 + X, 44 + Y, 4, C.jacket);
    A.circle(35 + X, 46 + Y, 2, C.skin);
  }
  A.shade();
  U.blit(A);

  out.blit(U);
  out.outline('k');
  if (flash) flashAt(out, 55 + X, 38 + Y);
  return out;
}

function flashAt(g, fx, fy) {
  g.circle(fx, fy, 3, 'y4');
  g.circle(fx, fy, 1, 'w');
  g.px([[fx + 5, fy], [fx + 4, fy - 3], [fx + 4, fy + 3], [fx, fy - 5], [fx, fy + 5]], 'y3');
}

// ═══════════════════════════════════════════════════════════════
//  VISTA DE COSTAS (olhando para o fundo/direita, rumo ao inimigo)
// ═══════════════════════════════════════════════════════════════
function back(C, {
  ux = 0, uy = 0,
  arm = 'aim',             // aim | shoot | down | up
  legs = 'stand',          // stand | wide | kneel
  glow = 0,
  flash = false,
  tilt = 0,                // inclinação da cabeça (dano)
} = {}) {
  const out = new Grid();
  const kneel = legs === 'kneel';
  const X = ux, Y = uy + (kneel ? 7 : 0);
  const skinD = darker[C.skin];

  // ── pernas (vistas de trás: solas aparecendo) ─────────
  const L = new Grid();
  if (kneel) {
    L.rect(21, 52, 8, 5, C.pants); L.rect(33, 52, 8, 5, C.pants);
    L.rect(20, 57, 10, 3, C.shoes); L.rect(32, 57, 10, 3, C.shoes);
    L.rect(20, 59, 10, 1, 'g5'); L.rect(32, 59, 10, 1, 'g5');
  } else {
    const spread = legs === 'wide' ? 2 : 0;
    L.rect(23 - spread, 47, 6, 10, C.pants);
    L.rect(33 + spread, 47, 6, 10, C.pants);
    L.rect(22 - spread, 56, 8, 3, C.shoes);
    L.rect(32 + spread, 56, 8, 3, C.shoes);
    L.rect(22 - spread, 58, 8, 2, 'g5');   // solas
    L.rect(32 + spread, 58, 8, 2, 'g5');
  }
  L.shade();
  out.blit(L);

  const U = new Grid();
  // braço esquerdo (do lado de fora, à esquerda da tela)
  const AL = new Grid();
  if (arm === 'up') {
    AL.stroke(21 + X, 34 + Y, 18 + X, 44 + Y, 5, C.jacket);
    AL.circle(18 + X, 46 + Y, 2, C.skin);
  } else {
    AL.stroke(21 + X, 34 + Y, 17 + X, 45 + Y, 5, C.jacket);
    AL.circle(17 + X, 47 + Y, 2, C.skin);
  }
  AL.shade();
  U.blit(AL);

  // costas da jaqueta
  const T = new Grid();
  T.poly([[19 + X, 36 + Y], [23 + X, 31 + Y], [39 + X, 31 + Y], [43 + X, 36 + Y], [41 + X, 48 + Y], [21 + X, 48 + Y]], C.jacket);
  T.shade({ depth: 2 });
  T.rect(21 + X, 46 + Y, 20, 2, C.belt);
  U.blit(T);

  // mochila-aspirador bem no meio das costas
  const P = new Grid();
  P.rect(23 + X, 32 + Y, 16, 15, C.pack);
  P.rect(24 + X, 31 + Y, 14, 1, C.pack);
  P.rect(24 + X, 47 + Y, 14, 1, C.pack);
  P.shade({ depth: 2 });
  P.rect(26 + X, 34 + Y, 10, 8, C.glow[3]);
  P.rect(27 + X, 35 + Y, 8, 6, C.glow[glow]);
  P.rect(28 + X, 36 + Y, 3, 2, glow ? 'w' : C.glow[2]);
  P.rect(25 + X, 43 + Y, 12, 2, 'g2');            // grade
  P.set(37 + X, 33 + Y, 'r3');                      // led
  U.blit(P);
  // alças por cima dos ombros
  U.rect(25 + X, 29 + Y, 2, 4, C.strap);
  U.rect(35 + X, 29 + Y, 2, 4, C.strap);
  // mangueira saindo da mochila para a mão direita
  if (arm !== 'down') {
    U.stroke(38 + X, 44 + Y, 43 + X, 46 + Y, 2, 'g2');
    U.stroke(43 + X, 46 + Y, 46 + X, 41 + Y, 2, 'g2');
  }

  // cabeça vista de trás: o black power cobre tudo, orelhas aparecendo
  const H = new Grid();
  const hx = X + tilt, hy = Y;
  H.rect(28 + hx, 28 + hy, 6, 4, skinD);              // nuca
  H.rect(19 + hx, 21 + hy, 3, 4, C.skin);             // orelhas
  H.rect(40 + hx, 21 + hy, 3, 4, C.skin);
  const Hr = new Grid();
  Hr.ellipse(31 + hx, 18 + hy, 11, 10, C.hair);
  for (const [cx, cy, r] of [[22, 13, 4], [28, 9, 4], [35, 9, 4], [40, 14, 4], [21, 21, 3], [41, 21, 3], [26, 26, 3], [36, 26, 3]]) {
    Hr.circle(cx + hx, cy + hy, r, C.hair);
  }
  Hr.shade({ light: 1, dark: 1, depth: 2 });
  for (const [cx, cy] of [[25, 12], [30, 10], [35, 12], [23, 18], [28, 16], [33, 15], [38, 18], [27, 22], [34, 22]]) {
    Hr.set(cx + hx, cy + hy, C.hairHi);
  }
  H.blit(Hr);
  U.blit(H);

  // braço direito segurando o bocal
  const A = new Grid();
  const nozzle = (x0, y0, x1, y1) => { A.stroke(x0, y0, x1, y1, 3, 'g4'); A.stroke(x1, y1, x1, y1, 3, 'g2'); };
  let tip = null;
  if (arm === 'aim') {
    A.stroke(41 + X, 34 + Y, 46 + X, 40 + Y, 5, C.jacket);
    A.circle(47 + X, 41 + Y, 2, C.skin);
    nozzle(48 + X, 40 + Y, 53 + X, 34 + Y);
  } else if (arm === 'shoot') {
    A.stroke(41 + X, 33 + Y, 49 + X, 31 + Y, 5, C.jacket);
    A.circle(51 + X, 30 + Y, 2, C.skin);
    nozzle(52 + X, 29 + Y, 57 + X, 23 + Y);
    tip = [59 + X, 21 + Y];
  } else if (arm === 'up') {
    A.stroke(41 + X, 34 + Y, 44 + X, 24 + Y, 5, C.jacket);
    A.circle(44 + X, 21 + Y, 2, C.skin);
    nozzle(45 + X, 19 + Y, 47 + X, 11 + Y);
  } else {
    A.stroke(41 + X, 34 + Y, 44 + X, 45 + Y, 5, C.jacket);
    A.circle(44 + X, 47 + Y, 2, C.skin);
  }
  A.shade();
  U.blit(A);

  out.blit(U);
  out.outline('k');
  if (flash && tip) flashAt(out, tip[0], tip[1]);
  return out;
}

function sideSheets(C) {
  const h = (o) => side(C, o);
  return {
    idle: sheet([h({ glow: 0 }), h({ glow: 1 }), h({ uy: 1, glow: 2 }), h({ uy: 1, glow: 1 })]),
    attack: sheet([
      h({ ux: -2, arm: 'back', eyes: 'angry', mouth: 'grit', glow: 1 }),
      h({ ux: 3, arm: 'forward', eyes: 'angry', mouth: 'open', legs: 'lunge', glow: 2 }),
      h({ ux: 3, arm: 'forward', eyes: 'angry', mouth: 'open', legs: 'lunge', glow: 2, flash: true }),
      h({ ux: 1, arm: 'idle', eyes: 'angry', glow: 1 }),
    ]),
    hurt: sheet([h({ ux: -3, uy: 1, arm: 'down', eyes: 'closed', mouth: 'grit' }), h({ ux: -2, arm: 'down', eyes: 'closed', mouth: 'open' })]),
    win: sheet([h({ arm: 'up', mouth: 'smile', glow: 2 }), h({ uy: -1, arm: 'up', mouth: 'open', glow: 1 })]),
    ko: sheet([h({ arm: 'down', eyes: 'x', mouth: 'open', legs: 'kneel' })]),
  };
}

function backSheets(C) {
  const b = (o) => back(C, o);
  return {
    idle: sheet([b({ glow: 0 }), b({ glow: 1 }), b({ uy: 1, glow: 2 }), b({ uy: 1, glow: 1 })]),
    attack: sheet([
      b({ ux: -2, uy: 1, arm: 'aim', glow: 1 }),
      b({ ux: 2, uy: -2, arm: 'shoot', legs: 'wide', glow: 2 }),
      b({ ux: 2, uy: -2, arm: 'shoot', legs: 'wide', glow: 2, flash: true }),
      b({ ux: 1, arm: 'aim', glow: 1 }),
    ]),
    hurt: sheet([b({ ux: -3, uy: 2, arm: 'down', tilt: -1 }), b({ ux: -2, uy: 1, arm: 'down', tilt: -1 })]),
    win: sheet([b({ arm: 'up', glow: 2 }), b({ uy: -1, arm: 'up', glow: 1 })]),
    ko: sheet([b({ arm: 'down', legs: 'kneel', tilt: 1 })]),
  };
}

/** { personagem: { side: {anim: grid}, back: {anim: grid} } } */
export function characterSheets() {
  const out = {};
  for (const [id, C] of Object.entries(CHARACTERS)) out[id] = { side: sideSheets(C), back: backSheets(C) };
  return out;
}

// prévias
export function previewSide() {
  const o = {};
  for (const [id, v] of Object.entries(characterSheets())) o[id] = v.side.idle;
  return o;
}
export function previewBack() {
  const v = characterSheets().cacador.back;
  const o = { ...v };
  for (const [id, c] of Object.entries(characterSheets())) o[`b_${id}`] = c.back.idle;
  return o;
}
