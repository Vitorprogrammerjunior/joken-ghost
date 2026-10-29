// Editor de builds da Arena: caçador + até 6 cartas dentro do orçamento de pontos (regras do servidor).
// Cinco builds salvas com nome; a que você salva (ou escolhe) é a que vai para as partidas.
// O código ("JG:luna:juizo,escudo") passa uma build para um amigo.
import { $, h } from './dom.js';
import { cardEl } from './Card.js';
import { spriteCanvas } from './SpriteCanvas.js';
import { encodeBuild, decodeBuild, buildCost } from '../domain/buildCode.js';

export class BuildModal {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    this.slot = 0;
    this.draft = null; // { name, character, cards }
    $('build-save').addEventListener('click', () => this.#save());
    $('build-copy').addEventListener('click', () => this.#copy());
    $('build-paste').addEventListener('click', () => this.#paste());
    $('build-delete').addEventListener('click', () => this.#delete());
    $('build-name').addEventListener('input', (e) => { this.draft.name = e.target.value; });
    net.on('profile', () => { if (modals.isOpen('modal-cards')) this.#renderSlots(); });
  }

  get #rules() { return this.net.catalog.deck; }
  get #catalog() { return this.net.catalog; }
  #card(id) { return this.#catalog.cards.find(c => c.id === id); }
  get #saved() { return this.net.profile.builds ?? []; }

  open() {
    const p = this.net.profile;
    this.#load(p.activeBuild ?? Math.max(0, this.#saved.findIndex(b => !b)));
    this.modals.open('modal-cards');
  }

  /** Abre um slot: a build salva nele, ou o que você usa agora (para salvar ali). */
  #load(slot) {
    const p = this.net.profile;
    this.slot = slot;
    const b = this.#saved[slot];
    this.draft = b
      ? { name: b.name, character: b.character, cards: [...b.cards] }
      : { name: `Build ${slot + 1}`, character: p.character, cards: [...p.deck] };
    this.#render();
  }

  #cost(cards = this.draft.cards) { return buildCost(cards, this.#catalog); }

  /** Motivo para não pôr a carta na build, ou null se pode. */
  #blocked(id) {
    const { size, budget } = this.#rules;
    if (this.draft.cards.length >= size) return `A build tem no máximo ${size} cartas.`;
    const after = this.#cost([...this.draft.cards, id]);
    if (after > budget) return `Não cabe: ficaria com ${after}/${budget} pontos.`;
    return null;
  }

  #toggle(id) {
    if (this.draft.cards.includes(id)) this.draft.cards = this.draft.cards.filter(c => c !== id);
    else {
      const reason = this.#blocked(id);
      if (reason) { this.game.audio.play('error'); this.#toast(reason); return; }
      this.draft.cards.push(id);
    }
    this.game.audio.play('select');
    this.#render();
  }

  #render() {
    const { size, budget } = this.#rules;
    const cost = this.#cost();
    $('build-name').value = this.draft.name;
    $('deck-rules').textContent = `${this.draft.cards.length}/${size} cartas · ${cost}/${budget} pontos`;
    $('build-budget-fill').style.width = `${Math.min(100, (cost / budget) * 100)}%`;
    this.#renderSlots();
    $('build-chars').replaceChildren(...this.#catalog.characters.map(c => h('button', {
      class: `build-char${c.id === this.draft.character ? ' current' : ''}`,
      title: `${c.name}: ${c.passive}`,
      onclick: () => { this.draft.character = c.id; this.game.audio.play('select'); this.#render(); },
    }, spriteCanvas(this.game.assets, `char/${c.id}/side/idle`, { size: 40 }), h('b', {}, c.name), h('small', {}, c.passive))));
    $('deck-slots').replaceChildren(...Array.from({ length: size }, (_, i) => {
      const id = this.draft.cards[i];
      return id ? cardEl(this.#card(id), { size: 'sm', onPick: () => this.#toggle(id) }) : h('div', { class: 'deck-slot-empty' });
    }));
    $('cards-grid').replaceChildren(...this.#catalog.cards.map((c) => {
      const el = cardEl(c, { size: 'sm', onPick: () => this.#toggle(c.id) });
      el.classList.toggle('in-deck', this.draft.cards.includes(c.id));
      el.classList.toggle('too-costly', !this.draft.cards.includes(c.id) && !!this.#blocked(c.id));
      return el;
    }));
    $('build-delete').disabled = !this.#saved[this.slot];
  }

  #renderSlots() {
    const active = this.net.profile.activeBuild;
    $('build-slots').replaceChildren(...Array.from({ length: this.#catalog.buildSlots ?? 5 }, (_, i) => {
      const b = this.#saved[i];
      return h('button', {
        class: `build-slot${i === this.slot ? ' current' : ''}${b ? '' : ' empty'}`,
        onclick: () => { this.game.audio.play('select'); this.#load(i); },
      }, h('b', {}, b ? b.name : 'Vazio'), h('small', {}, i === active ? 'EM USO' : b ? `${this.#cost(b.cards)} pts` : `slot ${i + 1}`));
    }));
  }

  #save() {
    if (!this.draft.cards.length) { this.#toast('Ponha pelo menos uma carta.'); return; }
    this.net.saveBuild(this.slot, this.draft);
    this.#toast(`Build "${this.draft.name.trim() || 'Minha build'}" salva. É ela que vai para as partidas.`);
  }

  #delete() {
    if (!this.#saved[this.slot]) return;
    this.net.deleteBuild(this.slot);
    this.#toast('Build apagada.');
  }

  #copy() {
    const code = encodeBuild(this.draft);
    const done = () => this.#toast(`Código copiado: ${code}`);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => window.prompt('Copie o código da build:', code));
    else window.prompt('Copie o código da build:', code);
  }

  #paste() {
    const code = window.prompt('Cole o código da build (ex.: JG:luna:juizo,escudo,cura):');
    if (!code) return;
    const read = decodeBuild(code, this.#catalog);
    if (!read.ok) { this.#toast(read.reason); return; }
    const { size, budget } = this.#rules;
    const cost = this.#cost(read.cards);
    if (read.cards.length > size || cost > budget) { this.#toast(`Essa build não cabe nas regras atuais (${read.cards.length}/${size} cartas, ${cost}/${budget} pontos).`); return; }
    Object.assign(this.draft, { character: read.character, cards: read.cards });
    this.#render();
    this.#toast('Build carregada. Salve para usar.');
  }

  #toast(text) { this.game.bus.emit('toast', text); }
}
