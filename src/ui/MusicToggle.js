import { $, icon, show } from './dom.js';

/**
 * Botão de música no canto de cima à direita, o mesmo em todas as telas.
 * Liga e desliga só a trilha (os efeitos continuam; o alto-falante da batalha muta tudo).
 */
export class MusicToggle {
  constructor(game) {
    this.game = game;
    this.btn = $('music-toggle');
    this.btn.addEventListener('click', () => game.setOption('musicOn', !game.options.musicOn));
    game.bus.on('options', () => this.#sync());
    this.#sync();
    show(this.btn, true);
  }

  #sync() {
    const on = this.game.options.musicOn;
    const label = on ? 'Desligar a música' : 'Ligar a música';
    this.btn.replaceChildren(icon(on ? 'icon/nota' : 'icon/nota_off', 'ico', label));
    this.btn.title = label;
    this.btn.setAttribute('aria-pressed', String(!on));
    this.btn.classList.toggle('off', !on);
  }
}
