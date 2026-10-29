// Janelas da arena multiplayer: caçadores, ranking, desafio recebido e perfil.
// (O deck fica em DeckModal.js; modos, missões e loja em ArenaShop.js.)
import { $, h, icon, show } from './dom.js';
import { spriteCanvas } from './SpriteCanvas.js';
import { avatarEl } from './Avatar.js';
import { LEAGUE_NAMES, leagueIcon } from '../config/multiplayer.js';
import { selectCharacter } from '../config/characters.js';

export class ArenaModals {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;

    net.on('ranking', (d) => this.#renderRanking(d));
    net.on('profile', () => { if (modals.isOpen('modal-chars')) this.#renderChars(); });
    net.on('challenge_received', (d) => this.#challenge(d));

    $('challenge-yes').addEventListener('click', () => this.#answer(true));
    $('challenge-no').addEventListener('click', () => this.#answer(false));
    // o servidor confere se o nome é livre: a janela só fecha quando ele aceita
    $('profile-save').addEventListener('click', () => {
      const nick = $('profile-nick').value.trim();
      if (!nick || nick === net.profile?.nickname) { modals.close('modal-profile'); return; }
      this.nickPending = nick;
      show($('profile-nick-error'), false);
      net.setNickname(nick);
    });
    $('profile-nick').addEventListener('input', () => show($('profile-nick-error'), false));
    net.on('profile', (p) => {
      if (!this.nickPending || p.nickname.toLowerCase() !== this.nickPending.toLowerCase()) return;
      this.nickPending = null;
      net.rememberNickname(p.nickname);
      modals.close('modal-profile');
      this.#toast(`Agora você é ${p.nickname}!`);
    });
    net.on('error_msg', (e) => {
      if (e.field !== 'nickname' || !this.nickPending) return;
      this.nickPending = null;
      $('profile-nick-error').textContent = e.message;
      show($('profile-nick-error'), true);
    });
    $('profile-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText($('profile-code').value).then(() => this.#toast('Código copiado. Guarde em segredo!'));
    });
    $('profile-account').addEventListener('click', () => game.bus.emit('open-account'));
    $('profile-use').addEventListener('click', () => {
      const code = $('profile-code').value.trim();
      if (code.length < 20 || code === net.accountCode) return;
      net.useAccountCode(code);
      modals.close('modal-profile');
      game.bus.emit('arena-reconnect');
    });
  }

  #toast(text) { this.game.bus.emit('toast', text); }

  // ─── caçadores ────────────────────────────────────────────────
  openCharacters() {
    this.#renderChars();
    this.modals.open('modal-chars');
  }

  #renderChars() {
    const p = this.net.profile;
    $('chars-grid').replaceChildren(...this.net.catalog.characters.map((c) => {
      const owned = p.unlocked.characters.includes(c.id);
      const current = p.character === c.id;
      return h('div', { class: `char-tile${owned ? '' : ' locked'}${current ? ' current' : ''}` },
        spriteCanvas(this.game.assets, `char/${c.id}/side/idle`, { size: 96, dim: !owned }),
        h('b', {}, owned ? c.name : '???'),
        h('p', { class: 'char-passive' }, owned ? c.passive : `Desbloqueie com ${c.trophies} troféus.`),
        owned
          ? h('button', {
            class: `btn btn-sm ${current ? '' : 'btn-primary'}`,
            disabled: current,
            onclick: () => { this.net.selectCharacter(c.id); selectCharacter(this.game.storage, c.id); },
          }, current ? 'EM USO' : 'ESCOLHER')
          : h('span', { class: 'char-need' }, icon('icon/cadeado', 'ico ico-sm'), ` ${c.trophies} `, icon('icon/trofeu', 'ico ico-sm')));
    }));
  }

  // ─── ranking ──────────────────────────────────────────────────
  openRanking() {
    $('rank-list').replaceChildren(h('li', { class: 'rank-loading' }, 'Carregando...'));
    $('rank-me').textContent = '';
    this.net.requestRanking();
    this.modals.open('modal-ranking');
  }

  #renderRanking({ top, me, total }) {
    const myId = this.net.profile?.id;
    $('rank-me').textContent = `Sua posição: ${me.rank}º de ${total} · ${me.trophies} troféus`;
    $('rank-list').replaceChildren(...top.map(r => h('li', { class: `rank-row${r.id === myId ? ' me' : ''}${r.rank <= 3 ? ` top${r.rank}` : ''}` },
      h('span', { class: 'rank-pos' }, `${r.rank}º`),
      avatarEl(this.game.assets, r, { size: 48 }),
      h('span', { class: 'rank-nick' }, r.nickname),
      icon(leagueIcon(r.league), 'ico ico-sm', LEAGUE_NAMES[r.league]),
      h('span', { class: 'rank-tr' }, r.trophies, ' ', icon('icon/trofeu', 'ico ico-xs')),
      h('span', { class: 'rank-wins' }, `${r.wins}V`))));
  }

  // ─── desafio recebido ─────────────────────────────────────────
  #challenge({ from, expiresIn }) {
    this.pending = from;
    $('challenge-text').textContent = `${from.nickname} (${from.trophies} troféus) desafiou você para um duelo!`;
    const fill = $('challenge-fill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => { fill.style.transition = `width ${expiresIn}ms linear`; fill.style.width = '0%'; });
    clearTimeout(this.challengeT);
    this.challengeT = setTimeout(() => this.modals.close('modal-challenge'), expiresIn);
    this.game.audio.play('select');
    this.modals.open('modal-challenge');
  }

  #answer(accept) {
    if (!this.pending) return;
    this.net.answerChallenge(this.pending.id, accept);
    this.pending = null;
    this.modals.close('modal-challenge');
  }

  // ─── perfil ───────────────────────────────────────────────────
  openProfile() {
    $('profile-nick').value = this.net.profile?.nickname ?? '';
    this.nickPending = null;
    show($('profile-nick-error'), false);
    // com login, a conta entra pelo Google/Discord: o código (agora uma sessão deste aparelho) não aparece
    const logged = this.net.loggedIn;
    $('profile-code').value = logged ? '' : this.net.accountCode;
    $('profile-guest').classList.toggle('hidden', logged);
    $('profile-account-label').textContent = logged ? 'MINHA CONTA' : 'ENTRAR COM GOOGLE OU DISCORD';
    this.modals.open('modal-profile');
  }
}
