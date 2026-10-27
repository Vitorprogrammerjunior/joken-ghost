// Chefe Cooperativo: dois caçadores contra um chefe da campanha (regras no servidor, src/raid.js).
// O chefe joga contra cada caçador separado; as pistas dele aparecem só para quem ele vai atacar.
import { Scene } from '../core/Scene.js';
import { GW, hpColor } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { BattleStage, LAYOUT } from '../world/BattleStage.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { WEAPONS, WEAPON_LIST, ENEMY_MOVES } from '../config/weapons.js';
import { ENEMIES } from '../config/enemies.js';
import { emoteIcon } from '../config/multiplayer.js';
import { $, h, icon, show, retrigger } from '../ui/dom.js';

const HUNTER_SPOTS = [{ x: 200, y: 570 }, { x: 410, y: 562 }];
const PHASE_TINTS = [null, ['#d23a3a', 0.22], ['#6a34a3', 0.32]];
const EMOTE_MS = 2600;

export class RaidScene extends Scene {
  /** @param {import('../net/MultiplayerClient.js').MultiplayerClient} net */
  constructor(game, ui, net) {
    super(game, 'screen-raid');
    this.ui = ui;
    this.net = net;
    this.log = $('raid-log');

    $('raid-leave').addEventListener('click', () => this.#leave());
    $('raid-emote').addEventListener('click', () => this.#toggleEmotes());
    $('rr-again').addEventListener('click', () => game.go('lobby', { autoQueue: 'raid' }));
    $('rr-lobby').addEventListener('click', () => game.go('lobby'));

    const here = (fn) => (d) => { if (game.scene === this) fn(d); };
    net.on('raid_phase', here((d) => this.#phase(d)));
    net.on('seat_ready', here((d) => { if (d.seat !== this.m.you) this.#say(`${this.#name(d.seat)} já escolheu a arma.`); }));
    net.on('seat_status', here((d) => this.#say(d.out ? `${this.#name(d.seat)} saiu da luta.` : d.connected ? `${this.#name(d.seat)} voltou!` : `${this.#name(d.seat)} caiu...`)));
    net.on('emote', here((d) => { this.emotes = [...this.emotes.filter(e => e.seat !== d.seat), { ...d, t: 0 }]; }));
    net.on('raid_result', here((d) => { this.roundAnim = this.#result(d); }));
    net.on('match_end', here(async (d) => { await this.roundAnim; if (game.scene === this) this.#end(d); }));
    net.on('match_resume', here((d) => this.game.go('raid', { match: d })));
    net.on('disconnected', here(() => this.#say('Conexão perdida! Tentando reconectar...')));
  }

  get spectator() { return this.m.you == null; }
  #name(seat) { const hh = this.m.hunters[seat]; return seat === this.m.you ? 'Você' : hh.isBot ? `${hh.nickname} (bot)` : hh.nickname; }

  enter({ match }) {
    const { assets } = this.game;
    this.m = match;
    this.def = ENEMIES[match.boss.id];
    this.stage = new BattleStage(assets, match.stage);
    this.effects = new Effects(assets);
    const B = LAYOUT.boss;
    this.boss = new Fighter(assets, { base: this.def.sprite, x: B.x, y: B.y, scale: this.def.scale ?? 3, flying: !!this.def.flying });
    this.boss.tint = PHASE_TINTS[match.boss.phase] ?? null;
    this.hunters = match.hunters.map((hh, i) => new Fighter(assets, { base: `char/${hh.character}/back`, x: HUNTER_SPOTS[i].x, y: HUNTER_SPOTS[i].y, scale: LAYOUT.player.scale }));
    this.bossHp = match.boss.hp;
    this.hp = match.hunters.map(hh => hh.hp);
    this.tell = match.tell;
    this.reveal = null;
    this.jokenWord = null;
    this.emotes = [];
    this.roundAnim = null;
    this.endsAt = 0;
    this.total = 1;

    $('raid-boss-name').textContent = match.boss.name.toUpperCase();
    $('raid-pips').replaceChildren(...Array.from({ length: match.boss.phases }, (_, i) => h('i', { class: i <= match.boss.phase ? 'on' : '' })));
    show($('raid-emote'), !this.spectator);
    show($('raid-emote-bar'), false);
    show($('raid-result'), false);
    $('raid-actions').replaceChildren();
    this.#syncHp();
    this.game.audio.playMusic(this.def.music ?? 'chefe');

    if (match.phase === 'weapon') this.#phase({ round: match.round, endsIn: match.endsIn, tell: match.tell, alive: match.hunters[match.you]?.hp > 0 });
    else this.#intro();
  }

  async #intro() {
    this.boss.ox = 600;
    this.tweens.to(this.boss, { ox: 0 }, 900, Ease.outCubic);
    for (const hh of this.hunters) { hh.ox = -500; this.tweens.to(hh, { ox: 0 }, 800, Ease.outCubic); }
    this.#say(this.spectator ? `Você está assistindo dois caçadores contra ${this.def.name}.` : `Você e ${this.#name(1 - this.m.you)} contra ${this.def.name}!`);
    await this.#banner(`${this.def.name.toUpperCase()} APARECEU!`, 1300, 'danger');
  }

  async #banner(text, ms, cls = '') {
    const el = $('raid-banner');
    $('raid-banner-text').textContent = text;
    el.className = `banner ${cls}`;
    retrigger(el, 'show');
    await this.wait(ms);
    el.classList.add('hidden');
  }

  #say(text) {
    clearInterval(this.typeT);
    let i = 0;
    this.typeT = setInterval(() => {
      i += 2;
      this.log.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this.typeT);
    }, 16);
  }

  #syncHp() {
    const ratio = this.bossHp / this.m.boss.maxHp;
    $('raid-boss-hp').style.width = `${Math.max(0, ratio) * 100}%`;
    $('raid-boss-hp').style.background = hpColor(ratio);
    $('raid-boss-hp-text').textContent = `${this.bossHp}/${this.m.boss.maxHp}`;
    $('raid-hunters').replaceChildren(...this.m.hunters.map((hh, i) => {
      const r = this.hp[i] / hh.maxHp;
      return h('div', { class: `status-box raid-hunter${i === this.m.you ? ' me' : ''}${this.hp[i] <= 0 ? ' dead' : ''}` },
        h('div', { class: 'sb-head' }, h('span', { class: 'sb-name' }, this.#name(i).toUpperCase())),
        h('div', { class: 'sb-hp' }, h('b', {}, 'HP'), h('div', { class: 'hpbar' }, h('div', { class: 'hpbar-fill', style: { width: `${Math.max(0, r) * 100}%`, background: hpColor(r) } }))),
        h('div', { class: 'sb-foot' }, `${this.hp[i]}/${hh.maxHp}`));
    }));
  }

  // ─── fase da arma ─────────────────────────────────────────────
  #phase(d) {
    $('raid-round').textContent = `RODADA ${d.round}`;
    this.endsAt = performance.now() + d.endsIn;
    this.total = d.endsIn;
    this.tell = d.tell;
    if (this.spectator || !d.alive) {
      $('raid-actions').replaceChildren();
      this.#say(this.spectator ? 'Os caçadores escolhem as armas...' : 'Você caiu. Torça pelo seu parceiro!');
      return;
    }
    const hint = d.tell ? `\nPista: ${this.def.name} parece preparar ${ENEMY_MOVES[d.tell].name}.` : '';
    this.#say(`Rodada ${d.round}! Escolha sua arma.${hint}`);
    $('raid-actions').replaceChildren(...WEAPON_LIST.map(w => h('button', {
      class: 'btn btn-action', dataset: { weapon: w.id }, onclick: () => this.#pick(w.id),
    }, icon(w.icon, 'ico'), `${w.name} [${w.key}]`)));
  }

  #pick(weapon) {
    this.net.pickWeapon(weapon);
    $('raid-actions').querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.toggle('active', b.dataset.weapon === weapon); });
    this.game.audio.play('select');
    this.#say(`Você escolheu ${WEAPONS[weapon].name}. Esperando o parceiro...`);
  }

  // ─── resultado ────────────────────────────────────────────────
  async #result(d) {
    this.endsAt = 0;
    this.tell = null;
    $('raid-actions').replaceChildren();
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = word;
      for (const a of [this.boss, ...this.hunters]) { a.oy = -14; this.tweens.to(a, { oy: 0 }, 180); }
      await this.wait(230);
    }
    this.jokenWord = null;
    this.reveal = { exchanges: d.exchanges, t: 0 };
    this.game.audio.play('go');
    await this.wait(700);

    for (const ex of d.exchanges) await this.#exchange(ex);
    this.bossHp = d.boss.hp;
    this.hp = d.hunters.map(x => x.hp);
    this.#syncHp();
    if (d.boss.phaseChanged) {
      this.boss.tint = PHASE_TINTS[d.boss.phase] ?? null;
      this.boss.flash = 1;
      [...$('raid-pips').children].forEach((p, i) => p.classList.toggle('on', i <= d.boss.phase));
      this.game.audio.play('phase');
      await this.#banner(`${this.def.name.toUpperCase()} MUDOU DE FORMA!`, 1100, 'danger');
    }
    await this.wait(500);
    this.reveal = null;
  }

  async #exchange(ex) {
    const hunter = this.hunters[ex.seat];
    if (ex.outcome === 'draw') {
      const mid = { x: (hunter.center.x + this.boss.center.x) / 2, y: (hunter.center.y + this.boss.center.y) / 2 };
      this.effects.play('fx/hit', mid.x, mid.y, { scale: 3 });
      this.game.audio.play('draw');
      this.#say(`${this.#name(ex.seat)} empatou com ${this.def.name}.`);
      await this.wait(350);
      return;
    }
    if (ex.outcome === 'win') {
      hunter.play('attack');
      await this.wait(170);
      const c = this.boss.center;
      this.effects.play(WEAPONS[ex.weapon].fx, c.x, c.y, { scale: 4 });
      this.boss.play('hurt'); this.boss.flash = 1; this.boss.shake(300, 8);
      this.game.audio.play(ex.effectiveness === 'weak' ? 'super' : 'hit');
      this.effects.text(`-${ex.damage}`, c.x, c.y - 120, { color: ex.effectiveness === 'weak' ? '#f6d548' : '#f4f2fa', size: ex.effectiveness === 'weak' ? 40 : 32 });
      if (ex.effectiveness === 'weak') this.effects.text('SUPER EFETIVO!', c.x, c.y - 170, { color: '#f6d548', size: 16 });
      this.#say(`${this.#name(ex.seat)} acertou ${this.def.name}!`);
    } else {
      this.boss.play('attack');
      await this.wait(220);
      const c = hunter.center;
      this.effects.play(ENEMY_MOVES[ex.bossMove].fx, c.x, c.y, { scale: 3 });
      hunter.play('hurt'); hunter.flash = 1; hunter.flashColor = '#ff7563'; hunter.shake(300, 8);
      this.game.audio.play('hurt');
      this.effects.text(`-${ex.hurt}`, c.x, c.y - 90, { color: '#ff7563', size: 32 });
      this.#say(`${this.def.name} acertou ${this.#name(ex.seat) === 'Você' ? 'você' : this.#name(ex.seat)}!`);
    }
    await this.wait(450);
  }

  #end(d) {
    show($('raid-emote-bar'), false);
    this.game.audio.playMusic(d.won ? 'vitoria' : 'derrota');
    if (d.won) { this.boss.play('hurt', { hold: true }); this.tweens.to(this.boss, { alpha: 0 }, 800); }
    $('rr-title').textContent = d.won ? 'CHEFE DERROTADO!' : 'OS CAÇADORES CAÍRAM...';
    $('rr-title').className = `result-title ${d.won ? 'win' : 'lose'}`;
    show($('rr-reward'), !this.spectator && d.won);
    $('rr-ecto').textContent = `+${d.ecto ?? 0}`;
    $('rr-note').textContent = this.spectator ? '' : d.won ? 'Ecto ganho! Use na loja de cosméticos.' : 'Leia as pistas do chefe e tente de novo.';
    show($('rr-again'), !this.spectator);
    show($('raid-result'), true);
  }

  // ─── extras ───────────────────────────────────────────────────
  #toggleEmotes() {
    const bar = $('raid-emote-bar');
    const open = bar.classList.contains('hidden');
    if (open) {
      const owned = this.net.catalog.cosmetics.emotes.filter(e => this.net.profile.cosmetics.includes(e.id));
      bar.replaceChildren(...owned.map(e => h('button', { class: 'emote-btn', title: e.name, onclick: () => { this.net.emote(e.id); show(bar, false); } }, icon(emoteIcon(e.id), 'ico'))));
    }
    show(bar, open);
  }

  async #leave() {
    if (this.spectator) { this.net.stopSpectating(); this.game.go('lobby'); return; }
    if (await this.ui.modals.confirm('Sair da luta? Seu parceiro continua sozinho.')) { this.net.forfeit(); this.game.go('lobby'); }
  }

  onKey(e) {
    const w = WEAPON_LIST.find(x => e.code === `Digit${x.key}` || e.code === `Numpad${x.key}`);
    if (w && $('raid-actions').querySelector(`[data-weapon="${w.id}"]:not(:disabled)`)) { this.#pick(w.id); return true; }
    return false;
  }

  update(dt) {
    super.update(dt);
    this.stage.update(dt);
    this.effects.update(dt);
    this.boss.update(dt);
    for (const hh of this.hunters) hh.update(dt);
    if (this.reveal) this.reveal.t += dt;
    for (const e of this.emotes) e.t += dt;
    this.emotes = this.emotes.filter(e => e.t < EMOTE_MS);
    const left = this.endsAt ? Math.max(0, this.endsAt - performance.now()) : 0;
    const fill = $('raid-timer-fill');
    fill.style.width = `${(left / this.total) * 100}%`;
    fill.classList.toggle('low', left > 0 && left < 3000);
  }

  render(r) {
    this.stage.drawBack(r);
    this.stage.drawPlatforms(r);
    for (const a of [this.boss, ...this.hunters].sort((x, y) => x.y - y.y)) a.draw(r);
    this.effects.draw(r);
    this.particles.draw(r);
    this.stage.drawFront(r);
    if (this.jokenWord) r.text(this.jokenWord, GW / 2, 260, { size: 64, align: 'center', color: '#f6d548' });
    const bc = this.boss.center;
    const bob = Math.sin(this.time / 180) * 4;
    if (this.tell && !this.reveal) {
      const a = 0.8 + Math.sin(this.time / 260) * 0.15;
      r.sprite('icon/pista', 0, bc.x + 90, bc.y - 150 + bob, { scale: 2, alpha: a });
      r.sprite(ENEMY_MOVES[this.tell].icon, 0, bc.x + 94, bc.y - 166 + bob, { scale: 1, alpha: a });
    }
    if (this.reveal) {
      const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
      for (const ex of this.reveal.exchanges) {
        const hc = this.hunters[ex.seat].center;
        r.sprite(WEAPONS[ex.weapon].icon, 0, hc.x, hc.y - 150, { scale: 1, sx: k, sy: k });
        r.sprite(ENEMY_MOVES[ex.bossMove].icon, 0, bc.x + (ex.seat === 0 ? -50 : 50), bc.y - 170, { scale: 1, sx: k, sy: k });
      }
    }
    for (const e of this.emotes) {
      const hc = this.hunters[e.seat].center;
      const alpha = Math.min(1, (EMOTE_MS - e.t) / 300);
      r.sprite('icon/pista', 0, hc.x + 70, hc.y - 150, { scale: 2, alpha });
      r.sprite(emoteIcon(e.id), 0, hc.x + 74, hc.y - 166, { scale: 1, alpha });
    }
  }
}
