// Oficina e recompensas da campanha: o que o perfil já comprou e liberou.
// O perfil é o save do jogador (domain/progress.js).
import { UPGRADES, upgradeById } from '../config/upgrades.js';
import { STAR_REWARDS, DIFFICULTIES } from '../config/rewards.js';
import { levelById } from '../config/levels.js';
import { buildStats } from './loadout.js';

export function upgradeLevel(profile, id) {
  return profile.upgrades?.[id] ?? 0;
}

/** Preço do próximo nível, ou null se já está no máximo. */
export function nextCost(profile, id) {
  const up = upgradeById(id);
  return up?.costs[upgradeLevel(profile, id)] ?? null;
}

/** Compra o próximo nível de uma melhoria. Retorna { ok, reason?, level }. */
export function buyUpgrade(profile, economy, id) {
  const cost = nextCost(profile, id);
  if (!upgradeById(id)) return { ok: false, reason: 'Melhoria desconhecida.' };
  if (cost == null) return { ok: false, reason: 'Esta melhoria já está no máximo!' };
  if (!economy.spend(cost)) return { ok: false, reason: 'Moedas insuficientes!' };
  profile.upgrades = { ...profile.upgrades, [id]: upgradeLevel(profile, id) + 1 };
  return { ok: true, level: profile.upgrades[id] };
}

/** Modificadores das melhorias compradas (um por nível). */
export function upgradeMods(profile) {
  return UPGRADES.flatMap(up => Array.from({ length: upgradeLevel(profile, up.id) }, () => up.mod));
}

// ─── estrelas e recompensas ─────────────────────────────────────
export function totalStars(profile) {
  const sum = (book) => Object.values(book ?? {}).reduce((s, n) => s + n, 0);
  return sum(profile.stars) + sum(profile.starsHard);
}

export function isRewardUnlocked(profile, id) {
  const reward = STAR_REWARDS.find(r => r.id === id);
  return !!reward && totalStars(profile) >= reward.stars;
}

/** Próxima recompensa ainda bloqueada (ou null). */
export function nextReward(profile) {
  const stars = totalStars(profile);
  return STAR_REWARDS.find(r => r.stars > stars) ?? null;
}

/** A fase pode ser jogada? A bônus depende da recompensa; as outras, do progresso. */
export function isLevelOpen(profile, levelId) {
  const lvl = levelById(levelId);
  if (!lvl) return false;
  return lvl.bonus ? isRewardUnlocked(profile, lvl.reward) : levelId <= profile.unlocked;
}

/** Dificuldade escolhida no mapa (só vale se o Pesadelo já foi liberado). */
export function difficultyOf(profile) {
  return profile.hard && isRewardUnlocked(profile, 'pesadelo') ? DIFFICULTIES.pesadelo : DIFFICULTIES.normal;
}

/** Atributos do Caçador numa fase da campanha: melhorias da oficina, dificuldade e a própria fase. */
export function campaignStats(profile, level = null) {
  const levelMods = level ? [{ mult: { coinMult: level.coinScale ?? 1 } }, ...(level.mods ?? [])] : [];
  return buildStats([...upgradeMods(profile), ...difficultyOf(profile).mods, ...levelMods]);
}
