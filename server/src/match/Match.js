'use strict';
// Base de toda partida: assentos (jogadores, ou um bot da ranqueada com `brain`), mensagens, temporizadores,
// reconexão, espectadores e expressões. As regras ficam nas subclasses
// (DuelMatch para duelos 1x1/2x2, RaidMatch para o chefe cooperativo).
const crypto = require('crypto');

const EMOTE_COOLDOWN_MS = 2000;

class Match {
  /**
   * @param {object} o
   * @param {import('socket.io').Server} o.io
   * @param {object} o.rules           regras (catalog.RULES)
   * @param {() => number} o.now
   * @param {string} o.kind            'ranked' | 'casual' | 'duo' | 'raid' | 'tournament' | 'king' | 'room' | 'challenge'
   * @param {{ player: object, socketId: string|null, brain?: object }[]} o.seats  `brain`: assento controlado pelo servidor
   * @param {(match: Match, result: object) => Promise<object[]>} o.onEnd  devolve o pedaço pessoal do fim para cada assento
   */
  constructor({ io, rules, now, kind, seats, onEnd }) {
    this.id = crypto.randomBytes(6).toString('hex');
    this.io = io;
    this.rules = rules;
    this.now = now;
    this.kind = kind;
    this.onEnd = onEnd;
    this.seats = seats.map(s => ({ player: s.player, socketId: s.socketId ?? null, brain: s.brain ?? null, grace: null, lastEmote: 0 }));
    this.timers = new Set();
    this.spectators = new Set();
    this.over = false;
  }

  get room() { return `match:${this.id}`; }
  /** Assentos de gente de verdade (os de bot não têm conexão nem perfil salvo). */
  get humans() { return this.seats.filter(s => !s.brain); }

  seatOf(playerId) { return this.seats.findIndex(s => s.player.id === playerId); }

  // ─── mensagens ───
  send(i, event, data) {
    const sid = this.seats[i]?.socketId;
    if (sid) this.io.to(sid).emit(event, data);
  }

  toSpectators(event, data) { this.io.to(this.room).emit(event, data); }

  /** Mesmo dado para todos (assentos e espectadores). */
  toAll(event, data) {
    this.seats.forEach((_, i) => this.send(i, event, data));
    this.toSpectators(event, data);
  }

  // ─── tempo ───
  later(ms, fn) {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.over) fn(); }, ms);
    this.timers.add(t);
    return t;
  }

  cancel(t) { clearTimeout(t); this.timers.delete(t); }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  // ─── conexão ───
  disconnect(i) {
    const seat = this.seats[i];
    seat.socketId = null;
    this.toAll('seat_status', { seat: i, connected: false, graceMs: this.rules.reconnectGraceMs });
    seat.grace = this.later(this.rules.reconnectGraceMs, () => { seat.grace = null; this.abandon(i); });
  }

  reconnect(i, socketId) {
    const seat = this.seats[i];
    seat.socketId = socketId;
    if (seat.grace) { this.cancel(seat.grace); seat.grace = null; }
    this.send(i, 'match_resume', this.view(i));
    this.toAll('seat_status', { seat: i, connected: true });
  }

  /** Quem caiu e não voltou a tempo (cada modo decide o que acontece). */
  abandon(_i) { throw new Error('abandon() não implementado'); }

  /** Quem saiu de uma partida que continua sem ele: para de receber as mensagens dela. */
  detach(i) { this.seats[i].socketId = null; }

  // ─── espectadores ───
  addSpectator(socket) {
    socket.join(this.room);
    this.spectators.add(socket.id);
    socket.emit('match_start', this.view(null));
    this.toAll('spectators', { count: this.spectators.size });
  }

  removeSpectator(socket) {
    socket.leave(this.room);
    if (this.spectators.delete(socket.id)) this.toAll('spectators', { count: this.spectators.size });
  }

  // ─── expressões ───
  emote(i, id) {
    const seat = this.seats[i];
    if (this.now() - seat.lastEmote < EMOTE_COOLDOWN_MS) return;
    seat.lastEmote = this.now();
    this.toAll('emote', { seat: i, id });
  }

  // ─── fim ───
  /** Encerra uma vez: o dono da partida aplica troféus/recompensas e manda o fim para cada um. */
  async finish(result) {
    if (this.over) return;
    this.over = true;
    this.clearTimers();
    const personal = await this.onEnd(this, result);
    this.seats.forEach((_, i) => this.send(i, 'match_end', { ...result, ...personal[i] }));
    this.toSpectators('match_end', { ...result, spectator: true });
    this.io.in(this.room).socketsLeave(this.room);
    this.spectators.clear();
  }

  /** Visão da partida para o assento i (null = espectador). */
  view(_i) { throw new Error('view() não implementado'); }
}

module.exports = { Match };
