// Carta de perk estilo baralho. Passar o mouse (ou tocar) revela o que ela faz.
import { h, icon } from './dom.js';
import { Assets } from '../core/Assets.js';
import { RARITY, cardIcon } from '../config/multiplayer.js';

/**
 * @param {{ id, name, rarity, desc, trophies }} card  (catálogo do servidor)
 * @param {object} o
 * @param {'lg'|'md'|'sm'} [o.size]
 * @param {boolean} [o.locked]   mostra o verso com os troféus necessários
 * @param {boolean} [o.faceDown] verso sem informação (antes de virar)
 * @param {() => void} [o.onPick]
 */
export function cardEl(card, { size = 'md', locked = false, faceDown = false, onPick = null } = {}) {
  const back = locked || faceDown;
  const frame = back ? 'card/card_verso' : RARITY[card.rarity]?.frame ?? RARITY.comum.frame;
  const el = h(onPick ? 'button' : 'div', {
    class: `pcard pcard-${size} r-${card.rarity}${locked ? ' locked' : ''}${faceDown ? ' face-down' : ''}`,
    style: { backgroundImage: `url(${Assets.url(frame)})` },
    onclick: onPick ? () => onPick(card) : null,
    'aria-label': back ? 'Carta bloqueada' : `${card.name}: ${card.desc}`,
  },
  back ? null : icon(cardIcon(card.id), 'pcard-icon'),
  back ? null : h('span', { class: 'pcard-name' }, card.name),
  back || card.cost == null ? null : h('span', { class: 'pcard-cost', title: `${card.cost} ponto(s) da build` }, card.cost),
  locked ? h('span', { class: 'pcard-lock' }, icon('icon/cadeado', 'ico ico-sm'), `${card.trophies}`, icon('icon/trofeu', 'ico ico-xs')) : null,
  faceDown ? null : h('div', { class: 'pcard-tip' },
    h('b', {}, locked ? '???' : card.name),
    h('span', { class: `tip-rarity r-${card.rarity}` }, RARITY[card.rarity]?.name ?? ''),
    h('p', {}, locked ? `Desbloqueie com ${card.trophies} troféus.` : card.desc)));
  // no celular o primeiro toque só mostra a descrição
  if (onPick) {
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !el.classList.contains('inspect')) {
        document.querySelectorAll('.pcard.inspect').forEach(c => c.classList.remove('inspect'));
        el.classList.add('inspect');
        e.preventDefault();
        el.dataset.skipClick = '1';
      }
    });
    el.addEventListener('click', (e) => {
      if (el.dataset.skipClick) { delete el.dataset.skipClick; e.stopImmediatePropagation(); }
    }, { capture: true });
  }
  return el;
}

/** Vira a carta (verso -> frente) com animação. */
export function flipIn(el, card, delay = 0) {
  setTimeout(() => {
    el.classList.add('flipping');
    setTimeout(() => {
      el.classList.remove('face-down');
      el.style.backgroundImage = `url(${Assets.url(RARITY[card.rarity]?.frame ?? RARITY.comum.frame)})`;
      el.prepend(icon(cardIcon(card.id), 'pcard-icon'));
      el.querySelector('.pcard-icon').after(h('span', { class: 'pcard-name' }, card.name));
      if (card.cost != null) el.append(h('span', { class: 'pcard-cost' }, card.cost));
      el.append(h('div', { class: 'pcard-tip' }, h('b', {}, card.name), h('span', { class: `tip-rarity r-${card.rarity}` }, RARITY[card.rarity]?.name ?? ''), h('p', {}, card.desc)));
    }, 150);
    setTimeout(() => el.classList.remove('flipping'), 320);
  }, delay);
}
