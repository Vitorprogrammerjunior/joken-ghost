'use strict';
// Quando a ranqueada completa a partida com um bot, e quão forte ele joga.
//
// Completa só se: ninguém mais está na fila e o jogador já esperou o tempo dele (sorteado ao entrar;
// menor nas primeiras partidas de uma conta nova). Os limites opcionais (teto de troféus e partidas
// contra bot na última hora) só valem se estiverem ligados nas regras.
//
// A dificuldade (0..1) vem dos troféus e se ajusta à fase do jogador, como nos jogos grandes:
// em sequência de derrotas o bot alivia, em sequência de vitórias ele aperta.

const HOUR_MS = 60 * 60 * 1000;
const FORM_SIZE = 10;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @param {number} trophies
 * @param {boolean[]} results  ranqueadas recentes do jogador (true = vitória), da mais antiga à mais nova
 */
function skillFor(trophies, results = []) {
  const base = 0.2 + 0.6 * clamp(trophies / 1400, 0, 1);
  let streak = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === results[results.length - 1]; i--) streak++;
  const last = results.at(-1);
  let adjust = 0;
  if (streak >= 2) adjust = last ? Math.min(0.15, 0.05 * (streak - 1)) : -Math.min(0.3, 0.1 * (streak - 1));
  if (results.length >= 4) adjust += (results.filter(Boolean).length / results.length - 0.5) * 0.3;
  return clamp(base + adjust, 0.08, 0.92);
}

class BotPolicy {
  /**
   * @param {object} o
   * @param {object} o.rules  RULES.rankedBot
   * @param {() => number} o.now
   * @param {() => number} o.rng
   */
  constructor({ rules, now, rng }) {
    Object.assign(this, { rules, now, rng });
    this.form = new Map();        // playerId -> resultados recentes na ranqueada
    this.botMatches = new Map();  // playerId -> quando enfrentou bot
  }

  /** Quanto este jogador espera (ms) antes de a fila completar com bot. */
  waitFor(player) {
    const newbie = (player.wins ?? 0) + (player.losses ?? 0) < this.rules.newPlayerMatches;
    const [min, max] = newbie ? this.rules.newPlayerWaitMs : this.rules.waitMs;
    return min + Math.round(this.rng() * (max - min));
  }

  canFill(player, { waitedMs, waitFor, othersWaiting }) {
    if (othersWaiting || waitedMs < waitFor) return false;
    const { maxTrophies, perHour } = this.rules;
    if (maxTrophies != null && player.trophies > maxTrophies) return false;
    return perHour == null || this.#recentBotMatches(player.id) < perHour;
  }

  noteBotMatch(playerId) {
    this.botMatches.set(playerId, [...this.#recent(playerId), this.now()]);
  }

  /** Resultado de uma ranqueada (contra gente ou bot), para acompanhar a fase do jogador. */
  record(playerId, won) {
    this.form.set(playerId, [...(this.form.get(playerId) ?? []), won].slice(-FORM_SIZE));
  }

  skill(player) { return skillFor(player.trophies, this.form.get(player.id)); }

  #recent(playerId) { return (this.botMatches.get(playerId) ?? []).filter(t => this.now() - t < HOUR_MS); }
  #recentBotMatches(playerId) { return this.#recent(playerId).length; }
}

module.exports = { BotPolicy, skillFor };
