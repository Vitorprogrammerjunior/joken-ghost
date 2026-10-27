import { $, h, icon, show, retrigger } from './dom.js';

const SHOW_MS = 3600;

/** Aviso discreto no canto quando a trilha muda: "Tocando: nome da música". */
export class NowPlaying {
  constructor(game) {
    this.game = game;
    this.el = $('now-playing');
    this.timer = null;
    game.bus.on('track', (track) => this.show(track));
  }

  /** Vinhetas que tocam uma vez só (vitória, derrota) não ganham aviso. */
  show({ title, loops }) {
    const o = this.game.options;
    if (!loops || !o.nowPlaying || o.muted || !o.musicOn || !o.musicVol) return;
    this.el.replaceChildren(icon('icon/nota', 'ico ico-xs'), h('span', {}, 'Tocando'), h('b', {}, title));
    show(this.el, true);
    this.el.classList.remove('out');
    retrigger(this.el, 'in');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.add('out'), SHOW_MS);
  }
}
