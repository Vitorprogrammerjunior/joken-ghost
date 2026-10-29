// Relíquias das corridas: depois de cada onda o Caçador escolhe 1 de 3.
// Pegar a mesma relíquia de novo sobe o nível dela (até o último de `levels`), e cada nível vale menos.
// `mod(v)` vira atributos em domain/loadout.js; `desc(v)` descreve um nível.

const allWeapons = (n) => ({ 'weaponBonus.estaca': n, 'weaponBonus.aspirador': n, 'weaponBonus.cruz': n });

export const RELICS = [
  { id: 'lamina', name: 'Lâmina Benta', icon: 'icon/espadas', levels: [5, 5, 4], desc: (v) => `+${v} de dano com todas as armas.`, mod: (v) => ({ add: allWeapons(v) }) },
  { id: 'estaca', name: 'Estaca de Freixo', icon: 'icon/estaca', levels: [12, 10, 8], desc: (v) => `+${v} de dano com a Estaca.`, mod: (v) => ({ add: { 'weaponBonus.estaca': v } }) },
  { id: 'aspirador', name: 'Turbina Fantasma', icon: 'icon/aspirador', levels: [12, 10, 8], desc: (v) => `+${v} de dano com o Aspirador.`, mod: (v) => ({ add: { 'weaponBonus.aspirador': v } }) },
  { id: 'cruz', name: 'Cruz de Prata', icon: 'icon/cruz', levels: [12, 10, 8], desc: (v) => `+${v} de dano com a Cruz.`, mod: (v) => ({ add: { 'weaponBonus.cruz': v } }) },
  { id: 'coracao', name: 'Coração Extra', icon: 'icon/coracao', levels: [25, 25, 20], desc: (v) => `+${v} de vida máxima (e cura ${v}).`, mod: (v) => ({ add: { maxHp: v } }) },
  { id: 'presas', name: 'Presas de Vampiro', icon: 'icon/perk_vampirismo', levels: [8, 6], desc: (v) => `Cura ${v} de vida ao derrotar um monstro.`, mod: (v) => ({ add: { healOnKill: v } }) },
  { id: 'espinhos', name: 'Manto de Espinhos', icon: 'icon/perk_espinhos', levels: [8, 6, 4], desc: (v) => `Quem te acertar leva ${v} de dano.`, mod: (v) => ({ add: { thorns: v } }) },
  { id: 'eco', name: 'Eco do Empate', icon: 'icon/perk_empate_forte', levels: [12, 10, 8], desc: (v) => `Empatar causa ${v} de dano no alvo.`, mod: (v) => ({ add: { drawDamage: v } }) },
  { id: 'furia', name: 'Fúria Crescente', icon: 'icon/perk_furia', levels: [4, 3, 2], desc: (v) => `+${v} de dano por vitória seguida (combo).`, mod: (v) => ({ add: { comboDamage: v } }) },
  { id: 'pele', name: 'Pele de Pedra', icon: 'icon/perk_escudo', levels: [0.5], desc: () => 'Golpes dos monstros que não são o alvo doem metade.', mod: (v) => ({ mult: { sideHitMult: v } }) },
  { id: 'folego', name: 'Segundo Fôlego', icon: 'icon/pocao', levels: [15, 12], desc: (v) => `+${v} de vida recuperada entre as ondas.`, mod: (v) => ({ add: { healBetweenWaves: v } }) },
  { id: 'bolsa', name: 'Bolsa Encantada', icon: 'icon/bolsa', levels: [1, 1], desc: () => '+1 item na bolsa em cada onda.', mod: (v) => ({ add: { itemSlots: v } }) },
  { id: 'saque', name: 'Mão de Saqueador', icon: 'icon/sacola', levels: [0.2, 0.15], desc: () => 'Monstros derrotados deixam cair itens com mais frequência.', mod: (v) => ({ add: { dropChance: v } }) },
  { id: 'ouro', name: 'Moedas Malditas', icon: 'icon/moeda', levels: [0.25], desc: () => 'Ganha 25% mais moedas.', mod: (v) => ({ add: { coinMult: v } }) },
  { id: 'amuleto', name: 'Amuleto Eterno', icon: 'icon/amuleto', levels: [true], desc: () => 'Começa cada onda protegido pelo Amuleto.', mod: (v) => ({ set: { waveShield: v } }) },
  { id: 'vela', name: 'Vela Eterna', icon: 'icon/vela', levels: [true], desc: () => 'Começa cada onda vendo o golpe de todos.', mod: (v) => ({ set: { waveReveal: v } }) },
  { id: 'vidro', name: 'Canhão de Vidro', icon: 'icon/perk_juizo', levels: [12], desc: (v) => `+${v} de dano com todas as armas, mas -25 de vida máxima.`, mod: (v) => ({ add: { ...allWeapons(v), maxHp: -25 } }) },
];

export const relicById = (id) => RELICS.find(r => r.id === id);

/** Nível de uma relíquia numa lista de relíquias escolhidas (cada repetição é +1 nível). */
export const relicLevel = (ids, id) => ids.filter(x => x === id).length;

/** Modificadores de todas as relíquias escolhidas, nível por nível. */
export function relicMods(ids) {
  const seen = new Map();
  return ids.map((id) => {
    const relic = relicById(id);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    return relic.mod(relic.levels[n]);
  });
}

/** Texto de um nível (1 = primeiro) da relíquia. */
export function relicText(id, level) {
  const relic = relicById(id);
  return relic.desc(relic.levels[Math.min(level, relic.levels.length) - 1]);
}
