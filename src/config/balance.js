// Números de balanceamento do jogo num lugar só.

export const PLAYER = {
  maxHp: 100,
  healBetweenWaves: 15,
};

export const DAMAGE = {
  base: 25,
  weaknessMult: 1.6,   // arma certa contra o monstro
  resistMult: 0.5,     // arma que o monstro resiste
  elixirMult: 2,       // efeito do Elixir na próxima vitória
};

export const REWARDS = {
  hit: 10,
  weaknessHit: 20,
  kill: 25,
  levelClear: 50,
  comboStep: 0.25,     // +25% de moedas por vitória seguida
  comboMax: 2,         // multiplicador máximo
  perfectBonus: 30,    // terminar a fase sem tomar dano
};

/** Fração de HP restante para ganhar 3 e 2 estrelas. */
export const STARS = { three: 0.7, two: 0.35 };

/** Quantas vitórias contra um tipo revelam o comportamento no Monstruário. */
export const BEHAVIOR_REVEAL_KILLS = 2;
