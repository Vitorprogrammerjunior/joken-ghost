// Como cada monstro escolhe Possessão (pedra), Assombração (papel) ou Maldição (tesoura).
// Os perfis são descobríveis: o Monstruário revela o comportamento depois de algumas vitórias.
import { MOVES } from '../config/weapons.js';
import { counterOf, outcome } from './rps.js';
import { pick, weighted } from './random.js';

/**
 * @param {object} ai       perfil do inimigo (config/enemies.js)
 * @param {object} memory   { playerHistory: string[], ownHistory: string[] }
 * @param {() => number} rng
 * @returns {'pedra'|'papel'|'tesoura'}
 */
export function chooseMove(ai, memory, rng = Math.random) {
  const { playerHistory = [], ownHistory = [] } = memory;
  const lastPlayer = playerHistory[playerHistory.length - 1];
  const lastOwn = ownHistory[ownHistory.length - 1];

  switch (ai.type) {
    case 'cycle': {
      if (rng() < (ai.noise ?? 0)) return pick(MOVES, rng);
      return ai.sequence[ownHistory.length % ai.sequence.length];
    }
    case 'sticky':
      if (lastOwn && rng() < ai.repeat) return lastOwn;
      return pick(MOVES, rng);
    case 'mimic':
      if (lastPlayer && rng() < ai.chance) return lastPlayer;
      return pick(MOVES, rng);
    case 'learner': {
      if (playerHistory.length >= 2 && rng() < ai.adapt) return counterOf(mostFrequent(playerHistory));
      return pick(MOVES, rng);
    }
    case 'trickster':
      if (lastPlayer && rng() < ai.chance) return counterOf(lastPlayer);
      return pick(MOVES, rng);
    case 'vengeful': {
      const winner = lastWinningMove(playerHistory, ownHistory);
      if (winner && rng() < ai.chance) return winner;
      return pick(MOVES, rng);
    }
    case 'coward': {
      const lostLast = lastOwn && lastPlayer && outcome(lastOwn, lastPlayer) === 'lose';
      if (lostLast && rng() < ai.chance) return pick(MOVES.filter(m => m !== lastOwn), rng);
      return pick(MOVES, rng);
    }
    case 'random':
    default:
      return ai.bias ? weighted(ai.bias, rng) : pick(MOVES, rng);
  }
}

/**
 * Pista do próximo golpe: aparece com `tell.chance` e, nos monstros mentirosos,
 * mostra outra jogada com `tell.lie`. Retorna a jogada mostrada ou null.
 */
export function rollTell(tell, intent, rng = Math.random) {
  if (!tell || rng() >= tell.chance) return null;
  if (rng() < (tell.lie ?? 0)) return pick(MOVES.filter(m => m !== intent), rng);
  return intent;
}

/**
 * Última jogada do monstro que venceu o Caçador. O histórico do Caçador vem da fase
 * inteira, o do monstro só desde que ele apareceu: os dois se alinham pelo fim.
 */
export function lastWinningMove(playerHistory, ownHistory) {
  const offset = playerHistory.length - ownHistory.length;
  for (let i = ownHistory.length - 1; i >= 0; i--) {
    const player = playerHistory[offset + i];
    if (player && outcome(ownHistory[i], player) === 'win') return ownHistory[i];
  }
  return null;
}

export function mostFrequent(list) {
  const counts = {};
  let best = list[0], bestN = 0;
  for (const m of list) {
    counts[m] = (counts[m] || 0) + 1;
    if (counts[m] > bestN) { best = m; bestN = counts[m]; }
  }
  return best;
}
