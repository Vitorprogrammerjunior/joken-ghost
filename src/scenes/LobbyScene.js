// Arena dos Caçadores: perfil, partida rápida, salas privadas, desafios e quem está online.
import { Scene } from '../core/Scene.js';
import { GW, GH } from '../core/Renderer.js';
import { Scenery } from '../world/Scenery.js';
import { $, h, icon, show } from '../ui/dom.js';
import { setSprite, spriteCanvas } from '../ui/SpriteCanvas.js';
import { LEAGUE_NAMES, leagueIcon } from '../config/multiplayer.js';
import { selectCharacter } from '../config/characters.js';

const STATUS = { lobby: 'no lobby', queue: 'procurando', room: 'em sala', match: 'duelando' };

export class LobbyScene extends Scene {
  /** @param {import('../net/MultiplayerClient.js').MultiplayerClient} net */
  constructor(game, ui, net) {
    super(game, 'screen-lobby');
    this.ui = ui;
    this.net = net;

    $('lb-back').addEventListener('click', () => game.go('menu'));
    $('lb-quick').addEventListener('click', () => this.#ready() && net.queueJoin());
    $('lb-search-cancel').addEventListener('click', () => net.queueLeave());
    $('lb-room').addEventListener('click', () => this.#ready() && net.createRoom());
    $('lb-room-cancel').addEventListener('click', () => { net.leaveRoom(); show($('lb-room-wait'), false); });
    $('lb-room-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.#shareLink()).then(() => ui.toasts.show('Link copiado! Mande para um amigo.', { force: true }));
    });
    $('lb-join').addEventListener('click', () => this.#join());
    $('lb-code').addEventListener('keydown', (e) => { if (e.code === 'Enter') this.#join(); });
    $('lb-chars').addEventListener('click', () => this.#ready() && ui.arena.openCharacters());
    $('lb-cards').addEventListener('click', () => this.#ready() && ui.arena.openCards());
    $('lb-rank').addEventListener('click', () => this.#ready() && ui.arena.openRanking());
    $('lp-name').addEventListener('click', () => this.#ready() && ui.arena.openProfile());

    const here = () => game.scene === this;
    net.on('welcome', () => here() && this.#onWelcome());
    net.on('profile', () => here() && this.#renderProfile());
    net.on('lobby', () => here() && this.#renderOnline());
    net.on('queue_state', (d) => { if (!here()) return; this.searchingSince = d.searching ? performance.now() : 0; show($('lb-searching'), d.searching); });
    net.on('room_created', ({ code }) => { if (!here()) return; this.roomCode = code; $('lb-room-code').textContent = code; show($('lb-room-wait'), true); });
    net.on('challenge_sent', (d) => here() && this.#status(`Desafio enviado para ${d.nickname}...`));
    net.on('challenge_declined', (d) => here() && ui.toasts.show(`${d.nickname} ${d.reason === 'tempo' ? 'não respondeu' : 'recusou'} o desafio.`, { force: true }));
    net.on('match_start', (d) => this.#toDuel(d));
    net.on('match_resume', (d) => this.#toDuel(d));
    net.on('error_msg', (d) => { if (here()) { this.#status(d.message); ui.toasts.show(d.message, { force: true }); } });
    net.on('disconnected', () => here() && this.#status('Conexão perdida. Tentando reconectar...'));
    game.bus.on('arena-reconnect', () => here() && this.#connect());
  }

  enter({ room, autoQueue = false } = {}) {
    this.scenery ??= new Scenery(this.game.assets, 'mansao');
    this.pendingRoom = room ?? null;
    this.autoQueue = autoQueue;
    this.searchingSince = 0;
    show($('lb-searching'), false);
    show($('lb-room-wait'), false);
    this.game.audio.playMusic('lobby');
    if (this.net.connected) this.#onWelcome();
    else this.#connect();
  }

  exit() {
    if (this.net.connected && !this.leavingToDuel) { this.net.queueLeave(); this.net.leaveRoom(); }
    this.leavingToDuel = false;
  }

  async #connect() {
    this.#status('Conectando ao servidor...');
    try {
      await this.net.connect(this.game.storage.getItem('jokenghost_mp_nick') || '');
    } catch {
      this.#status('Não foi possível conectar ao servidor. Tente de novo mais tarde.');
      this.game.audio.play('error');
    }
  }

  #ready() {
    if (this.net.connected) return true;
    this.ui.toasts.show('Ainda conectando ao servidor...', { force: true });
    return false;
  }

  #onWelcome() {
    this.#status('Conectado! Escolha como quer jogar.');
    this.#renderProfile();
    this.#renderOnline();
    if (this.pendingRoom) { this.net.joinRoom(this.pendingRoom); this.pendingRoom = null; }
    else if (this.autoQueue) { this.autoQueue = false; this.net.queueJoin(); }
  }

  #status(text) { $('lb-status').textContent = text; }

  #shareLink() { return `${location.origin}${location.pathname}?room=${encodeURIComponent(this.roomCode ?? '')}`; }

  #join() {
    if (!this.#ready()) return;
    const code = $('lb-code').value.toUpperCase().trim();
    if (code.length < 4) { this.#status('Digite o código da sala.'); this.game.audio.play('error'); return; }
    this.net.joinRoom(code);
  }

  #renderProfile() {
    const p = this.net.profile;
    if (!p) return;
    selectCharacter(this.game.storage, p.character);
    $('lp-nick').textContent = p.nickname;
    $('lp-trophies').textContent = p.trophies;
    $('lp-league-ico').src = icon(leagueIcon(p.league)).src;
    $('lp-league').textContent = `Liga ${LEAGUE_NAMES[p.league]}`;
    $('lp-record').textContent = `${p.wins} vitórias · ${p.losses} derrotas`;
    setSprite(this.game.assets, $('lb-avatar'), `char/${p.character}/side/idle`);
    // próximo desbloqueio
    const { cards, characters } = this.net.catalog;
    const next = [...cards.map(c => ({ ...c, kind: 'carta' })), ...characters.map(c => ({ ...c, kind: 'caçador' }))]
      .filter(x => x.trophies > p.best).sort((a, b) => a.trophies - b.trophies)[0];
    $('lp-next').textContent = next ? `Próximo: ${next.kind} ${next.name} com ${next.trophies} troféus` : 'Você desbloqueou tudo!';
  }

  #renderOnline() {
    const me = this.net.profile?.id;
    const { online, count } = this.net.lobby;
    $('lb-count').textContent = count;
    const others = online.filter(p => p.id !== me);
    $('lb-online').replaceChildren(...(others.length ? others.map(p => h('li', { class: `online-row s-${p.status}` },
      spriteCanvas(this.game.assets, `char/${p.character}/side/idle`, { size: 48, msPerFrame: 200 }),
      h('span', { class: 'on-info' }, h('b', {}, p.nickname), h('small', {}, icon(leagueIcon(p.league), 'ico ico-xs'), ` ${p.trophies} · ${STATUS[p.status] ?? ''}`)),
      p.status === 'lobby'
        ? h('button', { class: 'btn btn-sm', onclick: () => this.net.challenge(p.id) }, 'DESAFIAR')
        : null)) : [h('li', { class: 'online-empty' }, 'Ninguém mais online agora. Chame um amigo com uma sala privada!')]));
  }

  #toDuel(match) {
    this.leavingToDuel = true;
    show($('lb-searching'), false);
    show($('lb-room-wait'), false);
    this.ui.modals.closeTop();
    this.game.go('duel', { match });
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    if (this.searchingSince) {
      const s = Math.floor((performance.now() - this.searchingSince) / 1000);
      $('lb-search-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
  }

  render(r) {
    this.scenery.drawBack(r);
    this.scenery.drawFront(r);
    r.rect(0, 0, GW, GH, '#0e0b16', 0.55);
  }

  onKey(e) {
    if (e.code === 'Escape') { this.game.go('menu'); return true; }
    return false;
  }
}
