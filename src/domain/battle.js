// Regras de uma batalha, sem nenhuma dependência de tela.
// A cena (scenes/BattleScene.js) chama estes métodos e anima os resultados.
import { DAMAGE, PLAYER, REWARDS, STARS } from '../config/balance.js';
import { ENEMIES } from '../config/enemies.js';
import { WEAPONS } from '../config/weapons.js';
import { itemById } from '../config/items.js';
import { chooseMove } from './enemyAI.js';
import { outcome as rps } from './rps.js';

let nextUid = 1;

export class Battle {
  /**
   * @param {object} opts
   * @param {object} opts.level     definição da fase (config/levels.js)
   * @param {import('./economy.js').Economy} opts.economy
   * @param {() => number} [opts.rng]
   */
  constructor({ level, economy, rng = Math.random }) {
    this.level = level;
    this.economy = economy;
    this.rng = rng;
    this.waveIndex = 0;
    this.enemies = [];
    this.player = { hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, shield: false, empowered: false };
    this.playerHistory = [];
    this.combo = 0;
    this.revealed = false;
    this.damageTaken = 0;
    this.coinsEarned = 0;
    this.turns = 0;
    this.startWave();
  }

  // ─── ondas ──────────────────────────────────────────────────
  get wave() { return this.level.waves[this.waveIndex]; }
  get isLastWave() { return this.waveIndex >= this.level.waves.length - 1; }

  startWave() {
    this.enemies = this.wave.map((id) => {
      const def = ENEMIES[id];
      if (!def) throw new Error(`Inimigo desconhecido: ${id}`);
      return { uid: nextUid++, id, def, hp: def.hp, maxHp: def.hp, phase: 0, history: [], intent: null };
    });
    this.revealed = false;
    this.prepareIntents();
  }

  /** Avança para a próxima onda e recupera um pouco de vida. */
  nextWave() {
    if (this.isLastWave) return null;
    this.waveIndex++;
    const healed = this.#heal(PLAYER.healBetweenWaves);
    this.startWave();
    return { healed, wave: this.waveIndex };
  }

  alive() { return this.enemies.filter(e => e.hp > 0); }
  find(uid) { return this.enemies.find(e => e.uid === uid); }

  /** Os monstros decidem a jogada antes do Caçador (a Vela consegue ver). */
  prepareIntents() {
    for (const e of this.alive()) {
      e.intent = chooseMove(e.def.ai, { playerHistory: this.playerHistory, ownHistory: e.history }, this.rng);
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
    const enemyMove = target.intent;
    const result = rps(weapon.move, enemyMove);
    this.playerHistory.push(weapon.move);
    target.history.push(enemyMove);

    const r = {
      weapon: weapon.id, enemyMove, outcome: result, targetUid: target.uid, enemyId: target.id,
      damage: 0, effectiveness: 'normal', killed: false, coins: 0, combo: 0,
      blocked: false, playerDamage: 0, playerDead: false, empowered: false,
      phaseChanged: null, waveCleared: false, battleWon: false, clearBonus: 0,
    };

    if (result === 'win') {
      r.effectiveness = this.effectiveness(target, weapon.id);
      let dmg = DAMAGE.base;
      if (r.effectiveness === 'weak') dmg *= DAMAGE.weaknessMult;
      if (r.effectiveness === 'resist') dmg *= DAMAGE.resistMult;
      if (this.player.empowered) { dmg *= DAMAGE.elixirMult; this.player.empowered = false; r.empowered = true; }
      r.damage = Math.round(dmg);
      r.phaseChanged = this.#damage(target, r.damage);
      r.killed = target.hp <= 0;

      const mult = Math.min(REWARDS.comboMax, 1 + this.combo * REWARDS.comboStep);
      this.combo++;
      r.combo = this.combo;
      r.coins = Math.round((r.effectiveness === 'weak' ? REWARDS.weaknessHit : REWARDS.hit) * mult);
      if (r.killed) r.coins += REWARDS.kill;
      this.#earn(r.coins);
    } else if (result === 'lose') {
      this.combo = 0;
      if (this.player.shield) {
        this.player.shield = false;
        r.blocked = true;
      } else {
        r.playerDamage = target.def.damage;
        this.damageTaken += Math.min(this.player.hp, r.playerDamage); // só a vida que realmente perdeu
        this.player.hp = Math.max(0, this.player.hp - r.playerDamage);
        r.playerDead = this.player.hp <= 0;
      }
    }

    this.revealed = false;
    this.#checkEnd(r);
    if (!r.waveCleared && !r.playerDead) this.prepareIntents();
    return r;
  }

  // ─── itens ──────────────────────────────────────────────────
  /** Compra e usa um item na hora. Retorna { ok, reason?, ... }. */
  useItem(itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, reason: 'Item desconhecido' };
    const fx = item.effect;
    const p = this.player;

    if (fx.heal && p.hp >= p.maxHp) return { ok: false, reason: 'Sua vida já está cheia!' };
    if (fx.shield && p.shield) return { ok: false, reason: 'O Amuleto já está ativo.' };
    if (fx.empower && p.empowered) return { ok: false, reason: 'O Elixir já está ativo.' };
    if (fx.reveal && this.revealed) return { ok: false, reason: 'A Vela já está acesa.' };
    if (!this.economy.spend(item.price)) return { ok: false, reason: 'Moedas insuficientes!' };

    const r = { ok: true, item: item.id, healed: 0, hits: [], waveCleared: false, battleWon: false, clearBonus: 0 };
    if (fx.heal) r.healed = this.#heal(fx.heal);
    if (fx.shield) p.shield = true;
    if (fx.empower) p.empowered = true;
    if (fx.reveal) this.revealed = true;
    if (fx.damageAll) {
      for (const e of this.alive()) {
        const phaseChanged = this.#damage(e, fx.damageAll);
        r.hits.push({ uid: e.uid, damage: fx.damageAll, killed: e.hp <= 0, phaseChanged });
      }
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
      r.clearBonus = REWARDS.levelClear + (this.damageTaken === 0 ? REWARDS.perfectBonus : 0);
      this.#earn(r.clearBonus);
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
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    return this.player.hp - before;
  }

  #earn(coins) {
    this.coinsEarned += coins;
    this.economy.add(coins);
  }
}
