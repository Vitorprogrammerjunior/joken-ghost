'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const duel = require('../src/duel');
const { trophyDelta, applyResult, FarmGuard } = require('../src/trophies');
const { unlockedCards, unlockedCharacters, leagueOf, RULES } = require('../src/catalog');

const player = (over = {}) => ({ id: Math.random().toString(16).slice(2), nickname: 'X', trophies: 0, best: 0, wins: 0, losses: 0, character: 'cacador', ...over });
const fixed = (v) => () => v;

/** Joga uma rodada completa com cartas e armas definidas. */
function round(d, [cardA, weaponA], [cardB, weaponB]) {
  duel.startRound(d);
  d.fighters[0].hand.push(...[cardA].filter(Boolean));
  d.fighters[1].hand.push(...[cardB].filter(Boolean));
  duel.pickCard(d, 0, cardA ?? null);
  duel.pickCard(d, 1, cardB ?? null);
  duel.startWeaponPhase(d);
  duel.pickWeapon(d, 0, weaponA);
  duel.pickWeapon(d, 1, weaponB);
  return duel.resolveRound(d);
}

test('jokenpô: estaca vence cruz e o perdedor toma dano base', () => {
  const d = duel.createDuel(player(), player(), fixed(0.9));
  const r = round(d, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r.outcome, 0);
  assert.equal(d.fighters[1].hp, RULES.baseHp - RULES.baseDamage);
  assert.equal(d.fighters[0].hp, RULES.baseHp);
});

test('cartas: golpe duplo, escudo, espinhos e vampirismo', () => {
  let d = duel.createDuel(player(), player(), fixed(0.9));
  round(d, ['golpe_duplo', 'aspirador'], [null, 'estaca']);
  assert.equal(d.fighters[1].hp, 100 - 40);

  d = duel.createDuel(player(), player(), fixed(0.9));
  round(d, [null, 'aspirador'], ['escudo', 'estaca']);
  assert.equal(d.fighters[1].hp, 100);

  d = duel.createDuel(player(), player(), fixed(0.9));
  round(d, [null, 'aspirador'], ['espinhos', 'estaca']);
  assert.equal(d.fighters[1].hp, 80);
  assert.equal(d.fighters[0].hp, 88);

  d = duel.createDuel(player(), player(), fixed(0.9));
  d.fighters[0].hp = 50;
  round(d, ['vampirismo', 'cruz'], [null, 'aspirador']);
  assert.equal(d.fighters[0].hp, 60);
});

test('personagens: passiva de arma, vida extra e esquiva', () => {
  const d = duel.createDuel(player({ character: 'luna' }), player({ character: 'ze' }), fixed(0.9));
  assert.equal(d.fighters[1].maxHp, 120);
  round(d, [null, 'aspirador'], [null, 'estaca']);
  assert.equal(d.fighters[1].hp, 120 - 25);

  const e = duel.createDuel(player(), player({ character: 'sombra' }), fixed(0.01)); // rng baixo = esquiva
  const r = round(e, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r.fighters[1].dodged, true);
  assert.equal(e.fighters[1].hp, 100);
});

test('cartas usadas não voltam para a mão e mão vazia pula a escolha', () => {
  const d = duel.createDuel(player(), player(), Math.random);
  duel.startRound(d);
  const first = d.fighters[0].hand[0];
  duel.pickCard(d, 0, first);
  duel.startWeaponPhase(d);
  duel.resolveRound(d);
  for (let i = 0; i < 3; i++) {
    duel.startRound(d);
    assert.ok(!d.fighters[0].hand.includes(first));
    duel.startWeaponPhase(d);
    duel.resolveRound(d);
  }
  const p0 = d.fighters[0];
  p0.used = [...p0.deck];
  duel.startRound(d);
  assert.equal(p0.hand.length, 0);
  assert.equal(p0.cardLocked, true);
});

test('não aceita carta fora da mão nem arma inválida', () => {
  const d = duel.createDuel(player(), player(), Math.random);
  duel.startRound(d);
  assert.equal(duel.pickCard(d, 0, 'juizo'), false);
  duel.startWeaponPhase(d);
  assert.equal(duel.pickWeapon(d, 0, 'bazuca'), false);
});

test('a partida termina quando a vida zera', () => {
  const d = duel.createDuel(player(), player(), fixed(0.9));
  let r;
  for (let i = 0; i < 10 && !(r && r.winner != null); i++) r = round(d, [null, 'cruz'], [null, 'aspirador']);
  assert.equal(r.winner, 0);
  assert.equal(d.fighters[1].hp, 0);
});

test('troféus: vencer alguém mais forte vale mais e ninguém fica negativo', () => {
  assert.ok(trophyDelta(0, 500).gain > trophyDelta(500, 0).gain);
  assert.equal(trophyDelta(100, 3).loss, 3);
  const w = player({ trophies: 140, best: 140 }), l = player({ trophies: 10, best: 10 });
  const [rw, rl] = applyResult(w, l);
  assert.ok(rw.delta > 0 && rl.delta < 0);
  assert.equal(w.best, w.trophies);
  assert.deepEqual(rw.unlocked.characters, w.trophies >= 150 ? ['luna'] : []);
  assert.equal(l.losses, 1);
});

test('desbloqueios e ligas por troféus', () => {
  assert.deepEqual(unlockedCards(0), ['escudo', 'cura', 'golpe_duplo']);
  assert.ok(unlockedCards(2000).includes('juizo'));
  assert.deepEqual(unlockedCharacters(0), ['cacador']);
  assert.equal(leagueOf(0), 'bronze');
  assert.equal(leagueOf(750), 'ouro');
  assert.equal(leagueOf(5000), 'lenda');
});

test('anti-farm: mesmo par só pontua 3 vezes por hora', () => {
  const g = new FarmGuard();
  const t = 1000;
  assert.equal(g.allow('a', 'b', t), true);
  assert.equal(g.allow('b', 'a', t + 1), true);
  assert.equal(g.allow('a', 'b', t + 2), true);
  assert.equal(g.allow('a', 'b', t + 3), false);
  assert.equal(g.allow('a', 'b', t + 61 * 60 * 1000), true);
});
