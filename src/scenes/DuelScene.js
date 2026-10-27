// Duelo entre caçadores (1x1 ou 2x2), na perspectiva estilo Pokémon. Também serve para assistir.
// O servidor decide tudo; esta cena mostra as fases e anima o resultado de cada rodada.
// Quem joga vê o próprio lado embaixo (de costas); o espectador vê o lado 0 embaixo.
import { Scene } from '../core/Scene.js';
import { GW, hpColor } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { BattleStage, LAYOUT } from '../world/BattleStage.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { WEAPONS, WEAPON_LIST } from '../config/weapons.js';
import { leagueIcon, emoteIcon } from '../config/multiplayer.js';
import { cardEl, flipIn } from '../ui/Card.js';
import { spriteCanvas } from '../ui/SpriteCanvas.js';
import { $, h, icon, show, retrigger } from '../ui/dom.js';

const REASONS = { nocaute: 'Nocaute!', abandono: 'Um caçador abandonou a partida.', 'desistência': 'Desistência.' };
const KIND_NOTES = {
  casual: 'Partida casual: sem troféus.',
  duo: 'Partida 2x2: sem troféus.',
  room: 'Sala privada: sem troféus.',
  challenge: 'Desafio amistoso: sem troféus.',
  tournament: 'Torneio relâmpago.',
  king: 'Rei da Arena.',
};
/** Para onde o "jogar de novo" leva (fila do mesmo modo). */
const AGAIN = { ranked: 'ranked', casual: 'casual', duo: 'duo' };

/** Onde fica cada caçador: embaixo (de costas) e em cima (de lado), por quantidade no lado. */
const SPOTS = {
  bottom: { 1: [LAYOUT.player], 2: [{ x: 200, y: 570 }, { x: 410, y: 562 }] },
  top: { 1: [LAYOUT.boss], 2: [{ x: 840, y: 364 }, { x: 1030, y: 370 }] },
};
const EMOTE_MS = 2600;

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
    $('duel-forfeit').addEventListener('click', () => this.#leave());
    $('duel-emote').addEventListener('click', () => this.#toggleEmotes());

    const here = (fn) => (d) => { if (game.scene === this) fn(d); };
    net.on('card_phase', here((d) => this.#cardPhase(d)));
    net.on('weapon_phase', here((d) => this.#weaponPhase(d)));
    net.on('seat_ready', here((d) => this.#seatReady(d)));
    net.on('vision', here((d) => this.#vision(d)));
    net.on('seat_status', here((d) => this.#seatStatus(d)));
    net.on('spectators', here((d) => this.#spectators(d.count)));
    net.on('emote', here((d) => this.#showEmote(d)));
    // o fim espera a animação da última rodada (aba em segundo plano ou aparelho lento atrasam ela)
    net.on('round_result', here((d) => { this.roundAnim = this.#roundResult(d); }));
    net.on('match_end', here(async (d) => { await this.roundAnim; if (game.scene === this) this.#matchEnd(d); }));
    // próxima partida do torneio/Rei da Arena, ou a mesma partida depois de reconectar
    const next = (d) => this.game.go(d.kind === 'raid' ? 'raid' : 'duel', { match: d });
    net.on('match_start', here((d) => { if (d.matchId !== this.m.matchId) next(d); }));
    net.on('match_resume', here(next));
    net.on('error_msg', here((d) => this.ui.toasts.show(d.message, { force: true })));
    net.on('disconnected', here(() => this.#say('Conexão perdida! Tentando reconectar...')));
  }

  get catalog() { return this.net.catalog; }
  #card(id) { return this.catalog.cards.find(c => c.id === id); }
  get spectator() { return this.m.you == null; }
  get mySide() { return this.spectator ? 0 : this.m.fighters[this.m.you].side; }
  /** Adversário de pista de um assento. */
  #laneOpp(seat) {
    const f = this.m.fighters[seat];
    return this.m.fighters.find(o => o.side !== f.side && o.lane === f.lane).seat;
  }
  /** Assento "de referência" embaixo: eu, ou o 1º do lado 0 para quem assiste. */
  get #anchor() { return this.spectator ? this.m.fighters.find(f => f.side === 0 && f.lane === 0).seat : this.m.you; }
  #name(seat) { return this.m.fighters[seat].nickname; }

  // ═══════════════════════ início ═══════════════════════
  music() { return 'duelo'; }

  enter({ match }) {
    const { assets } = this.game;
    this.m = match;
    this.stage = new BattleStage(assets, match.stage);
    this.effects = new Effects(assets);
    this.actors = this.#placeFighters();
    this.hp = match.sides.map(s => s.hp);
    this.max = match.sides.map(s => s.maxHp);
    this.history = match.history ?? match.fighters.map(() => []);
    this.jokenWord = null;
    this.reveal = null;
    this.vision = null;
    this.emotes = [];
    this.roundAnim = null;
    this.suddenShown = false;
    this.endsAt = 0;
    this.total = 1;

    const top = match.fighters.filter(f => f.side !== this.mySide);
    const bottom = match.fighters.filter(f => f.side === this.mySide);
    $('duel-opp-name').textContent = top.map(f => this.#name(f.seat)).join(' & ').toUpperCase();
    $('duel-me-name').textContent = (this.spectator ? bottom.map(f => this.#name(f.seat)).join(' & ') : bottom.map(f => (f.seat === match.you ? 'VOCÊ' : this.#name(f.seat))).join(' & ')).toUpperCase();
    $('duel-opp-trophies').textContent = top[0].trophies;
    $('duel-opp-league').src = icon(leagueIcon(top[0].league)).src;
    $('duel-mute-ico').src = icon(this.game.options.muted ? 'icon/som_off' : 'icon/som_on').src;
    $('duel-forfeit').title = this.spectator ? 'Parar de assistir' : 'Desistir';
    show($('duel-emote'), !this.spectator);
    show($('emote-bar'), false);
    show($('duel-result'), false);
    show($('duel-hand'), false);
    show($('duel-opp-card'), false);
    show($('duel-my-card'), false);
    $('duel-actions').replaceChildren();
    this.#spectators(match.spectators ?? 0);
    this.#syncHp();
    this.#renderHistory();

    if (match.phase === 'card') this.#cardPhase({ round: match.round, hand: match.hand, endsIn: match.endsIn, hp: this.hp });
    else if (match.phase === 'weapon') this.#weaponPhase({ round: match.round, endsIn: match.endsIn, cards: match.cards, forbidden: match.forbidden });
    else this.#intro();
  }

  #placeFighters() {
    const actors = new Map();
    for (const where of ['bottom', 'top']) {
      const side = where === 'bottom' ? this.mySide : 1 - this.mySide;
      const list = this.m.fighters.filter(f => f.side === side).sort((a, b) => a.lane - b.lane);
      list.forEach((f, k) => {
        const spot = SPOTS[where][list.length][k];
        const fighter = where === 'bottom'
          ? new Fighter(this.game.assets, { base: `char/${f.character}/back`, x: spot.x, y: spot.y, scale: LAYOUT.player.scale })
          : new Fighter(this.game.assets, { base: `char/${f.character}/side`, x: spot.x, y: spot.y, scale: 3, flipX: true });
        fighter.bottom = where === 'bottom';
        actors.set(f.seat, fighter);
      });
    }
    return actors;
  }

  async #intro() {
    for (const a of this.actors.values()) { a.ox = a.bottom ? -500 : 500; this.tweens.to(a, { ox: 0 }, 800, Ease.outCubic); }
    const opp = this.spectator ? 'Os caçadores vão duelar!' : `${this.m.fighters.filter(f => f.side !== this.mySide).map(f => this.#name(f.seat)).join(' e ')} quer duelar!`;
    this.#say(this.spectator ? `Você está assistindo. ${opp}` : opp);
    await this.#banner(this.m.fighters.length > 2 ? 'DUELO 2x2!' : 'DUELO!', 1200, 'danger');
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
    const rows = [[this.mySide, 'duel-me-hp', 'duel-me-hp-text'], [1 - this.mySide, 'duel-opp-hp', 'duel-opp-hp-text']];
    for (const [side, bar, text] of rows) {
      const ratio = this.hp[side] / this.max[side];
      $(bar).style.width = `${Math.max(0, ratio) * 100}%`;
      $(bar).style.background = hpColor(ratio);
      $(text).textContent = `${this.hp[side]}/${this.max[side]}`;
    }
  }

  /** Últimas armas do adversário de pista (ler o padrão dele é a habilidade do duelo). */
  #renderHistory() {
    const seat = this.#laneOpp(this.#anchor);
    $('duel-opp-history').replaceChildren(...this.history[seat].slice(-5).map(w => icon(WEAPONS[w].icon, 'ico ico-xs')));
  }

  #spectators(n) {
    $('duel-spect-n').textContent = n;
    show($('duel-spect'), n > 0);
  }

  // ═══════════════════════ fases ═══════════════════════
  #cardPhase(d) {
    this.round = d.round;
    $('duel-round').textContent = `RODADA ${d.round}`;
    this.hp = [...d.hp];
    this.#syncHp();
    this.vision = null;
    show($('duel-opp-card'), false);
    show($('duel-my-card'), false);
    this.#timer(d.endsIn);
    if (d.sudden && !this.suddenShown) { this.suddenShown = true; this.#banner('MORTE SÚBITA! DANO DOBRADO', 1400, 'danger'); }

    if (this.spectator || !d.hand.length) {
      show($('duel-hand'), false);
      $('duel-actions').replaceChildren();
      this.#say(this.spectator ? `Rodada ${d.round}: os caçadores escolhem as cartas...` : 'Você não tem mais cartas. Esperando os outros...');
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
    this.#say(card ? `Você vai jogar ${card.name}. Esperando os outros...` : 'Você passou a vez das cartas. Esperando os outros...');
  }

  #weaponPhase(d) {
    this.#timer(d.endsIn);
    show($('duel-hand'), false);
    const me = this.#anchor;
    const opp = this.#laneOpp(me);
    this.#showPlayed('duel-my-card', d.cards[me]);
    this.#showPlayed('duel-opp-card', d.cards[opp], true);
    if (this.spectator) {
      this.#say('Os caçadores escolhem as armas...');
      $('duel-actions').replaceChildren();
      return;
    }
    const oppCard = d.cards[opp] && this.#card(d.cards[opp]);
    const hurry = d.endsIn < this.catalog.rules.weaponPhaseMs ? ' Rápido: você tem só 5s!' : '';
    this.#say((oppCard ? `${this.#name(opp)} jogou ${oppCard.name}! Escolha sua arma.` : 'Escolha sua arma: pedra, papel ou tesoura!') + hurry);
    $('duel-actions').replaceChildren(...WEAPON_LIST.map(w => h('button', {
      class: `btn btn-action${w.id === d.forbidden ? ' forbidden' : ''}`,
      dataset: { weapon: w.id },
      disabled: w.id === d.forbidden,
      title: w.id === d.forbidden ? 'Provocação: você não pode repetir esta arma' : '',
      onclick: () => this.#pickWeapon(w.id),
    }, icon(w.icon, 'ico'), w.id === d.forbidden ? 'PROIBIDA' : `${w.name} [${w.key}]`)));
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
    this.#say(`Você escolheu ${WEAPONS[weapon].name}. Esperando os outros...`);
  }

  #seatReady({ seat, phase }) {
    if (seat === this.m.you) return;
    this.#say(`${this.#name(seat)} já escolheu ${phase === 'card' ? 'a carta' : 'a arma'}.`);
  }

  #vision({ weapon, seat }) {
    this.vision = { weapon, seat };
    this.game.audio.play('super');
    this.#say(`VISÃO: ${this.#name(seat)} escolheu ${WEAPONS[weapon].name}!`);
  }

  #seatStatus({ seat, connected, graceMs, away }) {
    const who = this.#name(seat);
    if (away) this.#say(`${who} não voltou: o lugar fica parado, repetindo a última arma.`);
    else if (connected) this.#say(`${who} voltou!`);
    else this.#say(`${who} caiu... esperando ${Math.round((graceMs ?? 15000) / 1000)}s para voltar.`);
  }

  // ═══════════════════════ expressões ═══════════════════════
  #toggleEmotes() {
    const bar = $('emote-bar');
    const open = bar.classList.contains('hidden');
    if (open) {
      const owned = this.catalog.cosmetics.emotes.filter(e => this.net.profile.cosmetics.includes(e.id));
      bar.replaceChildren(...owned.map(e => h('button', {
        class: 'emote-btn', title: e.name,
        onclick: () => { this.net.emote(e.id); show(bar, false); },
      }, icon(emoteIcon(e.id), 'ico'))));
    }
    show(bar, open);
  }

  #showEmote({ seat, id }) {
    this.emotes = this.emotes.filter(e => e.seat !== seat);
    this.emotes.push({ seat, id, t: 0 });
    this.game.audio.play('hover');
  }

  // ═══════════════════════ resultado da rodada ═══════════════════════
  async #roundResult(d) {
    this.endsAt = 0;
    $('duel-actions').replaceChildren();
    this.vision = null;
    this.history = d.history;
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = word;
      for (const a of this.actors.values()) { a.oy = -14; this.tweens.to(a, { oy: 0 }, 180); }
      await this.wait(230);
    }
    this.jokenWord = null;
    this.reveal = { weapons: d.fighters.map(f => f.weapon), t: 0 };
    this.game.audio.play('go');
    const me = this.#anchor, opp = this.#laneOpp(me);
    this.#say(`${this.spectator ? this.#name(me) : 'Você'}: ${WEAPONS[d.fighters[me].weapon].name} × ${this.#name(opp)}: ${WEAPONS[d.fighters[opp].weapon].name}`);
    await this.wait(700);

    // cada pista: quem venceu ataca quem perdeu (a minha pista por último, para a mensagem ficar)
    const lanes = [...d.lanes].sort((x, y) => (x.a === me || x.b === me) - (y.a === me || y.b === me));
    for (const lane of lanes) await this.#animateLane(lane, d, lane.a === me || lane.b === me);

    // números: dano, cura, espinhos, sorte
    d.fighters.forEach((res, seat) => {
      const a = this.actors.get(seat);
      const c = a.center;
      if (res.damage) this.effects.text(`-${res.damage}`, c.x, c.y - 90, { color: a.bottom ? '#ff7563' : '#f6d548', size: 40, delay: 100 });
      if (res.healed) { this.effects.text(`+${res.healed}`, c.x + 60, c.y - 40, { color: '#a8e070', size: 24, delay: 300 }); this.effects.play('fx/heal', c.x, c.y, { scale: 3 }); }
      if (res.lucky) this.effects.text('SORTE!', c.x, c.y - 150, { color: '#5fb24a', size: 16 });
    });
    if (d.fighters.some(f => f.thorns)) this.game.audio.play('hurt');
    this.hp = [...d.hp];
    this.#syncHp();
    this.#renderHistory();
    await this.wait(900);
    this.reveal = null;
  }

  async #animateLane(lane, d, mine) {
    const A = this.actors.get(lane.a), B = this.actors.get(lane.b);
    if (lane.outcome === 'draw') {
      const mid = { x: (A.center.x + B.center.x) / 2, y: (A.center.y + B.center.y) / 2 };
      this.effects.play('fx/hit', mid.x, mid.y, { scale: 4 });
      this.game.audio.play('draw');
      if (mine) this.#say('Empate!');
      return;
    }
    const [att, defSeat] = lane.outcome === 'a' ? [lane.a, lane.b] : [lane.b, lane.a];
    const attacker = this.actors.get(att), def = this.actors.get(defSeat);
    const res = d.fighters[defSeat];
    attacker.play('attack');
    await this.wait(200);
    const c = def.center;
    this.effects.play(WEAPONS[d.fighters[att].weapon].fx, c.x, c.y, { scale: 4 });
    await this.wait(220);
    if (res.dodged) {
      this.effects.text('DESVIOU!', c.x, c.y - 120, { color: '#7cf0dc', size: 24 });
      this.game.audio.play('block');
    } else if (res.blocked) {
      this.effects.play('fx/shield', c.x, c.y, { scale: 4, fps: 10 });
      this.effects.text('BLOQUEADO!', c.x, c.y - 120, { color: '#6f96f0', size: 24 });
      this.game.audio.play('block');
    } else {
      def.play('hurt'); def.flash = 1; def.shake(320, 10);
      this.game.audio.play('hit');
      this.particles.burst(c.x, c.y, { count: 18 });
    }
    if (mine) this.#say(att === this.m.you ? 'Você acertou o golpe!' : defSeat === this.m.you ? `${this.#name(att)} acertou você!` : `${this.#name(att)} acertou ${this.#name(defSeat)}!`);
  }

  // ═══════════════════════ fim ═══════════════════════
  async #matchEnd(d) {
    this.endsAt = 0;
    show($('duel-hand'), false);
    show($('emote-bar'), false);
    $('duel-actions').replaceChildren();
    for (const [seat, a] of this.actors) {
      const won = this.m.fighters[seat].side === d.winnerSide;
      a.play(won ? 'win' : 'ko', won ? { loop: true } : { hold: true });
    }
    const won = this.spectator ? null : d.won;
    this.game.audio.playMusic(won === false ? 'derrota' : 'vitoria');
    const title = this.spectator ? 'FIM DO DUELO' : won ? 'VITÓRIA!' : 'DERROTA...';
    await this.#banner(title, 1400, won === false ? 'lose' : 'win');

    $('dr-title').textContent = title;
    $('dr-title').className = `result-title ${won === false ? 'lose' : 'win'}`;
    show($('dr-trophies'), !!d.trophies);
    if (d.trophies) {
      const delta = d.trophies.delta;
      $('dr-delta').textContent = d.ranked ? `${delta >= 0 ? '+' : ''}${delta}` : '';
      $('dr-delta').className = delta >= 0 ? 'up' : 'down';
      const counter = { v: d.trophies.before };
      $('dr-count').textContent = counter.v;
      this.tweens.to(counter, { v: d.trophies.after }, 1200, Ease.outCubic);
      this.countT = counter;
    } else this.countT = null;
    const winners = this.m.fighters.filter(f => f.side === d.winnerSide).map(f => this.#name(f.seat)).join(' e ');
    const notes = [REASONS[d.reason] ?? '', this.spectator ? `Vencedor: ${winners}.` : '',
      this.m.kind === 'ranked' && d.trophies && !d.ranked ? 'Vocês já duelaram muitas vezes nesta hora: sem troféus.' : KIND_NOTES[this.m.kind] ?? ''];
    $('dr-note').textContent = notes.filter(Boolean).join(' ');

    const unlocks = d.unlocked ? [
      ...d.unlocked.cards.map(id => cardEl(this.#card(id), { size: 'sm' })),
      ...d.unlocked.characters.map(id => {
        const c = this.catalog.characters.find(x => x.id === id);
        return h('div', { class: 'unlock-char' }, spriteCanvas(this.game.assets, `char/${id}/side/idle`, { size: 96 }), h('b', {}, c.name));
      }),
    ] : [];
    $('dr-unlocks').replaceChildren(...(unlocks.length ? [h('p', { class: 'unlock-title' }, 'DESBLOQUEADO!'), h('div', { class: 'unlock-row' }, ...unlocks)] : []));
    if (unlocks.length) this.game.audio.play('win');
    $('dr-actions').replaceChildren(...this.#endActions());
    show($('duel-result'), true);
  }

  /** Botões do fim: jogar de novo no mesmo modo, continuar no torneio/arena ou voltar. */
  #endActions() {
    const btn = (label, ico, fn, primary = false) => h('button', { class: `btn${primary ? ' btn-primary' : ''}`, onclick: fn }, icon(ico), label);
    const lobby = (params = {}) => () => this.game.go('lobby', params);
    if (this.spectator) return [btn('VOLTAR', 'icon/casa', lobby(), true)];
    if (this.m.kind === 'tournament' || this.m.kind === 'king') return [btn('CONTINUAR', 'icon/jogar', lobby(), true)];
    const mode = AGAIN[this.m.kind];
    return [
      ...(mode ? [btn('JOGAR DE NOVO', 'icon/espadas', lobby({ autoQueue: mode }), true)] : []),
      btn('LOBBY', 'icon/casa', lobby(), !mode),
    ];
  }

  async #leave() {
    if (this.spectator) {
      this.net.stopSpectating();
      this.game.go('lobby');
      return;
    }
    const msg = this.m.kind === 'ranked' ? 'Desistir do duelo? Você perde troféus.' : 'Desistir do duelo?';
    if (await this.ui.modals.confirm(msg)) this.net.forfeit();
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
    for (const a of this.actors.values()) a.update(dt);
    if (this.reveal) this.reveal.t += dt;
    for (const e of this.emotes) e.t += dt;
    this.emotes = this.emotes.filter(e => e.t < EMOTE_MS);
    if (this.countT) $('dr-count').textContent = Math.round(this.countT.v);
    const left = this.endsAt ? Math.max(0, this.endsAt - performance.now()) : 0;
    const fill = $('duel-timer-fill');
    fill.style.width = `${(left / this.total) * 100}%`;
    fill.classList.toggle('low', left > 0 && left < 3000);
  }

  render(r) {
    this.stage.drawBack(r);
    this.stage.drawPlatforms(r);
    const order = [...this.actors.values()].sort((a, b) => a.y - b.y);
    for (const a of order) a.draw(r);
    this.effects.draw(r);
    this.particles.draw(r);
    this.stage.drawFront(r);
    if (this.jokenWord) r.text(this.jokenWord, GW / 2, 260, { size: 64, align: 'center', color: '#f6d548' });
    if (this.reveal) {
      const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
      this.reveal.weapons.forEach((w, seat) => {
        const a = this.actors.get(seat);
        r.sprite(WEAPONS[w].icon, 0, a.center.x, a.center.y - 150, { scale: 1, sx: k, sy: k });
      });
    }
    const bob = Math.sin(this.time / 180) * 4;
    if (this.vision) {
      const a = this.actors.get(this.vision.seat);
      r.sprite('icon/perk_visao', 0, a.center.x - 70, a.center.y - 140 + bob, { scale: 1 });
      r.sprite(WEAPONS[this.vision.weapon].icon, 0, a.center.x, a.center.y - 140 + bob, { scale: 1 });
    }
    for (const e of this.emotes) {
      const a = this.actors.get(e.seat);
      const k = Ease.outBack(Math.min(1, e.t / 200));
      const alpha = Math.min(1, (EMOTE_MS - e.t) / 300);
      r.sprite('icon/pista', 0, a.center.x + 70, a.center.y - 150, { scale: 2, alpha });
      r.sprite(emoteIcon(e.id), 0, a.center.x + 74, a.center.y - 166, { scale: 1, sx: k, sy: k, alpha });
    }
  }
}
