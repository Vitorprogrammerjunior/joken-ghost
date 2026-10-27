import { test } from 'node:test';
import assert from 'node:assert/strict';

import { outcome, counterOf } from '../src/domain/rps.js';
import { chooseMove, mostFrequent, rollTell, lastWinningMove } from '../src/domain/enemyAI.js';
import { buildStats } from '../src/domain/loadout.js';
import { Run, generateWave, createDailyRun, replayDaily, dayKey, daySeed } from '../src/domain/run.js';
import { DAILY } from '../src/config/runs.js';
import { buyUpgrade, nextCost, upgradeLevel, campaignStats, totalStars, isRewardUnlocked, difficultyOf, nextReward, isLevelOpen } from '../src/domain/campaign.js';
import { seeded } from '../src/domain/random.js';
import { Economy } from '../src/domain/economy.js';
import { Battle } from '../src/domain/battle.js';
import { SaveManager, migrate, recordVictory, newProfile } from '../src/domain/progress.js';
import * as Bestiary from '../src/domain/bestiary.js';
import { loadOptions, DEFAULT_OPTIONS } from '../src/domain/options.js';
import { LEVELS } from '../src/config/levels.js';
import { ENEMIES } from '../src/config/enemies.js';
import { WEAPONS } from '../src/config/weapons.js';
import { DAMAGE, REWARDS } from '../src/config/balance.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
};

/** Arma que vence / perde / empata contra a jogada `move`. */
const weaponThat = (result, move) => Object.values(WEAPONS).find(w => outcome(w.move, move) === result).id;

test('pedra, papel e tesoura', () => {
  assert.equal(outcome('pedra', 'tesoura'), 'win');
  assert.equal(outcome('papel', 'pedra'), 'win');
  assert.equal(outcome('tesoura', 'papel'), 'win');
  assert.equal(outcome('pedra', 'papel'), 'lose');
  assert.equal(outcome('papel', 'papel'), 'draw');
  assert.equal(counterOf('pedra'), 'papel');
});

test('IA: perfis seguem seus comportamentos', () => {
  const rng = seeded(42);
  const cycle = { type: 'cycle', sequence: ['pedra', 'tesoura', 'papel'], noise: 0 };
  assert.deepEqual([0, 1, 2, 3].map(n => chooseMove(cycle, { ownHistory: Array(n).fill('x') }, rng)), ['pedra', 'tesoura', 'papel', 'pedra']);

  const mimic = { type: 'mimic', chance: 1 };
  assert.equal(chooseMove(mimic, { playerHistory: ['papel'] }, rng), 'papel');

  const trick = { type: 'trickster', chance: 1 };
  assert.equal(chooseMove(trick, { playerHistory: ['pedra'] }, rng), 'papel');

  const learner = { type: 'learner', adapt: 1 };
  assert.equal(chooseMove(learner, { playerHistory: ['tesoura', 'tesoura', 'pedra'] }, rng), 'pedra');
  assert.equal(mostFrequent(['a', 'b', 'b']), 'b');

  const sticky = { type: 'sticky', repeat: 1 };
  assert.equal(chooseMove(sticky, { ownHistory: ['tesoura'] }, rng), 'tesoura');
});

test('economia: gastar e ganhar', () => {
  const e = new Economy(10);
  const seen = [];
  e.onChange((c, d) => seen.push([c, d]));
  assert.equal(e.spend(20), false);
  assert.equal(e.spend(5), true);
  e.add(7);
  assert.equal(e.coins, 12);
  assert.deepEqual(seen, [[5, -5], [12, 7]]);
});

test('batalha: vitória com fraqueza causa dano extra e dá moedas', () => {
  const economy = new Economy();
  const b = new Battle({ level: LEVELS[0], economy, rng: seeded(1) });
  const ghost = b.alive()[0];
  assert.equal(ghost.id, 'fantasma');
  ghost.intent = 'pedra'; // força a jogada para o teste ser determinístico
  const r = b.attack('aspirador', ghost.uid); // aspirador (papel) vence possessão (pedra)
  assert.equal(r.outcome, 'win');
  assert.equal(r.effectiveness, 'weak');
  assert.equal(r.damage, Math.round(DAMAGE.base * DAMAGE.weaknessMult));
  assert.equal(ghost.hp, ENEMIES.fantasma.hp - r.damage);
  assert.equal(r.coins, REWARDS.weaknessHit);
  assert.equal(economy.coins, r.coins);
});

test('batalha: derrota tira vida e o Amuleto bloqueia', () => {
  const economy = new Economy(100);
  const b = new Battle({ level: LEVELS[0], economy, rng: seeded(2) });
  const ghost = b.alive()[0];

  ghost.intent = 'papel';
  let r = b.attack(weaponThat('lose', 'papel'), ghost.uid);
  assert.equal(r.outcome, 'lose');
  assert.equal(b.player.hp, 100 - ENEMIES.fantasma.damage);

  assert.equal(b.useItem('amuleto').ok, true);
  assert.equal(b.useItem('amuleto').ok, false); // já ativo
  ghost.intent = 'papel';
  r = b.attack(weaponThat('lose', 'papel'), ghost.uid);
  assert.equal(r.blocked, true);
  assert.equal(b.player.hp, 100 - ENEMIES.fantasma.damage);
});

test('batalha: combo multiplica moedas e empate não quebra', () => {
  const b = new Battle({ level: LEVELS[1], economy: new Economy(), rng: seeded(3) });
  const bat = b.alive()[0];
  bat.hp = bat.maxHp = 999; // sobrevive aos golpes do teste
  const coins = [];
  for (let i = 0; i < 2; i++) {
    bat.intent = 'tesoura';
    coins.push(b.attack(weaponThat('win', 'tesoura'), bat.uid).coins);
  }
  bat.intent = 'papel';
  b.attack(weaponThat('draw', 'papel'), bat.uid);
  assert.equal(b.combo, 2);
  assert.ok(coins[1] > coins[0]);
});

test('batalha: limpar todas as ondas vence a fase', () => {
  const economy = new Economy();
  const b = new Battle({ level: LEVELS[0], economy, rng: seeded(4) });
  let last;
  for (let guard = 0; guard < 100; guard++) {
    const t = b.alive()[0];
    if (!t) break;
    for (const e of b.alive()) e.intent = t.intent; // os outros perdem para a mesma arma
    last = b.attack(weaponThat('win', t.intent), t.uid);
    if (last.waveCleared && !last.battleWon) b.nextWave();
    if (last.battleWon) break;
  }
  assert.equal(last.battleWon, true);
  assert.equal(b.damageTaken, 0);
  assert.equal(last.clearBonus, REWARDS.levelClear + REWARDS.perfectBonus);
  assert.equal(b.stars(), 3);
});

test('chefe muda de fase e de fraqueza', () => {
  const b = new Battle({ level: { waves: [['kastle']] }, economy: new Economy(), rng: seeded(5) });
  const boss = b.alive()[0];
  assert.equal(b.weaknessOf(boss), 'cruz');
  let changed = null;
  while (changed === null) {
    boss.intent = 'papel';
    changed = b.attack('cruz', boss.uid).phaseChanged;
  }
  assert.equal(changed, 1);
  assert.equal(b.weaknessOf(boss), 'estaca');
});

test('dano recebido nunca passa da vida máxima', () => {
  const b = new Battle({ level: LEVELS[3], economy: new Economy(), rng: seeded(7) });
  for (let guard = 0; guard < 50 && b.player.hp > 0; guard++) {
    const t = b.alive()[0];
    b.attack(weaponThat('lose', t.intent), t.uid);
  }
  assert.equal(b.player.hp, 0);
  assert.equal(b.damageTaken, b.player.maxHp);
});

test('itens: cura não passa do máximo e exige moedas', () => {
  const economy = new Economy(10);
  const b = new Battle({ level: LEVELS[0], economy, rng: seeded(6) });
  assert.equal(b.useItem('pocao').reason, 'Sua vida já está cheia!');
  b.player.hp = 50;
  assert.equal(b.useItem('pocao').ok, false); // sem moedas
  economy.add(100);
  const r = b.useItem('pocao_grande');
  assert.equal(r.ok, true);
  assert.equal(r.healed, 50);
  assert.equal(b.player.hp, 100);
});

test('saves: cria, migra v1 e registra vitória', () => {
  const storage = memStorage();
  const saves = new SaveManager(storage);
  assert.equal(saves.load(1), null);
  const p = saves.create(1);
  recordVictory(p, 1, 3, 4);
  saves.save(p);
  const loaded = saves.load(1);
  assert.equal(loaded.unlocked, 2);
  assert.equal(loaded.stars[1], 3);

  storage.setItem('jokenghost_save_2', JSON.stringify({ slot: 2, date: '01/01/2025', level: 3, coins: 120, bestiaryCount: 1 }));
  const old = saves.load(2);
  assert.equal(old.version, 2);
  assert.equal(old.unlocked, 3);
  assert.equal(old.coins, 120);
  assert.equal(migrate(null, 1), null);
  assert.equal(newProfile(3).slot, 3);
});

test('monstruário revela informações aos poucos', () => {
  const book = {};
  assert.equal(Bestiary.view(book, 'fantasma').known, false);
  assert.equal(Bestiary.see(book, 'fantasma'), true);
  assert.equal(Bestiary.see(book, 'fantasma'), false);
  assert.equal(Bestiary.reveal(book, 'fantasma', 'weak', 'aspirador'), true);
  assert.equal(Bestiary.reveal(book, 'fantasma', 'weak', 'aspirador'), false);
  let v = Bestiary.view(book, 'fantasma');
  assert.deepEqual(v.weak, ['aspirador']);
  assert.equal(v.behavior, null);
  Bestiary.kill(book, 'fantasma');
  Bestiary.kill(book, 'fantasma');
  v = Bestiary.view(book, 'fantasma');
  assert.ok(v.behavior);
  assert.equal(Bestiary.seenCount(book), 1);
});

test('opções: padrão e formato antigo', () => {
  const s = memStorage();
  assert.deepEqual(loadOptions(s), DEFAULT_OPTIONS);
  s.setItem('jokenghost_options', JSON.stringify({ bgmVol: 10, shake: false }));
  const o = loadOptions(s);
  assert.equal(o.musicVol, 10);
  assert.equal(o.shake, false);
});

test('todas as fases usam inimigos existentes', () => {
  for (const lvl of LEVELS) for (const wave of lvl.waves) for (const id of wave) assert.ok(ENEMIES[id], id);
});

test('batalha: monstros que não são o alvo acertam meio golpe se vencerem a arma', () => {
  const b = new Battle({ level: { waves: [['morcego', 'fantasma', 'fogo_fatuo']] }, economy: new Economy(), rng: seeded(8) });
  const [bat, ghost, wisp] = b.alive();
  bat.intent = 'pedra';     // perde para o Aspirador (papel)
  ghost.intent = 'tesoura'; // vence o Aspirador: golpe lateral
  wisp.intent = 'papel';    // empata: não faz nada
  const r = b.attack('aspirador', bat.uid);
  assert.equal(r.outcome, 'win');
  assert.deepEqual(r.sideHits.map(h => h.uid), [ghost.uid]);
  assert.equal(r.sideHits[0].damage, Math.round(ENEMIES.fantasma.damage * DAMAGE.sideHitMult));
  assert.equal(b.player.hp, 100 - r.sideHits[0].damage);
  assert.deepEqual(r.moves.map(m => m.move), ['pedra', 'tesoura', 'papel']);
});

test('batalha: o Amuleto bloqueia só o primeiro golpe do turno', () => {
  const b = new Battle({ level: { waves: [['morcego', 'fantasma']] }, economy: new Economy(100), rng: seeded(9) });
  const [bat, ghost] = b.alive();
  b.useItem('amuleto');
  bat.intent = 'tesoura'; ghost.intent = 'tesoura'; // os dois vencem o Aspirador
  const r = b.attack('aspirador', bat.uid);
  assert.equal(r.blocked, true);
  assert.equal(r.sideHits[0].blocked, false);
  assert.equal(b.player.hp, 100 - r.sideHits[0].damage);
});

test('itens: a bolsa tem limite por onda e enche de novo na próxima', () => {
  const b = new Battle({ level: LEVELS[0], economy: new Economy(1000), rng: seeded(10) });
  for (let i = 0; i < b.stats.itemSlots; i++) {
    b.player.hp = 10;
    assert.equal(b.useItem('pocao').ok, true, `poção ${i + 1}`);
  }
  b.player.hp = 10;
  assert.equal(b.itemsLeft, 0);
  assert.equal(b.useItem('pocao').reason, 'Sua bolsa está vazia nesta onda!');
  b.nextWave();
  assert.equal(b.itemsLeft, b.stats.itemSlots);
});

test('itens: monstro derrotado pode deixar +1 item na bolsa da onda', () => {
  const stats = buildStats([{ set: { dropChance: 1 } }]);
  const b = new Battle({ level: { waves: [['fantasma', 'fantasma', 'fantasma'], ['morcego']] }, economy: new Economy(), rng: seeded(11), stats });
  for (const e of b.alive()) { e.hp = 1; e.intent = 'pedra'; }
  const [first] = b.alive();
  const r = b.attack('aspirador', first.uid);
  assert.equal(r.drops, 1);
  assert.equal(b.bagSize, stats.itemSlots + 1);
  for (const e of b.alive()) { e.intent = 'pedra'; b.attack('aspirador', e.uid); }
  assert.equal(b.bonusItems, 2); // no máximo 2 por onda
  b.nextWave();
  assert.equal(b.bonusItems, 0);
});

test('pistas: aparecem com a chance do monstro e os mentirosos mostram outra jogada', () => {
  const rng = seeded(11);
  assert.equal(rollTell(null, 'pedra', rng), null);
  assert.equal(rollTell({ chance: 1 }, 'pedra', rng), 'pedra');
  const lies = Array.from({ length: 50 }, () => rollTell({ chance: 1, lie: 1 }, 'pedra', rng));
  assert.ok(lies.every(m => m !== 'pedra'));
});

test('IA: vingativo repete o golpe que venceu e medroso foge do que perdeu', () => {
  const rng = seeded(12);
  const vengeful = { type: 'vengeful', chance: 1 };
  // o monstro (2ª jogada) venceu com tesoura contra papel
  assert.equal(chooseMove(vengeful, { playerHistory: ['pedra', 'papel', 'pedra'], ownHistory: ['tesoura', 'tesoura'] }, rng), 'tesoura');
  assert.equal(lastWinningMove(['pedra'], ['tesoura']), null);
  const coward = { type: 'coward', chance: 1 };
  for (let i = 0; i < 20; i++) assert.notEqual(chooseMove(coward, { playerHistory: ['papel'], ownHistory: ['pedra'] }, rng), 'pedra');
});

test('atributos: modificadores somam, multiplicam e ligam efeitos', () => {
  const s = buildStats([{ add: { maxHp: 20, 'weaponBonus.cruz': 5 } }, { mult: { enemyHpMult: 1.5 } }, { set: { waveShield: true } }]);
  assert.equal(s.maxHp, 120);
  assert.equal(s.weaponBonus.cruz, 5);
  assert.equal(s.enemyHpMult, 1.5);
  assert.equal(s.waveShield, true);
  assert.throws(() => buildStats([{ add: { inexistente: 1 } }]));

  const b = new Battle({ level: { waves: [['fantasma']] }, economy: new Economy(), rng: seeded(13), stats: s });
  assert.equal(b.player.maxHp, 120);
  assert.equal(b.player.shield, true);
  assert.equal(b.alive()[0].maxHp, Math.round(ENEMIES.fantasma.hp * 1.5));
});

test('relíquias: espinhos devolvem dano e abate cura', () => {
  const stats = buildStats([{ add: { thorns: 10, healOnKill: 12 } }]);
  const b = new Battle({ level: { waves: [['fantasma', 'morcego']] }, economy: new Economy(), rng: seeded(14), stats });
  const [ghost, bat] = b.alive();
  ghost.intent = 'tesoura'; bat.intent = 'tesoura';
  const r = b.attack('aspirador', ghost.uid); // perde para os dois
  assert.equal(r.thorns[0].damage, 10);
  assert.equal(r.sideHits[0].thorns[0].damage, 10);
  assert.equal(ghost.hp, ENEMIES.fantasma.hp - 10);
  b.player.hp = 50;
  ghost.hp = 1; ghost.intent = 'pedra'; bat.intent = 'pedra';
  const k = b.attack('aspirador', ghost.uid);
  assert.equal(k.killed, true);
  assert.equal(k.healed, 12);
});

test('oficina: compra níveis, cobra moedas e para no máximo', () => {
  const profile = newProfile(1);
  const economy = new Economy(1000);
  assert.equal(nextCost(profile, 'vida'), 80);
  assert.equal(buyUpgrade(profile, economy, 'vida').ok, true);
  assert.equal(upgradeLevel(profile, 'vida'), 1);
  assert.equal(economy.coins, 920);
  buyUpgrade(profile, economy, 'vida');
  buyUpgrade(profile, economy, 'vida');
  assert.equal(buyUpgrade(profile, economy, 'vida').reason, 'Esta melhoria já está no máximo!');
  assert.equal(buyUpgrade(profile, new Economy(0), 'cruz').reason, 'Moedas insuficientes!');
  const stats = campaignStats(profile);
  assert.equal(stats.maxHp, 130);
});

test('recompensas: estrelas somam os dois modos e liberam Pesadelo e a fase bônus', () => {
  const p = newProfile(1);
  assert.equal(isRewardUnlocked(p, 'pesadelo'), false);
  recordVictory(p, 1, 3, 8);
  recordVictory(p, 2, 3, 8);
  assert.equal(totalStars(p), 6);
  assert.equal(isRewardUnlocked(p, 'pesadelo'), true);
  p.hard = true;
  assert.equal(difficultyOf(p).id, 'pesadelo');
  assert.ok(campaignStats(p).enemyHpMult > 1);
  recordVictory(p, 1, 2, 8, { hard: true });
  assert.equal(p.starsHard[1], 2);
  assert.equal(p.stars[1], 3);
  assert.equal(totalStars(p), 8);
  assert.equal(nextReward(p).id, 'dourado');
  assert.equal(isLevelOpen(p, 3), true);
  assert.equal(isLevelOpen(p, 4), false);
});

test('chefes: o Coveiro chama Zumbis a cada 4 turnos, até 2', () => {
  const b = new Battle({ level: { waves: [['coveiro']] }, economy: new Economy(), rng: seeded(15) });
  const boss = b.alive()[0];
  boss.hp = boss.maxHp = 9999;
  b.player.hp = b.player.maxHp = 9999;
  const summoned = [];
  for (let turn = 1; turn <= 12; turn++) {
    for (const e of b.alive()) e.intent = 'pedra';
    summoned.push(b.attack('estaca', boss.uid).summoned.length); // empata com todos
  }
  assert.deepEqual(summoned, [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0]);
  assert.equal(b.alive().filter(e => e.id === 'zumbi').length, 2);
});

test('chefes: o Relojoeiro joga duas vezes', () => {
  const b = new Battle({ level: { waves: [['relojoeiro']] }, economy: new Economy(), rng: seeded(16) });
  const boss = b.alive()[0];
  boss.intent = 'tesoura'; // perde para a Estaca
  boss.echo = 'papel';     // vence a Estaca: segundo golpe acerta
  const r = b.attack('estaca', boss.uid);
  assert.equal(r.outcome, 'win');
  assert.equal(r.sideHits.length, 1);
  assert.equal(r.sideHits[0].echo, true);
  assert.equal(r.moves.filter(m => m.uid === boss.uid).length, 2);
});

test('fase bônus só abre com a recompensa da Cripta', () => {
  const p = newProfile(1);
  p.unlocked = 8;
  assert.equal(isLevelOpen(p, 9), false);
  for (let id = 1; id <= 6; id++) recordVictory(p, id, 3, 8);
  assert.equal(isLevelOpen(p, 9), true);
});

/** Joga uma corrida inteira com uma estratégia simples (vence o alvo quando a jogada é conhecida). */
function autoplay(run, { cheat = true } = {}) {
  for (let guard = 0; guard < 2000 && !run.over; guard++) {
    if (run.offer) { run.chooseRelic(run.offer[0]); continue; }
    const t = run.battle.alive()[0];
    const weapon = cheat ? weaponThat('win', t.intent) : 'estaca';
    run.attack(weapon, t.uid);
  }
  return run;
}

test('corridas: ondas mais fortes, chefe a cada 5 e mesma semente = mesmas ondas', () => {
  const a = generateWave(0, seeded(1));
  assert.equal(a.length, 1);
  assert.equal(a[0].hpMult, 1);
  const boss = generateWave(4, seeded(1));
  assert.equal(boss[0].id, 'kastle');
  assert.ok(boss[0].hpMult > 1);
  const w1 = new Run({ seed: 99, economy: new Economy() });
  const w2 = new Run({ seed: 99, economy: new Economy() });
  assert.deepEqual(w1.battle.alive().map(e => e.id), w2.battle.alive().map(e => e.id));
});

test('corridas: depois de cada onda oferece 3 relíquias e a escolhida muda os atributos', () => {
  const run = new Run({ seed: 7, economy: new Economy() });
  const t = run.battle.alive()[0];
  t.hp = 1;
  run.attack(weaponThat('win', t.intent), t.uid);
  assert.equal(run.wavesCleared, 1);
  assert.equal(run.offer.length, 3);
  assert.throws(() => run.attack('estaca', 1));
  const before = run.battle.player.maxHp;
  const pick = run.offer.includes('coracao') ? 'coracao' : run.offer[0];
  run.chooseRelic(pick);
  assert.equal(run.offer, null);
  assert.equal(run.battle.waveIndex, 1);
  if (pick === 'coracao') assert.equal(run.battle.player.maxHp, before + 25);
});

test('desafio do dia: o replay das jogadas chega na mesma pontuação', () => {
  const seed = daySeed('2026-10-26');
  const run = autoplay(createDailyRun(seed));
  assert.equal(run.won, true);
  assert.equal(run.wavesCleared, DAILY.waves);
  const check = replayDaily(seed, run.actions);
  assert.equal(check.ok, true);
  assert.equal(check.score, run.score);
  // jogadas adulteradas não passam
  assert.equal(replayDaily(seed, [...run.actions, ['a', 'estaca', 1]]).ok, false);
  assert.equal(replayDaily(seed, run.actions.slice(0, 5)).ok, false);
  assert.equal(replayDaily(seed + 1, run.actions).ok, false);
});

test('desafio do dia: a data vira à meia-noite de Brasília', () => {
  assert.equal(dayKey(new Date('2026-10-26T02:59:00Z')), '2026-10-25');
  assert.equal(dayKey(new Date('2026-10-26T03:01:00Z')), '2026-10-26');
  assert.notEqual(daySeed('2026-10-25'), daySeed('2026-10-26'));
});
