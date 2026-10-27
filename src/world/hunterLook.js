// Aparência do Caçador na campanha: o personagem escolhido no multiplayer
// com o visual (skin) liberado pelas estrelas do save atual.
import { selectedCharacter } from '../config/characters.js';
import { SKINS, SKIN_KEEP } from '../config/skins.js';
import { isRewardUnlocked } from '../domain/campaign.js';

const hex = (r, g, b) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/** Troca cada cor da roupa pela cor da rampa com o mesmo brilho. */
function skinRecolor(skin) {
  const keep = new Set(SKIN_KEEP);
  const ramp = skin.ramp.map(rgb);
  return (r, g, b) => {
    if (keep.has(hex(r, g, b))) return null;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 256;
    return ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length * 1.15))];
  };
}

/**
 * Prefixo das folhas do Caçador (ex.: 'char/luna~dourado/back') para a vista pedida.
 * @param {import('../core/Game.js').Game} game  @param {'back'|'side'} view
 */
export function hunterBase(game, view) {
  const prefix = `char/${selectedCharacter(game.storage)}`;
  const skin = SKINS[game.profile?.skin];
  if (!skin || !isRewardUnlocked(game.profile, skin.id)) return `${prefix}/${view}`;
  return `${game.assets.variant(prefix, skin.id, skinRecolor(skin))}/${view}`;
}
