// Mapa de fases: caminho pontilhado ligando os quatro locais.
import { Scene } from '../core/Scene.js';
import { GW, GH, PX } from '../core/Renderer.js';
import { LEVELS } from '../config/levels.js';
import { Fighter } from '../world/Fighter.js';
import { $, h, icon } from '../ui/dom.js';

const NODES = [
  { x: 210, y: 470 },
  { x: 500, y: 330 },
  { x: 790, y: 470 },
  { x: 1070, y: 330 },
];

export class MapScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-map');
    this.ui = ui;
    this.nodesEl = $('map-nodes');
    $('map-back').addEventListener('click', () => game.go('menu'));
    $('map-bestiary').addEventListener('click', () => ui.bestiary.open());
    this.stars = Array.from({ length: 90 }, () => ({ x: Math.random() * GW, y: Math.random() * 300, p: Math.random() * 6 }));
  }

  enter({ focus } = {}) {
    const p = this.game.profile;
    this.unlocked = p.unlocked;
    this.focus = focus ?? Math.min(p.unlocked, LEVELS.length);
    const n = NODES[this.focus - 1];
    this.hunter = new Fighter(this.game.assets, { base: 'hunter', x: n.x - 120, y: n.y + 60, scale: PX });
    this.#buildNodes();
    this.game.audio.playMusic();
  }

  #buildNodes() {
    const p = this.game.profile;
    this.nodesEl.replaceChildren(...LEVELS.map((lvl, i) => {
      const n = NODES[i];
      const locked = lvl.id > p.unlocked;
      const stars = p.stars[lvl.id] || 0;
      const btn = h('button', {
        class: `map-node${locked ? ' locked' : ''}${lvl.id === this.focus ? ' current' : ''}`,
        style: { left: `${n.x - 80}px`, top: `${n.y - 80}px` },
        disabled: locked,
        title: lvl.name,
        onclick: () => this.#start(lvl.id),
        onpointerenter: () => { if (!locked) { this.focus = lvl.id; this.game.audio.play('hover'); } },
      },
      locked ? icon('icon/cadeado', 'ico ico-lg node-lock') : null,
      h('span', { class: 'node-num' }, lvl.id),
      h('span', { class: 'node-label' }, lvl.name),
      h('span', { class: 'node-stars' }, ...[1, 2, 3].map(k => icon(k <= stars ? 'icon/estrela' : 'icon/estrela_vazia', 'ico ico-xs'))));
      return btn;
    }));
  }

  #start(levelId) {
    this.game.audio.play('select');
    this.game.go('story', { levelId });
  }

  update(dt) {
    super.update(dt);
    this.hunter.update(dt);
    const n = NODES[this.focus - 1];
    // o caçador caminha até o nó escolhido
    const tx = n.x - 120, ty = n.y + 60;
    this.hunter.x += (tx - this.hunter.x) * Math.min(1, dt / 180);
    this.hunter.y += (ty - this.hunter.y) * Math.min(1, dt / 180);
    this.hunter.flipX = tx < this.hunter.x - 2;
  }

  render(r) {
    const ctx = r.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, GH);
    g.addColorStop(0, '#0b0618'); g.addColorStop(0.6, '#1d0f33'); g.addColorStop(1, '#0f2418');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GW, GH);
    for (const s of this.stars) r.rect(Math.round(s.x / PX) * PX, Math.round(s.y / PX) * PX, PX, PX, '#dbe8ff', 0.3 + 0.4 * Math.abs(Math.sin(this.time / 900 + s.p)));
    r.sprite('tile/moon', 0, 860, 120);
    r.tileRow('tile/tree_far', 560, { offset: 10, alpha: 0.9 });
    r.rect(0, 688, GW, 40, '#0d3340');

    // caminho pontilhado entre as fases
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i], b = NODES[i + 1];
      const open = i + 2 <= this.unlocked;
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 40;
        r.sprite('tile/path_dot', 0, x, y, { scale: PX, alpha: open ? 1 : 0.35 });
      }
    }
    LEVELS.forEach((lvl, i) => {
      const n = NODES[i];
      const locked = lvl.id > this.unlocked;
      const bob = lvl.id === this.focus ? Math.sin(this.time / 250) * 4 : 0;
      r.sprite(lvl.location, 0, n.x, n.y + bob, { scale: PX, tint: locked ? '#0e0b16' : null, tintAlpha: 0.6 });
    });
    this.hunter.draw(r);
  }

  onKey(e) {
    if (e.code === 'ArrowRight' || e.code === 'ArrowUp') { this.focus = Math.min(this.unlocked, this.focus + 1); this.game.audio.play('hover'); return true; }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowDown') { this.focus = Math.max(1, this.focus - 1); this.game.audio.play('hover'); return true; }
    if (e.code === 'Enter' || e.code === 'Space') { this.#start(this.focus); return true; }
    if (e.code === 'Escape') { this.game.go('menu'); return true; }
    return false;
  }
}
