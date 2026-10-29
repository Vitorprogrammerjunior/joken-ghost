// Interface DOM da batalha (estilo Pokémon): caixas de vida, mensagem, ações, armas e loja.
import { $, h, icon, show, retrigger } from './dom.js';
import { WEAPON_LIST, ENEMY_MOVES, BEATS } from '../config/weapons.js';
import { ITEMS } from '../config/items.js';
import { relicById, relicText } from '../config/relics.js';
import { hpColor } from '../core/Renderer.js';

export class BattleHud {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {object} handlers { attack(weaponId), buy(itemId), bestiary(), pause(), toggleMute(), target(uid), cycleTarget() }
   */
  constructor(game, handlers) {
    this.game = game;
    this.handlers = handlers;
    this.hpFill = $('hud-hp-fill');
    this.hpGhost = $('hud-hp-ghost');
    this.hpText = $('hud-hp-text');
    this.status = $('hud-status');
    this.actions = $('actions');
    this.attackDrawer = $('attack-drawer');
    this.shopDrawer = $('shop-drawer');
    this.banner = $('battle-banner');
    this.bannerText = $('battle-banner-text');
    this.combo = $('combo');
    this.waveTag = $('wave-tag');
    this.enemyBoxes = $('enemy-boxes');
    this.logText = $('battle-log-text');
    this.boxes = new Map();
    this.open = null;

    this.economy = null;
    this.unbindEconomy = null;

    $('act-attack').addEventListener('click', () => this.toggle('attack'));
    $('act-shop').addEventListener('click', () => this.toggle('shop'));
    $('act-bestiary').addEventListener('click', () => handlers.bestiary());
    $('act-target').addEventListener('click', () => handlers.cycleTarget());
    $('battle-pause').addEventListener('click', () => handlers.pause());
    $('battle-mute').addEventListener('click', () => handlers.toggleMute());
    document.querySelectorAll('#screen-battle [data-close-drawer]').forEach(b => b.addEventListener('click', () => this.close()));

    this.#buildWeapons();
    this.#buildShop();
  }

  /** As moedas da batalha vêm do modo (o Desafio do Dia tem carteira própria). null desliga. */
  bindEconomy(economy) {
    this.unbindEconomy?.();
    this.economy = economy;
    this.unbindEconomy = economy?.onChange((coins) => {
      $('battle-coins').textContent = coins;
      this.refreshShop();
    }) ?? null;
    if (economy) $('battle-coins').textContent = economy.coins;
  }

  #buildWeapons() {
    this.weaponBtns = WEAPON_LIST.map((w) => {
      const beats = ENEMY_MOVES[BEATS[w.move]];
      const btn = h('button', { class: 'weapon-card', onclick: () => this.handlers.attack(w.id) },
        h('span', { class: 'key' }, w.key),
        icon(w.icon, 'ico ico-lg'),
        h('span', { class: 'weapon-name' }, w.name),
        h('span', { class: 'weapon-beats' }, 'vence ', icon(beats.icon, 'ico ico-xs'), beats.name),
        h('span', { class: 'weapon-tag hidden' }));
      btn.dataset.weapon = w.id;
      return btn;
    });
    $('weapon-grid').replaceChildren(...this.weaponBtns);
  }

  #buildShop() {
    this.shopBtns = ITEMS.map((it) => h('button', { class: 'shop-card', onclick: () => this.handlers.buy(it.id), dataset: { item: it.id } },
      icon(it.icon, 'ico ico-lg'),
      h('span', { class: 'shop-name' }, it.name),
      h('span', { class: 'shop-desc' }, it.desc),
      h('span', { class: 'shop-price' }, icon('icon/moeda', 'ico ico-xs'), it.price)));
    $('shop-grid').replaceChildren(...this.shopBtns);
  }

  refreshShop() {
    for (const btn of this.shopBtns) {
      const it = ITEMS.find(i => i.id === btn.dataset.item);
      btn.classList.toggle('poor', !this.economy?.canAfford(it.price));
      btn.classList.toggle('no-bag', this.bagLeft === 0);
    }
  }

  /** Quantos itens ainda dá para usar nesta fase. */
  setBag(left, total) {
    this.bagLeft = left;
    $('shop-bag-count').textContent = `${left}/${total}`;
    $('shop-bag').classList.toggle('empty', left === 0);
    this.refreshShop();
  }

  /** Marca nas armas o que o jogador já sabe sobre o alvo. */
  setWeaponHints(weak = [], resist = []) {
    for (const btn of this.weaponBtns) {
      const tag = btn.querySelector('.weapon-tag');
      const id = btn.dataset.weapon;
      const isWeak = weak.includes(id), isResist = resist.includes(id);
      show(tag, isWeak || isResist);
      tag.textContent = isWeak ? 'SUPER!' : isResist ? 'RESISTE' : '';
      tag.className = `weapon-tag ${isWeak ? 'good' : 'bad'}${isWeak || isResist ? '' : ' hidden'}`;
    }
  }

  toggle(which) {
    if (this.locked) return;
    if (this.open === which) { this.close(); return; }
    this.close();
    this.open = which;
    const el = which === 'attack' ? this.attackDrawer : this.shopDrawer;
    if (which === 'shop') this.refreshShop();
    show(el, true);
    retrigger(el, 'slide-in');
    $(which === 'attack' ? 'act-attack' : 'act-shop').classList.add('active');
  }

  close() {
    this.open = null;
    show(this.attackDrawer, false);
    show(this.shopDrawer, false);
    $('act-attack').classList.remove('active');
    $('act-shop').classList.remove('active');
  }

  lock(locked) {
    this.locked = locked;
    this.actions.classList.toggle('locked', locked);
    this.actions.querySelectorAll('button').forEach(b => { b.disabled = locked; });
    if (locked) this.close();
  }

  setHp(hp, max) {
    const ratio = hp / max;
    this.hpFill.style.width = `${ratio * 100}%`;
    this.hpFill.style.background = hpColor(ratio);
    this.hpText.textContent = `${hp}/${max}`;
    // barra "fantasma" que desce devagar mostrando o dano
    clearTimeout(this.ghostT);
    this.ghostT = setTimeout(() => { this.hpGhost.style.width = `${ratio * 100}%`; }, 400);
    $('screen-battle').classList.toggle('danger', ratio <= 0.3);
  }

  setStatus({ shield, empowered, revealed }) {
    const chips = [];
    if (shield) chips.push(h('span', { class: 'status-chip', title: 'Amuleto: bloqueia o próximo golpe' }, icon('icon/amuleto', 'ico ico-sm')));
    if (empowered) chips.push(h('span', { class: 'status-chip', title: 'Elixir: próximo acerto dobrado' }, icon('icon/elixir', 'ico ico-sm')));
    if (revealed) chips.push(h('span', { class: 'status-chip', title: 'Vela: ataque do alvo revelado' }, icon('icon/vela', 'ico ico-sm')));
    this.status.replaceChildren(...chips);
  }

  setWaveLabel(text) {
    this.waveTag.textContent = text;
    show(this.waveTag, !!text);
  }

  /** Relíquias da corrida (repetidas aparecem uma vez, com a quantidade). */
  setRelics(ids) {
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    $('relic-strip').replaceChildren(...[...counts].map(([id, n]) => {
      const relic = relicById(id);
      const levels = relic.levels.map((_, i) => relicText(id, i + 1)).slice(0, n);
      const title = `${relic.name} (nível ${n}/${relic.levels.length}): ${[...new Set(levels)].join(' ')}`;
      return h('span', { class: 'relic-chip', title }, icon(relic.icon, 'ico'), n > 1 ? h('b', {}, n) : null);
    }));
    show($('relic-strip'), ids.length > 0);
  }

  setCombo(n) {
    show(this.combo, n >= 2);
    if (n >= 2) { this.combo.textContent = `COMBO x${n}`; retrigger(this.combo, 'pop'); }
  }

  // ─── caixas dos monstros ──────────────────────────────────────
  /** Monta uma caixa por monstro da onda: [{ uid, name, ratio, boss, phases }]. */
  setEnemies(list) {
    this.boxes.clear();
    this.enemyBoxes.replaceChildren(...list.map((e) => {
      const fill = h('div', { class: 'hpbar-fill' });
      const pips = e.boss ? h('span', { class: 'boss-pips' }, ...Array.from({ length: e.phases }, () => h('i'))) : null;
      const box = h('div', { class: 'status-box enemy-box', onclick: () => this.handlers.target(e.uid) },
        h('div', { class: 'sb-head' }, h('span', { class: 'sb-name' }, e.name), pips),
        h('div', { class: 'sb-hp' }, h('b', {}, 'HP'), h('div', { class: 'hpbar' }, fill)));
      this.boxes.set(e.uid, { box, fill, pips });
      this.#paint(fill, e.ratio);
      return box;
    }));
  }

  #paint(fill, ratio) {
    fill.style.width = `${Math.max(0, ratio) * 100}%`;
    fill.style.background = hpColor(ratio);
  }

  setEnemyHp(uid, ratio, phase = null) {
    const b = this.boxes.get(uid);
    if (!b) return;
    this.#paint(b.fill, ratio);
    b.box.classList.toggle('dead', ratio <= 0);
    if (b.pips && phase != null) [...b.pips.children].forEach((p, i) => p.classList.toggle('on', i <= phase));
  }

  setTarget(uid) {
    for (const [id, b] of this.boxes) b.box.classList.toggle('target', id === uid);
  }

  // ─── mensagem da batalha (máquina de escrever) ────────────────
  say(text) {
    clearInterval(this.typeT);
    let i = 0;
    this.logText.textContent = '';
    this.typeT = setInterval(() => {
      i += 2;
      this.logText.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this.typeT);
    }, 16);
  }

  /** Faixa grande no meio da tela. `wait` usa o relógio da cena (respeita a pausa). */
  async showBanner(text, { ms = 1100, cls = '', wait = (t) => new Promise(r => setTimeout(r, t)) } = {}) {
    this.bannerText.textContent = text;
    this.banner.className = `banner ${cls}`;
    retrigger(this.banner, 'show');
    await wait(ms);
    this.banner.classList.add('hidden');
  }

  setMuted(muted) {
    $('battle-mute-ico').src = icon(muted ? 'icon/som_off' : 'icon/som_on').src;
  }
}
