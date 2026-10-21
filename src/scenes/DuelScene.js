// Duelo entre caçadores (multiplayer), na perspectiva estilo Pokémon.
// O servidor decide tudo; esta cena mostra as fases e anima o resultado de cada rodada.
import { Scene } from '../core/Scene.js';
import { GW, hpColor } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { BattleStage, LAYOUT } from '../world/BattleStage.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { WEAPONS, WEAPON_LIST } from '../config/weapons.js';
import { leagueIcon } from '../config/multiplayer.js';
import { cardEl, flipIn } from '../ui/Card.js';
import { spriteCanvas } from '../ui/SpriteCanvas.js';
import { $, h, icon, show, retrigger } from '../ui/dom.js';

const REASONS = { nocaute: 'Nocaute!', abandono: 'O oponente abandonou a partida.', 'desistência': 'Desistência.' };

export class DuelScene extends Scene {
  /** @param {import('../net/MultiplayerClient.js').MultiplayerClient} net */
  constructor(game, ui, net) {
    super(game, 'screen-duel');
    this.ui = ui;
    this.net = net;
    this.log = $('duel-log');

    $('duel-mute').addEventListener('click', () => {
      const muted = !game.options.muted;
      game.setOption('muted', muted);
      game.audio.setMuted(muted);
      $('duel-mute-ico').src = icon(muted ? 'icon/som_off' : 'icon/som_on').src;
    });
    $('duel-forfeit').addEventListener('click', async () => {
      if (await ui.modals.confirm('Desistir do duelo? Você perde troféus.')) net.forfeit();
    });
    $('dr-again').addEventListener('click', () => game.go('lobby', { autoQueue: true }));
    $('dr-lobby').addEventListener('click', () => game.go('lobby'));

    const here = (fn) => (d) => { if (game.scene === this) fn(d); };
    net.on('card_phase', here((d) => this.#cardPhase(d)));
    net.on('weapon_phase', here((d) => this.#weaponPhase(d)));
    net.on('opponent_ready', here((d) => this.#say(d.phase === 'card' ? 'O oponente já escolheu a carta.' : 'O oponente já escolheu a arma!')));
    net.on('opponent_weapon', here((d) => this.#vision(d.weapon)));
    net.on('opponent_status', here((d) => this.#say(d.connected ? 'O oponente voltou!' : `O oponente caiu... esperando ${Math.round((d.graceMs ?? 15000) / 1000)}s para ele voltar.`)));
    // o fim espera a animação da última rodada (aba em segundo plano ou aparelho lento atrasam ela)
    net.on('round_result', here((d) => { this.roundAnim = this.#roundResult(d); }));
    net.on('match_end', here(async (d) => { await this.roundAnim; if (game.scene === this) this.#matchEnd(d); }));
    net.on('error_msg', here((d) => this.ui.toasts.show(d.message, { force: true })));
    net.on('disconnected', here(() => this.#say('Conexão perdida! Tentando reconectar...')));
  }

  get catalog() { return this.net.catalog; }
  #card(id) { return this.catalog.cards.find(c => c.id === id); }

  enter({ match }) {
    const { assets } = this.game;
    this.m = match;
    this.stage = new BattleStage(assets, match.stage);
    this.effects = new Effects(assets);
    const P = LAYOUT.player, B = LAYOUT.boss;
    this.me = new Fighter(assets, { base: `char/${match.you.character}/back`, x: P.x, y: P.y, scale: P.scale });
    this.opp = new Fighter(assets, { base: `char/${match.opponent.character}/side`, x: B.x, y: B.y, scale: 3, flipX: true });
    this.hp = { you: match.you.hp, opp: match.opponent.hp };
    this.max = { you: match.you.maxHp, opp: match.opponent.maxHp };
    this.jokenWord = null;
    this.reveal = null;
    this.visionWeapon = null;
    this.roundAnim = null;
    this.endsAt = 0;
    this.total = 1;

    $('duel-me-name').textContent = match.you.nickname.toUpperCase();
    $('duel-opp-name').textContent = match.opponent.nickname.toUpperCase();
    $('duel-opp-trophies').textContent = match.opponent.trophies;
    $('duel-opp-league').src = icon(leagueIcon(match.opponent.league)).src;
    $('duel-mute-ico').src = icon(this.game.options.muted ? 'icon/som_off' : 'icon/som_on').src;
    show($('duel-result'), false);
    show($('duel-hand'), false);
    show($('duel-opp-card'), false);
    show($('duel-my-card'), false);
    $('duel-actions').replaceChildren();
    this.#syncHp();
    this.game.audio.playMusic('duelo');

    if (match.phase === 'card') this.#cardPhase({ round: match.round, hand: match.hand, endsIn: match.endsIn, hp: { you: match.you.hp, opp: match.opponent.hp } });
    else if (match.phase === 'weapon') this.#weaponPhase({ round: match.round, endsIn: match.endsIn, yourCard: match.yourCard, opponentCard: match.opponentCard });
    else this.#intro();
  }

  async #intro() {
    this.me.ox = -500; this.opp.ox = 500;
    this.tweens.to(this.me, { ox: 0 }, 800, Ease.outCubic);
    this.tweens.to(this.opp, { ox: 0 }, 800, Ease.outCubic);
    this.#say(`${this.m.opponent.nickname} quer duelar!`);
    await this.#banner('DUELO!', 1200, 'danger');
  }

  async #banner(text, ms, cls = '') {
    const el = $('duel-banner');
    $('duel-banner-text').textContent = text;
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

  #timer(ms) {
    this.endsAt = performance.now() + ms;
    this.total = ms;
  }

  #syncHp() {
    for (const [who, bar, text] of [['you', 'duel-me-hp', 'duel-me-hp-text'], ['opp', 'duel-opp-hp', 'duel-opp-hp-text']]) {
      const ratio = this.hp[who] / this.max[who];
      $(bar).style.width = `${Math.max(0, ratio) * 100}%`;
      $(bar).style.background = hpColor(ratio);
      $(text).textContent = `${this.hp[who]}/${this.max[who]}`;
    }
  }

  // ═══════════════════════ fases ═══════════════════════
  #cardPhase(d) {
    this.round = d.round;
    $('duel-round').textContent = `RODADA ${d.round}`;
    this.hp = { you: d.hp.you, opp: d.hp.opp };
    this.#syncHp();
    this.visionWeapon = null;
    show($('duel-opp-card'), false);
    show($('duel-my-card'), false);
    this.#timer(d.endsIn);
    if (d.sudden && !this.suddenShown) { this.suddenShown = true; this.#banner('MORTE SÚBITA! DANO DOBRADO', 1400, 'danger'); }

    if (!d.hand.length) {
      show($('duel-hand'), false);
      $('duel-actions').replaceChildren();
      this.#say('Você não tem mais cartas. Esperando o oponente...');
      return;
    }
    this.#say(`Rodada ${d.round}! Escolha uma carta (ou passe).`);
    const els = d.hand.map((id, i) => {
      const card = this.#card(id);
      const el = cardEl(card, { size: 'lg', faceDown: true, onPick: (c) => this.#pickCard(c, el) });
      flipIn(el, card, 120 + i * 140);
      return el;
    });
    $('duel-cards').replaceChildren(...els);
    show($('duel-hand'), true);
    retrigger($('duel-hand'), 'deal');
    $('duel-actions').replaceChildren(h('button', { class: 'btn btn-action', onclick: () => this.#pickCard(null) }, icon('icon/fechar', 'ico'), 'PASSAR'));
    this.game.audio.play('select');
  }

  #pickCard(card, el) {
    if (this.cardPicked === this.round) return;
    this.cardPicked = this.round;
    this.net.pickCard(card?.id ?? null);
    document.querySelectorAll('#duel-cards .pcard').forEach(c => { c.disabled = true; c.classList.toggle('picked', c === el); c.classList.toggle('dropped', c !== el); });
    $('duel-actions').querySelectorAll('button').forEach(b => { b.disabled = true; });
    this.game.audio.play('select');
    this.#say(card ? `Você vai jogar ${card.name}. Esperando o oponente...` : 'Você passou a vez das cartas. Esperando o oponente...');
  }

  #weaponPhase(d) {
    this.#timer(d.endsIn);
    show($('duel-hand'), false);
    this.#showPlayed('duel-my-card', d.yourCard);
    this.#showPlayed('duel-opp-card', d.opponentCard, true);
    const oppCard = d.opponentCard && this.#card(d.opponentCard);
    this.#say(oppCard ? `${this.m.opponent.nickname} jogou ${oppCard.name}! Escolha sua arma.` : 'Escolha sua arma: pedra, papel ou tesoura!');
    $('duel-actions').replaceChildren(...WEAPON_LIST.map(w => h('button', {
      class: 'btn btn-action', dataset: { weapon: w.id }, onclick: () => this.#pickWeapon(w.id),
    }, icon(w.icon, 'ico'), `${w.name} [${w.key}]`)));
  }

  #showPlayed(id, cardId, flip = false) {
    const box = $(id);
    if (!cardId) { show(box, false); return; }
    const card = this.#card(cardId);
    const el = cardEl(card, { size: 'sm', faceDown: flip });
    if (flip) flipIn(el, card, 200);
    box.replaceChildren(el);
    show(box, true);
  }

  #pickWeapon(weapon) {
    if (this.weaponPicked === this.round) return;
    this.weaponPicked = this.round;
    this.net.pickWeapon(weapon);
    $('duel-actions').querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.toggle('active', b.dataset.weapon === weapon); });
    this.game.audio.play('select');
    this.#say(`Você escolheu ${WEAPONS[weapon].name}. Esperando o oponente...`);
  }

  #vision(weapon) {
    this.visionWeapon = weapon;
    this.game.audio.play('super');
    this.#say(`VISÃO: ${this.m.opponent.nickname} escolheu ${WEAPONS[weapon].name}!`);
  }

  // ═══════════════════════ resultado da rodada ═══════════════════════
  async #roundResult(d) {
    this.endsAt = 0;
    $('duel-actions').replaceChildren();
    this.visionWeapon = null;
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = word;
      this.me.oy = -14; this.opp.oy = -14;
      this.tweens.to(this.me, { oy: 0 }, 180);
      this.tweens.to(this.opp, { oy: 0 }, 180);
      await this.wait(230);
    }
    this.jokenWord = null;
    this.reveal = { you: d.you.weapon, opp: d.opponent.weapon, t: 0 };
    this.game.audio.play('go');
    this.#say(`Você: ${WEAPONS[d.you.weapon].name} × ${this.m.opponent.nickname}: ${WEAPONS[d.opponent.weapon].name}`);
    await this.wait(700);

    const mc = this.me.center, oc = this.opp.center;
    if (d.outcome === 'draw') {
      const mid = { x: (mc.x + oc.x) / 2, y: (mc.y + oc.y) / 2 };
      this.effects.play('fx/hit', mid.x, mid.y, { scale: 4 });
      this.game.audio.play('draw');
      this.#say('Empate!');
    } else {
      const [att, def, w, defRes] = d.outcome === 'win'
        ? [this.me, this.opp, d.you.weapon, d.opponent]
        : [this.opp, this.me, d.opponent.weapon, d.you];
      att.play('attack');
      await this.wait(200);
      const c = def.center;
      this.effects.play(WEAPONS[w].fx, c.x, c.y, { scale: 4 });
      await this.wait(220);
      if (defRes.dodged) {
        this.effects.text('DESVIOU!', c.x, c.y - 120, { color: '#7cf0dc', size: 24 });
        this.game.audio.play('block');
      } else if (defRes.card === 'escudo' || defRes.card === 'escudo_sagrado') {
        this.effects.play('fx/shield', c.x, c.y, { scale: 4, fps: 10 });
        this.effects.text('BLOQUEADO!', c.x, c.y - 120, { color: '#6f96f0', size: 24 });
        this.game.audio.play('block');
      } else {
        def.play('hurt'); def.flash = 1; def.shake(320, 10);
        this.game.audio.play('hit');
        this.particles.burst(c.x, c.y, { count: 18 });
      }
      this.#say(d.outcome === 'win' ? 'Você acertou o golpe!' : `${this.m.opponent.nickname} acertou você!`);
    }

    // números: dano, cura, espinhos, sorte
    const show2 = (f, res) => {
      const c = f.center;
      if (res.damage) this.effects.text(`-${res.damage}`, c.x, c.y - 90, { color: f === this.me ? '#ff7563' : '#f6d548', size: 40, delay: 100 });
      if (res.healed) this.effects.text(`+${res.healed}`, c.x + 60, c.y - 40, { color: '#a8e070', size: 24, delay: 300 });
      if (res.lucky) this.effects.text('SORTE!', c.x, c.y - 150, { color: '#5fb24a', size: 16 });
      if (res.healed) this.effects.play('fx/heal', c.x, c.y, { scale: 3 });
    };
    show2(this.me, d.you);
    show2(this.opp, d.opponent);
    if (d.you.thorns || d.opponent.thorns) this.game.audio.play('hurt');
    this.hp = { you: d.hp.you, opp: d.hp.opp };
    this.#syncHp();
    await this.wait(900);
    this.reveal = null;
  }

  // ═══════════════════════ fim ═══════════════════════
  async #matchEnd(d) {
    this.endsAt = 0;
    show($('duel-hand'), false);
    $('duel-actions').replaceChildren();
    const loser = d.won ? this.opp : this.me;
    const winner = d.won ? this.me : this.opp;
    loser.play('ko', { hold: true });
    winner.play('win', { loop: true });
    this.game.audio.playMusic(d.won ? 'vitoria' : 'derrota');
    await this.#banner(d.won ? 'VITÓRIA!' : 'DERROTA...', 1400, d.won ? 'win' : 'lose');

    $('dr-title').textContent = d.won ? 'VITÓRIA!' : 'DERROTA...';
    $('dr-title').className = `result-title ${d.won ? 'win' : 'lose'}`;
    const delta = d.trophies.delta;
    $('dr-delta').textContent = d.ranked ? `${delta >= 0 ? '+' : ''}${delta}` : '';
    $('dr-delta').className = delta >= 0 ? 'up' : 'down';
    $('dr-note').textContent = [REASONS[d.reason] ?? '', d.ranked ? '' : 'Partida amistosa: vocês já duelaram muitas vezes nesta hora, sem troféus.'].filter(Boolean).join(' ');
    // contagem animada dos troféus
    const counter = { v: d.trophies.before };
    $('dr-count').textContent = counter.v;
    show($('duel-result'), true);
    this.tweens.to(counter, { v: d.trophies.after }, 1200, Ease.outCubic);
    this.countT = counter;

    const unlocks = [
      ...d.unlocked.cards.map(id => cardEl(this.#card(id), { size: 'sm' })),
      ...d.unlocked.characters.map(id => {
        const c = this.catalog.characters.find(x => x.id === id);
        return h('div', { class: 'unlock-char' }, spriteCanvas(this.game.assets, `char/${id}/side/idle`, { size: 96 }), h('b', {}, c.name));
      }),
    ];
    $('dr-unlocks').replaceChildren(...(unlocks.length ? [h('p', { class: 'unlock-title' }, 'DESBLOQUEADO!'), h('div', { class: 'unlock-row' }, ...unlocks)] : []));
    if (unlocks.length) this.game.audio.play('win');
  }

  // ═══════════════════════ loop ═══════════════════════
  onKey(e) {
    const w = WEAPON_LIST.find(x => e.code === `Digit${x.key}` || e.code === `Numpad${x.key}`);
    if (w && $('duel-actions').querySelector(`[data-weapon="${w.id}"]:not(:disabled)`)) { this.#pickWeapon(w.id); return true; }
    return false;
  }

  update(dt) {
    super.update(dt);
    this.stage.update(dt);
    this.effects.update(dt);
    this.me.update(dt);
    this.opp.update(dt);
    if (this.reveal) this.reveal.t += dt;
    if (this.countT) $('dr-count').textContent = Math.round(this.countT.v);
    const left = this.endsAt ? Math.max(0, this.endsAt - performance.now()) : 0;
    const fill = $('duel-timer-fill');
    fill.style.width = `${(left / this.total) * 100}%`;
    fill.classList.toggle('low', left > 0 && left < 3000);
  }

  render(r) {
    this.stage.drawBack(r);
    this.stage.drawPlatforms(r);
    this.opp.draw(r);
    this.me.draw(r);
    this.effects.draw(r);
    this.particles.draw(r);
    this.stage.drawFront(r);
    if (this.jokenWord) r.text(this.jokenWord, GW / 2, 260, { size: 64, align: 'center', color: '#f6d548' });
    if (this.reveal) {
      const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
      r.sprite(WEAPONS[this.reveal.you].icon, 0, this.me.center.x, this.me.center.y - 150, { scale: 1, sx: k, sy: k });
      r.sprite(WEAPONS[this.reveal.opp].icon, 0, this.opp.center.x, this.opp.center.y - 150, { scale: 1, sx: k, sy: k });
    }
    if (this.visionWeapon) {
      const bob = Math.sin(this.time / 180) * 4;
      r.sprite('icon/perk_visao', 0, this.opp.center.x - 70, this.opp.center.y - 140 + bob, { scale: 1 });
      r.sprite(WEAPONS[this.visionWeapon].icon, 0, this.opp.center.x, this.opp.center.y - 140 + bob, { scale: 1 });
    }
  }
}

