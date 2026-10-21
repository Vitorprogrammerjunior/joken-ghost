// Bestiário completo. `weakness`/`resist` são ids de arma (src/config/weapons.js).
// `ai` define como o monstro escolhe as jogadas (src/domain/enemyAI.js).

export const ENEMIES = {
  fantasma: {
    id: 'fantasma', name: 'Fantasma', sprite: 'enemy/fantasma',
    hp: 60, damage: 14, flying: true,
    weakness: 'aspirador', resist: 'estaca',
    ai: { type: 'random', bias: { pedra: 1, papel: 1.6, tesoura: 1 } },
    desc: 'Espírito inquieto da floresta. Seu olho vermelho nunca pisca.',
    behavior: 'Imprevisível, mas adora usar Assombração.',
  },
  fogo_fatuo: {
    id: 'fogo_fatuo', name: 'Fogo-Fátuo', sprite: 'enemy/fogo_fatuo',
    hp: 50, damage: 12, flying: true,
    weakness: 'cruz', resist: 'aspirador',
    ai: { type: 'cycle', sequence: ['pedra', 'tesoura', 'papel'], noise: 0.15 },
    desc: 'Chama errante que atrai viajantes para o fundo da mata.',
    behavior: 'Segue um ciclo: Possessão, Maldição, Assombração...',
  },
  morcego: {
    id: 'morcego', name: 'Morcego Vampiro', sprite: 'enemy/morcego',
    hp: 55, damage: 13, flying: true,
    weakness: 'estaca', resist: 'cruz',
    ai: { type: 'sticky', repeat: 0.65 },
    desc: 'Guardião alado do pátio. Fareja sangue a quilômetros.',
    behavior: 'Teimoso: costuma repetir o último ataque.',
  },
  gargula: {
    id: 'gargula', name: 'Gárgula', sprite: 'enemy/gargula',
    hp: 85, damage: 18,
    weakness: 'cruz', resist: 'estaca',
    ai: { type: 'random', bias: { pedra: 2.2, papel: 1, tesoura: 1 } },
    desc: 'Estátua de pedra que ganha vida ao luar.',
    behavior: 'Pesada e previsível: prefere Possessão.',
  },
  boneca: {
    id: 'boneca', name: 'Boneca Possuída', sprite: 'enemy/boneca',
    hp: 65, damage: 15,
    weakness: 'cruz', resist: 'aspirador',
    ai: { type: 'mimic', chance: 0.7 },
    desc: 'Brinquedo antigo com um sorriso costurado. Ela quer brincar.',
    behavior: 'Imita a sua jogada anterior.',
  },
  armadura: {
    id: 'armadura', name: 'Armadura Assombrada', sprite: 'enemy/armadura',
    hp: 90, damage: 18,
    weakness: 'aspirador', resist: 'cruz',
    ai: { type: 'learner', adapt: 0.6 },
    desc: 'Uma armadura vazia movida por um espírito guerreiro.',
    behavior: 'Aprende seus hábitos e contra-ataca a arma que você mais usa.',
  },
  kastle: {
    id: 'kastle', name: 'Kastle', sprite: 'enemy/kastle',
    hp: 240, damage: 22, boss: true, scale: 3,
    // o chefe troca de fraqueza a cada fase (2/3 e 1/3 do HP)
    phases: [
      { weakness: 'cruz', resist: 'aspirador' },
      { weakness: 'estaca', resist: 'cruz' },
      { weakness: 'aspirador', resist: 'estaca' },
    ],
    weakness: 'cruz', resist: 'aspirador',
    ai: { type: 'trickster', chance: 0.5 },
    desc: 'O Bobo da Corte das trevas, senhor da mansão. Ri de tudo, até da morte.',
    behavior: 'Tenta vencer a sua última jogada. Muda de fraqueza a cada fase.',
  },
};

export const ENEMY_ORDER = ['fantasma', 'fogo_fatuo', 'morcego', 'gargula', 'boneca', 'armadura', 'kastle'];
