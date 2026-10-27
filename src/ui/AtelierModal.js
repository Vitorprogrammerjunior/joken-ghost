// Ateliê: editor de pixel art do avatar. A prancheta (domain/pixelArt.js) guarda o desenho
// e as ferramentas; aqui só ligamos ponteiro, teclado e botões a ela e desenhamos a tela.
import { $, h, icon } from './dom.js';
import { avatarEl, paintArt } from './Avatar.js';
import { PixelBoard, TOOLS } from '../domain/pixelArt.js';
import { ART_SIZE, ART_PALETTE, blankArt, isBlankArt, isValidArt } from '../domain/avatar.js';

const DRAFT_KEY = 'jokenghost_atelie_draft';
const TOOL_INFO = {
  pincel: { name: 'Pincel', key: 'B' },
  borracha: { name: 'Borracha', key: 'E' },
  balde: { name: 'Balde', key: 'G' },
  conta_gotas: { name: 'Conta-gotas', key: 'I' },
};
const TOOL_KEYS = { KeyB: 'pincel', KeyE: 'borracha', KeyG: 'balde', KeyI: 'conta_gotas' };

export class AtelierModal {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {import('./Modals.js').Modals} modals
   * @param {import('../net/MultiplayerClient.js').MultiplayerClient} net
   */
  constructor(game, modals, net) {
    this.game = game;
    this.modals = modals;
    this.net = net;
    this.board = new PixelBoard();
    this.tool = 'pincel';
    this.color = 1;
    this.mirror = false;
    this.last = null;      // último pixel do traço (para ligar os pontos)
    this.canvas = $('atelie-board');

    this.#buildTools();
    this.#buildPalette();
    $('atelie-undo').addEventListener('click', () => this.#history('undo'));
    $('atelie-redo').addEventListener('click', () => this.#history('redo'));
    $('atelie-clear').addEventListener('click', () => { this.board.clear(); this.#changed(); });
    $('atelie-mirror').addEventListener('click', () => this.#setMirror(!this.mirror));
    $('atelie-grid-toggle').addEventListener('click', () => this.#toggleGrid());
    $('atelie-save').addEventListener('click', () => this.#save());

    this.canvas.addEventListener('pointerdown', (e) => this.#down(e));
    this.canvas.addEventListener('pointermove', (e) => this.#move(e));
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, () => this.#up());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    game.bus.on('key:modal-atelie', (e) => this.#key(e));
  }

  /** Abre com o rascunho guardado, o desenho atual do perfil ou uma folha em branco. */
  open() {
    const saved = this.net.profile?.avatar?.art;
    this.board = new PixelBoard(this.#draft() ?? (isValidArt(saved) ? saved : blankArt()));
    this.#setTool('pincel');
    this.#render();
    this.game.audio.setWindowMusic('atelie');
    this.modals.open('modal-atelie', { onClose: () => this.game.audio.setWindowMusic(null) });
  }

  // ─── montagem ───
  #buildTools() {
    $('atelie-tools').replaceChildren(...TOOLS.map(id => h('button', {
      class: 'btn btn-icon atelie-tool', dataset: { tool: id }, title: `${TOOL_INFO[id].name} (${TOOL_INFO[id].key})`,
      onclick: () => this.#setTool(id),
    }, icon(`icon/${id}`, 'ico', TOOL_INFO[id].name))));
  }

  #buildPalette() {
    $('atelie-palette').replaceChildren(...ART_PALETTE.map((c, i) => h('button', {
      class: `swatch${c ? '' : ' swatch-clear'}`, dataset: { color: String(i), silent: '' },
      title: c ? c : 'Transparente', style: c ? { background: c } : null,
      onclick: () => this.#setColor(i),
    })));
  }

  // ─── ferramentas ───
  #setTool(id) {
    this.tool = id;
    document.querySelectorAll('.atelie-tool').forEach(b => b.classList.toggle('active', b.dataset.tool === id));
  }

  /** Escolher uma cor volta para uma ferramenta que pinta. */
  #setColor(i) {
    this.color = i;
    if (this.tool !== 'pincel' && this.tool !== 'balde') this.#setTool('pincel');
    this.#syncPalette();
  }

  #syncPalette() {
    document.querySelectorAll('#atelie-palette .swatch').forEach(b => b.classList.toggle('active', Number(b.dataset.color) === this.color));
  }

  #setMirror(on) {
    this.mirror = on;
    $('atelie-mirror').classList.toggle('active', on);
    $('atelie-board-wrap').classList.toggle('mirror', on);
  }

  #toggleGrid() {
    const on = $('atelie-board-wrap').classList.toggle('show-grid');
    $('atelie-grid-toggle').classList.toggle('active', on);
  }

  // ─── ponteiro (mouse, caneta e toque) ───
  /** Pixel sob o ponteiro, em qualquer escala da tela. */
  #cell(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * ART_SIZE),
      y: Math.floor(((e.clientY - r.top) / r.height) * ART_SIZE),
    };
  }

  #down(e) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.#cell(e);
    if (!this.board.inside(x, y)) return;
    if (this.tool === 'conta_gotas') { this.#setColor(this.board.colorAt(x, y)); return; }
    this.board.begin();
    if (this.tool === 'balde') {
      this.board.fill(x, y, this.color);
      this.#up();
      return;
    }
    this.board.paint(x, y, this.#ink(), { mirror: this.mirror });
    this.last = { x, y };
    this.#paint();
  }

  #move(e) {
    if (!this.last) return;
    const { x, y } = this.#cell(e);
    if (x === this.last.x && y === this.last.y) return;
    if (this.board.line(this.last.x, this.last.y, x, y, this.#ink(), { mirror: this.mirror })) this.#paint();
    this.last = { x, y };
  }

  #up() {
    this.last = null;
    if (!this.board.stroke) return;
    this.board.end();
    this.#changed();
  }

  #ink() { return this.tool === 'borracha' ? 0 : this.color; }

  #history(dir) { if (this.board[dir]()) this.#changed(); }

  #key(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === 'KeyZ') { e.preventDefault(); this.#history(e.shiftKey ? 'redo' : 'undo'); return; }
    if (ctrl && e.code === 'KeyY') { e.preventDefault(); this.#history('redo'); return; }
    if (ctrl) return;
    if (TOOL_KEYS[e.code]) this.#setTool(TOOL_KEYS[e.code]);
    else if (e.code === 'KeyM') this.#setMirror(!this.mirror);
  }

  // ─── tela ───
  /** Depois de cada traço: guarda o rascunho e atualiza botões e prévias. */
  #changed() {
    this.#saveDraft();
    this.#render();
  }

  #paint() { paintArt(this.canvas, this.board.art); }

  #render() {
    this.#paint();
    this.#syncPalette();
    $('atelie-undo').disabled = !this.board.canUndo;
    $('atelie-redo').disabled = !this.board.canRedo;
    const look = { avatar: { kind: 'art', art: this.board.art }, frame: this.net.profile?.equipped.frame ?? null };
    $('atelie-previews').replaceChildren(
      avatarEl(this.game.assets, look, { size: 96 }),
      avatarEl(this.game.assets, look, { size: 48 }),
    );
  }

  #save() {
    const art = this.board.art;
    if (isBlankArt(art)) {
      this.game.bus.emit('toast', 'Desenhe alguma coisa antes de salvar.');
      this.game.audio.play('error');
      return;
    }
    this.net.setAvatar({ kind: 'art', art });
    this.#clearDraft();
    this.modals.close('modal-atelie');
    this.game.bus.emit('toast', 'Avatar salvo! Todo mundo na Arena vai ver o seu desenho.');
  }

  // ─── rascunho local (não perde o desenho se fechar sem salvar) ───
  #draft() {
    const art = this.game.storage.getItem(DRAFT_KEY);
    return isValidArt(art) ? art : null;
  }

  #saveDraft() { this.game.storage.setItem(DRAFT_KEY, this.board.art); }
  #clearDraft() { this.game.storage.removeItem(DRAFT_KEY); }
}
