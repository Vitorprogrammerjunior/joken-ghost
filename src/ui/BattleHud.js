// Interface DOM da batalha: vida, moedas, ações, gavetas de armas e loja.
import { $, h, icon, show, retrigger } from './dom.js';
import { WEAPON_LIST, ENEMY_MOVES, BEATS } from '../config/weapons.js';
import { ITEMS } from '../config/items.js';
import { hpColor } from '../core/Renderer.js';

export class BattleHud {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {object} handlers { attack(weaponId), buy(itemId), bestiary(), pause(), toggleMute() }
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
    this.targetHint = $('target-hint');
    this.open = null;

    $('act-attack').addEventListener('click', () => this.toggle('attack'));
    $('act-shop').addEventListener('click', () => this.toggle('shop'));
    $('act-bestiary').addEventListener('click', () => handlers.bestiary());
    $('battle-pause').addEventListener('click', () => handlers.pause());
    $('battle-mute').addEventListener('click', () => handlers.toggleMute());
    document.querySelectorAll('#screen-battle [data-close-drawer]').forEach(b => b.addEventListener('click', () => this.close()));

    this.#buildWeapons();
    this.#buildShop();
    game.bus.on('coins', () => this.refreshShop());
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
      btn.classList.toggle('poor', !this.game.economy.canAfford(it.price));
    }
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

  setWave(i, total) {
    this.waveTag.textContent = total > 1 ? `ONDA ${i + 1}/${total}` : '';
    show(this.waveTag, total > 1);
  }

  setCombo(n) {
    show(this.combo, n >= 2);
    if (n >= 2) { this.combo.textContent = `COMBO x${n}`; retrigger(this.combo, 'pop'); }
  }

  setTargetHint(text) {
    this.targetHint.textContent = text;
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
