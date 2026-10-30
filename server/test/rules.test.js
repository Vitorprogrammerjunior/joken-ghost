'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const duel = require('../src/duel');
const { trophyDelta, applyResult, FarmGuard } = require('../src/trophies');
const { leagueOf, validateDeck, deckOf, cleanBuild, deckCost, DEFAULT_DECK, DECK, RULES } = require('../src/catalog');

const player = (over = {}) => ({ id: Math.random().toString(16).slice(2), nickname: 'X', trophies: 0, best: 0, wins: 0, losses: 0, character: 'cacador', ...over });
const fixed = (v) => () => v;
const allCards = () => ['escudo', 'cura', 'golpe_duplo'];
const duo = (a = player(), b = player(), rng = fixed(0.9)) => duel.createDuel([[a], [b]], allCards, rng);
const hp = (d, side) => d.sides[side].hp;

/** Joga uma rodada completa com cartas e armas definidas para cada lutador. */
function round(d, ...plays) {
  duel.startRound(d);
  plays.forEach(([card], i) => { if (card) d.fighters[i].hand.push(card); duel.pickCard(d, i, card ?? null); });
  duel.startWeaponPhase(d);
  plays.forEach(([, weapon], i) => { if (weapon) duel.pickWeapon(d, i, weapon); });
  return duel.resolveRound(d);
}

test('jokenpô: estaca vence cruz e o perdedor toma dano base', () => {
  const d = duo();
  const r = round(d, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r.lanes[0].outcome, 'a');
  assert.equal(hp(d, 1), RULES.baseHp - RULES.baseDamage);
  assert.equal(hp(d, 0), RULES.baseHp);
});

test('resultado diz se a carta de cada um deu certo', () => {
  // venceu e acertou: deu certo; o Escudo de quem perdeu segurou o golpe: as duas situações
  let r = round(duo(), ['golpe_duplo', 'aspirador'], [null, 'estaca']);
  assert.equal(r.fighters[0].cardOk, true);
  assert.equal(r.fighters[1].cardOk, false);

  r = round(duo(), ['golpe_duplo', 'aspirador'], ['escudo', 'estaca']);
  assert.equal(r.fighters[0].cardOk, false, 'o golpe foi bloqueado');
  assert.equal(r.fighters[1].cardOk, true, 'o escudo segurou');

  // Escudo de quem venceu não fez nada; carta de arma com a arma errada também não
  r = round(duo(), ['escudo', 'aspirador'], ['estaca_prata', 'estaca']);
  assert.equal(r.fighters[0].cardOk, false);
  assert.equal(r.fighters[1].cardOk, false);
  r = round(duo(), ['cruz_flamejante', 'aspirador'], [null, 'estaca']);
  assert.equal(r.fighters[0].cardOk, false);
  r = round(duo(), ['estaca_prata', 'estaca'], [null, 'cruz']);
  assert.equal(r.fighters[0].cardOk, true);

  // empate: Golpe Duplo falha, Empate Forte funciona
  r = round(duo(), ['golpe_duplo', 'cruz'], ['empate_forte', 'cruz']);
  assert.equal(r.fighters[0].cardOk, false);
  assert.equal(r.fighters[1].cardOk, true);

  // Espinhos só funciona perdendo; Bálsamo sem vida para curar falha
  r = round(duo(), [null, 'aspirador'], ['espinhos', 'estaca']);
  assert.equal(r.fighters[1].cardOk, true);
  r = round(duo(), ['cura', 'aspirador'], [null, 'estaca']);
  assert.equal(r.fighters[0].cardOk, false);

  // quem não jogou carta não tem o que quebrar
  r = round(duo(), [null, 'aspirador'], [null, 'estaca']);
  assert.equal(r.fighters[0].cardOk, false);
  assert.equal(r.fighters[0].card, null);
});

test('resultado: Provocação vale quando proíbe alguma arma', () => {
  const d = duo();
  let r = round(d, ['provocacao', 'aspirador'], [null, 'estaca']);
  assert.equal(r.fighters[0].cardOk, false, 'ainda não havia arma para proibir');
  d.fighters[0].used = [];
  r = round(d, ['provocacao', 'cruz'], [null, 'cruz']);
  assert.equal(r.fighters[0].cardOk, true);
});

test('cartas: golpe duplo, escudo, espinhos e vampirismo', () => {
  let d = duo();
  round(d, ['golpe_duplo', 'aspirador'], [null, 'estaca']);
  assert.equal(hp(d, 1), 100 - 40);

  d = duo();
  round(d, [null, 'aspirador'], ['escudo', 'estaca']);
  assert.equal(hp(d, 1), 100);

  d = duo();
  round(d, [null, 'aspirador'], ['espinhos', 'estaca']);
  assert.equal(hp(d, 1), 80);
  assert.equal(hp(d, 0), 88);

  d = duo();
  d.sides[0].hp = 50;
  round(d, ['vampirismo', 'cruz'], [null, 'aspirador']);
  assert.equal(hp(d, 0), 60);
});

test('cartas novas: arma, disfarce, juízo com risco e escudo sagrado com cura', () => {
  let d = duo();
  round(d, ['cruz_flamejante', 'cruz'], [null, 'aspirador']);
  assert.equal(hp(d, 1), 100 - 20 - RULES.weaponCardBonus);

  d = duo();
  round(d, ['cruz_flamejante', 'estaca'], [null, 'cruz']); // venceu com outra arma: sem bônus
  assert.equal(hp(d, 1), 80);

  d = duo();
  round(d, ['disfarce', 'estaca'], [null, 'cruz']);
  assert.equal(hp(d, 1), 70);

  d = duo();
  round(d, ['juizo', 'estaca'], [null, 'aspirador']); // perdeu segurando o Juízo
  assert.equal(hp(d, 0), 100 - 20 - 10);

  d = duo();
  d.sides[1].hp = 80;
  round(d, [null, 'estaca'], ['escudo_sagrado', 'cruz']);
  assert.equal(hp(d, 1), 90);
});

test('provocação proíbe repetir a arma e o tempo esgotado repete a última', () => {
  const d = duo();
  round(d, [null, 'estaca'], [null, 'cruz']);
  duel.startRound(d);
  d.fighters[1].hand.push('provocacao');
  duel.pickCard(d, 0, null);
  duel.pickCard(d, 1, 'provocacao');
  duel.startWeaponPhase(d);
  assert.equal(d.fighters[0].forbidden, 'estaca');
  assert.equal(duel.pickWeapon(d, 0, 'estaca'), false);
  assert.notEqual(duel.autoWeapon(d, 0), 'estaca');
  const r = duel.resolveRound(d);
  assert.notEqual(r.fighters[0].weapon, 'estaca');

  const e = duo();
  round(e, [null, 'aspirador'], [null, 'cruz']);
  const r2 = round(e, [null, null], [null, 'estaca']); // ninguém escolheu: repete Aspirador
  assert.equal(r2.fighters[0].weapon, 'aspirador');
});

test('visão: o oponente tem menos tempo e o disfarce mostra uma arma falsa', () => {
  const d = duo();
  duel.startRound(d);
  d.fighters[0].hand.push('visao');
  d.fighters[1].hand.push('disfarce');
  duel.pickCard(d, 0, 'visao');
  duel.pickCard(d, 1, 'disfarce');
  duel.startWeaponPhase(d);
  assert.equal(duel.weaponTime(d, 1), RULES.visionWeaponMs);
  assert.equal(duel.weaponTime(d, 0), RULES.weaponPhaseMs);
  duel.pickWeapon(d, 1, 'cruz');
  assert.notEqual(duel.visionOf(d, 1), 'cruz');
});

test('personagens: passiva de arma, vida extra e esquiva', () => {
  const d = duo(player({ character: 'luna' }), player({ character: 'ze' }));
  assert.equal(d.sides[1].maxHp, 120);
  round(d, [null, 'aspirador'], [null, 'estaca']);
  assert.equal(hp(d, 1), 120 - 25);

  const e = duo(player(), player({ character: 'sombra' }), fixed(0.9));
  const r = round(e, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r.fighters[1].dodged, true, 'a Sombra desvia do primeiro golpe');
  assert.equal(hp(e, 1), 100);
  const r2 = round(e, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r2.fighters[1].dodged, false, 'só do primeiro');
  assert.equal(hp(e, 1), 80);
});

test('2x2: duas pistas, vida somada por lado', () => {
  const d = duel.createDuel([[player(), player()], [player(), player()]], allCards, fixed(0.9));
  assert.equal(d.sides[0].maxHp, 150); // 2 × 100 × 75%
  assert.equal(duel.laneOpponent(d, 0), 2);
  assert.equal(duel.laneOpponent(d, 3), 1);
  const r = round(d, [null, 'estaca'], [null, 'cruz'], [null, 'cruz'], [null, 'estaca']);
  // pista 1: estaca vence cruz (lado 1 toma 20); pista 2: estaca vence cruz (lado 0 toma 20)
  assert.deepEqual(r.lanes.map(l => l.outcome), ['a', 'b']);
  assert.deepEqual(r.hp, [130, 130]);
});

test('cartas usadas não voltam para a mão e mão vazia pula a escolha', () => {
  const d = duel.createDuel([[player()], [player()]], allCards, Math.random);
  duel.startRound(d);
  const first = d.fighters[0].hand[0];
  duel.pickCard(d, 0, first);
  duel.startWeaponPhase(d);
  duel.resolveRound(d);
  for (let i = 0; i < 2; i++) {
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
  const d = duo(player(), player(), Math.random);
  duel.startRound(d);
  assert.equal(duel.pickCard(d, 0, 'juizo'), false);
  duel.startWeaponPhase(d);
  assert.equal(duel.pickWeapon(d, 0, 'bazuca'), false);
});

test('a partida termina quando a vida zera', () => {
  const d = duo();
  let r;
  for (let i = 0; i < 10 && !(r && r.winner != null); i++) r = round(d, [null, 'cruz'], [null, 'aspirador']);
  assert.equal(r.winner, 0);
  assert.equal(hp(d, 1), 0);
});

test('build: até 6 cartas diferentes dentro do orçamento, todas abertas para todo mundo', () => {
  assert.equal(validateDeck(['juizo', 'escudo_sagrado', 'escudo', 'cura']).ok, true);   // 4+4+1+1 = 10
  assert.equal(validateDeck(['juizo', 'escudo_sagrado', 'escudo', 'cura', 'golpe_duplo']).ok, false); // 11 pontos
  assert.equal(validateDeck(['escudo', 'escudo']).ok, false);
  assert.equal(validateDeck(['bazuca']).ok, false);
  assert.equal(deckCost(DEFAULT_DECK), DECK.budget);
  assert.equal(validateDeck(DEFAULT_DECK).ok, true);
  // build antiga de 8 cartas não cabe: usa a padrão
  const old = ['juizo', 'visao', 'furia', 'golpe_duplo', 'sorte', 'estaca_prata', 'escudo', 'cura'];
  assert.deepEqual(deckOf(player({ deck: old })), DEFAULT_DECK);
  assert.deepEqual(deckOf(player({ deck: ['juizo'] })), ['juizo']);
  const ok = cleanBuild({ name: '  <Rush> ', character: 'sombra', cards: ['juizo', 'escudo'] });
  assert.deepEqual(ok.build, { name: 'Rush', character: 'sombra', cards: ['juizo', 'escudo'] });
  assert.equal(cleanBuild({ character: 'x', cards: ['juizo'] }).ok, false);
  assert.equal(cleanBuild({ character: 'luna', cards: [] }).ok, false);
});

test('banir: cada um tira uma carta da build do outro; sem escolher, sai a mais cara', () => {
  const d = duel.createDuel([[player({ nickname: 'A' })], [player()]], (p) => (p.nickname === 'A' ? ['escudo', 'juizo'] : ['cura', 'visao', 'sorte']), fixed(0.5));
  duel.startBanPhase(d);
  assert.equal(duel.pickBan(d, 0, 'escudo'), false, 'só cartas da build do adversário');
  assert.equal(duel.pickBan(d, 0, 'sorte'), true);
  assert.deepEqual(duel.applyBans(d), ['juizo', 'sorte'], 'quem não escolheu bane a mais cara');
  assert.deepEqual(d.fighters[0].deck, ['escudo']);
  assert.deepEqual(d.fighters[1].deck, ['cura', 'visao']);
});

test('rodadas: depois da última, vence quem tiver mais vida; empatado, segue', () => {
  const d = duo();
  for (let i = 1; i < RULES.maxRounds; i++) round(d, [null, 'estaca'], [null, 'estaca']);
  let r = round(d, [null, 'estaca'], [null, 'estaca']);
  assert.equal(r.winner, null, 'empate em vida: segue');
  r = round(d, [null, 'estaca'], [null, 'cruz']);
  assert.equal(r.winner, 0);
  assert.equal(r.reason, 'tempo');
});

test('trevo da sorte: sem sorteio (+10 se vencer, cura 10 se empatar)', () => {
  const d = duo(player(), player(), fixed(0.99));
  round(d, ['sorte', 'estaca'], [null, 'cruz']);
  assert.equal(hp(d, 1), 100 - 30);
  d.sides[0].hp = 50;
  round(d, ['sorte', 'cruz'], [null, 'cruz']);
  assert.equal(hp(d, 0), 60);
});

test('troféus: vencer alguém mais forte vale mais e ninguém fica negativo', () => {
  assert.ok(trophyDelta(0, 500).gain > trophyDelta(500, 0).gain);
  assert.equal(trophyDelta(100, 3).loss, 3);
  const w = player({ trophies: 140, best: 140 }), l = player({ trophies: 10, best: 10 });
  const [rw, rl] = applyResult(w, l);
  assert.ok(rw.delta > 0 && rl.delta < 0);
  assert.equal(w.best, w.trophies);
  assert.equal(l.losses, 1);
});

test('ligas por troféus', () => {
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
