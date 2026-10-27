// Janelas da arena multiplayer: caçadores, ranking, desafio recebido e perfil.
// (O deck fica em DeckModal.js; modos, missões e loja em ArenaShop.js.)
import { $, h, icon } from './dom.js';
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
    $('profile-save').addEventListener('click', () => {
      net.setNickname($('profile-nick').value);
      net.rememberNickname($('profile-nick').value);
      modals.close('modal-profile');
    });
    $('profile-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText($('profile-code').value).then(() => this.#toast('Código copiado. Guarde em segredo!'));
    });
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
    $('profile-code').value = this.net.accountCode;
    this.modals.open('modal-profile');
  }
}
