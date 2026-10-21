// Gera todas as sprites do jogo como SVG 64x64 (folhas horizontais de frames)
// e o manifesto src/config/sprites.generated.js.
//
//   node tools/sprites/build.mjs
//
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSVG } from './lib/export.mjs';
import { hunterSheets } from './art/hunter.mjs';
import { enemySheets } from './art/enemies.mjs';
import { iconSheets } from './art/icons.mjs';
import { fxSheets } from './art/fx.mjs';
import { uiSheets } from './art/ui.mjs';
import { tileSheets } from './art/tiles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'assets', 'sprites');
const FRAME = 64;

rmSync(OUT, { recursive: true, force: true });

const manifest = {};
const bundle = {}; // todas as SVGs num arquivo só: o jogo carrega com 1 requisição
let files = 0;

function emit(key, path, grid) {
  if (grid.h !== FRAME || grid.w % FRAME !== 0) {
    throw new Error(`${key}: ${grid.w}x${grid.h} não é múltiplo de ${FRAME}x${FRAME}`);
  }
  const file = join(OUT, path + '.svg');
  const svg = toSVG(grid);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  manifest[key] = { src: relative(ROOT, file).replaceAll('\\', '/'), frames: grid.w / FRAME };
  bundle[key] = svg;
  files++;
}

for (const [anim, g] of Object.entries(hunterSheets())) emit(`hunter/${anim}`, `characters/hunter/${anim}`, g);
for (const [enemy, anims] of Object.entries(enemySheets())) {
  for (const [anim, g] of Object.entries(anims)) emit(`enemy/${enemy}/${anim}`, `enemies/${enemy}/${anim}`, g);
}
for (const [name, g] of Object.entries(iconSheets())) emit(`icon/${name}`, `icons/${name}`, g);
for (const [name, g] of Object.entries(fxSheets())) emit(`fx/${name}`, `fx/${name}`, g);
for (const [name, g] of Object.entries(uiSheets())) emit(`ui/${name}`, `ui/${name}`, g);
for (const [name, g] of Object.entries(tileSheets())) emit(`tile/${name}`, `tiles/${name}`, g);

const js = `// GERADO por tools/sprites/build.mjs — não edite à mão.
// Todas as sprites usam frames de ${FRAME}x${FRAME}px em folhas horizontais.
export const FRAME_SIZE = ${FRAME};

export const SPRITES = ${JSON.stringify(manifest, null, 2)};
`;
writeFileSync(join(ROOT, 'src', 'config', 'sprites.generated.js'), js);
writeFileSync(join(OUT, 'bundle.json'), JSON.stringify(bundle));

console.log(`${files} sprites geradas em ${relative(ROOT, OUT)}`);
