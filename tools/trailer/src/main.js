// Página do comercial: prévia com som, linha do tempo e exportação quadro a quadro.
// A exportação manda cada quadro (PNG) e o áudio (WAV) para o capture.py, que monta o MP4.
import { Assets } from '../../../src/core/Assets.js';
import { Stage } from './stage.js';
import { renderFrame, DURATION, CUES } from './scenes.js';
import { renderSoundtrack, toWav } from './sound.js';

const FPS = 30;
// 127.0.0.1 e não localhost: no Windows o navegador tenta IPv6 antes e perde ~2s em cada envio
const CAPTURE = 'http://127.0.0.1:5199';
const $ = (id) => document.getElementById(id);

const canvas = $('stage');
const assets = new Assets();
let stage = null;
let soundtrack = null;
let playing = null;   // { ctx, source, startedAt }

const status = (text) => { $('status').textContent = text; };

function draw(t) {
  renderFrame(stage, t);
  $('time').value = String(t);
  $('clock').textContent = `${t.toFixed(2)}s`;
}

async function sound() {
  soundtrack ??= await renderSoundtrack(DURATION, CUES);
  return soundtrack;
}

// ─── prévia ───
async function play() {
  if (playing) return stop();
  status('Preparando o som...');
  const buffer = await sound();
  const ctx = new AudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  const from = Number($('time').value) >= DURATION - 0.1 ? 0 : Number($('time').value);
  source.start(0, from);
  playing = { ctx, source, startedAt: ctx.currentTime - from };
  $('play').textContent = 'PARAR';
  status('Tocando');
  const tick = () => {
    if (!playing) return;
    const t = playing.ctx.currentTime - playing.startedAt;
    if (t >= DURATION) { stop(); draw(DURATION - 1 / FPS); return; }
    draw(t);
    requestAnimationFrame(tick);
  };
  tick();
}

function stop() {
  if (!playing) return;
  playing.source.stop();
  playing.ctx.close();
  playing = null;
  $('play').textContent = 'PRÉVIA';
  status('Parado');
}

// ─── exportação ───
const RETRIES = 3;

/** Envia ao capture.py; tenta de novo se a conexão falhar no meio (o quadro é o mesmo). */
async function post(path, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${CAPTURE}${path}`, { method: 'POST', body });
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return await r.json();
    } catch (err) {
      if (attempt >= RETRIES) throw err;
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }
}

const pngOf = () => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

/** Renderiza os 900 quadros e o áudio e pede o MP4 ao capture.py. Retorna o caminho do vídeo. */
async function exportVideo() {
  stop();
  status('Conferindo o capture.py...');
  await fetch(`${CAPTURE}/ping`).catch(() => { throw new Error('Rode antes: python tools/trailer/capture.py'); });
  await post('/start', '');
  status('Renderizando o áudio...');
  await post('/audio', toWav(await sound()));
  const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) {
    draw(i / FPS);
    await post(`/frame?i=${i}`, await pngOf());
    if (i % 15 === 0) status(`Quadro ${i + 1} de ${total}`);
  }
  draw(28.6);   // a capa: a chamada final já completa
  await post('/cover', await pngOf());
  status('Montando o MP4...');
  const { file } = await post('/finish', '');
  status(`Pronto: ${file}`);
  return file;
}

async function boot() {
  await assets.loadAll(() => {});
  await document.fonts.load('48px JokenPixel');
  stage = new Stage(canvas, assets);
  $('time').max = String(DURATION);
  $('time').step = String(1 / FPS);
  $('time').addEventListener('input', () => { if (!playing) draw(Number($('time').value)); });
  $('play').addEventListener('click', play);
  $('export').addEventListener('click', () => exportVideo().catch((e) => status(`Erro: ${e.message}`)));
  draw(0);
  status('Pronto');
  window.__trailer = { draw, exportVideo, duration: DURATION, fps: FPS };
  // ?export: exporta sozinho (para rodar num Chrome headless, sem a aba ser desacelerada)
  if (new URLSearchParams(location.search).has('export')) await exportVideo();
}

boot().catch((e) => status(`Erro: ${e.message}`));
