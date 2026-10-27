'use strict';
// Regras do Chefe Cooperativo: dois caçadores contra um chefe da campanha.
// O chefe joga contra cada caçador separado (uma "pista" para cada um), com a IA,
// as pistas e as fraquezas por fase que ele tem na campanha.
const { RULES, WEAPONS, WEAPON_MOVE, characterById } = require('./catalog');

const RAID = {
  bosses: ['kastle', 'coveiro', 'relojoeiro', 'morgana'],
  hpPerHunter: 1.0,       // vida do chefe = vida da campanha × caçadores
  baseDamage: 25,
  weaknessMult: 1.6,
  resistMult: 0.5,
  bossDamageMult: 0.8,
  weaponMs: 10000,
  revealMs: 3800,
  rewardEcto: 40,
};

/**
 * @param {object[]} players  caçadores ({ id, nickname, character })
 * @param {string} bossId
 * @param {{ ENEMIES: object, chooseMove: Function, rollTell: Function, outcome: Function }} shared
 * @param {() => number} rng
 */
function createRaid(players, bossId, shared, rng) {
  const def = shared.ENEMIES[bossId];
  const hp = Math.round(def.hp * RAID.hpPerHunter * players.length);
  return {
    shared, rng, round: 0, phase: 'idle', over: false, won: false,
    boss: { id: bossId, def, hp, maxHp: hp, phase: 0, lanes: players.map(() => []) },
    hunters: players.map(p => {
      const maxHp = characterById(p.character)?.hp ?? RULES.baseHp;
      return { id: p.id, nickname: p.nickname, character: p.character, hp: maxHp, maxHp, history: [], weapon: null, locked: false, intent: null, tell: null };
    }),
  };
}

const alive = (h) => h.hp > 0;

/** O chefe decide o golpe contra cada caçador vivo (e às vezes deixa uma pista). */
function startRaidRound(raid) {
  const { shared, rng, boss } = raid;
  raid.round++;
  raid.phase = 'weapon';
  raid.hunters.forEach((h, i) => {
    h.weapon = null;
    h.locked = !alive(h);
    if (!alive(h)) return;
    h.intent = shared.chooseMove(boss.def.ai, { playerHistory: h.history.map(w => WEAPON_MOVE[w]), ownHistory: boss.lanes[i] }, rng);
    h.tell = shared.rollTell(boss.def.tell, h.intent, rng);
  });
  return raid;
}

function pickRaidWeapon(raid, i, weapon) {
  const h = raid.hunters[i];
  if (raid.phase !== 'weapon' || h.locked || !WEAPONS.includes(weapon)) return false;
  h.weapon = weapon;
  h.locked = true;
  return true;
}

const allLocked = (raid) => raid.hunters.every(h => h.locked);

function weaknessOf(boss) {
  const p = boss.def.phases?.[boss.phase];
  return { weak: p?.weakness ?? boss.def.weakness, resist: p?.resist ?? boss.def.resist };
}

/** Resolve a rodada: cada caçador troca golpes com o chefe na sua pista. */
function resolveRaid(raid) {
  const { shared, rng, boss } = raid;
  const exchanges = [];
  raid.hunters.forEach((h, i) => {
    if (!alive(h)) return;
    if (!h.weapon) h.weapon = h.history.at(-1) ?? WEAPONS[Math.floor(rng() * WEAPONS.length)];
    h.history.push(h.weapon);
    boss.lanes[i].push(h.intent);
    const result = shared.outcome(WEAPON_MOVE[h.weapon], h.intent);
    const ex = { seat: i, weapon: h.weapon, bossMove: h.intent, outcome: result, damage: 0, effectiveness: 'normal', hurt: 0 };
    if (result === 'win' && boss.hp > 0) {
      const { weak, resist } = weaknessOf(boss);
      ex.effectiveness = h.weapon === weak ? 'weak' : h.weapon === resist ? 'resist' : 'normal';
      const char = characterById(h.character);
      let dmg = RAID.baseDamage + (char?.weapon === h.weapon ? RULES.passiveBonus : 0);
      dmg *= ex.effectiveness === 'weak' ? RAID.weaknessMult : ex.effectiveness === 'resist' ? RAID.resistMult : 1;
      ex.damage = Math.min(boss.hp, Math.round(dmg));
      boss.hp -= ex.damage;
    } else if (result === 'lose') {
      ex.hurt = Math.min(h.hp, Math.round(boss.def.damage * RAID.bossDamageMult));
      h.hp -= ex.hurt;
    }
    exchanges.push(ex);
  });
  // fases do chefe pela vida que falta (a fraqueza muda)
  const before = boss.phase;
  if (boss.def.phases && boss.hp > 0) {
    const n = boss.def.phases.length;
    boss.phase = Math.max(boss.phase, Math.min(n - 1, Math.floor((1 - boss.hp / boss.maxHp) * n)));
  }
  raid.phase = 'reveal';
  if (boss.hp <= 0) { raid.over = true; raid.won = true; }
  else if (!raid.hunters.some(alive)) { raid.over = true; raid.won = false; }
  return {
    round: raid.round, exchanges,
    boss: { hp: boss.hp, maxHp: boss.maxHp, phase: boss.phase, phaseChanged: boss.phase !== before },
    hunters: raid.hunters.map(h => ({ hp: h.hp, maxHp: h.maxHp })),
    over: raid.over, won: raid.won,
  };
}

module.exports = { RAID, createRaid, startRaidRound, pickRaidWeapon, allLocked, resolveRaid };
