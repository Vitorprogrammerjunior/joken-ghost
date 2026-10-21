// Monstruário: o que o jogador já descobriu sobre cada monstro.
// Os dados ficam dentro do perfil salvo (profile.bestiary).
import { BEHAVIOR_REVEAL_KILLS } from '../config/balance.js';
import { ENEMIES, ENEMY_ORDER } from '../config/enemies.js';

function entry(book, id) {
  return (book[id] ??= { seen: false, kills: 0, weak: [], resist: [] });
}

/** Marca o monstro como visto. Retorna true se for a primeira vez. */
export function see(book, id) {
  const e = entry(book, id);
  const first = !e.seen;
  e.seen = true;
  return first;
}

export function kill(book, id) {
  const e = entry(book, id);
  e.kills++;
  return e.kills === BEHAVIOR_REVEAL_KILLS; // acabou de revelar o comportamento
}

/** Registra uma fraqueza ('weak') ou resistência ('resist') descoberta. */
export function reveal(book, id, kind, weaponId) {
  const list = entry(book, id)[kind];
  if (list.includes(weaponId)) return false;
  list.push(weaponId);
  return true;
}

export function knownWeakness(book, id) {
  return book[id]?.weak ?? [];
}

/** Dados prontos para a tela do Monstruário. */
export function view(book, id) {
  const def = ENEMIES[id];
  const e = book[id];
  if (!e?.seen) return { id, known: false };
  return {
    id,
    known: true,
    name: def.name,
    sprite: def.sprite,
    boss: !!def.boss,
    desc: def.desc,
    hp: def.hp,
    damage: def.damage,
    kills: e.kills,
    weak: e.weak,
    resist: e.resist,
    behavior: e.kills >= BEHAVIOR_REVEAL_KILLS ? def.behavior : null,
    killsToBehavior: Math.max(0, BEHAVIOR_REVEAL_KILLS - e.kills),
  };
}

export function allViews(book) {
  return ENEMY_ORDER.map(id => view(book, id));
}

export function seenCount(book) {
  return ENEMY_ORDER.filter(id => book[id]?.seen).length;
}
