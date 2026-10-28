'use strict';
// Arena dos Caçadores: conexões, perfil, filas, desafios, salas privadas, partidas,
// torneio, Rei da Arena, espectadores, missões, temporadas e loja de cosméticos.
// As regras de cada coisa ficam nos seus módulos; aqui só se liga tudo.
const crypto = require('crypto');
const catalog = require('./catalog');
const { RULES, CARDS, DECK, CHARACTERS, LEAGUES, leagueOf, unlockedCards, unlockedCharacters, validateDeck, deckOf } = catalog;
const { applyResult, FarmGuard } = require('./trophies');
const { cleanNickname } = require('./store');
const cosmetics = require('./cosmetics');
const missions = require('./missions');
const seasons = require('./seasons');
const { RAID } = require('./raid');
const { DuelMatch } = require('./match/DuelMatch');
const { RaidMatch } = require('./match/RaidMatch');
const { Matchmaker } = require('./modes/Matchmaker');
const { Tournament, PRIZES } = require('./modes/Tournament');
const { KingOfHill } = require('./modes/KingOfHill');
const { BotPolicy } = require('./bots/policy');
const { BotBrain } = require('./bots/BotBrain');
const { createBotPersona } = require('./bots/persona');

const STAGES = ['floresta', 'patio', 'mansao', 'camara', 'cemiterio', 'catacumbas', 'torre', 'portal'];
const BOSS_STAGES = { kastle: 'camara', coveiro: 'catacumbas', relojoeiro: 'torre', morgana: 'portal' };
const CHALLENGE_MS = 20000;
const TICK_MS = 1000;
const SEASON_CHECK_MS = 60 * 60 * 1000;
const KING_WIN_ECTO = 10;

function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  return `JGH-${code}`;
}

class Hub {
  /**
   * @param {import('socket.io').Server} io
   * @param {object} store   persistência (src/store.js)
   * @param {object} opts
   * @param {object} opts.shared   regras compartilhadas (src/shared.js)
   */
  constructor(io, store, { shared, rng = Math.random, rules = RULES, now = Date.now, tournamentFillMs = 45000, ratePerSec = 25 } = {}) {
    this.io = io;
    this.store = store;
    this.shared = shared;
    this.rng = rng;
    this.rules = rules;
    this.now = now;
    this.tournamentFillMs = tournamentFillMs;
    this.ratePerSec = ratePerSec; // limite de mensagens por segundo de cada cliente
    this.sessions = new Map();   // socketId -> { socket, player, status, matchId, watching, room }
    this.online = new Map();     // playerId -> socketId
    this.challenges = new Map(); // `${de}>${para}` -> { from, to, timer }
    this.rooms = new Map();      // código -> playerId do dono
    this.matches = new Map();    // matchId -> partida
    this.farm = new FarmGuard();
    this.lobbyTimer = null;
    this.lastSeasonCheck = 0;

    this.bots = new BotPolicy({ rules: rules.rankedBot, now, rng });
    this.matchmaker = new Matchmaker({
      now, rng,
      startDuel: (teams, o) => this.#play(teams.flat(), o),
      startRaid: (seats) => this.#startRaid(seats),
      botPolicy: this.bots,
      botSeat: (player) => this.#botSeat(player),
    });
    this.tournament = this.#newTournament();
    this.runningTournaments = new Set();
    this.king = new KingOfHill({
      now,
      play: (king, challenger, onStart) => this.#playKing(king, challenger, onStart),
      broadcast: (k) => this.#broadcastKing(k),
      onWin: (p, streak) => this.#updatePlayer(p.id, (pl) => { pl.ecto += KING_WIN_ECTO + 5 * Math.min(streak - 1, 6); }),
    });

    this.ticker = setInterval(() => this.#tick(), TICK_MS);
    io.on('connection', (socket) => this.#attach(socket));
  }

  stop() {
    clearInterval(this.ticker);
    for (const m of this.matches.values()) m.clearTimers();
  }

  #tick() {
    this.matchmaker.tick();
    this.tournament.tick();
    if (this.tournament.status !== 'waiting') {
      this.runningTournaments.add(this.tournament);
      this.tournament = this.#newTournament();
    }
    this.king.tick();
    if (this.now() - this.lastSeasonCheck > SEASON_CHECK_MS) {
      this.lastSeasonCheck = this.now();
      this.#rollSeason().catch(err => console.error('temporada', err));
    }
  }

  get #today() { return this.shared.dayKey(new Date(this.now())); }

  // ═══════════════════════ conexão ═══════════════════════
  #attach(socket) {
    let budget = this.ratePerSec;
    const refill = setInterval(() => { budget = this.ratePerSec; }, 1000);
    const on = (event, fn) => socket.on(event, async (data = {}) => {
      if (--budget < 0) return;
      try { await fn(data || {}); } catch (err) { console.error(event, err); socket.emit('error_msg', { message: 'Erro no servidor.' }); }
    });
    const as = (fn) => (d) => this.#withPlayer(socket, (s) => fn(s, d));

    on('hello', (d) => this.#hello(socket, d));
    // perfil
    on('set_nickname', as((s, d) => { s.player.nickname = cleanNickname(d.nickname); return this.#saveAndSync(s); }));
    on('select_character', as((s, d) => this.#selectCharacter(s, d.id)));
    on('set_deck', as((s, d) => this.#setDeck(s, d.cards)));
    on('ranking', as((s) => this.#ranking(s)));
    on('missions_claim', as((s, d) => this.#claimMission(s, d.id)));
    on('shop_buy', as((s, d) => this.#apply(s, cosmetics.buy(s.player, d.id))));
    on('equip_frame', as((s, d) => this.#apply(s, cosmetics.equipFrame(s.player, d.id ?? null))));
    on('set_avatar', as((s, d) => this.#apply(s, cosmetics.setAvatar(s.player, d, {
      unlocked: unlockedCharacters(s.player.best), isValidArt: this.shared.isValidArt,
    }))));
    // filas e modos
    on('queue_join', as((s, d) => this.#queueJoin(s, d.mode ?? 'ranked')));
    on('queue_leave', as((s) => this.#queueLeave(s)));
    on('tournament_join', as((s) => this.#tournamentJoin(s)));
    on('tournament_leave', as((s) => this.#tournamentLeave(s)));
    on('king_join', as((s) => this.#kingJoin(s)));
    on('king_leave', as((s) => this.#kingLeave(s)));
    on('challenge', as((s, d) => this.#challenge(s, d.targetId)));
    on('challenge_answer', as((s, d) => this.#challengeAnswer(s, d.fromId, !!d.accept)));
    on('room_create', as((s) => this.#roomCreate(s)));
    on('room_join', as((s, d) => this.#roomJoin(s, d.code)));
    on('room_leave', as((s) => this.#roomLeave(s)));
    on('spectate', as((s, d) => this.#spectate(s, d.playerId)));
    on('spectate_leave', as((s) => this.#stopWatching(s)));
    // partida
    on('pick_card', as((s, d) => this.#inMatch(s, (m, i) => m.pickCard(i, d.cardId ?? null))));
    on('pick_weapon', as((s, d) => this.#inMatch(s, (m, i) => m.pickWeapon(i, d.weapon))));
    on('forfeit', as((s) => this.#inMatch(s, (m, i) => {
      m.forfeit(i);
      if (m.over) return;
      // a partida segue sem ele (chefe cooperativo): o jogador volta ao lobby
      m.detach(i);
      s.matchId = null;
      this.#setStatus(s, 'lobby');
    })));
    on('emote', as((s, d) => this.#inMatch(s, (m, i) => { if (cosmetics.canEmote(s.player, d.id)) m.emote(i, d.id); })));
    socket.on('disconnect', () => { clearInterval(refill); this.#disconnect(socket); });
  }

  #withPlayer(socket, fn) {
    const s = this.sessions.get(socket.id);
    if (!s) return socket.emit('error_msg', { message: 'Conecte-se primeiro.' });
    return fn(s);
  }

  #inMatch(s, fn) {
    const m = s.matchId && this.matches.get(s.matchId);
    if (!m) return;
    const i = m.seatOf(s.player.id);
    if (i >= 0) fn(m, i);
  }

  async #hello(socket, { token, nickname }) {
    let player = token ? await this.store.getByToken(token) : null;
    let newToken = null;
    if (!player) ({ player, token: newToken } = await this.store.create(nickname));

    // já conectado em outra aba: derruba a sessão antiga
    const oldSid = this.online.get(player.id);
    const old = oldSid && this.sessions.get(oldSid);
    if (old && oldSid !== socket.id) {
      old.socket.emit('error_msg', { message: 'Sua conta foi aberta em outra aba.' });
      this.#disconnect(old.socket);
      old.socket.disconnect(true);
    }

    // voltando para uma partida em andamento? usa o mesmo objeto da partida (troféus certos)
    const match = [...this.matches.values()].find(m => !m.over && m.seatOf(player.id) >= 0);
    if (match) player = match.seats[match.seatOf(player.id)].player;

    missions.ensureMissions(player, this.#today);
    const seasonReward = seasons.settlePlayer(player, seasons.seasonId(new Date(this.now())));
    await this.store.save(player);

    const s = { socket, player, status: 'lobby', matchId: null, watching: null, room: null };
    this.sessions.set(socket.id, s);
    this.online.set(player.id, socket.id);
    socket.emit('welcome', { token: newToken, profile: this.#profile(player), catalog: this.#catalog() });
    if (seasonReward) socket.emit('season_reward', seasonReward);

    if (match) {
      s.status = 'match';
      s.matchId = match.id;
      match.reconnect(match.seatOf(player.id), socket.id);
    }
    this.#broadcastLobby();
  }

  #disconnect(socket) {
    const s = this.sessions.get(socket.id);
    if (!s) return;
    this.sessions.delete(socket.id);
    if (this.online.get(s.player.id) === socket.id) this.online.delete(s.player.id);
    this.matchmaker.leave(s);
    this.#roomLeave(s);
    this.tournament.leave(s.player.id);
    this.king.leave(s.player.id);
    this.#stopWatching(s);
    for (const [k, c] of this.challenges) if (c.from === s.player.id || c.to === s.player.id) { clearTimeout(c.timer); this.challenges.delete(k); }
    const match = s.matchId && this.matches.get(s.matchId);
    if (match && !match.over) match.disconnect(match.seatOf(s.player.id));
    this.#broadcastLobby();
  }

  #session(playerId) {
    const sid = this.online.get(playerId);
    return sid ? this.sessions.get(sid) : null;
  }

  // ═══════════════════════ perfil ═══════════════════════
  #catalog() {
    return {
      cards: CARDS, deck: DECK, characters: CHARACTERS, leagues: LEAGUES, rules: this.rules,
      cosmetics: { frames: cosmetics.FRAMES, emotes: cosmetics.EMOTES },
      raid: { bosses: RAID.bosses, reward: RAID.rewardEcto },
      tournament: { prizes: PRIZES },
    };
  }

  #profile(p) {
    return {
      id: p.id, nickname: p.nickname, trophies: p.trophies, best: p.best, wins: p.wins, losses: p.losses,
      character: p.character, league: leagueOf(p.trophies),
      unlocked: { cards: unlockedCards(p.best), characters: unlockedCharacters(p.best) },
      deck: deckOf(p), deckCustom: !!p.deck,
      ecto: p.ecto ?? 0, cups: p.cups ?? 0,
      cosmetics: [...new Set([...cosmetics.FREE, ...(p.cosmetics ?? [])])],
      equipped: p.equipped ?? { frame: null },
      avatar: p.avatar ?? cosmetics.DEFAULT_AVATAR,
      missions: missions.missionsView(p),
      season: { ...seasons.seasonInfo(new Date(this.now())), best: p.seasonBest ?? 0 },
    };
  }

  async #saveAndSync(s) {
    await this.store.save(s.player);
    s.socket.emit('profile', this.#profile(s.player));
    this.#broadcastLobby();
  }

  /** Resultado de uma ação { ok, reason }: salva ou avisa o erro. */
  #apply(s, result) {
    if (!result.ok) return s.socket.emit('error_msg', { message: result.reason });
    return this.#saveAndSync(s);
  }

  #selectCharacter(s, id) {
    if (!unlockedCharacters(s.player.best).includes(id)) return s.socket.emit('error_msg', { message: 'Personagem bloqueado.' });
    s.player.character = id;
    return this.#saveAndSync(s);
  }

  /** Deck montado (lista vazia volta ao deck automático). */
  #setDeck(s, cards) {
    if (Array.isArray(cards) && cards.length === 0) { s.player.deck = null; return this.#saveAndSync(s); }
    const check = validateDeck(cards, s.player.best);
    if (!check.ok) return s.socket.emit('error_msg', { message: check.reason });
    s.player.deck = [...cards];
    return this.#saveAndSync(s);
  }

  #claimMission(s, id) {
    missions.ensureMissions(s.player, this.#today);
    return this.#apply(s, missions.claim(s.player, id));
  }

  /** Muda um jogador onde ele estiver: na sessão (se online) ou direto no banco. */
  async #updatePlayer(playerId, fn) {
    const s = this.#session(playerId);
    const p = s?.player ?? await this.store.getById(playerId);
    if (!p) return;
    fn(p);
    await this.store.save(p);
    s?.socket.emit('profile', this.#profile(p));
  }

  /** Progresso de missão vindo de fora das partidas (Desafio do Dia). */
  track(playerId, event, data) {
    return this.#updatePlayer(playerId, (p) => { missions.ensureMissions(p, this.#today); missions.track(p, event, data); });
  }

  async #ranking(s) {
    const top = await this.store.top(50);
    s.socket.emit('ranking', {
      top: top.map((p, i) => ({
        rank: i + 1, id: p.id, nickname: p.nickname, trophies: p.trophies, wins: p.wins, character: p.character,
        league: leagueOf(p.trophies), ...cosmetics.publicLook(p),
      })),
      me: { rank: await this.store.rankOf(s.player), trophies: s.player.trophies },
      total: await this.store.count(),
    });
  }

  /** Virada de temporada: corta troféus no banco e em quem está online, e entrega as recompensas. */
  async #rollSeason() {
    if (!(await seasons.rollSeason(this.store, new Date(this.now())))) return;
    const current = seasons.seasonId(new Date(this.now()));
    for (const s of this.sessions.values()) {
      const p = s.player;
      if (p.trophies > seasons.RESET_THRESHOLD) p.trophies = seasons.RESET_THRESHOLD + Math.floor((p.trophies - seasons.RESET_THRESHOLD) / 2);
      const reward = seasons.settlePlayer(p, current);
      await this.#saveAndSync(s);
      if (reward) s.socket.emit('season_reward', reward);
    }
  }

  // ═══════════════════════ lobby ═══════════════════════
  #lobbyState() {
    const online = [...this.sessions.values()].map(s => ({
      id: s.player.id, nickname: s.player.nickname, trophies: s.player.trophies, character: s.player.character,
      league: leagueOf(s.player.trophies), ...cosmetics.publicLook(s.player), status: s.status,
    }));
    online.sort((a, b) => b.trophies - a.trophies);
    return {
      online: online.slice(0, 100), count: online.length, matches: this.matches.size,
      queues: { ranked: this.matchmaker.size('ranked'), casual: this.matchmaker.size('casual'), duo: this.matchmaker.size('duo'), raid: this.matchmaker.size('raid') },
      tournament: { waiting: this.tournament.entrants.length, size: this.tournament.view().size },
      king: this.king.view(),
    };
  }

  #broadcastLobby() {
    if (this.lobbyTimer) return;
    this.lobbyTimer = setTimeout(() => {
      this.lobbyTimer = null;
      this.io.emit('lobby', this.#lobbyState());
    }, 250);
  }

  #setStatus(s, status) {
    s.status = status;
    this.#broadcastLobby();
  }

  // ═══════════════════════ filas ═══════════════════════
  #queueJoin(s, mode) {
    if (s.status !== 'lobby' || !Matchmaker.isMode(mode)) return;
    this.matchmaker.join(s, mode);
    s.socket.emit('queue_state', { searching: true, mode });
    this.#setStatus(s, 'queue');
  }

  #queueLeave(s) {
    if (!this.matchmaker.leave(s)) return;
    s.socket.emit('queue_state', { searching: false });
    this.#setStatus(s, 'lobby');
  }

  // ═══════════════════════ desafios e salas (casuais) ═══════════════════════
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
    this.#play([this.#seat(from), this.#seat(s)], { kind: 'challenge', ranked: false });
  }

  #roomCreate(s) {
    if (s.status !== 'lobby') return;
    let code;
    do code = roomCode(); while (this.rooms.has(code));
    this.rooms.set(code, s.player.id);
    s.room = code;
    s.socket.emit('room_created', { code });
    this.#setStatus(s, 'room');
  }

  #roomJoin(s, rawCode) {
    let code = String(rawCode || '').toUpperCase().trim();
    if (code.length === 4) code = `JGH-${code}`;
    const ownerId = this.rooms.get(code);
    const owner = ownerId && this.#session(ownerId);
    if (!owner) return s.socket.emit('error_msg', { message: 'Sala não encontrada.' });
    if (owner === s || s.status !== 'lobby') return;
    this.#roomLeave(owner);
    this.#play([this.#seat(owner), this.#seat(s)], { kind: 'room', ranked: false });
  }

  #roomLeave(s) {
    if (!s.room) return;
    this.rooms.delete(s.room);
    s.room = null;
    if (s.status === 'room') this.#setStatus(s, 'lobby');
  }

  // ═══════════════════════ espectadores ═══════════════════════
  #spectate(s, playerId) {
    if (s.status !== 'lobby') return;
    const match = [...this.matches.values()].find(m => !m.over && m.seatOf(playerId) >= 0);
    if (!match) return s.socket.emit('error_msg', { message: 'Essa partida já acabou.' });
    this.#watch(s, match);
    this.#setStatus(s, 'watching');
  }

  #watch(s, match) {
    this.#stopWatching(s);
    s.watching = match.id;
    match.addSpectator(s.socket);
  }

  #stopWatching(s) {
    const m = s.watching && this.matches.get(s.watching);
    if (m) m.removeSpectator(s.socket);
    s.watching = null;
    if (s.status === 'watching') this.#setStatus(s, 'lobby');
  }

  // ═══════════════════════ partidas ═══════════════════════
  /** Assento de um adversário automático da ranqueada, com a dificuldade certa para `player`. */
  #botSeat(player) {
    const persona = createBotPersona(player, this.rng);
    const brain = new BotBrain({
      skill: this.bots.skill(player), style: persona.style, chooseMove: this.shared.chooseMove,
      rules: this.rules.rankedBot, rng: this.rng,
    });
    return { player: persona, socketId: null, brain };
  }

  /** Assento de um jogador: o objeto da sessão (se online) e o socket. */
  #seat(sOrPlayer) {
    if (sOrPlayer.socket) return { player: sOrPlayer.player, socketId: sOrPlayer.socket.id };
    const p = sOrPlayer;
    const s = this.#session(p.id);
    return { player: s?.player ?? p, socketId: s?.socket.id ?? null };
  }

  /**
   * Começa um duelo (1x1: 2 assentos, 2x2: 4). Retorna { match, done } — `done` resolve
   * com { winnerSide } quando acabar. `returnTo`: status de quem jogou depois do fim.
   */
  #play(seats, { kind, ranked = false, returnTo = 'lobby' }) {
    let resolveDone;
    const done = new Promise(r => { resolveDone = r; });
    const match = new DuelMatch({
      io: this.io, rules: this.rules, now: this.now, rng: this.rng,
      kind, ranked, seats, stage: STAGES[Math.floor(this.rng() * STAGES.length)],
      partnerCarries: kind === 'duo',
      onRound: (m, r) => this.#onDuelRound(m, r),
      onEnd: async (m, result) => {
        const personal = await this.#onDuelEnd(m, result, returnTo);
        resolveDone(result);
        return personal;
      },
    });
    this.#begin(match);
    return { match, done };
  }

  #startRaid(seats) {
    const bossId = RAID.bosses[Math.floor(this.rng() * RAID.bosses.length)];
    const match = new RaidMatch({
      io: this.io, rules: this.rules, now: this.now, rng: this.rng, shared: this.shared,
      kind: 'raid', seats, bossId, stage: BOSS_STAGES[bossId],
      onEnd: (m, result) => this.#onRaidEnd(m, result),
    });
    this.#begin(match);
  }

  /** Registra a partida, põe os jogadores dentro e começa. */
  #begin(match) {
    this.matches.set(match.id, match);
    for (const seat of match.humans) {
      const s = this.#session(seat.player.id);
      if (!s) continue;
      this.matchmaker.leave(s);
      this.#roomLeave(s);
      this.#stopWatching(s);
      s.status = 'match';
      s.matchId = match.id;
    }
    match.start();
    // jogador sem conexão (ex.: saiu entre as rodadas do torneio): a carência começa já
    match.seats.forEach((seat, i) => { if (!seat.brain && !seat.socketId) match.disconnect(i); });
    this.#broadcastLobby();
  }

  /** Missões que andam a cada rodada: rodadas vencidas por arma, empates e cartas usadas. */
  #onDuelRound(match, r) {
    match.seats.forEach((seat, i) => {
      if (seat.brain) return;
      const p = seat.player;
      missions.ensureMissions(p, this.#today);
      const lane = r.lanes.find(l => l.a === i || l.b === i);
      const mine = lane.a === i ? 'a' : 'b';
      if (lane.outcome === mine) missions.track(p, 'round_win', { weapon: r.fighters[i].weapon });
      if (lane.outcome === 'draw') missions.track(p, 'draw');
      if (r.fighters[i].card) missions.track(p, 'card');
    });
  }

  async #onDuelEnd(match, { winnerSide }, returnTo) {
    const sideOf = (i) => match.duel.fighters[i].side;
    let ranked = false;
    let results = [];
    if (match.ranked) {
      const [w, l] = [0, 1].map(k => match.seats.find((_, i) => (sideOf(i) === winnerSide) === (k === 0)).player);
      // contra bot o limite de "farm" do par não se aplica (o bot é outro a cada partida; bots/policy.js limita)
      ranked = w.isBot || l.isBot ? true : this.farm.allow(w.id, l.id, this.now());
      results = applyResult(w, l, { ranked });
    }
    const personal = [];
    for (const [i, seat] of match.seats.entries()) {
      if (seat.brain) { personal.push({}); continue; }
      const p = seat.player;
      const won = sideOf(i) === winnerSide;
      if (match.ranked) this.bots.record(p.id, won);
      missions.ensureMissions(p, this.#today);
      missions.track(p, 'match');
      if (won) missions.track(p, 'win');
      if (match.kind === 'duo') missions.track(p, 'duo');
      await this.store.save(p);
      const res = results.find(x => x.id === p.id);
      personal.push({
        won, ranked,
        trophies: res ? { before: res.before, after: res.after, delta: res.delta } : null,
        unlocked: res?.unlocked ?? { cards: [], characters: [] },
        profile: this.#profile(p),
      });
    }
    this.#release(match, returnTo);
    return personal;
  }

  async #onRaidEnd(match, { won }) {
    const personal = [];
    for (const seat of match.seats) {
      const p = seat.player;
      missions.ensureMissions(p, this.#today);
      missions.track(p, 'match');
      if (won) { p.ecto = (p.ecto ?? 0) + RAID.rewardEcto; missions.track(p, 'raid_win'); }
      await this.store.save(p);
      personal.push({ won, ecto: won ? RAID.rewardEcto : 0, profile: this.#profile(p) });
    }
    this.#release(match, 'lobby');
    return personal;
  }

  /** Fim da partida: tira dos registros e devolve os jogadores ao lugar certo. */
  #release(match, returnTo) {
    this.matches.delete(match.id);
    for (const seat of match.humans) {
      const s = this.#session(seat.player.id);
      if (s && s.matchId === match.id) { s.matchId = null; s.status = returnTo; }
    }
    this.#broadcastLobby();
  }

  // ═══════════════════════ torneio ═══════════════════════
  #newTournament() {
    return new Tournament({
      now: this.now, rng: this.rng, fillAfterMs: this.tournamentFillMs,
      play: async (a, b) => {
        const seats = [this.#seat(a), this.#seat(b)];
        const { winnerSide } = await this.#play(seats, { kind: 'tournament', returnTo: 'tournament' }).done;
        return seats[winnerSide].player.id;
      },
      broadcast: (t) => this.#broadcastTournament(t),
      onFinish: (t, placements) => this.#finishTournament(t, placements),
    });
  }

  #tournamentJoin(s) {
    if (s.status !== 'lobby') return;
    if (!this.tournament.join(s.player)) return s.socket.emit('error_msg', { message: 'Não deu para entrar no torneio.' });
    this.#setStatus(s, 'tournament');
  }

  #tournamentLeave(s) {
    if (s.status !== 'tournament') return;
    this.tournament.leave(s.player.id);
    this.#setStatus(s, 'lobby');
  }

  #broadcastTournament(t) {
    const view = t.view();
    for (const p of t.entrants) this.#session(p.id)?.socket.emit('tournament_state', view);
    this.#broadcastLobby();
  }

  async #finishTournament(t, placements) {
    this.runningTournaments.delete(t);
    if (!placements) return;
    await this.#updatePlayer(placements.champion, (p) => { p.ecto += PRIZES.champion; p.cups = (p.cups ?? 0) + 1; });
    await this.#updatePlayer(placements.finalist, (p) => { p.ecto += PRIZES.finalist; });
    for (const id of placements.semifinal) await this.#updatePlayer(id, (p) => { p.ecto += PRIZES.semifinal; });
    for (const p of t.entrants) {
      const s = this.#session(p.id);
      if (s?.status === 'tournament') this.#setStatus(s, 'lobby');
    }
  }

  // ═══════════════════════ Rei da Arena ═══════════════════════
  #kingJoin(s) {
    if (s.status !== 'lobby' || !this.king.join(s.player)) return;
    this.#setStatus(s, 'king');
    const m = this.king.matchId && this.matches.get(this.king.matchId);
    if (m) this.#watch(s, m);
  }

  #kingLeave(s) {
    if (s.status !== 'king') return;
    this.king.leave(s.player.id);
    this.#stopWatching(s);
    this.#setStatus(s, 'lobby');
  }

  async #playKing(king, challenger, onStart) {
    const seats = [this.#seat(king), this.#seat(challenger)];
    const { match, done } = this.#play(seats, { kind: 'king', returnTo: 'king' });
    onStart(match);
    // quem está na fila assiste
    for (const p of this.king.members) {
      const s = this.#session(p.id);
      if (s && s.status === 'king') this.#watch(s, match);
    }
    const { winnerSide } = await done;
    return { winner: seats[winnerSide].player.id, match };
  }

  #broadcastKing(k) {
    const view = k.view();
    for (const p of k.members) this.#session(p.id)?.socket.emit('king_state', view);
    this.#broadcastLobby();
  }
}

module.exports = { Hub, STAGES };
