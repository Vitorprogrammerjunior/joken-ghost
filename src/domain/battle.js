// Regras de uma batalha, sem nenhuma dependência de tela.
// A cena (scenes/BattleScene.js) chama estes métodos e anima os resultados.
//
// Em cada turno todos os monstros vivos jogam pedra, papel ou tesoura contra a arma
// do Caçador: o alvo troca golpes com ele e os outros acertam meio golpe se vencerem.
// Chefes podem jogar duas vezes (`echo`) e invocar ajudantes (`summon`).
import { DAMAGE, LOOT, REWARDS, STARS } from '../config/balance.js';
import { ENEMIES } from '../config/enemies.js';
import { WEAPONS } from '../config/weapons.js';
import { itemById } from '../config/items.js';
import { MOVES } from '../config/weapons.js';
import { pick } from './random.js';
import { chooseMove, rollTell } from './enemyAI.js';
import { baseStats } from './loadout.js';
import { outcome as rps } from './rps.js';

/**
 * Um monstro de uma onda: o id (config/enemies.js) ou o id com multiplicadores
 * de vida e dano (as corridas ficam mais difíceis a cada onda).
 * @typedef {string | { id: string, hpMult?: number, damageMult?: number }} WaveEntry
 */

export class Battle {
  /**
   * @param {object} opts
   * @param {{ waves?: WaveEntry[][], waveAt?: (i: number) => WaveEntry[], waveCount?: number }} opts.level
   *   fase da campanha (config/levels.js, com `waves`) ou corrida (domain/run.js, com `waveAt` e `waveCount`)
   * @param {import('./economy.js').Economy} opts.economy
   * @param {() => number} [opts.rng]
   * @param {ReturnType<typeof baseStats>} [opts.stats]  atributos (domain/loadout.js)
   */
  constructor({ level, economy, rng = Math.random, stats = baseStats() }) {
    this.level = level;
    this.economy = economy;
    this.rng = rng;
    this.stats = stats;
    this.nextUid = 1;
    this.waveIndex = 0;
    this.enemies = [];
    this.player = { hp: stats.maxHp, maxHp: stats.maxHp, shield: false, empowered: false };
    this.playerHistory = [];
    this.combo = 0;
    this.revealed = false;
    this.itemsUsed = 0;
    this.bonusItems = 0;  // itens que caíram dos monstros nesta onda
    this.damageTaken = 0;
    this.coinsEarned = 0;
    this.turns = 0;
    this.startWave();
  }

  // ─── ondas ──────────────────────────────────────────────────
  get wave() { return this.level.waveAt ? this.level.waveAt(this.waveIndex) : this.level.waves[this.waveIndex]; }
  /** Quantas ondas a batalha tem (Infinity na Noite Sem Fim). */
  get waveCount() { return this.level.waveCount ?? this.level.waves.length; }
  get isLastWave() { return this.waveIndex >= this.waveCount - 1; }
  /** Tamanho da bolsa nesta onda: o fixo mais o que caiu dos monstros. */
  get bagSize() { return this.stats.itemSlots + this.bonusItems; }
  get itemsLeft() { return Math.max(0, this.bagSize - this.itemsUsed); }

  /** Troca os atributos no meio da batalha (relíquias). Vida máxima maior também cura a diferença. */
  setStats(stats) {
    const gained = stats.maxHp - this.player.maxHp;
    this.stats = stats;
    this.player.maxHp = stats.maxHp;
    this.player.hp = Math.max(1, Math.min(stats.maxHp, this.player.hp + Math.max(0, gained)));
  }


  /** Começa a onda atual: monstros novos e a bolsa cheia de novo. */
  startWave() {
    this.enemies = this.wave.map((entry) => (typeof entry === 'string' ? this.#spawn(entry) : this.#spawn(entry.id, entry)));
    this.itemsUsed = 0;
    this.bonusItems = 0;
    this.revealed = this.stats.waveReveal;
    if (this.stats.waveShield) this.player.shield = true;
    this.prepareIntents();
  }

  #spawn(id, { hpMult = 1, damageMult = 1 } = {}) {
    const def = ENEMIES[id];
    if (!def) throw new Error(`Inimigo desconhecido: ${id}`);
    const hp = Math.round(def.hp * this.stats.enemyHpMult * hpMult);
    return {
      uid: this.nextUid++, id, def, hp, maxHp: hp,
      damage: Math.round(def.damage * this.stats.enemyDamageMult * damageMult),
      phase: 0, history: [], intent: null, echo: null, tell: null,
    };
  }

  /** Avança para a próxima onda e recupera um pouco de vida. */
  nextWave() {
    if (this.isLastWave) return null;
    this.waveIndex++;
    const healed = this.#heal(this.stats.healBetweenWaves);
    this.startWave();
    return { healed, wave: this.waveIndex };
  }

  alive() { return this.enemies.filter(e => e.hp > 0); }
  find(uid) { return this.enemies.find(e => e.uid === uid); }

  /** Os monstros decidem a jogada antes do Caçador (a Vela consegue ver; as pistas às vezes mostram). */
  prepareIntents() {
    for (const e of this.alive()) {
      e.intent = chooseMove(e.def.ai, { playerHistory: this.playerHistory, ownHistory: e.history }, this.rng);
      e.echo = e.def.echo ? pick(MOVES, this.rng) : null; // o segundo golpe é imprevisível
      e.tell = rollTell(e.def.tell, e.intent, this.rng);
    }
  }

  weaknessOf(enemy) { return enemy.def.phases ? enemy.def.phases[enemy.phase].weakness : enemy.def.weakness; }
  resistOf(enemy) { return enemy.def.phases ? enemy.def.phases[enemy.phase].resist : enemy.def.resist; }

  effectiveness(enemy, weaponId) {
    if (this.weaknessOf(enemy) === weaponId) return 'weak';
    if (this.resistOf(enemy) === weaponId) return 'resist';
    return 'normal';
  }

  // ─── turno ──────────────────────────────────────────────────
  /**
   * O Caçador ataca `targetUid` com uma arma. Retorna tudo o que aconteceu,
   * para a cena animar.
   */
  attack(weaponId, targetUid) {
    const weapon = WEAPONS[weaponId];
    const target = this.find(targetUid) ?? this.alive()[0];
    if (!weapon || !target || target.hp <= 0) throw new Error('Ataque inválido');

    this.turns++;
    const bonusBefore = this.bonusItems;
    const enemyMove = target.intent;
    const result = rps(weapon.move, enemyMove);
    const others = this.alive().filter(e => e !== target);
    this.playerHistory.push(weapon.move);
    for (const e of [target, ...others]) e.history.push(e.intent);

    const r = {
      weapon: weapon.id, enemyMove, outcome: result, targetUid: target.uid, enemyId: target.id,
      damage: 0, effectiveness: 'normal', killed: false, coins: 0, combo: 0,
      blocked: false, playerDamage: 0, playerDead: false, empowered: false,
      moves: [target, ...others].flatMap(e => [
        { uid: e.uid, move: e.intent, echo: false },
        ...(e.echo ? [{ uid: e.uid, move: e.echo, echo: true }] : []),
      ]),
      drawDamage: 0, thorns: [], healed: 0, sideHits: [], summoned: [], drops: 0,
      phaseChanged: null, waveCleared: false, battleWon: false, clearBonus: 0,
    };

    if (result === 'win') this.#playerWins(r, target, weapon);
    else if (result === 'lose') {
      this.combo = 0;
      this.#enemyHits(r, target, target.damage, { primary: true });
    } else if (this.stats.drawDamage > 0) {
      const hit = this.#hurtEnemy(target, this.stats.drawDamage);
      Object.assign(r, { drawDamage: hit.damage, killed: hit.killed, phaseChanged: hit.phaseChanged, healed: hit.healed });
      r.coins = hit.coins;
    }

    // os outros monstros também jogam (e quem tem dois golpes joga o segundo):
    // quem vence a arma do Caçador acerta meio golpe
    const extra = [
      ...others.map(e => ({ e, move: e.intent, echo: false })),
      ...[target, ...others].filter(e => e.echo).map(e => ({ e, move: e.echo, echo: true })),
    ];
    for (const { e, move, echo } of extra) {
      if (e.hp <= 0 || rps(weapon.move, move) !== 'lose' || this.player.hp <= 0) continue;
      const hit = { uid: e.uid, enemyId: e.id, move, echo, damage: 0, blocked: false, thorns: [] };
      this.#enemyHits(hit, e, Math.round(e.damage * this.stats.sideHitMult));
      r.sideHits.push(hit);
    }
    r.playerDead = this.player.hp <= 0;
    r.drops = this.bonusItems - bonusBefore;

    this.revealed = false;
    this.#checkEnd(r);
    if (!r.waveCleared && !r.playerDead) {
      r.summoned = this.#summon();
      this.prepareIntents();
    }
    return r;
  }

  /** Chefes que invocam: a cada `every` turnos chamam um ajudante (até `max` vivos). */
  #summon() {
    const out = [];
    for (const boss of this.alive().filter(e => e.def.summon)) {
      const { every, id, max } = boss.def.summon;
      const helpers = this.alive().filter(e => e.summoner === boss.uid).length;
      if (boss.history.length % every !== 0 || helpers >= max) continue;
      const helper = this.#spawn(id);
      helper.summoner = boss.uid;
      this.enemies.push(helper);
      out.push({ uid: helper.uid, id, by: boss.uid });
    }
    return out;
  }

  #playerWins(r, target, weapon) {
    r.effectiveness = this.effectiveness(target, weapon.id);
    let dmg = DAMAGE.base + this.stats.weaponBonus[weapon.id] + this.combo * this.stats.comboDamage;
    if (r.effectiveness === 'weak') dmg *= DAMAGE.weaknessMult;
    if (r.effectiveness === 'resist') dmg *= DAMAGE.resistMult;
    if (this.player.empowered) { dmg *= DAMAGE.elixirMult; this.player.empowered = false; r.empowered = true; }
    const hit = this.#hurtEnemy(target, Math.round(dmg));
    Object.assign(r, { damage: hit.damage, killed: hit.killed, phaseChanged: hit.phaseChanged, healed: hit.healed });

    const mult = Math.min(REWARDS.comboMax, 1 + this.combo * REWARDS.comboStep);
    this.combo++;
    r.combo = this.combo;
    r.coins = hit.coins + this.#earn((r.effectiveness === 'weak' ? REWARDS.weaknessHit : REWARDS.hit) * mult);
  }

  /**
   * Um monstro acerta o Caçador. O Amuleto bloqueia o primeiro golpe e os espinhos devolvem dano.
   * `out` recebe o resultado: playerDamage (golpe do alvo) ou damage (golpe lateral), blocked e thorns.
   */
  #enemyHits(out, enemy, amount, { primary = false } = {}) {
    if (this.player.shield) {
      this.player.shield = false;
      out.blocked = true;
      return;
    }
    const dealt = Math.min(this.player.hp, amount);
    this.player.hp -= dealt;
    this.damageTaken += dealt; // só a vida que realmente perdeu
    out[primary ? 'playerDamage' : 'damage'] = dealt;
    if (this.stats.thorns > 0 && enemy.hp > 0) out.thorns.push({ uid: enemy.uid, ...this.#hurtEnemy(enemy, this.stats.thorns) });
  }

  /** Dano num monstro, com as recompensas de abate (moedas, cura das relíquias e chance de item). */
  #hurtEnemy(enemy, amount) {
    const damage = Math.min(enemy.hp, amount);
    const phaseChanged = this.#damage(enemy, damage);
    const killed = enemy.hp <= 0;
    if (killed && this.bonusItems < LOOT.maxDropsPerWave && this.rng() < this.stats.dropChance) this.bonusItems++;
    return {
      damage, killed, phaseChanged,
      healed: killed ? this.#heal(this.stats.healOnKill) : 0,
      coins: killed ? this.#earn(REWARDS.kill) : 0,
    };
  }

  // ─── itens ──────────────────────────────────────────────────
  /** Compra e usa um item na hora (não gasta o turno, mas a bolsa tem limite por onda). */
  useItem(itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, reason: 'Item desconhecido' };
    const fx = item.effect;
    const p = this.player;

    if (this.itemsLeft <= 0) return { ok: false, reason: 'Sua bolsa está vazia nesta onda!' };
    if (fx.heal && p.hp >= p.maxHp) return { ok: false, reason: 'Sua vida já está cheia!' };
    if (fx.shield && p.shield) return { ok: false, reason: 'O Amuleto já está ativo.' };
    if (fx.empower && p.empowered) return { ok: false, reason: 'O Elixir já está ativo.' };
    if (fx.reveal && this.revealed) return { ok: false, reason: 'A Vela já está acesa.' };
    if (!this.economy.spend(item.price)) return { ok: false, reason: 'Moedas insuficientes!' };

    this.itemsUsed++;
    const bonusBefore = this.bonusItems;
    const r = { ok: true, item: item.id, healed: 0, hits: [], waveCleared: false, battleWon: false, clearBonus: 0, drops: 0 };
    if (fx.heal) r.healed = this.#heal(fx.heal);
    if (fx.shield) p.shield = true;
    if (fx.empower) p.empowered = true;
    if (fx.reveal) this.revealed = true;
    if (fx.damageAll) {
      for (const e of this.alive()) r.hits.push({ uid: e.uid, ...this.#hurtEnemy(e, fx.damageAll) });
      r.drops = this.bonusItems - bonusBefore;
      this.#checkEnd(r);
    }
    return r;
  }

  // ─── fim de jogo ────────────────────────────────────────────
  /** Estrelas da fase (1 a 3) pela vida restante. */
  stars() {
    const ratio = this.player.hp / this.player.maxHp;
    return ratio >= STARS.three ? 3 : ratio >= STARS.two ? 2 : 1;
  }

  #checkEnd(r) {
    if (this.alive().length > 0) return;
    r.waveCleared = true;
    if (this.isLastWave) {
      r.battleWon = true;
      r.clearBonus = this.#earn(REWARDS.levelClear + (this.damageTaken === 0 ? REWARDS.perfectBonus : 0));
    }
  }

  #damage(enemy, amount) {
    const before = enemy.phase;
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.def.phases && enemy.hp > 0) {
      const n = enemy.def.phases.length;
      const phase = Math.min(n - 1, Math.floor((1 - enemy.hp / enemy.maxHp) * n));
      enemy.phase = Math.max(enemy.phase, phase);
    }
    return enemy.phase !== before ? enemy.phase : null;
  }

  #heal(amount) {
    if (amount <= 0) return 0;
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    return this.player.hp - before;
  }

  /** Ganha moedas (com o multiplicador das relíquias) e retorna quanto ganhou. */
  #earn(base) {
    const coins = Math.round(base * this.stats.coinMult);
    this.coinsEarned += coins;
    this.economy.add(coins);
    return coins;
  }
}
