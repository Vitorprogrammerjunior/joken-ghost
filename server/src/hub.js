'use strict';
// Lobby, fila de partidas, desafios, salas privadas e partidas em andamento.
const crypto = require('crypto');
const catalog = require('./catalog');
const { RULES, CARDS, CHARACTERS, LEAGUES, leagueOf, unlockedCards, unlockedCharacters } = catalog;
const duelRules = require('./duel');
const { applyResult, FarmGuard } = require('./trophies');
const { cleanNickname } = require('./store');

const STAGES = ['floresta', 'patio', 'mansao', 'camara'];
const CHALLENGE_MS = 20000;
const RATE_PER_SEC = 25;

function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  return `JGH-${code}`;
}

class Hub {
  /**
   * @param {import('socket.io').Server} io
   * @param {object} store  (src/store.js)
   */
  constructor(io, store, { rng = Math.random, rules = RULES, now = Date.now } = {}) {
    this.io = io;
    this.store = store;
    this.rng = rng;
    this.rules = rules;
    this.now = now;
    this.sessions = new Map();   // socketId -> { socket, player, status, matchId }
    this.online = new Map();     // playerId -> socketId
    this.queue = new Map();      // playerId -> desde quando
    this.challenges = new Map(); // `${de}>${para}` -> { from, to, timer }
    this.rooms = new Map();      // código -> playerId do dono
    this.matches = new Map();    // matchId -> partida
    this.farm = new FarmGuard();
    this.lobbyTimer = null;
    this.queueTimer = setInterval(() => this.#matchmake(), 1500);
    io.on('connection', (socket) => this.#attach(socket));
  }

  stop() {
    clearInterval(this.queueTimer);
    for (const m of this.matches.values()) clearTimeout(m.timer);
  }

  // ═══════════════════════ conexão ═══════════════════════
  #attach(socket) {
    let budget = RATE_PER_SEC;
    const refill = setInterval(() => { budget = RATE_PER_SEC; }, 1000);
    const on = (event, fn) => socket.on(event, async (data = {}) => {
      if (--budget < 0) return;
      try { await fn(data || {}); } catch (err) { console.error(event, err); socket.emit('error_msg', { message: 'Erro no servidor.' }); }
    });

    on('hello', (d) => this.#hello(socket, d));
    on('set_nickname', (d) => this.#withPlayer(socket, (s) => { s.player.nickname = cleanNickname(d.nickname); return this.#saveAndSync(s); }));
    on('select_character', (d) => this.#withPlayer(socket, (s) => {
      if (!unlockedCharacters(s.player.best).includes(d.id)) return socket.emit('error_msg', { message: 'Personagem bloqueado.' });
      s.player.character = d.id;
      return this.#saveAndSync(s);
    }));
    on('ranking', () => this.#withPlayer(socket, (s) => this.#ranking(s)));
    on('queue_join', () => this.#withPlayer(socket, (s) => this.#queueJoin(s)));
    on('queue_leave', () => this.#withPlayer(socket, (s) => this.#queueLeave(s)));
    on('challenge', (d) => this.#withPlayer(socket, (s) => this.#challenge(s, d.targetId)));
    on('challenge_answer', (d) => this.#withPlayer(socket, (s) => this.#challengeAnswer(s, d.fromId, !!d.accept)));
    on('room_create', () => this.#withPlayer(socket, (s) => this.#roomCreate(s)));
    on('room_join', (d) => this.#withPlayer(socket, (s) => this.#roomJoin(s, d.code)));
    on('room_leave', () => this.#withPlayer(socket, (s) => this.#roomLeave(s)));
    on('pick_card', (d) => this.#withPlayer(socket, (s) => this.#pickCard(s, d.cardId ?? null)));
    on('pick_weapon', (d) => this.#withPlayer(socket, (s) => this.#pickWeapon(s, d.weapon)));
    on('forfeit', () => this.#withPlayer(socket, (s) => this.#forfeit(s)));
    socket.on('disconnect', () => { clearInterval(refill); this.#disconnect(socket); });
  }

  #withPlayer(socket, fn) {
    const s = this.sessions.get(socket.id);
    if (!s) return socket.emit('error_msg', { message: 'Conecte-se primeiro.' });
    return fn(s);
  }

  async #hello(socket, { token, nickname }) {
    let player = token ? await this.store.getByToken(token) : null;
    let newToken = null;
    if (!player) {
      const created = await this.store.create(nickname);
      player = created.player;
      newToken = created.token;
    }
    // já conectado em outra aba: derruba a sessão antiga
    const oldSid = this.online.get(player.id);
    const old = oldSid && this.sessions.get(oldSid);
    if (old && oldSid !== socket.id) {
      old.socket.emit('error_msg', { message: 'Sua conta foi aberta em outra aba.' });
      this.sessions.delete(oldSid);
      old.socket.disconnect(true);
    }
    const s = { socket, player, status: 'lobby', matchId: null };
    this.sessions.set(socket.id, s);
    this.online.set(player.id, socket.id);
    socket.emit('welcome', { token: newToken, profile: this.#profile(player), catalog: { cards: CARDS, characters: CHARACTERS, leagues: LEAGUES, rules: this.rules } });

    // voltando para uma partida em andamento?
    const match = [...this.matches.values()].find(m => m.players.some(p => p.id === player.id));
    if (match) {
      const i = match.players.findIndex(p => p.id === player.id);
      s.player = match.players[i]; // mesmo objeto da partida, para os troféus saírem certos
      match.sockets[i] = socket.id;
      clearTimeout(match.grace[i]);
      match.grace[i] = null;
      s.status = 'match';
      s.matchId = match.id;
      socket.emit('match_resume', this.#phaseView(match, i));
      this.#emitTo(match, 1 - i, 'opponent_status', { connected: true });
    }
    this.#broadcastLobby();
  }

  #disconnect(socket) {
    const s = this.sessions.get(socket.id);
    if (!s) return;
    this.sessions.delete(socket.id);
    if (this.online.get(s.player.id) === socket.id) this.online.delete(s.player.id);
    this.queue.delete(s.player.id);
    this.#roomLeave(s);
    for (const [k, c] of this.challenges) if (c.from === s.player.id || c.to === s.player.id) { clearTimeout(c.timer); this.challenges.delete(k); }
    const match = s.matchId && this.matches.get(s.matchId);
    if (match) {
      const i = match.players.findIndex(p => p.id === s.player.id);
      match.sockets[i] = null;
      this.#emitTo(match, 1 - i, 'opponent_status', { connected: false, graceMs: this.rules.reconnectGraceMs });
      match.grace[i] = setTimeout(() => this.#finish(match, 1 - i, 'abandono'), this.rules.reconnectGraceMs);
    }
    this.#broadcastLobby();
  }

  // ═══════════════════════ perfil / lobby ═══════════════════════
  #profile(p) {
    return {
      id: p.id, nickname: p.nickname, trophies: p.trophies, best: p.best, wins: p.wins, losses: p.losses,
      character: p.character, league: leagueOf(p.trophies),
      unlocked: { cards: unlockedCards(p.best), characters: unlockedCharacters(p.best) },
    };
  }

  async #saveAndSync(s) {
    await this.store.save(s.player);
    s.socket.emit('profile', this.#profile(s.player));
    this.#broadcastLobby();
  }

  #lobbyState() {
    const online = [];
    for (const s of this.sessions.values()) {
      online.push({ id: s.player.id, nickname: s.player.nickname, trophies: s.player.trophies, character: s.player.character, league: leagueOf(s.player.trophies), status: s.status });
    }
    online.sort((a, b) => b.trophies - a.trophies);
    return { online: online.slice(0, 100), count: online.length, matches: this.matches.size };
  }

  #broadcastLobby() {
    if (this.lobbyTimer) return;
    this.lobbyTimer = setTimeout(() => {
      this.lobbyTimer = null;
      this.io.emit('lobby', this.#lobbyState());
    }, 250);
  }

  async #ranking(s) {
    const top = await this.store.top(50);
    s.socket.emit('ranking', {
      top: top.map((p, i) => ({ rank: i + 1, id: p.id, nickname: p.nickname, trophies: p.trophies, wins: p.wins, character: p.character, league: leagueOf(p.trophies) })),
      me: { rank: await this.store.rankOf(s.player), trophies: s.player.trophies },
      total: await this.store.count(),
    });
  }

  // ═══════════════════════ fila (partida rápida) ═══════════════════════
  #queueJoin(s) {
    if (s.status !== 'lobby') return;
    this.queue.set(s.player.id, this.now());
    s.status = 'queue';
    s.socket.emit('queue_state', { searching: true });
    this.#broadcastLobby();
    this.#matchmake();
  }

  #queueLeave(s) {
    if (!this.queue.delete(s.player.id)) return;
    s.status = 'lobby';
    s.socket.emit('queue_state', { searching: false });
    this.#broadcastLobby();
  }

  #session(playerId) {
    const sid = this.online.get(playerId);
    return sid ? this.sessions.get(sid) : null;
  }

  /** Junta jogadores com troféus parecidos; a tolerância cresce com a espera. */
  #matchmake() {
    const now = this.now();
    const waiting = [...this.queue.entries()].map(([id, since]) => ({ s: this.#session(id), since })).filter(w => w.s);
    waiting.sort((a, b) => a.since - b.since);
    const used = new Set();
    for (const a of waiting) {
      if (used.has(a.s.player.id)) continue;
      const tolA = 150 + 25 * ((now - a.since) / 1000);
      let best = null;
      for (const b of waiting) {
        if (b === a || used.has(b.s.player.id)) continue;
        const diff = Math.abs(a.s.player.trophies - b.s.player.trophies);
        const tol = Math.max(tolA, 150 + 25 * ((now - b.since) / 1000));
        if (diff <= tol && (!best || diff < best.diff)) best = { b, diff };
      }
      if (best) {
        used.add(a.s.player.id); used.add(best.b.s.player.id);
        this.queue.delete(a.s.player.id); this.queue.delete(best.b.s.player.id);
        this.#startMatch(a.s, best.b.s, 'rápida');
      }
    }
  }

  // ═══════════════════════ desafios ═══════════════════════
  #challenge(s, targetId) {
    const t = this.#session(targetId);
    if (!t || t === s || t.status !== 'lobby' || s.status !== 'lobby') return s.socket.emit('error_msg', { message: 'Esse jogador não está disponível.' });
    const key = `${s.player.id}>${targetId}`;
    if (this.challenges.has(key)) return;
    const timer = setTimeout(() => {
      this.challenges.delete(key);
      s.socket.emit('challenge_declined', { id: targetId, nickname: t.player.nickname, reason: 'tempo' });
    }, CHALLENGE_MS);
    this.challenges.set(key, { from: s.player.id, to: targetId, timer });
    t.socket.emit('challenge_received', { from: { id: s.player.id, nickname: s.player.nickname, trophies: s.player.trophies, character: s.player.character }, expiresIn: CHALLENGE_MS });
    s.socket.emit('challenge_sent', { id: targetId, nickname: t.player.nickname });
  }

  #challengeAnswer(s, fromId, accept) {
    const key = `${fromId}>${s.player.id}`;
    const c = this.challenges.get(key);
    if (!c) return;
    clearTimeout(c.timer);
    this.challenges.delete(key);
    const from = this.#session(fromId);
    if (!from) return;
    if (!accept) return from.socket.emit('challenge_declined', { id: s.player.id, nickname: s.player.nickname, reason: 'recusou' });
    if (from.status !== 'lobby' || s.status !== 'lobby') return s.socket.emit('error_msg', { message: 'O desafio expirou.' });
    this.#startMatch(from, s, 'desafio');
  }

  // ═══════════════════════ salas privadas ═══════════════════════
  #roomCreate(s) {
    if (s.status !== 'lobby') return;
    this.#roomLeave(s);
    let code;
    do code = roomCode(); while (this.rooms.has(code));
    this.rooms.set(code, s.player.id);
    s.status = 'room';
    s.room = code;
    s.socket.emit('room_created', { code });
    this.#broadcastLobby();
  }

  #roomJoin(s, rawCode) {
    let code = String(rawCode || '').toUpperCase().trim();
    if (code.length === 4) code = `JGH-${code}`;
    const ownerId = this.rooms.get(code);
    const owner = ownerId && this.#session(ownerId);
    if (!owner) return s.socket.emit('error_msg', { message: 'Sala não encontrada.' });
    if (owner === s) return;
    this.rooms.delete(code);
    owner.room = null;
    this.#startMatch(owner, s, 'sala');
  }

  #roomLeave(s) {
    if (!s.room) return;
    this.rooms.delete(s.room);
    s.room = null;
    if (s.status === 'room') s.status = 'lobby';
  }

  // ═══════════════════════ partida ═══════════════════════
  #startMatch(sa, sb, mode) {
    for (const s of [sa, sb]) { this.queue.delete(s.player.id); this.#roomLeave(s); }
    const match = {
      id: crypto.randomBytes(6).toString('hex'),
      mode,
      players: [sa.player, sb.player],
      sockets: [sa.socket.id, sb.socket.id],
      grace: [null, null],
      duel: duelRules.createDuel(sa.player, sb.player, this.rng),
      stage: STAGES[Math.floor(this.rng() * STAGES.length)],
      timer: null,
      endsAt: 0,
      last: null,
    };
    this.matches.set(match.id, match);
    for (const s of [sa, sb]) { s.status = 'match'; s.matchId = match.id; }
    [0, 1].forEach(i => this.#emitTo(match, i, 'match_start', this.#startView(match, i)));
    this.#broadcastLobby();
    match.timer = setTimeout(() => this.#startRound(match), 2200);
  }

  #fighterView(f) {
    return { id: f.id, nickname: f.nickname, character: f.character, trophies: f.trophies, hp: f.hp, maxHp: f.maxHp, league: leagueOf(f.trophies) };
  }

  #startView(match, i) {
    const d = match.duel;
    return { matchId: match.id, mode: match.mode, stage: match.stage, you: this.#fighterView(d.fighters[i]), opponent: this.#fighterView(d.fighters[1 - i]) };
  }

  /** Estado atual da partida do ponto de vista do jogador i (para reconexão). */
  #phaseView(match, i) {
    const d = match.duel;
    const me = d.fighters[i], op = d.fighters[1 - i];
    return {
      ...this.#startView(match, i),
      round: d.round,
      phase: d.phase,
      endsIn: Math.max(0, match.endsAt - this.now()),
      hand: me.hand,
      yourCard: d.phase === 'weapon' ? me.card : null,
      opponentCard: d.phase === 'weapon' ? op.card : null,
      cardLocked: me.cardLocked,
      weaponLocked: me.weaponLocked,
      deckLeft: me.deck.filter(c => !me.used.includes(c)).length,
    };
  }

  #emitTo(match, i, event, data) {
    const sid = match.sockets[i];
    const s = sid && this.sessions.get(sid);
    if (s) s.socket.emit(event, data);
  }

  #phase(match, ms, next) {
    clearTimeout(match.timer);
    match.endsAt = this.now() + ms;
    match.timer = setTimeout(next, ms);
  }

  #startRound(match) {
    const d = duelRules.startRound(match.duel);
    [0, 1].forEach(i => {
      const me = d.fighters[i];
      this.#emitTo(match, i, 'card_phase', {
        round: d.round, hand: me.hand, endsIn: this.rules.cardPhaseMs,
        hp: { you: me.hp, opp: d.fighters[1 - i].hp }, deckLeft: me.deck.filter(c => !me.used.includes(c)).length,
        sudden: d.round >= this.rules.suddenDeathRound,
      });
    });
    if (duelRules.bothLocked(d, 'cardLocked')) return this.#weaponPhase(match);
    this.#phase(match, this.rules.cardPhaseMs, () => this.#weaponPhase(match));
  }

  #weaponPhase(match) {
    const d = duelRules.startWeaponPhase(match.duel);
    [0, 1].forEach(i => this.#emitTo(match, i, 'weapon_phase', {
      round: d.round, endsIn: this.rules.weaponPhaseMs, yourCard: d.fighters[i].card, opponentCard: d.fighters[1 - i].card,
    }));
    this.#phase(match, this.rules.weaponPhaseMs, () => this.#resolve(match));
  }

  #index(match, s) { return match.players.findIndex(p => p.id === s.player.id); }

  #pickCard(s, cardId) {
    const match = this.matches.get(s.matchId);
    if (!match) return;
    const i = this.#index(match, s);
    if (!duelRules.pickCard(match.duel, i, cardId)) return;
    s.socket.emit('card_locked', { cardId });
    this.#emitTo(match, 1 - i, 'opponent_ready', { phase: 'card' });
    if (duelRules.bothLocked(match.duel, 'cardLocked')) this.#weaponPhase(match);
  }

  #pickWeapon(s, weapon) {
    const match = this.matches.get(s.matchId);
    if (!match) return;
    const i = this.#index(match, s);
    const d = match.duel;
    if (!duelRules.pickWeapon(d, i, weapon)) return;
    s.socket.emit('weapon_locked', { weapon });
    const op = d.fighters[1 - i];
    this.#emitTo(match, 1 - i, 'opponent_ready', { phase: 'weapon' });
    // Visão: quem ainda não escolheu vê a arma de quem já escolheu
    if (op.card === 'visao' && !op.weaponLocked) this.#emitTo(match, 1 - i, 'opponent_weapon', { weapon });
    if (duelRules.bothLocked(d, 'weaponLocked')) this.#resolve(match);
  }

  #resolve(match) {
    clearTimeout(match.timer);
    const r = duelRules.resolveRound(match.duel);
    match.last = r;
    [0, 1].forEach(i => this.#emitTo(match, i, 'round_result', {
      round: r.round,
      outcome: r.outcome === 'draw' ? 'draw' : r.outcome === i ? 'win' : 'lose',
      you: r.fighters[i], opponent: r.fighters[1 - i],
      hp: { you: r.hp[i], opp: r.hp[1 - i] },
      sudden: r.sudden,
    }));
    if (r.winner != null) match.timer = setTimeout(() => this.#finish(match, r.winner, 'nocaute'), this.rules.revealMs);
    else this.#phase(match, this.rules.revealMs, () => this.#startRound(match));
  }

  #forfeit(s) {
    const match = this.matches.get(s.matchId);
    if (match) this.#finish(match, 1 - this.#index(match, s), 'desistência');
  }

  async #finish(match, winnerIdx, reason) {
    if (!this.matches.has(match.id)) return;
    this.matches.delete(match.id);
    clearTimeout(match.timer);
    match.grace.forEach(t => clearTimeout(t));
    const [w, l] = [match.players[winnerIdx], match.players[1 - winnerIdx]];
    const ranked = this.farm.allow(w.id, l.id, this.now());
    const results = applyResult(w, l, { ranked });
    await Promise.all([this.store.save(w), this.store.save(l)]);
    [0, 1].forEach(i => {
      const p = match.players[i];
      const res = results.find(x => x.id === p.id);
      this.#emitTo(match, i, 'match_end', {
        won: i === winnerIdx, reason, ranked,
        trophies: { before: res.before, after: res.after, delta: res.delta },
        unlocked: res.unlocked,
        profile: this.#profile(p),
        opponent: { nickname: match.players[1 - i].nickname },
      });
      const s = this.#session(p.id);
      if (s && s.matchId === match.id) { s.status = 'lobby'; s.matchId = null; }
    });
    this.#broadcastLobby();
  }
}

module.exports = { Hub, STAGES };
