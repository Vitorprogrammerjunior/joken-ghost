// Gera todas as sprites do jogo como SVG 64x64 (folhas horizontais de frames)
// e o manifesto src/config/sprites.generated.js.
//
//   node tools/sprites/build.mjs
//
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSVG } from './lib/export.mjs';
import { characterSheets } from './art/hunter.mjs';
import { cardSheets } from './art/cards.mjs';
import { enemySheets } from './art/enemies.mjs';
import { enemySheets2 } from './art/enemies2.mjs';
import { iconSheets } from './art/icons.mjs';
import { fxSheets } from './art/fx.mjs';
import { uiSheets } from './art/ui.mjs';
import { tileSheets } from './art/tiles.mjs';
import { tileSheets2 } from './art/tiles2.mjs';
import { arenaIconSheets, frameSheets } from './art/arena.mjs';

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

for (const [id, views] of Object.entries(characterSheets())) {
  for (const [view, anims] of Object.entries(views)) {
    for (const [anim, g] of Object.entries(anims)) emit(`char/${id}/${view}/${anim}`, `characters/${id}/${view}/${anim}`, g);
  }
}
for (const [name, g] of Object.entries(cardSheets())) emit(`card/${name}`, `cards/${name}`, g);
for (const [enemy, anims] of Object.entries({ ...enemySheets(), ...enemySheets2() })) {
  for (const [anim, g] of Object.entries(anims)) emit(`enemy/${enemy}/${anim}`, `enemies/${enemy}/${anim}`, g);
}
for (const [name, g] of Object.entries({ ...iconSheets(), ...arenaIconSheets() })) emit(`icon/${name}`, `icons/${name}`, g);
for (const [name, g] of Object.entries(fxSheets())) emit(`fx/${name}`, `fx/${name}`, g);
for (const [name, g] of Object.entries({ ...uiSheets(), ...frameSheets() })) emit(`ui/${name}`, `ui/${name}`, g);
for (const [name, g] of Object.entries({ ...tileSheets(), ...tileSheets2() })) emit(`tile/${name}`, `tiles/${name}`, g);

const js = `// GERADO por tools/sprites/build.mjs — não edite à mão.
// Todas as sprites usam frames de ${FRAME}x${FRAME}px em folhas horizontais.
export const FRAME_SIZE = ${FRAME};

export const SPRITES = ${JSON.stringify(manifest, null, 2)};
`;
writeFileSync(join(ROOT, 'src', 'config', 'sprites.generated.js'), js);
writeFileSync(join(OUT, 'bundle.json'), JSON.stringify(bundle));

console.log(`${files} sprites geradas em ${relative(ROOT, OUT)}`);
