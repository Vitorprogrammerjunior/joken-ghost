'use strict';
// Adversários automáticos da ranqueada: dificuldade, quando entram, disfarce e jogo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RULES, WEAPONS, BEATS, CHARACTERS, validateDeck, cardById } = require('../src/catalog');
const { BotPolicy, skillFor } = require('../src/bots/policy');
const { BotBrain, predict, counterOf } = require('../src/bots/BotBrain');
const { createBotPersona } = require('../src/bots/persona');
const { botNickname } = require('../src/bots/names');
const { loadShared } = require('../src/shared');

/** Gerador com semente para os testes saírem sempre iguais. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

test('dificuldade: sobe com os troféus e acompanha a fase do jogador', () => {
  assert.ok(skillFor(0) < skillFor(700));
  assert.ok(skillFor(700) < skillFor(1400));
  assert.ok(skillFor(700, [false, false, false]) < skillFor(700), 'em sequência de derrotas o bot alivia');
  assert.ok(skillFor(700, [true, true, true]) > skillFor(700), 'em sequência de vitórias ele aperta');
  for (const r of [[], Array(10).fill(false), Array(10).fill(true)]) {
    const s = skillFor(5000, r);
    assert.ok(s >= 0.08 && s <= 0.92);
  }
});

test('quando a ranqueada completa com bot', () => {
  let now = 0;
  const policy = new BotPolicy({ rules: RULES.rankedBot, now: () => now, rng: () => 0.5 });
  const veteran = { id: 'v', trophies: 500, wins: 20, losses: 15 };
  const rookie = { id: 'n', trophies: 0, wins: 0, losses: 0 };
  assert.ok(policy.waitFor(rookie) < policy.waitFor(veteran), 'conta nova espera menos');
  const waitFor = policy.waitFor(veteran);
  assert.equal(policy.canFill(veteran, { waitedMs: waitFor - 1, waitFor, othersWaiting: false }), false);
  assert.equal(policy.canFill(veteran, { waitedMs: waitFor, waitFor, othersWaiting: true }), false, 'tem gente na fila');
  assert.equal(policy.canFill(veteran, { waitedMs: waitFor, waitFor, othersWaiting: false }), true);
  const pro = { ...veteran, id: 'p', trophies: RULES.rankedBot.maxTrophies + 1 };
  assert.equal(policy.canFill(pro, { waitedMs: 1e9, waitFor, othersWaiting: false }), false, 'topo é só gente');
  for (let i = 0; i < RULES.rankedBot.perHour; i++) policy.noteBotMatch('v');
  assert.equal(policy.canFill(veteran, { waitedMs: waitFor, waitFor, othersWaiting: false }), false, 'limite por hora');
  now += 61 * 60 * 1000;
  assert.equal(policy.canFill(veteran, { waitedMs: waitFor, waitFor, othersWaiting: false }), true, 'a janela de 1h passou');
});

test('disfarce: parece um jogador comum do mesmo nível', () => {
  const rng = seeded(3);
  const player = { trophies: 640 };
  const names = new Set();
  for (let i = 0; i < 50; i++) {
    const bot = createBotPersona(player, rng);
    assert.match(bot.id, /^[0-9a-f]{16}$/);
    assert.ok(bot.nickname.length >= 2 && bot.nickname.length <= 16);
    assert.ok(Math.abs(bot.trophies - player.trophies) <= 70);
    assert.ok(CHARACTERS.some(c => c.id === bot.character));
    assert.ok(CHARACTERS.some(c => c.id === bot.avatar.hunter));
    assert.ok(bot.deck.length && validateDeck(bot.deck).ok, 'usa uma build pronta válida');
    names.add(bot.nickname);
  }
  assert.ok(names.size > 40, 'um nome novo a cada partida');
  assert.ok(botNickname(seeded(1)).length <= 16);
});

test('previsão: acha o padrão do jogador', () => {
  assert.equal(predict([]).weapon, null);
  const cycle = ['estaca', 'aspirador', 'cruz', 'estaca', 'aspirador', 'cruz', 'estaca', 'aspirador'];
  const p = predict(cycle);
  assert.equal(p.weapon, 'cruz');
  assert.ok(p.confidence >= 0.5);
  assert.equal(BEATS[counterOf('cruz')], 'cruz');
});

/** Bot contra um jogador que gira as armas sempre na mesma ordem: quantas rodadas o bot vence. */
function winRate(skill, chooseMove, seed) {
  const rng = seeded(seed);
  const brain = new BotBrain({ skill, style: { type: 'random' }, chooseMove, rules: RULES.rankedBot, rng });
  const own = [], opp = [];
  let wins = 0;
  for (let i = 0; i < 300; i++) {
    const player = WEAPONS[i % 3];
    const bot = brain.chooseWeapon({ ownHistory: own, oppHistory: opp, forbidden: null });
    if (BEATS[bot] === player) wins++;
    own.push(bot); opp.push(player);
  }
  return wins / 300;
}

test('o bot difícil lê o jogador previsível muito melhor que o fácil', async () => {
  const { chooseMove } = await loadShared();
  const easy = winRate(0.1, chooseMove, 5);
  const hard = winRate(0.9, chooseMove, 5);
  assert.ok(hard > easy + 0.25, `fácil ${easy.toFixed(2)} x difícil ${hard.toFixed(2)}`);
  assert.ok(hard < 0.9, `nem o mais difícil é perfeito (${hard.toFixed(2)})`);
});

test('cartas: cura quando está ferido e respeita o tempo da fase', () => {
  const brain = new BotBrain({ skill: 0.9, style: { type: 'random' }, chooseMove: () => 'pedra', rules: RULES.rankedBot, rng: () => 0.1 });
  assert.equal(brain.chooseCard(['cura', 'escudo'], { hp: 40, maxHp: 100, oppHistory: [] }), 'cura');
  assert.equal(brain.chooseCard([], { hp: 100, maxHp: 100, oppHistory: [] }), null);
  assert.ok(brain.think('weapon', 5000) <= 4600);
});
