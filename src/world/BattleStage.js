// Palco de batalha em perspectiva, no estilo Pokémon: o jogador de costas em primeiro
// plano (embaixo, à esquerda) e os monstros ao fundo (no alto, à direita), cada lado
// sobre uma plataforma oval. O chão recua até o horizonte.
import { Renderer, GW, GH, PX } from '../core/Renderer.js';
import { Particles } from '../core/Particles.js';
import { bandedGradient, glow, seededRandom } from './Scenery.js';

export const HORIZON = 300;
const T = 64 * PX;

/** Onde cada lado fica (coordenadas de tela, pés dos personagens). */
export const LAYOUT = {
  player: { x: 300, y: 566, scale: 3, platform: { x: 310, y: 586, scale: 7 } },
  enemyPlatform: { x: 930, y: 362, scale: 6 },
  enemySlots: [
    { x: 930, y: 354 },
    { x: 796, y: 368 },
    { x: 1064, y: 364 },
  ],
  boss: { x: 930, y: 366 },
};

// ─── chão em perspectiva ──────────────────────────────────────
const VP = { x: 640, y: 40 };   // ponto de fuga (acima do horizonte = visão 3/4)

/** x de uma linha do chão que nasce em `xb` (na base da tela) quando está na altura y. */
const project = (xb, y) => VP.x + (xb - VP.x) * (y - VP.y) / (GH - VP.y);

/** Linhas que convergem para o ponto de fuga (rejunte, tábuas...). */
function convergingLines(r, { spacing, color, alpha = 1, from = HORIZON, offset = 0 }) {
  const ctx = r.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let xb = -1600 + offset; xb < GW + 1600; xb += spacing) {
    for (let y = from; y < GH; y += PX) {
      const x = project(xb, y);
      if (x >= -PX && x <= GW) ctx.fillRect(Math.round(x / PX) * PX, y, PX, PX);
    }
  }
  ctx.restore();
}

/** Alturas das fileiras do chão: ficam maiores perto da câmera. */
function rowLines(n, from = HORIZON) {
  const ys = [];
  for (let i = 1; i <= n; i++) ys.push(Math.round((from + (GH - from) * Math.pow(i / n, 1.7)) / PX) * PX);
  return ys;
}

/** Faixa trapezoidal (trilha/tapete) que vem do horizonte até a câmera. */
function trapezoid(r, { top, bottom, color, border = null, borderW = 4 }) {
  const ctx = r.ctx;
  for (let y = HORIZON; y < GH; y += PX) {
    const k = (y - HORIZON) / (GH - HORIZON);
    const half = Math.round((top + (bottom - top) * k) / PX) * PX;
    ctx.fillStyle = color;
    ctx.fillRect(GW / 2 - half, y, half * 2, PX);
    if (border) {
      ctx.fillStyle = border;
      const bw = Math.max(PX, Math.round(borderW * (0.4 + k) / PX) * PX);
      ctx.fillRect(GW / 2 - half, y, bw, PX);
      ctx.fillRect(GW / 2 + half - bw, y, bw, PX);
    }
  }
}

/** Tufos de grama/pedrinhas maiores perto da câmera. */
function scatter(r, rand, n, colors, { minY = HORIZON + 8, kind = 'tuft' } = {}) {
  for (let i = 0; i < n; i++) {
    const y = minY + Math.pow(rand(), 0.8) * (GH - minY);
    const k = (y - HORIZON) / (GH - HORIZON);
    const x = rand() * GW;
    const s = Math.max(1, Math.round(1 + k * 2)) * PX;
    const c = colors[Math.floor(rand() * colors.length)];
    if (kind === 'tuft') {
      r.rect(x, y - s * 2, s, s * 2, c);
      r.rect(x - s, y - s, s, s, c);
      r.rect(x + s, y - s * 1.5, s, s * 1.5, c);
    } else r.rect(x, y, s * 2, s, c);
  }
}

/** Salão de ossos (catacumbas e cripta): parede de crânios, pilares e piso de pedra. */
function bakeBoneHall(r, rand, { floor = ['#1c1729', '#2f2a3d', '#3c3750', '#4a4559'] } = {}) {
  for (let y = -84; y < HORIZON; y += T) r.tileRow('tile/bone_wall', y);
  for (const x of [40, 1112]) for (let y = -84; y < HORIZON; y += T) r.sprite('tile/pillar', 0, x, y, { anchor: 'topleft' });
  r.sprite('tile/cobweb', 0, 168, 0, { anchor: 'topleft' });
  r.sprite('tile/cobweb', 0, 984, 0, { anchor: 'topleft', flipX: true });
  bandedGradient(r, HORIZON - 6, HORIZON + 6, ['#0e0b16', '#1c1729'], 4);
  bandedGradient(r, HORIZON, GH, floor, 8);
  for (const y of rowLines(10)) r.rect(0, y, GW, PX, '#0e0b16');
  convergingLines(r, { spacing: 150, color: '#0e0b16' });
  scatter(r, rand, 40, ['#c4b4c4', '#8a7a8e'], { kind: 'pebble' });
  r.sprite('tile/coffin', 0, -30, 470, { anchor: 'topleft', scale: 3 });
  r.sprite('tile/skulls', 0, 1100, 520, { anchor: 'topleft', scale: 3, flipX: true });
}

/** Tochas nas paredes do salão de ossos, com a cor da chama. */
function animateTorches(s, r, rgb) {
  for (const x of [250, 900]) {
    const f = Math.floor(s.t / 120) % 4;
    glow(r, x + 64, 150, 170 + (f % 2) * 10, rgb, 0.25);
    r.sprite('tile/torch', f, x, 90, { anchor: 'topleft' });
  }
}

const KINDS = {
  // ═══════════════ Floresta Maldita ═══════════════
  floresta: {
    platform: 'tile/plat_grama',
    bake(r, rand) {
      bandedGradient(r, 0, HORIZON, ['#070a1c', '#0f1a36', '#1a3149', '#22484f']);
      for (let i = 0; i < 70; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 90) * PX, PX, PX, '#dbe8ff', 0.3 + rand() * 0.5);
      r.sprite('tile/moon', 0, 1040, 90);
      r.sprite('tile/mansion_far', 0, 600, 150, { anchor: 'topleft' });
      r.tileRow('tile/tree_far', HORIZON - T, { offset: 40 });
      bandedGradient(r, HORIZON, GH, ['#0f2a1c', '#16301f', '#1f4a2c', '#275a33'], 8);
      for (const y of rowLines(14)) r.rect(0, y, GW, PX, '#0b2016', 0.5);
      trapezoid(r, { top: 30, bottom: 420, color: '#3b2716' });
      scatter(r, rand, 80, ['#6b4029', '#4e2e1c'], { kind: 'pebble', minY: HORIZON + 4 });
      scatter(r, rand, 260, ['#2f7a3e', '#5fb24a', '#1b4a30']);
      // árvores grandes emoldurando (primeiro plano)
      for (const x of [-60, 1130]) {
        for (let y = -60; y < 420; y += T) r.sprite('tile/tree_trunk', 0, x, y, { anchor: 'topleft' });
        r.sprite('tile/tree_roots', 0, x, 420, { anchor: 'topleft' });
      }
      for (const [x, y] of [[-130, -60], [-20, -90], [-80, 30], [1050, -70], [1170, -50], [1120, 40]]) {
        r.sprite('tile/tree_crown', 0, x, y, { anchor: 'topleft' });
      }
      r.sprite('tile/bush', 0, 140, HORIZON - 70, { anchor: 'topleft', scale: 1 });
      r.sprite('tile/bush', 0, 1000, HORIZON - 70, { anchor: 'topleft', scale: 1 });
      r.sprite('tile/gravestone', 0, 520, HORIZON - 56, { anchor: 'topleft', scale: 1 });
      r.sprite('tile/mushrooms', 0, 40, 560, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/mushrooms', 0, 1080, 470, { anchor: 'topleft' });
    },
    animate(s, r) {
      for (let i = 0; i < 3; i++) {
        const x = ((s.t * 0.006 + i * 520) % (GW + 300)) - 200;
        r.sprite('tile/cloud', 0, x, 20 + i * 40, { anchor: 'topleft', alpha: 0.5 });
      }
      r.tileRow('tile/fog', HORIZON - 90, { offset: -s.t * 0.02, alpha: 0.6 });
      if (Math.random() < 0.08) {
        s.particles.spawn({ x: Math.random() * GW, y: HORIZON + Math.random() * 380, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 3000 + Math.random() * 3000, color: Math.random() > 0.5 ? '#e2ffb0' : '#fff3a6', glow: true, wobble: 25, seed: Math.random() * 10 });
      }
    },
    front(s, r) { r.tileRow('tile/fog', 610, { offset: s.t * 0.035, alpha: 0.25 }); },
  },

  // ═══════════════ Pátio da Mansão ═══════════════
  patio: {
    platform: 'tile/plat_pedra',
    bake(r, rand) {
      bandedGradient(r, 0, 120, ['#0b0618', '#1b0e33', '#321a4a']);
      for (let i = 0; i < 40; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 30) * PX, PX, PX, '#dbe8ff', 0.3 + rand() * 0.5);
      r.sprite('tile/moon', 0, 200, 50, { scale: 1 });
      r.ctx.fillStyle = '#1e0f33';
      r.ctx.beginPath();
      r.ctx.moveTo(0, 60);
      for (const [x, y] of [[120, 60], [220, 0], [320, 60], [540, 60], [640, -10], [740, 60], [960, 60], [1060, 0], [1160, 60], [GW, 60]]) r.ctx.lineTo(x, y);
      r.ctx.lineTo(GW, 70); r.ctx.lineTo(0, 70);
      r.ctx.fill();
      r.tileRow('tile/wall_stone', 60);
      r.tileRow('tile/wall_stone', 188, { x1: GW });
      r.rect(0, 58, GW, 4, '#0e0b16');
      // porta ao fundo
      r.rect(600, 150, 80, 110, '#0e0b16');
      r.rect(606, 156, 68, 104, '#43271a');
      r.rect(638, 156, 4, 104, '#22140f');
      r.tileRow('tile/hedge', HORIZON - T + 20, { offset: 30 });
      r.tileRow('tile/fence', HORIZON - T + 20);
      bandedGradient(r, HORIZON, GH, ['#262833', '#2f3240', '#3c3f4f', '#4a4e5f'], 8);
      for (const y of rowLines(16)) r.rect(0, y, GW, PX, '#1c1729', 0.8);
      convergingLines(r, { spacing: 110, color: '#1c1729', alpha: 0.8 });
      convergingLines(r, { spacing: 110, offset: 55, color: '#5a5e70', alpha: 0.25 });
      scatter(r, rand, 70, ['#1b4a30', '#2f7a3e'], { kind: 'pebble' });
      r.sprite('tile/dead_tree', 0, -40, 330, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/dead_tree', 0, 1110, 330, { anchor: 'topleft', scale: 3, flipX: true });
    },
    animate(s, r) {
      const frame = (k) => (Math.floor(s.t / 900 + k * 7.3) % 7 === 0 ? 3 : Math.floor(s.t / 220 + k) % 3);
      for (const [x, k] of [[90, 0], [330, 1], [830, 2], [1070, 3]]) r.sprite('tile/window_lit', frame(k), x, 70, { anchor: 'topleft' });
      for (const x of [170, 990]) {
        const f = Math.floor(s.t / 160) % 4;
        glow(r, x + 64, HORIZON - 100, 90 + (f % 2) * 6, '255,192,77', 0.28);
        r.sprite('tile/lamp', f, x, HORIZON - T, { anchor: 'topleft' });
      }
      for (let i = 0; i < 3; i++) {
        const x = ((s.t * (0.05 + i * 0.02) + i * 400) % (GW + 200)) - 100;
        r.sprite('enemy/morcego/idle', s.t / 120 + i, x, 30 + i * 18 + Math.sin(s.t / 300 + i) * 6, { scale: 1, alpha: 0.6, tint: '#0e0b16', tintAlpha: 0.8 });
      }
    },
    front(s, r) { r.tileRow('tile/fog', 620, { offset: s.t * 0.03, alpha: 0.3 }); },
  },

  // ═══════════════ Interior da Mansão ═══════════════
  mansao: {
    platform: 'tile/plat_tapete',
    bake(r) {
      for (let y = -84; y < HORIZON - T; y += T) r.tileRow('tile/wallpaper', y);
      r.tileRow('tile/wainscot', HORIZON - T);
      r.sprite('tile/window_moon', 0, 120, 0, { anchor: 'topleft' });
      r.sprite('tile/window_moon', 0, 1030, 0, { anchor: 'topleft' });
      r.sprite('tile/portrait', 0, 576, -6, { anchor: 'topleft' });
      // piso de tábuas
      bandedGradient(r, HORIZON, GH, ['#2a1810', '#43271a', '#5a3522', '#6b4029'], 8);
      convergingLines(r, { spacing: 90, color: '#22140f' });
      const rows = rowLines(12);
      rows.forEach((y, i) => {
        for (let j = -20; j < 40; j++) {
          if ((i + j) % 3 !== 0) continue;
          const x0 = project(-1600 + j * 90, y), x1 = project(-1600 + (j + 1) * 90, y);
          r.rect(x0, y, x1 - x0, PX, '#22140f');
        }
      });
      trapezoid(r, { top: 70, bottom: 470, color: '#8e1a2e', border: '#cf9a22', borderW: 10 });
      r.sprite('tile/bookshelf', 0, -20, 340, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/bookshelf', 0, 1110, 340, { anchor: 'topleft', scale: 3 });
      r.ctx.fillStyle = 'rgba(184,208,255,0.06)';
      for (const x of [184, 1094]) {
        r.ctx.beginPath();
        r.ctx.moveTo(x - 30, 100); r.ctx.lineTo(x + 30, 100); r.ctx.lineTo(x + 200, 560); r.ctx.lineTo(x + 40, 560);
        r.ctx.fill();
      }
    },
    animate(s, r) {
      for (const x of [370, 846]) {
        const f = Math.floor(s.t / 150) % 4;
        glow(r, x + 64, HORIZON - T + 30, 110 + (f % 2) * 8, '255,192,77', 0.22);
        r.sprite('tile/candelabra', f, x, HORIZON - T * 2 + 6, { anchor: 'topleft' });
      }
      if (Math.random() < 0.05) {
        s.particles.spawn({ x: Math.random() * GW, y: 100 + Math.random() * 450, vx: 8, vy: -4, life: 4000, color: '#eadde6', wobble: 10, seed: Math.random() * 10 });
      }
    },
    front() {},
  },

  // ═══════════════ Câmara do Mal ═══════════════
  camara: {
    platform: 'tile/plat_runa',
    bake(r) {
      for (let y = -84; y < HORIZON; y += T) r.tileRow('tile/brick_dark', y);
      for (const x of [60, 380, 772, 1092]) for (let y = -84; y < HORIZON; y += T) r.sprite('tile/pillar', 0, x, y, { anchor: 'topleft' });
      r.sprite('tile/banner', 0, 576, 0, { anchor: 'topleft' });
      r.sprite('tile/chains', 0, 250, -20, { anchor: 'topleft' });
      r.sprite('tile/chains', 0, 900, -20, { anchor: 'topleft' });
      bandedGradient(r, HORIZON - 6, HORIZON + 6, ['#0e0b16', '#1c1729'], 4);
      bandedGradient(r, HORIZON, GH, ['#1c1729', '#2f2a3d', '#3c3750', '#4a4559'], 8);
      for (const y of rowLines(10)) r.rect(0, y, GW, PX, '#0e0b16');
      convergingLines(r, { spacing: 160, color: '#0e0b16' });
      r.sprite('tile/skulls', 0, -20, 520, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/skulls', 0, 1100, 520, { anchor: 'topleft', scale: 3, flipX: true });
    },
    animate(s, r) {
      for (const x of [220, 932]) {
        const f = Math.floor(s.t / 120) % 4;
        glow(r, x + 64, 150, 170 + (f % 2) * 10, '240,140,42', 0.25);
        r.sprite('tile/torch', f, x, 90, { anchor: 'topleft' });
      }
      if (Math.random() < 0.1) {
        s.particles.spawn({ x: Math.random() * GW, y: GH, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 2500, color: Math.random() > 0.5 ? '#f08c2a' : '#d23a3a', glow: true });
      }
    },
    front() {},
  },

  // ═══════════════ Ato II: Cemitério Esquecido ═══════════════
  cemiterio: {
    platform: 'tile/plat_terra',
    bake(r, rand) {
      bandedGradient(r, 0, HORIZON, ['#0b0412', '#22081c', '#3a0f22', '#4a1626']);
      for (let i = 0; i < 50; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 80) * PX, PX, PX, '#ffb3a0', 0.2 + rand() * 0.4);
      r.sprite('tile/moon', 0, 1040, 90, { tint: '#d23a3a', tintAlpha: 0.5 });
      r.sprite('tile/crypt_far', 0, 576, HORIZON - T - 10, { anchor: 'topleft' });
      r.tileRow('tile/fence', HORIZON - T + 20);
      bandedGradient(r, HORIZON, GH, ['#1a1614', '#22201b', '#2c2a1f', '#363322'], 8);
      for (const y of rowLines(14)) r.rect(0, y, GW, PX, '#0e0b16', 0.5);
      trapezoid(r, { top: 30, bottom: 420, color: '#3b2716' });
      scatter(r, rand, 140, ['#2f4a2c', '#1b3a26', '#43271a']);
      for (const [x, y, s] of [[90, 320, 1], [250, 330, 1], [990, 326, 1], [1150, 318, 1], [40, 420, 2], [1130, 430, 2]]) {
        r.sprite(rand() > 0.5 ? 'tile/cross_grave' : 'tile/gravestone', 0, x, y, { anchor: 'topleft', scale: s });
      }
      r.sprite('tile/open_grave', 0, 120, 600, { anchor: 'center', scale: 3 });
      r.sprite('tile/dead_tree', 0, -60, 220, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/dead_tree', 0, 1120, 220, { anchor: 'topleft', scale: 3, flipX: true });
    },
    animate(s, r) {
      r.tileRow('tile/fog', HORIZON - 80, { offset: -s.t * 0.02, alpha: 0.5 });
      for (let i = 0; i < 2; i++) {
        const x = ((s.t * (0.04 + i * 0.02) + i * 600) % (GW + 200)) - 100;
        r.sprite('enemy/corvo/idle', s.t / 140 + i, x, 50 + i * 30, { scale: 1, alpha: 0.6, tint: '#0e0b16', tintAlpha: 0.9 });
      }
      if (Math.random() < 0.05) {
        s.particles.spawn({ x: Math.random() * GW, y: HORIZON + Math.random() * 300, vx: 6, vy: -8, life: 3500, color: '#a8e070', glow: true, wobble: 20, seed: Math.random() * 10 });
      }
    },
    front(s, r) { r.tileRow('tile/fog', 610, { offset: s.t * 0.035, alpha: 0.3 }); },
  },

  // ═══════════════ Catacumbas ═══════════════
  catacumbas: {
    platform: 'tile/plat_osso',
    bake(r, rand) { bakeBoneHall(r, rand); },
    animate(s, r) {
      animateTorches(s, r, '240,140,42');
      if (Math.random() < 0.06) {
        s.particles.spawn({ x: Math.random() * GW, y: 0, vx: 0, vy: 30 + Math.random() * 20, life: 3000, color: '#8a7a8e' });
      }
    },
    front() {},
  },

  // ═══════════════ Torre do Relógio ═══════════════
  torre: {
    platform: 'tile/plat_latao',
    bake(r) {
      for (let y = -84; y < HORIZON; y += T) r.tileRow('tile/brick_dark', y);
      // janela redonda com a lua vermelha
      r.ctx.fillStyle = '#4a1626';
      r.ctx.beginPath(); r.ctx.arc(640, 120, 96, 0, Math.PI * 2); r.ctx.fill();
      r.sprite('tile/moon', 0, 640, 120, { tint: '#d23a3a', tintAlpha: 0.6 });
      r.ctx.strokeStyle = '#0e0b16'; r.ctx.lineWidth = 8;
      r.ctx.beginPath(); r.ctx.arc(640, 120, 96, 0, Math.PI * 2); r.ctx.stroke();
      r.rect(636, 24, 8, 192, '#0e0b16'); r.rect(544, 116, 192, 8, '#0e0b16');
      bandedGradient(r, HORIZON, GH, ['#2a1810', '#43271a', '#5a3522', '#6b4029'], 8);
      convergingLines(r, { spacing: 90, color: '#22140f' });
      for (const y of rowLines(12)) r.rect(0, y, GW, PX, '#22140f');
    },
    animate(s, r) {
      const f = Math.floor(s.t / 140) % 4;
      r.sprite('tile/gear', f, 150, 120, { scale: 4 });
      r.sprite('tile/gear', 3 - f, 1140, 160, { scale: 3 });
      r.sprite('tile/gear', f, 1010, 40, { scale: 2 });
      const swing = Math.sin(s.t / 600) * 0.12;
      r.ctx.save();
      r.ctx.translate(330, 0);
      r.ctx.rotate(swing);
      r.sprite('tile/bell', 0, 0, 150, { scale: 3 });
      r.ctx.restore();
    },
    front() {},
  },

  // ═══════════════ Portal das Sombras ═══════════════
  portal: {
    platform: 'tile/plat_vazio',
    bake(r, rand) {
      bandedGradient(r, 0, HORIZON, ['#05020a', '#120624', '#1e0f33', '#2a1440']);
      for (let i = 0; i < 120; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 150) * PX, PX, PX, '#d9a8ff', 0.2 + rand() * 0.6);
      bandedGradient(r, HORIZON, GH, ['#120624', '#1e0f33', '#2a1440', '#3c1d63'], 8);
      convergingLines(r, { spacing: 120, color: '#a35fd9', alpha: 0.35 });
      for (const y of rowLines(10)) r.rect(0, y, GW, PX, '#0e0b16', 0.6);
    },
    animate(s, r) {
      const f = Math.floor(s.t / 120) % 4;
      glow(r, 640, 150, 260, '163,95,217', 0.3);
      r.sprite('tile/portal', f, 640, 150, { scale: 4 });
      for (let i = 0; i < 4; i++) {
        const x = [80, 260, 1020, 1190][i];
        const y = [120, 60, 70, 150][i] + Math.sin(s.t / 700 + i) * 10;
        r.sprite('tile/float_rock', 0, x, y, { scale: i % 2 ? 2 : 3 });
      }
      if (Math.random() < 0.12) {
        s.particles.spawn({ x: Math.random() * GW, y: GH, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 2600, color: Math.random() > 0.5 ? '#a35fd9' : '#7cf0dc', glow: true });
      }
    },
    front() {},
  },

  // ═══════════════ Cripta Secreta (bônus) ═══════════════
  cripta: {
    platform: 'tile/plat_runa',
    bake(r, rand) { bakeBoneHall(r, rand, { floor: ['#120624', '#1e0f33', '#2a1440', '#3c1d63'] }); },
    animate(s, r) {
      animateTorches(s, r, '163,95,217');
      r.sprite('tile/rune', Math.floor(s.t / 250) % 4, 640, 600, { scale: 5, alpha: 0.6 });
    },
    front() {},
  },
};

export const STAGES = Object.keys(KINDS);

export class BattleStage {
  /** @param {import('../core/Assets.js').Assets} assets */
  constructor(assets, kind) {
    this.kind = KINDS[kind] ?? KINDS.floresta;
    this.platform = this.kind.platform;
    this.t = 0;
    this.particles = new Particles();
    const canvas = document.createElement('canvas');
    canvas.width = GW; canvas.height = GH;
    const off = new Renderer(canvas, assets);
    off.begin();
    this.kind.bake(off, seededRandom(kind.length * 4999 + 7));
    this.baked = canvas;
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
  }

  drawBack(r) {
    r.ctx.drawImage(this.baked, 0, 0);
    this.kind.animate(this, r);
    this.particles.draw(r);
  }

  /** Plataformas ovais (desenhadas antes dos personagens). */
  drawPlatforms(r, { enemies = true } = {}) {
    const p = LAYOUT.player.platform, e = LAYOUT.enemyPlatform;
    if (enemies) r.sprite(this.platform, 0, e.x, e.y, { scale: e.scale });
    r.sprite(this.platform, 0, p.x, p.y, { scale: p.scale });
  }

  drawFront(r) {
    this.kind.front(this, r);
    if (!this.vignette) {
      const g = r.ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.45, GW / 2, GH / 2, GW * 0.75);
      g.addColorStop(0, 'rgba(14,11,22,0)');
      g.addColorStop(1, 'rgba(14,11,22,0.55)');
      this.vignette = g;
    }
    r.ctx.fillStyle = this.vignette;
    r.ctx.fillRect(0, 0, GW, GH);
  }
}
