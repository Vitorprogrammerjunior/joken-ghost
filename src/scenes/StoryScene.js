// Carta/narração antes de cada fase (e o final da campanha).
import { Scene } from '../core/Scene.js';
import { GW, GH } from '../core/Renderer.js';
import { ENDINGS, levelById } from '../config/levels.js';
import { Scenery } from '../world/Scenery.js';
import { $ } from '../ui/dom.js';

const CHARS_PER_SEC = 45;

export class StoryScene extends Scene {
  constructor(game) {
    super(game, 'screen-story');
    this.textEl = $('story-text');
    this.el.addEventListener('click', () => this.advance());
  }

  music({ ending = null }) { return ending ? ENDINGS[ending].music : 'conto'; }

  /** Abre a carta de uma fase (`levelId`) ou um final (`ending`, chave de ENDINGS). */
  enter({ levelId, ending = null }) {
    this.ending = ending ? ENDINGS[ending] : null;
    this.level = levelId ? levelById(levelId) : null;
    this.full = (this.ending ? this.ending.lines : this.level.intro).join('\n');
    this.chars = 0;
    this.scenery = new Scenery(this.game.assets, this.ending ? this.ending.scenery : this.level.scenery);
    this.textEl.textContent = '';
  }

  get done() { return this.chars >= this.full.length; }

  advance() {
    if (this.game.transitioning) return;
    if (!this.done) { this.chars = this.full.length; this.textEl.textContent = this.full; return; }
    if (this.ending) this.game.go('map', { focus: this.ending.focus });
    else this.game.go('dialogue', { levelId: this.level.id });
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    if (!this.done) {
      const before = Math.floor(this.chars);
      this.chars = Math.min(this.full.length, this.chars + CHARS_PER_SEC * dt / 1000);
      if (Math.floor(this.chars) !== before) {
        this.textEl.textContent = this.full.slice(0, Math.floor(this.chars));
        if (before % 3 === 0) this.game.audio.play('type');
      }
    }
  }

  render(r) {
    this.scenery.drawBack(r);
    this.scenery.drawFront(r);
    r.rect(0, 0, GW, GH, '#0e0b16', 0.7);
  }

  onKey(e) {
    if (e.code === 'Space' || e.code === 'Enter') { this.advance(); return true; }
    if (e.code === 'Escape') { this.game.go('map'); return true; }
    return false;
  }
}
