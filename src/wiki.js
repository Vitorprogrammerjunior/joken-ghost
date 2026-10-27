// Preenche a wiki com os mesmos dados do jogo (nunca fica desatualizada).
import { ENEMIES, ENEMY_ORDER } from './config/enemies.js';
import { ITEMS } from './config/items.js';
import { LEVELS } from './config/levels.js';
import { UPGRADES } from './config/upgrades.js';
import { STAR_REWARDS } from './config/rewards.js';
import { RELICS } from './config/relics.js';
import { WEAPON_LIST, WEAPONS, ENEMY_MOVES, BEATS } from './config/weapons.js';
import { serverUrl, leagueIcon, MODES } from './config/multiplayer.js';
import { cardEl } from './ui/Card.js';
import { SPRITES, FRAME_SIZE } from './config/sprites.generated.js';
import { $, h, icon } from './ui/dom.js';

/** Sprite animada (idle) num canvas. */
function animated(key, size = 128) {
  const c = h('canvas', { width: FRAME_SIZE, height: FRAME_SIZE, style: { width: `${size}px`, height: `${size}px` } });
  const ctx = c.getContext('2d');
  const img = new Image();
  img.src = SPRITES[key].src;
  const frames = SPRITES[key].frames;
  const loop = (t) => {
    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    ctx.drawImage(img, (Math.floor(t / 160) % frames) * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
    requestAnimationFrame(loop);
  };
  img.onload = () => requestAnimationFrame(loop);
  return c;
}

$('hero').replaceChildren(animated('enemy/fantasma/idle', 192));

const weaponChip = (id, cls) => h('span', { class: `chip ${cls}` }, icon(WEAPONS[id].icon, 'ico ico-sm'), WEAPONS[id].name);

$('rules').replaceChildren(...WEAPON_LIST.map(w => {
  const beaten = ENEMY_MOVES[BEATS[w.move]];
  return h('div', { class: 'rule' }, icon(w.icon), h('span', {}, h('b', {}, w.name), h('br'), 'vence'), icon(beaten.icon), h('span', {}, beaten.name));
}));

$('monsters').replaceChildren(...ENEMY_ORDER.map(id => {
  const e = ENEMIES[id];
  const weak = e.phases ? e.phases.map(p => p.weakness) : [e.weakness];
  const resist = e.phases ? e.phases.map(p => p.resist) : [e.resist];
  return h('article', { class: 'card' },
    animated(`${e.sprite}/idle`),
    h('h3', {}, e.name, e.boss ? h('span', { class: 'chip bad' }, 'CHEFE') : null),
    h('p', { class: 'muted' }, e.desc),
    h('div', { class: 'stat' }, h('span', {}, icon('icon/coracao', 'ico ico-xs'), ` Vida ${e.hp}`), h('span', {}, icon('icon/espadas', 'ico ico-xs'), ` Dano ${e.damage}`)),
    h('details', {},
      h('summary', {}, 'Ver fraquezas (spoiler)'),
      h('div', { class: 'chips' }, 'Fraco: ', ...weak.map(w => weaponChip(w, 'good'))),
      h('div', { class: 'chips' }, 'Resiste: ', ...resist.map(w => weaponChip(w, 'bad'))),
      h('p', { class: 'muted' }, e.behavior)));
}));

$('items').replaceChildren(...ITEMS.map(it => h('article', { class: 'card' },
  h('h3', {}, icon(it.icon, 'ico ico-lg'), it.name),
  h('p', { class: 'muted' }, it.desc),
  h('div', { class: 'stat' }, icon('icon/moeda', 'ico ico-xs'), ` ${it.price} moedas`))));

$('levels').replaceChildren(...LEVELS.map(l => h('article', { class: 'card' },
  h('h3', {}, icon(l.location, 'ico ico-lg'), l.bonus ? `Bônus: ${l.name}` : `${l.id}. ${l.name}`),
  ...l.waves.map((wave, i) => h('div', { class: 'chips' }, `Onda ${i + 1}: `,
    ...wave.map(id => h('span', { class: 'chip' }, ENEMIES[id].name)))))));

$('upgrades').replaceChildren(...UPGRADES.map(u => h('article', { class: 'card' },
  h('h3', {}, icon(u.icon, 'ico ico-lg'), u.name),
  h('p', { class: 'muted' }, u.desc),
  h('div', { class: 'stat' }, icon('icon/moeda', 'ico ico-xs'), ` ${u.costs.join(' / ')} moedas`))));

$('rewards').replaceChildren(...STAR_REWARDS.map(r => h('article', { class: 'card' },
  h('h3', {}, icon(r.icon, 'ico ico-lg'), r.name),
  h('p', { class: 'muted' }, r.desc),
  h('div', { class: 'stat' }, icon('icon/estrela', 'ico ico-xs'), ` ${r.stars} estrelas`))));

$('relics').replaceChildren(...RELICS.map(r => h('article', { class: 'card' },
  h('h3', {}, icon(r.icon, 'ico ico-lg'), r.name),
  h('p', { class: 'muted' }, r.desc))));

$('mp-modes').replaceChildren(...Object.values(MODES).map(m => h('article', { class: 'card' },
  h('h3', {}, icon(m.icon, 'ico ico-lg'), m.name),
  h('p', { class: 'muted' }, m.desc))));

// Multiplayer: catálogo e ranking vêm do servidor
fetch(`${serverUrl()}/api/catalog`).then(r => r.json()).then(({ cards, characters }) => {
  $('mp-cards').replaceChildren(...cards.map(c => {
    const wrap = h('div', { class: 'wiki-card' }, cardEl(c, { size: 'md' }), h('small', {}, icon('icon/trofeu', 'ico ico-xs'), ` ${c.trophies}`));
    return wrap;
  }));
  $('mp-chars').replaceChildren(...characters.map(c => h('article', { class: 'card' },
    animated(`char/${c.id}/side/idle`),
    h('h3', {}, c.name),
    h('p', { class: 'muted' }, c.passive),
    h('div', { class: 'stat' }, icon('icon/trofeu', 'ico ico-xs'), ` ${c.trophies} troféus`))));
}).catch(() => { $('mp-cards').replaceChildren(h('p', { class: 'lead' }, 'Servidor do multiplayer indisponível agora.')); });

fetch(`${serverUrl()}/api/ranking`).then(r => r.json()).then((top) => {
  $('mp-rank').replaceChildren(...(top.length ? top.slice(0, 10).map(p => h('li', {},
    h('span', {}, `${p.rank}º`), icon(leagueIcon(p.league), 'ico ico-sm'), h('span', {}, p.nickname), h('b', {}, `${p.trophies} `, icon('icon/trofeu', 'ico ico-xs'))))
    : [h('li', {}, 'Ninguém no ranking ainda. Seja o primeiro!')]));
}).catch(() => {});
