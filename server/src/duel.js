'use strict';
// Regras de um duelo entre dois caçadores. Sem rede nem timers: só estado e cálculo.
//
// Cada rodada: (1) os dois escolhem uma carta da mão (opcional),
// (2) as cartas são reveladas e os dois escolhem a arma, (3) o jokenpô decide quem acerta.
const { RULES, WEAPONS, BEATS, characterById, cardById, unlockedCards } = require('./catalog');

function createFighter(player) {
  const char = characterById(player.character) || characterById('cacador');
  const maxHp = char.hp || RULES.baseHp;
  return {
    id: player.id,
    nickname: player.nickname,
    character: char.id,
    trophies: player.trophies,
    hp: maxHp,
    maxHp,
    deck: unlockedCards(player.best ?? player.trophies),
    used: [],
    hand: [],
    card: null,
    weapon: null,
    cardLocked: false,
    weaponLocked: false,
  };
}

function createDuel(playerA, playerB, rng = Math.random) {
  return { round: 0, phase: 'idle', fighters: [createFighter(playerA), createFighter(playerB)], rng, winner: null };
}

/** Sorteia até `n` itens diferentes. */
function sample(list, n, rng) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** Começa uma rodada: cada um recebe cartas que ainda não usou nesta partida. */
function startRound(duel) {
  duel.round++;
  duel.phase = 'card';
  for (const f of duel.fighters) {
    f.hand = sample(f.deck.filter(c => !f.used.includes(c)), RULES.handSize, duel.rng);
    f.card = null; f.weapon = null;
    f.cardLocked = f.hand.length === 0;
    f.weaponLocked = false;
  }
  return duel;
}

function pickCard(duel, i, cardId) {
  const f = duel.fighters[i];
  if (duel.phase !== 'card' || f.cardLocked) return false;
  if (cardId != null && !f.hand.includes(cardId)) return false;
  f.card = cardId ?? null;
  f.cardLocked = true;
  return true;
}

function startWeaponPhase(duel) {
  duel.phase = 'weapon';
  for (const f of duel.fighters) f.cardLocked = true;
  return duel;
}

function pickWeapon(duel, i, weapon) {
  const f = duel.fighters[i];
  if (duel.phase !== 'weapon' || f.weaponLocked || !WEAPONS.includes(weapon)) return false;
  f.weapon = weapon;
  f.weaponLocked = true;
  return true;
}

const bothLocked = (duel, key) => duel.fighters.every(f => f[key]);

/**
 * Resolve a rodada. Quem não escolheu arma joga uma aleatória.
 * Retorna o que aconteceu com cada lutador (índices 0 e 1).
 */
function resolveRound(duel) {
  const rng = duel.rng;
  const [A, B] = duel.fighters;
  for (const f of duel.fighters) if (!f.weapon) f.weapon = WEAPONS[Math.floor(rng() * WEAPONS.length)];
  for (const f of duel.fighters) if (f.card) f.used.push(f.card);

  const res = [A, B].map(f => ({ weapon: f.weapon, card: f.card, damage: 0, healed: 0, dodged: false, thorns: 0, lucky: false }));
  const hpBefore = [A.hp, B.hp];
  const sudden = duel.round >= RULES.suddenDeathRound ? 2 : 1;
  const sacred = (f) => f.card === 'escudo_sagrado';

  const heal = (i, amount) => {
    const f = duel.fighters[i];
    const before = f.hp;
    f.hp = Math.min(f.maxHp, f.hp + amount);
    res[i].healed += f.hp - before;
  };
  const hurt = (i, amount) => {
    const f = duel.fighters[i];
    if (amount <= 0 || sacred(f)) return 0;
    const dealt = Math.min(f.hp, amount);
    f.hp -= dealt;
    res[i].damage += dealt;
    return dealt;
  };

  // Bálsamo cura antes de tudo
  [A, B].forEach((f, i) => { if (f.card === 'cura') heal(i, 15); });

  let outcome = 'draw';
  if (BEATS[A.weapon] === B.weapon) outcome = 0;
  else if (BEATS[B.weapon] === A.weapon) outcome = 1;

  if (outcome === 'draw') {
    [A, B].forEach((f, i) => { if (f.card === 'empate_forte') hurt(1 - i, 15 * sudden); });
  } else {
    const w = outcome, l = 1 - outcome;
    const W = duel.fighters[w], L = duel.fighters[l];
    const char = characterById(W.character);
    let dmg = RULES.baseDamage + (char.weapon === W.weapon ? RULES.passiveBonus : 0);
    if (W.card === 'golpe_duplo') dmg *= 2;
    if (W.card === 'juizo') dmg *= 3;
    if (W.card === 'sorte' && rng() < 0.5) { dmg += 20; res[w].lucky = true; }
    if (W.card === 'furia' && W.hp < 50) dmg += 20;
    dmg *= sudden;
    const lChar = characterById(L.character);
    if (L.card === 'escudo') dmg = 0;
    if (dmg > 0 && lChar.dodge && rng() < lChar.dodge) { dmg = 0; res[l].dodged = true; }
    const dealt = hurt(l, dmg);
    if (W.card === 'vampirismo') heal(w, Math.floor(dealt / 2));
    if (L.card === 'espinhos') res[w].thorns = hurt(w, 12 * sudden);
  }

  // fim da partida?
  const dead = [A.hp <= 0, B.hp <= 0];
  let winner = null;
  if (dead[0] && dead[1]) {
    winner = outcome !== 'draw' ? outcome : hpBefore[0] === hpBefore[1] ? (rng() < 0.5 ? 0 : 1) : hpBefore[0] > hpBefore[1] ? 0 : 1;
  } else if (dead[0]) winner = 1;
  else if (dead[1]) winner = 0;

  duel.phase = winner == null ? 'reveal' : 'over';
  duel.winner = winner;
  return { round: duel.round, outcome, fighters: res, hp: [A.hp, B.hp], winner, sudden: sudden > 1 };
}

module.exports = {
  createDuel, startRound, pickCard, startWeaponPhase, pickWeapon, resolveRound, bothLocked, cardById,
};
