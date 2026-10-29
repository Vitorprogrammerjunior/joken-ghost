// Escala o jogo (1280x720 por dentro) para caber em qualquer tela.
// Com a tela em pé, as cenas que aceitam (menu, Arena e as janelas delas) viram uma tela em pé:
// 540 de largura e a altura que a tela tiver; o fundo desenhado continua 1280x720, cobrindo a tela.
// As outras cenas (batalha, mapa, duelo) seguem deitadas e pedem para girar o celular.
import { GW, GH } from './Renderer.js';

/** Largura da tela em pé, em pixels do jogo (a altura acompanha a proporção da tela). */
export const PORTRAIT_W = 540;
const PORTRAIT_H = [1000, 1320]; // menos que isso (tablet em pé) sobra uma faixa nas laterais

export class Viewport {
  /** @param {HTMLElement} root  @param {() => { pixelPerfect: boolean }} getOptions */
  constructor(root, getOptions) {
    this.root = root;
    this.getOptions = getOptions;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.allowPortrait = true; // a tela de carregamento também se arruma em pé
    this.portrait = false;
    this.width = GW;
    this.height = GH;
    const fit = () => this.fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    screen.orientation?.addEventListener?.('change', fit);
    this.fit();
  }

  /** A cena atual sabe se arrumar em pé? (Scene.portrait) */
  setPortraitAllowed(on) {
    if (this.allowPortrait === on) return;
    this.allowPortrait = on;
    this.fit();
  }

  fit() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const upright = vh > vw * 1.1;
    this.portrait = upright && this.allowPortrait;
    if (this.portrait) {
      this.width = PORTRAIT_W;
      this.height = Math.round(Math.min(PORTRAIT_H[1], Math.max(PORTRAIT_H[0], PORTRAIT_W * vh / vw)));
    } else {
      this.width = GW;
      this.height = GH;
    }
    let scale = Math.min(vw / this.width, vh / this.height);
    // pixel perfeito: só escalas inteiras (quando a tela comporta)
    if (this.getOptions().pixelPerfect && scale >= 1) scale = Math.floor(scale);
    this.scale = scale;
    this.offsetX = Math.floor((vw - this.width * scale) / 2);
    this.offsetY = Math.floor((vh - this.height * scale) / 2);
    Object.assign(this.root.style, {
      width: `${this.width}px`,
      height: `${this.height}px`,
      transform: `translate(${this.offsetX}px, ${this.offsetY}px) scale(${scale})`,
    });
    document.body.classList.toggle('ui-portrait', this.portrait);
    // aviso de girar: só no celular em pé, numa cena que precisa da tela deitada
    document.body.classList.toggle('portrait', upright && !this.portrait && matchMedia('(pointer: coarse)').matches);
  }

  /** Converte coordenadas da página para coordenadas do jogo (cenas deitadas). */
  toGame(clientX, clientY) {
    return { x: (clientX - this.offsetX) / this.scale, y: (clientY - this.offsetY) / this.scale };
  }
}
