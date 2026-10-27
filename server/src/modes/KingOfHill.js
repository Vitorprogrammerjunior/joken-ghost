'use strict';
// Rei da Arena: quem vence fica, quem perde volta para o fim da fila.
// Quem está na fila assiste ao duelo atual. Fila vazia por muito tempo: um bot desafia o rei.

const BOT_CHALLENGE_MS = 15000;
const NEXT_MATCH_MS = 4000;

class KingOfHill {
  /**
   * @param {object} o
   * @param {() => number} o.now
   * @param {(trophies: number) => object} o.createBot
   * @param {(king: object, challenger: object, onStart: (match: object) => void) => Promise<{ winner: string, match: object }>} o.play
   *   duelo de verdade; `onStart` recebe a partida assim que ela começa (para os espectadores)
   * @param {(k: KingOfHill) => void} o.broadcast
   * @param {(player: object, streak: number) => void} o.onWin   recompensa do vencedor
   * @param {number} [o.botChallengeMs]  fila vazia por este tempo: um bot desafia o rei
   */
  constructor(o) {
    Object.assign(this, o);
    this.botChallengeMs = o.botChallengeMs ?? BOT_CHALLENGE_MS;
    this.king = null;      // { player, streak }
    this.line = [];        // jogadores esperando a vez
    this.matchId = null;
    this.idleSince = this.now();
    this.nextAt = 0;
  }

  has(playerId) { return this.king?.player.id === playerId || this.line.some(p => p.id === playerId); }
  get members() { return [...(this.king ? [this.king.player] : []), ...this.line].filter(p => !p.isBot); }

  join(player) {
    if (this.has(player.id)) return false;
    this.line.push(player);
    this.broadcast(this);
    return true;
  }

  /** Sai da arena (o rei que sai sem estar lutando perde a coroa). */
  leave(playerId) {
    this.line = this.line.filter(p => p.id !== playerId);
    if (this.king?.player.id === playerId && !this.matchId) this.king = null;
    this.broadcast(this);
  }

  tick() {
    if (this.matchId || this.now() < this.nextAt) return;
    if (!this.king && this.line.length) {
      this.king = { player: this.line.shift(), streak: 0 };
      this.idleSince = this.now();
      this.broadcast(this);
    }
    if (!this.king) return;
    if (this.king.player.isBot && this.line.length === 0) { this.king = null; this.broadcast(this); return; }
    if (this.line.length) return this.#fight(this.line.shift());
    if (this.now() - this.idleSince >= this.botChallengeMs) this.#fight(this.createBot(this.king.player.trophies));
  }

  #fight(challenger) {
    this.matchId = 'starting'; // trava novos duelos até este começar
    this.#duel(challenger).catch((err) => { console.error('Rei da Arena:', err); this.matchId = null; });
  }

  async #duel(challenger) {
    const king = this.king.player;
    const { winner, match } = await this.play(king, challenger, (m) => { this.matchId = m.id; this.broadcast(this); });
    this.matchId = null;
    const loser = winner === king.id ? challenger : king;
    const champ = winner === king.id ? king : challenger;
    this.king = { player: champ, streak: winner === king.id ? this.king.streak + 1 : 1 };
    if (!champ.isBot) this.onWin(champ, this.king.streak);
    if (!loser.isBot && match.seats[match.seatOf(loser.id)].socketId) this.line.push(loser);
    this.idleSince = this.now();
    this.nextAt = this.now() + NEXT_MATCH_MS;
    this.broadcast(this);
  }

  view() {
    const card = (p) => ({ id: p.id, nickname: p.nickname, character: p.character, isBot: !!p.isBot });
    return {
      king: this.king ? { ...card(this.king.player), streak: this.king.streak } : null,
      line: this.line.map(card),
      matchId: this.matchId,
    };
  }
}

module.exports = { KingOfHill, BOT_CHALLENGE_MS };
