// Roteiro do comercial (30s, 9:16). Cada cena desenha a tela inteira em função do tempo t (s)
// e casa com uma parte da trilha (tools/trailer/trailer.scrim, 120 BPM: compasso = 2s).
//
//   0-4   Floresta à meia-noite: algo te observa (trovão em 3,5)
//   4-8   O logo cai
//   8-12  Pedra, papel e tesoura: as três armas
//   12-18 Batalha: pista, jokenpô, golpe super efetivo, o chefe chega
//   18-22 Desfile dos 16 monstros
//   22-26 Arena online
//   26-30 Chamada: acesso antecipado, jogue grátis no navegador
import { COLORS, W, H } from './stage.js';
import { clamp, lerp, span, ease, enter, decay } from './motion.js';

export const DURATION = 30;

/** Texto do botão da chamada final. */
export const CTA = { button: 'JOGAR AGORA' };

// ═══════════════════════ 1. floresta ═══════════════════════
function abertura(s, t) {
  s.backdrop('floresta', t, { pan: lerp(280, 430, ease.inOutCubic(span(t, 0, 4))), rise: 70, dim: lerp(0.65, 0.3, span(t, 0, 2.5)) });
  s.sparks(11, 34, t, { y: 1350, spread: 520, colors: [COLORS.cyan, '#a8e070'], size: 6, alpha: 0.8 });
  s.shake(decay(t, 3.5, 0.5) * 18, t);
  const g = enter(t, 1.3, 1.3);
  const gx = lerp(1300, 560, ease.outCubic(span(t, 1.3, 2.7)));
  const gy = 1080 + Math.sin(t * 2.2) * 26;
  const zoom = 10 + ease.inCubic(span(t, 3.55, 4.0)) * 8;   // depois do trovão a câmera mergulha no fantasma
  s.glow(gx - 60, gy - 40, 420, 'rgba(210,58,58,0.4)', g);
  s.sprite('enemy/fantasma/idle', t * 5, gx, gy, zoom, { alpha: g });
  s.silhouette('enemy/fantasma/idle', t * 5, gx, gy, zoom, '#dbe8ff', decay(t, 3.5, 0.3));
  s.restore();
  s.text('NA FLORESTA MALDITA...', 540, 520, { size: 56, color: COLORS.fog, reveal: (t - 0.3) * 18 });
  s.text('ALGO TE OBSERVA.', 540, 620, { size: 72, color: COLORS.cyan, reveal: (t - 1.8) * 14 });
  s.flash(decay(t, 3.5, 0.45) * 0.9, '#dbe8ff');
  s.flash(span(t, 3.75, 4.0));
}

// ═══════════════════════ 2. logo ═══════════════════════
function logo(s, t) {
  const l = t - 4;
  s.backdrop('mansao', l, { pan: 470, rise: 20, dim: 0.55 });
  s.fill('#1e0f33', 0.35);
  s.rays(540, 790, t, { length: 1400 });
  s.glow(540, 790, 700, 'rgba(163,95,217,0.5)', 1);
  s.sparks(21, 40, t, { y: 900, spread: 600, colors: [COLORS.purple, COLORS.cyan, COLORS.white], size: 6, alpha: 0.7 });
  // fantasmas em volta do logo
  const ring = enter(t, 4.7, 0.6);
  s.sprite('enemy/fantasma/idle', t * 5, 190 + Math.sin(t * 1.7) * 20, 430 + Math.cos(t * 1.3) * 16, 4, { alpha: ring });
  s.sprite('enemy/fogo_fatuo/idle', t * 6, 900 + Math.sin(t * 1.9) * 18, 470 + Math.cos(t * 1.5) * 20, 4, { alpha: ring });
  s.sprite('enemy/morcego/idle', t * 8, 860 + Math.sin(t * 2.3) * 24, 1250 + Math.cos(t * 1.1) * 18, 4, { alpha: ring });
  // o caçador e o Kastle entram embaixo
  const cast = ease.outCubic(span(t, 4.5, 5.3));
  s.sprite('char/cacador/side/idle', t * 6, lerp(-220, 270, cast), 1660, 8, { anchor: 'feet' });
  s.sprite('enemy/kastle/idle', t * 5, lerp(1320, 790, cast), 1670, 7, { anchor: 'feet' });
  // o logo cai letra por letra e treme a tela
  s.shake(decay(t, 4.0, 0.55) * 24, t, 3);
  const k = (i) => ease.outBack(span(t, 4.0 + i * 0.05, 4.32 + i * 0.05));
  s.kinetic('JOKEN', 540, 720, k, { size: 168, color: () => COLORS.white, drop: 260 });
  s.kinetic('GHOST', 540, 900, (i) => k(i + 5), { size: 168, color: () => COLORS.cyan, drop: 260 });
  s.restore();
  s.burst(3, 70, t, 4.05, { x: 540, y: 810, speed: 1200 });
  const sub = enter(t, 5.0, 0.5);
  s.text('CAÇADA EM TURNOS', 540, 1050 + (1 - sub) * 40, { size: 64, color: COLORS.gold, alpha: sub });
  s.text('UM RPG DE PEDRA, PAPEL E TESOURA', 540, 1150, { size: 36, color: COLORS.fog, reveal: (t - 5.8) * 32 });
  s.flash(decay(t, 4.0, 0.5));
  s.wipe(span(t, 7.65, 8.0));
}

// ═══════════════════════ 3. as armas ═══════════════════════
const ARMAS = [
  { icon: 'icon/estaca', name: 'ESTACA', beats: 'icon/maldicao', x: 540, y: 720, at: 8.0 },
  { icon: 'icon/aspirador', name: 'ASPIRADOR', beats: 'icon/possessao', x: 280, y: 1190, at: 9.0 },
  { icon: 'icon/cruz', name: 'CRUZ', beats: 'icon/assombracao', x: 800, y: 1190, at: 10.0 },
];

function armas(s, t) {
  s.backdrop('camara', t - 8, { pan: 460, rise: 40, dim: 0.62 });
  s.glow(540, 1030, 760, 'rgba(240,140,42,0.25)', 1);
  s.text('ESCOLHA SUA ARMA', 540, 390, { size: 72, color: COLORS.gold, alpha: enter(t, 8.0, 0.3) });
  // ciclo do jokenpô: um anel tracejado girando em volta das três cartas
  const ring = enter(t, 11.0, 0.5);
  if (ring > 0) {
    const { ctx } = s;
    ctx.save();
    ctx.globalAlpha = ring;
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 12;
    ctx.setLineDash([36, 30]);
    ctx.lineDashOffset = -t * 260;
    ctx.beginPath();
    ctx.arc(540, 1030, 360 * (0.85 + 0.15 * ring), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const a of ARMAS) {
    const p = ease.outBack(span(t, a.at, a.at + 0.38));
    if (p <= 0) continue;
    const { ctx } = s;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(p, p);
    s.panel('ui/slot', -160, -200, 320, 400, { scale: 4 });
    s.sprite(a.icon, 0, 0, -50, 4);
    s.text(a.name, 0, 112, { size: 40, color: COLORS.white });
    s.text('VENCE', -24, 168, { size: 28, color: COLORS.fog });
    s.sprite(a.beats, 0, 70, 168, 1.2);
    ctx.restore();
    s.glow(a.x, a.y, 340, 'rgba(246,213,72,0.45)', decay(t, a.at, 0.5));
    s.burst(31 + a.x, 26, t, a.at, { x: a.x, y: a.y - 50, speed: 700, size: 9 });
  }
  s.text('CADA MONSTRO TEM UMA FRAQUEZA', 540, 1500, { size: 40, color: COLORS.white, reveal: (t - 11.0) * 40 });
  s.wipe(1 - span(t, 8.0, 8.3));
  s.wipe(span(t, 11.7, 12.0));
}

// ═══════════════════════ 4. batalha ═══════════════════════
const BAT = { enemy: { x: 720, feet: 930 }, hunter: { x: 330, feet: 1580 }, hit: 15.0, boss: 16.0 };

function statusBox(s, x, y, w, name, hp, { tag = null, alpha = 1 } = {}) {
  s.panel('ui/panel_stone', x, y, w, 150, { scale: 3, alpha });
  s.text(name, x + 36, y + 50, { size: 40, align: 'left', alpha });
  if (tag) {
    s.ctx.save();
    s.ctx.globalAlpha = alpha;
    s.ctx.fillStyle = COLORS.red;
    const tw = s.measure(tag, 28) + 32;
    s.ctx.fillRect(x + w - tw - 24, y - 18, tw, 48);
    s.ctx.restore();
    s.text(tag, x + w - tw / 2 - 24, y + 6, { size: 28, alpha });
  }
  const bx = x + 36, by = y + 92, bw = w - 72;
  s.ctx.save();
  s.ctx.globalAlpha = alpha;
  s.ctx.fillStyle = COLORS.ink; s.ctx.fillRect(bx - 6, by - 6, bw + 12, 36);
  s.ctx.fillStyle = COLORS.ink3; s.ctx.fillRect(bx, by, bw, 24);
  s.ctx.fillStyle = hp > 0.5 ? '#5fb24a' : hp > 0.25 ? COLORS.gold : COLORS.red;
  s.ctx.fillRect(bx, by, Math.round(bw * clamp(hp)), 24);
  s.ctx.fillStyle = 'rgba(255,255,255,0.25)'; s.ctx.fillRect(bx, by, Math.round(bw * clamp(hp)), 6);
  s.ctx.restore();
}

function batalha(s, t) {
  s.backdrop('cemiterio', t - 12, { pan: lerp(430, 520, span(t, 12, 18)), rise: 30, dim: 0.28 });
  s.shake(decay(t, BAT.hit, 0.5) * 28 + decay(t, BAT.boss + 0.3, 0.6) * 34, t, 5);
  const { enemy, hunter } = BAT;
  // plataformas
  s.sprite('tile/plat_terra', 0, enemy.x, enemy.feet + 14, 8);
  const hx = lerp(-320, hunter.x, ease.outCubic(span(t, 12.0, 12.6)));
  s.sprite('tile/plat_pedra', 0, hx + 20, hunter.feet + 30, 10);
  // inimigo: o fantasma até o golpe, depois o Kastle cai do céu
  if (t < BAT.boss) {
    const gx = lerp(1380, enemy.x, ease.outCubic(span(t, 12.0, 12.6)));
    const gy = 690 + Math.sin(t * 2.4) * 18;
    const hurt = t >= BAT.hit && t < BAT.hit + 0.7;
    const recoil = hurt ? Math.sin((t - BAT.hit) * 30) * 16 * (1 - span(t, BAT.hit, BAT.hit + 0.7)) : 0;
    s.sprite(hurt ? 'enemy/fantasma/hurt' : 'enemy/fantasma/idle', t * 6, gx + recoil + (hurt ? 30 : 0), gy, 7);
    s.silhouette('enemy/fantasma/idle', t * 6, gx + recoil + 30, gy, 7, COLORS.white, decay(t, BAT.hit, 0.25) * 0.9);
  } else {
    const drop = span(t, BAT.boss + 0.1, BAT.boss + 0.4);
    const ky = drop < 1 ? lerp(-500, enemy.feet, ease.inCubic(drop)) : enemy.feet - Math.abs(Math.sin((t - BAT.boss - 0.4) * 9)) * 40 * decay(t, BAT.boss + 0.4, 0.5);
    s.sprite('enemy/kastle/idle', t * 5, enemy.x, ky, 8, { anchor: 'feet' });
    s.burst(9, 40, t, BAT.boss + 0.4, { x: enemy.x, y: enemy.feet, speed: 800, colors: [COLORS.fog, COLORS.stone, COLORS.purple], size: 12 });
    s.sprite('fx/poof', (t - BAT.boss) * 14, enemy.x, 690, 8, { alpha: t < BAT.boss + 0.42 ? 1 : 0 });
  }
  // o caçador de costas (ataca no golpe)
  const attacking = t >= 14.6 && t < 15.3;
  s.sprite(attacking ? 'char/cacador/back/attack' : 'char/cacador/back/idle', attacking ? clamp((t - 14.6) * 10, 0, 3) : t * 6, hx, hunter.feet, 8, { anchor: 'feet' });
  // raio do aspirador
  const beam = span(t, 14.75, 15.0) * (1 - span(t, 15.1, 15.3));
  if (beam > 0) {
    const { ctx } = s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(124,240,220,0.85)';
    ctx.lineWidth = 34 * beam;
    ctx.beginPath(); ctx.moveTo(hunter.x + 150, 1180); ctx.lineTo(enemy.x, 700); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 12 * beam;
    ctx.stroke();
    ctx.restore();
  }
  s.sprite('fx/hit', (t - BAT.hit) * 16, enemy.x + 20, 700, 8, { alpha: t >= BAT.hit && t < BAT.hit + 0.32 ? 1 : 0 });
  s.sprite('fx/aspirador', (t - BAT.hit) * 14, enemy.x + 20, 700, 6, { alpha: t >= BAT.hit && t < BAT.hit + 0.42 ? 1 : 0 });
  s.restore();

  // HUD do jogo
  const box = ease.outCubic(span(t, 12.3, 12.7));
  const boss = t >= BAT.boss + 0.4;
  const hp = boss ? 1 : 1 - 0.82 * ease.outCubic(span(t, BAT.hit + 0.1, BAT.hit + 0.7));
  statusBox(s, lerp(-620, 50, box), 250, 560, boss ? 'KASTLE' : 'FANTASMA', hp, { tag: boss ? 'CHEFE' : null });
  // a pista: o balão com o golpe que o fantasma prepara
  const tell = enter(t, 12.9, 0.25) * (1 - span(t, 14.2, 14.4));
  if (tell > 0) {
    const bx = 900, by = 500, sc = 4 * (0.6 + 0.4 * ease.outBack(span(t, 12.9, 13.2)));
    s.sprite('icon/pista', 0, bx, by, sc, { alpha: tell });
    s.sprite('icon/possessao', 0, bx + 2 * sc, by - 8 * sc, sc / 2, { alpha: tell });
    s.text('PISTA!', bx - 10, by + 150, { size: 32, color: COLORS.cyan, alpha: tell });
  }
  // o caçador escolhe a arma (o aspirador vence a possessão)
  const choices = [['icon/estaca', -190, -40], ['icon/aspirador', 0, -120], ['icon/cruz', 190, -40]];
  choices.forEach(([key, dx, dy], i) => {
    const p = ease.outBack(span(t, 13.4 + i * 0.08, 13.7 + i * 0.08));
    const chosen = key === 'icon/aspirador';
    const out = span(t, 14.1, 14.35);
    const alpha = chosen ? 1 - span(t, 14.5, 14.7) : 1 - out;
    const grow = chosen ? 1 + 0.5 * ease.outBack(span(t, 13.9, 14.2)) : 1;
    if (p > 0 && alpha > 0) {
      s.glow(hunter.x + dx, 1130 + dy, 150, 'rgba(124,240,220,0.5)', chosen ? enter(t, 13.9, 0.2) * alpha : 0);
      s.sprite(key, 0, hunter.x + dx, 1130 + dy, 2.6 * p * grow, { alpha });
    }
  });
  // JO-KEN-PÔ!
  const jk = (i) => ease.outBack(span(t, 14.0 + Math.floor(i / 3) * 0.22, 14.2 + Math.floor(i / 3) * 0.22));
  const jkOut = 1 - span(t, 14.85, 15.0);
  if (jkOut > 0 && t >= 14.0) {
    s.ctx.save(); s.ctx.globalAlpha = jkOut;
    s.kinetic('JO-KEN-PÔ!', 540, 1060, jk, { size: 104, color: (i) => (i >= 7 ? COLORS.gold : COLORS.white), drop: 120 });
    s.ctx.restore();
  }
  // super efetivo
  const dmg = span(t, BAT.hit, BAT.hit + 0.9);
  if (dmg > 0 && dmg < 1) s.text('-38', enemy.x + 160, 560 - ease.outCubic(dmg) * 150, { size: 104, color: COLORS.gold, alpha: 1 - span(t, BAT.hit + 0.7, BAT.hit + 0.9) });
  const band = ease.outCubic(span(t, BAT.hit + 0.05, BAT.hit + 0.3)) * (1 - span(t, BAT.hit + 0.85, BAT.hit + 1.0));
  if (band > 0) {
    s.ctx.save();
    s.ctx.globalAlpha = band;
    s.ctx.fillStyle = 'rgba(14,11,22,0.75)';
    s.ctx.fillRect(0, 1000, W, 130);
    s.ctx.fillStyle = COLORS.gold;
    s.ctx.fillRect(0, 1000, W, 6); s.ctx.fillRect(0, 1124, W, 6);
    s.ctx.restore();
    s.text('SUPER EFETIVO!', lerp(1500, 540, band), 1066, { size: 88, color: COLORS.gold });
  }
  s.text('COMBO x3', 860, 840, { size: 44, color: COLORS.cyan, alpha: enter(t, 15.35, 0.2) * (1 - span(t, 15.9, 16.0)) });
  // o chefe
  const cap = enter(t, 16.7, 0.3);
  s.text('CHEFES MUDAM DE FRAQUEZA', 540, 1110, { size: 48, color: COLORS.gold, alpha: cap });
  s.text('LEIA AS PISTAS. VENÇA NA ESTRATÉGIA.', 540, 1190, { size: 34, color: COLORS.white, reveal: (t - 17.0) * 42 });
  s.flash(decay(t, BAT.hit, 0.2) * 0.6);
  s.flash(decay(t, BAT.boss + 0.4, 0.3) * 0.5);
  s.wipe(1 - span(t, 12.0, 12.3));
  s.wipe(span(t, 17.7, 18.0));
}

// ═══════════════════════ 5. monstros ═══════════════════════
const MONSTROS = ['fantasma', 'fogo_fatuo', 'morcego', 'gargula', 'boneca', 'armadura', 'zumbi', 'corvo',
  'esqueleto', 'mumia', 'lobisomem', 'banshee', 'kastle', 'coveiro', 'relojoeiro', 'morgana'];
const CHEFES = new Set(['kastle', 'coveiro', 'relojoeiro', 'morgana']);

function monstros(s, t) {
  s.backdrop('portal', t - 18, { pan: 460, rise: 40, dim: 0.5 });
  const n = Math.round(16 * ease.outCubic(span(t, 18.0, 18.9)));
  s.text(String(n), 540, 330, { size: 168, color: COLORS.gold, alpha: enter(t, 18.0, 0.2) });
  s.text('MONSTROS', 540, 470, { size: 88, color: COLORS.white, alpha: enter(t, 18.15, 0.3) });
  MONSTROS.forEach((id, i) => {
    const at = 18.3 + i * 0.14;
    const p = ease.outBack(span(t, at, at + 0.3));
    if (p <= 0) return;
    const cx = 165 + (i % 4) * 250, cy = 690 + Math.floor(i / 4) * 250;
    const boss = CHEFES.has(id);
    const lit = boss && t >= 20.6;
    const { ctx } = s;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(p, p);
    s.panel(lit ? 'ui/slot_active' : 'ui/slot', -110, -110, 220, 220, { scale: 3 });
    ctx.restore();
    if (lit) s.glow(cx, cy, 190, 'rgba(210,58,58,0.55)', 0.6 + 0.4 * Math.sin(t * 8));
    s.sprite(`enemy/${id}/idle`, t * 6 + i, cx, cy, 3 * p);
    if (lit) s.text('CHEFE', cx, cy + 96, { size: 24, color: COLORS.red, alpha: enter(t, 20.6, 0.2) });
  });
  s.text('2 ATOS · 4 CHEFES', 540, 1640, { size: 56, color: COLORS.gold, alpha: enter(t, 20.7, 0.3) });
  s.flash(decay(t, 20.6, 0.25) * 0.35, COLORS.red);
  s.wipe(1 - span(t, 18.0, 18.3));
  s.wipe(span(t, 21.7, 22.0));
}

// ═══════════════════════ 6. arena ═══════════════════════
const MODOS = [['RANQUEADA', 'icon/trofeu'], ['2x2', 'icon/duelo'], ['TORNEIO', 'icon/taca'], ['REI DA ARENA', 'icon/coroa'], ['CHEFE CO-OP', 'icon/caveira']];

function arena(s, t) {
  s.backdrop('torre', t - 22, { pan: 460, rise: 30, dim: 0.55 });
  const { ctx } = s;
  // metade de cima roxa, de baixo vermelha, separadas por um corte diagonal
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COLORS.purple;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 560); ctx.lineTo(0, 960); ctx.fill();
  ctx.fillStyle = COLORS.red;
  ctx.beginPath(); ctx.moveTo(0, 960); ctx.lineTo(W, 560); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.restore();
  s.shake(decay(t, 22.0, 0.5) * 26, t, 7);
  const slide = ease.outCubic(span(t, 22.0, 22.45));
  s.sprite('char/cacador/side/idle', t * 6, lerp(-300, 200, slide), 1000, 7, { anchor: 'feet' });
  s.sprite('char/luna/side/idle', t * 6 + 2, lerp(1380, 880, slide), 1000, 7, { anchor: 'feet', flipX: true });
  const vs = ease.outBack(span(t, 22.0, 22.3));
  if (vs > 0) {
    ctx.save();
    ctx.translate(540, 820);
    ctx.scale(vs * (1 + decay(t, 22.0, 0.3) * 0.3), vs * (1 + decay(t, 22.0, 0.3) * 0.3));
    s.text('VS', 0, 0, { size: 168, color: COLORS.gold, outline: COLORS.red });
    ctx.restore();
  }
  s.restore();
  s.text('ARENA ONLINE', 540, 330, { size: 80, color: COLORS.white, alpha: enter(t, 22.4, 0.3) });
  s.text('DUELE CONTRA OUTROS CAÇADORES', 540, 420, { size: 34, color: COLORS.fog, reveal: (t - 22.7) * 40 });
  // troféus e ligas
  const tr = enter(t, 23.2, 0.3);
  s.sprite('icon/trofeu', 0, 380, 1170, 3 * ease.outBack(span(t, 23.2, 23.5)));
  s.text(`+${Math.round(28 * ease.outCubic(span(t, 23.3, 24.0)))}`, 500, 1170, { size: 104, color: COLORS.gold, align: 'left', alpha: tr });
  ['liga_bronze', 'liga_prata', 'liga_ouro', 'liga_platina', 'liga_lenda'].forEach((id, i) => {
    const p = ease.outBack(span(t, 23.6 + i * 0.1, 23.9 + i * 0.1));
    if (p > 0) s.sprite(`icon/${id}`, 0, 220 + i * 160, 1340, 2 * p);
  });
  // modos
  MODOS.forEach(([name, ic], i) => {
    const p = ease.outCubic(span(t, 24.3 + i * 0.12, 24.6 + i * 0.12));
    if (p <= 0) return;
    const row = i < 3 ? 0 : 1;
    const perRow = row ? 2 : 3;
    const col = row ? i - 3 : i;
    const w = row ? 440 : 300;
    const gap = 20;
    const x0 = 540 - (perRow * w + (perRow - 1) * gap) / 2 + col * (w + gap);
    const y = 1490 + row * 120;
    const from = (i % 2 ? 1 : -1) * 700;
    s.panel('ui/btn', x0 + from * (1 - p), y, w, 100, { scale: 3, alpha: p });
    s.sprite(ic, 0, x0 + from * (1 - p) + 56, y + 48, 0.9, { alpha: p });
    s.text(name, x0 + from * (1 - p) + w / 2 + 24, y + 46, { size: 30, alpha: p });
  });
  s.flash(decay(t, 22.0, 0.35) * 0.7);
  s.wipe(1 - span(t, 22.0, 22.25));
  s.wipe(span(t, 25.7, 26.0));
}

// ═══════════════════════ 7. chamada ═══════════════════════
function chamada(s, t) {
  s.backdrop('floresta', t - 26, { pan: lerp(540, 480, span(t, 26, 30)), rise: 0, dim: 0.4 });
  const { ctx } = s;
  const fade = ctx.createLinearGradient(0, 1100, 0, H);
  fade.addColorStop(0, 'rgba(14,11,22,0)');
  fade.addColorStop(1, 'rgba(14,11,22,0.85)');
  ctx.fillStyle = fade; ctx.fillRect(0, 1100, W, H - 1100);
  s.rays(540, 450, t, { length: 900, speed: 0.08, colors: ['rgba(246,213,72,0.08)', 'rgba(124,240,220,0.07)'] });
  s.sparks(41, 40, t, { y: 1200, spread: 600, colors: [COLORS.gold, COLORS.cyan], size: 7, alpha: 0.8 });
  // elenco embaixo
  s.sprite('char/cacador/side/idle', t * 6, 230, 1790, 8, { anchor: 'feet' });
  s.sprite('enemy/fantasma/idle', t * 5, 860, 1560 + Math.sin(t * 2) * 20, 6);
  s.sprite('enemy/fogo_fatuo/idle', t * 6, 640, 1690 + Math.sin(t * 2.6 + 1) * 16, 4);
  // logo
  const k = (i) => ease.outBack(span(t, 26.0 + i * 0.03, 26.3 + i * 0.03));
  s.kinetic('JOKEN', 540, 380, k, { size: 128, color: () => COLORS.white, drop: 160 });
  s.kinetic('GHOST', 540, 520, (i) => k(i + 5), { size: 128, color: () => COLORS.cyan, drop: 160 });
  // acesso antecipado
  const badge = ease.outBack(span(t, 26.5, 26.85));
  if (badge > 0) {
    ctx.save();
    ctx.translate(540, 700);
    ctx.scale(badge, badge);
    s.glow(0, 0, 420, 'rgba(240,140,42,0.45)', 0.6 + 0.4 * Math.sin(t * 5));
    s.panel('ui/btn_primary', -330, -62, 660, 124, { scale: 3 });
    s.text('ACESSO ANTECIPADO', 0, -6, { size: 48 });
    ctx.restore();
  }
  const jg = (i) => ease.outBack(span(t, 27.0 + i * 0.035, 27.3 + i * 0.035));
  s.kinetic('JOGUE GRÁTIS', 540, 900, jg, { size: 96, color: () => COLORS.gold, drop: 140 });
  s.text('NO NAVEGADOR · SEM DOWNLOAD', 540, 1010, { size: 40, color: COLORS.cyan, reveal: (t - 27.4) * 40 });
  // botão de jogar pulsando
  const btn = ease.outBack(span(t, 27.8, 28.15));
  if (btn > 0) {
    const pulse = 1 + (t > 28.15 ? 0.035 * Math.sin((t - 28.15) * 7) : 0);
    ctx.save();
    ctx.translate(540, 1170);
    ctx.scale(btn * pulse, btn * pulse);
    s.glow(0, 0, 380, 'rgba(246,213,72,0.35)', 0.8);
    // ícone e texto centralizados juntos; o botão abraça os dois com folga
    const size = 52, iconW = 64 * 1.2, gap = 28;
    const group = iconW + gap + s.measure(CTA.button, size);
    const bw = group + 140;
    s.panel('ui/btn', -bw / 2, -80, bw, 160, { scale: 4 });
    s.sprite('icon/jogar', 0, -group / 2 + iconW / 2, -6, 1.2);
    s.text(CTA.button, -group / 2 + iconW + gap, -8, { size, align: 'left' });
    ctx.restore();
  }
  s.burst(51, 60, t, 28.0, { x: 540, y: 1170, speed: 1000, colors: [COLORS.gold, COLORS.orange, COLORS.white] });
  s.flash(decay(t, 26.0, 0.35) * 0.5);
  s.wipe(1 - span(t, 26.0, 26.25));
}

export const SCENES = [
  { from: 0, to: 4, draw: abertura },
  { from: 4, to: 8, draw: logo },
  { from: 8, to: 12, draw: armas },
  { from: 12, to: 18, draw: batalha },
  { from: 18, to: 22, draw: monstros },
  { from: 22, to: 26, draw: arena },
  { from: 26, to: DURATION, draw: chamada },
];

/** Efeitos sonoros do jogo nos momentos certos ('impact' é o sample de impacto). */
export const CUES = [
  [3.5, 'hurt'], [4.0, 'impact'], [4.05, 'super'],
  [7.65, 'swing'], [8.0, 'select'], [9.0, 'select'], [10.0, 'select'], [11.0, 'go'], [11.7, 'swing'],
  [12.05, 'swing'], [12.9, 'hover'], [13.4, 'select'], [13.9, 'coin'], [14.65, 'swing'],
  [15.0, 'impact'], [15.0, 'super'], [16.4, 'impact'], [16.4, 'phase'], [17.7, 'swing'],
  ...MONSTROS.map((_, i) => [18.3 + i * 0.14, 'hover']),
  [20.6, 'phase'], [21.7, 'swing'], [22.0, 'impact'], [22.0, 'hit'], [23.2, 'coin'],
  ...[0, 1, 2, 3, 4].map((i) => [23.6 + i * 0.1, 'select']),
  [25.7, 'swing'], [26.0, 'win'], [27.8, 'go'], [28.0, 'coin'],
];

/** Desenha o quadro do tempo t. */
export function renderFrame(stage, t) {
  stage.begin();
  const scene = SCENES.find(sc => t >= sc.from && t < sc.to) ?? SCENES.at(-1);
  scene.draw(stage, t);
  stage.finish();
}
