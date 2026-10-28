// Junta os arquivos da campanha deste aparelho com os da nuvem. Sem rede: só decide.
import { SLOT_COUNT } from './progress.js';

/**
 * Como juntar:
 *   'newest'  os arquivos já são desta conta: em cada slot fica o salvo por último
 *   'remote'  primeira vez desta conta neste aparelho: a nuvem ganha; o aparelho só preenche slots vazios
 *   'replace' os arquivos daqui são de outra conta: o aparelho fica igual à nuvem
 * @typedef {{ slot: number, data: object|null, updatedAt: string|null }} SaveEntry  data null = vazio/apagado
 * @param {SaveEntry[]} local
 * @param {SaveEntry[]} remote
 * @param {{ mode?: 'newest'|'remote'|'replace', busy?: number|null, slots?: number }} [o]
 *   busy: slot em jogo agora (não é trocado por baixo do jogador)
 * @returns {{ toLocal: SaveEntry[], toCloud: SaveEntry[] }}
 */
export function mergeSaves(local, remote, { mode = 'newest', busy = null, slots = SLOT_COUNT } = {}) {
  const toLocal = [];
  const toCloud = [];
  const none = (slot) => ({ slot, data: null, updatedAt: null });
  for (let slot = 1; slot <= slots; slot++) {
    const l = local.find(e => e.slot === slot) ?? none(slot);
    const r = remote.find(e => e.slot === slot) ?? none(slot);
    if (mode === 'replace') {
      if (l.updatedAt !== r.updatedAt || !!l.data !== !!r.data) toLocal.push(r);
      continue;
    }
    if (l.updatedAt === r.updatedAt) continue;
    const localWins = mode === 'remote'
      ? !r.data // nunca perde um arquivo daqui por um slot vazio ou apagado na nuvem
      :!r.updatedAt || (!!l.updatedAt && l.updatedAt > r.updatedAt);
    if (localWins) { if (l.updatedAt) toCloud.push(l); }
    else if (slot !== busy) toLocal.push(r);
  }
  return { toLocal, toCloud };
}
