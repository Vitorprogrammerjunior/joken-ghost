// O Caçador: cabelo black power, jaqueta roxa com raio amarelo,
// mochila-aspirador de fantasmas nas costas. Olha para a direita.
import { Grid, sheet } from '../lib/grid.mjs';

function hunter({
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
  const by = kneel ? 6 : 0; // corpo abaixa ao ajoelhar

  // ── pernas ──────────────────────────────────────────
  const L = new Grid();
  if (legs === 'kneel') {
    L.stroke(27, 53, 25, 56, 5, 'b2');    // joelho de trás no chão
    L.rect(16, 56, 10, 3, 'b2');
    L.rect(12, 55, 5, 4, 'r2');
    L.stroke(34, 53, 39, 53, 5, 'b3');    // perna da frente dobrada
    L.stroke(40, 53, 40, 56, 5, 'b3');
    L.rect(38, 57, 8, 2, 'r3');
    L.rect(38, 59, 8, 1, 'g5');
  } else {
    const fx = legs === 'lunge' ? 4 : 0;
    const bx = legs === 'lunge' ? -2 : 0;
    L.poly([[25 + bx, 47], [30 + bx, 47], [30 + bx, 57], [25 + bx, 57]], 'b2');
    L.poly([[31, 47], [36, 47], [36 + fx, 57], [31 + fx, 57]], 'b3');
    // tênis vermelhos
    L.rect(23 + bx, 56, 8, 3, 'r2');
    L.rect(31 + fx, 56, 9, 3, 'r3');
    L.rect(23 + bx, 59, 8, 1, 'g4');
    L.rect(31 + fx, 59, 9, 1, 'g5');
    L.set(38 + fx, 56, 'w'); // cadarço
  }
  L.shade();
  out.blit(L);

  // ── tudo acima da cintura se move junto ────────────────
  const U = new Grid();
  const X = ux, Y = uy + by;

  // mangueira atrás de tudo
  if (arm !== 'up') {
    U.stroke(19 + X, 47 + Y, 25 + X, 51 + Y, 2, 'g2');
    U.stroke(25 + X, 51 + Y, 33 + X, 49 + Y, 2, 'g2');
  }

  // mochila-aspirador
  const P = new Grid();
  P.rect(12 + X, 31 + Y, 13, 17, 'g3');
  P.rect(13 + X, 30 + Y, 11, 1, 'g3');
  P.rect(13 + X, 48 + Y, 11, 1, 'g3');
  P.rect(14 + X, 44 + Y, 9, 2, 'g2');          // grade
  P.shade();
  const glowC = ['v4', 'v5', 'v6'][glow];
  P.rect(15 + X, 34 + Y, 7, 7, 'v2');
  P.rect(16 + X, 35 + Y, 5, 5, glowC);
  P.rect(17 + X, 36 + Y, 2, 2, glow ? 'w' : 'v6');
  P.set(13 + X, 32 + Y, 'r3');                 // led
  U.blit(P);

  // tronco
  const T = new Grid();
  T.poly([[23 + X, 34 + Y], [26 + X, 32 + Y], [36 + X, 32 + Y], [39 + X, 35 + Y], [38 + X, 47 + Y], [24 + X, 47 + Y]], 'p3');
  T.rect(35 + X, 33 + Y, 3, 13, 'w');          // camiseta aparecendo
  T.shade();
  // raio amarelo
  T.line(24 + X, 39 + Y, 28 + X, 37 + Y, 'y3');
  T.line(28 + X, 37 + Y, 29 + X, 41 + Y, 'y3');
  T.line(29 + X, 41 + Y, 34 + X, 38 + Y, 'y3');
  T.line(24 + X, 40 + Y, 28 + X, 38 + Y, 'y2');
  T.line(28 + X, 38 + Y, 29 + X, 42 + Y, 'y2');
  T.line(29 + X, 42 + Y, 34 + X, 39 + Y, 'y2');
  T.rect(24 + X, 45 + Y, 14, 2, 'm2');         // cinto
  T.set(33 + X, 45 + Y, 'y3');
  // alça da mochila
  T.line(27 + X, 32 + Y, 26 + X, 45 + Y, 'm3');
  U.blit(T);

  // cabeça
  const H = new Grid();
  const hx = X + (arm === 'down' ? 1 : 0), hy = Y + (eyes === 'x' ? 2 : 0);

  // cabelo black power (atrás do rosto)
  const Hr = new Grid();
  Hr.ellipse(28 + hx, 18 + hy, 10, 8, 'k2');
  Hr.ellipse(24 + hx, 24 + hy, 5, 5, 'k2');
  for (const [cx, cy, r] of [[20, 15, 3], [25, 11, 3], [31, 10, 3], [36, 13, 3], [19, 21, 3], [21, 27, 2]]) {
    Hr.circle(cx + hx, cy + hy, r, 'k2');
  }
  Hr.shade({ light: 1, dark: 0 });
  for (const [cx, cy] of [[23, 13], [28, 11], [33, 12], [21, 18], [26, 16], [30, 15], [20, 23], [24, 20], [35, 15]]) {
    Hr.set(cx + hx, cy + hy, 'g2');
  }
  H.blit(Hr);

  const F = new Grid();
  F.rect(30 + hx, 30 + hy, 5, 4, 's2');        // pescoço
  F.ellipse(34 + hx, 24 + hy, 7, 7, 's3');     // rosto
  F.shade();
  H.blit(F);
  // franja de cachos sobre a testa
  for (const [cx, cy, r] of [[30, 18, 2], [34, 17, 2], [38, 18, 1.5]]) H.circle(cx + hx, cy + hy, r, 'k2');
  H.set(33 + hx, 16 + hy, 'g2'); H.set(29 + hx, 17 + hy, 'g2');
  H.rect(27 + hx, 24 + hy, 2, 3, 's2');        // orelha
  H.set(28 + hx, 25 + hy, 's1');
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
    else H.rect(ex - 2, ey - 2, 4, 1, 'k');   // sobrancelha
  }
  H.rect(41 + hx, 24 + hy, 1, 3, 's2');        // nariz
  H.set(40 + hx, 26 + hy, 's2');
  const mx = 37 + hx, my = 28 + hy;
  if (mouth === 'open') { H.rect(mx, my, 3, 2, 'r1'); H.set(mx + 1, my, 'w'); }
  else if (mouth === 'smile') { H.rect(mx, my + 1, 3, 1, 'k'); H.set(mx + 3, my, 'k'); H.set(mx - 1, my, 'k'); }
  else if (mouth === 'grit') { H.rect(mx, my, 4, 2, 'w'); H.rect(mx, my + 1, 4, 1, 'g4'); }
  else H.rect(mx + 1, my + 1, 2, 1, 's1');
  U.blit(H);

  // braço da frente + bocal do aspirador
  const A = new Grid();
  const nozzle = (x0, y0, x1, y1) => {
    A.stroke(x0, y0, x1, y1, 3, 'g4');
    A.stroke(x1, y1, x1, y1, 3, 'g2');
  };
  if (arm === 'idle') {
    A.stroke(33 + X, 35 + Y, 36 + X, 42 + Y, 4, 'p3');
    A.circle(37 + X, 44 + Y, 2, 's3');
    nozzle(36 + X, 46 + Y, 44 + X, 45 + Y);
  } else if (arm === 'back') {
    A.stroke(32 + X, 35 + Y, 28 + X, 41 + Y, 4, 'p3');
    A.circle(27 + X, 43 + Y, 2, 's3');
    nozzle(25 + X, 44 + Y, 31 + X, 40 + Y);
  } else if (arm === 'forward') {
    A.stroke(33 + X, 35 + Y, 42 + X, 37 + Y, 4, 'p3');
    A.circle(44 + X, 38 + Y, 2, 's3');
    nozzle(44 + X, 39 + Y, 53 + X, 38 + Y);
  } else if (arm === 'up') {
    A.stroke(34 + X, 35 + Y, 38 + X, 26 + Y, 4, 'p3');
    A.circle(39 + X, 24 + Y, 2, 's3');
    nozzle(40 + X, 23 + Y, 44 + X, 15 + Y);
  } else if (arm === 'down') {
    A.stroke(33 + X, 35 + Y, 35 + X, 44 + Y, 4, 'p3');
    A.circle(35 + X, 46 + Y, 2, 's3');
  }
  A.shade();
  U.blit(A);

  out.blit(U);
  out.outline('k');

  if (flash) {
    const fx = 55 + X, fy = 38 + Y;
    out.circle(fx, fy, 3, 'y4');
    out.circle(fx, fy, 1, 'w');
    out.px([[fx + 5, fy], [fx + 4, fy - 3], [fx + 4, fy + 3], [fx, fy - 5], [fx, fy + 5]], 'y3');
  }
  return out;
}

export function hunterSheets() {
  return {
    idle: sheet([
      hunter({ glow: 0 }),
      hunter({ glow: 1 }),
      hunter({ uy: 1, glow: 2 }),
      hunter({ uy: 1, glow: 1 }),
    ]),
    attack: sheet([
      hunter({ ux: -2, arm: 'back', eyes: 'angry', mouth: 'grit', glow: 1 }),
      hunter({ ux: 3, arm: 'forward', eyes: 'angry', mouth: 'open', legs: 'lunge', glow: 2 }),
      hunter({ ux: 3, arm: 'forward', eyes: 'angry', mouth: 'open', legs: 'lunge', glow: 2, flash: true }),
      hunter({ ux: 1, arm: 'idle', eyes: 'angry', glow: 1 }),
    ]),
    hurt: sheet([
      hunter({ ux: -3, uy: 1, arm: 'down', eyes: 'closed', mouth: 'grit' }),
      hunter({ ux: -2, arm: 'down', eyes: 'closed', mouth: 'open' }),
    ]),
    win: sheet([
      hunter({ arm: 'up', mouth: 'smile', glow: 2 }),
      hunter({ uy: -1, arm: 'up', mouth: 'open', glow: 1 }),
    ]),
    ko: sheet([
      hunter({ arm: 'down', eyes: 'x', mouth: 'open', legs: 'kneel' }),
    ]),
  };
}
