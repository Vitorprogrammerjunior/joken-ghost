import { test } from 'node:test';
import assert from 'node:assert/strict';

import { outcome, counterOf } from '../src/domain/rps.js';
import { chooseMove, mostFrequent } from '../src/domain/enemyAI.js';
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
