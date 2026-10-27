// Recompensas da campanha: as estrelas somadas (modo normal + Pesadelo) liberam
// modos, visuais do Caçador e a fase bônus.

/** Dificuldades da campanha. `mods` vira atributos em domain/loadout.js. */
export const DIFFICULTIES = {
  normal: { id: 'normal', name: 'Normal', mods: [] },
  pesadelo: {
    id: 'pesadelo', name: 'Pesadelo',
    desc: 'Monstros com 40% mais vida e 30% mais dano. Moedas x1,5, mais itens caindo e estrelas próprias.',
    mods: [{ mult: { enemyHpMult: 1.4, enemyDamageMult: 1.3, coinMult: 1.5 }, add: { dropChance: 0.1 } }],
  },
};

export const STAR_REWARDS = [
  { id: 'pesadelo', stars: 6, kind: 'mode', icon: 'icon/caveira', name: 'Modo Pesadelo', desc: DIFFICULTIES.pesadelo.desc },
  { id: 'dourado', stars: 12, kind: 'skin', icon: 'icon/estrela', name: 'Visual Dourado', desc: 'O Caçador ganha um traje dourado na campanha.' },
  { id: 'cripta', stars: 18, kind: 'level', icon: 'icon/cadeado', name: 'Cripta Secreta', desc: 'Libera a fase bônus com os monstros mais perigosos.' },
  { id: 'espectral', stars: 24, kind: 'skin', icon: 'icon/pista', name: 'Visual Espectral', desc: 'Um traje fantasma, pálido e brilhante.' },
  { id: 'sombrio', stars: 36, kind: 'skin', icon: 'icon/livro', name: 'Visual Sombrio', desc: 'Para quem venceu o Pesadelo: um traje das trevas.' },
];

export const rewardById = (id) => STAR_REWARDS.find(r => r.id === id);
