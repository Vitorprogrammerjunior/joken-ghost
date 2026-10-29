// Regras das corridas: Noite Sem Fim (ondas infinitas) e Desafio do Dia (mesma corrida para todos).

export const RUN_RULES = {
  bossEvery: 5,        // a cada 5 ondas vem um chefe (e a bolsa enche de novo)
  hpGrowth: 0.07,      // +7% de vida dos monstros por onda
  damageGrowth: 0.04,  // +4% de dano por onda
  offerSize: 3,        // relíquias oferecidas depois de cada onda
  relicSlots: 6,       // relíquias diferentes que cabem: com a bolsa cheia só sobem de nível
  // Madrugada: depois desta onda os monstros crescem em cima do que já cresceram (juros compostos)
  lateFrom: 20,
  lateHpGrowth: 0.06,
  lateDamageGrowth: 0.04,
};

/**
 * Regras da noite: entram na onda `from` (1 = primeira) e valem até o fim da corrida.
 * `mod` mexe nos atributos do Caçador; `echo` faz todos os monstros atacarem duas vezes.
 */
export const NIGHT_RULES = [
  { id: 'madrugada', from: RUN_RULES.lateFrom + 1, name: 'MADRUGADA', desc: 'Os monstros ficam mais fortes a cada onda.' },
  { id: 'nevoa', from: 26, name: 'NÉVOA FRIA', desc: 'A vida recuperada entre as ondas cai pela metade.', mod: { mult: { healBetweenWaves: 0.5 } } },
  { id: 'eco', from: 31, name: 'ECO DAS ALMAS', desc: 'Todos os monstros atacam duas vezes.', echo: true },
];

/** Regras da noite que valem na onda `n` (0 = primeira). */
export const nightRulesAt = (n) => NIGHT_RULES.filter(r => n + 1 >= r.from);

/** Monstros por faixa de ondas (cada faixa dura 4 ondas e mistura a anterior). */
export const RUN_POOLS = [
  ['fantasma', 'fogo_fatuo', 'morcego'],
  ['gargula', 'boneca', 'zumbi', 'corvo', 'esqueleto'],
  ['armadura', 'mumia', 'lobisomem', 'banshee'],
];

export const RUN_BOSSES = ['kastle', 'coveiro', 'relojoeiro', 'morgana'];

/** Noite Sem Fim: usa as moedas e as melhorias do arquivo. */
export const ENDLESS = { id: 'endless', name: 'Noite Sem Fim', waves: Infinity, unlockLevel: 3 };

/** Desafio do Dia: 10 ondas, todos começam iguais (sem melhorias) e com as mesmas moedas. */
export const DAILY = { id: 'daily', name: 'Desafio do Dia', waves: 10, coins: 120, timeZone: 'America/Sao_Paulo' };

/** Cenários das corridas: muda a cada ciclo de chefe. */
export const RUN_STAGES = ['floresta', 'patio', 'mansao', 'camara', 'cemiterio', 'catacumbas', 'torre', 'portal'];
