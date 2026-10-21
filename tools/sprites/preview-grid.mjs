// Prévia em grade: node preview-grid.mjs <modulo> <export> <saida.png> [colunas]
import { writeFileSync } from 'node:fs';
import { toPNG } from './lib/export.mjs';
import { Grid } from './lib/grid.mjs';
const [mod, fn, out, cols = '8'] = process.argv.slice(2);
const items = Object.values((await import(`./art/${mod}.mjs`))[fn]());
const C = Number(cols), R = Math.ceil(items.length / C);
const fw = Math.max(...items.map(g => g.w)), fh = Math.max(...items.map(g => g.h));
const g = new Grid(C * (fw + 4), R * (fh + 4));
items.forEach((it, i) => g.blit(it, (i % C) * (fw + 4), Math.floor(i / C) * (fh + 4)));
writeFileSync(out, toPNG(g, { scale: 2, background: '#3a3f5a' }));
