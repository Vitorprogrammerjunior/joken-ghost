// Ponto de entrada: monta os serviços, a interface e as cenas.
import { Assets } from './core/Assets.js';
import { Game } from './core/Game.js';
import { Modals } from './ui/Modals.js';
import { Toasts } from './ui/Toast.js';
import { OptionsModal } from './ui/OptionsModal.js';
import { SavesModal } from './ui/SavesModal.js';
import { BestiaryModal } from './ui/BestiaryModal.js';
import { CampaignModals } from './ui/CampaignModals.js';
import { RelicModal } from './ui/RelicModal.js';
import { DailyPanel } from './ui/DailyPanel.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MapScene } from './scenes/MapScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { DuelScene } from './scenes/DuelScene.js';
import { RaidScene } from './scenes/RaidScene.js';
import { MultiplayerClient } from './net/MultiplayerClient.js';
import { ArenaModals } from './ui/ArenaModals.js';
import { $ } from './ui/dom.js';

async function boot() {
  const assets = new Assets();
  const game = new Game({ assets });

  await assets.loadAll((p) => { $('loading-fill').style.width = `${Math.round(p * 100)}%`; });

  const modals = new Modals(game);
  const ui = {
    modals,
    toasts: new Toasts(game),
    options: new OptionsModal(game, modals),
    saves: new SavesModal(game, modals),
    bestiary: new BestiaryModal(game, modals),
    campaign: new CampaignModals(game, modals),
    relics: new RelicModal(game, modals),
  };
  const net = new MultiplayerClient(game.storage);
  ui.arena = new ArenaModals(game, modals, net);
  ui.daily = new DailyPanel(game, modals, net);
  game.bus.on('toast', (text) => ui.toasts.show(text, { force: true }));

  game.register('menu', new MenuScene(game, ui));
  game.register('map', new MapScene(game, ui));
  game.register('story', new StoryScene(game));
  game.register('dialogue', new DialogueScene(game));
  game.register('battle', new BattleScene(game, ui));
  game.register('result', new ResultScene(game, ui));
  game.register('lobby', new LobbyScene(game, ui, net));
  game.register('duel', new DuelScene(game, ui, net));
  game.register('raid', new RaidScene(game, ui, net));

  // moedas aparecem em vários lugares da interface
  const syncCoins = (c) => document.querySelectorAll('.coin-value').forEach((el) => { el.textContent = c; });
  game.bus.on('coins', syncCoins);
  syncCoins(game.economy.coins);

  // começar a música no primeiro gesto (regra dos navegadores)
  const firstGesture = () => game.audio.unlock();
  window.addEventListener('pointerdown', firstGesture, { once: true });
  window.addEventListener('keydown', firstGesture, { once: true });

  $('rotate-dismiss').addEventListener('click', () => document.body.classList.add('rotate-dismissed'));

  $('screen-loading').classList.add('hidden');
  const room = new URLSearchParams(location.search).get('room');
  game.start(room ? 'lobby' : 'menu', room ? { room: room.toUpperCase() } : undefined);

  window.__jokenghost = game; // ajuda a depurar pelo console
}

boot().catch((err) => {
  console.error(err);
  const t = document.querySelector('.loading-text');
  if (t) t.textContent = 'Erro ao carregar o jogo. Recarregue a página.';
});
