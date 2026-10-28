'use strict';
// Filas de partida: ranqueada e casual (1x1), 2x2 e chefe cooperativo.
// As partidas começam quando a fila junta gente suficiente. Só a ranqueada, com pouca gente,
// pode completar a partida com um adversário automático (regras em bots/policy.js).

const QUEUES = ['ranked', 'casual', 'duo', 'raid'];

class Matchmaker {
  /**
   * @param {object} o
   * @param {() => number} o.now
   * @param {() => number} o.rng
   * @param {(teams: object[][], opts: { kind: string, ranked: boolean }) => void} o.startDuel  times de "assentos" ({ player, socketId })
   * @param {(seats: object[]) => void} o.startRaid
   * @param {import('../bots/policy').BotPolicy} o.botPolicy   quando a ranqueada completa com bot
   * @param {(player: object) => object} o.botSeat            assento de bot para enfrentar `player`
   */
  constructor({ now, rng, startDuel, startRaid, botPolicy, botSeat }) {
    Object.assign(this, { now, rng, startDuel, startRaid, botPolicy, botSeat });
    this.queues = Object.fromEntries(QUEUES.map(q => [q, new Map()])); // playerId -> { s, since, botAfter }
  }

  static isMode(mode) { return QUEUES.includes(mode); }

  join(s, mode) {
    this.leave(s);
    const botAfter = mode === 'ranked' ? this.botPolicy.waitFor(s.player) : Infinity;
    this.queues[mode].set(s.player.id, { s, since: this.now(), botAfter });
  }

  /** Sai de qualquer fila. Retorna true se estava em alguma. */
  leave(s) {
    return QUEUES.map(q => this.queues[q].delete(s.player.id)).some(Boolean);
  }

  modeOf(playerId) { return QUEUES.find(q => this.queues[q].has(playerId)) ?? null; }
  size(mode) { return this.queues[mode].size; }

  tick() {
    this.#pairRanked();
    this.#pairInOrder('casual', 2, (group) => this.startDuel([[group[0]], [group[1]]], { kind: 'casual', ranked: false }));
    this.#pairInOrder('duo', 4, (group) => this.startDuel(this.#duoTeams(group), { kind: 'duo', ranked: false }));
    this.#pairInOrder('raid', 2, (group) => this.startRaid(group));
  }

  #waiting(mode) {
    return [...this.queues[mode].values()].filter(w => w.s.socket.connected).sort((a, b) => a.since - b.since);
  }

  #take(mode, list) { for (const w of list) this.queues[mode].delete(w.s.player.id); }

  /** Ranqueada: troféus parecidos; a tolerância cresce com a espera. Sozinho na fila: talvez um bot. */
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
      } else if (this.botPolicy.canFill(a.s.player, { waitedMs: now - a.since, waitFor: a.botAfter, othersWaiting: waiting.length > 1 })) {
        used.add(a);
        this.#take('ranked', [a]);
        this.botPolicy.noteBotMatch(a.s.player.id);
        this.startDuel([[seat(a)], [this.botSeat(a.s.player)]], { kind: 'ranked', ranked: true });
      }
    }
  }

  /** Filas por ordem de chegada: a cada `size` caçadores, uma partida. */
  #pairInOrder(mode, size, start) {
    const waiting = this.#waiting(mode);
    while (waiting.length >= size) {
      const group = waiting.splice(0, size);
      this.#take(mode, group);
      start(group.map(seat));
    }
  }

  /** 2x2: as duplas são sorteadas. */
  #duoTeams(seats) {
    const shuffled = [...seats].sort(() => this.rng() - 0.5);
    return [shuffled.slice(0, 2), shuffled.slice(2)];
  }
}

const seat = (w) => ({ player: w.s.player, socketId: w.s.socket.id });

module.exports = { Matchmaker, QUEUES };
