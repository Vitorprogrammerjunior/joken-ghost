// Tiles do Ato II: cemitério, catacumbas, torre do relógio, portal e cripta.
// Mesmo padrão de tiles.mjs (64x64, desenhados em escala 2 no jogo).
import { Grid, sheet, rng } from '../lib/grid.mjs';
import { framedLocation, platformBase } from './tiles.mjs';

const finish = (g, outline = 'k') => { g.shade({ depth: 2 }); g.outline(outline); return g; };

// ═══════════════════ CEMITÉRIO (fase 5) ═══════════════════
function crossGrave() {
  const g = new Grid();
  g.rect(28, 14, 8, 46, 't3');
  g.rect(16, 24, 32, 7, 't3');
  finish(g);
  g.line(30, 16, 30, 56, 't4');
  g.px([[33, 40], [34, 41], [20, 27]], 'v3');
  g.rect(18, 59, 28, 4, 'm2');
  return g;
}

/** Mausoléu ao longe (silhueta com porta acesa). */
function cryptFar() {
  const g = new Grid();
  g.rect(12, 26, 40, 36, 'p1');
  g.poly([[8, 28], [32, 8], [56, 28]], 'p1');
  for (const x of [16, 24, 40, 48]) g.rect(x, 30, 3, 32, 'p2');
  g.rect(28, 40, 9, 22, 'k2');
  g.rect(30, 42, 5, 20, 'c2');
  g.rect(31, 14, 2, 8, 'p2'); g.rect(28, 17, 8, 2, 'p2');
  return g;
}

function openGrave() {
  const g = new Grid();
  g.ellipse(32, 40, 26, 6, 'm3'); // terra amontoada atrás
  g.ellipse(32, 46, 22, 9, 'm2');
  g.ellipse(32, 46, 17, 6, 'k2'); // a cova
  for (const [x, y] of [[10, 38], [52, 36], [14, 44], [48, 47]]) g.rect(x, y, 3, 2, 'm4');
  g.outline('k');
  return g;
}

// ═══════════════════ CATACUMBAS (fase 6) ═══════════════════
/** Parede de crânios empilhados na penumbra (escura para os monstros se destacarem). */
function boneWall() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 'k2');
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 16 + (row % 2 ? 8 : 0), y = row * 16 + 2;
      const S = new Grid();
      S.ellipse(x + 6, y + 6, 6, 5, 'g2');
      S.rect(x + 3, y + 9, 7, 3, 'g2');
      S.shade();
      S.ellipse(x + 4, y + 6, 1, 1.5, 'k'); S.ellipse(x + 8, y + 6, 1, 1.5, 'k');
      S.outline('k');
      g.blit(S);
    }
  }
  return g;
}

function coffin() {
  const g = new Grid();
  g.poly([[22, 8], [42, 8], [48, 20], [42, 60], [22, 60], [16, 20]], 'm3');
  finish(g);
  g.rect(31, 18, 3, 22, 'y2'); g.rect(26, 24, 13, 3, 'y2');
  g.line(22, 9, 17, 20, 'm5');
  return g;
}

function cobweb() {
  const g = new Grid();
  for (let i = 0; i < 6; i++) {
    const a = (i / 5) * Math.PI / 2;
    g.line(0, 0, Math.round(Math.cos(a) * 60), Math.round(Math.sin(a) * 60), 'g4@60');
  }
  for (const r of [14, 28, 42, 56]) {
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI / 2, a1 = ((i + 1) / 5) * Math.PI / 2;
      g.line(Math.round(Math.cos(a0) * r), Math.round(Math.sin(a0) * r), Math.round(Math.cos(a1) * (r - 3)), Math.round(Math.sin(a1) * (r - 3)), 'g4@60');
    }
  }
  return g;
}

// ═══════════════════ TORRE DO RELÓGIO (fase 7) ═══════════════════
/** Engrenagem grande girando (4 frames). */
function gear(frame = 0) {
  const g = new Grid();
  const a0 = frame * Math.PI / 16;
  for (let i = 0; i < 10; i++) {
    const a = a0 + i * Math.PI / 5;
    const x = 32 + Math.cos(a) * 25, y = 32 + Math.sin(a) * 25;
    g.circle(Math.round(x), Math.round(y), 5, 'o2');
  }
  g.circle(32, 32, 24, 'o2');
  g.circle(32, 32, 16, 'k2');
  g.circle(32, 32, 14, 'o2');
  for (let i = 0; i < 4; i++) {
    const a = a0 + i * Math.PI / 2;
    g.stroke(32, 32, Math.round(32 + Math.cos(a) * 15), Math.round(32 + Math.sin(a) * 15), 4, 'o2');
  }
  g.circle(32, 32, 5, 'y2');
  g.shade({ depth: 2 });
  g.outline('k');
  return g;
}

function bell() {
  const g = new Grid();
  g.rect(30, 4, 4, 8, 'm3');
  g.poly([[24, 14], [40, 14], [46, 42], [50, 48], [14, 48], [18, 42]], 'y2');
  g.ellipse(32, 14, 8, 4, 'y2');
  finish(g);
  g.circle(32, 52, 4, 'y1');
  g.line(22, 20, 19, 42, 'y4');
  return g;
}

// ═══════════════════ PORTAL DAS SOMBRAS (fase 8) ═══════════════════
/** Portal girando (4 frames): espiral roxa com borda de runas. */
function portal(frame = 0) {
  const g = new Grid();
  g.ellipse(32, 32, 28, 30, 'p2');
  const turn = frame * Math.PI / 8;
  for (let i = 0; i < 160; i++) {
    const t = i / 160;
    const a = turn + t * Math.PI * 6;
    const r = 26 * (1 - t);
    g.rect(Math.round(32 + Math.cos(a) * r * 0.93), Math.round(32 + Math.sin(a) * r), 2, 2, t > 0.5 ? 'p5' : 'p4');
  }
  g.circle(32, 32, 4, 'w');
  g.ring(32, 32, 29, 2, 'p3');
  for (let i = 0; i < 8; i++) {
    const a = -turn + i * Math.PI / 4;
    g.set(Math.round(32 + Math.cos(a) * 28), Math.round(32 + Math.sin(a) * 29), 'c4');
  }
  g.outline('k');
  return g;
}

function floatRock() {
  const g = new Grid();
  g.poly([[8, 30], [56, 28], [48, 40], [38, 54], [30, 60], [22, 50], [14, 40]], 't2');
  g.ellipse(32, 30, 24, 5, 't3');
  finish(g);
  g.rect(14, 26, 36, 2, 'p4');
  for (const [x, y] of [[20, 25], [34, 24], [44, 26]]) g.set(x, y, 'p5');
  return g;
}

// ═══════════════════ MAPA ═══════════════════
function locCemiterio() {
  const g = new Grid();
  g.rect(0, 46, 64, 18, 'v2');
  g.circle(46, 18, 7, 'r4');
  g.blit(crossGrave().shifted(-12, -4));
  for (const [x, h] of [[38, 14], [48, 10]]) { g.rect(x, 50 - h, 7, h + 2, 't3'); g.ellipse(x + 3, 50 - h, 3, 2, 't3'); }
  return framedLocation('p1', g);
}

function locCatacumbas() {
  const g = new Grid();
  g.blit(boneWall());
  g.ellipse(32, 44, 14, 20, 'k');
  g.blit(coffin().shifted(0, 10));
  return framedLocation('m1', g);
}

function locTorre() {
  const g = new Grid();
  g.circle(32, 32, 26, 'r1');
  g.circle(46, 14, 6, 'r3');
  g.rect(22, 18, 20, 46, 't2');
  g.poly([[18, 20], [32, 2], [46, 20]], 'r2');
  g.circle(32, 30, 8, 'q4'); g.ring(32, 30, 8, 1, 'y2');
  g.line(32, 30, 32, 24, 'k'); g.line(32, 30, 36, 31, 'k');
  g.rect(28, 50, 8, 14, 'k2');
  return framedLocation('b1', g);
}

function locPortal() {
  const g = new Grid();
  g.blit(portal(1));
  return framedLocation('p1', g);
}

function locCripta() {
  const g = new Grid();
  g.blit(cryptFar().shifted(0, 4));
  g.circle(32, 18, 4, 'y3');
  return framedLocation('k2', g);
}

// ═══════════════════ PLATAFORMAS ═══════════════════
function platTerra() {
  const g = platformBase(['m3', 'm4', 'm2', 'm1']);
  const r = rng(91);
  for (let i = 0; i < 14; i++) {
    const x = 8 + r() * 48, y = 27 + r() * 10;
    if (g.get(x, y)) g.set(x, y, r() > 0.5 ? 'v3' : 'm5');
  }
  g.outline('k');
  return g;
}

function platOsso() {
  const g = platformBase(['q2', 'q3', 'q1', 'g2']);
  for (const [x, y] of [[16, 30], [30, 34], [44, 29], [24, 27], [40, 36]]) {
    g.rect(x - 3, y, 7, 1, 'g4');
    g.set(x - 4, y, 'q4'); g.set(x + 4, y, 'q4');
  }
  g.outline('k');
  return g;
}

function platLatao() {
  const g = platformBase(['y2', 'y3', 'y1', 'o1']);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.set(Math.round(32 + Math.cos(a) * 22), Math.round(32 + Math.sin(a) * 6), 'o2');
  }
  g.ellipse(32, 32, 6, 2, 'o2');
  g.outline('k');
  return g;
}

function platVazio() {
  const g = platformBase(['p2', 'p3', 'p1', 'k2']);
  const R = new Grid();
  R.ellipse(32, 32, 24, 7, 'p4');
  R.erase((x, y) => Math.hypot((x - 32) / 22, (y - 32) / 5.5) < 1);
  g.blit(R);
  for (const [x, y] of [[32, 26], [14, 32], [50, 32]]) g.set(x, y, 'c4');
  g.outline('k');
  return g;
}

export function tileSheets2() {
  return {
    cross_grave: crossGrave(), crypt_far: cryptFar(), open_grave: openGrave(),
    bone_wall: boneWall(), coffin: coffin(), cobweb: cobweb(),
    gear: sheet([0, 1, 2, 3].map(gear)), bell: bell(),
    portal: sheet([0, 1, 2, 3].map(portal)), float_rock: floatRock(),
    loc_cemiterio: locCemiterio(), loc_catacumbas: locCatacumbas(), loc_torre: locTorre(),
    loc_portal: locPortal(), loc_cripta: locCripta(),
    plat_terra: platTerra(), plat_osso: platOsso(), plat_latao: platLatao(), plat_vazio: platVazio(),
  };
}
