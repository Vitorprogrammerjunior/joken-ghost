// Abre/fecha janelas modais e cuida do ESC e do clique fora.
import { $ } from './dom.js';

export class Modals {
  constructor(game) {
    this.game = game;
    this.stack = [];
    this.onClose = new Map();

    document.querySelectorAll('.modal').forEach((m) => {
      m.addEventListener('pointerdown', (e) => { if (e.target === m) this.close(m.id); });
      m.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => this.close(m.id)));
    });
    game.bus.on('modal-key', (e) => {
      if (e.code === 'Escape') { e.preventDefault(); this.closeTop(); }
      else this.game.bus.emit(`key:${this.top}`, e);
    });
  }

  get top() { return this.stack[this.stack.length - 1]; }
  isOpen(id) { return this.stack.includes(id); }

  open(id, { onClose } = {}) {
    if (this.isOpen(id)) return;
    const el = $(id);
    el.classList.remove('hidden', 'closing');
    this.stack.push(id);
    el.style.zIndex = String(50 + this.stack.length); // o mais recente fica por cima
    this.game.modalOpen = this.stack.length;
    if (onClose) this.onClose.set(id, onClose);
  }

  close(id) {
    if (!this.isOpen(id)) return;
    const el = $(id);
    el.classList.add('closing');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('closing'); }, 160);
    this.stack = this.stack.filter(x => x !== id);
    this.game.modalOpen = this.stack.length;
    const cb = this.onClose.get(id);
    this.onClose.delete(id);
    cb?.();
  }

  closeTop() { if (this.top) this.close(this.top); }

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
