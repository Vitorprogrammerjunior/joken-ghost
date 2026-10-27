// Arena dos Caçadores: perfil, filas (ranqueada, casual, 2x2, chefe), torneio, Rei da Arena,
// salas privadas, desafios, espectadores, deck, missões e loja.
import { Scene } from '../core/Scene.js';
import { GW, GH } from '../core/Renderer.js';
import { Scenery } from '../world/Scenery.js';
import { $, h, icon, show } from '../ui/dom.js';
import { DeckModal } from '../ui/DeckModal.js';
import { ArenaShop } from '../ui/ArenaShop.js';
import { AvatarModal } from '../ui/AvatarModal.js';
import { avatarEl } from '../ui/Avatar.js';
import { LEAGUE_NAMES, MODES, leagueIcon } from '../config/multiplayer.js';
import { selectCharacter } from '../config/characters.js';

const STATUS = {
  lobby: 'no lobby', queue: 'procurando', room: 'em sala', match: 'duelando',
  watching: 'assistindo', tournament: 'no torneio', king: 'na Arena do Rei',
};
/** Nome das fases pelo tamanho da chave (8 caçadores = quartas, semi e final). */
const ROUND_NAMES = { 8: ['QUARTAS', 'SEMIFINAL', 'FINAL'], 4: ['SEMIFINAL', 'FINAL'], 2: ['FINAL'] };
const DAY_MS = 24 * 3600 * 1000;
/** O que a fila de cada modo espera para começar. */
const SEARCH_NOTES = {
  ranked: 'Procurando alguém com troféus parecidos com os seus.',
  casual: 'A partida começa assim que outro caçador entrar na fila.',
  duo: 'A partida começa quando 4 caçadores estiverem na fila.',
  raid: 'A luta começa quando outro caçador entrar na fila.',
};

export class LobbyScene extends Scene {
  /** @param {import('../net/MultiplayerClient.js').MultiplayerClient} net */
  constructor(game, ui, net) {
    super(game, 'screen-lobby');
    this.ui = ui;
    this.net = net;
    this.deck = new DeckModal(game, ui.modals, net);
    this.avatar = new AvatarModal(game, ui.modals, net);
    this.shop = new ArenaShop(game, ui.modals, net, {
      queue: (mode) => this.#queue(mode),
      tournament: () => this.#ready() && net.tournamentJoin(),
      king: () => this.#ready() && net.kingJoin(),
    });

    $('lb-back').addEventListener('click', () => game.go('menu'));
    $('lb-quick').addEventListener('click', () => this.#queue('ranked'));
    $('lb-casual').addEventListener('click', () => this.#queue('casual'));
    $('lb-modes').addEventListener('click', () => this.#ready() && this.shop.openModes());
    $('lb-search-cancel').addEventListener('click', () => net.queueLeave());
    $('lb-room').addEventListener('click', () => this.#ready() && net.createRoom());
    $('lb-room-cancel').addEventListener('click', () => { net.leaveRoom(); show($('lb-room-wait'), false); });
    $('lb-room-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.#shareLink()).then(() => ui.toasts.show('Link copiado! Mande para um amigo.', { force: true }));
    });
    $('lb-join').addEventListener('click', () => this.#join());
    $('lb-code').addEventListener('keydown', (e) => { if (e.code === 'Enter') this.#join(); });
    $('lb-chars').addEventListener('click', () => this.#ready() && ui.arena.openCharacters());
    $('lb-cards').addEventListener('click', () => this.#ready() && this.deck.open());
    $('lb-rank').addEventListener('click', () => this.#ready() && ui.arena.openRanking());
    $('lb-missions').addEventListener('click', () => this.#ready() && this.shop.openMissions());
    $('lb-shop').addEventListener('click', () => this.#ready() && this.shop.openShop());
    $('lp-name').addEventListener('click', () => this.#ready() && ui.arena.openProfile());
    $('lb-avatar-btn').addEventListener('click', () => this.#ready() && this.avatar.open());
    $('tour-leave').addEventListener('click', () => { net.tournamentLeave(); show($('lb-tournament'), false); });
    $('king-leave').addEventListener('click', () => { net.kingLeave(); show($('lb-king'), false); });

    const here = () => game.scene === this;
    net.on('welcome', () => here() && this.#onWelcome());
    net.on('profile', () => here() && this.#renderProfile());
    net.on('lobby', () => here() && this.#renderOnline());
    net.on('queue_state', (d) => here() && this.#searching(d));
    net.on('tournament_state', () => { this.tourAt = performance.now(); if (here()) this.#renderTournament(); });
    net.on('king_state', () => here() && this.#renderKing());
    net.on('season_reward', (d) => ui.toasts.show(`Temporada encerrada! Liga ${LEAGUE_NAMES[d.league]}: +${d.ecto} Ecto${d.frame ? ' e uma moldura nova' : ''}.`, { force: true }));
    net.on('room_created', ({ code }) => { if (!here()) return; this.roomCode = code; $('lb-room-code').textContent = code; show($('lb-room-wait'), true); });
    net.on('challenge_sent', (d) => here() && this.#status(`Desafio enviado para ${d.nickname}...`));
    net.on('challenge_declined', (d) => here() && ui.toasts.show(`${d.nickname} ${d.reason === 'tempo' ? 'não respondeu' : 'recusou'} o desafio.`, { force: true }));
    net.on('match_start', (d) => here() && this.#toMatch(d));
    net.on('match_resume', (d) => here() && this.#toMatch(d));
    net.on('error_msg', (d) => { if (here()) { this.#status(d.message); ui.toasts.show(d.message, { force: true }); } });
    net.on('disconnected', () => here() && this.#status('Conexão perdida. Tentando reconectar...'));
    net.on('waking', ({ seconds }) => here() && !net.connected && this.#status(`Acordando o servidor... ${seconds}s (pode levar até 1 minuto na primeira vez)`));
    game.bus.on('arena-reconnect', () => here() && this.#connect());
  }

  /** @param {{ room?: string, autoQueue?: string|false }} params  autoQueue: modo para entrar na fila ao chegar */
  music() { return 'lobby'; }

  enter({ room, autoQueue = false } = {}) {
    this.scenery ??= new Scenery(this.game.assets, 'mansao');
    this.pendingRoom = room ?? null;
    this.autoQueue = autoQueue;
    this.searchingSince = 0;
    show($('lb-searching'), false);
    show($('lb-room-wait'), false);
    if (this.net.connected) this.#onWelcome();
    else this.#connect();
  }

  exit() {
    // indo para uma partida, a fila/torneio/arena continuam; voltando ao menu, sai de tudo
    if (this.net.connected && !this.leavingToMatch) {
      this.net.queueLeave();
      this.net.leaveRoom();
      if (this.net.tournament?.status === 'waiting') this.net.tournamentLeave();
      if (this.net.king) this.net.kingLeave();
    }
    this.leavingToMatch = false;
  }

  async #connect() {
    this.#status('Conectando ao servidor...');
    try {
      await this.net.connect(this.net.nickname);
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

  #queue(mode) {
    if (this.#ready()) this.net.queueJoin(mode);
  }

  #onWelcome() {
    this.#status('Conectado! Escolha como quer jogar.');
    this.#renderProfile();
    this.#renderOnline();
    this.#renderTournament();
    this.#renderKing();
    if (this.pendingRoom) { this.net.joinRoom(this.pendingRoom); this.pendingRoom = null; }
    else if (this.autoQueue) { this.net.queueJoin(this.autoQueue); this.autoQueue = false; }
  }

  #status(text) { $('lb-status').textContent = text; }

  #shareLink() { return `${location.origin}${location.pathname}?room=${encodeURIComponent(this.roomCode ?? '')}`; }

  #join() {
    if (!this.#ready()) return;
    const code = $('lb-code').value.toUpperCase().trim();
    if (code.length < 4) { this.#status('Digite o código da sala.'); this.game.audio.play('error'); return; }
    this.net.joinRoom(code);
  }

  #searching({ searching, mode }) {
    this.searchingSince = searching ? performance.now() : 0;
    show($('lb-searching'), searching);
    if (!searching) return;
    $('lb-search-title').textContent = `PROCURANDO: ${MODES[mode]?.name.toUpperCase() ?? 'PARTIDA'}`;
    $('lb-search-note').textContent = SEARCH_NOTES[mode] ?? '';
  }

  // ─── perfil ───────────────────────────────────────────────────
  #renderProfile() {
    const p = this.net.profile;
    if (!p) return;
    selectCharacter(this.game.storage, p.character);
    $('lp-nick').textContent = p.nickname;
    $('lp-trophies').textContent = p.trophies;
    $('lp-league-ico').src = icon(leagueIcon(p.league)).src;
    $('lp-league').textContent = `Liga ${LEAGUE_NAMES[p.league]}`;
    $('lp-record').textContent = `${p.wins} vitórias · ${p.losses} derrotas`;
    $('lp-ecto').textContent = p.ecto;
    $('lp-cups').textContent = p.cups;
    const days = Math.max(0, Math.ceil((p.season.endsAt - Date.now()) / DAY_MS));
    $('lp-season').textContent = `${p.season.name} · acaba em ${days} dia${days === 1 ? '' : 's'}`;
    $('lb-avatar').replaceChildren(avatarEl(this.game.assets, { avatar: p.avatar, frame: p.equipped.frame }, { size: 152 }));
    const claimable = p.missions.filter(m => m.progress >= m.n && !m.claimed).length;
    $('lb-missions-badge').textContent = claimable;
    show($('lb-missions-badge'), claimable > 0);
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
      avatarEl(this.game.assets, p, { size: 48 }),
      h('span', { class: 'on-info' }, h('b', {}, p.nickname), h('small', {}, icon(leagueIcon(p.league), 'ico ico-xs'), ` ${p.trophies} · ${STATUS[p.status] ?? ''}`)),
      this.#onlineAction(p))) : [h('li', { class: 'online-empty' }, 'Ninguém mais online agora. Chame um amigo com uma sala privada!')]));
    if (this.net.king) this.#renderKing();
  }

  #onlineAction(p) {
    if (p.status === 'lobby') return h('button', { class: 'btn btn-sm', onclick: () => this.net.challenge(p.id) }, 'DESAFIAR');
    if (p.status === 'match') return h('button', { class: 'btn btn-sm', title: 'Assistir a partida', onclick: () => this.net.spectate(p.id) }, icon('icon/assistir', 'ico ico-xs'), 'VER');
    return null;
  }

  // ─── torneio ──────────────────────────────────────────────────
  #renderTournament() {
    const t = this.net.tournament;
    const mine = !!t && t.entrants.some(e => e.id === this.net.profile?.id);
    show($('lb-tournament'), mine);
    if (!mine) return;
    const name = (id) => t.entrants.find(e => e.id === id)?.nickname ?? '?';
    const champion = t.rounds.at(-1)?.[0]?.winner;
    $('tour-status').textContent = t.status === 'waiting' ? this.#tourWaitText()
      : t.status === 'done' ? `Campeão: ${name(champion)}!` : 'Em andamento: espere a sua vez.';
    $('tour-leave').textContent = t.status === 'waiting' ? 'SAIR' : 'FECHAR';
    const names = ROUND_NAMES[t.size] ?? [];
    $('tour-bracket').replaceChildren(...(t.rounds.length ? t.rounds.map((round, k) => h('div', { class: 'bracket-col' },
      h('b', { class: 'bracket-title' }, names[k] ?? `FASE ${k + 1}`),
      ...round.map(m => h('div', { class: 'bracket-match' }, ...[m.a, m.b].map(id => (id == null
        ? h('span', { class: 'bracket-name bye' }, 'passa direto')
        : h('span', {
          class: `bracket-name${m.winner === id ? ' won' : m.winner ? ' lost' : ''}${id === this.net.profile.id ? ' me' : ''}`,
        }, name(id))))))))
      : t.entrants.map(e => h('span', { class: `bracket-name${e.id === this.net.profile.id ? ' me' : ''}` }, e.nickname))));
  }

  #tourWaitText() {
    const t = this.net.tournament;
    const left = Math.max(0, t.startsIn - (performance.now() - (this.tourAt ?? 0)));
    const missing = t.min - t.entrants.length;
    if (missing > 0) return `Inscritos: ${t.entrants.length}/${t.size}. Faltam ${missing} caçador${missing === 1 ? '' : 'es'} para começar.`;
    return `Inscritos: ${t.entrants.length}/${t.size}. Começa em ${Math.ceil(left / 1000)}s (ou na hora, com ${t.size}).`;
  }

  // ─── Rei da Arena ─────────────────────────────────────────────
  #renderKing() {
    const k = this.net.king;
    show($('lb-king'), !!k);
    if (!k) return;
    const me = this.net.profile?.id;
    $('king-throne').replaceChildren(...(k.king ? [
      avatarEl(this.game.assets, k.king, { size: 96 }),
      h('div', {}, h('b', {}, k.king.nickname), h('p', {}, `${k.king.streak} vitória${k.king.streak === 1 ? '' : 's'} seguida${k.king.streak === 1 ? '' : 's'}`)),
    ] : [h('p', {}, 'O trono está vazio...')]));
    const pos = k.line.findIndex(p => p.id === me);
    $('king-status').textContent = k.king?.id === me ? 'Você é o rei! Defenda o trono.'
      : k.matchId ? 'Duelo em andamento.' : pos >= 0 ? `Você é o ${pos + 1}º da fila.` : '';
    $('king-line').replaceChildren(...k.line.map(p => h('li', { class: p.id === me ? 'me' : '' }, p.nickname)));
  }

  // ─── partida ──────────────────────────────────────────────────
  #toMatch(match) {
    this.leavingToMatch = true;
    show($('lb-searching'), false);
    show($('lb-room-wait'), false);
    this.ui.modals.closeTop();
    this.game.go(match.kind === 'raid' ? 'raid' : 'duel', { match });
  }

  update(dt) {
    super.update(dt);
    this.scenery.update(dt);
    if (this.net.tournament?.status === 'waiting') $('tour-status').textContent = this.#tourWaitText();
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
