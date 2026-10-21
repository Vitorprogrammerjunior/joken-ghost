import { writeFileSync } from 'node:fs';
import { toPNG } from './lib/export.mjs';
import { Grid } from './lib/grid.mjs';
import { enemySheets } from './art/enemies.mjs';
const out = process.argv[2];
const all = Object.entries(enemySheets());
// dois inimigos por imagem
for (let i = 0; i < all.length; i += 2) {
  const part = all.slice(i, i + 2);
  const rows = part.flatMap(([, a]) => Object.values(a));
  const g = new Grid(64 * 4, rows.length * 66);
  rows.forEach((r, j) => g.blit(r, 0, j * 66));
  writeFileSync(`${out}/en-${i / 2}.png`, toPNG(g, { scale: 3, background: '#3a3f5a' }));
}
