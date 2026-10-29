// Mapa de fases: cada ato é uma página com o caminho pontilhado ligando os locais.
// Também abre a Oficina, as Recompensas e liga o modo Pesadelo.
import { hunterBase } from '../world/hunterLook.js';
import { Scene } from '../core/Scene.js';
import { GW, GH, PX } from '../core/Renderer.js';
import { ACTS, levelById } from '../config/levels.js';
import { ENDLESS } from '../config/runs.js';
import { Fighter } from '../world/Fighter.js';
import { difficultyOf, isLevelOpen, isRewardUnlocked, nextCost, nextReward, totalStars } from '../domain/campaign.js';
import { UPGRADES } from '../config/upgrades.js';
import { $, h, icon, show } from '../ui/dom.js';

/** Posições dos locais em cada página do mapa; a fase bônus fica no alto, à esquerda. */
const NODES = [
  { x: 210, y: 470 },
  { x: 500, y: 330 },
  { x: 790, y: 470 },
  { x: 1070, y: 330 },
];
const BONUS_NODE = { x: 230, y: 215 };

/** Céu de cada ato (topo, meio, chão). */
const SKIES = {
  1: ['#0b0618', '#1d0f33', '#0f2418'],
  2: ['#12030a', '#2a0b22', '#1a0f26'],
};

export class MapScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-map');
    this.ui = ui;
    this.nodesEl = $('map-nodes');
    $('map-back').addEventListener('click', () => game.go('menu'));
    $('map-bestiary').addEventListener('click', () => ui.bestiary.open());
    $('map-workshop').addEventListener('click', () => ui.campaign.openWorkshop());
    $('map-rewards').addEventListener('click', () => this.#openRewards());
    $('map-stars').addEventListener('click', () => this.#openRewards());
    $('map-hard').addEventListener('click', () => this.#toggleHard());
    $('map-endless').addEventListener('click', () => this.#startRun('endless'));
    $('map-daily').addEventListener('click', () => ui.daily.open());
    $('map-act-prev').addEventListener('click', () => this.#showAct(this.act - 1));
    $('map-act-next').addEventListener('click', () => this.#showAct(this.act + 1));
    game.bus.on('skin-changed', () => { if (game.scene === this) this.#makeHunter(); });
    this.stars = Array.from({ length: 90 }, () => ({ x: Math.random() * GW, y: Math.random() * 300, p: Math.random() * 6 }));
  }

  get profile() { return this.game.profile; }

  music() { return 'mapa'; }

  /** @param {{ focus?: number, workshop?: boolean }} params  workshop: voltou de uma fase, a Oficina já abre */
  enter({ focus, workshop = false } = {}) {
    const p = this.profile;
    this.focus = focus ?? Math.min(p.unlocked, ACTS.at(-1).levels.at(-1));
    this.act = this.#actOf(this.focus).id;
    this.#makeHunter();
    this.#render();
    // só se ainda houver melhoria para comprar
    if (workshop && UPGRADES.some(up => nextCost(p, up.id) != null)) setTimeout(() => { if (this.game.scene === this) this.ui.campaign.openWorkshop(); }, 350);
  }

  #actOf(levelId) { return ACTS.find(a => a.levels.includes(levelId)) ?? ACTS[0]; }
  get #acts() { return ACTS.filter(a => a.id === 1 || isLevelOpen(this.profile, a.levels[0])); }
  get #page() { return ACTS.find(a => a.id === this.act); }

  #nodeOf(levelId) {
    const lvl = levelById(levelId);
    if (lvl.bonus) return BONUS_NODE;
    return NODES[this.#page.levels.filter(id => !levelById(id).bonus).indexOf(levelId)];
  }

  #makeHunter() {
    const n = this.#nodeOf(this.focus);
    this.hunter = new Fighter(this.game.assets, { base: hunterBase(this.game, 'side'), x: n.x - 120, y: n.y + 60, scale: PX });
  }

  #showAct(id) {
    const act = this.#acts.find(a => a.id === id);
    if (!act) return;
    this.act = id;
    this.game.audio.play('hover');
    const open = act.levels.filter(l => isLevelOpen(this.profile, l));
    this.focus = open.at(-1) ?? act.levels[0];
    this.#makeHunter();
    this.#render();
  }

  // ─── interface ────────────────────────────────────────────────
  #render() {
    const p = this.profile;
    const hard = difficultyOf(p).id === 'pesadelo';
    const book = hard ? p.starsHard : p.stars;
    this.nodesEl.replaceChildren(...this.#page.levels.map((id) => {
      const lvl = levelById(id);
      const n = this.#nodeOf(id);
      const locked = !isLevelOpen(p, id);
      const stars = book[id] || 0;
      return h('button', {
        class: `map-node${locked ? ' locked' : ''}${lvl.bonus ? ' bonus' : ''}${id === this.focus ? ' current' : ''}`,
        style: { left: `${n.x - 80}px`, top: `${n.y - 80}px` },
        disabled: locked,
        title: lvl.name,
        onclick: () => this.#start(id),
        onpointerenter: () => { if (!locked) { this.focus = id; this.game.audio.play('hover'); } },
      },
      locked ? icon('icon/cadeado', 'ico ico-lg node-lock') : null,
      h('span', { class: 'node-num' }, lvl.bonus ? '★' : id),
      h('span', { class: 'node-label' }, lvl.name),
      h('span', { class: 'node-stars' }, ...[1, 2, 3].map(k => icon(k <= stars ? 'icon/estrela' : 'icon/estrela_vazia', 'ico ico-xs'))));
    }));

    $('map-act-title').textContent = this.#page.name;
    show($('map-act-prev'), this.#acts.some(a => a.id === this.act - 1));
    show($('map-act-next'), this.#acts.some(a => a.id === this.act + 1));

    $('map-star-count').textContent = totalStars(p);
    const next = nextReward(p);
    $('map-next-reward').textContent = next ? `próximo: ${next.name} (${next.stars})` : 'tudo liberado!';
    $('map-stars').title = next ? `Faltam ${next.stars - totalStars(p)} estrelas para ${next.name}` : 'Todas as recompensas liberadas';
    const hardBtn = $('map-hard');
    show(hardBtn, isRewardUnlocked(p, 'pesadelo'));
    hardBtn.classList.toggle('on', hard);
    $('screen-map').classList.toggle('hard', hard);
    const endlessOpen = p.unlocked >= ENDLESS.unlockLevel;
    $('map-endless').disabled = !endlessOpen;
    $('map-endless').title = endlessOpen ? `Ondas infinitas com relíquias. Recorde: ${p.endless.best} ondas` : `Libera ao chegar na fase ${ENDLESS.unlockLevel}`;
  }

  #startRun(kind) {
    this.game.audio.play('select');
    this.game.go('battle', { run: kind });
  }

  #openRewards() {
    this.ui.campaign.openRewards({ onClose: () => this.#render() });
  }

  #toggleHard() {
    this.profile.hard = !this.profile.hard;
    this.game.saveProfile();
    this.game.audio.play(this.profile.hard ? 'phase' : 'select');
    this.#render();
  }

  #start(levelId) {
    this.game.audio.play('select');
    this.game.go('story', { levelId });
  }

  // ─── canvas ───────────────────────────────────────────────────
  update(dt) {
    super.update(dt);
    this.hunter.update(dt);
    const n = this.#nodeOf(this.focus);
    // o caçador caminha até o nó escolhido
    const tx = n.x - 120, ty = n.y + 60;
    this.hunter.x += (tx - this.hunter.x) * Math.min(1, dt / 180);
    this.hunter.y += (ty - this.hunter.y) * Math.min(1, dt / 180);
    this.hunter.flipX = tx < this.hunter.x - 2;
  }

  render(r) {
    const ctx = r.ctx;
    const [top, mid, ground] = SKIES[this.act] ?? SKIES[1];
    const g = ctx.createLinearGradient(0, 0, 0, GH);
    g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, ground);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GW, GH);
    for (const s of this.stars) r.rect(Math.round(s.x / PX) * PX, Math.round(s.y / PX) * PX, PX, PX, '#dbe8ff', 0.3 + 0.4 * Math.abs(Math.sin(this.time / 900 + s.p)));
    r.sprite('tile/moon', 0, 860, 120, { tint: this.act === 2 ? '#d23a3a' : null, tintAlpha: 0.45 });
    r.tileRow('tile/tree_far', 560, { offset: 10, alpha: 0.9 });
    r.rect(0, 688, GW, 40, this.act === 2 ? '#2a0b22' : '#0d3340');

    // caminho pontilhado entre as fases do ato
    const main = this.#page.levels.filter(id => !levelById(id).bonus);
    for (let i = 0; i < main.length - 1; i++) {
      const a = this.#nodeOf(main[i]), b = this.#nodeOf(main[i + 1]);
      const open = isLevelOpen(this.profile, main[i + 1]);
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 40;
        r.sprite('tile/path_dot', 0, x, y, { scale: PX, alpha: open ? 1 : 0.35 });
      }
    }
    for (const id of this.#page.levels) {
      const lvl = levelById(id);
      const n = this.#nodeOf(id);
      const locked = !isLevelOpen(this.profile, id);
      const bob = id === this.focus ? Math.sin(this.time / 250) * 4 : 0;
      r.sprite(lvl.location, 0, n.x, n.y + bob, { scale: PX, tint: locked ? '#0e0b16' : null, tintAlpha: 0.6 });
    }
    this.hunter.draw(r);
  }

  onKey(e) {
    const open = this.#page.levels.filter(id => isLevelOpen(this.profile, id));
    const i = open.indexOf(this.focus);
    if (e.code === 'ArrowRight' || e.code === 'ArrowUp') {
      if (i < open.length - 1) { this.focus = open[i + 1]; this.game.audio.play('hover'); } else this.#showAct(this.act + 1);
      return true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowDown') {
      if (i > 0) { this.focus = open[i - 1]; this.game.audio.play('hover'); } else this.#showAct(this.act - 1);
      return true;
    }
    if (e.code === 'Enter' || e.code === 'Space') { this.#start(this.focus); return true; }
    if (e.code === 'Escape') { this.game.go('menu'); return true; }
    return false;
  }
}
