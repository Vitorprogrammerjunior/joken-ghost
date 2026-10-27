// Janelas da campanha abertas pelo mapa: Oficina (melhorias) e Recompensas (estrelas).
import { $, h, icon } from './dom.js';
import { UPGRADES } from '../config/upgrades.js';
import { STAR_REWARDS } from '../config/rewards.js';
import { SKINS } from '../config/skins.js';
import { buyUpgrade, nextCost, upgradeLevel, totalStars, isRewardUnlocked } from '../domain/campaign.js';

export class CampaignModals {
  /** @param {import('../core/Game.js').Game} game  @param {import('./Modals.js').Modals} modals */
  constructor(game, modals) {
    this.game = game;
    this.modals = modals;
    game.bus.on('coins', () => { if (modals.isOpen('modal-workshop')) this.#renderWorkshop(); });
  }

  get profile() { return this.game.profile; }

  // ─── oficina ──────────────────────────────────────────────────
  openWorkshop({ onClose } = {}) {
    this.#renderWorkshop();
    this.modals.open('modal-workshop', { onClose });
  }

  #renderWorkshop() {
    $('workshop-grid').replaceChildren(...UPGRADES.map((up) => {
      const level = upgradeLevel(this.profile, up.id);
      const cost = nextCost(this.profile, up.id);
      const pips = h('span', { class: 'pips', title: `Nível ${level} de ${up.costs.length}` },
        ...up.costs.map((_, i) => h('i', { class: i < level ? 'on' : '' })));
      const action = cost == null
        ? h('span', { class: 'reward-tag' }, 'MÁXIMO')
        : h('button', {
          class: `btn btn-sm${this.game.economy.canAfford(cost) ? ' btn-primary' : ''}`,
          onclick: () => this.#buy(up),
        }, icon('icon/moeda', 'ico ico-xs'), cost);
      return h('div', { class: `up-card${cost == null ? ' maxed' : ''}` },
        icon(up.icon, 'ico'),
        h('b', {}, up.name),
        h('p', {}, up.desc),
        h('div', { class: 'up-foot' }, pips, action));
    }));
  }

  #buy(up) {
    const r = buyUpgrade(this.profile, this.game.economy, up.id);
    if (!r.ok) {
      this.game.audio.play('error');
      this.game.bus.emit('toast', r.reason);
      return;
    }
    this.game.audio.play('coin');
    this.game.saveProfile();
    this.game.bus.emit('toast', `${up.name}: nível ${r.level}!`);
    this.#renderWorkshop();
  }

  // ─── recompensas ──────────────────────────────────────────────
  openRewards({ onClose } = {}) {
    this.#renderRewards();
    this.modals.open('modal-rewards', { onClose });
  }

  #renderRewards() {
    const stars = totalStars(this.profile);
    $('rewards-sub').textContent = `Você tem ${stars} estrelas (somando o modo Pesadelo).`;
    $('reward-list').replaceChildren(...STAR_REWARDS.map((rw) => {
      const unlocked = isRewardUnlocked(this.profile, rw.id);
      return h('li', { class: `reward-row${unlocked ? '' : ' locked'}` },
        icon(rw.icon, 'ico'),
        h('div', {}, h('b', {}, rw.name), h('p', {}, rw.desc)),
        h('span', { class: 'reward-need' }, icon('icon/estrela', 'ico ico-xs'), rw.stars),
        unlocked ? this.#rewardAction(rw) : icon('icon/cadeado', 'ico ico-sm'));
    }));
  }

  #rewardAction(rw) {
    if (rw.kind !== 'skin') return h('span', { class: 'reward-tag' }, 'LIBERADO');
    const current = this.profile.skin === rw.id;
    return h('button', {
      class: `btn btn-sm${current ? '' : ' btn-primary'}`,
      onclick: () => this.#equipSkin(current ? null : rw.id),
    }, current ? 'TIRAR' : 'USAR');
  }

  #equipSkin(id) {
    this.profile.skin = id;
    this.game.saveProfile();
    this.game.audio.play('select');
    this.game.bus.emit('toast', id ? `Visual ${SKINS[id].name} equipado!` : 'Visual padrão equipado.');
    this.game.bus.emit('skin-changed');
    this.#renderRewards();
  }
}
