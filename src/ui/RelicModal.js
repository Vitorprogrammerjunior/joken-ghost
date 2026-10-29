// Escolha obrigatória de relíquia entre as ondas das corridas.
import { $, h, icon } from './dom.js';
import { relicById, relicLevel, relicText } from '../config/relics.js';
import { RUN_RULES } from '../config/runs.js';

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

  /**
   * Mostra as relíquias oferecidas e resolve com o id escolhido.
   * @param {string[]} offer
   * @param {string[]} owned  relíquias que o Caçador já tem (repetidas = nível)
   */
  choose(offer, owned = []) {
    return new Promise((resolve) => {
      let chosen = null;
      const kinds = new Set(owned).size;
      $('relic-sub').textContent = kinds >= RUN_RULES.relicSlots
        ? `Bolsa de relíquias cheia (${kinds}/${RUN_RULES.relicSlots}): agora elas só sobem de nível.`
        : `Vale até o fim da corrida. Repetir uma relíquia sobe o nível dela. Bolsa: ${kinds}/${RUN_RULES.relicSlots}.`;
      $('relic-grid').replaceChildren(...offer.map((id, i) => {
        const relic = relicById(id);
        const next = relicLevel(owned, id) + 1;
        const max = relic.levels.length;
        const tag = next === 1 ? (max > 1 ? `NOVA · ${max} níveis` : 'NOVA') : `NÍVEL ${next}/${max}`;
        return h('button', {
          class: 'relic-card',
          onclick: () => { chosen = id; this.modals.close('modal-relics'); },
        }, icon(relic.icon, 'ico'), h('b', {}, relic.name), h('em', { class: next > 1 ? 'up' : '' }, tag),
        h('p', {}, relicText(id, next)), h('small', {}, `[${i + 1}]`));
      }));
      this.game.audio.play('phase');
      this.modals.open('modal-relics', { locked: true, onClose: () => resolve(chosen) });
    });
  }
}
