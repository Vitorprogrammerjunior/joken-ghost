'use strict';
// Torneio relâmpago: 8 caçadores em mata-mata (quartas, semi e final).
// Se em `fillAfterMs` não juntar 8 pessoas, bots completam a chave.
// Partidas de bot contra bot são simuladas na hora; as outras são duelos de verdade (sem troféus).

const SIZE = 8;
const PRIZES = { champion: 80, finalist: 30, semifinal: 15 };

class Tournament {
  /**
   * @param {object} o
   * @param {() => number} o.now
   * @param {() => number} o.rng
   * @param {number} o.fillAfterMs
   * @param {(trophies: number) => object} o.createBot
   * @param {(a: object, b: object) => Promise<string>} o.play       duelo de verdade; resolve com o id do vencedor
   * @param {(a: object, b: object) => string} o.simulate             bot contra bot; devolve o id do vencedor
   * @param {(t: Tournament) => void} o.broadcast                     avisa os participantes
   * @param {(t: Tournament, placements: object) => void} o.onFinish
   */
  constructor(o) {
    Object.assign(this, o);
    this.id = `T${Math.floor(this.now() / 1000).toString(36)}`;
    this.status = 'waiting';
    this.entrants = [];   // jogadores (objetos do perfil, ou bots)
    this.rounds = [];     // [[{ a, b, winner }]] por fase, com ids
    this.openedAt = this.now();
  }

  get humans() { return this.entrants.filter(p => !p.isBot); }
  has(playerId) { return this.entrants.some(p => p.id === playerId); }

  join(player) {
    if (this.status !== 'waiting' || this.has(player.id) || this.entrants.length >= SIZE) return false;
    if (this.humans.length === 0) this.openedAt = this.now(); // a espera conta a partir do 1º caçador
    this.entrants.push(player);
    if (this.entrants.length === SIZE) this.#begin();
    else this.broadcast(this);
    return true;
  }

  leave(playerId) {
    if (this.status !== 'waiting') return false;
    this.entrants = this.entrants.filter(p => p.id !== playerId);
    this.broadcast(this);
    return true;
  }

  /** Chamado de tempos em tempos: completa com bots quem esperou demais. */
  tick() {
    if (this.status !== 'waiting' || this.humans.length === 0) return;
    if (this.now() - this.openedAt < this.fillAfterMs) return;
    const trophies = this.humans[0].trophies;
    while (this.entrants.length < SIZE) this.entrants.push(this.createBot(trophies));
    this.#begin();
  }

  get startsIn() { return Math.max(0, this.openedAt + this.fillAfterMs - this.now()); }

  #begin() {
    this.status = 'running';
    this.#run().catch((err) => console.error('Torneio:', err));
  }

  async #run() {
    const shuffled = [...this.entrants].sort(() => this.rng() - 0.5);
    let players = shuffled;
    while (players.length > 1) {
      const pairs = [];
      for (let i = 0; i < players.length; i += 2) pairs.push({ a: players[i].id, b: players[i + 1].id, winner: null });
      this.rounds.push(pairs);
      this.broadcast(this);
      await Promise.all(pairs.map(async (pair) => {
        const a = this.#player(pair.a), b = this.#player(pair.b);
        pair.winner = a.isBot && b.isBot ? this.simulate(a, b) : await this.play(a, b);
        this.broadcast(this);
      }));
      players = pairs.map(p => this.#player(p.winner));
    }
    this.status = 'done';
    this.broadcast(this);
    this.onFinish(this, this.placements());
  }

  #player(id) { return this.entrants.find(p => p.id === id); }

  /** Campeão, vice e semifinalistas (ids). */
  placements() {
    const final = this.rounds.at(-1)?.[0];
    const semis = this.rounds.at(-2) ?? [];
    if (!final?.winner) return null;
    return {
      champion: final.winner,
      finalist: final.winner === final.a ? final.b : final.a,
      semifinal: semis.map(p => (p.winner === p.a ? p.b : p.a)),
    };
  }

  /** Dados para a tela (chave do torneio). */
  view() {
    const card = (p) => ({ id: p.id, nickname: p.nickname, character: p.character, isBot: !!p.isBot });
    return {
      id: this.id, status: this.status, size: SIZE, startsIn: this.startsIn,
      entrants: this.entrants.map(card),
      rounds: this.rounds.map(r => r.map(({ a, b, winner }) => ({ a, b, winner }))),
    };
  }
}

module.exports = { Tournament, SIZE, PRIZES };
