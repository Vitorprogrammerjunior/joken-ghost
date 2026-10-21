'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { newDb } = require('pg-mem');
const { JsonStore, PgStore, cleanNickname } = require('../src/store');

async function exercise(store) {
  const a = await store.create('Vitor');
  const b = await store.create('Amigo');
  assert.equal(a.player.nickname, 'Vitor');
  assert.ok(a.token.length > 20);
  const loaded = await store.getByToken(a.token);
  assert.equal(loaded.id, a.player.id);
  assert.equal(await store.getByToken('token-falso'), null);

  loaded.trophies = 120; loaded.best = 120; loaded.wins = 4;
  await store.save(loaded);
  const top = await store.top(10);
  assert.equal(top[0].nickname, 'Vitor');
  assert.equal(top[0].trophies, 120);
  assert.equal(await store.rankOf(b.player), 2);
  assert.equal(await store.count(), 2);
}

test('JsonStore guarda contas e sobrevive a reinício', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-')), 'players.json');
  const store = await new JsonStore(file).init();
  await exercise(store);
  store.flush();
  const again = await new JsonStore(file).init();
  assert.equal((await again.top(1))[0].trophies, 120);
});

test('PgStore funciona com SQL de Postgres', async () => {
  const { Pool } = newDb().adapters.createPg();
  const store = await new PgStore(new Pool()).init();
  await exercise(store);
});

test('apelidos são limpos', () => {
  assert.equal(cleanNickname('  Ana   Maria  '), 'Ana Maria');
  assert.equal(cleanNickname('<script>'), 'script');
  assert.match(cleanNickname(''), /^Caçador\d{4}$/);
  assert.equal(cleanNickname('x'.repeat(40)).length, 16);
});
