/* ═══════════════════════════════════════════════════════════════════
   JokenGhost — Caçada em Turnos  |  game.js
   Fiel ao original Python/Pygame — HTML5 Canvas + DOM overlay
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const GW = 1280, GH = 720;
const FPS = 60;

const STATE = { MENU: 0, INTRO: 1, TRANSITION: 2, DIALOGUE: 5, BATTLE: 3, RESULT: 4, LEVEL_SELECT: 6 };
const CHOICE = { PEDRA: 'pedra', PAPEL: 'papel', TESOURA: 'tesoura' };

// ═══════════════════════════════════════════════════════════════════
//  SAVE SYSTEM
// ═══════════════════════════════════════════════════════════════════
const SAVE_KEY  = (n) => `jokenghost_save_${n}`;
const NUM_SLOTS = 7;
const LEVEL_NAMES = { 1: 'Floresta Maldita', 2: 'Pátio da Mansão', 3: 'Interior', 4: 'Câmara Final' };

// ═══════════════════════════════════════════════════════════════════
//  OPTIONS SYSTEM
// ═══════════════════════════════════════════════════════════════════
const OPT_KEY = 'jokenghost_options';
const DEFAULT_OPTIONS = {
  bgmVol:       45,
  sfxVol:       100,
  shake:        true,
  floatingCoins: true,
  toasts:       true,
  scale:        'fit',
};
function loadOptions() {
  try { return Object.assign({}, DEFAULT_OPTIONS, JSON.parse(localStorage.getItem(OPT_KEY))); }
  catch { return { ...DEFAULT_OPTIONS }; }
}
function saveOptions(opts) {
  localStorage.setItem(OPT_KEY, JSON.stringify(opts));
}

function getSave(slot) {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY(slot))); } catch { return null; }
}
function setSave(slot, data) {
  localStorage.setItem(SAVE_KEY(slot), JSON.stringify(data));
}
function deleteSave(slot) {
  localStorage.removeItem(SAVE_KEY(slot));
}
function buildSaveData(slot, game) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return {
    slot,
    date: `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    level: game.currentLevel || 1,
    coins: game.economy.coins,
    bestiaryCount: Object.keys(game.bestiary.entries || {}).length,
  };
}

// Rock-paper-scissors: who beats whom
const WINS_AGAINST = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

const PLAYER_MAX_HP   = 100;
const PLAYER_DAMAGE   = 25;
const WEAKNESS_DAMAGE = 40;
const ENEMY_DAMAGE    = 20;

const REWARD_PEDRA  = 25; // aspirador vs fantasma
const REWARD_OTHER  = 15;
const REWARD_CLEAR  = 60; // per enemy on full clear

const SHOP_ITEMS = [
  { name: 'Pocao de Cura',  price: 30, effect: 'heal_small', desc: '+30 HP',          img: 'Assests/Sprites/itens/Frasco mágico com poção verde.png' },
  { name: 'Buff Ofensivo',  price: 50, effect: 'buff_attack', desc: '-15HP inimigo',   img: 'Assests/Sprites/itens/buff_potion.png'                 },
  { name: 'Pocao Grande',   price: 80, effect: 'heal_big',    desc: '+60 HP',          img: 'Assests/Sprites/itens/Frasco mágico com poção verde.png' },
];

const DIALOGUE_LINES = [
  "...Que floresta mais estranha.\nSinto calafrios só de caminhar por aqui.",
  "Espera — sinto uma presença!\nIsso é energia sobrenatural!",
  "São fantasmas. SÃO FANTASMAS!\nComo fui parar nessa maldita floresta?!",
  "Respira fundo... voce treinou pra isso.\nEstaca   Aspirador   Cruz",
  "Muito bem, seus malditos espíritos —\nquem vai ser o primeiro?!",
];

const INTRO_LINES = [
  '1ª Fase - A Mansão na Colina',
  '',
  'O caçador recebe uma carta misteriosa sobre',
  'estranhos acontecimentos em uma antiga mansão.',
  '',
  'Ele segue pela floresta à noite, armado com',
  'suas tres armas espirituais:',
  'Estaca, Aspirador e Cruz,',
  '',
  'determinado a investigar os relatos...'
];

const ENEMY_TYPES = [
  { name: 'GHOST', type: 'fantasma', minHP: 80,  maxHP: 80  },
  { name: 'GHOST', type: 'fantasma', minHP: 100, maxHP: 100 },
  { name: 'GHOST', type: 'fantasma', minHP: 120, maxHP: 120 },
];

const WEAKNESSES = {
  fantasma: ['Aspirador'],
};

const ATTACK_MAP = {
  pedra:   'Estaca',
  papel:   'Aspirador',
  tesoura: 'Cruz',
};

// ═══════════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════════
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t)   { return t * t * (3 - 2 * t); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ═══════════════════════════════════════════════════════════════════
//  ASSET MANAGER
// ═══════════════════════════════════════════════════════════════════
class AssetManager {
  constructor() { this.images = {}; }

  load(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(img); };
      img.onerror = () => { console.warn(`Asset missing: ${src}`); this.images[key] = null; resolve(null); };
      img.src = src;
    });
  }

  get(key) { return this.images[key] || null; }

  async loadAll() {
    const entries = [
      ['menuBg',      'Assests/Sprites/Scenes/menu_background.png'],
      ['battleBg',    'Assests/Sprites/Scenes/Caminho Encantado na Floresta.png'],
      ['card',        'Assests/Sprites/Scenes/card_inicial.png'],
      ['ghost',       'Assests/Sprites/Ghost/Sprite_fantasma.idle (1).png'],
      ['player',      'Assests/Sprites/personagem/personagem.idle.png'],
      ['monstruario', 'Assests/Sprites/molders/Monstruario.png'],
      ['hudBtn',      'Assests/Sprites/molders/hud_botao.png'],
      ['coinMolder',  'Assests/Sprites/molders/coin_molder.png'],
      ['aspirador',   'Assests/Sprites/Ballons/aspirador.png'],
      ['cruz',        'Assests/Sprites/Ballons/Cruz.png'],
      ['estaca',      'Assests/Sprites/Ballons/Estaca.png'],
      ['kastle',      'Assests/Sprites/Kastle/kastle_idle.png'],
      ['ballon',      'Assests/Sprites/Scenes/Ballon.png'],
    ];
    await Promise.all(entries.map(([k, s]) => this.load(k, s)));
  }
}

// ═══════════════════════════════════════════════════════════════════
//  SPRITE ANIMATOR — extracts frames from a sprite sheet
// ═══════════════════════════════════════════════════════════════════
class SpriteAnimator {
  constructor(img) {
    this.img = img;
    if (!img) { this.frames = 1; this.fw = 1; this.fh = 1; return; }

    const w = img.naturalWidth, h = img.naturalHeight;
    // Detect horizontal sprite sheet: width >= 2x height
    if (w >= h * 1.5) {
      this.fh = h;
      // Try common frame counts
      let detected = 1;
      for (const n of [12, 8, 6, 4, 3, 2]) {
        if (w % n === 0) { const fw = w / n; if (Math.abs(fw - h) < h * 0.3) { detected = n; break; } }
      }
      this.frames = detected;
      this.fw = w / detected;
    } else {
      // Single frame
      this.frames = 1;
      this.fw = w;
      this.fh = h;
    }
  }

  draw(ctx, frame, dx, dy, dw, dh, flipH = false) {
    if (!this.img) return;
    const f = frame % this.frames;
    const sx = f * this.fw, sy = 0;
    if (flipH) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(this.img, sx, sy, this.fw, this.fh, -(dx + dw), dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(this.img, sx, sy, this.fw, this.fh, dx, dy, dw, dh);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FLOATING COIN
// ═══════════════════════════════════════════════════════════════════
class FloatingCoin {
  constructor(value, x, y) {
    this.value = value; this.x = x; this.y0 = y; this.y = y;
    this.t = 0; this.duration = 2000; this.alive = true;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.duration) { this.alive = false; return; }
    const progress = this.t / this.duration;
    this.y = this.y0 - progress * 80;
  }
  draw(ctx) {
    const alpha = Math.max(0, 1 - this.t / this.duration);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "DogicaPixel", Courier';
    ctx.fillText(`+${this.value}`, this.x, this.y);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  SHAKE EFFECT
// ═══════════════════════════════════════════════════════════════════
class Shake {
  constructor() { this.active = false; this.intensity = 0; this.elapsed = 0; this.duration = 500; this.ox = 0; this.oy = 0; }
  start(intensity = 12) { this.active = true; this.intensity = intensity; this.elapsed = 0; }
  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.active = false; this.ox = 0; this.oy = 0; return; }
    const remaining = 1 - this.elapsed / this.duration;
    const mag = this.intensity * remaining;
    this.ox = (Math.random() * 2 - 1) * mag;
    this.oy = (Math.random() * 2 - 1) * mag * 0.5;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ENEMY MANAGER
// ═══════════════════════════════════════════════════════════════════
class EnemyManager {
  constructor(ghostAnim) {
    this.ghostAnim = ghostAnim;
    this.enemies   = [];

    // Depth positions: [x, y, w, h, zOrder(3=front)]
    this.depthSlots = [
      [700, GH - 400, 130, 150, 3], // front
      [600, GH - 340, 90,  110, 2], // mid-left
      [820, GH - 340, 90,  110, 1], // mid-right
    ];

    this.rotating     = false;
    this.rotProgress  = 0;
    this.rotTimer     = 0;
    this.rotDuration  = 800;
  }

  spawn() {
    const r = Math.random();
    const count = r < 0.25 ? 1 : r < 0.75 ? 2 : 3;
    this.enemies = [];

    for (let i = 0; i < count; i++) {
      const tpl  = randChoice(ENEMY_TYPES);
      const slot = this.depthSlots[i % this.depthSlots.length];
      const hp   = randInt(tpl.minHP, tpl.maxHP);
      this.enemies.push({
        name:      tpl.name,
        type:      tpl.type,
        hp,
        maxHP:     hp,
        hpVisual:  hp,
        active:    true,
        posSlot:   i % this.depthSlots.length,
        x:         slot[0], y: slot[1],
        w:         slot[2], h: slot[3],
        zOrder:    slot[4],
        frameIdx:  0,
        frameTimer:0,
        shake:     new Shake(),
      });
    }
    return count;
  }

  getEnemyAtFront() {
    return this.enemies.find(e => e.active && e.hp > 0 && e.zOrder === 3) || null;
  }

  aliveCount() { return this.enemies.filter(e => e.active && e.hp > 0).length; }

  startRotation() {
    if (this.aliveCount() <= 1) return;
    this.rotating    = true;
    this.rotProgress = 0;
    this.rotTimer    = 0;
  }

  update(dt) {
    // Animate ghost frames
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.frameTimer += dt;
      if (e.frameTimer >= 150) { e.frameTimer = 0; e.frameIdx = (e.frameIdx + 1) % (this.ghostAnim ? this.ghostAnim.frames : 1); }
      e.shake.update(dt);
    }

    // Rotation animation
    if (this.rotating) {
      this.rotTimer    += dt;
      this.rotProgress  = Math.min(this.rotTimer / this.rotDuration, 1);
      const t = easeInOut(this.rotProgress);
      const alive = this.enemies.filter(e => e.active && e.hp > 0);

      for (const e of alive) {
        const cur  = e.posSlot;
        const next = (cur + 1) % Math.min(alive.length, this.depthSlots.length);
        const [cx, cy, cw, ch, cz] = this.depthSlots[cur];
        const [nx, ny, nw, nh, nz] = this.depthSlots[next];
        e.x      = lerp(cx, nx, t);
        e.y      = lerp(cy, ny, t);
        e.w      = Math.round(lerp(cw, nw, t));
        e.h      = Math.round(lerp(ch, nh, t));
        e.zOrder = t > 0.5 ? nz : cz;
      }

      if (this.rotProgress >= 1) {
        this.rotating = false;
        for (const e of alive) {
          e.posSlot = (e.posSlot + 1) % Math.min(alive.length, this.depthSlots.length);
          const [sx, sy, sw, sh, sz] = this.depthSlots[e.posSlot];
          e.x = sx; e.y = sy; e.w = sw; e.h = sh; e.zOrder = sz;
        }
      }
    }

    // Smooth HP visual
    for (const e of this.enemies) {
      if (e.hpVisual > e.hp) { e.hpVisual = Math.max(e.hp, e.hpVisual - 2); }
      else if (e.hpVisual < e.hp) { e.hpVisual = Math.min(e.hp, e.hpVisual + 2); }
    }
  }

  draw(ctx, ghostAnim) {
    const sorted = [...this.enemies].filter(e => e.active && e.hp > 0).sort((a, b) => a.zOrder - b.zOrder);
    for (const e of sorted) {
      const ox = e.shake.ox, oy = e.shake.oy;
      ghostAnim.draw(ctx, e.frameIdx, e.x + ox, e.y + oy, e.w, e.h, true);
      // HP bars are drawn in the DOM (#enemy-hp-area) — not on canvas
    }
  }

  _drawEnemyHPBar(ctx, e) {
    const bw = Math.max(80, e.w * 0.8);
    const bx = e.x + (e.w - bw) / 2;
    const by = e.y - 50;
    const bh = 14;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 2, by - 18, bw + 4, bh + 22);
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx - 2, by - 18, bw + 4, bh + 22);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 2, by - 18, bw + 4, bh + 22);

    // Name
    ctx.fillStyle = '#000';
    ctx.font = '9px "DogicaPixel",Courier';
    ctx.fillText(e.name, bx, by - 4);

    // Bar
    ctx.fillStyle = '#888';
    ctx.fillRect(bx, by, bw, bh);
    const pct = clamp(e.hpVisual / e.maxHP, 0, 1);
    ctx.fillStyle = pct > 0.6 ? '#0c0' : pct > 0.3 ? '#cc0' : '#c00';
    ctx.fillRect(bx, by, bw * pct, bh);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  BESTIARY
// ═══════════════════════════════════════════════════════════════════
class BestiaryManager {
  constructor() { this.entries = {}; }  // { type: { name, weaknesses:[], discovered: timestamp } }

  discover(type, weapon) {
    if (!this.entries[type]) this.entries[type] = { name: type.charAt(0).toUpperCase() + type.slice(1), weaknesses: [], ts: Date.now() };
    if (!this.entries[type].weaknesses.includes(weapon)) {
      this.entries[type].weaknesses.push(weapon);
      return true; // new discovery
    }
    return false;
  }

  types() { return Object.keys(this.entries); }
  get(type) { return this.entries[type]; }
}

// ═══════════════════════════════════════════════════════════════════
//  ECONOMY
// ═══════════════════════════════════════════════════════════════════
class Economy {
  constructor() { this.coins = 0; }
  add(amount)    { this.coins += amount; return this; }
  spend(amount)  { if (this.coins < amount) return false; this.coins -= amount; return true; }
  canAfford(n)   { return this.coins >= n; }
}

// ═══════════════════════════════════════════════════════════════════
//  TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════
class Toast {
  constructor(el) { this.el = el; this.tid = null; }
  show(text, duration = 3000) {
    if (this.tid) clearTimeout(this.tid);
    this.el.innerHTML = text.replace(/\n/g, '<br>');
    this.el.classList.remove('hidden');
    this.tid = setTimeout(() => this.el.classList.add('hidden'), duration);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN GAME
// ═══════════════════════════════════════════════════════════════════
class JokenGhost {
  constructor() {
    this.canvas  = document.getElementById('gameCanvas');
    this.ctx     = this.canvas.getContext('2d');
    this.assets  = new AssetManager();
    this.economy = new Economy();
    this.bestiary = new BestiaryManager();
    this.toast   = new Toast(document.getElementById('toast'));

    this.state   = STATE.MENU;
    this.running = false;
    this.lastTs  = 0;
    this.currentLevel = 1;
    this.activeSaveSlot = null;

    // Player
    this.playerHP        = PLAYER_MAX_HP;
    this.playerHPVisual  = PLAYER_MAX_HP;
    this.playerX         = -200;
    this.playerXTarget   = 80;
    this.playerAnim      = null;
    this.playerFrame     = 0;
    this.playerFrameTimer= 0;
    this.playerShake     = new Shake();

    // Enemy manager (init after assets)
    this.enemyMgr = null;

    // Animation state
    this.entryAnim       = false;
    this.transAlpha      = 0;
    this.transDir        = 1;
    this.transHold       = 0;  // ms to hold at full black before fading out

    // Battle state
    this.turnActive       = false;
    this.battleMessage    = '';
    this.messageTimer     = 0;
    this.playerHistory    = []; // últimas jogadas do jogador (IA fantasma)
    this.messageDuration  = 2500;
    this.menuOpen         = null; // 'attacks' | 'shop' | null
    this.awaitingRotation = false;
    this.rotDelay         = 600;
    this.rotTimer         = 0;

    // Floating coins
    this.floatingCoins = [];

    // Caching DOM refs
    this.$root           = document.getElementById('game-root');
    this.$screenMenu     = document.getElementById('screen-menu');
    this.$screenIntro    = document.getElementById('screen-intro');
    this.$screenTrans    = document.getElementById('screen-transition');
    this.$screenResult   = document.getElementById('screen-result');
    this.$hud            = document.getElementById('hud');
    this.$attackPanel    = document.getElementById('attack-panel');
    this.$shopPanel      = document.getElementById('shop-panel');
    this.$bestiaryModal  = document.getElementById('bestiary-modal');
    this.$transOverlay   = document.getElementById('transition-overlay');
    this.$transText      = document.getElementById('transition-text');
    this.$coinAmount     = document.getElementById('coin-amount');
    this.$resultTitle    = document.getElementById('result-title');
    this.$resultCoins    = document.getElementById('result-coins-text');
    this.$introText      = document.getElementById('intro-text');
    this.$battleMsgBox   = document.getElementById('battle-msg-box');
    this.$battleMsgP     = document.getElementById('battle-msg-player');
    this.$battleMsgE     = document.getElementById('battle-msg-enemy');
    this.$roundResult    = document.getElementById('round-result');
    this.$roundResultTxt = document.getElementById('round-result-text');
    this.$battleActions  = document.getElementById('battle-actions');
    this.$hpPlayerFill   = document.getElementById('hp-player-fill');
    this.$enemyHPArea    = document.getElementById('enemy-hp-area');
    this.$shopContainer  = document.getElementById('shop-items-container');
    this.$bestiaryContent= document.getElementById('bestiary-content');
    this.$bestiaryNav    = document.getElementById('bestiary-nav');
    this.$bstPageLabel   = document.getElementById('bst-page-label');
    this.$btnBstPrev     = document.getElementById('btn-bst-prev');
    this.$btnBstNext     = document.getElementById('btn-bst-next');
    this.$screenDialogue = document.getElementById('screen-dialogue');
    this.$dlgText        = document.getElementById('dialogue-text');
    this.$dlgHint        = document.getElementById('dialogue-hint');
    this.$dlgSpeaker     = document.getElementById('dialogue-speaker');
    this.$screenLevelSelect = document.getElementById('screen-level-select');

    // Options
    this.options = loadOptions();

    // Audio
    this.bgm             = document.getElementById('bgm');
    this.bgm.volume      = this.options.bgmVol / 100;
    this.sfxHit          = document.getElementById('sfx-hit');
    this.sfxHit.volume   = this.options.sfxVol / 100;

    // Dialogue state
    this.dlgLine     = 0;
    this.dlgChars    = 0;
    this.dlgComplete = false;
    this.dlgSpeed    = 28; // chars/sec

    this.bestiaryPage = 0;

    this._init();
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────────
  async _init() {
    await this.assets.loadAll();

    // Create animators
    this.playerAnim  = new SpriteAnimator(this.assets.get('player'));
    this.ghostAnim   = new SpriteAnimator(this.assets.get('ghost'));
    this.enemyMgr    = new EnemyManager(this.ghostAnim);

    this._bindEvents();
    this._buildShop();
    this._handleResize();

    this.running = true;
    requestAnimationFrame(ts => this._loop(ts));
  }

  // ─────────────────────────────────────────────────────────────
  //  MAIN LOOP
  // ─────────────────────────────────────────────────────────────
  _loop(ts) {
    if (!this.running) return;
    const dt = Math.min(ts - this.lastTs, 50); // cap at 50ms
    this.lastTs = ts;
    this._update(dt);
    this._render();
    requestAnimationFrame(t => this._loop(t));
  }

  // ─────────────────────────────────────────────────────────────
  //  UPDATE
  // ─────────────────────────────────────────────────────────────
  _update(dt) {
    switch (this.state) {
      case STATE.MENU:       this._updateMenu(dt);       break;
      case STATE.INTRO:      this._updateIntro(dt);      break;
      case STATE.TRANSITION: this._updateTransition(dt); break;
      case STATE.DIALOGUE:   this._updateDialogue(dt);   break;
      case STATE.BATTLE:     this._updateBattle(dt);     break;
      case STATE.RESULT:     break;
    }
  }

  _updateMenu(dt) {}

  _updateIntro(dt) {}

  _updateTransition(dt) {
    this.transAlpha += this.transDir * (255 / (FPS * 0.5));
    if (this.transAlpha >= 255) {
      this.transAlpha = 255;
      if (this.transHold < 2000) {
        // Hold here — show text, wait 2s before fading out
        this.$transText.classList.remove('hidden');
        this.transHold += 16; // ~1 frame
        return;
      }
      this.transDir = -1;
    }
    if (this.transAlpha < 0 && this.transDir === -1) {
      this.transAlpha = 0;
      this.$screenTrans.classList.add('hidden');
      this._startDialogue();
    }
    this.$transOverlay.style.opacity = this.transAlpha / 255;
  }

  _updateBattle(dt) {
    // Entry animation
    if (this.entryAnim) {
      const spd = 8;
      this.playerX = Math.min(this.playerX + spd, this.playerXTarget);
      if (this.playerX >= this.playerXTarget) this.entryAnim = false;
    }

    // Player frame
    this.playerFrameTimer += dt;
    if (this.playerFrameTimer >= 200) {
      this.playerFrameTimer = 0;
      this.playerFrame = (this.playerFrame + 1) % (this.playerAnim ? this.playerAnim.frames : 1);
    }

    // Player shake
    this.playerShake.update(dt);

    // Enemies
    this.enemyMgr.update(dt);
    this._updateEnemyHPBars(); // live HP bar sync (DOM, no rebuild)

    // HP visual smooth
    if (this.playerHPVisual > this.playerHP) this.playerHPVisual = Math.max(this.playerHP, this.playerHPVisual - 2);
    else if (this.playerHPVisual < this.playerHP) this.playerHPVisual = Math.min(this.playerHP, this.playerHPVisual + 2);
    this._syncPlayerHPBar();

    // Floating coins
    this.floatingCoins = this.floatingCoins.filter(c => { c.update(dt); return c.alive; });

    // Track when rotation finishes to unlock turn
    const wasRotating = this._wasRotating || false;
    this._wasRotating = this.enemyMgr.rotating;
    const rotationJustFinished = wasRotating && !this.enemyMgr.rotating;
    if (rotationJustFinished && this.turnActive) {
      this.turnActive = false;
      this._setActionsDisabled(false);
      this._buildEnemyHPBars(); // refresh after rotation
    }

    // Battle message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.messageTimer = 0;
        this.$battleMsgBox.classList.remove('msg-pop');
        this.$battleMsgBox.classList.add('msg-hide');
        const onHideDone = () => {
          this.$battleMsgBox.classList.remove('msg-hide');
          this.$battleMsgBox.classList.add('hidden');
          this.$battleMsgBox.removeEventListener('animationend', onHideDone);
        };
        this.$battleMsgBox.addEventListener('animationend', onHideDone);

        // After message fades, trigger rotation if an enemy just died
        if (this.awaitingRotation) {
          this.awaitingRotation = false;
          this.enemyMgr.startRotation();
          // Rotation will unlock turn when finished (rotationJustFinished above)
          return;
        }

        // No rotation needed — unlock immediately
        if (this.turnActive) {
          this.turnActive = false;
          this._setActionsDisabled(false);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GW, GH);

    switch (this.state) {
      case STATE.MENU:       this._renderMenu(ctx);       break;
      case STATE.INTRO:      this._renderIntro(ctx);      break;
      case STATE.TRANSITION: this._renderTransition(ctx); break;
      case STATE.DIALOGUE:   this._renderDialogue(ctx);   break;
      case STATE.BATTLE:     this._renderBattle(ctx);     break;
      case STATE.RESULT:     this._renderResult(ctx);     break;
    }
  }

  _renderMenu(ctx) {
    const bg = this.assets.get('menuBg');
    if (bg) { ctx.drawImage(bg, 0, 0, GW, GH); }
    else     { ctx.fillStyle = '#1a0a2e'; ctx.fillRect(0, 0, GW, GH); }
    // Dark overlay to make title readable
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, GW, GH);
  }

  _renderIntro(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GW, GH);
  }

  // ─────────────────────────────────────────────────────────────
  //  DIALOGUE STATE
  // ─────────────────────────────────────────────────────────────
  _startDialogue() {
    this.dlgLine     = 0;
    this.dlgChars    = 0;
    this.dlgComplete = false;
    this.playerX     = 80;
    this.playerFrame = 0;
    this.playerFrameTimer = 0;
    this.$dlgText.textContent = '';
    this.$dlgHint.style.opacity = '0';
    this.$screenDialogue.classList.remove('hidden');
    this.state = STATE.DIALOGUE;
  }

  _updateDialogue(dt) {
    // Animate player idle
    this.playerFrameTimer += dt;
    if (this.playerFrameTimer >= 200) {
      this.playerFrameTimer = 0;
      this.playerFrame = (this.playerFrame + 1) % (this.playerAnim ? this.playerAnim.frames : 1);
    }

    if (!this.dlgComplete) {
      this.dlgChars += this.dlgSpeed * (dt / 1000);
      const full = DIALOGUE_LINES[this.dlgLine].length;
      if (this.dlgChars >= full) {
        this.dlgChars    = full;
        this.dlgComplete = true;
        this.$dlgHint.style.opacity = '1';
      }
      this.$dlgText.textContent = DIALOGUE_LINES[this.dlgLine].slice(0, Math.floor(this.dlgChars));
    }
  }

  _advanceDialogue() {
    if (!this.dlgComplete) {
      // Skip typewriter — show full line immediately
      this.dlgChars    = DIALOGUE_LINES[this.dlgLine].length;
      this.dlgComplete = true;
      this.$dlgText.textContent = DIALOGUE_LINES[this.dlgLine];
      this.$dlgHint.style.opacity = '1';
      return;
    }
    this.dlgLine++;
    if (this.dlgLine >= DIALOGUE_LINES.length) {
      // All lines done — go to battle
      this.$screenDialogue.classList.add('hidden');
      this._startBattle();
      return;
    }
    // Next line
    this.dlgChars    = 0;
    this.dlgComplete = false;
    this.$dlgText.textContent = '';
    this.$dlgHint.style.opacity = '0';
  }

  _renderDialogue(ctx) {
    const bg = this.assets.get('battleBg');
    if (bg) ctx.drawImage(bg, 0, 0, GW, GH);
    else { ctx.fillStyle = '#1a3a1a'; ctx.fillRect(0, 0, GW, GH); }
    // Atmospheric overlay
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, GW, GH);
    // Player sprite (idle, left side)
    const pw = 130, ph = 165;
    const px = 80, py = GH - ph - 80;
    if (this.playerAnim && this.assets.get('player')) {
      this.playerAnim.draw(ctx, this.playerFrame, px, py, pw, ph, false);
    }
  }

  _renderTransition(ctx) {
    const bg = this.assets.get('battleBg');
    if (bg) { ctx.drawImage(bg, 0, 0, GW, GH); }
    else     { ctx.fillStyle = '#1a3a1a'; ctx.fillRect(0, 0, GW, GH); }
  }

  _renderBattle(ctx) {
    // Background
    const bg = this.assets.get('battleBg');
    if (bg) { ctx.drawImage(bg, 0, 0, GW, GH); }
    else     { ctx.fillStyle = '#1a3a1a'; ctx.fillRect(0, 0, GW, GH); }

    // Player
    const px = this.playerX + this.playerShake.ox;
    const py = GH - 280 + this.playerShake.oy;
    const pw = 120, ph = 150;
    if (this.playerAnim && this.assets.get('player')) {
      this.playerAnim.draw(ctx, this.playerFrame, px, py, pw, ph, false);
    } else {
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(px, py, pw, ph);
    }
    // HP bar is drawn in the DOM HUD (not on canvas)

    // Enemies (sorted by z)
    this.enemyMgr.draw(ctx, this.ghostAnim);

    // Floating coins
    for (const c of this.floatingCoins) c.draw(ctx);
  }

  _renderResult(ctx) {
    const bg = this.assets.get('battleBg');
    if (bg) { ctx.drawImage(bg, 0, 0, GW, GH); }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, GW, GH);
  }

  _drawPlayerHPBarOnCanvas(ctx, sx, sy, sw, sh) {
    const bw = 180, bh = 14;
    const bx = sx + (sw - bw) / 2;
    const by = sy - 50;

    ctx.fillStyle = '#fff';
    ctx.fillRect(bx - 2, by - 18, bw + 4, bh + 22);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeRect(bx - 2, by - 18, bw + 4, bh + 22);

    ctx.fillStyle = '#000';
    ctx.font = '9px "DogicaPixel",Courier';
    ctx.fillText('VOCE', bx, by - 4);

    ctx.fillStyle = '#888';
    ctx.fillRect(bx, by, bw, bh);
    const pct = clamp(this.playerHPVisual / PLAYER_MAX_HP, 0, 1);
    ctx.fillStyle = pct > 0.6 ? '#0c0' : pct > 0.3 ? '#cc0' : '#c00';
    ctx.fillRect(bx, by, bw * pct, bh);
  }

  // ─────────────────────────────────────────────────────────────
  //  STATE TRANSITIONS
  // ─────────────────────────────────────────────────────────────
  _goToLevelSelect() {
    const overlay = document.getElementById('screen-fade-overlay');
    // Fade to black
    overlay.classList.remove('fade-out');
    overlay.classList.add('fade-in');
    overlay.style.opacity = '';
    setTimeout(() => {
      this.$screenMenu.classList.add('hidden');
      this.$screenResult.classList.add('hidden');
      this.$screenLevelSelect.classList.remove('hidden');
      this.state = STATE.LEVEL_SELECT;
      this.bgm.currentTime = 0;
      this.bgm.play().catch(() => {});
      // Fade back out
      overlay.classList.remove('fade-in');
      overlay.classList.add('fade-out');
    }, 350);
  }

  _playHit() {
    this.sfxHit.currentTime = 0;
    this.sfxHit.play().catch(() => {});
  }

  // ─── SAVE SYSTEM ──────────────────────────────────────────────
  _autoSave() {
    if (this.activeSaveSlot == null) return;
    setSave(this.activeSaveSlot, buildSaveData(this.activeSaveSlot, this));
  }

  _openSavesModal() {
    const list = document.getElementById('saves-list');
    list.innerHTML = '';
    for (let i = 1; i <= NUM_SLOTS; i++) {
      const data = getSave(i);
      const slot = document.createElement('div');
      slot.className = 'save-slot' + (data ? '' : ' empty');

      const num   = document.createElement('div');
      num.className = 'save-slot-num';
      num.textContent = i;

      const info  = document.createElement('div');
      info.className = 'save-slot-info';

      if (data) {
        const name = document.createElement('div');
        name.className = 'save-slot-name';
        name.textContent = `${LEVEL_NAMES[data.level] || 'Fase '+data.level}`;
        const meta = document.createElement('div');
        meta.className = 'save-slot-meta';
        meta.textContent = `${data.date}  •  $ ${data.coins}  •  ${data.bestiaryCount} monstros`;
        info.appendChild(name);
        info.appendChild(meta);
      } else {
        const name = document.createElement('div');
        name.className = 'save-slot-name';
        name.textContent = '— VAZIO —';
        info.appendChild(name);
      }

      const actions = document.createElement('div');
      actions.className = 'save-slot-actions';

      const btnPlay = document.createElement('button');
      btnPlay.className = 'btn-save-play';
      btnPlay.textContent = data ? 'CONTINUAR' : 'NOVO JOGO';
      btnPlay.addEventListener('click', () => {
        this.activeSaveSlot = i;
        if (data) {
          this.economy.coins = data.coins;
          this._updateCoinDisplay();
          this.currentLevel = data.level;
        } else {
          this.economy.coins = 0;
          this._updateCoinDisplay();
          this.currentLevel = 1;
          setSave(i, buildSaveData(i, this));
        }
        document.getElementById('saves-modal').classList.add('hidden');
        this._goToLevelSelect();
      });
      actions.appendChild(btnPlay);

      if (data) {
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-save-del';
        btnDel.textContent = 'DEL';
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Apagar Arquivo ${i}?`)) {
            deleteSave(i);
            this._openSavesModal();
          }
        });
        actions.appendChild(btnDel);
      }

      slot.appendChild(num);
      slot.appendChild(info);
      slot.appendChild(actions);
      list.appendChild(slot);
    }
    document.getElementById('saves-modal').classList.remove('hidden');
  }

  _openOptions() {
    const modal = document.getElementById('options-modal');
    const opts  = this.options;

    // Sync slider values
    const bgmSlider = document.getElementById('opt-bgm-vol');
    const sfxSlider = document.getElementById('opt-sfx-vol');
    bgmSlider.value = opts.bgmVol;
    sfxSlider.value = opts.sfxVol;
    document.getElementById('opt-bgm-val').textContent = opts.bgmVol;
    document.getElementById('opt-sfx-val').textContent = opts.sfxVol;

    // Sync toggles
    const setToggle = (id, val) => {
      const btn = document.getElementById(id);
      btn.dataset.on = val ? 'true' : 'false';
      btn.textContent = val ? 'ATIVO' : 'INATIVO';
    };
    setToggle('opt-shake',     opts.shake);
    setToggle('opt-coins',     opts.floatingCoins);
    setToggle('opt-toast',     opts.toasts);
    setToggle('opt-fullscreen', !!document.fullscreenElement);

    // Sync scale buttons
    document.querySelectorAll('.opt-scale-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.scale === String(opts.scale));
    });

    modal.classList.remove('hidden');
  }

  _bindOptions() {
    const modal = document.getElementById('options-modal');

    document.getElementById('btn-options').addEventListener('click', () => this._openOptions());
    document.getElementById('btn-options-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

    // BGM volume
    document.getElementById('opt-bgm-vol').addEventListener('input', e => {
      const v = parseInt(e.target.value);
      this.options.bgmVol = v;
      this.bgm.volume = v / 100;
      document.getElementById('opt-bgm-val').textContent = v;
      saveOptions(this.options);
    });

    // SFX volume
    document.getElementById('opt-sfx-vol').addEventListener('input', e => {
      const v = parseInt(e.target.value);
      this.options.sfxVol = v;
      this.sfxHit.volume = v / 100;
      document.getElementById('opt-sfx-val').textContent = v;
      saveOptions(this.options);
    });

    // Toggles
    const bindToggle = (id, key, onTrue, onFalse) => {
      document.getElementById(id).addEventListener('click', e => {
        const btn = e.currentTarget;
        const newVal = btn.dataset.on !== 'true';
        btn.dataset.on = newVal ? 'true' : 'false';
        btn.textContent = newVal ? 'ATIVO' : 'INATIVO';
        this.options[key] = newVal;
        saveOptions(this.options);
        if (newVal && onTrue) onTrue();
        if (!newVal && onFalse) onFalse();
      });
    };
    bindToggle('opt-shake', 'shake');
    bindToggle('opt-coins', 'floatingCoins');
    bindToggle('opt-toast', 'toasts');
    bindToggle('opt-fullscreen', '_fs',
      () => document.documentElement.requestFullscreen?.().catch(() => {}),
      () => document.exitFullscreen?.().catch(() => {})
    );

    // Scale buttons
    document.querySelectorAll('.opt-scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-scale-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.scale;
        this.options.scale = val === 'fit' ? 'fit' : parseFloat(val);
        saveOptions(this.options);
        this._handleResize();
      });
    });
  }

  _goToIntro() {
    this.$screenMenu.classList.add('hidden');
    this.$screenIntro.classList.remove('hidden');
    this.$introText.textContent = INTRO_LINES.join('\n');
    this.state = STATE.INTRO;
    // BGM: inicia só se não estiver tocando (pode vir do level select)
    if (this.bgm.paused) {
      this.bgm.currentTime = 0;
      this.bgm.play().catch(() => {});
    }
  }

  _goToTransition() {
    this.$screenIntro.classList.add('hidden');
    this.$screenTrans.classList.remove('hidden');
    this.$transOverlay.style.opacity = 0;
    this.$transText.classList.add('hidden');
    this.transAlpha = 0;
    this.transDir   = 1;
    this.transHold  = 0;
    this.state = STATE.TRANSITION;
  }

  _startBattle() {
    // Reset player
    this.playerHP       = PLAYER_MAX_HP;
    this.playerHPVisual = PLAYER_MAX_HP;
    this.playerX        = -200;
    this.entryAnim      = true;
    this.turnActive     = false;
    this.battleMessage  = '';
    this.playerHistory  = [];

    // Spawn enemies
    this.enemyMgr.spawn();

    // Show HUD
    this.$hud.classList.remove('hidden');
    this.$battleActions.classList.remove('hidden');
    this._setActionsDisabled(false);
    this._syncPlayerHPBar();
    this._buildEnemyHPBars();

    this.state = STATE.BATTLE;
  }

  _showResult(win) {
    const totalCoins = this.economy.coins;
    this.$hud.classList.add('hidden');
    this._closePanel();
    this._autoSave();

    this.$resultTitle.textContent  = win ? 'VOCE VENCEU!' : 'VOCE FOI DERROTADO!';
    this.$resultTitle.className    = win ? 'win' : 'lose';
    this.$resultCoins.textContent  = `Moedas acumuladas: $${totalCoins}`;
    this.$screenResult.classList.remove('hidden');
    this.state = STATE.RESULT;
  }

  _restart() {
    this.$screenResult.classList.add('hidden');
    this.economy = new Economy();
    this._updateCoinDisplay();

    this.bestiary  = new BestiaryManager();
    this.bestiaryPage = 0;

    this.playerHP       = PLAYER_MAX_HP;
    this.playerHPVisual = PLAYER_MAX_HP;
    this.playerX        = -200;
    this.entryAnim      = true;
    this.turnActive     = false;
    this.battleMessage  = '';
    this.playerHistory  = [];
    this.floatingCoins  = [];

    this.enemyMgr.spawn();
    this.$hud.classList.remove('hidden');
    this._syncPlayerHPBar();
    this._buildEnemyHPBars();
    this._closePanel();

    this.state = STATE.BATTLE;
  }

  // ─────────────────────────────────────────────────────────────
  //  COMBAT
  // ─────────────────────────────────────────────────────────────
  _processTurn(choice) {
    if (this.turnActive || this.entryAnim) return;
    if (this.enemyMgr.aliveCount() === 0) return;

    this.turnActive = true;
    this._setActionsDisabled(true);
    this._closePanel();

    const enemy = this.enemyMgr.getEnemyAtFront();
    if (!enemy) { this.turnActive = false; this._setActionsDisabled(false); return; }

    this.playerHistory.push(choice);
    const enemyChoice = randChoice([CHOICE.PEDRA, CHOICE.PAPEL, CHOICE.TESOURA]);

    let outcome;
    if (choice === enemyChoice)               outcome = 'draw';
    else if (WINS_AGAINST[choice] === enemyChoice) outcome = 'player';
    else                                      outcome = 'enemy';

    // Build messages
    const choiceNames      = { pedra: 'Estaca',     papel: 'Aspirador',    tesoura: 'Cruz'      };
    const enemyChoiceNames = { pedra: 'Possessão',  papel: 'Assombração',  tesoura: 'Maldição'  };
    this.$battleMsgP.textContent = `Voce usou: ${choiceNames[choice]}`;
    this.$battleMsgE.textContent = `${enemy.name} usou: ${enemyChoiceNames[enemyChoice]}`;
    this.$battleMsgBox.classList.remove('hidden');
    // Restart animation on every reveal
    this.$battleMsgBox.classList.remove('msg-pop');
    void this.$battleMsgBox.offsetWidth; // reflow
    this.$battleMsgBox.classList.add('msg-pop');

    // Apply result
    if (outcome === 'player') {
      // Player wins round
      const weapon = ATTACK_MAP[choice];
      const isWeakness = WEAKNESSES[enemy.type]?.includes(weapon);
      const reward = isWeakness ? REWARD_PEDRA : REWARD_OTHER;
      const dmg    = isWeakness ? WEAKNESS_DAMAGE : PLAYER_DAMAGE;
      enemy.hp = Math.max(0, enemy.hp - dmg);
      enemy.shake.start(15);
      this._playHit();
      this.economy.add(reward);
      this._updateCoinDisplay();
      if (this.options.floatingCoins) this.floatingCoins.push(new FloatingCoin(reward, enemy.x + 40, enemy.y - 20));

      // Bestiary: só revela fraqueza se acertou com o Aspirador
      if (isWeakness) {
        const newDisc = this.bestiary.discover(enemy.type, weapon);
        if (newDisc && this.options.toasts) {
          this.toast.show(`Fraqueza revelada!\n${enemy.type.charAt(0).toUpperCase()+enemy.type.slice(1)} e fraco contra ${weapon}!`);
        }
      }

      if (enemy.hp <= 0) {
        enemy.active = false;
        const clearBonus = REWARD_CLEAR;
        this.economy.add(clearBonus);
        this._updateCoinDisplay();
        if (this.options.floatingCoins) this.floatingCoins.push(new FloatingCoin(clearBonus, enemy.x + 20, enemy.y - 50));
        this._showRoundResult(`${enemy.name} derrotado! +$${clearBonus}`, 'win');
      } else {
        this._showRoundResult(`Acertou! +$${reward}`, 'win');
      }

      this._buildEnemyHPBars();
      this.awaitingRotation = this.enemyMgr.aliveCount() > 0 && enemy.hp <= 0;

    } else if (outcome === 'enemy') {
      // Enemy wins round
      this.playerHP = Math.max(0, this.playerHP - ENEMY_DAMAGE);
      if (this.options.shake) this.playerShake.start(15);
      this._playHit();
      this._showRoundResult(`${enemy.name} te acertou!`, 'lose');

    } else {
      // Draw
      this._showRoundResult('Empate!', 'draw');
    }

    // Check end conditions
    if (this.playerHP <= 0) {
      this.awaitingRotation = false;
      this.messageTimer = this.messageDuration;
      setTimeout(() => this._showResult(false), 2000);
      return;
    }
    if (this.enemyMgr.aliveCount() === 0) {
      this.awaitingRotation = false;
      const bonus = this.enemyMgr.enemies.length * REWARD_CLEAR;
      this.economy.add(bonus);
      this._updateCoinDisplay();
      this.messageTimer = this.messageDuration;
      setTimeout(() => this._showResult(true), 2000);
      return;
    }

    this.messageTimer = this.messageDuration;
  }

  // ─────────────────────────────────────────────────────────────
  //  SHOP
  // ─────────────────────────────────────────────────────────────
  _buildShop() {
    this.$shopContainer.innerHTML = '';
    for (const item of SHOP_ITEMS) {
      const btn = document.createElement('button');
      btn.className = 'btn-shop-item';
      btn.dataset.effect = item.effect;

      const canAfford = this.economy.canAfford(item.price);
      if (!canAfford) btn.disabled = true;

      btn.innerHTML = `
        <div class="shop-item-icon">
          <img src="${item.img}" alt="${item.name}" onerror="this.style.display='none'">
        </div>
        <span class="shop-item-name">${item.name}</span>
        <span class="shop-item-price ${canAfford ? '' : 'no-money'}">$${item.price}</span>
        <span class="shop-item-effect">${item.desc}</span>
      `;

      btn.addEventListener('click', () => this._buyItem(item));
      this.$shopContainer.appendChild(btn);
    }
  }

  _refreshShopAffordability() {
    const btns = this.$shopContainer.querySelectorAll('.btn-shop-item');
    const items = SHOP_ITEMS;
    btns.forEach((btn, i) => {
      const can = this.economy.canAfford(items[i].price);
      btn.disabled = !can;
      const priceEl = btn.querySelector('.shop-item-price');
      if (priceEl) { priceEl.classList.toggle('no-money', !can); }
    });
  }

  _buyItem(item) {
    if (!this.economy.canAfford(item.price)) { if (this.options.toasts) this.toast.show('Dinheiro insuficiente!'); return; }
    this.economy.spend(item.price);

    if (item.effect === 'heal_small') {
      const healed = Math.min(30, PLAYER_MAX_HP - this.playerHP);
      this.playerHP = Math.min(PLAYER_MAX_HP, this.playerHP + 30);
      if (this.options.toasts) this.toast.show(`Pocao usada! +${healed} HP`);
    } else if (item.effect === 'heal_big') {
      const healed = Math.min(60, PLAYER_MAX_HP - this.playerHP);
      this.playerHP = Math.min(PLAYER_MAX_HP, this.playerHP + 60);
      if (this.options.toasts) this.toast.show(`Pocao Grande! +${healed} HP`);
    } else if (item.effect === 'buff_attack') {
      const enemy = this.enemyMgr.getEnemyAtFront();
      if (enemy) {
        enemy.hp = Math.max(0, enemy.hp - 15);
        enemy.shake.start(10);
        if (enemy.hp <= 0) { enemy.active = false; }
        this._buildEnemyHPBars();
        if (this.options.toasts) this.toast.show('Buff aplicado! -15 HP no inimigo!');
      }
    }

    this._updateCoinDisplay();
    this._syncPlayerHPBar();
    this._refreshShopAffordability();
  }

  // ─────────────────────────────────────────────────────────────
  //  BESTIARY UI
  // ─────────────────────────────────────────────────────────────
  _openBestiary() {
    this._renderBestiaryContent();
    this.$bestiaryModal.classList.remove('hidden');
    this.$bestiaryModal.classList.remove('bst-close');
    void this.$bestiaryModal.offsetWidth;
    this.$bestiaryModal.classList.add('bst-open');
  }

  _closeBestiary() {
    this.$bestiaryModal.classList.remove('bst-open');
    this.$bestiaryModal.classList.add('bst-close');
    const onDone = () => {
      this.$bestiaryModal.classList.add('hidden');
      this.$bestiaryModal.classList.remove('bst-close');
      this.$bestiaryModal.removeEventListener('animationend', onDone);
    };
    this.$bestiaryModal.addEventListener('animationend', onDone);
  }

  _renderBestiaryContent() {
    const types = this.bestiary.types();
    this.$bestiaryContent.innerHTML = '';

    if (types.length === 0) {
      this.$bestiaryContent.innerHTML = `<p class="bestiary-no-entries">Derrote inimigos para\ndescobrir suas fraquezas!\n\nUse ataques diferentes para\ndesbloquear entradas.</p>`;
      this.$bestiaryNav.classList.add('hidden');
      return;
    }

    const page = clamp(this.bestiaryPage, 0, types.length - 1);
    this.bestiaryPage = page;
    const type = types[page];
    const info = this.bestiary.get(type);

    // Update nav
    this.$bestiaryNav.classList.remove('hidden');
    this.$bstPageLabel.textContent = `${page + 1}/${types.length}`;
    this.$btnBstPrev.disabled = page === 0;
    this.$btnBstNext.disabled = page === types.length - 1;

    // Entry HTML
    const weakList = info.weaknesses.length > 0
      ? info.weaknesses.map(w => `<span class="bestiary-weakness-item">• ${w}</span>`).join('')
      : '<span class="bestiary-weakness-item" style="color:#aaa">Ainda não descobertas</span>';

    const desc = type === 'fantasma'
      ? 'Espírito inquieto que assombra a mansão.\nFortes contra ataques físicos comuns.'
      : 'Criatura misteriosa das trevas.';

    this.$bestiaryContent.innerHTML = `
      <div class="bestiary-card" id="bst-card">
        <div class="bst-page-left">
          <canvas class="bst-sprite-canvas" id="_bst_sprite_canvas" width="140" height="140"></canvas>
          <div class="bst-mon-name">${info.name}</div>
          <div class="bst-tap-hint">▼ ver detalhes</div>
        </div>
        <div class="bst-page-right">
          <div class="bestiary-monster-name">${info.name}</div>
          <span class="bestiary-type-badge">tipo: ${type}</span>
          <p class="bestiary-description">${desc.replace(/\n/g,'<br>')}</p>
          <div class="bestiary-weaknesses-title">⚠️ Fraquezas descobertas:</div>
          <div class="bestiary-weaknesses-grid">${weakList}</div>
        </div>
      </div>
    `;

    // Draw sprite on canvas
    const spriteCanvas = document.getElementById('_bst_sprite_canvas');
    if (spriteCanvas && this.ghostAnim && this.assets.get('ghost')) {
      const tmpCtx = spriteCanvas.getContext('2d');
      tmpCtx.clearRect(0, 0, 140, 140);
      this.ghostAnim.draw(tmpCtx, 0, 0, 0, 140, 140, false);
    }

    // Click to expand/collapse
    const card = document.getElementById('bst-card');
    card.addEventListener('click', () => card.classList.toggle('expanded'));
  }

  // ─────────────────────────────────────────────────────────────
  //  UI HELPERS
  // ─────────────────────────────────────────────────────────────
  _showRoundResult(text, type) {
    this.$roundResultTxt.textContent = text;
    // Apply win/lose/draw colour class
    this.$roundResult.classList.remove('hidden', 'win', 'lose', 'draw');
    this.$roundResult.classList.add(type);
    clearTimeout(this._roundResultTimeout);
    this._roundResultTimeout = setTimeout(() => this.$roundResult.classList.add('hidden'), 2200);
  }

  _syncPlayerHPBar() {
    const pct = clamp(this.playerHPVisual / PLAYER_MAX_HP, 0, 1) * 100;
    this.$hpPlayerFill.style.width = pct + '%';
    if (pct > 60) this.$hpPlayerFill.style.background = '#0c0';
    else if (pct > 30) this.$hpPlayerFill.style.background = '#cc0';
    else this.$hpPlayerFill.style.background = '#c00';
  }

  _buildEnemyHPBars() {
    this.$enemyHPArea.innerHTML = '';
    for (const e of this.enemyMgr.enemies) {
      const box  = document.createElement('div');
      box.className = `enemy-hp-box${e.active && e.hp > 0 ? '' : ' dead'}`;
      box.dataset.enemyId = this.enemyMgr.enemies.indexOf(e);

      const pct = clamp(e.hpVisual / e.maxHP, 0, 1) * 100;
      const col = pct > 60 ? '#0c0' : pct > 30 ? '#cc0' : '#c00';

      box.innerHTML = `
        <div class="enemy-hp-name">${e.name}</div>
        <div class="enemy-hp-bar-bg">
          <div class="enemy-hp-fill" style="width:${pct}%;background:${col}"></div>
        </div>
      `;
      this.$enemyHPArea.appendChild(box);
    }
  }

  _updateEnemyHPBars() {
    const boxes = this.$enemyHPArea.querySelectorAll('.enemy-hp-box');
    const enemies = this.enemyMgr.enemies;
    for (let i = 0; i < boxes.length && i < enemies.length; i++) {
      const e = enemies[i];
      const fill = boxes[i].querySelector('.enemy-hp-fill');
      if (!fill) continue;
      const pct = clamp(e.hpVisual / e.maxHP, 0, 1) * 100;
      fill.style.width = pct + '%';
      fill.style.background = pct > 60 ? '#0c0' : pct > 30 ? '#cc0' : '#c00';
      boxes[i].classList.toggle('dead', !(e.active && e.hp > 0));
    }
  }

  _updateCoinDisplay() {
    this.$coinAmount.textContent = this.economy.coins;
  }

  _setActionsDisabled(disabled) {
    const btns = this.$battleActions.querySelectorAll('button');
    btns.forEach(b => b.disabled = disabled);
  }

  _openPanel(type) {
    this.menuOpen = type;
    if (type === 'attacks') {
      this.$attackPanel.classList.remove('hidden');
      setTimeout(() => this.$attackPanel.classList.add('open'), 10);
      this.$shopPanel.classList.remove('open');
      setTimeout(() => this.$shopPanel.classList.add('hidden'), 260);
    } else if (type === 'shop') {
      this._refreshShopAffordability();
      this.$shopPanel.classList.remove('hidden');
      setTimeout(() => this.$shopPanel.classList.add('open'), 10);
      this.$attackPanel.classList.remove('open');
      setTimeout(() => this.$attackPanel.classList.add('hidden'), 260);
    }
  }

  _closePanel() {
    this.menuOpen = null;
    this.$attackPanel.classList.remove('open');
    this.$shopPanel.classList.remove('open');
    setTimeout(() => {
      this.$attackPanel.classList.add('hidden');
      this.$shopPanel.classList.add('hidden');
    }, 260);
  }

  // ─────────────────────────────────────────────────────────────
  //  EVENTS
  // ─────────────────────────────────────────────────────────────
  _bindEvents() {
    // Menu
    document.getElementById('btn-play').addEventListener('click', () => this._openSavesModal());
    document.getElementById('btn-saves').addEventListener('click', () => this._openSavesModal());
    document.getElementById('btn-saves-close').addEventListener('click', () => {
      document.getElementById('saves-modal').classList.add('hidden');
    });

    this._bindOptions();

    // Level select nodes
    document.querySelectorAll('.level-node').forEach(btn => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.dataset.level);
        if (lvl === 1) {
          this.$screenLevelSelect.classList.add('hidden');
          this._goToIntro();
        }
      });
    });

    // Intro
    document.getElementById('btn-intro-continue').addEventListener('click', () => this._goToTransition());

    // Dialogue: click or tap anywhere to advance
    this.$screenDialogue.addEventListener('click', () => this._advanceDialogue());

    // Battle actions
    document.getElementById('btn-attacks').addEventListener('click', () => {
      if (this.turnActive) return;
      this.menuOpen === 'attacks' ? this._closePanel() : this._openPanel('attacks');
    });
    document.getElementById('btn-shop').addEventListener('click', () => {
      if (this.turnActive) return;
      this.menuOpen === 'shop' ? this._closePanel() : this._openPanel('shop');
    });
    document.getElementById('btn-bestiary').addEventListener('click', () => {
      if (this.turnActive) return;
      this._openBestiary();
    });

    // Attack buttons
    document.querySelectorAll('.btn-attack').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.turnActive) return;
        const choice = btn.dataset.choice;
        this._processTurn(choice);
      });
    });

    // Close panels
    document.getElementById('btn-close-attack').addEventListener('click', () => this._closePanel());
    document.getElementById('btn-close-shop').addEventListener('click',   () => this._closePanel());

    // Bestiary
    document.getElementById('btn-close-bestiary').addEventListener('click', () => this._closeBestiary());
    document.getElementById('bestiary-modal').addEventListener('click', e => {
      if (e.target === this.$bestiaryModal) this._closeBestiary();
    });
    this.$btnBstPrev.addEventListener('click', () => {
      this.bestiaryPage = Math.max(0, this.bestiaryPage - 1);
      this._renderBestiaryContent();
    });
    this.$btnBstNext.addEventListener('click', () => {
      this.bestiaryPage = Math.min(this.bestiary.types().length - 1, this.bestiaryPage + 1);
      this._renderBestiaryContent();
    });

    // Result
    document.getElementById('btn-restart').addEventListener('click', () => this._goToLevelSelect());

    // Mute toggle
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.bgm.muted = !this.bgm.muted;
      document.getElementById('mute-img').src = this.bgm.muted ? 'mutado-Sheet.png' : 'desmutado.png';
    });

    // Keyboard
    document.addEventListener('keydown', e => this._onKey(e));

    // Resize
    window.addEventListener('resize', () => this._handleResize());
    screen.orientation && screen.orientation.addEventListener('change', () => this._handleResize());
    window.visualViewport && window.visualViewport.addEventListener('resize', () => this._handleResize());
  }

  _onKey(e) {
    if (e.code === 'Escape') {
      if (this.$bestiaryModal && !this.$bestiaryModal.classList.contains('hidden')) { this._closeBestiary(); return; }
      if (this.menuOpen) { this._closePanel(); return; }
    }
    if (e.code === 'Space' && this.state === STATE.INTRO)    { e.preventDefault(); this._goToTransition(); }
    if (e.code === 'Space' && this.state === STATE.DIALOGUE)  { e.preventDefault(); this._advanceDialogue(); }
    if (e.code === 'Enter' && this.state === STATE.DIALOGUE)  { e.preventDefault(); this._advanceDialogue(); }
    if (e.code === 'ArrowLeft'  && !this.$bestiaryModal.classList.contains('hidden')) { this.bestiaryPage = Math.max(0, this.bestiaryPage - 1); this._renderBestiaryContent(); }
    if (e.code === 'ArrowRight' && !this.$bestiaryModal.classList.contains('hidden')) { this.bestiaryPage = Math.min(this.bestiary.types().length - 1, this.bestiaryPage + 1); this._renderBestiaryContent(); }

    // Battle shortcuts
    if (this.state === STATE.BATTLE && !this.turnActive && !this.menuOpen) {
      if (e.code === 'Digit1' || e.code === 'Numpad1') this._processTurn(CHOICE.PEDRA);
      if (e.code === 'Digit2' || e.code === 'Numpad2') this._processTurn(CHOICE.PAPEL);
      if (e.code === 'Digit3' || e.code === 'Numpad3') this._processTurn(CHOICE.TESOURA);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RESPONSIVE SCALING
  // ─────────────────────────────────────────────────────────────
  _handleResize() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width  : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const scaleOpt = this.options?.scale ?? 'fit';
    const isLandscape = vw > vh;
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    let scale;
    if (scaleOpt === 'fit') {
      if (isMobile && isLandscape) {
        // Landscape mobile: fill (sem barras pretas)
        scale = Math.max(vw / GW, vh / GH);
      } else if (isMobile && !isLandscape) {
        // Portrait mobile: 1.5× fit-width para ser legível,
        // limitado por fill-height. Conteúdo central fica visível;
        // bordas esquerda/direita são cortadas (overflow-x: hidden).
        scale = Math.min((vw / GW) * 1.5, vh / GH);
      } else {
        scale = Math.min(vw / GW, vh / GH);
      }
    } else {
      scale = parseFloat(scaleOpt);
    }

    const offX = Math.floor((vw - GW * scale) / 2); // negativo em portrait = clipar bordas
    const offY = isMobile && !isLandscape ? 0 : Math.floor((vh - GH * scale) / 2);

    this.$root.style.transform       = `scale(${scale})`;
    this.$root.style.transformOrigin = 'top left';
    this.$root.style.left            = offX + 'px';
    this.$root.style.top             = offY + 'px';
    this.$root.style.position        = isMobile && !isLandscape ? 'absolute' : 'fixed';
    document.body.style.overflowY    = isMobile && !isLandscape ? 'auto'   : '';
    document.body.style.overflowX    = isMobile && !isLandscape ? 'hidden' : '';
    document.body.style.touchAction  = isMobile && !isLandscape ? 'pan-y'  : '';
  }
}

// ═══════════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  window._game = new JokenGhost();
});
