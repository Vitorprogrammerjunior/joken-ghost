// Ícones do Ateliê (editor de avatar em pixel art) e a nota do aviso de música.
import { Grid } from '../lib/grid.mjs';

const finish = (g, { shade = true } = {}) => {
  if (shade) g.shade();
  g.outline('k');
  return g;
};

/** Barra diagonal com largura `w` entre dois pontos. */
function bar(g, x0, y0, x1, y1, w, c) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len * w / 2, ny = (x1 - x0) / len * w / 2;
  g.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
}

/** Colcheia: a música que está tocando. */
function nota() {
  const g = new Grid();
  g.ellipse(22, 48, 9, 7, 'c4');
  g.rect(28, 12, 4, 37, 'c4');
  g.poly([[30, 12], [48, 20], [48, 30], [32, 22]], 'c4');
  g.shade({ depth: 2 });
  g.px([[18, 45], [19, 44]], 'w');
  return finish(g, { shade: false });
}

function pincel() {
  const g = new Grid();
  bar(g, 50, 10, 30, 32, 8, 'm4');
  g.poly([[26, 32], [32, 38], [30, 40], [24, 34]], 't4');
  g.poly([[24, 36], [28, 40], [18, 54], [10, 56], [12, 48]], 'r3');
  g.shade({ depth: 2 });
  g.px([[14, 50], [16, 48]], 'r5');
  return finish(g, { shade: false });
}

function borracha() {
  const g = new Grid();
  g.poly([[10, 40], [32, 18], [54, 34], [32, 56]], 'r4');
  g.poly([[10, 40], [21, 29], [43, 45], [32, 56]], 'q3');
  g.shade({ depth: 2 });
  g.line(21, 29, 43, 45, 'k2');
  return finish(g, { shade: false });
}

function balde() {
  const g = new Grid();
  g.poly([[14, 22], [46, 22], [42, 54], [18, 54]], 't4');
  g.shade({ depth: 2 });
  g.ellipse(30, 22, 16, 5, 't2');
  g.ellipse(30, 22, 13, 3, 'b3');
  const handle = new Grid();
  handle.ring(30, 22, 17, 2, 'g4');
  handle.erase((x, y) => y > 20);
  g.blit(handle);
  // tinta escorrendo
  g.poly([[44, 22], [52, 26], [54, 40], [50, 44], [48, 30]], 'b3');
  g.circle(52, 48, 3, 'b4');
  return finish(g, { shade: false });
}

function contaGotas() {
  const g = new Grid();
  bar(g, 46, 18, 22, 42, 7, 'gh3');
  g.circle(50, 14, 7, 'r3');
  g.poly([[18, 42], [22, 46], [12, 54], [10, 52]], 'g4');
  g.shade({ depth: 2 });
  g.circle(10, 58, 3, 'b4');
  return finish(g, { shade: false });
}

/** Espelho: desenha dos dois lados de uma vez. */
function espelho() {
  const g = new Grid();
  g.rect(31, 6, 2, 52, 'y3');
  g.poly([[26, 16], [8, 32], [26, 48]], 'p4');
  g.poly([[38, 16], [56, 32], [38, 48]], 'p2');
  g.shade({ depth: 2 });
  return finish(g, { shade: false });
}

function seta(dir) {
  const g = new Grid();
  g.ring(32, 36, 16, 6, 'w');
  g.erase((x, y) => y > 36);
  if (dir === 'undo') g.poly([[6, 34], [26, 34], [16, 50]], 'w');
  else g.poly([[58, 34], [38, 34], [48, 50]], 'w');
  return finish(g);
}

function lixeira() {
  const g = new Grid();
  g.poly([[16, 20], [48, 20], [44, 56], [20, 56]], 't4');
  g.shade({ depth: 2 });
  for (const x of [25, 32, 39]) g.rect(x, 26, 2, 24, 't2');
  g.rect(12, 14, 40, 5, 't5');
  g.rect(26, 9, 12, 5, 't5');
  return finish(g, { shade: false });
}

/** Mostrar/esconder as linhas da grade. */
function grade() {
  const g = new Grid();
  g.rect(10, 10, 44, 44, 'k2');
  for (let i = 0; i <= 4; i++) {
    g.rect(10 + i * 11, 10, 2, 44, 'g4');
    g.rect(10, 10 + i * 11, 44, 2, 'g4');
  }
  g.rect(23, 23, 9, 9, 'y3');
  g.rect(34, 34, 9, 9, 'c4');
  return finish(g, { shade: false });
}

export function editorIconSheets() {
  return {
    nota: nota(), pincel: pincel(), borracha: borracha(), balde: balde(), conta_gotas: contaGotas(),
    espelho: espelho(), desfazer: seta('undo'), refazer: seta('redo'), lixeira: lixeira(), grade: grade(),
  };
}
