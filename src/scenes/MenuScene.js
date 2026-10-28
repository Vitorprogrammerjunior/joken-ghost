import { hunterBase } from '../world/hunterLook.js';
import { Scene } from '../core/Scene.js';
import { GW } from '../core/Renderer.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { $ } from '../ui/dom.js';

/** Tela inicial: floresta animada com fantasmas passeando. */
export class MenuScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-menu');
    this.ui = ui;
    $('menu-play').addEventListener('click', () => this.play());
    $('menu-saves').addEventListener('click', () => ui.saves.open());
    $('menu-options').addEventListener('click', () => ui.options.open());
    $('menu-account').addEventListener('click', () => ui.account.open());
    game.bus.on('account-changed', () => this.#accountLabel());
    $('menu-mp').addEventListener('click', () => game.go('lobby'));
  }

  music() { return 'menu'; }

  #accountLabel() { $('menu-account-label').textContent = this.ui.account.loggedIn ? 'CONTA' : 'ENTRAR'; }

  enter() {
    this.#accountLabel();
    this.scenery ??= new Scenery(this.game.assets, 'floresta');
    this.hunter = new Fighter(this.game.assets, { base: hunterBase(this.game, 'side'), x: 250, y: GROUND_Y + 40 });
    this.ghosts = [0, 1, 2].map(i => Object.assign(
      new Fighter(this.game.assets, { base: ['enemy/fantasma', 'enemy/fogo_fatuo', 'enemy/fantasma'][i], x: 0, y: 0, flying: true }),
      { lane: i, alpha: 0.75 },
    ));
  }

  play() {
    // em celular, tenta tela cheia ao começar
    if (matchMedia('(pointer: coarse)').matches && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    // continua o último arquivo usado, senão abre a escolha de arquivo
    if (this.game.profile) this.game.go('map');
    else this.ui.saves.open();
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    this.hunter.update(dt);
    for (const g of this.ghosts) {
      g.update(dt);
      const speed = 0.04 + g.lane * 0.015;
      g.x = GW + 100 - ((this.time * speed + g.lane * 500) % (GW + 300));
      g.y = 330 + g.lane * 90 + Math.sin(this.time / 600 + g.lane) * 20;
    }
  }

  render(r) {
    this.scenery.drawBack(r);
    for (const g of this.ghosts) g.draw(r, { shadow: false });
    this.hunter.draw(r);
    this.scenery.drawFront(r);
  }

  onKey(e) {
    if (e.code === 'Enter' || e.code === 'Space') { this.play(); return true; }
    return false;
  }
}
