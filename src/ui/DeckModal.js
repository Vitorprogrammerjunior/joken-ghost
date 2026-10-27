// Editor do deck da Arena: 8 cartas, no máximo 1 lendária e 2 épicas (regras do servidor).
import { $, h } from './dom.js';
import { cardEl } from './Card.js';

const RARITY_LABEL = { lendario: 'lendária', epico: 'épicas' };

export class DeckModal {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    this.draft = [];
    $('deck-save').addEventListener('click', () => this.#save());
    $('deck-auto').addEventListener('click', () => { this.net.setDeck([]); this.modals.close('modal-cards'); this.#toast('Deck automático: as melhores cartas liberadas.'); });
  }

  get #rules() { return this.net.catalog.deck; }
  #card(id) { return this.net.catalog.cards.find(c => c.id === id); }

  open() {
    this.draft = [...this.net.profile.deck];
    this.#render();
    this.modals.open('modal-cards');
  }

  /** Motivo para não pôr a carta no deck, ou null se pode. */
  #blocked(id) {
    const { size, maxByRarity } = this.#rules;
    if (this.draft.length >= size) return `O deck tem no máximo ${size} cartas.`;
    const rarity = this.#card(id).rarity;
    const max = maxByRarity[rarity];
    if (max != null && this.draft.filter(c => this.#card(c).rarity === rarity).length >= max) {
      return `No máximo ${max} carta(s) ${RARITY_LABEL[rarity]} no deck.`;
    }
    return null;
  }

  #toggle(id) {
    if (this.draft.includes(id)) this.draft = this.draft.filter(c => c !== id);
    else {
      const reason = this.#blocked(id);
      if (reason) { this.game.audio.play('error'); this.#toast(reason); return; }
      this.draft.push(id);
    }
    this.game.audio.play('select');
    this.#render();
  }

  #render() {
    const { size, maxByRarity } = this.#rules;
    const count = (r) => this.draft.filter(c => this.#card(c).rarity === r).length;
    $('deck-rules').textContent = `${this.draft.length}/${size} cartas · épicas ${count('epico')}/${maxByRarity.epico} · lendária ${count('lendario')}/${maxByRarity.lendario}`;
    const slots = Array.from({ length: size }, (_, i) => {
      const id = this.draft[i];
      return id ? cardEl(this.#card(id), { size: 'sm', onPick: () => this.#toggle(id) }) : h('div', { class: 'deck-slot-empty' });
    });
    $('deck-slots').replaceChildren(...slots);
    const owned = this.net.profile.unlocked.cards;
    $('cards-grid').replaceChildren(...this.net.catalog.cards.map((c) => {
      const locked = !owned.includes(c.id);
      const el = cardEl(c, { size: 'sm', locked, onPick: locked ? null : () => this.#toggle(c.id) });
      el.classList.toggle('in-deck', this.draft.includes(c.id));
      return el;
    }));
  }

  #save() {
    if (this.draft.length === 0) { this.#toast('Ponha pelo menos uma carta (ou use o automático).'); return; }
    this.net.setDeck(this.draft);
    this.modals.close('modal-cards');
    this.#toast('Deck salvo!');
  }

  #toast(text) { this.game.bus.emit('toast', text); }
}
