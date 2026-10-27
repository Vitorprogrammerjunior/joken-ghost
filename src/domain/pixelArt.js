// Prancheta do Ateliê: a grade de pixels do avatar e as ferramentas de desenho.
// Não conhece tela nenhuma: a interface (ui/AtelierModal.js) só chama estes métodos.
import { ART_SIZE, decodeArt, encodeArt, blankArt } from './avatar.js';

const HISTORY_LIMIT = 50;

export const TOOLS = ['pincel', 'borracha', 'balde', 'conta_gotas'];

export class PixelBoard {
  /** @param {string} [art]  desenho inicial (formato de domain/avatar.js) */
  constructor(art = blankArt()) {
    this.size = ART_SIZE;
    this.pixels = decodeArt(art);
    this.undoStack = [];
    this.redoStack = [];
    this.stroke = null;   // traço em andamento: o estado de antes dele
  }

  get art() { return encodeArt(this.pixels); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  #index(x, y) { return y * this.size + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  colorAt(x, y) { return this.pixels[this.#index(x, y)]; }

  // ─── traços (um traço = uma entrada no desfazer) ───
  begin() { this.stroke ??= this.pixels.slice(); }

  end() {
    if (!this.stroke) return;
    const changed = this.stroke.some((c, i) => c !== this.pixels[i]);
    if (changed) this.#remember(this.stroke);
    this.stroke = null;
  }

  #remember(before) {
    this.undoStack.push(before);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  // ─── ferramentas ───
  /** Pinta um pixel (e o reflexo, com o espelho ligado). Retorna true se algo mudou. */
  paint(x, y, color, { mirror = false } = {}) {
    if (!this.inside(x, y)) return false;
    let changed = this.#set(x, y, color);
    if (mirror) changed = this.#set(this.size - 1 - x, y, color) || changed;
    return changed;
  }

  /** Linha entre dois pontos (o ponteiro pula pixels quando se move rápido). */
  line(x0, y0, x1, y1, color, opts) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let changed = false;
    for (;;) {
      changed = this.paint(x0, y0, color, opts) || changed;
      if (x0 === x1 && y0 === y1) return changed;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Balde: pinta a área da mesma cor ligada ao pixel (4 vizinhos). */
  fill(x, y, color) {
    if (!this.inside(x, y)) return false;
    const target = this.colorAt(x, y);
    if (target === color) return false;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (!this.inside(cx, cy) || this.colorAt(cx, cy) !== target) continue;
      this.#set(cx, cy, color);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return true;
  }

  clear() {
    const before = this.pixels.slice();
    this.pixels.fill(0);
    if (before.some(c => c !== 0)) this.#remember(before);
  }

  /** Troca o desenho inteiro (ex.: carregar o que está salvo), podendo desfazer. */
  load(art) {
    const before = this.pixels.slice();
    this.pixels = decodeArt(art);
    this.#remember(before);
  }

  undo() {
    if (!this.canUndo) return false;
    this.redoStack.push(this.pixels);
    this.pixels = this.undoStack.pop();
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.undoStack.push(this.pixels);
    this.pixels = this.redoStack.pop();
    return true;
  }

  #set(x, y, color) {
    const i = this.#index(x, y);
    if (this.pixels[i] === color) return false;
    this.pixels[i] = color;
    return true;
  }
}
