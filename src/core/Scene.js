import { Tweens } from './Tween.js';
import { Particles } from './Particles.js';

/**
 * Base de todas as telas do jogo. Cada cena tem uma camada DOM (screen)
 * e desenha o fundo/personagens no canvas compartilhado.
 */
export class Scene {
  /** @param {import('./Game.js').Game} game  @param {string|null} screenId */
  constructor(game, screenId = null) {
    this.game = game;
    this.el = screenId ? document.getElementById(screenId) : null;
    this.tweens = new Tweens();
    this.particles = new Particles();
    this.time = 0;
    this.paused = false;
    this.disposers = [];
  }

  /** Atalho para animações que respeitam a pausa. */
  wait(ms) { return this.tweens.wait(ms); }

  /** Registra um listener que é removido automaticamente ao sair da cena. */
  listen(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    this.disposers.push(() => target.removeEventListener(event, fn, opts));
  }

  /** Trilha da tela (nome em assets/music). `null` mantém a que está tocando. */
  music(_params) { return null; }

  enter(_params) {}
  exit() {}

  _enter(params) {
    this.time = 0;
    this.paused = false;
    this.el?.classList.remove('hidden');
    this.enter(params);
  }

  _exit() {
    this.exit();
    this.disposers.forEach(d => d());
    this.disposers = [];
    this.tweens.clear();
    this.particles.clear();
    this.el?.classList.add('hidden');
  }

  update(dt) {
    this.time += dt;
    this.tweens.update(dt);
    this.particles.update(dt);
  }

  /** @param {import('./Renderer.js').Renderer} _r */
  render(_r) {}

  /** Teclado: retorne true se tratou o evento. */
  onKey(_e) { return false; }
  /** Ponteiro em coordenadas do jogo: type = 'down' | 'move'. */
  onPointer(_type, _x, _y) {}
}
