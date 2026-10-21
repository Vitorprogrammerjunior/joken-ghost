// Tela de resultado da fase (vitória ou derrota).
import { Scene } from '../core/Scene.js';
import { GW, GH } from '../core/Renderer.js';
import { LEVELS, levelById } from '../config/levels.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { $, h, icon } from '../ui/dom.js';

export class ResultScene extends Scene {
  constructor(game) {
    super(game, 'screen-result');
    this.titleEl = $('result-title');
    this.starsEl = $('result-stars');
    this.statsEl = $('result-stats');
    this.noteEl = $('result-note');
    this.actionsEl = $('result-actions');
  }

  enter(r) {
    this.r = r;
    const lvl = levelById(r.levelId);
    this.scenery = new Scenery(this.game.assets, lvl.scenery);
    this.hunter = new Fighter(this.game.assets, { base: 'hunter', x: 300, y: GROUND_Y });
    this.hunter.play(r.won ? 'win' : 'ko', { loop: r.won, hold: !r.won });

    this.titleEl.textContent = r.won ? 'VITÓRIA!' : 'DERROTA...';
    this.titleEl.className = `result-title ${r.won ? 'win' : 'lose'}`;
    this.starsEl.replaceChildren(...(r.won ? [1, 2, 3].map(k => icon(k <= r.stars ? 'icon/estrela' : 'icon/estrela_vazia', `ico ico-lg star s${k}`)) : []));
    const row = (ico, label, value) => h('li', {}, icon(ico, 'ico ico-sm'), h('span', {}, label), h('b', {}, value));
    this.statsEl.replaceChildren(
      row('icon/moeda', 'Moedas ganhas', `+${r.coinsEarned}`),
      row('icon/coracao', 'Dano recebido', r.damageTaken),
      row('icon/espadas', 'Turnos', r.turns),
    );
    const next = levelById(r.levelId + 1);
    this.noteEl.textContent = !r.won ? 'Dica: abra o Monstruário e use a arma certa contra cada monstro.'
      : !next ? 'Você derrotou Kastle e libertou a mansão!'
      : r.unlockedNew ? `Nova fase liberada: ${next.name}!` : '';

    const btn = (label, cls, ico, fn) => h('button', { class: `btn ${cls}`, onclick: fn }, icon(ico), label);
    const actions = [];
    if (r.won && r.levelId < LEVELS.length) actions.push(btn('PRÓXIMA FASE', 'btn-primary', 'icon/jogar', () => this.game.go('story', { levelId: r.levelId + 1 })));
    if (r.won && r.levelId === LEVELS.length) actions.push(btn('VER FINAL', 'btn-primary', 'icon/trofeu', () => this.game.go('story', { ending: true })));
    if (!r.won) actions.push(btn('TENTAR DE NOVO', 'btn-primary', 'icon/repetir', () => this.game.go('battle', { levelId: r.levelId })));
    actions.push(btn('MAPA', '', 'icon/casa', () => this.game.go('map', { focus: r.levelId })));
    this.actionsEl.replaceChildren(...actions);
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
