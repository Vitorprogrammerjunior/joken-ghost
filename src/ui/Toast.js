import { $, h, icon } from './dom.js';

/** Notificações empilhadas no topo da tela. */
export class Toasts {
  constructor(game) {
    this.game = game;
    this.el = $('toasts');
  }

  show(text, { iconKey = null, ms = 2800, force = false } = {}) {
    if (!force && !this.game.options.toasts) return;
    const t = h('div', { class: 'toast' }, iconKey ? icon(iconKey, 'ico ico-sm') : null, h('span', {}, text));
    this.el.append(t);
    while (this.el.children.length > 3) this.el.firstChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }
}
