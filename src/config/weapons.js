// Pedra, papel e tesoura com a roupagem do JokenGhost.

export const MOVES = ['pedra', 'papel', 'tesoura'];

/** Quem vence quem: BEATS[a] === b significa "a vence b". */
export const BEATS = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

/** Armas do Caçador (uma para cada jogada). */
export const WEAPONS = {
  estaca: {
    id: 'estaca', move: 'pedra', key: '1', name: 'Estaca',
    icon: 'icon/estaca', fx: 'fx/estaca', projectile: 'fx/proj_estaca',
    desc: 'Arremessa uma estaca de madeira benta.',
  },
  aspirador: {
    id: 'aspirador', move: 'papel', key: '2', name: 'Aspirador',
    icon: 'icon/aspirador', fx: 'fx/aspirador',
    desc: 'Suga a energia espiritual do alvo.',
  },
  cruz: {
    id: 'cruz', move: 'tesoura', key: '3', name: 'Cruz',
    icon: 'icon/cruz', fx: 'fx/cruz',
    desc: 'Explosão de luz sagrada.',
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);
export const weaponForMove = (move) => WEAPON_LIST.find(w => w.move === move);

/** Ataques dos monstros (mesmas três jogadas). */
export const ENEMY_MOVES = {
  pedra: { move: 'pedra', name: 'Possessão', icon: 'icon/possessao', fx: 'fx/possessao' },
  papel: { move: 'papel', name: 'Assombração', icon: 'icon/assombracao', fx: 'fx/assombracao' },
  tesoura: { move: 'tesoura', name: 'Maldição', icon: 'icon/maldicao', fx: 'fx/maldicao' },
};

/**
 * Poderes espectrais dos duelos: caçador contra caçador usa a força dos fantasmas, não as armas.
 * São as mesmas três jogadas, com as ids que o servidor usa para as armas.
 */
export const POWERS = Object.fromEntries(WEAPON_LIST.map(w => [w.id, { ...ENEMY_MOVES[w.move], id: w.id, key: w.key, beats: ENEMY_MOVES[BEATS[w.move]] }]));
export const POWER_LIST = Object.values(POWERS);
