'use strict';
// Troféus: quem vence ganha mais se o oponente era mais forte; quem perde nunca fica negativo.
const { unlockedCards, unlockedCharacters } = require('./catalog');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Variação de troféus para vencedor e perdedor. */
function trophyDelta(winnerTrophies, loserTrophies) {
  const gain = clamp(25 + Math.round((loserTrophies - winnerTrophies) / 25), 10, 40);
  const loss = Math.min(loserTrophies, Math.max(5, gain - 5));
  return { gain, loss };
}

/** Aplica o resultado nos dois jogadores e diz o que cada um desbloqueou. */
function applyResult(winner, loser, { ranked = true } = {}) {
  const { gain, loss } = ranked ? trophyDelta(winner.trophies, loser.trophies) : { gain: 0, loss: 0 };
  const out = [];
  for (const [p, delta, won] of [[winner, gain, true], [loser, -loss, false]]) {
    const before = { trophies: p.trophies, best: p.best };
    p.trophies = Math.max(0, p.trophies + delta);
    p.best = Math.max(p.best, p.trophies);
    if (won) p.wins++; else p.losses++;
    out.push({
      id: p.id,
      delta,
      before: before.trophies,
      after: p.trophies,
      unlocked: {
        cards: unlockedCards(p.best).filter(c => !unlockedCards(before.best).includes(c)),
        characters: unlockedCharacters(p.best).filter(c => !unlockedCharacters(before.best).includes(c)),
      },
    });
  }
  return out;
}

/** Evita "farm": o mesmo par só vale troféus 3 vezes por hora. */
class FarmGuard {
  constructor({ limit = 3, windowMs = 60 * 60 * 1000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.history = new Map();
  }

  allow(idA, idB, now = Date.now()) {
    const key = [idA, idB].sort().join('|');
    const recent = (this.history.get(key) || []).filter(t => now - t < this.windowMs);
    const ok = recent.length < this.limit;
    if (ok) recent.push(now);
    this.history.set(key, recent);
    return ok;
  }
}

module.exports = { trophyDelta, applyResult, FarmGuard };
