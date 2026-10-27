// Abre/fecha janelas modais e cuida do ESC e do clique fora.
import { $ } from './dom.js';

const OPENING_MS = 700;   // tempo da cascata de itens ao abrir (styles/components.css)
const CLOSING_MS = 200;   // tempo da animação de saída

export class Modals {
  constructor(game) {
    this.game = game;
    this.stack = [];
    this.onClose = new Map();
    this.locked = new Set(); // janelas que só fecham por código (escolhas obrigatórias)

    document.querySelectorAll('.modal').forEach((m) => {
      m.addEventListener('pointerdown', (e) => { if (e.target === m && !this.locked.has(m.id)) this.close(m.id); });
      m.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => this.close(m.id)));
    });
    game.bus.on('modal-key', (e) => {
      if (e.code === 'Escape') { e.preventDefault(); if (!this.locked.has(this.top)) this.closeTop(); }
      else this.game.bus.emit(`key:${this.top}`, e);
    });
  }

  get top() { return this.stack[this.stack.length - 1]; }
  isOpen(id) { return this.stack.includes(id); }

  /** `locked`: não fecha com ESC nem clicando fora. */
  open(id, { onClose, locked = false } = {}) {
    if (this.isOpen(id)) return;
    if (locked) this.locked.add(id);
    const el = $(id);
    el.classList.remove('hidden', 'closing');
    this.#cascade(el);
    this.stack.push(id);
    el.style.zIndex = String(50 + this.stack.length); // o mais recente fica por cima
    this.game.modalOpen = this.stack.length;
    if (onClose) this.onClose.set(id, onClose);
  }

  close(id) {
    if (!this.isOpen(id)) return;
    const el = $(id);
    el.classList.add('closing');
    setTimeout(() => { if (el.classList.contains('closing')) el.classList.add('hidden'); el.classList.remove('closing'); }, CLOSING_MS);
    this.stack = this.stack.filter(x => x !== id);
    this.locked.delete(id);
    this.game.modalOpen = this.stack.length;
    const cb = this.onClose.get(id);
    this.onClose.delete(id);
    cb?.();
  }

  closeTop() { if (this.top) this.close(this.top); }

  /** Liga a cascata de entrada dos itens só durante a abertura. */
  #cascade(el) {
    el.classList.add('opening');
    clearTimeout(el.openingTimer);
    el.openingTimer = setTimeout(() => el.classList.remove('opening'), OPENING_MS);
  }

  /** Pergunta sim/não. */
  confirm(text) {
    return new Promise((resolve) => {
      $('confirm-text').textContent = text;
      let answer = false;
      const yes = $('confirm-yes'), no = $('confirm-no');
      const done = (v) => () => { answer = v; this.close('modal-confirm'); };
      const onYes = done(true), onNo = done(false);
      yes.addEventListener('click', onYes, { once: true });
      no.addEventListener('click', onNo, { once: true });
      this.open('modal-confirm', {
        onClose: () => {
          yes.removeEventListener('click', onYes);
          no.removeEventListener('click', onNo);
          resolve(answer);
        },
      });
    });
  }
}
