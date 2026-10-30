'use strict';
// Regras de um duelo entre caçadores. Sem rede nem timers: só estado e cálculo.
//
// Um duelo tem dois lados; cada lado tem 1 caçador (1x1) ou 2 (2x2) e uma vida
// compartilhada. Os caçadores se enfrentam em "pistas": o 1º de um lado contra o
// 1º do outro, e assim por diante. No 1x1, antes da 1ª rodada, cada um vê a build
// do outro e bane uma carta dela. Cada rodada: (1) todos escolhem uma carta
// (opcional), (2) as cartas são reveladas, (3) todos escolhem a arma, (4) cada pista
// resolve o seu jokenpô e o dano vai para a vida do lado.
const { RULES, WEAPONS, BEATS, characterById, cardById } = require('./catalog');

function createFighter(player, side, lane, deck) {
  const char = characterById(player.character) || characterById('cacador');
  return {
    id: player.id,
    nickname: player.nickname,
    character: char.id,
    trophies: player.trophies,
    side,
    lane,
    deck: [...deck],
    used: [],
    hand: [],
    history: [],      // armas usadas, rodada a rodada
    card: null,
    weapon: null,
    forbidden: null,  // arma proibida nesta rodada (Provocação do oponente)
    cardLocked: false,
    weaponLocked: false,
    ban: null,        // carta que este lutador baniu da build do adversário
    banLocked: false,
    dodged: false,    // Sombra: já desviou do primeiro golpe
  };
}

/**
 * @param {object[][]} teams  dois times de jogadores ({ id, nickname, character, trophies })
 * @param {(player: object) => string[]} deckOf  deck de cada jogador
 * @param {() => number} [rng]
 * @param {object} [rules]    regras da partida (catalog.RULES ou uma versão ajustada)
 */
function createDuel(teams, deckOf, rng = Math.random, rules = RULES) {
  if (teams.length !== 2 || teams[0].length !== teams[1].length) throw new Error('Times inválidos');
  const fighters = teams.flatMap((team, side) => team.map((p, lane) => createFighter(p, side, lane, deckOf(p))));
  const sides = teams.map((team) => {
    const sum = team.reduce((s, p) => s + ((characterById(p.character) || {}).hp || rules.baseHp), 0);
    const maxHp = team.length > 1 ? Math.round(sum * rules.duoHpScale) : sum;
    return { hp: maxHp, maxHp };
  });
  return { round: 0, phase: 'idle', fighters, sides, rng, rules, winner: null };
}

/** Índice do adversário de pista do lutador i. */
function laneOpponent(duel, i) {
  const f = duel.fighters[i];
  return duel.fighters.findIndex(o => o.side !== f.side && o.lane === f.lane);
}

/** Sorteia até `n` itens diferentes. */
function sample(list, n, rng) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

// ─── banimento (1x1, antes da 1ª rodada) ───
function startBanPhase(duel) {
  duel.phase = 'ban';
  return duel;
}

/** O lutador i bane uma carta da build do adversário de pista. */
function pickBan(duel, i, cardId) {
  const f = duel.fighters[i];
  const op = duel.fighters[laneOpponent(duel, i)];
  if (duel.phase !== 'ban' || f.banLocked || !op.deck.includes(cardId)) return false;
  f.ban = cardId;
  f.banLocked = true;
  return true;
}

/** Tempo esgotado: bane a carta mais cara do adversário (a primeira, se empatar). */
function autoBan(duel, i) {
  const op = duel.fighters[laneOpponent(duel, i)];
  const best = [...op.deck].sort((a, b) => (cardById(b)?.cost ?? 0) - (cardById(a)?.cost ?? 0))[0];
  if (best) pickBan(duel, i, best);
  else duel.fighters[i].banLocked = true;
  return duel.fighters[i].ban;
}

/** Tira as cartas banidas das builds. Retorna [carta banida da build do lutador 0, do 1, ...]. */
function applyBans(duel) {
  duel.fighters.forEach((f, i) => { if (!f.banLocked) autoBan(duel, i); });
  const removed = duel.fighters.map(() => null);
  duel.fighters.forEach((f, i) => {
    if (!f.ban) return;
    const j = laneOpponent(duel, i);
    duel.fighters[j].deck = duel.fighters[j].deck.filter(c => c !== f.ban);
    removed[j] = f.ban;
  });
  return removed;
}

/** Começa uma rodada: cada um recebe cartas que ainda não usou nesta partida. */
function startRound(duel) {
  duel.round++;
  duel.phase = 'card';
  for (const f of duel.fighters) {
    f.hand = sample(f.deck.filter(c => !f.used.includes(c)), duel.rules.handSize, duel.rng);
    f.card = null; f.weapon = null; f.forbidden = null;
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

/** Fecha as cartas (quem não escolheu passa), revela e aplica a Provocação (proíbe repetir a última arma). */
function revealCards(duel) {
  duel.phase = 'cards';
  duel.fighters.forEach((f, i) => {
    f.cardLocked = true;
    const op = duel.fighters[laneOpponent(duel, i)];
    f.forbidden = op.card === 'provocacao' ? f.history.at(-1) ?? null : null;
  });
  return duel;
}

/** Começa a escolha das armas (revelando as cartas, se ainda não foram). */
function startWeaponPhase(duel) {
  if (duel.phase === 'card') revealCards(duel);
  duel.phase = 'weapon';
  return duel;
}

/** Tempo da fase de armas de cada lutador: quem enfrenta a Visão tem menos tempo. */
function weaponTime(duel, i) {
  return duel.fighters[laneOpponent(duel, i)].card === 'visao' ? duel.rules.visionWeaponMs : duel.rules.weaponPhaseMs;
}

function pickWeapon(duel, i, weapon) {
  const f = duel.fighters[i];
  if (duel.phase !== 'weapon' || f.weaponLocked || !WEAPONS.includes(weapon) || weapon === f.forbidden) return false;
  f.weapon = weapon;
  f.weaponLocked = true;
  return true;
}

/** Tempo esgotado: repete a última arma (ou sorteia na 1ª rodada / se ela estiver proibida). */
function autoWeapon(duel, i) {
  const f = duel.fighters[i];
  const allowed = WEAPONS.filter(w => w !== f.forbidden);
  const last = f.history.at(-1);
  pickWeapon(duel, i, allowed.includes(last) ? last : allowed[Math.floor(duel.rng() * allowed.length)]);
  return f.weapon;
}

/**
 * O que o dono da Visão vê quando o adversário de pista (i) trava a arma:
 * a arma de verdade, ou uma falsa se ele estiver com o Disfarce.
 */
function visionOf(duel, i) {
  const f = duel.fighters[i];
  if (f.card !== 'disfarce') return f.weapon;
  const fakes = WEAPONS.filter(w => w !== f.weapon);
  return fakes[Math.floor(duel.rng() * fakes.length)];
}

const bothLocked = (duel, key) => duel.fighters.every(f => f[key]);

/**
 * A carta do lutador i fez efeito nesta rodada? `result` é o dele na pista: won, lost ou draw.
 * O cliente quebra a que falhou e destaca a que deu certo.
 */
function cardWorked(duel, i, op, result, res) {
  const f = duel.fighters[i];
  const foe = duel.fighters[op];
  const hit = result === 'won' && res[op].damage > 0 && !res[op].blocked && !res[op].dodged;
  switch (f.card) {
    case 'escudo': return res[i].blocked;
    case 'cura': return res[i].healed > 0;
    case 'escudo_sagrado': return res[i].blocked || res[i].healed > 0;
    case 'empate_forte': return result === 'draw' && (res[op].damage > 0 || res[op].blocked);
    case 'espinhos': return res[op].thorns > 0;
    case 'provocacao': return foe.forbidden != null;
    case 'sorte': return hit || res[i].healed > 0;
    case 'visao': return result === 'won';
    case 'disfarce': return hit || foe.card === 'visao';
    case 'furia': return hit && res[i].fury;
    default: return hit && (cardById(f.card)?.weapon ?? f.weapon) === f.weapon;
  }
}

/**
 * Resolve a rodada. Quem não escolheu arma repete a anterior.
 * Retorna o que aconteceu com cada lutador, o resultado de cada pista e a vida dos lados.
 */
function resolveRound(duel) {
  const { rng, fighters, sides, rules } = duel;
  fighters.forEach((f, i) => { if (!f.weapon) autoWeapon(duel, i); });
  for (const f of fighters) { if (f.card) f.used.push(f.card); f.history.push(f.weapon); }

  const res = fighters.map(f => ({ weapon: f.weapon, card: f.card, damage: 0, healed: 0, dodged: false, thorns: 0, lucky: false, blocked: false }));
  const hpBefore = sides.map(s => s.hp);
  const sudden = duel.round >= rules.suddenDeathRound ? 2 : 1;
  const sacred = (f) => f.card === 'escudo_sagrado';

  const heal = (i, amount) => {
    const side = sides[fighters[i].side];
    const before = side.hp;
    side.hp = Math.min(side.maxHp, side.hp + amount);
    res[i].healed += side.hp - before;
  };
  /** Dano no lado do lutador i, vindo da pista dele (o Escudo Sagrado dele protege). */
  const hurt = (i, amount) => {
    const f = fighters[i];
    if (amount <= 0) return 0;
    if (sacred(f)) { res[i].blocked = true; return 0; }
    const side = sides[f.side];
    const dealt = Math.min(side.hp, amount);
    side.hp -= dealt;
    res[i].damage += dealt;
    return dealt;
  };

  // curas antes de tudo: Bálsamo e Escudo Sagrado
  fighters.forEach((f, i) => {
    if (f.card === 'cura') heal(i, 15);
    if (f.card === 'escudo_sagrado') heal(i, 10);
  });

  const lanes = [];
  fighters.forEach((a, ia) => {
    if (a.side !== 0) return;
    const ib = laneOpponent(duel, ia);
    const b = fighters[ib];
    let outcome = 'draw';
    if (BEATS[a.weapon] === b.weapon) outcome = 'a';
    else if (BEATS[b.weapon] === a.weapon) outcome = 'b';
    lanes.push({ a: ia, b: ib, outcome });

    if (outcome === 'draw') {
      if (a.card === 'empate_forte') hurt(ib, 15 * sudden);
      if (b.card === 'empate_forte') hurt(ia, 15 * sudden);
      if (a.card === 'sorte') heal(ia, 10);
      if (b.card === 'sorte') heal(ib, 10);
      return;
    }
    const [w, l] = outcome === 'a' ? [ia, ib] : [ib, ia];
    const W = fighters[w], L = fighters[l];
    const char = characterById(W.character);
    let dmg = rules.baseDamage + (char.weapon === W.weapon ? rules.passiveBonus : 0);
    const card = W.card && cardById(W.card);
    if (card?.weapon === W.weapon) dmg += rules.weaponCardBonus;
    if (W.card === 'golpe_duplo') dmg *= 2;
    if (W.card === 'juizo') dmg *= 3;
    if (W.card === 'disfarce') dmg += 10;
    if (W.card === 'sorte') { dmg += 10; res[w].lucky = true; }
    if (W.card === 'furia' && sides[W.side].hp < sides[W.side].maxHp / 2) { dmg += 20; res[w].fury = true; }
    dmg *= sudden;
    if (L.card === 'escudo') { dmg = 0; res[l].blocked = true; }
    const lChar = characterById(L.character);
    if (dmg > 0 && lChar.dodgeFirst && !L.dodged) { dmg = 0; L.dodged = true; res[l].dodged = true; }
    if (L.card === 'juizo') dmg += 10 * sudden; // o risco do Juízo Final
    const dealt = hurt(l, dmg);
    if (W.card === 'vampirismo') heal(w, Math.floor(dealt / 2));
    if (L.card === 'espinhos') res[w].thorns = hurt(w, 12 * sudden);
  });

  for (const { a, b, outcome } of lanes) {
    const [ra, rb] = outcome === 'draw' ? ['draw', 'draw'] : outcome === 'a' ? ['won', 'lost'] : ['lost', 'won'];
    res[a].cardOk = !!fighters[a].card && !!cardWorked(duel, a, b, ra, res);
    res[b].cardOk = !!fighters[b].card && !!cardWorked(duel, b, a, rb, res);
  }

  // fim da partida? (nocaute, ou mais vida depois da última rodada)
  const dead = sides.map(s => s.hp <= 0);
  let winner = null;
  let reason = 'nocaute';
  if (dead[0] && dead[1]) {
    winner = hpBefore[0] === hpBefore[1] ? (rng() < 0.5 ? 0 : 1) : hpBefore[0] > hpBefore[1] ? 0 : 1;
  } else if (dead[0]) winner = 1;
  else if (dead[1]) winner = 0;
  else if (duel.round >= rules.maxRounds && sides[0].hp !== sides[1].hp) {
    winner = sides[0].hp > sides[1].hp ? 0 : 1;
    reason = 'tempo';
  }

  duel.phase = winner == null ? 'reveal' : 'over';
  duel.winner = winner;
  return { round: duel.round, lanes, fighters: res, hp: sides.map(s => s.hp), winner, reason, sudden: sudden > 1 };
}

module.exports = {
  createDuel, startBanPhase, pickBan, autoBan, applyBans, startRound, pickCard, revealCards, startWeaponPhase, weaponTime, pickWeapon, autoWeapon, visionOf,
  resolveRound, bothLocked, laneOpponent, cardById,
};
