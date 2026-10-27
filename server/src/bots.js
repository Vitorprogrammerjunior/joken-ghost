'use strict';
// Bots: entram quando a fila fica vazia, completam o 2x2, o torneio e o Rei da Arena.
// Jogam com as mesmas IAs dos monstros da campanha (src/domain/enemyAI.js), então
// cada bot tem um "jeito" de jogar que dá para ler, como os monstros.
const crypto = require('crypto');
const { CARD_PRIORITY, WEAPON_MOVE, WEAPONS, unlockedCharacters, deckOf } = require('./catalog');
const duelRules = require('./duel');

const BOTS = [
  { name: 'Bot Fantasma', ai: { type: 'random', bias: { pedra: 1, papel: 1.6, tesoura: 1 } } },
  { name: 'Bot Morcego', ai: { type: 'sticky', repeat: 0.55 } },
  { name: 'Bot Boneca', ai: { type: 'mimic', chance: 0.55 } },
  { name: 'Bot Armadura', ai: { type: 'learner', adapt: 0.5 } },
  { name: 'Bot Kastle', ai: { type: 'trickster', chance: 0.45 } },
  { name: 'Bot Corvo', ai: { type: 'vengeful', chance: 0.55 } },
  { name: 'Bot Zumbi', ai: { type: 'coward', chance: 0.7 } },
];

const MOVE_WEAPON = Object.fromEntries(Object.entries(WEAPON_MOVE).map(([w, m]) => [m, w]));

/** Um jogador-bot com troféus parecidos com os de quem ele vai enfrentar. */
function createBot(trophies, rng = Math.random) {
  const style = BOTS[Math.floor(rng() * BOTS.length)];
  const t = Math.max(0, Math.round(trophies + (rng() - 0.5) * 120));
  const chars = unlockedCharacters(t);
  return {
    id: `bot-${crypto.randomBytes(4).toString('hex')}`,
    isBot: true,
    nickname: style.name,
    character: chars[Math.floor(rng() * chars.length)],
    trophies: t, best: t, wins: 0, losses: 0,
    deck: null, equipped: { frame: null },
    ai: style.ai,
  };
}

/** As decisões de um bot numa partida. `chooseMove` vem das regras compartilhadas. */
class BotBrain {
  constructor(bot, { chooseMove, rng = Math.random, thinkMs = [700, 3300] }) {
    this.bot = bot;
    this.chooseMove = chooseMove;
    this.rng = rng;
    this.thinkRange = thinkMs;
  }

  /** Carta: a melhor da mão na ordem de prioridade (Bálsamo só se estiver ferido). */
  chooseCard(hand, side) {
    for (const id of CARD_PRIORITY) {
      if (!hand.includes(id)) continue;
      if (id === 'cura' && side.hp > side.maxHp - 15) continue;
      if (id === 'furia' && side.hp >= side.maxHp / 2) continue;
      return this.rng() < 0.85 ? id : null; // às vezes guarda a carta
    }
    return null;
  }

  /** Arma pelo estilo de IA, olhando o histórico do adversário de pista. */
  chooseWeapon(ownHistory, oppHistory, forbidden = null) {
    const move = this.chooseMove(this.bot.ai, {
      playerHistory: oppHistory.map(w => WEAPON_MOVE[w]),
      ownHistory: ownHistory.map(w => WEAPON_MOVE[w]),
    }, this.rng);
    const weapon = MOVE_WEAPON[move];
    if (weapon !== forbidden) return weapon;
    const allowed = WEAPONS.filter(w => w !== forbidden);
    return allowed[Math.floor(this.rng() * allowed.length)];
  }

  /** Tempo de "pensar" antes de agir (parece uma pessoa). */
  thinkMs() {
    const [min, max] = this.thinkRange;
    return min + Math.floor(this.rng() * (max - min));
  }
}

/**
 * Bot contra bot na hora (torneio): joga um duelo inteiro com as regras de verdade.
 * Retorna o id do vencedor.
 */
function simulateDuel(a, b, { chooseMove, rng = Math.random }) {
  const d = duelRules.createDuel([[a], [b]], deckOf, rng);
  const brains = [a, b].map(bot => new BotBrain(bot, { chooseMove, rng }));
  for (let round = 0; round < 200; round++) {
    duelRules.startRound(d);
    d.fighters.forEach((f, i) => duelRules.pickCard(d, i, brains[i].chooseCard(f.hand, d.sides[f.side])));
    duelRules.startWeaponPhase(d);
    d.fighters.forEach((f, i) => duelRules.pickWeapon(d, i, brains[i].chooseWeapon(f.history, d.fighters[1 - i].history, f.forbidden)));
    const r = duelRules.resolveRound(d);
    if (r.winner != null) return [a, b][r.winner].id;
  }
  return (rng() < 0.5 ? a : b).id;
}

module.exports = { BOTS, createBot, BotBrain, MOVE_WEAPON, simulateDuel };
