'use strict';
// Missões diárias, temporadas e cosméticos (módulos sem rede).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const missions = require('../src/missions');
const seasons = require('../src/seasons');
const cosmetics = require('../src/cosmetics');
const { blankPlayer } = require('../src/store');
const { loadShared } = require('../src/shared');

test('missões: 3 por dia, estáveis, com progresso e resgate', () => {
  const p = blankPlayer('Ana');
  assert.equal(missions.ensureMissions(p, '2026-10-26'), true);
  assert.equal(missions.ensureMissions(p, '2026-10-26'), false);
  assert.equal(p.missions.list.length, missions.PER_DAY);
  assert.deepEqual(missions.missionsFor('2026-10-26', p.id), p.missions.list.map(m => m.id));
  // força missões conhecidas para testar o progresso
  p.missions.list = [{ id: 'vencer', progress: 0, claimed: false }, { id: 'cruz', progress: 0, claimed: false }];
  missions.track(p, 'round_win', { weapon: 'estaca' });
  assert.equal(p.missions.list[1].progress, 0);
  for (let i = 0; i < 9; i++) missions.track(p, 'round_win', { weapon: 'cruz' });
  assert.equal(p.missions.list[1].progress, 6); // não passa do alvo
  assert.equal(missions.claim(p, 'vencer').ok, false);
  const r = missions.claim(p, 'cruz');
  assert.equal(r.ok, true);
  assert.equal(p.ecto, r.reward);
  assert.equal(missions.claim(p, 'cruz').ok, false);
  missions.ensureMissions(p, '2026-10-27');
  assert.equal(p.missions.day, '2026-10-27');
});

test('temporadas: mês de Brasília, recompensa pela liga e contas novas sem prêmio', () => {
  assert.equal(seasons.seasonId(new Date('2026-11-01T02:00:00Z')), 2026 * 12 + 9); // ainda 31/10 em Brasília
  assert.equal(seasons.seasonId(new Date('2026-11-01T04:00:00Z')), 2026 * 12 + 10);
  const info = seasons.seasonInfo(new Date('2026-10-15T12:00:00Z'));
  assert.equal(info.name, 'Temporada de Outubro');
  assert.equal(new Date(info.endsAt).toISOString(), '2026-11-01T03:00:00.000Z');

  const fresh = blankPlayer('Novo');
  assert.equal(seasons.settlePlayer(fresh, 100), null);
  assert.equal(fresh.season, 100);

  const vet = { ...blankPlayer('Veterano'), season: 99, seasonBest: 1300, trophies: 1150 };
  const reward = seasons.settlePlayer(vet, 100);
  assert.equal(reward.league, 'platina');
  assert.equal(vet.ecto, seasons.REWARDS.platina.ecto);
  assert.ok(vet.cosmetics.includes('temporada_platina'));
  assert.equal(vet.seasonBest, 1150);
  assert.equal(seasons.settlePlayer(vet, 100), null);
});

test('cosméticos: grátis, compra com Ecto e moldura equipada', () => {
  const p = blankPlayer('X');
  assert.equal(cosmetics.owns(p, 'risada'), true);
  assert.equal(cosmetics.canEmote(p, 'raiva'), false);
  assert.equal(cosmetics.buy(p, 'raiva').reason, 'Ecto insuficiente.');
  p.ecto = 120;
  assert.equal(cosmetics.buy(p, 'raiva').ok, true);
  assert.equal(p.ecto, 20);
  assert.equal(cosmetics.canEmote(p, 'raiva'), true);
  assert.equal(cosmetics.buy(p, 'temporada_lenda').ok, false);  // só por temporada
  assert.equal(cosmetics.equipFrame(p, 'ouro').ok, false);
  assert.equal(cosmetics.equipFrame(p, 'madeira').ok, true);
  assert.equal(p.equipped.frame, 'madeira');
});

test('avatar: rosto de caçador liberado ou desenho válido; os outros só veem o que está em uso', async () => {
  const { isValidArt } = await loadShared();
  const rules = { unlocked: ['cacador', 'luna'], isValidArt };
  const p = blankPlayer('Artista');
  assert.deepEqual(cosmetics.publicLook(p).avatar, { kind: 'hunter', hunter: 'cacador' });
  assert.equal(cosmetics.setAvatar(p, { kind: 'hunter', hunter: 'sombra' }, rules).ok, false);
  assert.equal(cosmetics.setAvatar(p, { kind: 'hunter', hunter: 'luna' }, rules).ok, true);
  assert.equal(cosmetics.setAvatar(p, { kind: 'art', art: 'xyz' }, rules).ok, false);
  const art = '1'.repeat(16) + '0'.repeat(240);
  assert.equal(cosmetics.setAvatar(p, { kind: 'art', art }, rules).ok, true);
  assert.deepEqual(cosmetics.publicLook(p).avatar, { kind: 'art', art });
  // volta para um rosto: o desenho fica guardado, mas não é mostrado para os outros
  cosmetics.setAvatar(p, { kind: 'hunter', hunter: 'cacador' }, rules);
  assert.equal(p.avatar.art, art);
  assert.deepEqual(cosmetics.publicLook(p).avatar, { kind: 'hunter', hunter: 'cacador' });
});

test('torneio: a espera para completar com bots começa no primeiro inscrito', () => {
  const { Tournament } = require('../src/modes/Tournament');
  let now = 0;
  const t = new Tournament({ now: () => now, rng: Math.random, fillAfterMs: 1000, play: async () => '', broadcast: () => {}, onFinish: () => {} });
  now = 50000; // o torneio abriu há muito tempo, sem ninguém
  t.join({ id: 'a', trophies: 0 });
  t.tick();
  assert.equal(t.status, 'waiting');
  assert.ok(t.startsIn > 900);
});
