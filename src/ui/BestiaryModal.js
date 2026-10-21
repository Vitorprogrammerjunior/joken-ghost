// Monstruário em forma de livro: abas à esquerda, página com o monstro animado.
import { $, h, icon } from './dom.js';
import { allViews } from '../domain/bestiary.js';
import { WEAPONS } from '../config/weapons.js';
import { FRAME_SIZE } from '../core/Assets.js';

export class BestiaryModal {
  constructor(game, modals) {
    this.game = game;
    this.modals = modals;
    this.tabs = $('bestiary-tabs');
    this.page = $('bestiary-page');
    this.index = 0;
    this.raf = 0;
    game.bus.on('key:modal-bestiary', (e) => {
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') this.select(this.index + 1);
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') this.select(this.index - 1);
    });
  }

  get book() { return this.game.profile?.bestiary ?? {}; }

  open(focusId = null, { onClose } = {}) {
    this.views = allViews(this.book);
    const i = this.views.findIndex(v => v.id === focusId);
    this.index = i >= 0 ? i : Math.max(0, this.views.findIndex(v => v.known));
    this.render();
    this.modals.open('modal-bestiary', {
      onClose: () => { cancelAnimationFrame(this.raf); onClose?.(); },
    });
  }

  select(i) {
    this.index = (i + this.views.length) % this.views.length;
    this.game.audio.play('hover');
    this.render();
  }

  render() {
    this.tabs.replaceChildren(...this.views.map((v, i) => h('button', {
      class: `book-tab${i === this.index ? ' active' : ''}${v.known ? '' : ' unknown'}`,
      title: v.known ? v.name : '???',
      onclick: () => this.select(i),
      dataset: { silent: '1' },
    }, v.known ? this.#thumb(v.sprite) : icon('icon/interrogacao', 'ico ico-sm'))));
    this.page.replaceChildren(this.#page(this.views[this.index]));
  }

  #thumb(sprite) {
    const c = h('canvas', { width: FRAME_SIZE, height: FRAME_SIZE, class: 'book-thumb' });
    const sheet = this.game.assets.get(`${sprite}/idle`);
    if (sheet) c.getContext('2d').drawImage(sheet.img, 0, 0, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
    return c;
  }

  #page(v) {
    cancelAnimationFrame(this.raf);
    const n = `${this.index + 1}/${this.views.length}`;
    if (!v.known) {
      return h('div', { class: 'book-page' },
        h('div', { class: 'book-art unknown' }, icon('icon/interrogacao', 'ico ico-xl')),
        h('div', { class: 'book-text' },
          h('h3', {}, '???'),
          h('p', { class: 'book-desc' }, 'Você ainda não encontrou esta criatura. Continue explorando a mansão...'),
          h('p', { class: 'book-num' }, n)));
    }

    const art = h('canvas', { width: FRAME_SIZE * 3, height: FRAME_SIZE * 3, class: 'book-sprite' });
    const ctx = art.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const sheet = this.game.assets.get(`${v.sprite}/idle`);
    const loop = (t) => {
      if (!sheet) return;
      const f = Math.floor(t / 160) % sheet.frames;
      ctx.clearRect(0, 0, art.width, art.height);
      ctx.drawImage(sheet.img, f * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, 0, 0, art.width, art.height);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);

    const weaponChips = (ids, cls) => ids.length
      ? ids.map(id => h('span', { class: `chip ${cls}` }, icon(WEAPONS[id].icon, 'ico ico-sm'), WEAPONS[id].name))
      : [h('span', { class: 'chip muted' }, '???')];

    return h('div', { class: 'book-page' },
      h('div', { class: 'book-art' }, art, v.boss ? h('span', { class: 'boss-tag' }, 'CHEFE') : null),
      h('div', { class: 'book-text' },
        h('h3', {}, v.name),
        h('p', { class: 'book-desc' }, v.desc),
        h('div', { class: 'book-stats' },
          h('span', {}, icon('icon/coracao', 'ico ico-xs'), ` VIDA ${v.hp}`),
          h('span', {}, icon('icon/espadas', 'ico ico-xs'), ` DANO ${v.damage}`),
          h('span', {}, icon('icon/caveira', 'ico ico-xs'), ` DERROTADOS ${v.kills}`)),
        h('div', { class: 'book-row' }, h('b', {}, 'FRACO CONTRA'), ...weaponChips(v.weak, 'good')),
        h('div', { class: 'book-row' }, h('b', {}, 'RESISTE A'), ...weaponChips(v.resist, 'bad')),
        h('div', { class: 'book-row column' }, h('b', {}, 'COMPORTAMENTO'),
          h('p', { class: v.behavior ? 'book-behavior' : 'book-behavior muted' },
            v.behavior ?? `Derrote mais ${v.killsToBehavior} para descobrir.`)),
        h('p', { class: 'book-num' }, n)));
  }
}
