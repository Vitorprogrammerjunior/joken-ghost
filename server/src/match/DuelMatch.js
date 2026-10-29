'use strict';
// Duelo entre caçadores (1x1 ou 2x2) sobre as regras de src/duel.js.
// Com `bans`, antes da 1ª rodada cada um vê a build do outro e bane uma carta.
// Fases de cada rodada: cartas -> armas (com tempo por assento por causa da Visão) -> resultado.
const duelRules = require('../duel');
const { leagueOf, deckOf } = require('../catalog');
const { publicLook } = require('../cosmetics');
const { Match } = require('./Match');

const START_DELAY_MS = 2200;
const BANS_SHOW_MS = 2600;  // tempo para ver o que cada um baniu antes da 1ª rodada

class DuelMatch extends Match {
  /**
   * @param {object} o  tudo de Match, mais:
   * @param {boolean} o.ranked                  vale troféus
   * @param {string} o.stage                    cenário
   * @param {() => number} o.rng
   * @param {boolean} [o.partnerCarries]        2x2: quem cair fica parado no lugar e o parceiro segue (em vez de perder)
   * @param {boolean} [o.bans]                  1x1: fase de banir uma carta da build do adversário
   * @param {(match: DuelMatch, r: object) => void} [o.onRound]
   */
  constructor(o) {
    super(o);
    this.ranked = !!o.ranked;
    this.stage = o.stage;
    this.rng = o.rng;
    this.partnerCarries = !!o.partnerCarries;
    this.bans = !!o.bans && this.seats.length === 2;
    this.banned = null;      // carta banida da build de cada assento (depois da fase de banir)
    this.onRound = o.onRound ?? (() => {});
    const half = this.seats.length / 2;
    const teams = [this.seats.slice(0, half), this.seats.slice(half)].map(t => t.map(s => s.player));
    this.duel = duelRules.createDuel(teams, deckOf, this.rng, this.rules);
    this.away = new Set();   // 2x2: assentos de quem caiu (passam a carta e repetem a arma)
    this.deadlines = [];
    this.phaseTimers = [];
    this.endsAt = 0;
  }

  start() {
    this.seats.forEach((_, i) => this.send(i, 'match_start', this.view(i)));
    this.toSpectators('match_start', this.view(null));
    this.later(START_DELAY_MS, () => (this.bans ? this.#banPhase() : this.#cardPhase()));
  }

  // ═══════════════════════ fases ═══════════════════════
  #setPhaseTimers(timers) {
    for (const t of this.phaseTimers) this.cancel(t);
    this.phaseTimers = timers;
  }

  #banPhase() {
    const d = duelRules.startBanPhase(this.duel);
    const ms = this.rules.banPhaseMs;
    this.endsAt = this.now() + ms;
    this.seats.forEach((_, i) => this.send(i, 'ban_phase', { endsIn: ms, deck: this.#oppDeck(i) }));
    this.toSpectators('ban_phase', { endsIn: ms, deck: [] });
    const bots = this.seats.flatMap((seat, i) => (seat.brain
      ? [this.later(seat.brain.think('card', ms), () => this.pickBan(i, seat.brain.chooseBan(this.#oppDeck(i))))]
      : []));
    this.#setPhaseTimers([this.later(ms, () => this.#endBans()), ...bots]);
  }

  #endBans() {
    if (this.duel.phase !== 'ban') return;
    this.#setPhaseTimers([]);
    this.banned = duelRules.applyBans(this.duel);
    this.duel.phase = 'idle';
    this.toAll('bans', { banned: this.banned });
    this.later(BANS_SHOW_MS, () => this.#cardPhase());
  }

  #cardPhase() {
    const d = duelRules.startRound(this.duel);
    this.endsAt = this.now() + this.rules.cardPhaseMs;
    const common = { round: d.round, endsIn: this.rules.cardPhaseMs, hp: d.sides.map(s => s.hp), sudden: d.round >= this.rules.suddenDeathRound };
    this.seats.forEach((_, i) => {
      this.send(i, 'card_phase', { ...common, hand: d.fighters[i].hand, deckLeft: this.#deckLeft(i) });
    });
    this.toSpectators('card_phase', { ...common, hand: [] });
    for (const i of this.away) duelRules.pickCard(d, i, null);
    if (duelRules.bothLocked(d, 'cardLocked')) return this.#weaponPhase();
    this.#setPhaseTimers([this.later(this.rules.cardPhaseMs, () => this.#weaponPhase()), ...this.#botCards()]);
  }

  /** Assentos de bot escolhem a carta depois de "pensar". */
  #botCards() {
    const d = this.duel;
    return this.seats.flatMap((seat, i) => {
      const f = d.fighters[i];
      if (!seat.brain || f.cardLocked) return [];
      seat.brain.newRound();
      const side = d.sides[f.side];
      const opp = d.fighters[duelRules.laneOpponent(d, i)];
      return [this.later(seat.brain.think('card', this.rules.cardPhaseMs), () => {
        this.pickCard(i, seat.brain.chooseCard(f.hand, { hp: side.hp, maxHp: side.maxHp, oppHistory: opp.history }));
      })];
    });
  }

  /** Assentos de bot escolhem a arma (vendo a da Visão, se ela chegar antes). */
  #botWeapons() {
    const d = this.duel;
    return this.seats.flatMap((seat, i) => {
      if (!seat.brain) return [];
      const f = d.fighters[i];
      const opp = d.fighters[duelRules.laneOpponent(d, i)];
      return [this.later(seat.brain.think('weapon', duelRules.weaponTime(d, i)), () => {
        this.#lockWeapon(i, seat.brain.chooseWeapon({ ownHistory: f.history, oppHistory: opp.history, forbidden: f.forbidden }));
      })];
    });
  }

  #weaponPhase() {
    const d = duelRules.startWeaponPhase(this.duel);
    this.deadlines = d.fighters.map((_, i) => this.now() + duelRules.weaponTime(d, i));
    this.endsAt = Math.max(...this.deadlines);
    const cards = d.fighters.map(f => f.card);
    const timers = [];
    this.seats.forEach((_, i) => {
      const ms = duelRules.weaponTime(d, i);
      this.send(i, 'weapon_phase', { round: d.round, endsIn: ms, cards, forbidden: d.fighters[i].forbidden });
      timers.push(this.later(ms, () => this.#lockWeapon(i, null)));
    });
    this.toSpectators('weapon_phase', { round: d.round, endsIn: this.rules.weaponPhaseMs, cards, forbidden: null });
    this.#setPhaseTimers([...timers, ...this.#botWeapons()]);
    for (const i of this.away) this.#lockWeapon(i, null);
  }

  /** Trava a arma do assento i (null = tempo esgotado: repete a anterior). */
  #lockWeapon(i, weapon) {
    const d = this.duel;
    const f = d.fighters[i];
    if (d.phase !== 'weapon' || f.weaponLocked) return false;
    const ok = weapon == null ? duelRules.autoWeapon(d, i) != null : duelRules.pickWeapon(d, i, weapon);
    if (!ok) return false;
    this.send(i, 'weapon_locked', { weapon: f.weapon, auto: weapon == null });
    this.toAll('seat_ready', { seat: i, phase: 'weapon' });
    // Visão: quem ainda não escolheu vê a arma de quem acabou de escolher (ou a falsa do Disfarce)
    const j = duelRules.laneOpponent(d, i);
    if (d.fighters[j].card === 'visao' && !d.fighters[j].weaponLocked) {
      const seen = duelRules.visionOf(d, i);
      this.send(j, 'vision', { weapon: seen, seat: i });
      this.seats[j].brain?.see(seen);
    }
    if (duelRules.bothLocked(d, 'weaponLocked')) this.#resolve();
    return true;
  }

  #resolve() {
    this.#setPhaseTimers([]);
    const r = duelRules.resolveRound(this.duel);
    this.onRound(this, r);
    this.#botReactions(r);
    this.toAll('round_result', { ...r, history: this.duel.fighters.map(f => f.history) });
    if (r.winner != null) this.later(this.rules.revealMs, () => this.finish({ winnerSide: r.winner, reason: r.reason }));
    else this.later(this.rules.revealMs, () => this.#cardPhase());
  }

  /** Bots reagem com uma expressão de vez em quando (rodada vencida, fim de jogo...). */
  #botReactions(r) {
    this.seats.forEach((seat, i) => {
      if (!seat.brain) return;
      const side = this.duel.fighters[i].side;
      const lane = r.lanes.find(l => l.a === i || l.b === i);
      const mine = lane.a === i ? 'a' : 'b';
      const event = r.winner != null ? (r.winner === side ? 'match_won' : 'match_lost')
        : lane.outcome === mine ? 'round_won' : lane.outcome === 'draw' ? null : 'round_lost';
      const id = event && seat.brain.react(event);
      if (id) this.later(600 + Math.floor(this.rng() * 900), () => this.emote(i, id));
    });
  }

  // ═══════════════════════ jogadas dos clientes ═══════════════════════
  pickCard(i, cardId) {
    const d = this.duel;
    if (!duelRules.pickCard(d, i, cardId)) return;
    this.send(i, 'card_locked', { cardId });
    this.toAll('seat_ready', { seat: i, phase: 'card' });
    if (duelRules.bothLocked(d, 'cardLocked')) this.#weaponPhase();
  }

  pickWeapon(i, weapon) { this.#lockWeapon(i, weapon); }

  pickBan(i, cardId) {
    const d = this.duel;
    if (!duelRules.pickBan(d, i, cardId)) return;
    this.send(i, 'ban_locked', { cardId });
    this.toAll('seat_ready', { seat: i, phase: 'ban' });
    if (duelRules.bothLocked(d, 'banLocked')) this.#endBans();
  }

  /** Desistir: o lado de quem desistiu perde. */
  forfeit(i) { this.finish({ winnerSide: 1 - this.duel.fighters[i].side, reason: 'desistência' }); }

  /**
   * Quem caiu e não voltou a tempo. No 2x2 o parceiro segue: o lugar fica parado
   * (sem carta, repetindo a última arma, como no tempo esgotado). Sem ninguém do time, o time perde.
   */
  abandon(i) {
    const side = this.duel.fighters[i].side;
    const partnerHere = this.seats.some((s, k) => k !== i && this.duel.fighters[k].side === side && s.socketId && !this.away.has(k));
    if (!this.partnerCarries || !partnerHere) {
      this.finish({ winnerSide: 1 - side, reason: 'abandono' });
      return;
    }
    this.away.add(i);
    this.toAll('seat_status', { seat: i, connected: false, away: true });
    const d = this.duel;
    if (d.phase === 'card' && !d.fighters[i].cardLocked) this.pickCard(i, null);
    else if (d.phase === 'weapon') this.#lockWeapon(i, null);
  }

  reconnect(i, socketId) {
    this.away.delete(i);
    super.reconnect(i, socketId);
  }

  // ═══════════════════════ visões ═══════════════════════
  /** Cartas da build do adversário de pista (o que o assento i pode banir e enfrentar). */
  #oppDeck(i) {
    return [...this.duel.fighters[duelRules.laneOpponent(this.duel, i)].deck];
  }

  #deckLeft(i) {
    const f = this.duel.fighters[i];
    return f.deck.filter(c => !f.used.includes(c)).length;
  }

  #fighterView(i) {
    const f = this.duel.fighters[i];
    const p = this.seats[i].player;
    return {
      seat: i, side: f.side, lane: f.lane, id: f.id, nickname: f.nickname, character: f.character,
      trophies: f.trophies, league: leagueOf(f.trophies), ...publicLook(p),
    };
  }

  /** Estado completo para o assento i (null = espectador), usado no início e na reconexão. */
  view(i) {
    const d = this.duel;
    const me = i == null ? null : d.fighters[i];
    return {
      matchId: this.id, kind: this.kind, ranked: this.ranked, stage: this.stage, you: i,
      fighters: d.fighters.map((_, k) => this.#fighterView(k)),
      sides: d.sides.map(s => ({ hp: s.hp, maxHp: s.maxHp })),
      spectators: this.spectators.size,
      round: d.round,
      phase: d.phase,
      endsIn: Math.max(0, (i != null && d.phase === 'weapon' ? this.deadlines[i] : this.endsAt) - this.now()),
      hand: me && d.phase === 'card' ? me.hand : [],
      cards: d.phase === 'weapon' ? d.fighters.map(f => f.card) : null,
      cardLocked: !!me?.cardLocked,
      bans: this.bans,
      banLocked: !!me?.banLocked,
      oppDeck: i == null ? [] : this.#oppDeck(i),
      myDeck: me ? [...me.deck] : [],
      banned: this.banned,
      weaponLocked: !!me?.weaponLocked,
      forbidden: me?.forbidden ?? null,
      deckLeft: i == null ? 0 : this.#deckLeft(i),
      history: d.fighters.map(f => f.history),
    };
  }
}

module.exports = { DuelMatch };
