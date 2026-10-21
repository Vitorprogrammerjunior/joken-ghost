import { $, h, icon } from './dom.js';
import { LEVELS, levelById } from '../config/levels.js';
import { seenCount } from '../domain/bestiary.js';
import { ENEMY_ORDER } from '../config/enemies.js';

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Escolha de arquivo (slot de save). */
export class SavesModal {
  constructor(game, modals) {
    this.game = game;
    this.modals = modals;
    this.list = $('save-list');
  }

  open() {
    this.render();
    this.modals.open('modal-saves');
  }

  render() {
    this.list.replaceChildren(...this.game.saves.list().map(({ slot, data }) => this.#slot(slot, data)));
  }

  #slot(slot, data) {
    const play = () => {
      const profile = data ?? this.game.saves.create(slot);
      this.game.useProfile(profile);
      this.modals.close('modal-saves');
      this.game.go('map');
    };

    if (!data) {
      return h('div', { class: 'save-slot empty' },
        h('div', { class: 'save-num' }, slot),
        h('div', { class: 'save-info' }, h('div', { class: 'save-name' }, '— VAZIO —'), h('div', { class: 'save-meta' }, 'Comece uma nova caçada')),
        h('button', { class: 'btn btn-primary btn-sm', onclick: play }, 'NOVO JOGO'),
      );
    }

    const stars = Object.values(data.stars).reduce((s, n) => s + n, 0);
    const next = levelById(Math.min(data.unlocked, LEVELS.length));
    const del = async (e) => {
      e.stopPropagation();
      if (await this.modals.confirm(`Apagar o Arquivo ${slot}? Isso não pode ser desfeito.`)) {
        this.game.saves.remove(slot);
        this.render();
      }
    };

    return h('div', { class: 'save-slot' },
      h('div', { class: 'save-num' }, slot),
      h('div', { class: 'save-info' },
        h('div', { class: 'save-name' }, data.finished ? 'CAMPANHA COMPLETA' : next.name),
        h('div', { class: 'save-meta' },
          icon('icon/estrela', 'ico ico-xs'), ` ${stars}/${LEVELS.length * 3}  `,
          icon('icon/moeda', 'ico ico-xs'), ` ${data.coins}  `,
          icon('icon/livro', 'ico ico-xs'), ` ${seenCount(data.bestiary)}/${ENEMY_ORDER.length}`),
        h('div', { class: 'save-date' }, fmtDate(data.updatedAt)),
      ),
      h('div', { class: 'save-actions' },
        h('button', { class: 'btn btn-primary btn-sm', onclick: play }, 'CONTINUAR'),
        h('button', { class: 'btn btn-danger btn-icon btn-icon-sm', title: 'Apagar', onclick: del }, icon('icon/fechar', 'ico ico-sm', 'Apagar')),
      ),
    );
  }
}
