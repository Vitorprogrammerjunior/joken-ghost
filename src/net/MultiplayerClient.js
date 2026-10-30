// Conexão com o servidor: Socket.io (server/src/hub.js), login (server/src/auth) e HTTP. Só protocolo, sem tela.
import { serverUrl } from '../config/multiplayer.js';
import { EventBus } from '../core/EventBus.js';

const TOKEN_KEY = 'jokenghost_mp_token';
const NICK_KEY = 'jokenghost_mp_nick';
const ACCOUNT_KEY = 'jokenghost_account'; // { id, nickname, providers } da última vez que o servidor respondeu
const WAKE_LIMIT_MS = 120000; // o plano grátis do Render dorme e leva ~1 min para acordar

const SERVER_EVENTS = [
  'welcome', 'profile', 'lobby', 'ranking', 'queue_state', 'season_reward',
  'challenge_received', 'challenge_sent', 'challenge_declined', 'room_created',
  'tournament_state', 'king_state',
  'match_start', 'match_resume', 'ban_phase', 'ban_locked', 'bans', 'round_intro', 'card_phase', 'cards_reveal', 'weapon_phase', 'card_locked', 'weapon_locked',
  'seat_ready', 'vision', 'seat_status', 'spectators', 'emote', 'round_result',
  'raid_phase', 'raid_result', 'match_end', 'error_msg',
];

export class MultiplayerClient extends EventBus {
  constructor(storage) {
    super();
    this.storage = storage;
    this.socket = null;
    this.profile = null;
    this.catalog = null;
    this.lobby = { online: [], count: 0, queues: {}, tournament: { waiting: 0, size: 8 }, king: null };
    this.tournament = null; // último estado do torneio em que estou
    this.king = null;       // último estado do Rei da Arena (se estou nele)
  }

  get connected() { return !!this.socket?.connected && !!this.profile; }

  /**
   * Acorda o servidor (se estiver dormindo) chamando /health até ele responder.
   * Emite 'waking' com os segundos de espera para a tela mostrar o progresso.
   */
  async wake() {
    const start = performance.now();
    for (let attempt = 0; performance.now() - start < WAKE_LIMIT_MS; attempt++) {
      try {
        const res = await fetch(`${serverUrl()}/health`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (res.ok) return;
      } catch { /* ainda acordando */ }
      if (attempt === 0) this.emit('waking', { seconds: 0 });
      await new Promise(r => setTimeout(r, 3000));
      this.emit('waking', { seconds: Math.round((performance.now() - start) / 1000) });
    }
    throw new Error('Servidor não respondeu');
  }

  /** Conecta e se identifica (cria conta anônima na primeira vez). */
  async connect(nickname) {
    if (this.connected) return this.profile;
    if (typeof window.io !== 'function') throw new Error('Socket.io não carregou');
    await this.wake();
    return new Promise((resolve, reject) => {
      this.socket?.close();
      const s = window.io(serverUrl(), { transports: ['websocket', 'polling'], reconnection: true, timeout: 8000 });
      this.socket = s;
      for (const ev of SERVER_EVENTS) s.on(ev, (data) => this.#receive(ev, data ?? {}));
      s.on('connect', () => s.emit('hello', { token: this.storage.getItem(TOKEN_KEY), nickname }));
      s.on('disconnect', () => this.emit('disconnected'));
      const fail = (err) => { if (!this.profile) reject(err); };
      s.once('connect_error', fail);
      this.once('welcome', () => resolve(this.profile));
    });
  }

  once(ev, fn) {
    const off = this.on(ev, (d) => { off(); fn(d); });
    return off;
  }

  #receive(ev, data) {
    if (ev === 'welcome') {
      // o código guardado não vale mais (saiu ou apagou a conta em outro aparelho): virou convidado novo
      if (data.tokenRejected && this.loggedIn) this.emit('logged_out', { reason: 'session' });
      if (data.token) this.storage.setItem(TOKEN_KEY, data.token);
      this.profile = data.profile;
      this.catalog = data.catalog;
      if (data.account) this.#setAccount({ ...data.account, nickname: data.profile.nickname });
    }
    if (ev === 'profile') {
      this.profile = data;
      if (this.account && this.account.nickname !== data.nickname) this.#setAccount({ ...this.account, nickname: data.nickname });
    }
    if (ev === 'match_end' && data.profile) this.profile = data.profile;
    if (ev === 'lobby') this.lobby = data;
    if (ev === 'tournament_state') this.tournament = data;
    if (ev === 'king_state') this.king = data;
    this.emit(ev, data);
  }

  /** Código da conta (para usar em outro aparelho). */
  get accountCode() { return this.storage.getItem(TOKEN_KEY) ?? ''; }
  get nickname() { return this.storage.getItem(NICK_KEY) ?? ''; }
  rememberNickname(nick) { this.storage.setItem(NICK_KEY, nick); }

  // ─── conta (login com Google/Discord) ─────────────────────────
  /** @returns {{ id: string, nickname: string, providers: string[] } | null} */
  get account() {
    try { return JSON.parse(this.storage.getItem(ACCOUNT_KEY)); } catch { return null; }
  }

  /** Entrou com Google ou Discord (convidado não tem login). */
  get loggedIn() { return !!this.account?.providers?.length; }

  #setAccount(account) {
    if (account) this.storage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    else this.storage.removeItem(ACCOUNT_KEY);
    this.emit('account', account);
  }

  /** Logins ligados no servidor: [{ id, name }]. */
  async loginProviders() {
    this.providers ??= this.#http('/api/auth/providers').then(r => r.providers).catch((err) => { this.providers = null; throw err; });
    return this.providers;
  }

  /** Vai para a tela do Google/Discord. O código de convidado vai junto (no corpo) para ligar o progresso. */
  async login(provider) {
    const { url } = await this.#http('/api/auth/intent', {
      provider, token: this.accountCode || undefined, nickname: this.nickname,
      returnTo: location.href.split('#')[0],
    });
    location.assign(url);
  }

  /**
   * Volta do login: o servidor manda um código de uso único em #auth=... (ou #auth_error=...).
   * @returns {Promise<null | { error: string } | { outcome: string, account: object }>}
   */
  async finishLogin() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const code = hash.get('auth');
    const error = hash.get('auth_error');
    if (!code && !error) return null;
    history.replaceState(null, '', location.pathname + location.search);
    if (error) return { error };
    const r = await this.#http('/api/auth/finish', { code });
    this.storage.setItem(TOKEN_KEY, r.token);
    this.#setAccount(r.account);
    return r;
  }

  /** Confere a conta no servidor (o login pode ter sido desfeito em outro aparelho). */
  async refreshAccount() {
    if (!this.accountCode) return null;
    try {
      const { account } = await this.#http('/api/auth/me', { token: this.accountCode });
      if (this.loggedIn && !account.providers.length) this.emit('logged_out', { reason: 'session' });
      this.#setAccount(account);
      return account;
    } catch (err) {
      if (err.status === 401 && this.loggedIn) {
        this.storage.removeItem(TOKEN_KEY);
        this.#setAccount(null);
        this.emit('logged_out', { reason: 'session' });
      }
      throw err;
    }
  }

  /** Sai da conta neste aparelho (os outros continuam conectados). */
  async logout() {
    const token = this.accountCode;
    if (token) await this.#http('/api/auth/logout', { token }).catch(() => {});
    this.forgetAccount();
  }

  /** Apaga a conta e tudo dela no servidor. */
  async deleteAccount() {
    // desconecta antes: o aviso "Conta apagada" do servidor é para os outros aparelhos
    this.socket?.close();
    await this.#http('/api/auth/delete', { token: this.accountCode });
    this.forgetAccount();
  }

  /** Esquece a conta neste aparelho: a próxima conexão começa um convidado novo. */
  forgetAccount() {
    this.storage.removeItem(TOKEN_KEY);
    this.#setAccount(null);
    this.profile = null;
    this.socket?.close();
    this.socket = null;
  }

  // ─── campanha na nuvem (server/src/saves.js) ──────────────────
  listCloudSaves() { return this.#http('/api/saves', { token: this.accountCode }); }

  /** keepalive: o envio termina mesmo se a aba estiver fechando. */
  putCloudSaves(saves, { keepalive = false } = {}) {
    return this.#http('/api/saves/put', { token: this.accountCode, saves }, { keepalive });
  }

  // ─── HTTP (ranking do Desafio do Dia) ─────────────────────────
  async #http(path, body = null, { keepalive = false } = {}) {
    const res = await fetch(`${serverUrl()}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      keepalive,
      signal: keepalive ? undefined : AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error ?? 'O servidor não respondeu.'), { status: res.status });
    return data;
  }

  /** Top 20 do dia. */
  getDaily(day) { return this.#http(`/api/daily?day=${encodeURIComponent(day)}`); }

  /** Minha posição no dia (null se não tenho conta). */
  async getMyDaily(day) {
    return this.accountCode ? this.#http('/api/daily/me', { token: this.accountCode, day }) : null;
  }

  /** Envia as jogadas da corrida; na primeira vez o servidor cria a conta e devolve o código. */
  async submitDaily({ day, actions }) {
    const r = await this.#http('/api/daily', { token: this.accountCode || undefined, nickname: this.nickname, day, actions });
    if (r.token) this.storage.setItem(TOKEN_KEY, r.token);
    return r;
  }
  useAccountCode(code) {
    this.storage.setItem(TOKEN_KEY, code.trim());
    this.profile = null;
    this.socket?.close();
  }

  setNickname(nickname) { this.socket.emit('set_nickname', { nickname }); }
  selectCharacter(id) { this.socket.emit('select_character', { id }); }
  setDeck(cards) { this.socket.emit('set_deck', { cards }); }
  /** Salva a build no slot (0..buildSlots-1) e passa a usar ela. */
  saveBuild(slot, { name, character, cards }) { this.socket.emit('save_build', { slot, name, character, cards }); }
  useBuild(slot) { this.socket.emit('use_build', { slot }); }
  deleteBuild(slot) { this.socket.emit('delete_build', { slot }); }
  banCard(cardId) { this.socket.emit('ban_card', { cardId }); }
  requestRanking() { this.socket.emit('ranking'); }
  claimMission(id) { this.socket.emit('missions_claim', { id }); }
  buy(id) { this.socket.emit('shop_buy', { id }); }
  equipFrame(id) { this.socket.emit('equip_frame', { id }); }
  /** `{ kind: 'hunter', hunter }` ou `{ kind: 'art', art }` (desenho do Ateliê). */
  setAvatar(avatar) { this.socket.emit('set_avatar', avatar); }
  /** mode: 'ranked' | 'casual' | 'duo' | 'raid' */
  queueJoin(mode = 'ranked') { this.socket.emit('queue_join', { mode }); }
  queueLeave() { this.socket.emit('queue_leave'); }
  tournamentJoin() { this.socket.emit('tournament_join'); }
  tournamentLeave() { this.tournament = null; this.socket?.emit('tournament_leave'); }
  kingJoin() { this.socket.emit('king_join'); }
  kingLeave() { this.king = null; this.socket?.emit('king_leave'); }
  spectate(playerId) { this.socket.emit('spectate', { playerId }); }
  stopSpectating() { this.socket?.emit('spectate_leave'); }
  emote(id) { this.socket.emit('emote', { id }); }
  challenge(targetId) { this.socket.emit('challenge', { targetId }); }
  answerChallenge(fromId, accept) { this.socket.emit('challenge_answer', { fromId, accept }); }
  createRoom() { this.socket.emit('room_create'); }
  joinRoom(code) { this.socket.emit('room_join', { code }); }
  leaveRoom() { this.socket?.emit('room_leave'); }
  pickCard(cardId) { this.socket.emit('pick_card', { cardId }); }
  pickWeapon(weapon) { this.socket.emit('pick_weapon', { weapon }); }
  forfeit() { this.socket?.emit('forfeit'); }
}
