'use strict';
// As decisões de um adversário automático da ranqueada.
//
// Armas: ele tenta prever a próxima arma do jogador pelos padrões do histórico (o que ele costuma
// jogar depois de cada sequência) e joga a que vence. Quanto maior a dificuldade, mais vezes ele
// confia na previsão; no resto das vezes ele joga no "estilo" dele (as IAs dos monstros), que é
// previsível e pode ser explorado por quem presta atenção.
// Cartas: escolhe pela situação (vida, confiança na previsão, se o jogador repete muito).
// Tempo: demora um pouco para cada decisão, como uma pessoa.
const { WEAPONS, BEATS, WEAPON_MOVE, cardById } = require('../catalog');

const MOVE_WEAPON = Object.fromEntries(Object.entries(WEAPON_MOVE).map(([w, m]) => [m, w]));
/** Chance máxima de jogar contra a previsão numa rodada (o resto é estilo ou chute). */
const MAX_EXPLOIT = 0.75;

/** A arma que vence `w`. */
const counterOf = (w) => WEAPONS.find(x => BEATS[x] === w);

/**
 * Previsão da próxima arma pelo histórico: procura o que veio depois das últimas 2 (ou 1) armas;
 * sem padrão, usa a arma mais frequente. confidence vai de 0 (chute) a 1 (padrão claro).
 */
function predict(history) {
  for (const k of [2, 1]) {
    if (history.length <= k) continue;
    const tail = history.slice(-k).join();
    const next = {};
    let total = 0;
    for (let i = k; i < history.length; i++) {
      if (history.slice(i - k, i).join() !== tail) continue;
      next[history[i]] = (next[history[i]] ?? 0) + 1;
      total++;
    }
    if (total >= 2) {
      const [weapon, n] = Object.entries(next).sort((a, b) => b[1] - a[1])[0];
      return { weapon, confidence: (n / total) * Math.min(1, total / 4) };
    }
  }
  const recent = history.slice(-8);
  if (!recent.length) return { weapon: null, confidence: 0 };
  const counts = {};
  for (const w of recent) counts[w] = (counts[w] ?? 0) + 1;
  const [weapon, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { weapon, confidence: Math.max(0, (n / recent.length - 1 / 3) * 1.5) * Math.min(1, recent.length / 5) };
}

class BotBrain {
  /**
   * @param {object} o
   * @param {number} o.skill        dificuldade 0..1 (bots/policy.js)
   * @param {object} o.style        estilo de jogo (um perfil de IA de monstro)
   * @param {Function} o.chooseMove IA compartilhada (src/domain/enemyAI.js)
   * @param {object} o.rules        RULES.rankedBot (tempos de pensar)
   * @param {() => number} o.rng
   */
  constructor({ skill, style, chooseMove, rules, rng = Math.random }) {
    Object.assign(this, { skill, style, chooseMove, rules, rng });
    this.vision = null;     // arma do jogador vista pela carta Visão nesta rodada
    this.preferred = null;  // arma que combina com a carta jogada (cartas de arma)
  }

  /** Tempo de "pensar" (ms) antes de agir; nunca passa do limite da fase. */
  think(kind, limitMs) {
    const [min, max] = kind === 'card' ? this.rules.cardThinkMs : this.rules.weaponThinkMs;
    return Math.min(limitMs - 400, Math.round(min + (max - min) * this.rng() ** 1.4));
  }

  newRound() { this.vision = null; this.preferred = null; }

  see(weapon) { this.vision = weapon; }

  /**
   * @param {string[]} hand
   * @param {{ hp: number, maxHp: number, oppHistory: string[] }} ctx
   */
  chooseCard(hand, { hp, maxHp, oppHistory }) {
    if (!hand.length || this.rng() > 0.35 + this.skill * 0.6) return null;   // às vezes guarda a carta
    const { confidence } = predict(oppHistory);
    const hurt = 1 - hp / maxHp;
    const repeats = oppHistory.length >= 2 && oppHistory.at(-1) === oppHistory.at(-2);
    const value = (id) => {
      const card = cardById(id);
      if (id === 'cura') return hurt > 0.2 ? 3 + hurt * 4 : -1;
      if (id === 'escudo_sagrado') return hurt > 0.5 ? 6 : 1;
      if (id === 'furia') return hp < maxHp / 2 ? 5 : -1;
      if (id === 'provocacao') return repeats ? 4 : 1;
      if (id === 'visao') return 4;
      if (id === 'escudo' || id === 'espinhos') return 2 + (1 - confidence) * 2;
      if (['golpe_duplo', 'juizo', 'sorte', 'vampirismo', 'disfarce'].includes(id) || card?.weapon) return 2 + confidence * 4;
      return 1;
    };
    // bots mais fracos escolhem com mais "ruído"
    const scored = hand.map(id => [id, value(id) + (1 - this.skill) * this.rng() * 5]);
    const [id, score] = scored.sort((a, b) => b[1] - a[1])[0];
    if (score <= 0) return null;
    this.preferred = cardById(id)?.weapon ?? null;
    return id;
  }

  /** @param {{ ownHistory: string[], oppHistory: string[], forbidden: string|null }} ctx */
  chooseWeapon({ ownHistory, oppHistory, forbidden }) {
    const allowed = WEAPONS.filter(w => w !== forbidden);
    const choose = (w) => (w && allowed.includes(w) ? w : allowed[Math.floor(this.rng() * allowed.length)]);
    if (this.vision && this.rng() < 0.5 + this.skill / 2) return choose(counterOf(this.vision));
    const guess = predict(oppHistory);
    // até o bot mais difícil só aproveita o padrão em parte das rodadas: dá para vencê-lo
    const exploit = Math.min(MAX_EXPLOIT, this.skill * (0.35 + 0.5 * guess.confidence));
    if (guess.weapon && this.rng() < exploit) return choose(counterOf(guess.weapon));
    if (this.preferred && this.rng() < 0.6) return choose(this.preferred);
    const move = this.chooseMove(this.style, {
      playerHistory: oppHistory.map(w => WEAPON_MOVE[w]),
      ownHistory: ownHistory.map(w => WEAPON_MOVE[w]),
    }, this.rng);
    return choose(MOVE_WEAPON[move]);
  }

  /** De vez em quando reage com uma expressão, como gente. */
  react(event) {
    const chance = { round_won: 0.1, round_lost: 0.04, match_won: 0.35, match_lost: 0.2 }[event] ?? 0;
    if (this.rng() >= chance) return null;
    const options = { round_won: ['risada'], round_lost: ['susto'], match_won: ['gg', 'risada'], match_lost: ['gg'] }[event];
    return options[Math.floor(this.rng() * options.length)];
  }
}

module.exports = { BotBrain, predict, counterOf };
