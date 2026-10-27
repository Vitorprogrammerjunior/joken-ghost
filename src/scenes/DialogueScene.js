// Cena de diálogo em quadrinhos antes da batalha.
import { hunterBase } from '../world/hunterLook.js';
import { Scene } from '../core/Scene.js';
import { levelById } from '../config/levels.js';
import { ENEMIES } from '../config/enemies.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { $ } from '../ui/dom.js';

const CHARS_PER_SEC = 32;
const HUNTER = { name: 'CAÇADOR', side: 'left' };

/** Quem fala: o Caçador (esquerda) ou um monstro de config/enemies.js (direita). */
function speaker(who) {
  const def = ENEMIES[who];
  return def ? { name: def.name.toUpperCase(), side: 'right', def } : HUNTER;
}

/** O monstro que conversa com o Caçador na fase (se houver). */
const villainOf = (level) => level.dialogue.map(l => speaker(l.who).def).find(Boolean);

export class DialogueScene extends Scene {
  constructor(game) {
    super(game, 'screen-dialogue');
    this.speech = $('speech');
    this.nameEl = $('speech-name');
    this.textEl = $('speech-text');
    this.nextEl = $('speech-next');
    this.el.addEventListener('click', (e) => { if (!e.target.closest('#dialogue-skip')) this.advance(); });
    $('dialogue-skip').addEventListener('click', () => this.#toBattle());
  }

  /** Conversa comum: a trilha das histórias. Com um chefe em cena, o tema dele. */
  music({ levelId }) {
    const villain = villainOf(levelById(levelId));
    return villain?.boss ? (villain.music ?? 'chefe') : 'conto';
  }

  enter({ levelId }) {
    this.level = levelById(levelId);
    this.scenery = new Scenery(this.game.assets, this.level.scenery);
    this.hunter = new Fighter(this.game.assets, { base: hunterBase(this.game, 'side'), x: 300, y: GROUND_Y });
    this.hunter.ox = -500;
    this.tweens.to(this.hunter, { ox: 0 }, 700);
    const villain = villainOf(this.level);
    this.other = villain ? new Fighter(this.game.assets, { base: villain.sprite, x: 960, y: GROUND_Y, scale: villain.scale ?? 3, flying: !!villain.flying }) : null;
    this.line = -1;
    this.next();
  }

  get current() { return this.level.dialogue[this.line]; }
  get done() { return this.chars >= this.current.text.length; }

  next() {
    this.line++;
    if (this.line >= this.level.dialogue.length) { this.#toBattle(); return; }
    this.chars = 0;
    const sp = speaker(this.current.who);
    this.nameEl.textContent = sp.name;
    this.speech.dataset.side = sp.side;
    this.textEl.textContent = '';
    this.nextEl.style.visibility = 'hidden';
    const who = this.current.who === 'hunter' ? this.hunter : this.other;
    if (who) { who.oy = -10; this.tweens.to(who, { oy: 0 }, 300); }
  }

  advance() {
    if (this.game.transitioning || this.line < 0) return;
    if (!this.done) { this.chars = this.current.text.length; this.#sync(); return; }
    this.game.audio.play('hover');
    this.next();
  }

  #toBattle() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.go('battle', { levelId: this.level.id }).then(() => { this.leaving = false; });
  }

  #sync() {
    this.textEl.textContent = this.current.text.slice(0, Math.floor(this.chars));
    this.nextEl.style.visibility = this.done ? 'visible' : 'hidden';
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    this.hunter.update(dt);
    this.other?.update(dt);
    if (this.line >= 0 && this.line < this.level.dialogue.length && !this.done) {
      const before = Math.floor(this.chars);
      this.chars = Math.min(this.current.text.length, this.chars + CHARS_PER_SEC * dt / 1000);
      if (Math.floor(this.chars) !== before) {
        this.#sync();
        if (before % 2 === 0) this.game.audio.play('type');
      }
    }
  }

  render(r) {
    this.scenery.drawBack(r);
    this.other?.draw(r);
    this.hunter.draw(r);
    this.scenery.drawFront(r);
  }

  onKey(e) {
    if (e.code === 'Space' || e.code === 'Enter') { this.advance(); return true; }
    if (e.code === 'Escape') { this.#toBattle(); return true; }
    return false;
  }
}
