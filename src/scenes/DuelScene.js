// Duelo entre caçadores (1x1 ou 2x2), na perspectiva estilo Pokémon. Também serve para assistir.
// O servidor decide tudo; esta cena mostra as fases e anima o resultado de cada rodada.
// Cada rodada: "RODADA N" -> cartas -> as cartas jogadas viram na tela de todos -> armas -> resultado.
// Quem joga vê o próprio lado embaixo (de costas); o espectador vê o lado 0 embaixo.
import { Scene } from '../core/Scene.js';
import { GW, GH, hpColor } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { BattleStage, LAYOUT } from '../world/BattleStage.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { WEAPONS, WEAPON_LIST } from '../config/weapons.js';
import { leagueIcon, emoteIcon, LEAGUE_NAMES, MODES } from '../config/multiplayer.js';
import { avatarEl } from '../ui/Avatar.js';
import { cardEl, flipIn } from '../ui/Card.js';
import { spriteCanvas } from '../ui/SpriteCanvas.js';
import { $, h, icon, show, retrigger } from '../ui/dom.js';

const REASONS = { nocaute: 'Nocaute!', tempo: 'Fim das rodadas: venceu quem tinha mais vida.', abandono: 'Um caçador abandonou a partida.', 'desistência': 'Desistência.' };
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
/** Etiqueta da entrada "VS" para os modos que não estão em MODES. */
const VS_TAGS = { room: 'Sala privada', challenge: 'Desafio', tournament: 'Torneio Relâmpago', king: 'Rei da Arena' };
/** Quanto tempo os dois ficam na entrada "VS" depois do VS bater. */
const VS_HOLD_MS = 3000;
/** Quanto dura o voo das cartas da tela grande até o lado das caixas de vida (igual ao CSS de .rv-flip.flying). */
const REVEAL_FLY_MS = 640;
/** Cartas de arma: o nome aparece quando vencem com aquela arma. */
const WEAPON_CARDS = { estaca_prata: 'estaca', aspirador_turbo: 'aspirador', cruz_flamejante: 'cruz' };

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
    net.on('ban_phase', here((d) => this.#banPhase(d)));
    net.on('bans', here((d) => this.#bans(d)));
    net.on('round_intro', here((d) => this.#roundIntro(d)));
    net.on('card_phase', here((d) => this.#cardPhase(d)));
    net.on('cards_reveal', here((d) => this.#cardsReveal(d)));
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
    this.revealed = 0;        // rodada cujas cartas já viraram na tela grande
    this.forbidMark = null;   // Provocação: a arma proibida em cima de quem recebeu
    this.charged = new Set(); // carta lendária na mesa: o caçador brilha até o golpe
    this.sparkT = 0;
    this.screenFlash = null;
    this.endsAt = 0;
    this.total = 1;
    this.banPicked = false;
    // uma entrada "VS" que não terminou (troca de partida no torneio, reconexão) não fica na tela
    show($('duel-vs'), false);
    show($('duel-round-intro'), false);
    show($('duel-reveal'), false);
    for (const b of [$('duel-opp-box'), $('duel-me-box')]) b.classList.remove('duel-hud-wait');
    for (const el of [$('duel-hand'), $('duel-opp-card'), $('duel-my-card')]) el.classList.remove('out', 'waiting', 'landed');

    const top = match.fighters.filter(f => f.side !== this.mySide);
    const bottom = match.fighters.filter(f => f.side === this.mySide);
    $('duel-opp-name').textContent = top.map(f => this.#name(f.seat)).join(' & ').toUpperCase();
    $('duel-me-name').textContent = bottom.map(f => this.#name(f.seat)).join(' & ').toUpperCase();
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

    if (match.phase === 'ban') this.#banPhase({ endsIn: match.endsIn, deck: match.banLocked ? [] : match.oppDeck });
    else if (match.phase === 'card') this.#cardPhase({ round: match.round, hand: match.hand, endsIn: match.endsIn, hp: this.hp });
    else if (match.phase === 'weapon') this.#weaponPhase({ round: match.round, endsIn: match.endsIn, cards: match.cards, forbidden: match.forbidden });
    else if (match.round > 0 || match.banned) this.#resume(match);
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
    for (const a of this.actors.values()) a.ox = a.bottom ? -500 : 500;
    const opp = this.spectator ? 'Os caçadores vão duelar!' : `${this.m.fighters.filter(f => f.side !== this.mySide).map(f => this.#name(f.seat)).join(' e ')} quer duelar!`;
    this.#say(this.spectator ? `Você está assistindo. ${opp}` : opp);
    await this.#versus();
    for (const a of this.actors.values()) this.tweens.to(a, { ox: 0 }, 800, Ease.outCubic);
  }

  /** Tira da tela com a animação de saída (classe `out` no CSS). */
  async #retire(el, ms = 300) {
    if (el.classList.contains('hidden') || el.classList.contains('out')) return;
    el.classList.add('out');
    await this.wait(ms);
    if (!el.classList.contains('out')) return;
    el.classList.remove('out');
    el.classList.add('hidden');
  }

  /** Voltou (ou começou a assistir) no meio de uma pausa: sem entrada, só o estado atual. */
  #resume(match) {
    if (match.phase === 'cards' && match.cards) {
      const me = this.#anchor;
      this.#showPlayed('duel-my-card', match.cards[me]);
      this.#showPlayed('duel-opp-card', match.cards[this.#laneOpp(me)]);
    }
    $('duel-round').textContent = match.round ? `RODADA ${match.round}` : 'BANIMENTO';
    this.#say('De volta ao duelo...');
  }

  /**
   * Entrada "VS": o adversário entra por cima, você por baixo, o VS bate no meio e os nomes
   * deslizam até as caixas de vida. As caixas só aparecem quando o nome chega nelas.
   */
  async #versus() {
    const match = this.m;
    const boxes = [$('duel-opp-box'), $('duel-me-box')];
    const targets = [$('duel-opp-name'), $('duel-me-name')];
    const sides = [match.fighters.filter(f => f.side !== this.mySide), match.fighters.filter(f => f.side === this.mySide)];
    const plates = sides.map((list, k) => {
      const char = this.catalog.characters.find(c => c.id === list[0].character);
      const name = h('b', { class: 'vs-name' }, targets[k].textContent);
      const el = k === 0 ? $('vs-top') : $('vs-bottom');
      el.replaceChildren(
        h('div', { class: 'vs-band' }),
        ...list.map(f => h('div', { class: 'vs-avatar' }, avatarEl(this.game.assets, f, { size: list.length > 1 ? 128 : 176 }))),
        h('div', { class: 'vs-plate' }, name,
          h('span', { class: 'vs-char' }, list.map(f => this.catalog.characters.find(c => c.id === f.character)?.name ?? char?.name).join(' & ')),
          h('span', { class: 'vs-league' }, icon(leagueIcon(list[0].league), 'ico'), `${LEAGUE_NAMES[list[0].league] ?? ''} · ${list[0].trophies}`, icon('icon/trofeu', 'ico ico-sm'))));
      return name;
    });
    const kind = match.kind === 'ranked' ? 'Ranqueada' : MODES[match.kind]?.name ?? VS_TAGS[match.kind] ?? 'Duelo';
    $('vs-tag').textContent = (match.fighters.length > 2 ? `${kind} · 2x2` : kind).toUpperCase();

    const vs = $('duel-vs');
    for (const b of boxes) b.classList.add('duel-hud-wait');
    vs.className = 'vs-intro';
    this.game.audio.play('phase');
    await this.wait(480);
    this.game.audio.play('hit');
    retrigger(vs, 'shake');
    await this.wait(VS_HOLD_MS);
    if (this.m !== match) return;

    // os nomes vão para as caixas de vida
    vs.classList.add('leaving');
    const k = this.game.viewport.scale;
    plates.forEach((name, i) => {
      const s = name.getBoundingClientRect();
      const t = targets[i].getBoundingClientRect();
      name.classList.add('flying');
      name.style.transform = `translate(${(t.left - s.left) / k}px, ${(t.top - s.top) / k}px) scale(${t.height / s.height})`;
    });
    this.game.audio.play('swing');
    await this.wait(620);
    vs.classList.add('hidden');
    for (const b of boxes) { b.classList.remove('duel-hud-wait'); retrigger(b, 'duel-hud-arrive'); }
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
  /** 1x1: a build do adversário aparece e você bane uma carta dela. */
  #banPhase(d) {
    this.#timer(d.endsIn);
    $('duel-round').textContent = 'BANIMENTO';
    $('duel-actions').replaceChildren();
    if (this.spectator || !d.deck.length) {
      show($('duel-hand'), false);
      this.#say(this.spectator ? 'Os caçadores olham as builds um do outro e banem uma carta...' : 'Esperando o adversário banir...');
      return;
    }
    const opp = this.#laneOpp(this.m.you);
    const char = this.catalog.characters.find(c => c.id === this.m.fighters[opp].character);
    $('duel-hand-title').replaceChildren(`BANA 1 CARTA DE ${this.#name(opp).toUpperCase()} `, h('small', {}, `(${char?.name ?? ''})`));
    const els = d.deck.map((id) => {
      const el = cardEl(this.#card(id), { size: 'md', onPick: (c) => this.#pickBan(c, el) });
      return el;
    });
    $('duel-cards').replaceChildren(...els);
    show($('duel-hand'), true);
    retrigger($('duel-hand'), 'deal');
    this.#say(`Esta é a build de ${this.#name(opp)} (${char?.name}: ${char?.passive}) Escolha uma carta para tirar dela nesta partida.`);
    this.game.audio.play('select');
  }

  #pickBan(card, el) {
    if (this.banPicked) return;
    this.banPicked = true;
    this.net.banCard(card.id);
    document.querySelectorAll('#duel-cards .pcard').forEach(c => { c.disabled = true; c.classList.toggle('picked', c === el); c.classList.toggle('dropped', c !== el); });
    this.game.audio.play('select');
    this.#say(`Você baniu ${card.name}. Esperando o adversário...`);
  }

  #bans({ banned }) {
    this.#retire($('duel-hand'));
    this.endsAt = 0;
    const name = (id) => this.#card(id)?.name ?? '?';
    if (this.spectator) {
      this.#say(this.m.fighters.map(f => `${f.nickname} perdeu ${name(banned[f.seat])}`).join(' · '));
      return;
    }
    const opp = this.#laneOpp(this.m.you);
    this.#say(`Você tirou ${name(banned[opp])} de ${this.#name(opp)}. Você perdeu ${name(banned[this.m.you])}.`);
    this.#banner('CARTAS BANIDAS!', 1400);
  }

  /** "RODADA N" atravessa a tela; a morte súbita, a última e as extras têm aviso próprio. */
  async #roundIntro(d) {
    this.round = d.round;
    this.endsAt = 0;
    this.forbidMark = null;
    this.charged.clear();
    this.#retire($('duel-hand'));
    this.#retire($('duel-opp-card'));
    this.#retire($('duel-my-card'));
    $('duel-actions').replaceChildren();
    $('duel-round').textContent = `RODADA ${d.round}`;
    const rules = this.catalog.rules;
    const firstSudden = d.round === rules.suddenDeathRound;
    $('ri-title').textContent = d.final ? 'RODADA FINAL' : d.extra ? 'RODADA EXTRA' : `RODADA ${d.round}`;
    $('ri-sub').textContent = d.extra ? 'Vida empatada: segue até alguém passar na frente'
      : d.final ? 'Depois dela vence quem tiver mais vida'
        : firstSudden ? 'MORTE SÚBITA · DANO DOBRADO' : d.sudden ? 'Morte súbita: dano dobrado' : '';
    const el = $('duel-round-intro');
    const ms = (rules.roundIntroMs ?? 2000) - 100;
    el.style.setProperty('--ri-ms', `${ms}ms`);
    el.className = `round-intro${d.sudden || d.final || d.extra ? ' danger' : ''}`;
    this.game.audio.play(firstSudden || d.final ? 'phase' : 'go');
    this.#say(d.final ? 'Última rodada!' : firstSudden ? 'Morte súbita: agora o dano é dobrado!' : `Rodada ${d.round}!`);
    await this.wait(ms);
    if (this.round === d.round) el.classList.add('hidden');
  }

  #cardPhase(d) {
    show($('duel-round-intro'), false);
    $('duel-hand-title').replaceChildren('ESCOLHA UMA CARTA ', h('small', {}, '(passe o mouse para ler)'));
    this.round = d.round;
    $('duel-round').textContent = `RODADA ${d.round}`;
    this.hp = [...d.hp];
    this.#syncHp();
    this.vision = null;
    show($('duel-opp-card'), false);
    show($('duel-my-card'), false);
    this.#timer(d.endsIn);

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
    $('duel-hand').classList.remove('out');
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
    this.#retire($('duel-hand'));
    const me = this.#anchor;
    const opp = this.#laneOpp(me);
    if (this.revealed !== d.round) { // as cartas viradas na tela grande chegam voando
      this.#showPlayed('duel-my-card', d.cards[me]);
      this.#showPlayed('duel-opp-card', d.cards[opp], true);
    }
    if (this.spectator) {
      this.#say('Os caçadores escolhem as armas...');
      $('duel-actions').replaceChildren();
      return;
    }
    const oppCard = d.cards[opp] && this.#card(d.cards[opp]);
    const hurry = d.endsIn < this.catalog.rules.weaponPhaseMs ? ` Rápido: você tem só ${Math.round(d.endsIn / 1000)}s!` : '';
    const forbid = d.forbidden ? ` A Provocação proibiu ${WEAPONS[d.forbidden].name}.` : '';
    this.#say((oppCard ? `${this.#name(opp)} jogou ${oppCard.name}! Escolha sua arma.` : 'Escolha sua arma: pedra, papel ou tesoura!') + forbid + hurry);
    $('duel-actions').replaceChildren(...WEAPON_LIST.map(w => h('button', {
      class: `btn btn-action${w.id === d.forbidden ? ' forbidden' : ''}`,
      dataset: { weapon: w.id },
      disabled: w.id === d.forbidden,
      title: w.id === d.forbidden ? 'Provocação: você não pode repetir esta arma' : '',
      onclick: () => this.#pickWeapon(w.id),
    }, icon(w.icon, 'ico'), w.id === d.forbidden ? 'PROIBIDA' : `${w.name} [${w.key}]`)));
  }

  /**
   * Cartas na mesa: as jogadas aparecem grandes e viram devagar, ao mesmo tempo para todos
   * (o servidor espera `endsIn` antes das armas). Depois de virar, cada carta mostra o que faz;
   * a lendária vira "movimento especial" e o caçador dela fica brilhando até o golpe.
   * No fim, a sua carta voa para o lado da sua vida e a do adversário para o lado do perfil dele.
   */
  async #cardsReveal(d) {
    const round = d.round;
    this.round = round;
    this.revealed = round;
    this.endsAt = 0;
    show($('duel-round-intro'), false);
    this.#retire($('duel-hand'));
    $('duel-actions').replaceChildren();
    const rules = this.catalog.rules;
    const side = (seat) => this.m.fighters[seat].side;
    // o seu lado à esquerda (como na arena), o adversário à direita
    const seats = this.m.fighters.map(f => f.seat).filter(s => d.cards[s])
      .sort((x, y) => (side(y) === this.mySide) - (side(x) === this.mySide) || this.m.fighters[x].lane - this.m.fighters[y].lane);
    const items = seats.map((seat) => {
      const card = this.#card(d.cards[seat]);
      const legend = card.rarity === 'lendario';
      const front = cardEl(card, { size: 'xl' });
      front.classList.add('rv-front');
      const flip = h('div', { class: 'rv-flip' }, cardEl(card, { size: 'xl', faceDown: true }), front);
      const el = h('div', { class: `rv-item${side(seat) !== this.mySide ? ' opp' : ''}${legend ? ' legend' : ''}` },
        legend ? h('div', { class: 'rv-rays' }) : null,
        h('span', { class: 'rv-who' }, seat === this.m.you ? 'VOCÊ JOGOU' : `${this.#name(seat).toUpperCase()} JOGOU`),
        flip,
        h('p', { class: 'rv-desc' }, card.desc));
      return { seat, card, el, flip, legend };
    });
    const box = $('duel-reveal');
    $('rv-row').replaceChildren(...items.map(i => i.el));
    box.className = 'card-reveal';
    this.#say(`Cartas na mesa! ${items.map(i => `${i.seat === this.m.you ? 'Você' : this.#name(i.seat)}: ${i.card.name}`).join(' · ')}`);
    this.game.audio.play('swing');
    const still = () => this.revealed === round && this.game.scene === this;

    await this.wait(380);
    if (!still()) return;
    for (const i of items) i.flip.classList.add('open');
    this.game.audio.play('swing');
    await this.wait(460);
    if (!still()) return;
    this.game.audio.play('select');
    await this.wait(460);
    if (!still()) return;
    for (const i of items) i.el.classList.add('shown');

    // o que a carta já faz antes das armas
    for (const i of items) {
      const target = this.#laneOpp(i.seat);
      const who = target === this.m.you ? 'Você' : this.#name(target);
      if (i.card.id === 'provocacao') {
        const w = d.forbidden?.[target];
        i.el.append(w
          ? h('div', { class: 'rv-effect' }, h('span', { class: 'rv-lock' }, icon(WEAPONS[w].icon, 'ico')), `${who} não pode usar ${WEAPONS[w].name}!`)
          : h('div', { class: 'rv-effect good' }, 'Ainda não há arma para proibir.'));
        if (w) { this.forbidMark = { seat: target, weapon: w }; this.game.audio.play('block'); }
      } else if (i.card.id === 'visao') {
        i.el.append(h('div', { class: 'rv-effect' }, icon('icon/perk_visao', 'ico'), `${who} tem só ${String(rules.visionWeaponMs / 1000).replace('.', ',')}s para a arma!`));
        this.game.audio.play('super');
      } else if (i.card.id === 'disfarce' && d.cards[target] === 'visao') {
        i.el.append(h('div', { class: 'rv-effect good' }, icon('icon/perk_disfarce', 'ico'), 'A Visão vai ver uma arma falsa!'));
      }
    }
    const legends = items.filter(i => i.legend);
    if (legends.length) {
      for (const i of legends) this.charged.add(i.seat);
      box.classList.add('lit');
      retrigger(box, 'shake');
      this.game.audio.play('super');
      this.game.audio.play('hit');
      this.screenFlash = { color: '#f6d548', a: 0.6 };
      for (const i of legends) {
        const c = this.actors.get(i.seat).center;
        this.particles.burst(c.x, c.y, { count: 30, speed: 260, colors: ['#fff3a6', '#f6d548', '#ffffff'] });
      }
    }

    await this.wait(Math.max(400, d.endsIn - 1300 - REVEAL_FLY_MS - 60));
    if (!still()) return;

    // as cartas de pista voam até o lugar delas; as outras (2x2) somem
    const me = this.#anchor;
    const slots = new Map([[me, $('duel-my-card')], [this.#laneOpp(me), $('duel-opp-card')]]);
    for (const [seat, slot] of slots) {
      this.#showPlayed(slot.id, d.cards[seat]);
      slot.classList.add('waiting');
    }
    box.classList.add('leaving');
    const k = this.game.viewport.scale;
    for (const i of items) {
      const target = slots.get(i.seat)?.firstElementChild;
      if (!target) { i.el.classList.add('gone'); continue; }
      const from = i.flip.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dx = (to.left + to.right - from.left - from.right) / 2 / k;
      const dy = (to.top + to.bottom - from.top - from.bottom) / 2 / k;
      i.el.style.animation = 'none';
      i.flip.classList.add('flying');
      i.flip.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width}) rotateY(180deg)`;
    }
    this.game.audio.play('swing');
    await this.wait(REVEAL_FLY_MS);
    if (!still()) return;
    for (const slot of slots.values()) { slot.classList.remove('waiting'); slot.classList.add('landed'); }
    box.classList.add('hidden');
    this.game.audio.play('hover');
  }

  #showPlayed(id, cardId, flip = false) {
    const box = $(id);
    box.classList.remove('out', 'waiting', 'landed');
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
    this.#say(`${this.#name(seat)} já escolheu ${{ ban: 'o que banir', card: 'a carta' }[phase] ?? 'a arma'}.`);
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
    this.revealed = 0;
    show($('duel-reveal'), false);
    for (const slot of [$('duel-opp-card'), $('duel-my-card')]) if (slot.classList.contains('waiting')) slot.classList.replace('waiting', 'landed');
    this.vision = null;
    this.history = d.history;
    const hpBefore = [...this.hp];
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = word;
      for (const a of this.actors.values()) { a.oy = -14; this.tweens.to(a, { oy: 0 }, 180); }
      await this.wait(230);
    }
    this.jokenWord = null;
    this.forbidMark = null;
    this.reveal = { weapons: d.fighters.map(f => f.weapon), t: 0 };
    this.game.audio.play('go');
    const me = this.#anchor, opp = this.#laneOpp(me);
    this.#say(`${this.spectator ? this.#name(me) : 'Você'}: ${WEAPONS[d.fighters[me].weapon].name} × ${this.#name(opp)}: ${WEAPONS[d.fighters[opp].weapon].name}`);
    await this.wait(700);

    // Escudo Sagrado: o lado fica protegido antes dos golpes
    const sacred = d.fighters.map((f, seat) => (f.card === 'escudo_sagrado' ? seat : -1)).filter(seat => seat >= 0);
    for (const seat of sacred) {
      const c = this.actors.get(seat).center;
      this.effects.play('fx/shield', c.x, c.y, { scale: 6, fps: 10 });
      this.#callout(seat, 'ESCUDO SAGRADO!', '#f6d548', 28);
      this.particles.burst(c.x, c.y, { count: 24, speed: 200, colors: ['#fff3a6', '#f6d548'] });
    }
    if (sacred.length) { this.screenFlash = { color: '#f6d548', a: 0.45 }; this.game.audio.play('heal'); await this.wait(520); }

    // cada pista: quem venceu ataca quem perdeu (a minha pista por último, para a mensagem ficar)
    const lanes = [...d.lanes].sort((x, y) => (x.a === me || x.b === me) - (y.a === me || y.b === me));
    for (const lane of lanes) await this.#animateLane(lane, d, lane.a === me || lane.b === me, hpBefore);

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
    this.charged.clear();
    await this.wait(900);
    this.reveal = null;
    if (d.winner != null && d.reason === 'tempo') await this.#drainToZero(d.winner);
  }

  /** Nome de uma carta (ou aviso) em cima do caçador. */
  #callout(seat, text, color = '#f4f2fa', size = 24) {
    const c = this.actors.get(seat).center;
    this.effects.text(text, c.x, c.y - 170, { color, size, life: 1300, rise: 40 });
  }

  async #animateLane(lane, d, mine, hpBefore) {
    const A = this.actors.get(lane.a), B = this.actors.get(lane.b);
    if (lane.outcome === 'draw') {
      const mid = { x: (A.center.x + B.center.x) / 2, y: (A.center.y + B.center.y) / 2 };
      this.effects.play('fx/hit', mid.x, mid.y, { scale: 4 });
      this.game.audio.play('draw');
      if (mine) this.#say('Empate!');
      // Empate Forte: o empate machuca o outro
      for (const [seat, other] of [[lane.a, lane.b], [lane.b, lane.a]]) {
        if (d.fighters[seat].card !== 'empate_forte') continue;
        await this.wait(260);
        this.#callout(seat, 'EMPATE FORTE!', '#f6d548');
        if (d.fighters[other].damage || d.fighters[other].blocked) this.#strike(other, d.fighters[other], 'fx/hit');
      }
      return;
    }
    const [att, defSeat] = lane.outcome === 'a' ? [lane.a, lane.b] : [lane.b, lane.a];
    const attacker = this.actors.get(att), def = this.actors.get(defSeat);
    const card = d.fighters[att].card;
    const weapon = d.fighters[att].weapon;
    const res = d.fighters[defSeat];
    const fx = WEAPONS[weapon].fx;
    const judgement = card === 'juizo';

    // Juízo Final: o movimento especial escurece a arena antes do golpe triplo
    if (judgement) {
      this.screenFlash = { color: '#0e0b16', a: 0.75, hold: 650 };
      this.#callout(att, 'JUÍZO FINAL!', '#f6d548', 40);
      this.game.audio.play('super');
      attacker.flash = 1; attacker.flashColor = '#f6d548';
      await this.wait(700);
    }
    attacker.play('attack');
    await this.wait(200);
    const c = def.center;
    const hits = judgement ? 3 : card === 'golpe_duplo' ? 2 : 1;
    for (let k = 0; k < hits; k++) {
      this.effects.play(fx, c.x + (k - (hits - 1) / 2) * 34, c.y - k * 10, { scale: judgement ? 6 : 4 });
      if (k < hits - 1) { this.game.audio.play('hit'); await this.wait(150); }
    }
    await this.wait(220);
    if (res.dodged) {
      this.effects.text('DESVIOU!', c.x, c.y - 120, { color: '#7cf0dc', size: 24 });
      this.game.audio.play('block');
    } else if (res.blocked) {
      this.effects.play('fx/shield', c.x, c.y, { scale: 4, fps: 10 });
      this.effects.text(res.card === 'escudo_sagrado' ? 'INTOCÁVEL!' : 'BLOQUEADO!', c.x, c.y - 120, { color: res.card === 'escudo_sagrado' ? '#f6d548' : '#6f96f0', size: 24 });
      this.game.audio.play('block');
    } else {
      def.play('hurt'); def.flash = 1; def.flashColor = '#ffffff';
      def.shake(judgement ? 700 : 320, judgement ? 26 : 10);
      this.game.audio.play(judgement ? 'hurt' : 'hit');
      this.particles.burst(c.x, c.y, { count: judgement ? 48 : 18, speed: judgement ? 320 : 160 });
      if (judgement) this.screenFlash = { color: '#ffffff', a: 0.85 };
    }

    // o que a carta de cada um fez no golpe
    const side = this.m.fighters[att].side;
    const callout = {
      golpe_duplo: ['GOLPE DUPLO!', '#f6d548'],
      disfarce: ['DISFARCE +10', '#c08cff'],
      sorte: null, // o "SORTE!" já sai com o dano
      furia: hpBefore[side] < this.max[side] / 2 ? ['FÚRIA!', '#ff7563'] : null,
      vampirismo: ['VAMPIRISMO!', '#ff7563'],
    }[card] ?? (WEAPON_CARDS[card] === weapon ? [this.#card(card).name.toUpperCase(), '#f6d548'] : null);
    if (callout && !judgement) this.#callout(att, callout[0], callout[1]);
    if (card === 'furia' && callout) this.particles.burst(attacker.center.x, attacker.center.y, { count: 20, colors: ['#ff7563', '#d23a3a'] });
    if (card === 'vampirismo' && res.damage) {
      this.effects.projectile('fx/proj_orb', c, attacker.center, { ms: 420, scale: 3, arc: 60 }).then(() => this.effects.play('fx/heal', attacker.center.x, attacker.center.y, { scale: 3 }));
    }
    if (res.card === 'juizo') this.#callout(defSeat, 'JUÍZO: +10 DE DANO', '#ff7563');
    // Espinhos: quem bateu se espeta
    if (res.card === 'espinhos' && d.fighters[att].thorns) {
      await this.wait(260);
      this.#callout(defSeat, 'ESPINHOS!', '#a8e070');
      this.#strike(att, d.fighters[att], 'fx/hit');
    }
    if (mine) this.#say(att === this.m.you ? 'Você acertou o golpe!' : defSeat === this.m.you ? `${this.#name(att)} acertou você!` : `${this.#name(att)} acertou ${this.#name(defSeat)}!`);
  }

  /** Um golpe extra (Espinhos, Empate Forte) no caçador do assento. */
  #strike(seat, res, fx) {
    const a = this.actors.get(seat);
    const c = a.center;
    this.effects.play(fx, c.x, c.y, { scale: 4 });
    if (res.blocked) { this.effects.play('fx/shield', c.x, c.y, { scale: 4, fps: 10 }); this.game.audio.play('block'); return; }
    a.play('hurt'); a.flash = 1; a.flashColor = '#ffffff'; a.shake(300, 8);
    this.game.audio.play('hurt');
    this.particles.burst(c.x, c.y, { count: 12 });
  }

  /**
   * Fim das rodadas: já se sabe quem venceu, mas as vidas descem juntas
   * até a de quem tinha menos zerar (quem tinha mais fica com a diferença).
   */
  async #drainToZero(winner) {
    const loser = 1 - winner;
    const amount = this.hp[loser];
    if (amount <= 0) return;
    this.#say('Fim das rodadas! As vidas descem até alguém cair...');
    await this.#banner('FIM DAS RODADAS!', 1200, 'danger');
    const start = [...this.hp];
    const drain = { k: 0 };
    const ms = Math.min(2600, Math.max(1200, amount * 28));
    this.tweens.to(drain, { k: 1 }, ms, Ease.inOutQuad);
    let tick = 0;
    while (drain.k < 1 && this.game.scene === this) {
      this.hp = start.map(v => Math.max(0, Math.round(v - amount * drain.k)));
      this.#syncHp();
      if ((tick++ & 3) === 0) this.game.audio.play('type');
      for (const [seat, a] of this.actors) if (tick % 6 === 0) a.flash = this.m.fighters[seat].side === loser ? 0.8 : 0.3;
      await this.wait(30);
    }
    this.hp = start.map(v => Math.max(0, v - amount));
    this.#syncHp();
    for (const [seat, a] of this.actors) {
      if (this.m.fighters[seat].side !== loser) continue;
      a.play('hurt'); a.flash = 1; a.shake(500, 14);
      this.particles.burst(a.center.x, a.center.y, { count: 30, speed: 240 });
    }
    this.game.audio.play('hurt');
    this.screenFlash = { color: '#ffffff', a: 0.6 };
    await this.wait(600);
  }

  // ═══════════════════════ fim ═══════════════════════
  async #matchEnd(d) {
    this.endsAt = 0;
    this.#retire($('duel-hand'));
    this.#retire($('duel-opp-card'));
    this.#retire($('duel-my-card'));
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
    if (this.screenFlash) {
      const f = this.screenFlash;
      if (f.hold > 0) f.hold -= dt;
      else f.a -= dt / 450;
      if (f.a <= 0) this.screenFlash = null;
    }
    this.sparkT += dt;
    if (this.charged.size && this.sparkT > 90) {
      this.sparkT = 0;
      for (const seat of this.charged) {
        const c = this.actors.get(seat).center;
        this.particles.burst(c.x + (Math.random() - 0.5) * 90, c.y + 40, { count: 2, speed: 50, gravity: -260, life: 800, colors: ['#fff3a6', '#f6d548'] });
      }
    }
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
    if (this.screenFlash) r.rect(0, 0, GW, GH, this.screenFlash.color, Math.min(1, this.screenFlash.a));
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
    // Provocação: a arma proibida, riscada, em cima de quem recebeu
    if (this.forbidMark) {
      const a = this.actors.get(this.forbidMark.seat);
      const x = a.center.x, y = a.center.y - 150 + bob;
      r.sprite(WEAPONS[this.forbidMark.weapon].icon, 0, x, y, { scale: 1, alpha: 0.85 });
      r.sprite('icon/fechar', 0, x, y, { scale: 1.1, tint: '#d23a3a', alpha: 0.7 });
    }
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
