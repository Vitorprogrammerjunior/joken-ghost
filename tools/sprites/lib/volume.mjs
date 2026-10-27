// Motor de volume: desenho em baixa resolução (32x32) montado por peças com luz própria,
// depois ampliado 2x para o quadro de 64x64 do jogo. É o que dá o visual "construído":
// pixels grossos, sombra em faixas (brilho, luz, meio-tom, sombra, escuro) e contorno.
//
//   const m = new Model();
//   m.part(OURO, 'cylinder', (p) => p.poly(...));   // peça com volume
//   m.paint((g) => g.set(x, y, 'w'));               // detalhes por cima (olhos, brilhos)
//   const frame = m.render();                       // Grid 64x64
import { Grid } from './grid.mjs';
import { shift } from './palette.mjs';

export const LOW = 32;   // resolução de desenho
const SCALE = 2;         // 32 x 2 = 64

/**
 * Material: 5 tons do mais escuro ao brilho, e a cor das linhas internas.
 * `mat('p3')` monta os tons andando na rampa da paleta a partir do meio-tom.
 */
export function mat(mid, { highlight = null, line = null } = {}) {
  const tones = [-2, -1, 0, 1, 2].map(s => shift(mid, s));
  if (highlight) tones[4] = highlight;
  return { tones, line: line ?? shift(mid, -3) };
}

/**
 * Luz vinda de cima à esquerda. Cada forma decide em que faixa (0 escuro .. 4 brilho) cai o pixel.
 *   cylinder  — faixas verticais (copos, troncos, pernas): brilho perto da esquerda
 *   hcylinder — faixas horizontais (bordas, cintos, tampas)
 *   sphere    — brilho num ponto em cima à esquerda (cabeças, fantasmas, frutas)
 *   flat      — chapado com borda clara em cima e sombra embaixo (placas, roupas finas)
 */
const SHAPES = {
  cylinder: (t) => bandOf(t, [0.14, 0.32, 0.64, 0.86]),
  hcylinder: (t) => bandOf(t, [0.2, 0.4, 0.7, 0.88]),
};

/** t em 0..1 (0 = lado iluminado) -> faixa: luz, brilho, meio-tom, sombra, escuro. */
function bandOf(t, [a, b, c, d]) {
  if (t < a) return 3;
  if (t < b) return 4;
  if (t < c) return 2;
  if (t < d) return 1;
  return 0;
}

/** Trechos contínuos de uma linha (ou coluna) da máscara: [início, fim]. */
function runs(has, len) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= len; i++) {
    const on = i < len && has(i);
    if (on && start < 0) start = i;
    if (!on && start >= 0) { out.push([start, i - 1]); start = -1; }
  }
  return out;
}

export class Model {
  constructor(size = LOW) {
    this.size = size;
    this.color = new Grid(size, size);
    this.owner = new Array(size * size).fill(-1);  // qual peça está em cada pixel
    this.parts = [];
    this.back = new Grid(size, size);   // atrás de tudo, sem contorno (auras, raios)
    this.front = new Grid(size, size);  // por cima do contorno (brilhos, faíscas)
  }

  /**
   * Peça com volume. `draw` desenha a silhueta numa grade (qualquer cor serve).
   * @param {{ tones: string[], line: string }} material
   * @param {'cylinder'|'hcylinder'|'sphere'|'flat'} shape
   * @param {{ edge?: boolean, light?: number }} [o]  edge: linha interna onde cobre peças de trás;
   *   light: puxa as faixas para o claro (+) ou escuro (-)
   */
  part(material, shape, draw, { edge = true, light = 0 } = {}) {
    const mask = new Grid(this.size, this.size);
    draw(mask);
    const id = this.parts.push({ material, edge }) - 1;
    const bands = this.#bands(mask, shape);
    mask.forEach((x, y) => {
      const band = Math.max(0, Math.min(4, bands[y * this.size + x] + light));
      this.color.set(x, y, material.tones[band]);
      this.owner[y * this.size + x] = id;
    });
    return this;
  }

  /** Detalhes por cima, sem volume (olhos, boca, emblemas). Ficam dentro do contorno. */
  paint(draw) {
    draw(this.color);
    return this;
  }

  /** Abre buracos em tudo o que já foi desenhado (o que `draw` pintar vira vazio). */
  cut(draw) {
    const mask = new Grid(this.size, this.size);
    draw(mask);
    mask.forEach((x, y) => { this.color.set(x, y, null); this.owner[y * this.size + x] = -1; });
    return this;
  }

  /** Fundo sem contorno, atrás do desenho (auras, raios de luz). */
  backdrop(draw) {
    draw(this.back);
    return this;
  }

  /** Por cima do contorno, sem contorno próprio (brilhos, faíscas, gotas soltas). */
  overlay(draw) {
    draw(this.front);
    return this;
  }

  #bands(mask, shape) {
    const n = this.size;
    const out = new Array(n * n).fill(2);
    const has = (x, y) => mask.get(x, y) != null;
    if (shape === 'cylinder') {
      for (let y = 0; y < n; y++) for (const [l, r] of runs(x => has(x, y), n)) {
        for (let x = l; x <= r; x++) out[y * n + x] = r === l ? 2 : SHAPES.cylinder((x - l + 0.5) / (r - l + 1));
      }
    } else if (shape === 'hcylinder') {
      for (let x = 0; x < n; x++) for (const [t, b] of runs(y => has(x, y), n)) {
        for (let y = t; y <= b; y++) out[y * n + x] = b === t ? 2 : SHAPES.hcylinder((y - t + 0.5) / (b - t + 1));
      }
    } else if (shape === 'sphere') {
      let x0 = n, y0 = n, x1 = -1, y1 = -1;
      mask.forEach((x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2;
      const lx = x0 + rx * 0.62, ly = y0 + ry * 0.55;   // ponto de luz (cima/esquerda)
      mask.forEach((x, y) => {
        const d = Math.hypot((x + 0.5 - lx) / rx, (y + 0.5 - ly) / ry);
        out[y * n + x] = d < 0.22 ? 4 : d < 0.5 ? 3 : d < 0.88 ? 2 : d < 1.18 ? 1 : 0;
      });
    } else {
      mask.forEach((x, y) => {
        out[y * n + x] = !has(x, y - 1) ? 3 : (!has(x, y + 1) || !has(x + 1, y)) ? 1 : 2;
      });
    }
    return out;
  }

  /**
   * Acabamento: linhas internas onde uma peça cobre outra, contorno externo e ampliação para 64x64.
   * @param {{ outline?: string }} [o]  cor do contorno de fora (escuro para ler bem nos cenários noturnos)
   */
  render({ outline = 'k' } = {}) {
    const n = this.size;
    const owner = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? -1 : this.owner[y * n + x]);
    const low = this.color.clone();
    // linha interna: borda de uma peça que está na frente de outra (as peças da frente têm id maior)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const id = owner(x, y);
      if (id < 0 || !this.parts[id].edge) continue;
      const behind = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const o = owner(x + dx, y + dy);
        return o >= 0 && o < id;
      });
      if (behind) low.set(x, y, this.parts[id].material.line);
    }
    // contorno externo
    const filled = low.clone();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (filled.get(x, y) != null) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled.get(x + dx, y + dy) != null)) low.set(x, y, outline);
    }
    // camadas sem contorno e ampliação
    const flat = this.back.clone().blit(low).blit(this.front);
    const out = new Grid(n * SCALE, n * SCALE);
    flat.forEach((x, y, c) => out.rect(x * SCALE, y * SCALE, SCALE, SCALE, c));
    return out;
  }
}
