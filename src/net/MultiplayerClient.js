// Conexão Socket.io com o servidor (server/src/hub.js). Só protocolo, sem tela.
import { serverUrl } from '../config/multiplayer.js';
import { EventBus } from '../core/EventBus.js';

const TOKEN_KEY = 'jokenghost_mp_token';

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

  /** Conecta e se identifica (cria conta anônima na primeira vez). */
  connect(nickname) {
    if (this.connected) return Promise.resolve(this.profile);
    if (typeof window.io !== 'function') return Promise.reject(new Error('Socket.io não carregou'));
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
