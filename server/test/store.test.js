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

  // campos em JSON (deck, cosméticos, missões) voltam iguais
  loaded.deck = ['escudo', 'cura'];
  loaded.cosmetics = ['moldura_ouro'];
  loaded.equipped = { frame: 'moldura_ouro' };
  loaded.missions = { day: '2026-10-26', list: [{ id: 'vencer', progress: 1, claimed: false }] };
  loaded.ecto = 30;
  loaded.avatar = { kind: 'art', hunter: 'cacador', art: 'a'.repeat(256) };
  await store.save(loaded);
  const again = await store.getById(loaded.id);
  assert.deepEqual(again.avatar, loaded.avatar);
  assert.deepEqual((await store.getById(b.player.id)).avatar, { kind: 'hunter', hunter: 'cacador', art: null });
  assert.deepEqual(again.deck, ['escudo', 'cura']);
  assert.deepEqual(again.equipped, { frame: 'moldura_ouro' });
  assert.equal(again.missions.list[0].id, 'vencer');
  assert.equal(again.ecto, 30);

  // Desafio do Dia: só a melhor pontuação do dia fica
  assert.equal(await store.submitDaily('2026-10-26', a.player.id, 500, 4), 500);
  assert.equal(await store.submitDaily('2026-10-26', a.player.id, 300, 3), 500);
  await store.submitDaily('2026-10-26', b.player.id, 700, 6);
  const daily = await store.dailyTop('2026-10-26', 10);
  assert.deepEqual(daily.map(d => [d.nickname, d.score]), [['Amigo', 700], ['Vitor', 500]]);
  assert.deepEqual(await store.dailyRank('2026-10-26', a.player.id), { rank: 2, total: 2, score: 500 });
  assert.equal((await store.dailyRank('2026-10-27', a.player.id)).rank, null);

  // dados gerais e temporada (reset parcial acima de 1000)
  await store.setMeta('season', { id: 3 });
  assert.deepEqual(await store.getMeta('season'), { id: 3 });
  const rich = await store.getById(a.player.id);
  rich.trophies = 1600;
  await store.save(rich);
  await store.trimTrophies(1000);
  const after = await store.getById(a.player.id);
  assert.equal(after.trophies, 1300);
  assert.equal((await store.getById(b.player.id)).trophies, 0);

  // login: liga ao jogador, uma sessão por aparelho, e o código de convidado deixa de valer
  assert.equal(await store.linkIdentity(a.player.id, 'google', 'g-1'), true);
  assert.equal(await store.linkIdentity(b.player.id, 'google', 'g-1'), false, 'login de outra pessoa');
  assert.equal((await store.findIdentity('google', 'g-1')).id, a.player.id);
  assert.equal(await store.findIdentity('discord', 'g-1'), null);
  await store.linkIdentity(a.player.id, 'discord', 'd-1');
  assert.deepEqual(await store.identitiesOf(a.player.id), ['discord', 'google']);
  assert.deepEqual(await store.identitiesOf(b.player.id), []);
  const pc = await store.createSession(a.player.id);
  const phone = await store.createSession(a.player.id);
  assert.equal((await store.getByToken(pc)).id, a.player.id);
  await store.revokeGuestToken(a.player.id);
  assert.equal(await store.getByToken(a.token), null);
  assert.equal(await store.deleteSession(pc), true);
  assert.equal(await store.getByToken(pc), null);
  assert.equal((await store.getByToken(phone)).id, a.player.id);

  // saves da campanha: fica o mais novo; null = apagado
  const save = { version: 2, slot: 1, coins: 9 };
  assert.deepEqual(await store.putSave(a.player.id, 1, save, '2026-10-28T10:00:00.000Z'), { slot: 1, data: save, updatedAt: '2026-10-28T10:00:00.000Z' });
  const older = await store.putSave(a.player.id, 1, { ...save, coins: 1 }, '2026-10-28T09:00:00.000Z');
  assert.equal(older.data.coins, 9);
  await store.putSave(a.player.id, 2, null, '2026-10-28T11:00:00.000Z');
  assert.deepEqual((await store.listSaves(a.player.id)).map(s => [s.slot, s.data?.coins ?? null]), [[1, 9], [2, null]]);
  assert.deepEqual(await store.listSaves(b.player.id), []);

  // apagar a conta leva tudo junto
  assert.equal(await store.deletePlayer(a.player.id), true);
  assert.equal(await store.getById(a.player.id), null);
  assert.equal(await store.getByToken(phone), null);
  assert.equal(await store.findIdentity('google', 'g-1'), null);
  assert.deepEqual(await store.listSaves(a.player.id), []);
  assert.equal((await store.dailyRank('2026-10-26', a.player.id)).rank, null);
  assert.equal(await store.count(), 1);

  // nomes: conta nova com nome de outro ganha números no fim; a conferência ignora maiúsculas e acentos
  const n1 = await store.create('Vítor Gamer');
  assert.equal(n1.player.nickname, 'Vítor Gamer');
  assert.equal(await store.nicknameTaken('vitor gamer'), true);
  assert.equal(await store.nicknameTaken('VITOR GAMER', n1.player.id), false, 'o próprio nome não conta');
  const n2 = await store.create('vitor gamer');
  assert.match(n2.player.nickname, /^vitor gamer\d{4}$/);
  assert.ok(n2.player.nickname.length <= 16);
}

test('JsonStore guarda contas e sobrevive a reinício', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-')), 'players.json');
  const store = await new JsonStore(file).init();
  await exercise(store);
  store.flush();
  const again = await new JsonStore(file).init();
  assert.equal((await again.top(1))[0].nickname, 'Amigo');
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
