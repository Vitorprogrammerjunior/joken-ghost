import { $ } from './dom.js';

/** Janela de opções: liga os controles às preferências do jogo. */
export class OptionsModal {
  constructor(game, modals) {
    this.game = game;
    this.modals = modals;
    this.el = $('modal-options');

    this.el.querySelectorAll('input[data-opt]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.opt;
        game.setOption(key, Number(input.value));
        this.el.querySelector(`[data-val="${key}"]`).textContent = input.value;
        if (key === 'sfxVol') game.audio.play('hover');
      });
    });
    this.el.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        game.setOption(key, !game.options[key]);
        this.sync();
      });
    });
    $('opt-fullscreen').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => {});
      setTimeout(() => this.sync(), 200);
    });
  }

  sync() {
    const o = this.game.options;
    this.el.querySelectorAll('input[data-opt]').forEach((input) => {
      input.value = o[input.dataset.opt];
      this.el.querySelector(`[data-val="${input.dataset.opt}"]`).textContent = input.value;
    });
    const setToggle = (btn, on) => { btn.textContent = on ? 'LIGADO' : 'DESLIGADO'; btn.classList.toggle('on', on); };
    this.el.querySelectorAll('[data-toggle]').forEach(b => setToggle(b, o[b.dataset.toggle]));
    setToggle($('opt-fullscreen'), !!document.fullscreenElement);
  }

  open(opts) {
    this.sync();
    this.modals.open('modal-options', opts);
  }
}
