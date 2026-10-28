// Janela da conta: entrar com Google/Discord (o progresso de convidado vai junto),
// ver a campanha na nuvem, ligar o outro login, sair e apagar a conta.
import { $, h, icon } from './dom.js';

const PROVIDER_CLASS = { google: 'btn-google', discord: 'btn-discord', dev: '' };

/** "há 3 min" a partir de um horário em ms. */
function ago(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'agora mesmo';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  return `há ${Math.round(s / 3600)} h`;
}

export class AccountModal {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   * @param {import('../net/CloudSync.js').CloudSync} cloud
   */
  constructor(game, modals, net, cloud) {
    Object.assign(this, { game, modals, net, cloud });
    this.body = $('account-body');
    this.providers = null;      // [{ id, name }] ou null enquanto carrega
    this.providersError = false;
    this.busy = null;           // texto enquanto abre o login

    const refresh = () => { if (modals.isOpen('modal-account')) this.render(); };
    net.on('account', refresh);
    cloud.on('change', refresh);
    game.bus.on('open-account', () => this.open());
  }

  get loggedIn() { return this.net.loggedIn; }

  open() {
    this.busy = null;
    this.render();
    this.modals.open('modal-account');
    this.#loadProviders();
    if (this.net.loggedIn && this.cloud.state !== 'syncing') this.cloud.sync();
  }

  async #loadProviders() {
    if (this.providers) return;
    this.providersError = false;
    try {
      await this.net.wake();
      this.providers = await this.net.loginProviders();
    } catch {
      this.providersError = true;
    }
    if (this.modals.isOpen('modal-account')) this.render();
  }

  render() {
    this.body.replaceChildren(...(this.net.loggedIn ? this.#account() : this.#guest()).filter(Boolean));
  }

  // ─── convidado ────────────────────────────────────────────────
  #guest() {
    return [
      h('div', { class: 'account-status' },
        icon('icon/conta', 'ico ico-lg'),
        h('div', {},
          h('b', {}, 'VOCÊ ESTÁ COMO CONVIDADO'),
          h('p', {}, 'Seu progresso fica só neste aparelho.'))),
      h('ul', { class: 'account-perks' },
        h('li', {}, icon('icon/trofeu', 'ico ico-sm'), 'Troféus, Ecto, deck e avatar na sua conta'),
        h('li', {}, icon('icon/nuvem', 'ico ico-sm'), 'Campanha salva na nuvem'),
        h('li', {}, icon('icon/duelo', 'ico ico-sm'), 'Jogue em qualquer aparelho, sem criar outra conta')),
      h('p', { class: 'account-note' }, 'O que você já conquistou como convidado vai junto para a conta.'),
      this.#loginButtons(this.providers ?? [], 'ENTRAR COM'),
    ];
  }

  /** Botões de login (os que ainda não estão ligados). */
  #loginButtons(list, verb) {
    if (this.busy) return h('p', { class: 'account-note' }, this.busy);
    if (this.providersError) {
      return h('div', { class: 'account-actions' },
        h('p', { class: 'account-note' }, 'Não consegui falar com o servidor.'),
        h('button', { class: 'btn btn-sm', onclick: () => { this.providers = null; this.render(); this.#loadProviders(); } }, 'TENTAR DE NOVO'));
    }
    if (!this.providers) return h('p', { class: 'account-note' }, 'Carregando...');
    if (!this.providers.length) return h('p', { class: 'account-note' }, 'O login ainda não está disponível. Volte em breve!');
    if (!list.length) return null;
    return h('div', { class: 'account-actions' }, ...list.map(p => h('button', {
      class: `btn ${PROVIDER_CLASS[p.id] ?? ''}`,
      onclick: () => this.#login(p),
    }, `${verb} ${p.name.toUpperCase()}`)));
  }

  async #login(provider) {
    // salva a campanha antes de sair da página
    this.game.saveProfile();
    this.busy = `Abrindo o ${provider.name}...`;
    this.render();
    try {
      await this.net.login(provider.id); // a página vai para o Google/Discord e volta logada
    } catch (err) {
      this.busy = null;
      this.render();
      this.game.bus.emit('toast', err.message);
    }
  }

  // ─── logado ───────────────────────────────────────────────────
  #account() {
    const a = this.net.account;
    const names = (this.providers ?? []).filter(p => a.providers.includes(p.id)).map(p => p.name);
    const linked = names.length ? names.join(' e ') : a.providers.join(' e ');
    const missing = (this.providers ?? []).filter(p => !a.providers.includes(p.id) && p.id !== 'dev');
    return [
      h('div', { class: 'account-status' },
        icon('icon/conta', 'ico ico-lg'),
        h('div', {},
          h('b', {}, a.nickname || 'CAÇADOR'),
          h('p', {}, `Conectado com ${linked}`))),
      this.#cloudLine(),
      missing.length ? this.#loginButtons(missing, 'LIGAR') : null,
      h('div', { class: 'account-actions' },
        h('button', { class: 'btn btn-sm', onclick: () => this.#logout() }, 'SAIR DA CONTA'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: () => this.#delete() }, 'APAGAR MINHA CONTA')),
    ];
  }

  #cloudLine() {
    const c = this.cloud;
    const text = {
      syncing: 'Sincronizando a campanha...',
      ok: c.lastSync ? `Campanha salva na nuvem ${ago(c.lastSync)}` : 'Campanha salva na nuvem',
      error: 'Sem conexão com a nuvem agora. Seus arquivos seguem salvos aqui e sobem depois.',
      off: '',
    }[c.state];
    return h('p', { class: `cloud-line ${c.state}` }, icon('icon/nuvem', 'ico ico-sm'), text);
  }

  async #logout() {
    if (!await this.cloud.flush() && !await this.modals.confirm('Algumas mudanças da campanha ainda não chegaram na nuvem. Sair mesmo assim?')) return;
    await this.net.logout();
    this.#leftAccount('Você saiu da conta. Agora está como convidado.');
  }

  async #delete() {
    const sure = await this.modals.confirm('Apagar a conta? Troféus, Ecto, cosméticos, avatar e a campanha na nuvem serão apagados para sempre.');
    if (!sure) return;
    try {
      await this.net.deleteAccount();
      this.#leftAccount('Conta apagada.');
    } catch (err) {
      this.game.bus.emit('toast', err.message);
    }
  }

  /** Saiu (ou apagou): a campanha sai do aparelho e o jogo volta ao menu como convidado. */
  #leftAccount(message) {
    this.cloud.forget();
    this.game.profile = null;
    while (this.modals.top) this.modals.closeTop();
    this.game.bus.emit('toast', message);
    if (this.game.scene !== this.game.scenes.menu) this.game.go('menu');
  }
}
