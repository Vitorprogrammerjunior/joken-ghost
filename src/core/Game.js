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
    this.audio.onTrack = (track) => this.bus.emit('track', track);
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
    this.#enter(name, params);
    requestAnimationFrame((ts) => { this.lastTs = ts; this.#loop(ts); });
  }

  /** Troca de cena com fade preto. */
  async go(name, params = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    try {
      await this.fade(1);
      this.scene?._exit();
      this.#enter(name, params);
    } catch (err) {
      console.error(`Erro ao abrir a cena "${name}":`, err);
    } finally {
      await this.fade(0);
      this.transitioning = false;
    }
  }

  /** A trilha da cena começa antes de ela montar a tela: um erro ao montar não deixa a música antiga tocando. */
  #enter(name, params) {
    this.scene = this.scenes[name];
    this.viewport.setPortraitAllowed(!!this.scene.portrait);
    const track = this.scene.music(params);
    if (track) this.audio.playMusic(track);
    this.scene._enter(params);
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
    if (this.profile && this.saves.save(this.profile)) this.bus.emit('saved', this.profile); // a nuvem escuta (CloudSync)
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
    // agenda o próximo quadro antes: um erro numa cena não pode congelar o jogo inteiro
    requestAnimationFrame((t) => this.#loop(t));
    const s = this.scene;
    if (!s) return;
    try {
      if (!s.paused) s.update(dt);
      this.renderer.begin();
      s.render(this.renderer);
      this.loopError = null;
    } catch (err) {
      if (!this.loopError) console.error('Erro no quadro:', err); // avisa uma vez, não 60 por segundo
      this.loopError = err;
    }
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
      if (document.hidden) { this.audio.suspend(); this.bus.emit('blur'); }
      else this.audio.resume();
    });
  }
}
