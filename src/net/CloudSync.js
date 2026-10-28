// Campanha na nuvem: mantém os arquivos deste aparelho iguais aos da conta (só com login).
// Quando sincroniza: ao abrir o jogo, ao abrir a escolha de arquivo e alguns segundos depois de cada save.
import { EventBus } from '../core/EventBus.js';
import { mergeSaves } from '../domain/cloudSaves.js';

const UPLOAD_DELAY_MS = 4000; // junta vários saves seguidos (moedas mudam toda hora) num envio só

export class CloudSync extends EventBus {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, net) {
    super();
    this.game = game;
    this.saves = game.saves;
    this.net = net;
    /** @type {'off'|'syncing'|'ok'|'error'} */
    this.state = net.loggedIn ? 'ok' : 'off';
    this.lastSync = null;
    this.dirty = new Set();
    this.timer = null;
    this.running = null;

    game.bus.on('saved', (profile) => this.queue(profile.slot));
    game.bus.on('save-removed', (slot) => this.queue(slot));
    // a aba vai fechar ou sumir: manda o que falta
    const leave = () => { this.flush({ keepalive: true }); };
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
  }

  get enabled() { return this.net.loggedIn; }

  /** Ainda tem save deste aparelho que não chegou na nuvem. */
  get pending() { return this.dirty.size > 0; }

  #set(state) {
    this.state = state;
    if (state === 'ok') this.lastSync = Date.now();
    this.emit('change', this);
  }

  /**
   * Busca os arquivos da conta e junta com os daqui (ver domain/cloudSaves.js).
   * @returns {Promise<boolean>} true se mudou algum arquivo deste aparelho
   */
  sync() {
    if (!this.enabled) return Promise.resolve(false);
    this.running ??= this.#sync().finally(() => { this.running = null; });
    return this.running;
  }

  async #sync() {
    this.#set('syncing');
    try {
      const me = this.net.account.id;
      const owner = this.saves.owner;
      const mode = owner === me ? 'newest' : owner ? 'replace' : 'remote';
      const { saves: remote } = await this.net.listCloudSaves();
      const plan = mergeSaves(this.saves.entries(), remote, { mode, busy: this.game.profile?.slot ?? null });
      for (const s of plan.toLocal) this.saves.restore(s.slot, s.data, s.updatedAt);
      if (plan.toCloud.length) await this.net.putCloudSaves(plan.toCloud);
      this.saves.owner = me;
      for (const s of plan.toCloud) this.dirty.delete(s.slot);
      this.#set('ok');
      return plan.toLocal.length > 0;
    } catch (err) {
      console.warn('Nuvem:', err.message);
      this.#set('error');
      return false;
    }
  }

  /** Um arquivo mudou aqui: vai para a nuvem daqui a pouco. */
  queue(slot) {
    if (!this.enabled) return;
    this.dirty.add(slot);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), UPLOAD_DELAY_MS);
  }

  /** Manda agora os arquivos que mudaram. @returns {Promise<boolean>} true se não ficou nada pendente */
  async flush({ keepalive = false } = {}) {
    clearTimeout(this.timer);
    if (!this.enabled || !this.dirty.size) return true;
    // antes da primeira sincronização os arquivos daqui podem ser de outra conta: não envia
    if (this.saves.owner !== this.net.account.id) return this.sync().then(() => !this.pending);
    const list = this.saves.entries().filter(e => this.dirty.has(e.slot) && e.updatedAt);
    this.dirty.clear();
    if (!list.length) return true;
    if (!keepalive) this.#set('syncing');
    try {
      await this.net.putCloudSaves(list, { keepalive });
      this.#set('ok');
      return true;
    } catch (err) {
      for (const e of list) this.dirty.add(e.slot);
      console.warn('Nuvem:', err.message);
      this.#set('error');
      return false;
    }
  }

  /** Saiu da conta: os arquivos estão na nuvem e saem deste aparelho. */
  forget() {
    clearTimeout(this.timer);
    this.dirty.clear();
    this.saves.clearAll();
    this.#set('off');
  }
}
