// Áudio do comercial: a trilha (trailer.scrim, tocada pelo sintetizador do jogo) mixada com os
// efeitos sonoros do jogo nos momentos do roteiro. Tudo renderizado offline, sem tocar nada.
import '../../../src/vendor/scrimshaw/score.js';
import '../../../src/vendor/scrimshaw/synth.js';
import { SFX, scheduleSfx, createNoiseBuffer } from '../../../src/core/Audio.js';

const RATE = 48000;
const MUSIC_GAIN = 0.85;
const SFX_GAIN = 0.5;
const IMPACT_GAIN = 0.9;
const FADE_OUT = 0.6;   // s no fim

/**
 * @param {number} duration  segundos
 * @param {[number, string][]} cues  [tempo, efeito]; 'impact' é o sample de impacto do jogo
 * @returns {Promise<AudioBuffer>}
 */
export async function renderSoundtrack(duration, cues) {
  const score = await fetch('tools/trailer/trailer.scrim').then(r => r.text());
  const song = self.ScrimScore.compile(score);
  if (song.errors.length) throw new Error(`Partitura: ${song.errors.map(e => `linha ${e.line}: ${e.msg}`).join('; ')}`);
  const music = await self.ScrimSynth.renderOffline(song, duration + 1, RATE);

  const ctx = new OfflineAudioContext(2, Math.ceil(duration * RATE), RATE);
  const master = ctx.createGain();
  master.gain.setValueAtTime(1, duration - FADE_OUT);
  master.gain.linearRampToValueAtTime(0, duration);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  master.connect(limiter).connect(ctx.destination);

  const track = ctx.createBufferSource();
  track.buffer = music;
  const musicGain = ctx.createGain();
  musicGain.gain.value = MUSIC_GAIN;
  track.connect(musicGain).connect(master);
  track.start(0);

  const sfx = ctx.createGain();
  sfx.gain.value = SFX_GAIN;
  sfx.connect(master);
  const noise = createNoiseBuffer(ctx);
  const impact = await fetch('assets/audio/impact.mp3').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b));
  for (const [t, name] of cues) {
    if (name === 'impact') {
      const src = ctx.createBufferSource();
      src.buffer = impact;
      const g = ctx.createGain();
      g.gain.value = IMPACT_GAIN;
      src.connect(g).connect(master);
      src.start(t);
    } else {
      scheduleSfx(ctx, sfx, SFX[name], t, { noise });
    }
  }
  return ctx.startRendering();
}

/** AudioBuffer -> arquivo WAV (PCM 16 bits). */
export function toWav(buffer) {
  const channels = buffer.numberOfChannels, frames = buffer.length;
  const bytes = 44 + frames * channels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, bytes - 8, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}
