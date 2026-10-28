import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeSaves } from '../src/domain/cloudSaves.js';
import { SaveManager } from '../src/domain/progress.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

const T = (h) => `2026-10-28T${String(h).padStart(2, '0')}:00:00.000Z`;
const e = (slot, coins, h) => ({ slot, data: coins == null ? null : { version: 2, slot, coins }, updatedAt: h == null ? null : T(h) });
const slots = (list) => list.map(x => [x.slot, x.data?.coins ?? null]);

test('nuvem: na mesma conta fica o arquivo salvo por último', () => {
  const local = [e(1, 10, 9), e(2, 20, 12), e(3, null, null)];
  const remote = [e(1, 11, 10), e(2, 19, 11), e(3, 30, 8)];
  const { toLocal, toCloud } = mergeSaves(local, remote);
  assert.deepEqual(slots(toLocal), [[1, 11], [3, 30]]);
  assert.deepEqual(slots(toCloud), [[2, 20]]);
  assert.deepEqual(mergeSaves(remote, remote), { toLocal: [], toCloud: [] });
});

test('nuvem: apagar um arquivo chega aos outros aparelhos (e o mais novo ainda ganha)', () => {
  assert.deepEqual(slots(mergeSaves([e(1, 10, 9)], [e(1, null, 10)]).toLocal), [[1, null]]);
  assert.deepEqual(slots(mergeSaves([e(1, 10, 11)], [e(1, null, 10)]).toCloud), [[1, 10]]);
  assert.deepEqual(slots(mergeSaves([e(1, null, 12)], [e(1, 10, 10)]).toCloud), [[1, null]]);
});

test('nuvem: primeira vez da conta no aparelho, a nuvem ganha e os slots vazios recebem o daqui', () => {
  const local = [e(1, 99, 23), e(2, 5, 1)];
  const remote = [e(1, 10, 9), e(2, null, 2)];
  const { toLocal, toCloud } = mergeSaves(local, remote, { mode: 'remote' });
  assert.deepEqual(slots(toLocal), [[1, 10]]);
  assert.deepEqual(slots(toCloud), [[2, 5]], 'nunca perde o arquivo daqui por um slot apagado na nuvem');
});

test('nuvem: arquivos de outra conta são trocados pelos da nuvem', () => {
  const { toLocal, toCloud } = mergeSaves([e(1, 99, 23), e(2, 5, 1)], [e(1, 10, 9)], { mode: 'replace' });
  assert.deepEqual(slots(toLocal), [[1, 10], [2, null]]);
  assert.deepEqual(toCloud, []);
});

test('nuvem: o arquivo em jogo não é trocado por baixo do jogador', () => {
  const { toLocal } = mergeSaves([e(1, 10, 9)], [e(1, 11, 10)], { busy: 1 });
  assert.deepEqual(toLocal, []);
});

test('saves: apagar deixa marca, arquivo da nuvem entra sem mudar a hora, sair limpa tudo', () => {
  const saves = new SaveManager(memStorage());
  const p = saves.create(1);
  saves.remove(1);
  const [one] = saves.entries();
  assert.equal(one.data, null);
  assert.ok(one.updatedAt >= p.updatedAt);
  saves.restore(2, { version: 2, slot: 2, coins: 7 }, T(8));
  assert.equal(saves.load(2).coins, 7);
  assert.equal(saves.entries()[1].updatedAt, T(8));
  saves.restore(3, null, T(5));
  assert.deepEqual(saves.entries()[2], { slot: 3, data: null, updatedAt: T(5) });
  saves.create(1);
  assert.ok(saves.entries()[0].data, 'salvar de novo tira a marca de apagado');
  saves.owner = 'abc';
  assert.equal(saves.owner, 'abc');
  saves.clearAll();
  assert.equal(saves.owner, null);
  assert.deepEqual(saves.entries().map(x => x.data ?? x.updatedAt), [null, null, null]);
});
