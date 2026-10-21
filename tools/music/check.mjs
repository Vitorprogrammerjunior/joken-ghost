// Confere as partituras (.scrim) da trilha: compassos que não fecham, duração, vozes.
//
//   node tools/music/check.mjs
//
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ctx = { self: {} };
vm.runInNewContext(readFileSync(join(ROOT, 'src/vendor/scrimshaw/score.js'), 'utf8'), ctx);
const { compile } = ctx.self.ScrimScore;

const dir = join(ROOT, 'assets/music');
let failed = 0;
for (const file of readdirSync(dir).filter(f => f.endsWith('.scrim'))) {
  const song = compile(readFileSync(join(dir, file), 'utf8'));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  if (song.errors.length) {
    failed++;
    console.log(`✗ ${file}`);
    for (const e of song.errors) console.log(`    linha ${e.line}: ${e.msg}`);
  } else {
    console.log(`✓ ${file.padEnd(18)} ${song.title.padEnd(26)} intro ${fmt(song.intro.dur)}  loop ${fmt(song.loop.dur)}  ${song.voices.length} vozes`);
  }
}
process.exit(failed ? 1 : 0);
