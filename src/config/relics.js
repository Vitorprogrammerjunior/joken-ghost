// Relíquias da Noite Sem Fim: depois de cada onda o Caçador escolhe 1 de 3.
// `mod` vira atributos em domain/loadout.js; `unique` não aparece de novo depois de escolhida.

const allWeapons = (n) => ({ 'weaponBonus.estaca': n, 'weaponBonus.aspirador': n, 'weaponBonus.cruz': n });

export const RELICS = [
  { id: 'lamina', name: 'Lâmina Benta', icon: 'icon/espadas', desc: '+5 de dano com todas as armas.', mod: { add: allWeapons(5) } },
  { id: 'estaca', name: 'Estaca de Freixo', icon: 'icon/estaca', desc: '+12 de dano com a Estaca.', mod: { add: { 'weaponBonus.estaca': 12 } } },
  { id: 'aspirador', name: 'Turbina Fantasma', icon: 'icon/aspirador', desc: '+12 de dano com o Aspirador.', mod: { add: { 'weaponBonus.aspirador': 12 } } },
  { id: 'cruz', name: 'Cruz de Prata', icon: 'icon/cruz', desc: '+12 de dano com a Cruz.', mod: { add: { 'weaponBonus.cruz': 12 } } },
  { id: 'coracao', name: 'Coração Extra', icon: 'icon/coracao', desc: '+25 de vida máxima (e cura 25).', mod: { add: { maxHp: 25 } } },
  { id: 'presas', name: 'Presas de Vampiro', icon: 'icon/perk_vampirismo', desc: 'Cura 8 de vida ao derrotar um monstro.', mod: { add: { healOnKill: 8 } } },
  { id: 'espinhos', name: 'Manto de Espinhos', icon: 'icon/perk_espinhos', desc: 'Quem te acertar leva 8 de dano.', mod: { add: { thorns: 8 } } },
  { id: 'eco', name: 'Eco do Empate', icon: 'icon/perk_empate_forte', desc: 'Empatar causa 12 de dano no alvo.', mod: { add: { drawDamage: 12 } } },
  { id: 'furia', name: 'Fúria Crescente', icon: 'icon/perk_furia', desc: '+4 de dano por vitória seguida (combo).', mod: { add: { comboDamage: 4 } } },
  { id: 'pele', name: 'Pele de Pedra', icon: 'icon/perk_escudo', desc: 'Golpes dos monstros que não são o alvo doem metade.', mod: { mult: { sideHitMult: 0.5 } } },
  { id: 'folego', name: 'Segundo Fôlego', icon: 'icon/pocao', desc: '+15 de vida recuperada entre as ondas.', mod: { add: { healBetweenWaves: 15 } } },
  { id: 'bolsa', name: 'Bolsa Encantada', icon: 'icon/bolsa', desc: '+1 item na bolsa em cada onda.', mod: { add: { itemSlots: 1 } } },
  { id: 'saque', name: 'Mão de Saqueador', icon: 'icon/sacola', desc: 'Monstros derrotados deixam cair itens com mais frequência.', mod: { add: { dropChance: 0.2 } } },
  { id: 'ouro', name: 'Moedas Malditas', icon: 'icon/moeda', desc: 'Ganha 50% mais moedas.', mod: { mult: { coinMult: 1.5 } } },
  { id: 'amuleto', name: 'Amuleto Eterno', icon: 'icon/amuleto', desc: 'Começa cada onda protegido pelo Amuleto.', mod: { set: { waveShield: true } }, unique: true },
  { id: 'vela', name: 'Vela Eterna', icon: 'icon/vela', desc: 'Começa cada onda vendo o golpe de todos.', mod: { set: { waveReveal: true } }, unique: true },
  { id: 'vidro', name: 'Canhão de Vidro', icon: 'icon/perk_juizo', desc: '+12 de dano com todas as armas, mas -25 de vida máxima.', mod: { add: { ...allWeapons(12), maxHp: -25 } } },
];

export const relicById = (id) => RELICS.find(r => r.id === id);
