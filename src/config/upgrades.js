// Oficina do Caçador: melhorias permanentes compradas com moedas no mapa.
// Cada nível aplica o modificador `mod` uma vez (ver domain/loadout.js).

export const UPGRADES = [
  {
    id: 'estaca', name: 'Estaca de Prata', icon: 'icon/estaca',
    desc: '+4 de dano com a Estaca por nível.',
    costs: [60, 140, 260], mod: { add: { 'weaponBonus.estaca': 4 } },
  },
  {
    id: 'aspirador', name: 'Aspirador Turbo', icon: 'icon/aspirador',
    desc: '+4 de dano com o Aspirador por nível.',
    costs: [60, 140, 260], mod: { add: { 'weaponBonus.aspirador': 4 } },
  },
  {
    id: 'cruz', name: 'Cruz Abençoada', icon: 'icon/cruz',
    desc: '+4 de dano com a Cruz por nível.',
    costs: [60, 140, 260], mod: { add: { 'weaponBonus.cruz': 4 } },
  },
  {
    id: 'vida', name: 'Colete Reforçado', icon: 'icon/coracao',
    desc: '+10 de vida máxima por nível.',
    costs: [80, 180, 320], mod: { add: { maxHp: 10 } },
  },
  {
    id: 'folego', name: 'Fôlego de Caçador', icon: 'icon/pocao',
    desc: '+10 de vida recuperada entre as ondas por nível.',
    costs: [90, 200], mod: { add: { healBetweenWaves: 10 } },
  },
  {
    id: 'bolsa', name: 'Bolsa Maior', icon: 'icon/bolsa',
    desc: '+1 item por onda em cada nível.',
    costs: [180, 380], mod: { add: { itemSlots: 1 } },
  },
  {
    id: 'saque', name: 'Faro de Saqueador', icon: 'icon/sacola',
    desc: '+8% de chance de um monstro derrotado deixar um item.',
    costs: [100, 220], mod: { add: { dropChance: 0.08 } },
  },
];

export const upgradeById = (id) => UPGRADES.find(u => u.id === id);
