// Tela de resultado (fase da campanha ou corrida). O resumo vem pronto do modo
// da batalha (scenes/battleModes.js): título, estrelas, números, nota e botões.
import { hunterBase } from '../world/hunterLook.js';
import { Scene } from '../core/Scene.js';
import { GW, GH } from '../core/Renderer.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { $, h, icon, show } from '../ui/dom.js';

export class ResultScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-result');
    this.ui = ui;
    this.titleEl = $('result-title');
    this.starsEl = $('result-stars');
    this.statsEl = $('result-stats');
    this.noteEl = $('result-note');
    this.actionsEl = $('result-actions');
  }

  /**
   * @param {{ won: boolean, stars: number, scenery: string, title: string,
   *   stats: { icon: string, label: string, value: string|number }[], note: string,
   *   actions: { label: string, icon: string, primary?: boolean, go: [string, object] }[],
   *   daily?: object|null }} r
   */
  enter(r) {
    this.r = r;
    this.scenery = new Scenery(this.game.assets, r.scenery);
    this.hunter = new Fighter(this.game.assets, { base: hunterBase(this.game, 'side'), x: 300, y: GROUND_Y });
    this.hunter.play(r.won ? 'win' : 'ko', { loop: r.won, hold: !r.won });

    this.titleEl.textContent = r.title;
    this.titleEl.className = `result-title ${r.won ? 'win' : 'lose'}`;
    this.starsEl.replaceChildren(...(r.stars ? [1, 2, 3].map(k => icon(k <= r.stars ? 'icon/estrela' : 'icon/estrela_vazia', `ico ico-lg star s${k}`)) : []));
    show(this.starsEl, r.stars > 0);
    this.statsEl.replaceChildren(...r.stats.map(s => h('li', {}, icon(s.icon, 'ico ico-sm'), h('span', {}, s.label), h('b', {}, s.value))));
    this.noteEl.textContent = r.note;

    const buttons = r.actions.map(a => h('button', { class: `btn ${a.primary ? 'btn-primary' : ''}`, onclick: () => this.game.go(...a.go) }, icon(a.icon), a.label));
    this.actionsEl.replaceChildren(...buttons);
    this.el.querySelectorAll('.daily-status').forEach(el => el.remove());
    if (r.daily) this.ui.daily.offerSubmit(r.daily, this.noteEl);
    setTimeout(() => this.actionsEl.querySelector('button')?.focus(), 400);
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    this.hunter.update(dt);
    if (this.r.won && Math.random() < 0.15) {
      this.particles.spawn({ x: Math.random() * GW, y: -10, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 80, life: 4000, color: ['#f6d548', '#a35fd9', '#5fb24a', '#7cf0dc'][Math.floor(Math.random() * 4)], size: 2 });
    }
  }

  render(r) {
    this.scenery.drawBack(r);
    this.hunter.draw(r);
    this.scenery.drawFront(r);
    r.rect(0, 0, GW, GH, '#0e0b16', 0.35);
    this.particles.draw(r);
  }

  onKey(e) {
    if (e.code === 'Enter' || e.code === 'Space') { this.actionsEl.querySelector('button')?.click(); return true; }
    return false;
  }
}
