import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encodeBuild, decodeBuild, buildCost } from '../src/domain/buildCode.js';

const catalog = {
  characters: [{ id: 'cacador' }, { id: 'luna' }],
  cards: [{ id: 'juizo', cost: 4 }, { id: 'escudo', cost: 1 }, { id: 'cura', cost: 1 }],
};

test('build: o código vai e volta igual', () => {
  const code = encodeBuild({ character: 'luna', cards: ['juizo', 'escudo'] });
  assert.equal(code, 'JG:luna:juizo,escudo');
  assert.deepEqual(decodeBuild(` ${code} `, catalog), { ok: true, character: 'luna', cards: ['juizo', 'escudo'] });
  assert.equal(buildCost(['juizo', 'escudo', 'cura'], catalog), 6);
});

test('build: códigos errados explicam o problema', () => {
  assert.equal(decodeBuild('oi', catalog).ok, false);
  assert.match(decodeBuild('JG:drácula:juizo', catalog).reason, /caçador/);
  assert.match(decodeBuild('JG:luna:juizo,juizo', catalog).reason, /cartas/);
  assert.match(decodeBuild('JG:luna:bazuca', catalog).reason, /não existe/);
});
