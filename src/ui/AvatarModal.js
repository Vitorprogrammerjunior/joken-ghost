// "Seu avatar": escolher o rosto (caçadores liberados ou o desenho do Ateliê) e a moldura.
import { $, h, icon } from './dom.js';
import { avatarEl, avatarPicture } from './Avatar.js';
import { frameSprite } from '../config/multiplayer.js';
import { AtelierModal } from './AtelierModal.js';

export class AvatarModal {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    this.atelier = new AtelierModal(game, modals, net);
    net.on('profile', () => { if (modals.isOpen('modal-avatar')) this.#render(); });
  }

  open() {
    this.#render();
    this.modals.open('modal-avatar');
  }

  #render() {
    const p = this.net.profile;
    const { avatar, equipped } = p;
    $('avatar-preview').replaceChildren(avatarEl(this.game.assets, { avatar, frame: equipped.frame }, { size: 168 }));
    $('avatar-hint').textContent = avatar.kind === 'art' ? 'Seu desenho do Ateliê.' : `Rosto: ${this.#hunterName(avatar.hunter)}.`;

    const faces = this.net.catalog.characters.map((c) => {
      const owned = p.unlocked.characters.includes(c.id);
      const current = avatar.kind === 'hunter' && avatar.hunter === c.id;
      return h('button', {
        class: `pick-tile${current ? ' current' : ''}${owned ? '' : ' locked'}`,
        disabled: !owned,
        title: owned ? c.name : `Libere ${c.name} com ${c.trophies} troféus`,
        onclick: () => this.net.setAvatar({ kind: 'hunter', hunter: c.id }),
      }, h('div', { class: 'pick-art' }, avatarPicture(this.game.assets, { kind: 'hunter', hunter: c.id })),
      h('span', {}, owned ? c.name : `${c.trophies}`), owned ? null : icon('icon/cadeado', 'ico ico-xs pick-lock'));
    });
    $('avatar-faces').replaceChildren(...faces);
    $('avatar-drawing').replaceChildren(...this.#drawing(avatar));

    const owned = this.net.catalog.cosmetics.frames.filter(f => p.cosmetics.includes(f.id));
    $('avatar-frames').replaceChildren(
      this.#frameTile(null, 'Nenhuma', equipped.frame == null),
      ...owned.map(f => this.#frameTile(f.id, f.name.replace('Moldura ', ''), equipped.frame === f.id)),
    );
  }

  /** O desenho do Ateliê: usar o que já existe ou abrir o editor. */
  #drawing(avatar) {
    const { art } = avatar;
    const current = avatar.kind === 'art';
    const edit = h('button', { class: 'btn btn-sm btn-primary', onclick: () => this.atelier.open() }, icon('icon/pincel', 'ico ico-xs'), art ? 'EDITAR' : 'DESENHAR');
    if (!art) return [h('p', { class: 'avatar-hint' }, 'Faça o seu próprio avatar em pixel art.'), edit];
    const use = h('button', {
      class: `pick-tile${current ? ' current' : ''}`, title: 'Usar meu desenho',
      onclick: () => this.net.setAvatar({ kind: 'art', art }),
    }, h('div', { class: 'pick-art' }, avatarPicture(this.game.assets, { kind: 'art', art })), h('span', {}, current ? 'Em uso' : 'Usar'));
    return [use, edit];
  }

  #frameTile(id, name, current) {
    return h('button', {
      class: `pick-tile pick-frame${current ? ' current' : ''}`,
      onclick: () => this.net.equipFrame(id),
    }, h('div', { class: 'pick-art' }, id ? icon(frameSprite(id), 'pick-frame-img') : icon('icon/fechar', 'ico ico-sm')), h('span', {}, name));
  }

  #hunterName(id) { return this.net.catalog.characters.find(c => c.id === id)?.name ?? 'Caçador'; }
}
