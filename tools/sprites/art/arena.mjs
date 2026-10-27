// Arte da Arena (multiplayer): cartas novas, expressões, moedas e molduras de avatar.
import { Grid } from '../lib/grid.mjs';
import { estaca, aspirador, cruz, visao } from './icons.mjs';

const finish = (g, { shade = true, outline = 'k' } = {}) => {
  if (shade) g.shade();
  if (outline) g.outline(outline);
  return g;
};

/** Ícone de arma com um efeito por cima (cartas de arma). */
function weaponCard(base, aura) {
  const g = new Grid();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.line(32, 32, Math.round(32 + Math.cos(a) * 30), Math.round(32 + Math.sin(a) * 30), `${aura}@50`);
  }
  g.blit(base);
  return g;
}

// ─── cartas novas ─────────────────────────────────────────────
const estacaPrata = () => {
  const g = weaponCard(estaca().recolor({ m4: 't4', m5: 't5', m3: 't3', m6: 'w', m2: 't2' }), 'b5');
  g.px([[50, 8], [52, 6], [56, 12]], 'w');
  return g;
};
const aspiradorTurbo = () => {
  const g = weaponCard(aspirador(), 'v5');
  for (const y of [12, 20, 28]) g.line(4, y, 14, y, 'v5');
  return g;
};
const cruzFlamejante = () => {
  const g = new Grid();
  for (const [x, h] of [[20, 24], [32, 34], [44, 24]]) g.poly([[x - 9, 62], [x + 9, 62], [x, 62 - h - 20]], 'o3');
  for (const [x, h] of [[26, 20], [38, 20]]) g.poly([[x - 6, 62], [x + 6, 62], [x, 62 - h - 14]], 'y3');
  g.blit(cruz());
  return g;
};

function provocacao() {
  const g = new Grid();
  // balão de fala bravo com "!!": provoca o oponente
  g.ellipse(32, 26, 26, 18, 'r3');
  g.poly([[14, 38], [24, 42], [10, 56]], 'r3');
  g.shade({ depth: 2 });
  for (const x of [24, 38]) {
    g.rect(x, 12, 5, 18, 'w');
    g.rect(x, 34, 5, 5, 'w');
  }
  g.px([[56, 8], [58, 6], [60, 10], [6, 8], [4, 10]], 'y3');
  return finish(g, { shade: false });
}

function disfarce() {
  const g = new Grid();
  // máscara de baile com olhos vazados
  g.ellipse(32, 30, 26, 14, 'p3');
  g.poly([[6, 30], [16, 20], [12, 38]], 'p3');
  g.poly([[58, 30], [48, 20], [52, 38]], 'p3');
  g.shade({ depth: 2 });
  g.ellipse(21, 30, 7, 5, null);
  g.ellipse(43, 30, 7, 5, null);
  g.ring(21, 30, 7, 1, 'y3');
  g.ring(43, 30, 7, 1, 'y3');
  g.stroke(52, 38, 58, 58, 2, 'm4');
  return finish(g, { shade: false });
}

// ─── expressões ───────────────────────────────────────────────
/** Carinha redonda base das expressões. */
function face(fill = 'y3') {
  const g = new Grid();
  g.circle(32, 32, 24, fill);
  g.shade({ depth: 2 });
  return g;
}

function emoteRisada() {
  const g = face();
  g.line(18, 24, 24, 20, 'k').line(24, 20, 28, 24, 'k');
  g.line(36, 24, 40, 20, 'k').line(40, 20, 46, 24, 'k');
  g.ellipse(32, 38, 12, 8, 'k2');
  g.erase((x, y) => y < 36 && Math.hypot((x - 32) / 12, (y - 38) / 8) < 1);
  g.rect(22, 36, 20, 2, 'w');
  g.ellipse(32, 43, 6, 2, 'r3');
  g.px([[10, 22], [9, 24], [54, 22], [55, 24]], 'c4'); // lágrimas de rir
  return finish(g, { shade: false });
}

function emoteGg() {
  const g = face('v4');
  // polegar para cima
  g.rect(22, 28, 18, 18, 's4');
  g.rect(26, 14, 8, 16, 's4');
  g.rect(40, 30, 4, 4, 's3'); g.rect(40, 35, 4, 4, 's3'); g.rect(40, 40, 4, 4, 's3');
  g.shade();
  g.line(26, 30, 26, 44, 's2');
  return finish(g, { shade: false });
}

function emoteSusto() {
  const g = face('gh4');
  g.circle(22, 26, 6, 'w'); g.circle(42, 26, 6, 'w');
  g.circle(22, 26, 2, 'k'); g.circle(42, 26, 2, 'k');
  g.ellipse(32, 44, 6, 8, 'k2');
  g.px([[50, 12], [52, 16], [12, 12]], 'b4');
  return finish(g, { shade: false });
}

function emoteRaiva() {
  const g = face('r3');
  g.line(16, 20, 28, 26, 'k').line(48, 20, 36, 26, 'k');
  g.rect(20, 28, 6, 4, 'k'); g.rect(38, 28, 6, 4, 'k');
  g.rect(22, 42, 20, 4, 'k2');
  g.px([[24, 42], [28, 45], [32, 42], [36, 45], [40, 42]], 'w');
  for (const [x, y] of [[48, 8], [54, 12], [50, 14]]) g.set(x, y, 'k'); // veia
  return finish(g, { shade: false });
}

function emoteCoracao() {
  const g = new Grid();
  for (const [x, y, r] of [[22, 24, 13], [42, 24, 13]]) g.circle(x, y, r, 'r3');
  g.poly([[9, 28], [55, 28], [32, 56]], 'r3');
  g.shade({ depth: 2 });
  g.px([[16, 18], [17, 17], [18, 17]], 'r5');
  return finish(g, { shade: false });
}

function emoteCaveira() {
  const g = new Grid();
  g.ellipse(32, 28, 22, 20, 'q4');
  g.rect(20, 40, 24, 14, 'q4');
  g.shade({ depth: 2 });
  g.ellipse(23, 30, 6, 7, 'k'); g.ellipse(41, 30, 6, 7, 'k');
  g.set(23, 30, 'r3'); g.set(41, 30, 'r3');
  g.poly([[30, 38], [34, 38], [32, 44]], 'k');
  for (let x = 22; x <= 40; x += 4) g.rect(x, 48, 2, 6, 'k2');
  return finish(g, { shade: false });
}

// ─── moedas e símbolos ────────────────────────────────────────
/** Ecto: gota de energia fantasma (moeda dos cosméticos). */
function ecto() {
  const g = new Grid();
  g.circle(32, 38, 18, 'v4');
  g.poly([[18, 32], [46, 32], [32, 4]], 'v4');
  g.shade({ depth: 2 });
  g.ellipse(26, 34, 4, 6, 'v6');
  g.rect(26, 40, 3, 4, 'k2'); g.rect(36, 40, 3, 4, 'k2');
  return finish(g, { shade: false });
}

/** Taça de torneio. */
function taca() {
  const g = new Grid();
  g.poly([[14, 8], [50, 8], [46, 30], [18, 30]], 'y3');
  g.ellipse(32, 30, 14, 8, 'y3');
  g.rect(28, 36, 8, 12, 'y2');
  g.rect(18, 48, 28, 8, 'm3');
  g.ring(12, 18, 6, 2, 'y2'); g.ring(52, 18, 6, 2, 'y2');
  g.shade({ depth: 2 });
  g.rect(22, 50, 20, 2, 'y3');
  return finish(g, { shade: false });
}

/** Coroa do Rei da Arena. */
function coroa() {
  const g = new Grid();
  g.poly([[8, 50], [56, 50], [58, 18], [44, 32], [32, 12], [20, 32], [6, 18]], 'y3');
  g.rect(8, 50, 48, 6, 'y2');
  g.shade({ depth: 2 });
  g.circle(32, 40, 4, 'r3'); g.circle(18, 42, 3, 'c4'); g.circle(46, 42, 3, 'c4');
  g.circle(32, 12, 3, 'y4'); g.circle(6, 18, 3, 'y4'); g.circle(58, 18, 3, 'y4');
  return finish(g, { shade: false });
}

/** Olho (assistir uma partida). */
const assistir = () => visao();

// ─── molduras de avatar (64x64, centro vazio) ─────────────────
/** Moldura quadrada com cantos decorados. c = [borda, luz, sombra, detalhe]. */
function frame([edge, light, dark, gem], { spikes = false, ghost = false } = {}) {
  const g = new Grid();
  g.rect(2, 2, 60, 60, edge);
  g.erase((x, y) => x >= 8 && x < 56 && y >= 8 && y < 56);
  g.rect(2, 2, 60, 2, light); g.rect(2, 2, 2, 60, light);
  g.rect(2, 60, 60, 2, dark); g.rect(60, 2, 2, 60, dark);
  g.frame(7, 7, 50, 50, dark);
  for (const [x, y] of [[5, 5], [58, 5], [5, 58], [58, 58]]) g.circle(x, y, 4, gem);
  if (spikes) for (const [x, y] of [[32, 1], [32, 62], [1, 32], [62, 32]]) g.circle(x, y, 3, gem);
  if (ghost) for (const [x, y] of [[18, 4], [46, 4], [18, 59], [46, 59]]) g.rect(x - 1, y - 1, 3, 3, 'w');
  g.outline('k');
  return g;
}

export function arenaIconSheets() {
  return {
    perk_estaca_prata: estacaPrata(), perk_aspirador_turbo: aspiradorTurbo(), perk_cruz_flamejante: cruzFlamejante(),
    perk_provocacao: provocacao(), perk_disfarce: disfarce(),
    emote_risada: emoteRisada(), emote_gg: emoteGg(), emote_susto: emoteSusto(),
    emote_raiva: emoteRaiva(), emote_coracao: emoteCoracao(), emote_caveira: emoteCaveira(),
    ecto: ecto(), taca: taca(), coroa: coroa(), assistir: assistir(),
  };
}

export function frameSheets() {
  return {
    moldura_madeira: frame(['m3', 'm5', 'm1', 'm4']),
    moldura_prata: frame(['t4', 't5', 't2', 'b4']),
    moldura_ouro: frame(['y2', 'y4', 'y1', 'r3']),
    moldura_fantasma: frame(['gh2', 'gh4', 'gh1', 'c4'], { ghost: true }),
    moldura_temporada_prata: frame(['t3', 't5', 't1', 'w'], { spikes: true }),
    moldura_temporada_ouro: frame(['y2', 'y4', 'o1', 'y4'], { spikes: true }),
    moldura_temporada_platina: frame(['c3', 'c5', 'c1', 'w'], { spikes: true }),
    moldura_temporada_lenda: frame(['p3', 'p5', 'p1', 'y3'], { spikes: true, ghost: true }),
  };
}
