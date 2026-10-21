// Multiplayer 1x1 (Caçador vs Monstro): lobby, sala de espera, duelo e resultado.
import { Scene } from '../core/Scene.js';
import { GW, PX } from '../core/Renderer.js';
import { Ease } from '../core/Tween.js';
import { MP_MOVES, PERKS } from '../config/multiplayer.js';
import { MOVES } from '../config/weapons.js';
import { MultiplayerClient } from '../net/MultiplayerClient.js';
import { Scenery, GROUND_Y } from '../world/Scenery.js';
import { Fighter } from '../world/Fighter.js';
import { Effects } from '../world/Effects.js';
import { $, h, icon, show } from '../ui/dom.js';

const NICK_KEY = 'jokenghost_mp_nick';
const VIEWS = ['mp-lobby', 'mp-waiting', 'mp-battle', 'mp-result'];
const ROLE_NAME = { hunter: 'CAÇADOR', monster: 'MONSTRO' };
const FEET_Y = GROUND_Y - 40; // acima dos cartões de escolha

export class MultiplayerScene extends Scene {
  constructor(game, ui) {
    super(game, 'screen-mp');
    this.ui = ui;
    this.net = new MultiplayerClient();
    this.#bindNet();

    $('mp-create').addEventListener('click', () => this.create());
    $('mp-join').addEventListener('click', () => this.join());
    $('mp-back').addEventListener('click', () => game.go('menu'));
    $('mp-cancel').addEventListener('click', () => { this.net.leave(); this.view('mp-lobby'); });
    $('mp-menu').addEventListener('click', () => { this.net.leave(); game.go('menu'); });
    $('mp-again').addEventListener('click', () => { this.net.leave(); this.create(); });
    $('mp-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.shareLink()).then(() => ui.toasts.show('Link copiado!', { force: true }));
    });
    $('mp-code').addEventListener('keydown', (e) => { if (e.code === 'Enter') this.join(); });
  }

  enter({ room } = {}) {
    this.scenery = new Scenery(this.game.assets, 'camara');
    this.effects = new Effects(this.game.assets);
    this.hunter = new Fighter(this.game.assets, { base: 'hunter', x: 330, y: FEET_Y, scale: 3 });
    this.monster = new Fighter(this.game.assets, { base: 'enemy/fantasma', x: 950, y: FEET_Y, scale: 3, flying: true });
    this.role = null;
    this.phase = null;
    this.endsAt = 0;
    this.total = 1;
    $('mp-nick').value = this.game.storage.getItem(NICK_KEY) || '';
    $('mp-code').value = room ?? new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
    this.status('Pronto');
    this.view('mp-lobby');
    this.game.audio.playMusic();
  }

  exit() {
    this.net.leave();
  }

  view(id) {
    for (const v of VIEWS) show($(v), v === id);
    this.current = id;
  }

  status(text, el = 'mp-status') { $(el).textContent = text; }

  nickname() {
    const nick = ($('mp-nick').value || 'Jogador').trim().slice(0, 16) || 'Jogador';
    this.game.storage.setItem(NICK_KEY, nick);
    return nick;
  }

  shareLink() {
    return `${location.origin}${location.pathname}?room=${encodeURIComponent(this.code ?? '')}`;
  }

  async #connect() {
    this.status('Conectando...');
    try {
      await this.net.connect();
      this.status('Conectado');
      return true;
    } catch {
      this.status('Não foi possível conectar ao servidor.');
      this.game.audio.play('error');
      return false;
    }
  }

  async create() {
    const nick = this.nickname();
    if (await this.#connect()) this.net.createRoom(nick);
  }

  async join() {
    let code = $('mp-code').value.toUpperCase().trim();
    if (code.length === 4 && !code.startsWith('JGH-')) code = `JGH-${code}`;
    if (!code) { this.status('Digite o código da sala'); this.game.audio.play('error'); return; }
    const nick = this.nickname();
    if (await this.#connect()) this.net.joinRoom(code, nick);
  }

  // ═══════════════════ eventos do servidor ═══════════════════
  #bindNet() {
    const n = this.net;
    const active = () => this.game.scene === this;
    n.on('room_created', (d) => active() && this.#waiting(d, 'Aguardando oponente entrar...'));
    n.on('room_joined', (d) => active() && this.#waiting(d, 'Conectado! Iniciando partida...'));
    n.on('player_joined', () => active() && ($('mp-waiting-msg').textContent = 'Oponente entrou! Preparando...'));
    n.on('match_start', (d) => active() && this.#matchStart(d));
    n.on('perk_phase', (d) => active() && this.#perkPhase(d));
    n.on('attack_phase', (d) => active() && this.#attackPhase(d));
    n.on('perk_confirmed', () => active() && this.status('Perk confirmado! Aguardando oponente...', 'mp-battle-status'));
    n.on('opponent_perk_locked', () => active() && this.status('O oponente já escolheu o perk.', 'mp-battle-status'));
    n.on('opponent_attack_locked', () => active() && this.status('O oponente já escolheu o ataque!', 'mp-battle-status'));
    n.on('round_result', (d) => active() && this.#roundResult(d));
    n.on('match_end', (d) => active() && this.#matchEnd(d));
    n.on('player_left', (d) => active() && this.current === 'mp-waiting' && this.ui.toasts.show(`${d.nickname || 'Jogador'} saiu da sala`, { force: true }));
    n.on('error_msg', (d) => { if (active()) { this.status(d.message || 'Erro'); this.ui.toasts.show(d.message || 'Erro', { force: true }); } });
    n.on('disconnected', () => { if (active() && this.current === 'mp-battle') this.ui.toasts.show('Conexão perdida com o servidor.', { force: true }); });
  }

  #waiting(d, msg) {
    this.role = d.role;
    this.code = d.code;
    $('mp-room-code').textContent = d.code;
    $('mp-role').textContent = `VOCÊ É O ${ROLE_NAME[d.role]}`;
    $('mp-role').className = `mp-role ${d.role}`;
    $('mp-waiting-msg').textContent = msg;
    this.view('mp-waiting');
  }

  #matchStart(d) {
    this.scores = d.room?.scores ?? { hunter: 0, monster: 0 };
    this.view('mp-battle');
    this.#scores();
    this.status(`Você é o ${ROLE_NAME[this.role]}. Primeiro a ${d.roundsToWin ?? 3} pontos vence!`, 'mp-battle-status');
    this.game.audio.play('go');
    this.hunter.ox = -500; this.monster.ox = 500;
    this.tweens.to(this.hunter, { ox: 0 }, 800, Ease.outCubic);
    this.tweens.to(this.monster, { ox: 0 }, 800, Ease.outCubic);
  }

  #scores() {
    $('mp-score-h').textContent = this.scores.hunter ?? 0;
    $('mp-score-m').textContent = this.scores.monster ?? 0;
  }

  #timer(ms) {
    this.endsAt = performance.now() + ms;
    this.total = ms;
  }

  #perkPhase(d) {
    this.phase = 'perk';
    this.picked = false;
    $('mp-round').textContent = `RODADA ${d.round}`;
    $('mp-phase-title').textContent = 'ESCOLHA SEU PERK';
    this.#timer(d.timerMs ?? 12000);
    $('mp-choices').replaceChildren(...(d.perks ?? []).map(p => h('button', {
      class: 'mp-card',
      onclick: (e) => this.#pickPerk(p.id, e.currentTarget),
    }, icon(`icon/perk_${p.id}`, 'ico ico-lg'), h('span', { class: 'mp-card-name' }, PERKS[p.id]?.name ?? p.name), h('span', { class: 'mp-card-desc' }, PERKS[p.id]?.desc ?? p.desc))));
    this.status('Escolha um perk antes do tempo acabar.', 'mp-battle-status');
  }

  #pickPerk(id, btn) {
    if (this.phase !== 'perk' || this.picked) return;
    this.picked = true;
    this.net.pickPerk(id);
    document.querySelectorAll('#mp-choices .mp-card').forEach(b => { b.disabled = true; });
    btn.classList.add('selected');
    this.game.audio.play('select');
  }

  #attackPhase(d) {
    this.phase = 'attack';
    this.picked = false;
    $('mp-phase-title').textContent = 'ESCOLHA SEU ATAQUE';
    this.#timer(d.timerMs ?? 8000);
    const moves = MP_MOVES[this.role] ?? MP_MOVES.hunter;
    $('mp-choices').replaceChildren(...MOVES.map((m, i) => h('button', {
      class: 'mp-card',
      dataset: { move: m },
      onclick: (e) => this.#pickAttack(m, e.currentTarget),
    }, h('span', { class: 'key' }, i + 1), icon(moves[m].icon, 'ico ico-lg'), h('span', { class: 'mp-card-name' }, moves[m].name))));
    this.status('Pedra, papel ou tesoura... escolha!', 'mp-battle-status');
  }

  #pickAttack(move, btn) {
    if (this.phase !== 'attack' || this.picked) return;
    this.picked = true;
    this.net.pickAttack(move);
    document.querySelectorAll('#mp-choices .mp-card').forEach(b => { b.disabled = true; });
    btn?.classList.add('selected');
    this.game.audio.play('select');
    this.status('Ataque enviado! Aguardando revelação...', 'mp-battle-status');
  }

  async #roundResult(d) {
    this.phase = 'reveal';
    this.endsAt = 0;
    const r = d.result;
    $('mp-choices').replaceChildren();
    for (const word of ['JO', 'KEN', 'PÔ!']) {
      this.game.audio.play('beat');
      this.jokenWord = word;
      await this.wait(220);
    }
    this.jokenWord = null;
    const reveal = { h: MP_MOVES.hunter[r.hunterAttack], m: MP_MOVES.monster[r.monsterAttack], t: 0 };
    this.reveal = reveal;
    this.game.audio.play('go');
    await this.wait(500);

    const [winner, loser] = r.outcome === 'hunter' ? [this.hunter, this.monster] : r.outcome === 'monster' ? [this.monster, this.hunter] : [null, null];
    if (winner) {
      const move = r.outcome === 'hunter' ? reveal.h : reveal.m;
      winner.play('attack');
      await this.wait(200);
      const c = loser.center;
      this.effects.play(move.fx, c.x, c.y, { scale: 4 });
      await this.wait(200);
      loser.play('hurt'); loser.flash = 1; loser.shake(300, 10);
      this.game.audio.play('hit');
      this.particles.burst(c.x, c.y, { count: 18 });
    } else {
      this.effects.play('fx/hit', GW / 2, FEET_Y - 140, { scale: 4 });
      this.game.audio.play('draw');
    }

    this.scores = d.scores;
    this.#scores();
    const iWon = r.outcome === this.role;
    const head = r.outcome === 'draw' ? 'EMPATE!' : iWon ? 'VOCÊ VENCEU A RODADA!' : 'VOCÊ PERDEU A RODADA!';
    const perk = (id) => PERKS[id]?.name ?? id;
    const perks = [r.hunterPerk && `Caçador: ${perk(r.hunterPerk)}`, r.monsterPerk && `Monstro: ${perk(r.monsterPerk)}`].filter(Boolean).join(' · ');
    this.status(`${head}${perks ? `  (${perks})` : ''}`, 'mp-battle-status');
    if (r.outcome !== 'draw') this.game.audio.play(iWon ? 'coin' : 'hurt');
    await this.wait(1500);
    if (this.reveal === reveal) this.reveal = null; // outra rodada pode já ter começado
  }

  #matchEnd(d) {
    const won = d.winner === this.role;
    this.phase = null;
    this.endsAt = 0;
    this.game.audio.play(won ? 'win' : 'lose');
    $('mp-result-title').textContent = won ? 'VITÓRIA!' : 'DERROTA!';
    $('mp-result-title').className = `result-title ${won ? 'win' : 'lose'}`;
    const reason = d.reason === 'opponent_left' ? ' (o oponente saiu)' : '';
    $('mp-result-detail').textContent = `${d.winnerNickname || '???'} venceu${reason}. Placar: Caçador ${d.scores?.hunter ?? 0} × ${d.scores?.monster ?? 0} Monstro`;
    this.view('mp-result');
  }

  // ═══════════════════ loop ═══════════════════
  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    this.effects.update(dt);
    this.hunter.update(dt);
    this.monster.update(dt);
    if (this.reveal) this.reveal.t += dt;
    const fill = $('mp-timer-fill');
    const left = this.endsAt ? Math.max(0, this.endsAt - performance.now()) : 0;
    fill.style.width = `${(left / this.total) * 100}%`;
    fill.classList.toggle('low', left > 0 && left < 3000);
  }

  render(r) {
    this.scenery.drawBack(r);
    const inBattle = this.current === 'mp-battle';
    if (inBattle) {
      this.hunter.draw(r);
      this.monster.draw(r);
      r.text(this.role === 'hunter' ? 'VOCÊ' : 'OPONENTE', this.hunter.x, this.hunter.drawY - 200, { size: 16, align: 'center', color: '#f6d548' });
      r.text(this.role === 'monster' ? 'VOCÊ' : 'OPONENTE', this.monster.x, this.monster.drawY - 200, { size: 16, align: 'center', color: '#f6d548' });
    }
    this.effects.draw(r);
    this.particles.draw(r);
    this.scenery.drawFront(r);
    if (this.jokenWord) r.text(this.jokenWord, GW / 2, 300, { size: 64, align: 'center', color: '#f6d548' });
    if (this.reveal) {
      const k = Ease.outBack(Math.min(1, this.reveal.t / 220));
      r.sprite(this.reveal.h.icon, 0, this.hunter.x, this.hunter.center.y - 150, { scale: PX, sx: k, sy: k });
      r.sprite(this.reveal.m.icon, 0, this.monster.x, this.monster.center.y - 150, { scale: PX, sx: k, sy: k });
    }
  }

  onKey(e) {
    if (this.current === 'mp-battle' && this.phase === 'attack') {
      const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (i >= 0) { this.#pickAttack(MOVES[i], document.querySelector(`#mp-choices [data-move="${MOVES[i]}"]`)); return true; }
    }
    if (e.code === 'Escape' && this.current === 'mp-lobby') { this.game.go('menu'); return true; }
    return false;
  }
}
