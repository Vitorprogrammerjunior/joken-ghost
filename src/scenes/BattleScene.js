// Batalha por turnos: o domínio (domain/battle.js) decide, esta cena anima.
// O modo (battleModes.js) diz se é uma fase da campanha ou uma corrida.
import { Scene } from '../core/Scene.js';
import { GW, PX } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import * as Bestiary from '../domain/bestiary.js';
import { WEAPONS, WEAPON_LIST, ENEMY_MOVES } from '../config/weapons.js';
import { itemById } from '../config/items.js';
import { BattleStage, LAYOUT } from '../world/BattleStage.js';
import { CHARACTERS, selectedCharacter } from '../config/characters.js';
import { hunterBase } from '../world/hunterLook.js';
import { createMode } from './battleModes.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { BattleHud } from '../ui/BattleHud.js';
import { $ } from '../ui/dom.js';

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
      target: (uid) => { if (!this.busy && uid !== this.targetUid) { this.setTarget(uid); this.game.audio.play('select'); } },
      cycleTarget: () => this.cycleTarget(1),
    });

    $('pause-resume').addEventListener('click', () => ui.modals.close('modal-pause'));
    $('pause-options').addEventListener('click', () => ui.options.open());
    $('pause-retry').addEventListener('click', async () => {
      if (!(await ui.modals.confirm(this.mode.retryQuestion))) return;
      ui.modals.close('modal-pause');
      game.go('battle', this.mode.retryParams);
    });
    $('pause-quit').addEventListener('click', async () => {
      if (!(await ui.modals.confirm('Sair? O progresso desta batalha será perdido.'))) return;
      ui.modals.close('modal-pause');
      game.go(...this.mode.quitTo);
    });
    // perder o foco pausa, a não ser que já haja uma janela aberta (escolha de relíquia, opções...)
    game.bus.on('blur', () => { if (game.scene === this && !this.ending && !game.modalOpen) this.pause(); });
  }

  get book() { return this.game.profile.bestiary; }

  // ═══════════════════════ ciclo de vida ═══════════════════════
  /** @param {{ levelId?: number, run?: 'endless' | 'daily' }} params */
  enter(params) {
    const { assets } = this.game;
    this.mode = createMode(this.game, params);
    this.battle = this.mode.battle;
    this.#buildStage(this.mode.scenery);
    this.effects = new Effects(assets);
    const char = CHARACTERS[selectedCharacter(this.game.storage)];
    this.playerName = char.name;
    $('player-name').textContent = char.name.toUpperCase();
    const P = LAYOUT.player;
    this.hunter = new Fighter(assets, { base: hunterBase(this.game, 'back'), x: P.x, y: P.y, scale: P.scale });
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
    this.hud.bindEconomy(this.mode.economy);
    this.hud.setRelics(this.mode.relics);
    this.#syncBag();

    this.spawnWave();
    this.intro();
  }

  exit() {
    this.hud.bindEconomy(null);
    this.game.renderer.camera.x = this.game.renderer.camera.y = 0;
    this.game.canvas.style.cursor = '';
    this.ui.modals.close('modal-pause');
  }

  async intro() {
    this.hunter.ox = -500;
    this.tweens.to(this.hunter, { ox: 0 }, 800, Ease.outCubic);
    this.hud.say(this.#appearText());
    await this.wait(300);
    await this.banner(this.mode.title, 1400);
    await this.banner(this.#announce(), 1000, 'danger');
    this.unlock();
  }

  #announce() {
    const alive = this.battle.alive();
    if (alive.some(e => e.def.boss)) return `${alive[0].def.name.toUpperCase()} APARECEU!`;
    if (alive.length === 1) return `${alive[0].def.name.toUpperCase()} APARECEU!`;
    return `${alive.length} MONSTROS APARECERAM!`;
  }

  #appearText() {
    const alive = this.battle.alive();
    if (alive.length === 1) return alive[0].def.boss ? `${alive[0].def.name} surgiu das sombras!` : `Um ${alive[0].def.name} selvagem apareceu!`;
    return `${alive.map(e => e.def.name).join(', ').replace(/, ([^,]*)$/, ' e $1')} apareceram!`;
  }

  banner(text, ms, cls = '') {
    return this.hud.showBanner(text, { ms, cls, wait: (t) => this.wait(t) });
  }

  spawnWave() {
    this.fighters.clear();
    this.battle.enemies.forEach((e, i) => this.#enterFighter(e, e.def.boss ? LAYOUT.boss : LAYOUT.enemySlots[i], i));
    this.game.saveProfile();
    this.hud.setWaveLabel(this.mode.waveLabel);
    this.#syncEnemyBoxes();
    const boss = this.battle.enemies.find(e => e.def.boss);
    this.game.audio.playMusic(boss ? boss.def.music ?? 'chefe' : this.mode.music);
    this.setTarget(this.battle.alive()[0]?.uid);
  }

  /** Coloca um monstro no palco entrando pela direita (e registra no Monstruário). */
  #enterFighter(e, slot, order = 0) {
    const f = new Fighter(this.game.assets, { base: e.def.sprite, x: slot.x, y: slot.y, scale: e.def.scale ?? PX, flying: !!e.def.flying });
    f.ox = 600 + order * 120;
    this.tweens.to(f, { ox: 0 }, 900 + order * 150, Ease.outCubic);
    this.fighters.set(e.uid, f);
    if (Bestiary.see(this.book, e.id)) this.toast(`Novo monstro no Monstruário: ${e.def.name}!`, 'icon/livro');
  }

  /** Primeira posição livre do palco para um ajudante invocado (o chefe fica no centro). */
  #freeSlot() {
    const taken = (s) => [...this.fighters.values()].some(f => !f.dying && Math.abs(f.x - s.x) < 40);
    return LAYOUT.enemySlots.slice(1).find(s => !taken(s)) ?? LAYOUT.enemySlots[1];
  }

  /** Ajudantes chamados por um chefe neste turno. */
  async #showSummons(list) {
    for (const s of list) {
      const helper = this.battle.find(s.uid);
      const boss = this.battle.find(s.by);
      this.fighters.get(s.by)?.play('attack');
      this.game.audio.play('phase');
      this.#enterFighter(helper, this.#freeSlot());
      this.hud.say(`${boss.def.name} chamou um ${helper.def.name}!`);
      await this.wait(700);
    }
    if (list.length) this.#syncEnemyBoxes();
  }

  #syncEnemyBoxes() {
    this.hud.setEnemies(this.battle.alive().map(e => ({ uid: e.uid, name: e.def.name, ratio: e.hp / e.maxHp, boss: !!e.def.boss, phases: e.def.phases?.length ?? 0 })));
    if (this.targetUid) this.hud.setTarget(this.targetUid);
  }

  unlock() {
    if (this.ending) return;
    this.busy = false;
    this.hud.lock(false);
    this.hud.say(`O que ${this.playerName} vai fazer?${this.#tellsLine()}`);
  }

  /** Segunda linha da mensagem com as pistas visíveis (a caixa só tem duas linhas). */
  #tellsLine() {
    if (this.battle.revealed) return '';
    const tells = this.battle.alive().filter(e => e.tell);
    if (tells.length === 0) return '';
    if (tells.length > 1) return `\n${tells.length} monstros deixaram escapar uma pista!`;
    return `\nPista: ${tells[0].def.name} → ${ENEMY_MOVES[tells[0].tell].name}`;
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
    this.hud.setTarget(uid);
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
    const r = this.mode.attack(weaponId, this.targetUid);
    this.reveal = { weapon: weaponId, moves: r.moves, t: 0 };
    this.hud.say(`${this.playerName} usou ${WEAPONS[weaponId].name}!\n${this.battle.find(r.targetUid).def.name} usou ${ENEMY_MOVES[r.enemyMove].name}!`);
    this.game.audio.play('go');
    await this.wait(600);

    if (r.outcome === 'win') await this.#playerHits(r, tf);
    else if (r.outcome === 'lose') await this.#enemyHits(r, tf);
    else await this.#clash(r, tf);
    this.reveal = null;
    for (const hit of r.sideHits) await this.#sideHit(hit);

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
      await this.effects.projectile(w.projectile, { x: this.hunter.x + 75, y: this.hunter.y - 114 }, c, { ms: 260 });
    }
    this.effects.play(w.fx, c.x, c.y, { scale: w.id === 'estaca' ? PX : 3 });
    await this.wait(w.projectile ? 30 : 220);

    this.reveal = null;
    this.hud.setEnemyHp(e.uid, e.hp / e.maxHp, e.phase); // a barra só desce no impacto
    this.hud.say(r.effectiveness === 'weak' ? 'É super efetivo!' : r.effectiveness === 'resist' ? 'Não foi muito efetivo...' : `${e.def.name} recebeu ${r.damage} de dano!`);
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
    if (r.blocked) this.#hunterBlocks('O Amuleto bloqueou o golpe!');
    else {
      this.#hunterHurt(r.playerDamage, { big: true });
      this.hud.say(`${this.playerName} recebeu ${r.playerDamage} de dano!`);
    }
    this.#showThorns(r.thorns);
    this.hud.setCombo(0);
    this.#syncPlayer();
    await this.wait(700);
  }

  /** Um monstro que não era o alvo venceu a arma do Caçador e acerta meio golpe. */
  async #sideHit(hit) {
    const f = this.fighters.get(hit.uid);
    if (!f || f.dying) return;
    const name = this.battle.find(hit.uid).def.name;
    const mv = ENEMY_MOVES[hit.move];
    f.play('attack');
    await this.wait(220);
    const hc = this.hunter.center;
    this.effects.play(mv.fx, hc.x, hc.y, { scale: PX });
    await this.wait(160);
    if (hit.blocked) this.#hunterBlocks(`O Amuleto bloqueou o golpe de ${name}!`);
    else {
      this.#hunterHurt(hit.damage);
      this.hud.say(hit.echo ? `${name} atacou de novo e acertou ${hit.damage}!` : `${name} aproveitou e acertou ${hit.damage} de dano!`);
    }
    this.#showThorns(hit.thorns);
    this.#syncPlayer();
    await this.wait(500);
  }

  #hunterBlocks(message) {
    const hc = this.hunter.center;
    this.effects.play('fx/shield', hc.x, hc.y, { scale: 3, fps: 10 });
    this.game.audio.play('block');
    this.effects.text('BLOQUEADO!', hc.x, hc.y - 110, { color: '#6f96f0', size: 24 });
    this.hud.say(message);
  }

  #hunterHurt(amount, { big = false } = {}) {
    const hc = this.hunter.center;
    this.hunter.play('hurt');
    this.hunter.flash = 1; this.hunter.flashColor = '#ff7563';
    this.hunter.shake(320, big ? 8 : 5);
    this.game.audio.play('hurt');
    this.screenShake(big ? 12 : 6);
    this.particles.burst(hc.x, hc.y, { colors: ['#d23a3a', '#ff7563', '#a35fd9'], count: big ? 14 : 8 });
    if (this.game.options.damageNumbers) this.effects.text(`-${amount}`, hc.x, hc.y - 80, { color: '#ff7563', size: big ? 40 : 32 });
  }

  /** Espinhos das relíquias: dano devolvido a quem acertou o Caçador. */
  #showThorns(list) {
    for (const t of list) {
      const f = this.fighters.get(t.uid);
      if (!f) continue;
      f.flash = 1; f.flashColor = '#a8e070';
      this.effects.text(`-${t.damage}`, f.center.x, this.#topOf(f) - 40, { color: '#a8e070', size: 24 });
      this.#syncEnemyBar(t.uid);
    }
  }

  async #clash(r, tf) {
    const hc = this.hunter.center, ec = tf.center;
    const mid = { x: (hc.x + ec.x) / 2, y: (hc.y + ec.y) / 2 };
    this.hud.say('Empate! Os golpes se anularam.');
    this.tweens.to(this.hunter, { ox: 60 }, 140, Ease.inQuad);
    await this.tweens.to(tf, { ox: -60 }, 140, Ease.inQuad);
    this.effects.play('fx/hit', mid.x, mid.y, { scale: 3 });
    this.particles.burst(mid.x, mid.y, { colors: ['#c9c7d4', '#f4f2fa'], count: 10 });
    this.game.audio.play('draw');
    this.effects.text('EMPATE!', mid.x, mid.y - 60, { color: '#c9c7d4', size: 24 });
    if (r.drawDamage) {
      tf.flash = 1; tf.flashColor = '#ffffff';
      this.effects.text(`-${r.drawDamage}`, tf.center.x, this.#topOf(tf) - 60, { color: '#f4f2fa', size: 32, delay: 120 });
      this.#syncEnemyBar(r.targetUid);
    }
    this.tweens.to(this.hunter, { ox: 0 }, 300, Ease.outBack);
    this.tweens.to(tf, { ox: 0 }, 300, Ease.outBack);
    await this.wait(650);
  }

  async #afterExchange(r) {
    this.#syncPlayer();
    const thorns = [...r.thorns, ...r.sideHits.flatMap(h => h.thorns)];
    this.#showHeal(r.healed + thorns.reduce((s, t) => s + t.healed, 0));
    this.#showDrops(r.drops);
    await this.#reapDead();
    const phases = [{ uid: r.targetUid, phaseChanged: r.phaseChanged }, ...thorns].filter(p => p.phaseChanged != null);
    for (const p of phases) await this.bossPhase(p.uid, p.phaseChanged);
    await this.#showSummons(r.summoned);
    await this.#resolveEnd(r);
  }

  /** Itens que caíram dos monstros derrotados (vão para a bolsa desta onda). */
  #showDrops(n) {
    if (!n) return;
    const hc = this.hunter.center;
    this.effects.play('fx/coin', hc.x + 80, hc.y - 40, { fps: 18 });
    this.effects.text(`+${n} ITEM`, hc.x + 80, hc.y - 90, { color: '#7cf0dc', size: 24, delay: 150 });
    this.toast(n > 1 ? `Caíram ${n} itens: sua bolsa ganhou espaço nesta onda!` : 'Caiu um item: +1 na bolsa nesta onda!', 'icon/bolsa');
    this.#syncBag();
  }

  #showHeal(amount) {
    if (amount <= 0) return;
    const hc = this.hunter.center;
    this.effects.play('fx/heal', hc.x, hc.y, { scale: 3 });
    this.effects.text(`+${amount}`, hc.x, hc.y - 80, { color: '#a8e070', size: 32 });
    this.game.audio.play('heal');
    this.#syncPlayer();
  }

  /** Anima a derrota de todo monstro que ficou sem vida (golpe, espinhos, Água Benta...). */
  async #reapDead() {
    for (const [uid, f] of [...this.fighters]) {
      if (!f.dying && this.battle.find(uid).hp <= 0) await this.killEnemy(uid);
    }
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
    this.hud.setEnemyHp(uid, 0);
    this.hud.say(`${e.def.name} foi derrotado!`);
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
    const be = this.battle.find(uid);
    this.hud.setEnemyHp(uid, be.hp / be.maxHp, phase);
    this.hud.say(`${be.def.name} mudou de forma! A fraqueza dele mudou.`);
    await this.banner(`${be.def.name.toUpperCase()} MUDOU DE FORMA!`, 1200, 'danger');
    this.toast(`A fraqueza de ${be.def.name} mudou! Descubra a nova.`, 'icon/caveira');
    this.setTarget(uid);
  }

  async nextWave() {
    await this.wait(300);
    const info = this.mode.offer ? await this.#chooseRelic() : this.mode.nextWave();
    const scenery = this.mode.scenery;
    if (scenery !== this.stageKind) this.#buildStage(scenery);
    await this.banner(`ONDA ${info.wave + 1}!`, 900);
    if (info.healed) {
      const hc = this.hunter.center;
      this.effects.play('fx/heal', hc.x, hc.y, { scale: 3 });
      this.effects.text(`+${info.healed}`, hc.x, hc.y - 80, { color: '#a8e070', size: 32 });
      this.game.audio.play('heal');
    }
    this.#syncPlayer();
    this.#syncBag();
    this.spawnWave();
    await this.wait(900);
    await this.banner(this.#announce(), 900, 'danger');
  }

  /** Corridas: escolhe 1 de 3 relíquias antes da próxima onda. */
  async #chooseRelic() {
    this.hud.say('Onda vencida! Escolha uma relíquia.');
    const id = await this.ui.relics.choose(this.mode.offer);
    const info = this.mode.chooseRelic(id);
    this.hud.setRelics(this.mode.relics);
    this.game.audio.play('super');
    return info;
  }

  #buildStage(kind) {
    this.stageKind = kind;
    this.stage = new BattleStage(this.game.assets, kind);
  }

  async victory() {
    this.ending = true;
    this.hud.lock(true);
    this.hud.setCombo(0);
    this.hunter.play('win', { loop: true });
    this.game.audio.playMusic('vitoria');
    await this.banner('VITÓRIA!', 1500, 'win');
    this.game.go('result', this.mode.finish(true));
  }

  async defeat() {
    this.ending = true;
    this.hud.lock(true);
    this.hunter.play('ko', { hold: true });
    this.game.audio.playMusic('derrota');
    await this.banner('DERROTA...', 1600, 'lose');
    this.game.go('result', this.mode.finish(false));
  }

  // ═══════════════════════ loja ═══════════════════════
  async buy(itemId) {
    if (this.busy || this.ending) return;
    const r = this.mode.useItem(itemId);
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
      this.game.audio.play('select');
      this.toast('A Vela revela o próximo golpe de todos os monstros!', 'icon/vela');
    }
    for (const hit of r.hits) {
      const f = this.fighters.get(hit.uid);
      if (!f) continue;
      this.effects.play('fx/cruz', f.center.x, f.center.y, { scale: 3 });
      const he = this.battle.find(hit.uid);
      this.hud.setEnemyHp(hit.uid, he.hp / he.maxHp, he.phase);
      f.flash = 1; f.play('hurt');
      if (this.game.options.damageNumbers) this.effects.text(`-${hit.damage}`, f.center.x, f.center.y - 70, { color: '#b8d0ff', size: 32 });
    }
    if (r.hits.length) { this.game.audio.play('hit'); this.screenShake(8); }

    this.hud.say(`${this.playerName} usou ${it.name}!`);
    this.hud.setStatus(p);
    this.#syncPlayer();
    this.#syncBag();
    this.#showDrops(r.drops);
    await this.wait(700);

    await this.#reapDead();
    for (const hit of r.hits) if (!hit.killed && hit.phaseChanged != null) await this.bossPhase(hit.uid, hit.phaseChanged);
    await this.#resolveEnd(r);
  }

  #syncPlayer() {
    const p = this.battle.player;
    this.hud.setHp(p.hp, p.maxHp);
    this.hud.setStatus({ ...p, revealed: this.battle.revealed });
  }

  #syncEnemyBar(uid) {
    const e = this.battle.find(uid);
    if (e) this.hud.setEnemyHp(uid, e.hp / e.maxHp, e.phase);
  }

  #syncBag() {
    this.hud.setBag(this.battle.itemsLeft, this.battle.bagSize);
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
    this.stage.update(dt);
    this.effects.update(dt);
    this.hunter.update(dt);
    for (const f of this.fighters.values()) f.update(dt);
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
    this.stage.drawBack(r);
    this.stage.drawPlatforms(r);

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
    this.stage.drawFront(r);

    this.#drawTargetMarker(r);
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

  /** Seta sobre o alvo; sobre cada monstro, o golpe revelado pela Vela ou a pista que ele deixou escapar. */
  #drawTargetMarker(r) {
    if (this.reveal) return;
    const bob = Math.sin(this.time / 180) * 4;
    for (const [uid, f] of this.fighters) {
      const e = this.battle.find(uid);
      if (f.dying || e.hp <= 0) continue;
      const top = this.#topOf(f) + 20;
      if (uid === this.targetUid) r.text('▼', f.drawX, top + bob, { size: 24, align: 'center', color: '#f6d548' });
      if (this.battle.revealed) r.sprite(ENEMY_MOVES[e.intent].icon, 0, f.drawX + 56, top - 10 + bob, { scale: 1 });
      else if (e.tell && !this.busy) this.#drawTell(r, f.drawX + 70, top - 40 + bob, e.tell);
    }
  }

  /** Balão de pensamento com o golpe que o monstro parece preparar (pode ser mentira). */
  #drawTell(r, x, y, move) {
    const a = 0.8 + Math.sin(this.time / 260) * 0.15;
    // o centro da nuvem fica em (34, 24) do balão de 64x64, desenhado em escala 2
    r.sprite('icon/pista', 0, x, y, { scale: PX, alpha: a });
    r.sprite(ENEMY_MOVES[move].icon, 0, x + 2 * PX, y - 8 * PX, { scale: 1, alpha: a });
  }

  #drawReveal(r) {
    if (!this.reveal) return;
    const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
    const a = Math.min(1, (1400 - this.reveal.t) / 200);
    const hc = this.hunter.center;
    r.sprite(WEAPONS[this.reveal.weapon].icon, 0, hc.x, hc.y - 140, { scale: 1, sx: k, sy: k, alpha: a });
    for (const { uid, move, echo } of this.reveal.moves) {
      const f = this.fighters.get(uid);
      if (!f || f.dying) continue;
      const top = f.drawY - 64 * f.scale;
      r.sprite(ENEMY_MOVES[move].icon, 0, f.drawX + (echo ? 72 : 0), top - 70, { scale: 1, sx: k, sy: k, alpha: a });
    }
  }
}
