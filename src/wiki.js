// Preenche a wiki com os mesmos dados do jogo (nunca fica desatualizada).
import { ENEMIES, ENEMY_ORDER } from './config/enemies.js';
import { ITEMS } from './config/items.js';
import { LEVELS } from './config/levels.js';
import { WEAPON_LIST, WEAPONS, ENEMY_MOVES, BEATS } from './config/weapons.js';
import { PERKS } from './config/multiplayer.js';
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
  h('h3', {}, icon(l.location, 'ico ico-lg'), `${l.id}. ${l.name}`),
  ...l.waves.map((wave, i) => h('div', { class: 'chips' }, `Onda ${i + 1}: `,
    ...wave.map(id => h('span', { class: 'chip' }, ENEMIES[id].name)))))));

$('perks').replaceChildren(...Object.entries(PERKS).map(([id, p]) => h('article', { class: 'card' },
  h('h3', {}, icon(`icon/perk_${id}`, 'ico ico-lg'), p.name),
  h('p', { class: 'muted' }, p.desc))));
