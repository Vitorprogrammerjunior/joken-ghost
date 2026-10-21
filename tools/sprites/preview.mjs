// Gera prévias PNG ampliadas: node preview.mjs <modulo> <export> <pastaSaida>
import { writeFileSync, mkdirSync } from 'node:fs';
import { toPNG } from './lib/export.mjs';
import { Grid } from './lib/grid.mjs';

const [mod, fn, out, scale = '4'] = process.argv.slice(2);
const m = await import(`./art/${mod}.mjs`);
const sheets = m[fn]();
mkdirSync(out, { recursive: true });
// empilha todas as folhas numa imagem só
const list = Object.entries(sheets);
const W = Math.max(...list.map(([, g]) => g.w));
const H = list.reduce((s, [, g]) => s + g.h + 2, 0);
const all = new Grid(W, H);
let y = 0;
for (const [, g] of list) { all.blit(g, 0, y); y += g.h + 2; }
writeFileSync(`${out}/${mod}-${fn}.png`, toPNG(all, { scale: Number(scale), background: '#3a3f5a' }));
console.log('ok', list.map(([k, g]) => `${k}:${g.w / 64}`).join(' '));
