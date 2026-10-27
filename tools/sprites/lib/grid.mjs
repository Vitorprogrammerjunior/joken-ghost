// Grade de pixels com primitivas de desenho para pixel art.
// Cores são chaves da paleta ('k', 'r3'...), opcionalmente com alfa: 'w@40'.
import { shift } from './palette.mjs';

export class Grid {
  constructor(w = 64, h = 64) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y) {
    x = Math.round(x); y = Math.round(y);
    return this.inside(x, y) ? this.d[y * this.w + x] : null;
  }

  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (this.inside(x, y)) this.d[y * this.w + x] = c;
    return this;
  }

  clone() {
    const g = new Grid(this.w, this.h);
    g.d = this.d.slice();
    return g;
  }

  forEach(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + x];
      if (c != null) fn(x, y, c);
    }
  }

  // ─── primitivas ───────────────────────────────────────────────
  px(points, c) { for (const [x, y] of points) this.set(x, y, c); return this; }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  /** Retângulo vazado (só a borda). */
  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
    return this;
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Linha grossa (pincel quadrado). */
  stroke(x0, y0, x1, y1, size, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const o = Math.floor((size - 1) / 2);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
      this.rect(Math.round(x) - o, Math.round(y) - o, size, size, c);
    }
    return this;
  }

  /** Elipse preenchida centrada em (cx, cy). Aceita meios pixels. */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - (cx + 0.5)) / (rx + 0.5), ny = (y + 0.5 - (cy + 0.5)) / (ry + 0.5);
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }

  /** Anel (elipse vazada) com espessura t. */
  ring(cx, cy, r, t, c) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r + 0.5 && d > r - t + 0.5) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Polígono preenchido (scanline, regra par/ímpar). */
  poly(pts, c) {
    const ys = pts.map(p => p[1]);
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + (sy - y0) / (y1 - y0) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Preenche a região conectada da cor em (x,y). */
  fill(x, y, c) {
    const target = this.get(x, y);
    if (target === c) return this;
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (!this.inside(px, py) || this.get(px, py) !== target) continue;
      this.set(px, py, c);
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    return this;
  }

  /** Troca todas as ocorrências de uma cor. */
  recolor(map) {
    this.d = this.d.map(c => (c != null && map[c] !== undefined ? map[c] : c));
    return this;
  }

  /** Apaga pixels (desenha "transparente"). */
  erase(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (fn(x, y)) this.d[y * this.w + x] = null;
    return this;
  }

  // ─── composição ──────────────────────────────────────────────
  /** Desenha outra grade por cima, com deslocamento e espelhamento opcionais. */
  blit(src, ox = 0, oy = 0, { flipX = false, flipY = false } = {}) {
    src.forEach((x, y, c) => {
      const tx = flipX ? src.w - 1 - x : x, ty = flipY ? src.h - 1 - y : y;
      this.set(tx + ox, ty + oy, c);
    });
    return this;
  }

  /** Espelha a metade esquerda sobre a direita (simetria). */
  mirrorX() {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w / 2; x++) {
      this.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    }
    return this;
  }

  flipX() {
    const g = new Grid(this.w, this.h);
    return g.blit(this, 0, 0, { flipX: true });
  }

  /** Desloca todo o conteúdo. */
  shifted(dx, dy) {
    return new Grid(this.w, this.h).blit(this, dx, dy);
  }

  // ─── acabamento ───────────────────────────────────────────────
  /**
   * Sombreamento automático: luz vinda de cima/esquerda.
   * Pixels na borda inferior/direita escurecem, superior/esquerda clareiam.
   */
  shade({ dark = 1, light = 1, depth = 1 } = {}) {
    const src = this.clone();
    const empty = (x, y) => src.get(x, y) == null;
    src.forEach((x, y, c) => {
      if (c.includes('@')) return;
      let s = 0;
      for (let d = 1; d <= depth; d++) {
        if (empty(x + d, y) || empty(x, y + d)) { s = -dark; break; }
      }
      if (s === 0 && (empty(x - 1, y) || empty(x, y - 1))) s = light;
      if (s) this.set(x, y, shift(c, s));
    });
    return this;
  }

  /** Contorno externo de 1px ao redor de todos os pixels opacos. */
  outline(c = 'k', { diagonal = false } = {}) {
    const src = this.clone();
    const dirs = diagonal
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src.get(x, y) != null) continue;
      if (dirs.some(([dx, dy]) => { const n = src.get(x + dx, y + dy); return n != null && !n.includes('@'); })) this.set(x, y, c);
    }
    return this;
  }

  /** Contorno interno escuro entre cores diferentes (separa partes). */
  innerLine(colorsA, c = 'k') {
    const A = new Set(colorsA);
    const src = this.clone();
    src.forEach((x, y, col) => {
      if (!A.has(col)) return;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const n = src.get(x + dx, y + dy);
        if (n != null && !A.has(n) && n !== c) { this.set(x, y, c); return; }
      }
    });
    return this;
  }
}

/** Gerador pseudo-aleatório determinístico (as sprites saem iguais a cada build). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monta uma folha horizontal de frames 64x64. */
export function sheet(frames) {
  const fw = frames[0].w, fh = frames[0].h;
  const g = new Grid(fw * frames.length, fh);
  frames.forEach((f, i) => g.blit(f, i * fw, 0));
  return g;
}

/** Desenha um "bitmap" ASCII: cada caractere mapeia para uma cor via legenda. */
export function stamp(grid, ox, oy, rows, legend) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = legend[ch];
      if (c) grid.set(ox + x, oy + y, c);
    });
  });
  return grid;
}
