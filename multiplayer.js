/* ═══════════════════════════════════════════════════════════════════
   JokenGhost — Multiplayer PvP (Fase 1)
   Caçador vs Monstro | Salas | Perks | Melhor de 3
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const MP_STATE = {
  OFF: 0, LOBBY: 1, WAITING: 2, BATTLE: 3, RESULT: 4,
};

const MP_ATTACKS = {
  hunter: {
    pedra:   { name: 'Estaca',     key: '1' },
    papel:   { name: 'Aspirador',  key: '2' },
    tesoura: { name: 'Cruz',       key: '3' },
  },
  monster: {
    pedra:   { name: 'Possessao',    key: '1' },
    papel:   { name: 'Assombracao',  key: '2' },
    tesoura: { name: 'Maldicao',     key: '3' },
  },
};

class MultiplayerClient {
  constructor() {
    this.state = MP_STATE.OFF;
    this.socket = null;
    this.role = null;
    this.roomCode = null;
    this.nickname = localStorage.getItem('jokenghost_mp_nick') || '';
    this.round = 0;
    this.scores = { hunter: 0, monster: 0 };
    this.roundsToWin = 3;
    this.phase = null;
    this.offeredPerks = [];
    this.myPerk = null;
    this.myAttack = null;
    this.opponentLocked = false;
    this.phaseTimer = null;
    this.phaseEndsAt = 0;
    this.lastResult = null;
    this.renderLoop = null;

    this._cacheDom();
    this._bindUi();
    this._checkUrlRoom();
  }

  _cacheDom() {
    const id = (x) => document.getElementById(x);
    this.$menu           = id('screen-menu');
    this.$mpLobby        = id('screen-mp-lobby');
    this.$mpWaiting      = id('screen-mp-waiting');
    this.$mpBattle       = id('screen-mp-battle');
    this.$mpResult       = id('screen-mp-result');
    this.$mpNickname     = id('mp-nickname');
    this.$mpJoinCode     = id('mp-join-code');
    this.$mpWaitingCode  = id('mp-waiting-code');
    this.$mpWaitingMsg   = id('mp-waiting-msg');
    this.$mpRoleBadge    = id('mp-role-badge');
    this.$mpRoundLabel   = id('mp-round-label');
    this.$mpScoreHunter  = id('mp-score-hunter');
    this.$mpScoreMonster = id('mp-score-monster');
    this.$mpPhaseTitle   = id('mp-phase-title');
    this.$mpTimer        = id('mp-timer');
    this.$mpPerks        = id('mp-perks-grid');
    this.$mpAttacks      = id('mp-attacks-grid');
    this.$mpReveal       = id('mp-reveal-box');
    this.$mpRevealText   = id('mp-reveal-text');
    this.$mpStatus       = id('mp-status-msg');
    this.$mpResultTitle  = id('mp-result-title');
    this.$mpResultDetail = id('mp-result-detail');
    this.$mpConnStatus   = id('mp-conn-status');
    this.$mpShareLink    = id('mp-share-link');
    this.canvas          = id('gameCanvas');
    this.ctx             = this.canvas?.getContext('2d');
  }

  _bindUi() {
    document.getElementById('btn-multiplayer')?.addEventListener('click', () => this.enterLobby());
    document.getElementById('btn-mp-back-menu')?.addEventListener('click', () => this.exitToMenu());
    document.getElementById('btn-mp-create')?.addEventListener('click', () => this.createRoom());
    document.getElementById('btn-mp-join')?.addEventListener('click', () => this.joinRoom());
    document.getElementById('btn-mp-cancel-wait')?.addEventListener('click', () => this.leaveAndMenu());
    document.getElementById('btn-mp-result-menu')?.addEventListener('click', () => this.leaveAndMenu());
    document.getElementById('btn-mp-result-rematch')?.addEventListener('click', () => {
      this.socket?.emit('leave_room');
      this.createRoom();
    });

    document.addEventListener('keydown', (e) => this._onKey(e));
  }

  _checkUrlRoom() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setTimeout(() => {
        this.enterLobby();
        if (this.$mpJoinCode) this.$mpJoinCode.value = room.toUpperCase();
      }, 500);
    }
  }

  _serverUrl() {
    return window.JOKENGHOST_MP_CONFIG?.serverUrl || 'http://localhost:3001';
  }

  _connect() {
    if (this.socket?.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (typeof io === 'undefined') {
        reject(new Error('Socket.io nao carregado'));
        return;
      }

      this._setConnStatus('Conectando...');
      this.socket = io(this._serverUrl(), {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        this._setConnStatus('Conectado');
        this._bindSocket();
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        this._setConnStatus('Erro de conexao');
        reject(err);
      });
    });
  }

  _bindSocket() {
    const s = this.socket;
    if (s._mpBound) return;
    s._mpBound = true;

    s.on('room_created', (data) => this._onRoomCreated(data));
    s.on('room_joined', (data) => this._onRoomJoined(data));
    s.on('player_joined', (data) => this._onPlayerJoined(data));
    s.on('match_start', (data) => this._onMatchStart(data));
    s.on('perk_phase', (data) => this._onPerkPhase(data));
    s.on('attack_phase', (data) => this._onAttackPhase(data));
    s.on('perk_confirmed', () => this._onPerkConfirmed());
    s.on('opponent_perk_locked', () => this._setStatus('Oponente escolheu perk...'));
    s.on('attack_confirmed', () => this._onAttackConfirmed());
    s.on('opponent_attack_locked', () => {
      this.opponentLocked = true;
      this._setStatus('Oponente ja escolheu ataque!');
    });
    s.on('round_result', (data) => this._onRoundResult(data));
    s.on('match_end', (data) => this._onMatchEnd(data));
    s.on('player_left', (data) => this._onPlayerLeft(data));
    s.on('error_msg', (data) => this._toast(data.message || 'Erro'));
  }

  enterLobby() {
    this.state = MP_STATE.LOBBY;
    this._hideAllScreens();
    this.$mpLobby?.classList.remove('hidden');
    if (this.$mpNickname) this.$mpNickname.value = this.nickname;
    this._setConnStatus('Pronto');
    window._game?.bgm?.play?.().catch(() => {});
  }

  async createRoom() {
    const nick = this._readNickname();
    try {
      await this._connect();
      this.socket.emit('create_room', { nickname: nick });
    } catch {
      this._toast('Nao foi possivel conectar ao servidor. Verifique multiplayer-config.js');
    }
  }

  async joinRoom() {
    const nick = this._readNickname();
    let code = (this.$mpJoinCode?.value || '').toUpperCase().trim();
    if (code && !code.startsWith('JGH-') && code.length === 4) code = `JGH-${code}`;
    if (!code) { this._toast('Digite o codigo da sala'); return; }
    try {
      await this._connect();
      this.socket.emit('join_room', { code, nickname: nick });
    } catch {
      this._toast('Nao foi possivel conectar ao servidor.');
    }
  }

  _readNickname() {
    const nick = (this.$mpNickname?.value || 'Jogador').trim().slice(0, 16) || 'Jogador';
    this.nickname = nick;
    localStorage.setItem('jokenghost_mp_nick', nick);
    return nick;
  }

  _onRoomCreated(data) {
    this.role = data.role;
    this.roomCode = data.code;
    this._showWaiting(data.code, 'Aguardando oponente entrar na sala...');
  }

  _onRoomJoined(data) {
    this.role = data.role;
    this.roomCode = data.code;
    this._showWaiting(data.code, 'Conectado! Iniciando partida...');
  }

  _onPlayerJoined() {
    if (this.$mpWaitingMsg) this.$mpWaitingMsg.textContent = 'Oponente entrou! Preparando...';
  }

  _onMatchStart(data) {
    this.scores = data.scores || data.room?.scores || { hunter: 0, monster: 0 };
    this.roundsToWin = data.roundsToWin || 3;
    this._startBattle();
  }

  _startBattle() {
    this.state = MP_STATE.BATTLE;
    this._hideAllScreens();
    this.$mpBattle?.classList.remove('hidden');
    this._updateRoleBadge();
    this._updateScores();
    this._startRenderLoop();
  }

  _onPerkPhase(data) {
    this.phase = 'perk';
    this.round = data.round;
    this.offeredPerks = data.perks || [];
    this.myPerk = null;
    this.myAttack = null;
    this.opponentLocked = false;

    if (this.$mpRoundLabel) this.$mpRoundLabel.textContent = `Rodada ${data.round}`;
    if (this.$mpPhaseTitle) this.$mpPhaseTitle.textContent = 'ESCOLHA SEU PERK';
    if (this.$mpPerks) {
      this.$mpPerks.classList.remove('hidden');
      this.$mpPerks.innerHTML = '';
      for (const perk of this.offeredPerks) {
        const btn = document.createElement('button');
        btn.className = 'mp-perk-btn';
        btn.innerHTML = `<span class="mp-perk-name">${perk.name}</span><span class="mp-perk-desc">${perk.desc}</span>`;
        btn.addEventListener('click', () => this._pickPerk(perk.id, btn));
        this.$mpPerks.appendChild(btn);
      }
    }
    if (this.$mpAttacks) this.$mpAttacks.classList.add('hidden');
    if (this.$mpReveal) this.$mpReveal.classList.add('hidden');
    this._startPhaseTimer(data.timerMs || 12000);
    this._setStatus('Escolha um perk antes do tempo acabar');
  }

  _pickPerk(perkId, btn) {
    if (this.phase !== 'perk' || this.myPerk) return;
    this.myPerk = perkId;
    this.socket?.emit('pick_perk', { perkId });
    this.$mpPerks?.querySelectorAll('.mp-perk-btn').forEach(b => b.disabled = true);
    if (btn) btn.classList.add('selected');
    this._setStatus('Perk escolhido! Aguardando oponente...');
  }

  _onPerkConfirmed() {
    this._setStatus('Perk confirmado. Aguardando fase de ataque...');
  }

  _onAttackPhase(data) {
    this.phase = 'attack';
    this.myAttack = null;
    this.opponentLocked = false;

    if (this.$mpPhaseTitle) this.$mpPhaseTitle.textContent = 'ESCOLHA SEU ATAQUE';
    if (this.$mpPerks) this.$mpPerks.classList.add('hidden');
    if (this.$mpAttacks) {
      this.$mpAttacks.classList.remove('hidden');
      this.$mpAttacks.innerHTML = '';
      const attacks = MP_ATTACKS[this.role] || MP_ATTACKS.hunter;
      for (const [choice, info] of Object.entries(attacks)) {
        const btn = document.createElement('button');
        btn.className = 'mp-attack-btn';
        btn.innerHTML = `<span class="mp-attack-name">${info.name}</span><span class="mp-attack-key">[${info.key}]</span>`;
        btn.addEventListener('click', () => this._pickAttack(choice, btn));
        this.$mpAttacks.appendChild(btn);
      }
    }
    if (this.$mpReveal) this.$mpReveal.classList.add('hidden');
    this._startPhaseTimer(data.timerMs || 8000);
    this._setStatus('Escolha pedra, papel ou tesoura!');
  }

  _pickAttack(choice, btn) {
    if (this.phase !== 'attack' || this.myAttack) return;
    this.myAttack = choice;
    this.socket?.emit('pick_attack', { choice });
    this.$mpAttacks?.querySelectorAll('.mp-attack-btn').forEach(b => b.disabled = true);
    if (btn) btn.classList.add('selected');
    this._setStatus('Ataque enviado! Aguardando revelacao...');
    window._game?.sfxHit?.play?.().catch(() => {});
  }

  _onAttackConfirmed() {}

  _onRoundResult(data) {
    this.phase = 'reveal';
    this.lastResult = data.result;
    this.scores = data.scores;
    this._updateScores();
    this._stopPhaseTimer();

    if (this.$mpPerks) this.$mpPerks.classList.add('hidden');
    if (this.$mpAttacks) this.$mpAttacks.classList.add('hidden');
    if (this.$mpReveal) this.$mpReveal.classList.remove('hidden');

    const r = data.result;
    const myRole = this.role;
    const iWon = (r.outcome === myRole);
    const isDraw = r.outcome === 'draw';

    let headline = isDraw ? 'EMPATE!' : (iWon ? 'VOCE VENCEU A RODADA!' : 'VOCE PERDEU A RODADA!');
    const myLabel = myRole === 'hunter' ? r.labels.hunter : r.labels.monster;
    const oppLabel = myRole === 'hunter' ? r.labels.monster : r.labels.hunter;
    const myAtk = myRole === 'hunter' ? r.hunterAttack : r.monsterAttack;
    const oppAtk = myRole === 'hunter' ? r.monsterAttack : r.hunterAttack;

    const detail = [
      `Voce: ${myLabel} (${myAtk})`,
      `Oponente: ${oppLabel} (${oppAtk})`,
      `Placar: Cacador ${data.scores.hunter} x ${data.scores.monster} Monstro`,
    ].join('\n');

    if (this.$mpRevealText) {
      this.$mpRevealText.innerHTML = `<strong>${headline}</strong><br><span class="mp-reveal-detail">${detail.replace(/\n/g, '<br>')}</span>`;
    }
    this._setStatus(headline);
    window._game?.sfxHit?.play?.().catch(() => {});
  }

  _onMatchEnd(data) {
    this.state = MP_STATE.RESULT;
    this._stopPhaseTimer();
    this._stopRenderLoop();

    this._hideAllScreens();
    this.$mpResult?.classList.remove('hidden');

    const iWon = data.winner === this.role;
    const reason = data.reason === 'opponent_left' ? ' (oponente saiu)' : '';

    if (this.$mpResultTitle) {
      this.$mpResultTitle.textContent = iWon ? 'VITORIA!' : 'DERROTA!';
      this.$mpResultTitle.className = iWon ? 'mp-result-win' : 'mp-result-lose';
    }
    if (this.$mpResultDetail) {
      this.$mpResultDetail.textContent =
        `${data.winnerNickname || '???'} venceu${reason}. Placar: Cacador ${data.scores.hunter} — Monstro ${data.scores.monster}`;
    }
  }

  _onPlayerLeft(data) {
    if (this.state === MP_STATE.WAITING) {
      this._toast(`${data.nickname || 'Jogador'} saiu da sala`);
    }
  }

  _showWaiting(code, msg) {
    this.state = MP_STATE.WAITING;
    this._hideAllScreens();
    this.$mpWaiting?.classList.remove('hidden');
    if (this.$mpWaitingCode) this.$mpWaitingCode.textContent = code;
    if (this.$mpWaitingMsg) this.$mpWaitingMsg.textContent = msg;
    if (this.$mpShareLink) {
      const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
      this.$mpShareLink.textContent = url;
    }
    this._updateRoleBadge();
  }

  _updateRoleBadge() {
    if (!this.$mpRoleBadge) return;
    const isHunter = this.role === 'hunter';
    this.$mpRoleBadge.textContent = isHunter ? 'CACADOR' : 'MONSTRO';
    this.$mpRoleBadge.className = `mp-role-badge ${isHunter ? 'role-hunter' : 'role-monster'}`;
  }

  _updateScores() {
    if (this.$mpScoreHunter) this.$mpScoreHunter.textContent = this.scores.hunter ?? 0;
    if (this.$mpScoreMonster) this.$mpScoreMonster.textContent = this.scores.monster ?? 0;
  }

  _startPhaseTimer(ms) {
    this._stopPhaseTimer();
    this.phaseEndsAt = Date.now() + ms;
    const tick = () => {
      const left = Math.max(0, this.phaseEndsAt - Date.now());
      if (this.$mpTimer) this.$mpTimer.textContent = `${Math.ceil(left / 1000)}s`;
      if (left > 0) this.phaseTimer = requestAnimationFrame(tick);
    };
    this.phaseTimer = requestAnimationFrame(tick);
  }

  _stopPhaseTimer() {
    if (this.phaseTimer) cancelAnimationFrame(this.phaseTimer);
    this.phaseTimer = null;
    if (this.$mpTimer) this.$mpTimer.textContent = '';
  }

  leaveAndMenu() {
    this.socket?.emit('leave_room');
    this.exitToMenu();
  }

  exitToMenu() {
    this.state = MP_STATE.OFF;
    this.role = null;
    this.roomCode = null;
    this.phase = null;
    this._stopPhaseTimer();
    this._stopRenderLoop();
    this._hideAllScreens();
    this.$menu?.classList.remove('hidden');
    this.$menu?.classList.add('active');
    window._game?.state !== undefined && (window._game.state = 0);
  }

  _hideAllScreens() {
    const screens = [
      'screen-menu', 'screen-mp-lobby', 'screen-mp-waiting',
      'screen-mp-battle', 'screen-mp-result',
      'screen-level-select', 'screen-intro', 'screen-dialogue',
      'screen-transition', 'screen-result',
    ];
    for (const id of screens) {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.classList.remove('active'); }
    }
    document.getElementById('hud')?.classList.add('hidden');
  }

  _setStatus(msg) {
    if (this.$mpStatus) this.$mpStatus.textContent = msg;
  }

  _setConnStatus(msg) {
    if (this.$mpConnStatus) this.$mpConnStatus.textContent = msg;
  }

  _toast(msg) {
    if (window._game?.toast) window._game.toast.show(msg, 3500);
    else alert(msg);
  }

  _onKey(e) {
    if (this.state !== MP_STATE.BATTLE || this.phase !== 'attack' || this.myAttack) return;
    const map = { Digit1: 'pedra', Digit2: 'papel', Digit3: 'tesoura', Numpad1: 'pedra', Numpad2: 'papel', Numpad3: 'tesoura' };
    if (map[e.code]) {
      e.preventDefault();
      const btn = this.$mpAttacks?.querySelectorAll('.mp-attack-btn')[['pedra','papel','tesoura'].indexOf(map[e.code])];
      this._pickAttack(map[e.code], btn);
    }
    if (e.code === 'Escape' && this.state === MP_STATE.LOBBY) this.exitToMenu();
  }

  // ─── Canvas placeholder battle view ───────────────────────
  _startRenderLoop() {
    this._stopRenderLoop();
    const loop = () => {
      if (this.state === MP_STATE.BATTLE) {
        this._renderBattle();
        this.renderLoop = requestAnimationFrame(loop);
      }
    };
    this.renderLoop = requestAnimationFrame(loop);
  }

  _stopRenderLoop() {
    if (this.renderLoop) cancelAnimationFrame(this.renderLoop);
    this.renderLoop = null;
  }

  _renderBattle() {
    const ctx = this.ctx;
    if (!ctx) return;
    const GW = 1280, GH = 720;

    ctx.clearRect(0, 0, GW, GH);

    const bg = window._game?.assets?.get('battleBg');
    if (bg) ctx.drawImage(bg, 0, 0, GW, GH);
    else {
      ctx.fillStyle = '#0f1a0f';
      ctx.fillRect(0, 0, GW, GH);
      ctx.fillStyle = '#1a2e1a';
      for (let i = 0; i < 20; i++) ctx.fillRect(i * 70, GH - 120 - (i % 3) * 20, 40, 120);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, GW, GH);

    const playerSprite = window._game?.assets?.get('player');
    const ghostSprite  = window._game?.assets?.get('ghost');
    const t = Date.now() / 200;

    // Hunter (left)
    const hx = 120, hy = GH - 280, hw = 140, hh = 180;
    if (playerSprite) {
      window._game.playerAnim?.draw(ctx, Math.floor(t) % 4, hx, hy, hw, hh, false);
    } else {
      ctx.fillStyle = '#3a7bd5';
      ctx.fillRect(hx, hy, hw, hh);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText('CACADOR', hx + 20, hy + hh / 2);
    }

    // Monster (right)
    const mx = GW - 260, my = GH - 300, mw = 150, mh = 200;
    if (ghostSprite) {
      window._game.ghostAnim?.draw(ctx, Math.floor(t) % 4, mx, my, mw, mh, true);
    } else {
      ctx.fillStyle = '#5eea8a';
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = '#0a0f0a';
      ctx.font = '12px monospace';
      ctx.fillText('MONSTRO', mx + 24, my + mh / 2);
    }

    // Labels under characters
    ctx.fillStyle = '#f5c842';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.role === 'hunter' ? 'VOCE' : 'OPONENTE', hx + hw / 2, hy + hh + 24);
    ctx.fillText(this.role === 'monster' ? 'VOCE' : 'OPONENTE', mx + mw / 2, my + mh + 24);
    ctx.textAlign = 'left';

    // VS
    ctx.fillStyle = 'rgba(245,200,66,0.9)';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VS', GW / 2, GH / 2 + 20);
    ctx.textAlign = 'left';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window._mp = new MultiplayerClient();
});
