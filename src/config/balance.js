// Números de balanceamento do jogo num lugar só.

export const PLAYER = {
  maxHp: 100,
  healBetweenWaves: 15,
  itemSlots: 1,        // itens por onda: a bolsa enche de novo no começo de cada onda
};

/** Derrotar um monstro pode deixar cair +1 item na bolsa da onda. */
export const LOOT = {
  dropChance: 0.2,
  maxDropsPerWave: 2,
};

export const DAMAGE = {
  base: 25,
  weaknessMult: 1.6,   // arma certa contra o monstro
  resistMult: 0.5,     // arma que o monstro resiste
  elixirMult: 2,       // efeito do Elixir na próxima vitória
  sideHitMult: 0.5,    // monstros que não são o alvo acertam meio golpe se vencerem a sua arma
};

// As moedas ainda passam pelo multiplicador da fase (coinScale em config/levels.js)
// e da dificuldade: fases mais difíceis e o Pesadelo pagam mais.
export const REWARDS = {
  hit: 6,
  weaknessHit: 12,
  kill: 15,
  levelClear: 30,
  comboStep: 0.2,      // +20% de moedas por vitória seguida
  comboMax: 1.6,       // multiplicador máximo
  perfectBonus: 20,    // terminar a fase sem tomar dano
};

/** Fração de HP restante para ganhar 3 e 2 estrelas. */
export const STARS = { three: 0.7, two: 0.35 };

/** Quantas vitórias contra um tipo revelam o comportamento no Monstruário. */
export const BEHAVIOR_REVEAL_KILLS = 2;
