// Conexão Socket.io com o servidor (server/index.js). Só protocolo, sem tela.
import { serverUrl } from '../config/multiplayer.js';
import { EventBus } from '../core/EventBus.js';

const SERVER_EVENTS = [
  'room_created', 'room_joined', 'player_joined', 'match_start', 'perk_phase', 'attack_phase',
  'perk_confirmed', 'opponent_perk_locked', 'attack_confirmed', 'opponent_attack_locked',
  'round_result', 'match_end', 'player_left', 'error_msg',
];

export class MultiplayerClient extends EventBus {
  constructor() {
    super();
    this.socket = null;
  }

  get connected() { return !!this.socket?.connected; }

  connect() {
    if (this.connected) return Promise.resolve();
    if (typeof window.io !== 'function') return Promise.reject(new Error('Socket.io não carregou'));
    return new Promise((resolve, reject) => {
      this.socket?.close();
      this.socket = window.io(serverUrl(), { transports: ['websocket', 'polling'], reconnection: true, timeout: 8000 });
      for (const ev of SERVER_EVENTS) this.socket.on(ev, (data) => this.emit(ev, data ?? {}));
      this.socket.on('disconnect', () => this.emit('disconnected'));
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (err) => reject(err));
    });
  }

  createRoom(nickname) { this.socket.emit('create_room', { nickname }); }
  joinRoom(code, nickname) { this.socket.emit('join_room', { code, nickname }); }
  pickPerk(perkId) { this.socket?.emit('pick_perk', { perkId }); }
  pickAttack(choice) { this.socket?.emit('pick_attack', { choice }); }
  leave() { this.socket?.emit('leave_room'); }
}
