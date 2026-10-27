// Janelas de progresso da Arena: modos, missões diárias e loja de Ecto (cosméticos).
import { $, h, icon } from './dom.js';
import { MODES, emoteIcon } from '../config/multiplayer.js';
import { avatarEl } from './Avatar.js';

export class ArenaShop {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   * @param {{ queue: (mode: string) => void, tournament: () => void, king: () => void }} actions  o lobby decide como entrar
   */
  constructor(game, modals, net, actions) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    this.actions = actions;
    net.on('profile', () => {
      if (modals.isOpen('modal-missions')) this.#renderMissions();
      if (modals.isOpen('modal-shop')) this.#renderShop();
    });
    net.on('lobby', () => { if (modals.isOpen('modal-modes')) this.#renderModes(); });
  }

  // ─── modos ────────────────────────────────────────────────────
  openModes() {
    this.#renderModes();
    this.modals.open('modal-modes');
  }

  #renderModes() {
    const { queues = {}, tournament, king } = this.net.lobby;
    const info = {
      duo: `${queues.duo ?? 0} na fila`,
      raid: `${queues.raid ?? 0} na fila · vale ${this.net.catalog.raid.reward} Ecto`,
      tournament: `${tournament?.waiting ?? 0}/${tournament?.size ?? 8} inscritos`,
      king: king?.king ? `Rei: ${king.king.nickname} (${king.king.streak} vitórias)` : 'Trono vazio!',
    };
    const enter = {
      duo: () => this.actions.queue('duo'),
      raid: () => this.actions.queue('raid'),
      tournament: () => this.actions.tournament(),
      king: () => this.actions.king(),
    };
    $('modes-grid').replaceChildren(...Object.keys(enter).map(id => h('div', { class: 'mode-card' },
      icon(MODES[id].icon, 'ico ico-lg'),
      h('b', {}, MODES[id].name),
      h('p', {}, MODES[id].desc),
      h('small', {}, info[id]),
      h('button', { class: 'btn btn-sm btn-primary', onclick: () => { this.modals.close('modal-modes'); enter[id](); } }, 'ENTRAR'))));
  }

  // ─── missões ──────────────────────────────────────────────────
  openMissions() {
    this.#renderMissions();
    this.modals.open('modal-missions');
  }

  #renderMissions() {
    $('mission-list').replaceChildren(...this.net.profile.missions.map(m => {
      const done = m.progress >= m.n;
      return h('li', { class: `mission-row${m.claimed ? ' claimed' : done ? ' done' : ''}` },
        h('div', { class: 'mission-text' }, h('b', {}, m.text),
          h('div', { class: 'mission-bar' }, h('i', { style: { width: `${(m.progress / m.n) * 100}%` } })),
          h('small', {}, `${m.progress}/${m.n}`)),
        h('span', { class: 'mission-reward' }, icon('icon/ecto', 'ico ico-sm'), m.reward),
        m.claimed ? h('span', { class: 'reward-tag' }, 'FEITO')
          : h('button', { class: `btn btn-sm${done ? ' btn-primary' : ''}`, disabled: !done, onclick: () => this.net.claimMission(m.id) }, 'RESGATAR'));
    }));
  }

  // ─── loja ─────────────────────────────────────────────────────
  openShop() {
    this.#renderShop();
    this.modals.open('modal-shop');
  }

  #renderShop() {
    const p = this.net.profile;
    const { frames, emotes } = this.net.catalog.cosmetics;
    $('shop-sub').replaceChildren('Seu Ecto: ', icon('icon/ecto', 'ico ico-sm'), h('b', {}, p.ecto), ' · ganhe em missões, torneios, no Rei da Arena e no fim de cada temporada.');
    // a moldura aparece em volta do seu avatar: dá para ver como fica antes de comprar
    $('shop-frames').replaceChildren(...frames.map(f => this.#item(f, avatarEl(this.game.assets, { avatar: p.avatar, frame: f.id }, { size: 72 }), {
      equipped: p.equipped.frame === f.id,
      onUse: () => this.net.equipFrame(p.equipped.frame === f.id ? null : f.id),
    })));
    $('shop-emotes').replaceChildren(...emotes.map(e => this.#item(e, icon(emoteIcon(e.id), 'ico ico-lg'), {})));
  }

  #item(item, preview, { equipped = false, onUse = null }) {
    const p = this.net.profile;
    const owned = p.cosmetics.includes(item.id);
    let action;
    if (owned && onUse) action = h('button', { class: `btn btn-sm${equipped ? '' : ' btn-primary'}`, onclick: onUse }, equipped ? 'TIRAR' : 'USAR');
    else if (owned) action = h('span', { class: 'reward-tag' }, 'É SUA');
    else if (item.price == null) action = h('span', { class: 'shop-season' }, 'Só por temporada');
    else action = h('button', { class: 'btn btn-sm', disabled: p.ecto < item.price, onclick: () => this.net.buy(item.id) }, icon('icon/ecto', 'ico ico-xs'), item.price);
    return h('div', { class: `shop-item${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}` }, preview, h('b', {}, item.name), action);
  }
}
