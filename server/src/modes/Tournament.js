'use strict';
// Torneio relâmpago: até 8 caçadores em mata-mata (sem troféus, com prêmios em Ecto).
// Começa quando junta 8, ou `fillAfterMs` depois do 1º inscrito se já houver pelo menos 4.
// Com 5 a 7 inscritos a chave é de 8 e alguns passam direto da primeira fase.

const { publicLook } = require('../cosmetics');

const SIZE = 8;
const MIN_PLAYERS = 4;
const PRIZES = { champion: 80, finalist: 30, semifinal: 15 };

/** Tamanho da chave (potência de 2) para `n` inscritos. */
const bracketSize = (n) => (n <= MIN_PLAYERS ? MIN_PLAYERS : SIZE);

class Tournament {
  /**
   * @param {object} o
   * @param {() => number} o.now
   * @param {() => number} o.rng
   * @param {number} o.fillAfterMs
   * @param {(a: object, b: object) => Promise<string>} o.play       duelo de verdade; resolve com o id do vencedor
   * @param {(t: Tournament) => void} o.broadcast                     avisa os participantes
   * @param {(t: Tournament, placements: object) => void} o.onFinish
   */
  constructor(o) {
    Object.assign(this, o);
    this.id = `T${Math.floor(this.now() / 1000).toString(36)}`;
    this.status = 'waiting';
    this.entrants = [];   // perfis dos inscritos
    this.rounds = [];     // [[{ a, b, winner }]] por fase, com ids (b = null: passa direto)
    this.size = SIZE;
    this.openedAt = this.now();
  }

  has(playerId) { return this.entrants.some(p => p.id === playerId); }

  join(player) {
    if (this.status !== 'waiting' || this.has(player.id) || this.entrants.length >= SIZE) return false;
    if (this.entrants.length === 0) this.openedAt = this.now(); // a espera conta a partir do 1º caçador
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

  /** Chamado de tempos em tempos: começa quando a espera acabou e há gente suficiente. */
  tick() {
    if (this.status !== 'waiting' || this.entrants.length < MIN_PLAYERS) return;
    if (this.now() - this.openedAt >= this.fillAfterMs) this.#begin();
  }

  get startsIn() { return Math.max(0, this.openedAt + this.fillAfterMs - this.now()); }

  #begin() {
    this.status = 'running';
    this.size = bracketSize(this.entrants.length);
    this.#run().catch((err) => console.error('Torneio:', err));
  }

  /** Primeira fase: quem sobra sem adversário passa direto. */
  #firstRound() {
    const players = [...this.entrants].sort(() => this.rng() - 0.5).map(p => p.id);
    const byes = this.size - players.length;
    const pairs = [];
    for (let i = 0; i < byes; i++) pairs.push({ a: players.shift(), b: null });
    while (players.length) pairs.push({ a: players.shift(), b: players.shift() });
    return pairs.map(p => ({ ...p, winner: p.b == null ? p.a : null }));
  }

  async #run() {
    let pairs = this.#firstRound();
    for (;;) {
      this.rounds.push(pairs);
      this.broadcast(this);
      await Promise.all(pairs.filter(p => !p.winner).map(async (pair) => {
        pair.winner = await this.play(this.#player(pair.a), this.#player(pair.b));
        this.broadcast(this);
      }));
      if (pairs.length === 1) break;
      const next = [];
      for (let i = 0; i < pairs.length; i += 2) next.push({ a: pairs[i].winner, b: pairs[i + 1].winner, winner: null });
      pairs = next;
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
      semifinal: semis.filter(p => p.b != null).map(p => (p.winner === p.a ? p.b : p.a)),
    };
  }

  /** Dados para a tela (chave do torneio). */
  view() {
    const card = (p) => ({ id: p.id, nickname: p.nickname, character: p.character, ...publicLook(p) });
    return {
      id: this.id, status: this.status, size: this.size, min: MIN_PLAYERS, startsIn: this.startsIn,
      entrants: this.entrants.map(card),
      rounds: this.rounds.map(r => r.map(({ a, b, winner }) => ({ a, b, winner }))),
    };
  }
}

module.exports = { Tournament, SIZE, MIN_PLAYERS, PRIZES };
