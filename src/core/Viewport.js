// Escala o jogo (sempre 1280x720 por dentro) para caber em qualquer tela.
import { GW, GH } from './Renderer.js';

export class Viewport {
  /** @param {HTMLElement} root  @param {() => { pixelPerfect: boolean }} getOptions */
  constructor(root, getOptions) {
    this.root = root;
    this.getOptions = getOptions;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    const fit = () => this.fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    screen.orientation?.addEventListener?.('change', fit);
    this.fit();
  }

  fit() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    let scale = Math.min(vw / GW, vh / GH);
    // pixel perfeito: só escalas inteiras (quando a tela comporta)
    if (this.getOptions().pixelPerfect && scale >= 1) scale = Math.floor(scale);
    this.scale = scale;
    this.offsetX = Math.floor((vw - GW * scale) / 2);
    this.offsetY = Math.floor((vh - GH * scale) / 2);
    Object.assign(this.root.style, {
      transform: `translate(${this.offsetX}px, ${this.offsetY}px) scale(${scale})`,
    });
    document.body.classList.toggle('portrait', vh > vw && matchMedia('(pointer: coarse)').matches);
  }

  /** Converte coordenadas da página para coordenadas do jogo. */
  toGame(clientX, clientY) {
    return { x: (clientX - this.offsetX) / this.scale, y: (clientY - this.offsetY) / this.scale };
  }
}
