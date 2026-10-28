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
import { NowPlaying } from './ui/NowPlaying.js';
import { MusicToggle } from './ui/MusicToggle.js';
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
import { CloudSync } from './net/CloudSync.js';
import { ArenaModals } from './ui/ArenaModals.js';
import { AccountModal } from './ui/AccountModal.js';
import { $ } from './ui/dom.js';

async function boot() {
  const assets = new Assets();
  const game = new Game({ assets });

  await assets.loadAll((p) => { $('loading-fill').style.width = `${Math.round(p * 100)}%`; });

  const modals = new Modals(game);
  const net = new MultiplayerClient(game.storage);
  const cloud = new CloudSync(game, net);
  const ui = {
    modals,
    toasts: new Toasts(game),
    nowPlaying: new NowPlaying(game),
    musicToggle: new MusicToggle(game),
    options: new OptionsModal(game, modals),
    saves: new SavesModal(game, modals, cloud),
    account: new AccountModal(game, modals, net, cloud),
    bestiary: new BestiaryModal(game, modals),
    campaign: new CampaignModals(game, modals),
    relics: new RelicModal(game, modals),
  };
  ui.arena = new ArenaModals(game, modals, net);
  ui.daily = new DailyPanel(game, modals, net);
  game.bus.on('toast', (text) => ui.toasts.show(text, { force: true }));
  net.on('account', () => game.bus.emit('account-changed'));
  // a sessão acabou em outro aparelho (saiu ou apagou a conta): volta a ser convidado
  net.on('logged_out', () => {
    cloud.forget();
    game.profile = null;
    ui.toasts.show('Sua sessão terminou. Entre de novo para usar sua conta.', { force: true });
  });

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

  resumeAccount(net, cloud, ui);
}

const LOGIN_MESSAGES = {
  linked: 'Conta conectada! Seu progresso de convidado agora é da sua conta.',
  added: 'Login ligado à sua conta.',
  created: 'Conta criada! Seu progresso agora fica salvo na nuvem.',
  existing: 'Bem-vindo de volta! Você entrou na sua conta.',
};

/** Ao abrir o jogo: termina o login (se voltou do Google/Discord) e sincroniza a campanha. */
async function resumeAccount(net, cloud, ui) {
  let back = null;
  try {
    back = await net.finishLogin();
  } catch {
    ui.toasts.show('O login expirou. Tente de novo.', { force: true });
  }
  if (back?.error) ui.toasts.show(back.error === 'cancelado' ? 'Login cancelado.' : 'Não deu para entrar agora. Tente de novo.', { force: true });
  else if (back) ui.toasts.show(LOGIN_MESSAGES[back.outcome] ?? LOGIN_MESSAGES.existing, { force: true });
  if (!net.loggedIn) return;
  // o servidor grátis pode estar dormindo: espera acordar sem travar o jogo
  try { await net.wake(); } catch { return; }
  if (!back) await net.refreshAccount().catch(() => {});
  cloud.sync();
}

boot().catch((err) => {
  console.error(err);
  const t = document.querySelector('.loading-text');
  if (t) t.textContent = 'Erro ao carregar o jogo. Recarregue a página.';
});
