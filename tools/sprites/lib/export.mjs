// Exporta grades para SVG (usado pelo jogo) e PNG (prévia).
import { deflateSync } from 'node:zlib';
import { toRGBA } from './palette.mjs';

function parseColor(c) {
  const [key, alpha] = c.split('@');
  const [r, g, b, a] = toRGBA(key);
  const opacity = alpha != null ? Number(alpha) / 100 : a / 255;
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  return { hex, opacity, rgba: [r, g, b, Math.round(opacity * 255)] };
}

/** SVG com um <path> por cor; cada linha horizontal vira um segmento. */
export function toSVG(grid) {
  const paths = new Map();
  for (let y = 0; y < grid.h; y++) {
    let x = 0;
    while (x < grid.w) {
      const c = grid.get(x, y);
      if (c == null) { x++; continue; }
      let n = 1;
      while (x + n < grid.w && grid.get(x + n, y) === c) n++;
      if (!paths.has(c)) paths.set(c, []);
      paths.get(c).push(`M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  }
  const body = [...paths.entries()].map(([c, segs]) => {
    const { hex, opacity } = parseColor(c);
    const op = opacity < 1 ? ` fill-opacity="${opacity.toFixed(2)}"` : '';
    return `<path fill="${hex}"${op} d="${segs.join('')}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${grid.w}" height="${grid.h}" viewBox="0 0 ${grid.w} ${grid.h}" shape-rendering="crispEdges">${body}</svg>\n`;
}

// ─── PNG mínimo (sem dependências) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** PNG ampliado `scale` vezes, com fundo opcional (para prévia). */
export function toPNG(grid, { scale = 1, background = null } = {}) {
  const W = grid.w * scale, H = grid.h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  const bg = background ? parseColor(background).rgba : [0, 0, 0, 0];
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const c = grid.get(Math.floor(x / scale), Math.floor(y / scale));
      let px = bg;
      if (c != null) {
        const fg = parseColor(c).rgba;
        const a = fg[3] / 255;
        px = background
          ? [0, 1, 2].map(i => Math.round(fg[i] * a + bg[i] * (1 - a))).concat(255)
          : fg;
      }
      raw.set(px, y * (W * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
