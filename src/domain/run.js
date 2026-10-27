// Corridas de ondas: Noite Sem Fim e Desafio do Dia.
// Tudo que é sorteado sai de geradores com semente e toda jogada fica registrada,
// então o servidor consegue refazer a corrida e conferir a pontuação (replayRun).
import { RUN_RULES, RUN_POOLS, RUN_BOSSES, DAILY } from '../config/runs.js';
import { RELICS, relicById } from '../config/relics.js';
import { Battle } from './battle.js';
import { Economy } from './economy.js';
import { buildStats } from './loadout.js';
import { seeded, pick } from './random.js';

/** Monstros da onda `n` (0 = primeira), mais fortes a cada onda. */
export function generateWave(n, rng) {
  const scale = { hpMult: 1 + n * RUN_RULES.hpGrowth, damageMult: 1 + n * RUN_RULES.damageGrowth };
  if ((n + 1) % RUN_RULES.bossEvery === 0) {
    const boss = RUN_BOSSES[((n + 1) / RUN_RULES.bossEvery - 1) % RUN_BOSSES.length];
    return [{ id: boss, ...scale }];
  }
  const tier = Math.min(RUN_POOLS.length - 1, Math.floor(n / 4));
  const pool = tier > 0 ? [...RUN_POOLS[tier], ...RUN_POOLS[tier - 1]] : RUN_POOLS[0];
  const count = Math.min(3, 1 + Math.floor((n + 1) / 3));
  return Array.from({ length: count }, () => ({ id: pick(pool, rng), ...scale }));
}

/** Pontuação de uma corrida: ondas vencidas valem mais; vida e moedas desempatam. */
export function runScore({ wavesCleared, hp, coinsEarned }) {
  return wavesCleared * 100 + hp + Math.floor(coinsEarned / 2);
}

export class Run {
  /**
   * @param {object} o
   * @param {number} o.seed                    semente de tudo que é sorteado
   * @param {import('./economy.js').Economy} o.economy
   * @param {number} [o.waves]                 Infinity = sem fim
   * @param {object[]} [o.baseMods]            modificadores fixos (melhorias da oficina)
   */
  constructor({ seed, economy, waves = Infinity, baseMods = [] }) {
    this.seed = seed >>> 0;
    this.waves = waves;
    this.baseMods = baseMods;
    // um gerador para cada coisa: ondas, sorte das lutas e relíquias não interferem entre si
    this.waveRng = seeded(this.seed);
    this.relicRng = seeded(this.seed ^ 0x5bd1e995);
    this.generated = [];
    this.relics = [];
    this.actions = [];
    this.offer = null;
    this.wavesCleared = 0;
    const level = { waveAt: (i) => this.#waveAt(i), waveCount: waves };
    this.battle = new Battle({ level, economy, rng: seeded(this.seed ^ 0x9e3779b9), stats: this.stats() });
  }

  #waveAt(i) {
    while (this.generated.length <= i) this.generated.push(generateWave(this.generated.length, this.waveRng));
    return this.generated[i];
  }

  stats() { return buildStats([...this.baseMods, ...this.relics.map(id => relicById(id).mod)]); }

  get over() { return this.battle.player.hp <= 0 || this.won; }
  get won() { return this.wavesCleared >= this.waves; }
  get score() {
    return runScore({ wavesCleared: this.wavesCleared, hp: this.battle.player.hp, coinsEarned: this.battle.coinsEarned });
  }

  // ─── jogadas (registradas para o replay) ──────────────────────
  attack(weaponId, targetUid) {
    if (this.over || this.offer) throw new Error('Jogada fora de hora');
    this.actions.push(['a', weaponId, targetUid]);
    const r = this.battle.attack(weaponId, targetUid);
    if (r.waveCleared) this.#waveCleared();
    return r;
  }

  useItem(itemId) {
    if (this.over || this.offer) throw new Error('Jogada fora de hora');
    const r = this.battle.useItem(itemId);
    if (r.ok) {
      this.actions.push(['i', itemId]);
      if (r.waveCleared) this.#waveCleared();
    }
    return r;
  }

  #waveCleared() {
    this.wavesCleared++;
    if (!this.won) this.offer = this.#drawOffer();
  }

  /** Três relíquias diferentes; as únicas que o Caçador já tem não voltam. */
  #drawOffer() {
    const pool = RELICS.filter(r => !(r.unique && this.relics.includes(r.id))).map(r => r.id);
    const out = [];
    while (out.length < RUN_RULES.offerSize && pool.length) out.push(pool.splice(Math.floor(this.relicRng() * pool.length), 1)[0]);
    return out;
  }

  /** Escolhe uma relíquia da oferta e começa a próxima onda (com a bolsa cheia). Retorna o que a nextWave da batalha retorna. */
  chooseRelic(id) {
    if (!this.offer?.includes(id)) throw new Error('Relíquia fora da oferta');
    this.actions.push(['r', id]);
    this.relics.push(id);
    this.offer = null;
    this.battle.setStats(this.stats());
    return this.battle.nextWave();
  }
}

/** Corrida do Desafio do Dia: todos com a mesma semente, sem melhorias e com as mesmas moedas. */
export function createDailyRun(seed) {
  return new Run({ seed, economy: new Economy(DAILY.coins), waves: DAILY.waves });
}

/**
 * Refaz uma corrida do Desafio do Dia a partir das jogadas e confere a pontuação.
 * Retorna { ok, score, wavesCleared } ou { ok: false, reason }.
 */
export function replayDaily(seed, actions) {
  const run = createDailyRun(seed);
  try {
    for (const action of actions) {
      if (!Array.isArray(action)) throw new Error('Jogada inválida');
      const [type, a, b] = action;
      if (type === 'a') run.attack(a, b);
      else if (type === 'i') { if (!run.useItem(a).ok) throw new Error('Item inválido'); }
      else if (type === 'r') run.chooseRelic(a);
      else throw new Error('Jogada desconhecida');
    }
  } catch (err) {
    return { ok: false, reason: err.message };
  }
  if (!run.over) return { ok: false, reason: 'Corrida não terminou' };
  return { ok: true, score: run.score, wavesCleared: run.wavesCleared };
}

/** Dia do desafio (AAAA-MM-DD) no fuso do Brasil: muda à meia-noite para todo mundo. */
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DAILY.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Semente do dia (FNV-1a do texto da data). */
export function daySeed(key) {
  let h = 0x811c9dc5;
  for (const ch of `jokenghost:${key}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
