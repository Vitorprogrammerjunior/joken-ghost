// Escolha obrigatória de relíquia entre as ondas das corridas.
import { $, h, icon } from './dom.js';
import { relicById } from '../config/relics.js';

export class RelicModal {
  /** @param {import('../core/Game.js').Game} game  @param {import('./Modals.js').Modals} modals */
  constructor(game, modals) {
    this.game = game;
    this.modals = modals;
    game.bus.on('key:modal-relics', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 3) $('relic-grid').children[n - 1]?.click();
    });
  }

  /** Mostra as relíquias oferecidas e resolve com o id escolhido. */
  choose(offer) {
    return new Promise((resolve) => {
      let chosen = null;
      $('relic-grid').replaceChildren(...offer.map((id, i) => {
        const relic = relicById(id);
        return h('button', {
          class: 'relic-card',
          onclick: () => { chosen = id; this.modals.close('modal-relics'); },
        }, icon(relic.icon, 'ico'), h('b', {}, relic.name), h('p', {}, relic.desc), h('small', {}, `[${i + 1}]`));
      }));
      this.game.audio.play('phase');
      this.modals.open('modal-relics', { locked: true, onClose: () => resolve(chosen) });
    });
  }
}
