// Atributos do Caçador numa batalha. Melhorias da oficina, relíquias da Noite Sem Fim
// e a dificuldade são listas de modificadores que viram um único objeto de atributos.
import { DAMAGE, LOOT, PLAYER } from '../config/balance.js';

/** Atributos sem nenhum modificador. */
export function baseStats() {
  return {
    maxHp: PLAYER.maxHp,
    healBetweenWaves: PLAYER.healBetweenWaves,
    itemSlots: PLAYER.itemSlots,
    weaponBonus: { estaca: 0, aspirador: 0, cruz: 0 }, // dano extra por arma
    sideHitMult: DAMAGE.sideHitMult,                   // golpes dos monstros que não são o alvo
    enemyHpMult: 1,
    enemyDamageMult: 1,
    coinMult: 1,
    dropChance: LOOT.dropChance, // chance de um monstro derrotado deixar +1 item na bolsa
    healOnKill: 0,        // vida ao derrotar um monstro
    drawDamage: 0,        // dano no alvo quando empata
    thorns: 0,            // dano devolvido a quem acerta o Caçador
    comboDamage: 0,       // dano extra por vitória seguida
    waveShield: false,    // Amuleto grátis no começo de cada onda
    waveReveal: false,    // Vela grátis no começo de cada onda
  };
}

/**
 * Aplica modificadores sobre os atributos base.
 * Cada modificador: { add?: {caminho: n}, mult?: {caminho: n}, set?: {caminho: valor} }.
 * O caminho aceita um nível de ponto, como 'weaponBonus.cruz'.
 */
export function buildStats(mods = []) {
  const stats = baseStats();
  for (const mod of mods) {
    for (const [path, v] of Object.entries(mod.add ?? {})) update(stats, path, (x) => x + v);
    for (const [path, v] of Object.entries(mod.mult ?? {})) update(stats, path, (x) => x * v);
    for (const [path, v] of Object.entries(mod.set ?? {})) update(stats, path, () => v);
  }
  return stats;
}

function update(stats, path, fn) {
  const [key, sub] = path.split('.');
  if (!(key in stats)) throw new Error(`Atributo desconhecido: ${path}`);
  if (sub == null) stats[key] = fn(stats[key]);
  else {
    if (!(sub in stats[key])) throw new Error(`Atributo desconhecido: ${path}`);
    stats[key][sub] = fn(stats[key][sub]);
  }
}
