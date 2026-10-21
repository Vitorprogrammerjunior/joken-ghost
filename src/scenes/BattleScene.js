// Batalha por turnos: o domínio (domain/battle.js) decide, esta cena anima.
import { Scene } from '../core/Scene.js';
import { GW, PX, hpColor } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { Battle } from '../domain/battle.js';
import * as Bestiary from '../domain/bestiary.js';
import { recordVictory, recordDefeat } from '../domain/progress.js';
import { LEVELS, levelById } from '../config/levels.js';
import { WEAPONS, WEAPON_LIST, ENEMY_MOVES } from '../config/weapons.js';
import { itemById } from '../config/items.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { BattleHud } from '../ui/BattleHud.js';
import { $ } from '../ui/dom.js';

const HUNTER_X = 300;
const SLOTS = [
  { x: 820, y: GROUND_Y - 6 },
  { x: 990, y: GROUND_Y + 26 },
  { x: 1140, y: GROUND_Y - 14 },
];
const BOSS_SLOT = { x: 940, y: GROUND_Y + 10 };
const PHASE_TINTS = [null, ['#d23a3a', 0.22], ['#6a34a3', 0.32]];
const WEAPON_SPARKS = {
  estaca: ['#c99358', '#ecc58a', '#fff3a6'],
  aspirador: ['#a8e070', '#e2ffb0', '#5fb24a'],
  cruz: ['#fff3a6', '#f6d548', '#ffffff'],
};

export class BattleScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-battle');
    this.ui = ui;
    this.hud = new BattleHud(game, {
      attack: (id) => this.attack(id),
      buy: (id) => this.buy(id),
      bestiary: () => this.openBestiary(),
      pause: () => this.pause(),
      toggleMute: () => this.toggleMute(),
    });

    $('pause-resume').addEventListener('click', () => ui.modals.close('modal-pause'));
    $('pause-options').addEventListener('click', () => ui.options.open());
    $('pause-retry').addEventListener('click', async () => {
      if (!(await ui.modals.confirm('Recomeçar a fase do início?'))) return;
      ui.modals.close('modal-pause');
      game.go('battle', { levelId: this.level.id });
    });
    $('pause-quit').addEventListener('click', async () => {
      if (!(await ui.modals.confirm('Sair da fase? O progresso desta batalha será perdido.'))) return;
      ui.modals.close('modal-pause');
      game.go('map', { focus: this.level.id });
    });
    game.bus.on('blur', () => { if (game.scene === this && !this.ending) this.pause(); });
  }

  get book() { return this.game.profile.bestiary; }

  // ═══════════════════════ ciclo de vida ═══════════════════════
  enter({ levelId }) {
    const { assets } = this.game;
    this.level = levelById(levelId);
    this.battle = new Battle({ level: this.level, economy: this.game.economy });
    this.scenery = new Scenery(assets, this.level.scenery);
    this.effects = new Effects(assets);
    this.hunter = new Fighter(assets, { base: 'hunter', x: HUNTER_X, y: GROUND_Y });
    this.fighters = new Map();
    this.targetUid = null;
    this.hoverUid = null;
    this.busy = true;
    this.ending = false;
    this.reveal = null;
    this.jokenWord = null;
    this.shake = 0;

    const p = this.battle.player;
    this.hud.lock(true);
    this.hud.close();
    this.hud.setHp(p.hp, p.maxHp);
    this.hud.setStatus(p);
    this.hud.setCombo(0);
    this.hud.setMuted(this.game.options.muted);
    this.hud.refreshShop();

    this.spawnWave();
    this.intro();
  }

  exit() {
    this.game.renderer.camera.x = this.game.renderer.camera.y = 0;
    this.game.canvas.style.cursor = '';
    this.ui.modals.close('modal-pause');
  }

  async intro() {
    this.hunter.ox = -500;
    this.tweens.to(this.hunter, { ox: 0 }, 800, Ease.outCubic);
    await this.wait(300);
    await this.banner(`FASE ${this.level.id} — ${this.level.name.toUpperCase()}`, 1400);
    await this.banner(this.#announce(), 1000, 'danger');
    this.unlock();
  }

  #announce() {
    const alive = this.battle.alive();
    if (alive.some(e => e.def.boss)) return `${alive[0].def.name.toUpperCase()} APARECEU!`;
    if (alive.length === 1) return `${alive[0].def.name.toUpperCase()} APARECEU!`;
    return `${alive.length} MONSTROS APARECERAM!`;
  }

  banner(text, ms, cls = '') {
    return this.hud.showBanner(text, { ms, cls, wait: (t) => this.wait(t) });
  }

  spawnWave() {
    this.fighters.clear();
    this.battle.enemies.forEach((e, i) => {
      const slot = e.def.boss ? BOSS_SLOT : SLOTS[i];
      const f = new Fighter(this.game.assets, { base: e.def.sprite, x: slot.x, y: slot.y, scale: e.def.scale ?? PX, flying: !!e.def.flying });
      f.hpShown = f.hpTarget = e.hp;
      f.ox = 600 + i * 120;
      this.tweens.to(f, { ox: 0 }, 900 + i * 150, Ease.outCubic);
      this.fighters.set(e.uid, f);
      if (Bestiary.see(this.book, e.id)) this.toast(`Novo monstro no Monstruário: ${e.def.name}!`, 'icon/livro');
    });
    this.game.saveProfile();
    this.hud.setWave(this.battle.waveIndex, this.level.waves.length);
    this.setTarget(this.battle.alive()[0]?.uid);
  }

  unlock() {
    if (this.ending) return;
    this.busy = false;
    this.hud.lock(false);
  }

  toast(text, iconKey) { this.ui.toasts.show(text, { iconKey }); }

  // ═══════════════════════ alvo ═══════════════════════
  setTarget(uid) {
    const e = this.battle.find(uid);
    if (!e || e.hp <= 0) return;
    this.targetUid = uid;
    const known = this.book[e.id] ?? { weak: [], resist: [] };
    const weak = known.weak.filter(w => w === this.battle.weaknessOf(e));
    const resist = known.resist.filter(w => w === this.battle.resistOf(e));
    this.hud.setWeaponHints(weak, resist);
    const many = this.battle.alive().length > 1;
    this.hud.setTargetHint(`ALVO: ${e.def.name}${many ? ' (toque em outro para trocar)' : ''}`);
  }

  cycleTarget(dir) {
    const alive = this.battle.alive();
    if (alive.length < 2) return;
    const i = alive.findIndex(e => e.uid === this.targetUid);
    this.setTarget(alive[(i + dir + alive.length) % alive.length].uid);
    this.game.audio.play('hover');
  }

  ensureTarget() {
    const t = this.battle.find(this.targetUid);
    if (!t || t.hp <= 0) this.setTarget(this.battle.alive()[0]?.uid);
    else this.setTarget(t.uid);
  }

  // ═══════════════════════ turno ═══════════════════════
  async attack(weaponId) {
    if (this.busy || this.ending) return;
    this.ensureTarget();
    const tf = this.fighters.get(this.targetUid);
    if (!tf) return;
    this.busy = true;
    this.hud.lock(true);

    await this.#joken(tf);
    const r = this.battle.attack(weaponId, this.targetUid);
    this.reveal = { weapon: weaponId, move: r.enemyMove, uid: r.targetUid, t: 0 };
    this.game.audio.play('go');
    await this.wait(600);

    if (r.outcome === 'win') await this.#playerHits(r, tf);
    else if (r.outcome === 'lose') await this.#enemyHits(r, tf);
    else await this.#clash(tf);

    this.reveal = null;
    await this.#afterExchange(r);
  }

  async #joken(tf) {
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = { text: word, t: 0 };
      this.hunter.oy = -14; tf.oy = -14;
      this.tweens.to(this.hunter, { oy: 0 }, 180);
      this.tweens.to(tf, { oy: 0 }, 180);
      await this.wait(240);
    }
    this.jokenWord = null;
  }

  async #playerHits(r, tf) {
    const w = WEAPONS[r.weapon];
    const e = this.battle.find(r.targetUid);
    this.hunter.play('attack');
    await this.wait(170);
    this.game.audio.play('swing');
    const c = tf.center;
    if (w.projectile) {
      await this.effects.projectile(w.projectile, { x: this.hunter.x + 100, y: this.hunter.y - 84 }, c, { ms: 220 });
    }
    this.effects.play(w.fx, c.x, c.y, { scale: w.id === 'estaca' ? PX : 3 });
    await this.wait(w.projectile ? 30 : 220);

    this.reveal = null;
    tf.hpTarget = e.hp; // a barra só desce no impacto
    tf.flash = 1; tf.flashColor = '#ffffff';
    tf.play('hurt');
    tf.shake(320, 8);
    this.game.audio.play(r.effectiveness === 'weak' ? 'super' : 'hit');
    this.screenShake(r.effectiveness === 'weak' ? 10 : 5);
    this.particles.burst(c.x, c.y, { colors: WEAPON_SPARKS[w.id], count: r.effectiveness === 'weak' ? 24 : 14, speed: 220 });

    const top = this.#topOf(tf);
    if (this.game.options.damageNumbers) {
      const weak = r.effectiveness === 'weak';
      this.effects.text(`-${r.damage}`, c.x, top - 60, { color: weak ? '#f6d548' : '#f4f2fa', size: weak ? 40 : 32 });
    }
    if (r.effectiveness === 'weak') this.effects.text('SUPER EFETIVO!', c.x, top - 110, { color: '#f6d548', size: 16, delay: 120, life: 1300 });
    if (r.effectiveness === 'resist') this.effects.text('RESISTIU...', c.x, top - 110, { color: '#9b98ab', size: 16, delay: 120 });
    if (r.empowered) this.effects.text('FÚRIA!', c.x, top - 140, { color: '#f08c2a', size: 16, delay: 200 });

    // moedas
    this.effects.play('fx/coin', c.x + 90, c.y, { fps: 18 });
    this.effects.text(`+${r.coins}`, c.x + 90, c.y - 30, { color: '#f6d548', size: 16, delay: 250 });
    setTimeout(() => this.game.audio.play('coin'), 250);
    this.hud.setCombo(r.combo);

    // monstruário
    if (r.effectiveness !== 'normal') {
      const kind = r.effectiveness === 'weak' ? 'weak' : 'resist';
      if (Bestiary.reveal(this.book, e.id, kind, w.id)) {
        this.toast(kind === 'weak'
          ? `Fraqueza descoberta! ${e.def.name} é fraco contra ${w.name}.`
          : `${e.def.name} resiste a ${w.name}.`, w.icon);
        this.game.saveProfile();
      }
    }
    await this.wait(650);
  }

  async #enemyHits(r, tf) {
    const mv = ENEMY_MOVES[r.enemyMove];
    tf.play('attack');
    await this.wait(260);
    const hc = this.hunter.center;
    if (mv.move === 'tesoura') {
      await this.effects.projectile('fx/proj_orb', tf.center, hc, { ms: 260, flipX: true, arc: 40 });
    }
    this.effects.play(mv.fx, hc.x, hc.y + (mv.move === 'pedra' ? 10 : 0), { scale: 3 });
    await this.wait(200);

    this.reveal = null;
    if (r.blocked) {
      this.effects.play('fx/shield', hc.x, hc.y, { scale: 3, fps: 10 });
      this.game.audio.play('block');
      this.effects.text('BLOQUEADO!', hc.x, hc.y - 110, { color: '#6f96f0', size: 24 });
    } else {
      this.hunter.play('hurt');
      this.hunter.flash = 1; this.hunter.flashColor = '#ff7563';
      this.hunter.shake(320, 8);
      this.game.audio.play('hurt');
      this.screenShake(12);
      this.particles.burst(hc.x, hc.y, { colors: ['#d23a3a', '#ff7563', '#a35fd9'], count: 14 });
      if (this.game.options.damageNumbers) this.effects.text(`-${r.playerDamage}`, hc.x, hc.y - 80, { color: '#ff7563', size: 40 });
    }
    this.hud.setCombo(0);
    this.#syncPlayer();
    await this.wait(700);
  }

  async #clash(tf) {
    const mid = { x: (this.hunter.x + tf.x) / 2, y: GROUND_Y - 110 };
    this.tweens.to(this.hunter, { ox: 60 }, 140, Ease.inQuad);
    await this.tweens.to(tf, { ox: -60 }, 140, Ease.inQuad);
    this.effects.play('fx/hit', mid.x, mid.y, { scale: 3 });
    this.particles.burst(mid.x, mid.y, { colors: ['#c9c7d4', '#f4f2fa'], count: 10 });
    this.game.audio.play('draw');
    this.effects.text('EMPATE!', mid.x, mid.y - 60, { color: '#c9c7d4', size: 24 });
    this.tweens.to(this.hunter, { ox: 0 }, 300, Ease.outBack);
    this.tweens.to(tf, { ox: 0 }, 300, Ease.outBack);
    await this.wait(650);
  }

  async #afterExchange(r) {
    this.#syncPlayer();
    if (r.killed) await this.killEnemy(r.targetUid);
    if (r.phaseChanged != null) await this.bossPhase(r.targetUid, r.phaseChanged);
    await this.#resolveEnd(r);
  }

  async #resolveEnd(r) {
    if (r.playerDead) return this.defeat();
    if (r.battleWon) return this.victory();
    if (r.waveCleared) await this.nextWave();
    this.ensureTarget();
    this.unlock();
  }

  async killEnemy(uid) {
    const f = this.fighters.get(uid);
    const e = this.battle.find(uid);
    if (!f || f.dying) return;
    f.dying = true;
    f.play('hurt', { hold: true });
    f.flash = 1;
    await this.wait(250);
    this.game.audio.play('poof');
    const c = f.center;
    this.effects.play('fx/poof', c.x, c.y, { scale: f.scale + 1 });
    this.tweens.to(f, { alpha: 0, sy: 0.3 }, 320);
    if (Bestiary.kill(this.book, e.id)) this.toast(`Comportamento descoberto: ${e.def.name}! Veja no Monstruário.`, 'icon/livro');
    this.game.saveProfile();
    await this.wait(380);
    this.fighters.delete(uid);
  }

  async bossPhase(uid, phase) {
    const f = this.fighters.get(uid);
    if (!f) return;
    this.game.audio.play('phase');
    this.screenShake(16);
    f.flash = 1; f.flashColor = '#ffffff';
    f.tint = PHASE_TINTS[phase] ?? null;
    await this.banner('KASTLE MUDOU DE FORMA!', 1200, 'danger');
    this.toast('A fraqueza de Kastle mudou! Descubra a nova.', 'icon/caveira');
    this.setTarget(uid);
  }

  async nextWave() {
    await this.wait(300);
    const info = this.battle.nextWave();
    await this.banner(`ONDA ${info.wave + 1}!`, 900);
    if (info.healed) {
      const hc = this.hunter.center;
      this.effects.play('fx/heal', hc.x, hc.y, { scale: 3 });
      this.effects.text(`+${info.healed}`, hc.x, hc.y - 80, { color: '#a8e070', size: 32 });
      this.game.audio.play('heal');
    }
    this.#syncPlayer();
    this.spawnWave();
    await this.wait(900);
    await this.banner(this.#announce(), 900, 'danger');
  }

  async victory() {
    this.ending = true;
    this.hud.lock(true);
    this.hud.setCombo(0);
    this.hunter.play('win', { loop: true });
    this.game.audio.play('win');
    await this.banner('VITÓRIA!', 1500, 'win');
    const p = this.game.profile;
    const before = p.unlocked;
    const stars = this.battle.stars();
    recordVictory(p, this.level.id, stars, LEVELS.length);
    p.stats.turns += this.battle.turns;
    this.game.saveProfile();
    this.game.go('result', {
      levelId: this.level.id, won: true, stars,
      coinsEarned: this.battle.coinsEarned, damageTaken: this.battle.damageTaken, turns: this.battle.turns,
      unlockedNew: p.unlocked > before,
    });
  }

  async defeat() {
    this.ending = true;
    this.hud.lock(true);
    this.hunter.play('ko', { hold: true });
    this.game.audio.play('lose');
    await this.banner('DERROTA...', 1600, 'lose');
    const p = this.game.profile;
    recordDefeat(p);
    p.stats.turns += this.battle.turns;
    this.game.saveProfile();
    this.game.go('result', {
      levelId: this.level.id, won: false, stars: 0,
      coinsEarned: this.battle.coinsEarned, damageTaken: this.battle.damageTaken, turns: this.battle.turns,
    });
  }

  // ═══════════════════════ loja ═══════════════════════
  async buy(itemId) {
    if (this.busy || this.ending) return;
    const r = this.battle.useItem(itemId);
    if (!r.ok) {
      this.game.audio.play('error');
      this.ui.toasts.show(r.reason, { iconKey: 'icon/fechar', force: true });
      return;
    }
    const it = itemById(itemId);
    this.busy = true;
    this.hud.lock(true);
    const hc = this.hunter.center;
    const p = this.battle.player;

    if (r.healed) {
      this.effects.play('fx/heal', hc.x, hc.y, { scale: 3 });
      this.effects.text(`+${r.healed}`, hc.x, hc.y - 80, { color: '#a8e070', size: 32 });
      this.game.audio.play('heal');
    }
    if (it.effect.shield) { this.effects.play('fx/shield', hc.x, hc.y, { scale: 3, fps: 8 }); this.game.audio.play('block'); }
    if (it.effect.empower) { this.particles.burst(hc.x, hc.y, { colors: ['#f08c2a', '#ffc04d', '#d23a3a'], count: 20 }); this.game.audio.play('super'); }
    if (it.effect.reveal) {
      const t = this.battle.find(this.targetUid);
      this.game.audio.play('select');
      if (t) this.toast(`A Vela revela: ${t.def.name} vai usar ${ENEMY_MOVES[t.intent].name}!`, ENEMY_MOVES[t.intent].icon);
    }
    for (const hit of r.hits) {
      const f = this.fighters.get(hit.uid);
      if (!f) continue;
      this.effects.play('fx/cruz', f.center.x, f.center.y, { scale: 3 });
      f.hpTarget = this.battle.find(hit.uid)?.hp ?? 0;
      f.flash = 1; f.play('hurt');
      if (this.game.options.damageNumbers) this.effects.text(`-${hit.damage}`, f.center.x, f.center.y - 70, { color: '#b8d0ff', size: 32 });
    }
    if (r.hits.length) { this.game.audio.play('hit'); this.screenShake(8); }

    this.toast(`${it.name} usado!`, it.icon);
    this.hud.setStatus(p);
    this.#syncPlayer();
    await this.wait(700);

    for (const hit of r.hits) {
      if (hit.killed) await this.killEnemy(hit.uid);
      else if (hit.phaseChanged != null) await this.bossPhase(hit.uid, hit.phaseChanged);
    }
    await this.#resolveEnd(r);
  }

  #syncPlayer() {
    const p = this.battle.player;
    this.hud.setHp(p.hp, p.maxHp);
    this.hud.setStatus({ ...p, revealed: this.battle.revealed });
  }

  // ═══════════════════════ pausa / extras ═══════════════════════
  pause() {
    if (this.ending || this.ui.modals.isOpen('modal-pause')) return;
    this.paused = true;
    this.ui.modals.open('modal-pause', { onClose: () => { this.paused = false; } });
  }

  openBestiary() {
    if (this.busy) return;
    const t = this.battle.find(this.targetUid);
    this.paused = true;
    this.ui.bestiary.open(t?.id, { onClose: () => { this.paused = false; } });
  }

  toggleMute() {
    const muted = !this.game.options.muted;
    this.game.setOption('muted', muted);
    this.game.audio.setMuted(muted);
    this.hud.setMuted(muted);
  }

  screenShake(mag) {
    if (this.game.options.shake) this.shake = Math.max(this.shake, mag);
  }

  // ═══════════════════════ entrada ═══════════════════════
  onKey(e) {
    const weapon = WEAPON_LIST.find(w => e.code === `Digit${w.key}` || e.code === `Numpad${w.key}`);
    if (weapon) { this.attack(weapon.id); return true; }
    switch (e.code) {
      case 'KeyA': this.hud.toggle('attack'); return true;
      case 'KeyS': case 'KeyL': this.hud.toggle('shop'); return true;
      case 'KeyB': case 'KeyM': this.openBestiary(); return true;
      case 'Tab': case 'ArrowRight': this.cycleTarget(1); return true;
      case 'ArrowLeft': this.cycleTarget(-1); return true;
      case 'Escape':
        if (this.hud.open) this.hud.close();
        else this.pause();
        return true;
      default: return false;
    }
  }

  #enemyAt(x, y) {
    // de frente para trás: o mais próximo da câmera (maior y) primeiro
    const list = [...this.fighters.entries()].filter(([, f]) => !f.dying).sort((a, b) => b[1].y - a[1].y);
    return list.find(([, f]) => f.contains(x, y))?.[0] ?? null;
  }

  onPointer(type, x, y) {
    const uid = this.#enemyAt(x, y);
    if (type === 'move') {
      this.hoverUid = uid;
      this.game.canvas.style.cursor = uid ? 'pointer' : '';
    } else if (type === 'down') {
      if (uid && uid !== this.targetUid) { this.setTarget(uid); this.game.audio.play('select'); }
      else if (!uid && this.hud.open) this.hud.close();
    }
  }

  // ═══════════════════════ loop ═══════════════════════
  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    this.effects.update(dt);
    this.hunter.update(dt);
    for (const [uid, f] of this.fighters) {
      f.update(dt);
      const e = this.battle.find(uid);
      if (e) f.hpShown += (f.hpTarget - f.hpShown) * Math.min(1, dt / 120);
    }
    if (this.reveal) this.reveal.t += dt;
    if (this.jokenWord) this.jokenWord.t += dt;
    const cam = this.game.renderer.camera;
    if (this.shake > 0.5) {
      cam.x = (Math.random() * 2 - 1) * this.shake;
      cam.y = (Math.random() * 2 - 1) * this.shake * 0.6;
      this.shake *= Math.pow(0.9, dt / 16);
    } else {
      cam.x = cam.y = this.shake = 0;
    }
  }

  render(r) {
    this.scenery.drawBack(r);

    // anel no chão do alvo / do monstro sob o cursor
    for (const [uid, f] of this.fighters) {
      if (f.dying || (uid !== this.targetUid && uid !== this.hoverUid)) continue;
      const isTarget = uid === this.targetUid;
      const ctx = r.ctx;
      ctx.save();
      ctx.globalAlpha = isTarget ? 0.6 + Math.sin(this.time / 200) * 0.3 : 0.5;
      ctx.strokeStyle = isTarget ? '#f6d548' : '#f4f2fa';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(f.x + f.ox, f.y, 26 * f.scale, 6 * f.scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const actors = [this.hunter, ...this.fighters.values()].sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw(r);
    this.effects.draw(r);
    this.particles.draw(r);
    this.scenery.drawFront(r);

    this.#drawEnemyBars(r);
    this.#drawReveal(r);
    if (this.jokenWord) {
      const k = Math.min(1, this.jokenWord.t / 120);
      r.text(this.jokenWord.text, GW / 2, 260, { size: 64, align: 'center', color: '#f6d548', alpha: k });
    }
  }

  /** Topo visível do sprite (para posicionar textos acima). */
  #topOf(f) {
    return f.drawY - 64 * f.scale + (f.scale > PX ? 30 : 14) - 40;
  }

  #drawEnemyBars(r) {
    for (const [uid, f] of this.fighters) {
      const e = this.battle.find(uid);
      if (!e || f.dying || f.alpha < 0.5) continue;
      const isTarget = uid === this.targetUid;
      const boss = e.def.boss;
      const w = boss ? 200 : 104;
      const top = f.drawY - 64 * f.scale + (boss ? 30 : 14);
      const x = f.drawX - w / 2;
      const ratio = e.hp / e.maxHp;
      if (isTarget || uid === this.hoverUid || boss) r.text(e.def.name, f.drawX, top - 22, { size: 16, align: 'center', color: isTarget ? '#f6d548' : '#f4f2fa' });
      r.bar(x, top - 12, w, 10, f.hpShown / e.maxHp, { fill: hpColor(ratio) });
      if (boss) {
        for (let i = 0; i < e.def.phases.length; i++) r.rect(x + i * 14, top + 4, 10, 6, i <= e.phase ? '#d23a3a' : '#2f2a3d');
      }
      if (isTarget) {
        const bob = Math.sin(this.time / 180) * 4;
        r.text('▼', f.drawX, top - 44 + bob, { size: 16, align: 'center', color: '#f6d548' });
        // a Vela mostra o próximo ataque do alvo
        if (this.battle.revealed && !this.reveal) {
          const mv = ENEMY_MOVES[e.intent];
          r.sprite(mv.icon, 0, f.drawX + w / 2 + 34, top - 16 + bob, { scale: 1 });
        }
      }
    }
  }

  #drawReveal(r) {
    if (!this.reveal) return;
    const f = this.fighters.get(this.reveal.uid);
    const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
    const a = Math.min(1, (1400 - this.reveal.t) / 200);
    const hc = this.hunter.center;
    r.sprite(WEAPONS[this.reveal.weapon].icon, 0, hc.x, hc.y - 140, { scale: 1, sx: k, sy: k, alpha: a });
    if (f) {
      const top = f.drawY - 64 * f.scale;
      r.sprite(ENEMY_MOVES[this.reveal.move].icon, 0, f.drawX, top - 70, { scale: 1, sx: k, sy: k, alpha: a });
    }
  }
}
