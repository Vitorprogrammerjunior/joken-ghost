// Conexão Socket.io com o servidor (server/src/hub.js). Só protocolo, sem tela.
import { serverUrl } from '../config/multiplayer.js';
import { EventBus } from '../core/EventBus.js';

const TOKEN_KEY = 'jokenghost_mp_token';
const WAKE_LIMIT_MS = 120000; // o plano grátis do Render dorme e leva ~1 min para acordar

const SERVER_EVENTS = [
  'welcome', 'profile', 'lobby', 'ranking', 'queue_state',
  'challenge_received', 'challenge_sent', 'challenge_declined',
  'room_created', 'match_start', 'match_resume', 'card_phase', 'weapon_phase',
  'card_locked', 'weapon_locked', 'opponent_ready', 'opponent_weapon', 'opponent_status',
  'round_result', 'match_end', 'error_msg',
];

export class MultiplayerClient extends EventBus {
  constructor(storage) {
    super();
    this.storage = storage;
    this.socket = null;
    this.profile = null;
    this.catalog = null;
    this.lobby = { online: [], count: 0 };
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
      if (data.token) this.storage.setItem(TOKEN_KEY, data.token);
      this.profile = data.profile;
      this.catalog = data.catalog;
    }
    if (ev === 'profile') this.profile = data;
    if (ev === 'match_end') this.profile = data.profile;
    if (ev === 'lobby') this.lobby = data;
    this.emit(ev, data);
  }

  /** Código da conta (para usar em outro aparelho). */
  get accountCode() { return this.storage.getItem(TOKEN_KEY) ?? ''; }
  useAccountCode(code) {
    this.storage.setItem(TOKEN_KEY, code.trim());
    this.profile = null;
    this.socket?.close();
  }

  setNickname(nickname) { this.socket.emit('set_nickname', { nickname }); }
  selectCharacter(id) { this.socket.emit('select_character', { id }); }
  requestRanking() { this.socket.emit('ranking'); }
  queueJoin() { this.socket.emit('queue_join'); }
  queueLeave() { this.socket.emit('queue_leave'); }
  challenge(targetId) { this.socket.emit('challenge', { targetId }); }
  answerChallenge(fromId, accept) { this.socket.emit('challenge_answer', { fromId, accept }); }
  createRoom() { this.socket.emit('room_create'); }
  joinRoom(code) { this.socket.emit('room_join', { code }); }
  leaveRoom() { this.socket?.emit('room_leave'); }
  pickCard(cardId) { this.socket.emit('pick_card', { cardId }); }
  pickWeapon(weapon) { this.socket.emit('pick_weapon', { weapon }); }
  forfeit() { this.socket?.emit('forfeit'); }
}
