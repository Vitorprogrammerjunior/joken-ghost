// Cenários das fases, montados com tiles 64x64 (desenhados em escala 2).
// A parte estática é pré-renderizada num canvas; a parte animada é desenhada a cada frame.
import { Renderer, GW, GH, PX } from '../core/Renderer.js';
import { Particles } from '../core/Particles.js';

export const GROUND_Y = 600; // linha dos pés dos personagens
const T = 64 * PX;           // tamanho de um tile na tela (128px)

/** Gradiente em faixas com pontilhado nas transições (visual 8-bit). */
export function bandedGradient(r, y0, y1, stops, band = 8) {
  const ctx = r.ctx;
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);
  const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const cols = stops.map(hex);
  const colorAt = (k) => {
    const seg = Math.min(cols.length - 2, Math.floor(k * (cols.length - 1)));
    const kk = k * (cols.length - 1) - seg;
    const [a, b] = [cols[seg], cols[seg + 1]];
    return `rgb(${lerp(a[0], b[0], kk)},${lerp(a[1], b[1], kk)},${lerp(a[2], b[2], kk)})`;
  };
  const n = Math.ceil((y1 - y0) / band);
  for (let i = 0; i < n; i++) {
    const y = y0 + i * band;
    ctx.fillStyle = colorAt(i / n);
    ctx.fillRect(0, y, GW, band);
    // pontilhado para suavizar a próxima faixa
    if (i < n - 1) {
      ctx.fillStyle = colorAt((i + 1) / n);
      for (let x = (i % 2) * PX; x < GW; x += PX * 2) ctx.fillRect(x, y + band - PX, PX, PX);
    }
  }
}

/** Brilho suave de uma fonte de luz (vela, lampião, tocha). */
export function glow(r, x, y, radius, rgb, alpha = 0.3) {
  const g = r.ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  r.ctx.fillStyle = g;
  r.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function seededRandom(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Salão de ossos visto de lado (catacumbas e cripta). */
function bakeBoneHall(r, floorColor) {
  for (let y = 0; y < 512; y += T) r.tileRow('tile/bone_wall', y);
  for (const x of [0, 1152]) for (let y = 0; y < 512; y += T) r.sprite('tile/pillar', 0, x, y, { anchor: 'topleft' });
  r.sprite('tile/cobweb', 0, 128, 0, { anchor: 'topleft' });
  r.sprite('tile/cobweb', 0, 1024, 0, { anchor: 'topleft', flipX: true });
  for (let y = 512; y < GH; y += T) r.tileRow('tile/floor_stone', y);
  r.rect(0, 512, GW, GH - 512, floorColor, 0.35);
  bandedGradient(r, 506, 520, ['#0e0b16', '#2f2a3d'], 4);
  r.sprite('tile/coffin', 0, 140, 384, { anchor: 'topleft' });
  r.sprite('tile/skulls', 0, 1000, 470, { anchor: 'topleft' });
}

function animateWallTorches(s, r, rgb) {
  for (const x of [380, 836]) {
    const f = Math.floor(s.t / 120) % 4;
    glow(r, x + 64, 280, 170 + (f % 2) * 10, rgb, 0.25);
    r.sprite('tile/torch', f, x, 230, { anchor: 'topleft' });
  }
}

const KINDS = {
  // ═══════════════ Floresta Maldita ═══════════════
  floresta: {
    bake(r, rand) {
      bandedGradient(r, 0, 470, ['#070a1c', '#0f1a36', '#1a3149', '#21474f']);
      for (let i = 0; i < 80; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 160) * PX, PX, PX, '#dbe8ff', 0.3 + rand() * 0.5);
      r.sprite('tile/moon', 0, 1010, 120);
      r.sprite('tile/mansion_far', 0, 600, 220, { anchor: 'topleft' });
      r.tileRow('tile/tree_far', 330, { offset: 40 });
      r.rect(0, 458, GW, 80, '#0d3340');
      r.tileRow('tile/grass_top', 488, { offset: 20 });
      bandedGradient(r, 534, GH, ['#16301f', '#0f2418', '#091510']);
      // trilha
      r.ctx.fillStyle = '#3b2716';
      r.ctx.beginPath();
      r.ctx.moveTo(600, 534); r.ctx.lineTo(690, 534); r.ctx.lineTo(860, GH); r.ctx.lineTo(420, GH);
      r.ctx.fill();
      for (let i = 0; i < 40; i++) {
        const y = 540 + rand() * 180, k = (y - 534) / (GH - 534);
        r.rect(600 - k * 180 + rand() * (90 + k * 350), y, PX * 2, PX, '#6b4029', 0.8);
      }
      for (let i = 0; i < 120; i++) {
        const x = rand() * GW, y = 540 + rand() * 180;
        r.rect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, PX, PX * 3, rand() > 0.5 ? '#2f7a3e' : '#1b4a30');
      }
      // árvores grandes emoldurando a cena
      for (const x of [-30, 1100]) {
        for (let y = -40; y < 400; y += T) r.sprite('tile/tree_trunk', 0, x, y, { anchor: 'topleft' });
        r.sprite('tile/tree_roots', 0, x, 400, { anchor: 'topleft' });
      }
      for (const [x, y] of [[-110, -50], [10, -80], [-60, 40], [1020, -60], [1150, -40], [1100, 50], [60, 0], [1180, 70]]) {
        r.sprite('tile/tree_crown', 0, x, y, { anchor: 'topleft' });
      }
      r.sprite('tile/bush', 0, 180, 536, { anchor: 'topleft' });
      r.sprite('tile/bush', 0, 960, 540, { anchor: 'topleft' });
      r.sprite('tile/gravestone', 0, 520, 410, { anchor: 'topleft' });
      r.sprite('tile/mushrooms', 0, 90, 584, { anchor: 'topleft' });
      r.sprite('tile/mushrooms', 0, 1110, 600, { anchor: 'topleft' });
    },
    animate(s, r) {
      for (let i = 0; i < 3; i++) {
        const x = ((s.t * 0.006 + i * 520) % (GW + 300)) - 200;
        r.sprite('tile/cloud', 0, x, 40 + i * 50, { anchor: 'topleft', alpha: 0.55 });
      }
      r.tileRow('tile/fog', 380, { offset: -s.t * 0.02, alpha: 0.7 });
      if (Math.random() < 0.08) {
        s.particles.spawn({ x: Math.random() * GW, y: 380 + Math.random() * 300, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 3000 + Math.random() * 3000, color: Math.random() > 0.5 ? '#e2ffb0' : '#fff3a6', glow: true, wobble: 25, seed: Math.random() * 10 });
      }
    },
    front(s, r) {
      r.tileRow('tile/fog', 610, { offset: s.t * 0.035, alpha: 0.35 });
    },
  },

  // ═══════════════ Pátio da Mansão ═══════════════
  patio: {
    bake(r, rand) {
      bandedGradient(r, 0, 320, ['#0b0618', '#1b0e33', '#321a4a']);
      for (let i = 0; i < 50; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 80) * PX, PX, PX, '#dbe8ff', 0.3 + rand() * 0.5);
      r.sprite('tile/moon', 0, 200, 90);
      // telhado da mansão
      r.ctx.fillStyle = '#1e0f33';
      r.ctx.beginPath();
      r.ctx.moveTo(0, 170);
      for (const [x, y] of [[90, 170], [190, 60], [290, 170], [520, 170], [640, 40], [760, 170], [990, 170], [1090, 60], [1190, 170], [GW, 170]]) r.ctx.lineTo(x, y);
      r.ctx.lineTo(GW, 200); r.ctx.lineTo(0, 200);
      r.ctx.fill();
      for (let y = 168; y < 520; y += T) r.tileRow('tile/wall_stone', y);
      r.rect(0, 168, GW, 6, '#0e0b16');
      // porta
      r.rect(584, 360, 112, 170, '#0e0b16');
      r.rect(592, 368, 96, 162, '#43271a');
      r.ctx.fillStyle = '#0e0b16'; r.ctx.beginPath(); r.ctx.arc(640, 368, 56, Math.PI, 0); r.ctx.fill();
      r.ctx.fillStyle = '#43271a'; r.ctx.beginPath(); r.ctx.arc(640, 368, 48, Math.PI, 0); r.ctx.fill();
      r.rect(638, 330, 4, 200, '#22140f');
      r.rect(668, 440, 6, 6, '#cf9a22');
      r.tileRow('tile/hedge', 404, { offset: 30 });
      r.tileRow('tile/fence', 404);
      for (let y = 528; y < GH; y += T) r.tileRow('tile/cobble', y);
      bandedGradient(r, 528, 536, ['#0e0b16', '#262833'], 4);
      r.sprite('tile/dead_tree', 0, -10, 408, { anchor: 'topleft' });
      r.sprite('tile/dead_tree', 0, 1160, 408, { anchor: 'topleft', flipX: true });
      r.sprite('tile/gravestone', 0, 300, 420, { anchor: 'topleft' });
      r.sprite('tile/gravestone', 0, 860, 420, { anchor: 'topleft' });
    },
    animate(s, r) {
      const frame = (k) => (Math.floor(s.t / 900 + k * 7.3) % 7 === 0 ? 3 : Math.floor(s.t / 220 + k) % 3);
      for (const [x, y, k] of [[110, 196, 0], [360, 196, 1], [820, 196, 2], [1050, 196, 3], [230, 300, 4], [930, 300, 5]]) {
        r.sprite('tile/window_lit', frame(k), x, y, { anchor: 'topleft' });
      }
      for (const x of [160, 1010]) {
        const f = Math.floor(s.t / 160) % 4;
        glow(r, x + 64, 436, 90 + (f % 2) * 6, '255,192,77', 0.28);
        r.sprite('tile/lamp', f, x, 404, { anchor: 'topleft' });
      }
      // morcegos ao longe
      for (let i = 0; i < 3; i++) {
        const x = ((s.t * (0.05 + i * 0.02) + i * 400) % (GW + 200)) - 100;
        const y = 70 + i * 30 + Math.sin(s.t / 300 + i) * 10;
        r.sprite('enemy/morcego/idle', s.t / 120 + i, x, y, { scale: 1, alpha: 0.6, tint: '#0e0b16', tintAlpha: 0.8 });
      }
    },
    front(s, r) {
      r.tileRow('tile/fog', 600, { offset: s.t * 0.03, alpha: 0.4 });
    },
  },

  // ═══════════════ Interior da Mansão ═══════════════
  mansao: {
    bake(r) {
      for (let y = 0; y < 384; y += T) r.tileRow('tile/wallpaper', y);
      r.tileRow('tile/wainscot', 384);
      for (let y = 512; y < GH; y += T) r.tileRow('tile/floor_wood', y);
      r.tileRow('tile/carpet', 544);
      r.sprite('tile/window_moon', 0, 150, 80, { anchor: 'topleft' });
      r.sprite('tile/window_moon', 0, 1000, 80, { anchor: 'topleft' });
      r.sprite('tile/portrait', 0, 576, 70, { anchor: 'topleft' });
      r.sprite('tile/bookshelf', 0, 0, 392, { anchor: 'topleft' });
      r.sprite('tile/bookshelf', 0, 1152, 392, { anchor: 'topleft' });
      // feixes de luar
      r.ctx.fillStyle = 'rgba(184,208,255,0.07)';
      for (const x of [214, 1064]) {
        r.ctx.beginPath();
        r.ctx.moveTo(x - 30, 180); r.ctx.lineTo(x + 30, 180); r.ctx.lineTo(x + 160, 700); r.ctx.lineTo(x + 20, 700);
        r.ctx.fill();
      }
      bandedGradient(r, 0, 40, ['#0e0b16', '#1e0f33'], 8);
    },
    animate(s, r) {
      for (const x of [380, 836]) {
        const f = Math.floor(s.t / 150) % 4;
        glow(r, x + 64, 300, 110 + (f % 2) * 8, '255,192,77', 0.22);
        r.sprite('tile/candelabra', f, x, 262, { anchor: 'topleft' });
      }
      if (Math.random() < 0.05) {
        s.particles.spawn({ x: Math.random() * GW, y: 150 + Math.random() * 450, vx: 8, vy: -4, life: 4000, color: '#eadde6', wobble: 10, seed: Math.random() * 10 });
      }
    },
    front() {},
  },

  // ═══════════════ Câmara do Mal ═══════════════
  camara: {
    bake(r) {
      for (let y = 0; y < 512; y += T) r.tileRow('tile/brick_dark', y);
      for (const x of [0, 352, 800, 1152]) for (let y = 0; y < 512; y += T) r.sprite('tile/pillar', 0, x, y, { anchor: 'topleft' });
      r.sprite('tile/banner', 0, 576, 40, { anchor: 'topleft' });
      r.sprite('tile/chains', 0, 230, 0, { anchor: 'topleft' });
      r.sprite('tile/chains', 0, 940, 0, { anchor: 'topleft' });
      for (let y = 512; y < GH; y += T) r.tileRow('tile/floor_stone', y);
      bandedGradient(r, 506, 520, ['#0e0b16', '#2f2a3d'], 4);
      r.sprite('tile/skulls', 0, 20, 470, { anchor: 'topleft' });
      r.sprite('tile/skulls', 0, 1130, 470, { anchor: 'topleft', flipX: true });
    },
    animate(s, r) {
      for (const x of [196, 1016]) {
        const f = Math.floor(s.t / 120) % 4;
        glow(r, x + 64, 280, 180 + (f % 2) * 10, '240,140,42', 0.25);
        r.sprite('tile/torch', f, x, 230, { anchor: 'topleft' });
      }
      r.sprite('tile/rune', Math.floor(s.t / 250) % 4, 940, 540, { scale: 4 });
      if (Math.random() < 0.1) {
        s.particles.spawn({ x: 500 + Math.random() * 700, y: 700, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 2500, color: Math.random() > 0.5 ? '#f08c2a' : '#d23a3a', glow: true });
      }
    },
    front() {},
  },

  // ═══════════════ Cemitério Esquecido ═══════════════
  cemiterio: {
    bake(r, rand) {
      bandedGradient(r, 0, 470, ['#0b0412', '#22081c', '#3a0f22', '#4a1626']);
      for (let i = 0; i < 60; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 140) * PX, PX, PX, '#ffb3a0', 0.2 + rand() * 0.4);
      r.sprite('tile/moon', 0, 1010, 120, { tint: '#d23a3a', tintAlpha: 0.5 });
      r.sprite('tile/crypt_far', 0, 560, 300, { anchor: 'topleft', scale: 3 });
      r.tileRow('tile/fence', 404);
      r.rect(0, 528, GW, GH - 528, '#22201b');
      r.tileRow('tile/grass_top', 488, { offset: 20 });
      bandedGradient(r, 534, GH, ['#2c2a1f', '#22201b', '#16140f']);
      for (const [x, y] of [[60, 410], [300, 420], [880, 416], [1120, 410]]) {
        r.sprite(rand() > 0.5 ? 'tile/cross_grave' : 'tile/gravestone', 0, x, y, { anchor: 'topleft' });
      }
      r.sprite('tile/dead_tree', 0, -20, 280, { anchor: 'topleft', scale: 3 });
      r.sprite('tile/dead_tree', 0, 1100, 280, { anchor: 'topleft', scale: 3, flipX: true });
    },
    animate(s, r) {
      r.tileRow('tile/fog', 380, { offset: -s.t * 0.02, alpha: 0.6 });
      const x = ((s.t * 0.05) % (GW + 200)) - 100;
      r.sprite('enemy/corvo/idle', s.t / 140, x, 90, { scale: 1, alpha: 0.6, tint: '#0e0b16', tintAlpha: 0.9 });
    },
    front(s, r) { r.tileRow('tile/fog', 600, { offset: s.t * 0.03, alpha: 0.35 }); },
  },

  // ═══════════════ Catacumbas ═══════════════
  catacumbas: {
    bake(r) { bakeBoneHall(r, '#43271a'); },
    animate(s, r) { animateWallTorches(s, r, '240,140,42'); },
    front() {},
  },

  // ═══════════════ Torre do Relógio ═══════════════
  torre: {
    bake(r) {
      for (let y = 0; y < 512; y += T) r.tileRow('tile/brick_dark', y);
      r.ctx.fillStyle = '#4a1626';
      r.ctx.beginPath(); r.ctx.arc(640, 220, 120, 0, Math.PI * 2); r.ctx.fill();
      r.sprite('tile/moon', 0, 640, 220, { scale: 3, tint: '#d23a3a', tintAlpha: 0.6 });
      r.ctx.strokeStyle = '#0e0b16'; r.ctx.lineWidth = 10;
      r.ctx.beginPath(); r.ctx.arc(640, 220, 120, 0, Math.PI * 2); r.ctx.stroke();
      r.rect(635, 100, 10, 240, '#0e0b16'); r.rect(520, 215, 240, 10, '#0e0b16');
      for (let y = 512; y < GH; y += T) r.tileRow('tile/floor_wood', y);
      bandedGradient(r, 506, 520, ['#0e0b16', '#43271a'], 4);
    },
    animate(s, r) {
      const f = Math.floor(s.t / 140) % 4;
      r.sprite('tile/gear', f, 170, 200, { scale: 4 });
      r.sprite('tile/gear', 3 - f, 1110, 260, { scale: 3 });
    },
    front() {},
  },

  // ═══════════════ Portal das Sombras ═══════════════
  portal: {
    bake(r, rand) {
      bandedGradient(r, 0, 520, ['#05020a', '#120624', '#1e0f33', '#2a1440']);
      for (let i = 0; i < 140; i++) r.rect(Math.floor(rand() * 640) * PX, Math.floor(rand() * 240) * PX, PX, PX, '#d9a8ff', 0.2 + rand() * 0.6);
      bandedGradient(r, 520, GH, ['#2a1440', '#1e0f33', '#120624'], 8);
      r.rect(0, 518, GW, 4, '#a35fd9', 0.6);
    },
    animate(s, r) {
      const f = Math.floor(s.t / 120) % 4;
      glow(r, 640, 260, 300, '163,95,217', 0.3);
      r.sprite('tile/portal', f, 640, 260, { scale: 5 });
      for (let i = 0; i < 3; i++) {
        r.sprite('tile/float_rock', 0, [140, 1000, 1160][i], [180, 120, 330][i] + Math.sin(s.t / 700 + i) * 10, { scale: 2 });
      }
    },
    front() {},
  },

  // ═══════════════ Cripta Secreta ═══════════════
  cripta: {
    bake(r) { bakeBoneHall(r, '#3c1d63'); },
    animate(s, r) { animateWallTorches(s, r, '163,95,217'); },
    front() {},
  },
};

export class Scenery {
  /** @param {import('../core/Assets.js').Assets} assets  @param {keyof KINDS} kind */
  constructor(assets, kind) {
    this.kind = KINDS[kind] ?? KINDS.floresta;
    this.t = 0;
    this.particles = new Particles();
    const canvas = document.createElement('canvas');
    canvas.width = GW; canvas.height = GH;
    const off = new Renderer(canvas, assets);
    off.begin();
    this.kind.bake(off, seededRandom(kind.length * 7919 + 1));
    this.baked = canvas;
    this.vignette = null;
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
  }

  /** Fundo: parte fixa + animações atrás dos personagens. */
  drawBack(r) {
    r.ctx.drawImage(this.baked, 0, 0);
    this.kind.animate(this, r);
    this.particles.draw(r);
  }

  /** Frente: névoa e vinheta por cima dos personagens. */
  drawFront(r) {
    this.kind.front(this, r);
    if (!this.vignette) {
      const g = r.ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.45, GW / 2, GH / 2, GW * 0.75);
      g.addColorStop(0, 'rgba(14,11,22,0)');
      g.addColorStop(1, 'rgba(14,11,22,0.65)');
      this.vignette = g;
    }
    r.ctx.fillStyle = this.vignette;
    r.ctx.fillRect(0, 0, GW, GH);
  }
}
