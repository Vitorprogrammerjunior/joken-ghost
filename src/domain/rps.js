import { BEATS, MOVES } from '../config/weapons.js';

/** Resultado do ponto de vista de `a`: 'win' | 'lose' | 'draw'. */
export function outcome(a, b) {
  if (a === b) return 'draw';
  return BEATS[a] === b ? 'win' : 'lose';
}

/** Jogada que vence `move`. */
export function counterOf(move) {
  return MOVES.find(m => BEATS[m] === move);
}
