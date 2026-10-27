// Modos da cena de batalha. A cena só anima; o modo diz qual batalha montar,
// como chamar as jogadas, o que mostrar no topo e para onde ir no fim.
//
//   CampaignMode: uma fase da campanha (normal ou Pesadelo).
//   RunMode:      Noite Sem Fim ou Desafio do Dia (ondas geradas e relíquias).
import { Battle } from '../domain/battle.js';
import { recordVictory, recordDefeat } from '../domain/progress.js';
import { campaignStats, difficultyOf, totalStars, upgradeMods } from '../domain/campaign.js';
import { Run, createDailyRun, dayKey, daySeed } from '../domain/run.js';
import { MAIN_LEVELS, ENDINGS, levelById } from '../config/levels.js';
import { STAR_REWARDS } from '../config/rewards.js';
import { RUN_RULES, RUN_STAGES, ENDLESS, DAILY } from '../config/runs.js';

/** Escolhe o modo pelos parâmetros da cena: { levelId } ou { run: 'endless' | 'daily' }. */
export function createMode(game, params) {
  return params.run ? new RunMode(game, params.run) : new CampaignMode(game, params.levelId);
}

const stat = (icon, label, value) => ({ icon, label, value });

// ═══════════════════════ campanha ═══════════════════════
class CampaignMode {
  constructor(game, levelId) {
    this.game = game;
    this.level = levelById(levelId);
    this.difficulty = difficultyOf(game.profile);
    this.economy = game.economy;
    this.battle = new Battle({ level: this.level, economy: this.economy, stats: campaignStats(game.profile, this.level) });
  }

  get title() {
    const mode = this.difficulty.id === 'normal' ? '' : ` · ${this.difficulty.name.toUpperCase()}`;
    return `FASE ${this.level.id} — ${this.level.name.toUpperCase()}${mode}`;
  }
  get scenery() { return this.level.scenery; }
  get music() { return this.level.music ?? 'batalha'; }
  get waveLabel() { const n = this.battle.waveCount; return n > 1 ? `ONDA ${this.battle.waveIndex + 1}/${n}` : ''; }
  get offer() { return null; }
  get relics() { return []; }
  get retryParams() { return { levelId: this.level.id }; }
  get quitTo() { return ['map', { focus: this.level.id }]; }
  get retryQuestion() { return 'Recomeçar a fase do início?'; }

  attack(weaponId, uid) { return this.battle.attack(weaponId, uid); }
  useItem(id) { return this.battle.useItem(id); }
  nextWave() { return this.battle.nextWave(); }

  /** Salva o resultado e monta a tela de resultado. */
  finish(won) {
    const p = this.game.profile;
    const b = this.battle;
    const lvl = this.level;
    const unlockedBefore = p.unlocked;
    const starsBefore = totalStars(p);
    const stars = won ? b.stars() : 0;
    if (won) recordVictory(p, lvl.id, stars, MAIN_LEVELS.length, { hard: this.difficulty.id === 'pesadelo' });
    else recordDefeat(p);
    p.stats.turns += b.turns;
    this.game.saveProfile();

    const next = won && !lvl.bonus && !lvl.ending ? levelById(lvl.id + 1) : null;
    const rewards = won ? STAR_REWARDS.filter(rw => starsBefore < rw.stars && totalStars(p) >= rw.stars) : [];
    const actions = [];
    if (next) actions.push({ label: 'PRÓXIMA FASE', icon: 'icon/jogar', primary: true, go: ['story', { levelId: next.id }] });
    if (won && lvl.ending) actions.push({ label: ENDINGS[lvl.ending].button, icon: 'icon/trofeu', primary: true, go: ['story', { ending: lvl.ending }] });
    if (!won) actions.push({ label: 'TENTAR DE NOVO', icon: 'icon/repetir', primary: true, go: ['battle', { levelId: lvl.id }] });
    actions.push({ label: 'MAPA', icon: 'icon/casa', go: ['map', { focus: lvl.id }] });

    return {
      won, stars, scenery: lvl.scenery,
      title: won ? 'VITÓRIA!' : 'DERROTA...',
      stats: [
        stat('icon/moeda', 'Moedas ganhas', `+${b.coinsEarned}`),
        stat('icon/coracao', 'Dano recebido', b.damageTaken),
        stat('icon/espadas', 'Turnos', b.turns),
      ],
      note: !won ? 'Dica: leia as pistas dos monstros e use a Oficina para ficar mais forte.'
        : rewards.length ? `Nova recompensa: ${rewards.map(rw => rw.name).join(', ')}!`
        : next && p.unlocked > unlockedBefore ? `Nova fase liberada: ${next.name}!` : '',
      actions,
    };
  }
}

// ═══════════════════════ corridas ═══════════════════════
class RunMode {
  constructor(game, kind) {
    this.game = game;
    this.kind = kind === 'daily' ? DAILY : ENDLESS;
    if (this.kind === DAILY) {
      this.day = dayKey();
      this.run = createDailyRun(daySeed(this.day));
    } else {
      this.run = new Run({ seed: Math.floor(Math.random() * 2 ** 32), economy: game.economy, baseMods: upgradeMods(game.profile) });
    }
    this.economy = this.run.battle.economy;
    this.battle = this.run.battle;
  }

  get title() {
    if (this.kind !== DAILY) return 'NOITE SEM FIM';
    const [, m, d] = this.day.split('-');
    return `DESAFIO DO DIA — ${d}/${m}`;
  }
  /** O cenário muda a cada ciclo de chefe. */
  get scenery() { return RUN_STAGES[Math.floor(this.battle.waveIndex / RUN_RULES.bossEvery) % RUN_STAGES.length]; }
  get music() { return this.battle.waveIndex >= RUN_RULES.bossEvery * 4 ? 'sombras' : 'batalha'; }
  get waveLabel() {
    const n = this.battle.waveIndex + 1;
    return this.run.waves === Infinity ? `ONDA ${n}` : `ONDA ${n}/${this.run.waves}`;
  }
  get offer() { return this.run.offer; }
  get relics() { return this.run.relics; }
  get retryParams() { return { run: this.kind.id }; }
  get quitTo() { return ['map', {}]; }
  get retryQuestion() { return 'Começar uma corrida nova?'; }

  attack(weaponId, uid) { return this.run.attack(weaponId, uid); }
  useItem(id) { return this.run.useItem(id); }
  chooseRelic(id) { return this.run.chooseRelic(id); }

  finish(won) {
    const p = this.game.profile;
    const { run } = this;
    const daily = this.kind === DAILY;
    const record = daily ? this.#saveDaily(p) : this.#saveEndless(p);
    this.game.saveProfile();
    return {
      won, stars: 0, scenery: this.scenery,
      title: won ? 'DESAFIO VENCIDO!' : daily ? 'FIM DO DESAFIO' : 'FIM DA NOITE',
      stats: [
        stat('icon/caveira', 'Ondas vencidas', run.wavesCleared),
        stat('icon/trofeu', 'Pontuação', run.score),
        stat('icon/estrela', daily ? 'Melhor de hoje' : 'Recorde', record.best),
      ],
      note: record.isBest ? 'Novo recorde!' : `Relíquias: ${run.relics.length}`,
      actions: [
        { label: daily ? 'TENTAR DE NOVO' : 'NOVA CORRIDA', icon: 'icon/repetir', primary: true, go: ['battle', this.retryParams] },
        { label: 'MAPA', icon: 'icon/casa', go: ['map', {}] },
      ],
      daily: daily ? { day: this.day, seed: run.seed, actions: run.actions, score: run.score, wavesCleared: run.wavesCleared } : null,
    };
  }

  #saveEndless(p) {
    const best = p.endless.best;
    p.endless = { best: Math.max(best, this.run.wavesCleared), runs: p.endless.runs + 1 };
    return { best: p.endless.best, isBest: this.run.wavesCleared > best };
  }

  #saveDaily(p) {
    const prev = p.daily.day === this.day ? p.daily.best : 0;
    p.daily = { day: this.day, best: Math.max(prev, this.run.score) };
    return { best: p.daily.best, isBest: this.run.score > prev };
  }
}
