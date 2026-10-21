// Molduras de interface 64x64 usadas como 9-slice (CSS border-image).
// Cantos ficam dentro de 16px; as bordas são uniformes para poder esticar.
import { Grid } from '../lib/grid.mjs';

/** Retângulo com cantos "cortados" (arredondado em pixel). */
function rounded(g, x, y, w, h, r, c) {
  g.rect(x + r, y, w - r * 2, h, c);
  g.rect(x, y + r, w, h - r * 2, c);
  for (let i = 0; i < r; i++) {
    const cut = r - i;
    g.rect(x + cut, y + i, w - cut * 2, 1, c);
    g.rect(x + cut, y + h - 1 - i, w - cut * 2, 1, c);
  }
  return g;
}

function button({ face = 'm4', light = 'm5', dark = 'm2', pressed = false } = {}) {
  const g = new Grid();
  const lip = pressed ? 0 : 4;
  const top = pressed ? 4 : 0;
  rounded(g, 0, top, 64, 64 - top, 3, 'k');
  rounded(g, 2, top + 2, 60, 60 - top, 2, dark);           // lábio inferior (3D)
  rounded(g, 2, top + 2, 60, 60 - top - lip, 2, face);
  g.rect(4, top + 3, 56, 2, light);                         // brilho superior
  g.rect(3, top + 5, 2, 50 - top - lip, light);
  g.rect(59, top + 5, 2, 50 - top - lip, dark);
  // pregos nos cantos
  for (const [x, y] of [[7, top + 8], [55, top + 8], [7, 54 - lip], [55, 54 - lip]]) {
    g.rect(x, y, 2, 2, 'g3'); g.set(x, y, 'g5');
  }
  return g;
}

function panel() {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 4, 'k');
  rounded(g, 2, 2, 60, 60, 3, 'm3');        // moldura de madeira
  g.rect(4, 4, 56, 1, 'm4');
  g.rect(4, 8, 56, 1, 'm2');                // veio
  g.rect(4, 55, 56, 1, 'm4');
  g.rect(4, 59, 56, 1, 'm2');
  g.rect(4, 4, 1, 56, 'm4'); g.rect(59, 4, 1, 56, 'm2');
  g.rect(8, 4, 1, 56, 'm2'); g.rect(55, 4, 1, 56, 'm4');
  g.rect(10, 10, 44, 44, 'k');              // borda interna
  g.rect(11, 11, 42, 42, 'p1');             // fundo
  g.rect(11, 11, 42, 1, 'k2');
  // cantoneiras de ferro
  for (const [x, y] of [[0, 0], [50, 0], [0, 50], [50, 50]]) {
    g.rect(x + 1, y + 1, 13, 13, 'k');
    g.rect(x + 2, y + 2, 11, 11, 'g3');
    g.rect(x + 2, y + 2, 11, 1, 'g4');
    g.rect(x + 2, y + 12, 11, 1, 'g2');
    g.rect(x + 6, y + 6, 3, 3, 'g2'); g.set(x + 6, y + 6, 'g5');
  }
  return g;
}

function panelStone() {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 3, 'k');
  rounded(g, 2, 2, 60, 60, 2, 't3');
  g.rect(3, 3, 58, 1, 't4'); g.rect(3, 3, 1, 58, 't4');
  g.rect(3, 60, 58, 1, 't2'); g.rect(60, 3, 1, 58, 't2');
  g.rect(8, 8, 48, 48, 'k');
  g.rect(9, 9, 46, 46, 'k2');
  for (const [x, y] of [[4, 4], [57, 4], [4, 57], [57, 57]]) g.rect(x, y, 3, 3, 't5');
  return g;
}

function dialog() {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 6, 'k');
  rounded(g, 3, 3, 58, 58, 4, 'w');
  g.rect(6, 58, 52, 1, 'g5');               // leve sombra interna
  g.rect(58, 6, 1, 52, 'g5');
  return g;
}

/**
 * Rabicho do balão (desenhado a 2x como o balão). O topo é branco no meio
 * para cobrir a borda inferior do balão e emendar sem costura.
 */
function dialogTail() {
  const g = new Grid();
  g.poly([[2, 0], [27, 0], [1, 31]], 'k');
  g.poly([[5, 0], [23, 0], [3, 25]], 'w');
  return g;
}

function parchment() {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 3, 'm2');
  rounded(g, 2, 2, 60, 60, 2, 'm5');
  g.rect(5, 5, 54, 54, 'm6');
  g.rect(5, 5, 54, 1, 'm5'); g.rect(5, 58, 54, 1, 'm5');
  g.rect(5, 5, 1, 54, 'm5'); g.rect(58, 5, 1, 54, 'm5');
  return g;
}

function bar() {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 2, 'k');
  g.rect(2, 2, 60, 60, 'g2');
  g.rect(2, 2, 60, 1, 'g4');
  g.rect(4, 4, 56, 56, 'k');
  g.rect(5, 5, 54, 54, 'k2');
  return g;
}

function slot({ active = false } = {}) {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 3, active ? 'y3' : 'k');
  rounded(g, 2, 2, 60, 60, 2, 'k2');
  g.rect(4, 4, 56, 2, 'k');                // sombra interna (afundado)
  g.rect(4, 4, 2, 56, 'k');
  g.rect(4, 58, 56, 2, 'g1');
  g.rect(58, 4, 2, 56, 'g1');
  if (active) { g.frame(1, 1, 62, 62, 'y4'); }
  return g;
}

function tab({ active = false } = {}) {
  const g = new Grid();
  rounded(g, 0, 0, 64, 64, 3, 'k');
  rounded(g, 2, 2, 60, 60, 2, active ? 'p3' : 'p2');
  g.rect(4, 3, 56, 2, active ? 'p4' : 'p3');
  return g;
}

export function uiSheets() {
  return {
    btn: button(),
    btn_hover: button({ face: 'm5', light: 'm6', dark: 'm3' }),
    btn_pressed: button({ pressed: true }),
    btn_disabled: button({ face: 'g2', light: 'g3', dark: 'g1' }),
    btn_primary: button({ face: 'o3', light: 'o4', dark: 'o1' }),
    btn_primary_hover: button({ face: 'o4', light: 'y4', dark: 'o2' }),
    btn_primary_pressed: button({ face: 'o3', light: 'o4', dark: 'o1', pressed: true }),
    btn_danger: button({ face: 'r3', light: 'r4', dark: 'r1' }),
    panel: panel(),
    panel_stone: panelStone(),
    dialog: dialog(),
    dialog_tail: dialogTail(),
    parchment: parchment(),
    bar: bar(),
    slot: slot(),
    slot_active: slot({ active: true }),
    tab: tab(),
    tab_active: tab({ active: true }),
  };
}
