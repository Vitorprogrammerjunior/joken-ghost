// Núcleo: loop principal, troca de cenas e serviços compartilhados.
import { Renderer } from './Renderer.js';
import { Viewport } from './Viewport.js';
import { AudioManager } from './Audio.js';
import { EventBus } from './EventBus.js';
import { storage } from './Storage.js';
import { Economy } from '../domain/economy.js';
import { SaveManager } from '../domain/progress.js';
import { loadOptions, saveOptions } from '../domain/options.js';

const MAX_DT = 50;

export class Game {
  /** @param {{ assets: import('./Assets.js').Assets }} deps */
  constructor({ assets }) {
    this.root = document.getElementById('game-root');
    this.canvas = document.getElementById('game-canvas');
    this.fadeEl = document.getElementById('fade');

    this.assets = assets;
    this.storage = storage;
    this.options = loadOptions(storage);
    this.bus = new EventBus();
    this.renderer = new Renderer(this.canvas, assets);
    this.viewport = new Viewport(this.root, () => this.options);
    this.audio = new AudioManager(this.options);
    this.saves = new SaveManager(storage);
    this.economy = new Economy(0);
    this.profile = null;

    /** @type {Record<string, import('./Scene.js').Scene>} */
    this.scenes = {};
    this.scene = null;
    this.transitioning = false;
    this.modalOpen = 0;
    this.lastTs = 0;
    this.timeScale = 1; // câmera lenta para depuração (ex.: 0.2)

    this.economy.onChange((coins) => {
      if (this.profile) { this.profile.coins = coins; this.saveProfile(); }
      this.bus.emit('coins', coins);
    });

    this.#bindInput();
  }

  register(name, scene) { this.scenes[name] = scene; }

  start(name, params) {
    this.scene = this.scenes[name];
    this.scene._enter(params);
    requestAnimationFrame((ts) => { this.lastTs = ts; this.#loop(ts); });
  }

  /** Troca de cena com fade preto. */
  async go(name, params = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    try {
      await this.fade(1);
      this.scene?._exit();
      this.scene = this.scenes[name];
      this.scene._enter(params);
    } catch (err) {
      console.error(`Erro ao abrir a cena "${name}":`, err);
    } finally {
      await this.fade(0);
      this.transitioning = false;
    }
  }

  fade(to, ms = 280) {
    this.fadeEl.style.transitionDuration = `${ms}ms`;
    this.fadeEl.style.opacity = String(to);
    return new Promise((r) => setTimeout(r, ms));
  }

  // ─── perfil / save ────────────────────────────────────────────
  useProfile(profile) {
    this.profile = profile;
    this.economy.set(profile.coins);
    this.saveProfile();
  }

  saveProfile() {
    if (this.profile) this.saves.save(this.profile);
  }

  setOption(key, value) {
    this.options[key] = value;
    saveOptions(this.storage, this.options);
    this.audio.applyVolumes();
    if (key === 'pixelPerfect') this.viewport.fit();
    this.bus.emit('options', this.options);
  }

  // ─── loop ─────────────────────────────────────────────────────
  #loop(ts) {
    const dt = Math.min(MAX_DT, ts - this.lastTs) * this.timeScale;
    this.lastTs = ts;
    const s = this.scene;
    if (s) {
      if (!s.paused) s.update(dt);
      this.renderer.begin();
      s.render(this.renderer);
    }
    requestAnimationFrame((t) => this.#loop(t));
  }

  // ─── entrada ──────────────────────────────────────────────────
  #bindInput() {
    const unlock = () => { this.audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    window.addEventListener('keydown', (e) => {
      if (this.transitioning) return;
      if (this.modalOpen) { this.bus.emit('modal-key', e); return; }
      if (this.scene?.onKey(e)) e.preventDefault();
    });

    const pointer = (type) => (e) => {
      if (this.modalOpen || this.transitioning) return;
      const { x, y } = this.viewport.toGame(e.clientX, e.clientY);
      this.scene?.onPointer(type, x, y, e);
    };
    this.canvas.addEventListener('pointerdown', pointer('down'));
    this.canvas.addEventListener('pointermove', pointer('move'));

    // som de clique em todos os botões
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && !btn.disabled && !btn.dataset.silent) this.audio.play('click');
    });
    // pausa automática ao trocar de aba
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.audio.stopMusic(); this.bus.emit('blur'); }
      else if (this.profile || this.scene) this.audio.playMusic();
    });
  }
}
