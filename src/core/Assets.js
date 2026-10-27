// Carrega todas as sprites (SVG 64x64) do manifesto gerado.
// Usa o pacote assets/sprites/bundle.json (1 requisição); se falhar, baixa uma a uma.
import { SPRITES, FRAME_SIZE } from '../config/sprites.generated.js';

const BUNDLE_URL = 'assets/sprites/bundle.json';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function recolorImage(img, recolor) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const rgb = recolor(px[i], px[i + 1], px[i + 2]);
    if (rgb) [px[i], px[i + 1], px[i + 2]] = rgb;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

export class Assets {
  constructor() {
    /** @type {Map<string, { img: HTMLImageElement, frames: number }>} */
    this.sheets = new Map();
  }

  /** Carrega tudo, avisando o progresso (0..1). */
  async loadAll(onProgress = () => {}) {
    const entries = Object.entries(SPRITES);
    let bundle = null;
    try {
      const res = await fetch(BUNDLE_URL);
      if (res.ok) bundle = await res.json();
    } catch { /* sem pacote: carrega os arquivos individuais */ }
    onProgress(0.2);

    let done = 0;
    await Promise.all(entries.map(async ([key, { src, frames }]) => {
      const svg = bundle?.[key];
      const url = svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : src;
      const img = await loadImage(url);
      if (img) this.sheets.set(key, { img, frames });
      else console.warn('Sprite não carregou:', key);
      onProgress(0.2 + 0.8 * (++done / entries.length));
    }));
    await document.fonts?.load('16px JokenPixel').catch(() => {});
  }

  /**
   * Cria (uma vez) cópias recoloridas de todas as folhas que começam com `prefix`,
   * com o nome `prefix~variant`. `recolor(r, g, b)` devolve a nova cor [r, g, b] ou null
   * para manter o pixel. Retorna o prefixo da variante.
   */
  variant(prefix, variant, recolor) {
    const out = `${prefix}~${variant}`;
    for (const [key, sheet] of [...this.sheets]) {
      if (!key.startsWith(`${prefix}/`)) continue;
      const vkey = out + key.slice(prefix.length);
      if (!this.sheets.has(vkey)) this.sheets.set(vkey, { img: recolorImage(sheet.img, recolor), frames: sheet.frames });
    }
    return out;
  }

  get(key) { return this.sheets.get(key) ?? null; }
  has(key) { return this.sheets.has(key); }
  frames(key) { return this.sheets.get(key)?.frames ?? 1; }

  /** Caminho do SVG (para usar em <img> no DOM). */
  static url(key) { return SPRITES[key]?.src ?? ''; }
}

export { FRAME_SIZE };
