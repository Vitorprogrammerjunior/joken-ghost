'use strict';
// Filas de partida: ranqueada e casual (1x1), 2x2 e chefe cooperativo.
// Se ninguém aparecer em `rules.botAfterMs`, bots completam a partida (sem troféus).

const QUEUES = ['ranked', 'casual', 'duo', 'raid'];

class Matchmaker {
  /**
   * @param {object} o
   * @param {object} o.rules
   * @param {() => number} o.now
   * @param {() => number} o.rng
   * @param {(trophies: number) => object} o.createBot
   * @param {(teams: object[][], opts: { kind: string, ranked: boolean }) => void} o.startDuel  times de "assentos" ({ player, socketId })
   * @param {(seats: object[]) => void} o.startRaid
   */
  constructor({ rules, now, rng, createBot, startDuel, startRaid }) {
    Object.assign(this, { rules, now, rng, createBot, startDuel, startRaid });
    this.queues = Object.fromEntries(QUEUES.map(q => [q, new Map()])); // playerId -> { s, since }
  }

  static isMode(mode) { return QUEUES.includes(mode); }

  join(s, mode) {
    this.leave(s);
    this.queues[mode].set(s.player.id, { s, since: this.now() });
  }

  /** Sai de qualquer fila. Retorna true se estava em alguma. */
  leave(s) {
    return QUEUES.map(q => this.queues[q].delete(s.player.id)).some(Boolean);
  }

  modeOf(playerId) { return QUEUES.find(q => this.queues[q].has(playerId)) ?? null; }
  size(mode) { return this.queues[mode].size; }

  tick() {
    this.#pairRanked();
    this.#pairInOrder('casual', 2, (group) => this.startDuel([[seat(group[0])], [seat(group[1])]], { kind: 'casual', ranked: false }));
    this.#pairInOrder('duo', 4, (group) => this.startDuel(this.#duoTeams(group.map(seat)), { kind: 'duo', ranked: false }));
    this.#pairInOrder('raid', 2, (group) => this.startRaid(group.map(seat)));
  }

  #waiting(mode) {
    return [...this.queues[mode].values()].filter(w => w.s.socket.connected).sort((a, b) => a.since - b.since);
  }

  #take(mode, list) { for (const w of list) this.queues[mode].delete(w.s.player.id); }

  #botSeat(trophies) { return { player: this.createBot(trophies), socketId: null }; }

  /** Ranqueada: troféus parecidos; a tolerância cresce com a espera. Sozinho demais: bot sem troféus. */
  #pairRanked() {
    const now = this.now();
    const waiting = this.#waiting('ranked');
    const used = new Set();
    for (const a of waiting) {
      if (used.has(a)) continue;
      let best = null;
      for (const b of waiting) {
        if (b === a || used.has(b)) continue;
        const diff = Math.abs(a.s.player.trophies - b.s.player.trophies);
        const tol = Math.max(150 + 25 * ((now - a.since) / 1000), 150 + 25 * ((now - b.since) / 1000));
        if (diff <= tol && (!best || diff < best.diff)) best = { b, diff };
      }
      if (best) {
        used.add(a); used.add(best.b);
        this.#take('ranked', [a, best.b]);
        this.startDuel([[seat(a)], [seat(best.b)]], { kind: 'ranked', ranked: true });
      } else if (now - a.since >= this.rules.botAfterMs) {
        used.add(a);
        this.#take('ranked', [a]);
        this.startDuel([[seat(a)], [this.#botSeat(a.s.player.trophies)]], { kind: 'bot', ranked: false });
      }
    }
  }

  /** Filas por ordem de chegada; quem espera demais completa o grupo com bots. */
  #pairInOrder(mode, size, start) {
    const waiting = this.#waiting(mode);
    while (waiting.length >= size) {
      const group = waiting.splice(0, size);
      this.#take(mode, group);
      start(group);
    }
    if (waiting.length && this.now() - waiting[0].since >= this.rules.botAfterMs) {
      this.#take(mode, waiting);
      const trophies = waiting[0].s.player.trophies;
      const humans = waiting.map(w => ({ s: w.s }));
      while (humans.length < size) humans.push({ bot: this.#botSeat(trophies) });
      start(humans);
    }
  }

  /** 2x2: humanos juntos no mesmo time quando possível (2 humanos + 2 bots = humanos contra bots). */
  #duoTeams(seats) {
    const humans = seats.filter(s => !s.player.isBot);
    const bots = seats.filter(s => s.player.isBot);
    if (humans.length === 4) {
      const shuffled = [...humans].sort(() => this.rng() - 0.5);
      return [shuffled.slice(0, 2), shuffled.slice(2)];
    }
    const ordered = [...humans, ...bots];
    return [ordered.slice(0, 2), ordered.slice(2)];
  }
}

/** Fila guarda { s } (sessão) ou { bot } (assento pronto de bot). */
function seat(w) {
  return w.bot ?? { player: w.s.player, socketId: w.s.socket.id };
}

module.exports = { Matchmaker, QUEUES };
