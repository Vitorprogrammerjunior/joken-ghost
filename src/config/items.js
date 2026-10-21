// Itens da loja. O efeito é aplicado na hora pela batalha (src/domain/battle.js).

export const ITEMS = [
  { id: 'pocao', name: 'Poção', price: 30, icon: 'icon/pocao', desc: 'Recupera 30 de vida.', effect: { heal: 30 } },
  { id: 'pocao_grande', name: 'Poção Grande', price: 65, icon: 'icon/pocao_grande', desc: 'Recupera 70 de vida.', effect: { heal: 70 } },
  { id: 'vela', name: 'Vela da Verdade', price: 35, icon: 'icon/vela', desc: 'Revela o próximo ataque do alvo.', effect: { reveal: true } },
  { id: 'amuleto', name: 'Amuleto', price: 40, icon: 'icon/amuleto', desc: 'Bloqueia o próximo golpe que você levar.', effect: { shield: true } },
  { id: 'elixir', name: 'Elixir de Fúria', price: 45, icon: 'icon/elixir', desc: 'Seu próximo acerto causa dano dobrado.', effect: { empower: true } },
  { id: 'agua_benta', name: 'Água Benta', price: 55, icon: 'icon/agua_benta', desc: 'Causa 20 de dano em todos os monstros.', effect: { damageAll: 20 } },
];

export const itemById = (id) => ITEMS.find(i => i.id === id);
