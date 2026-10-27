// Arte da Arena (multiplayer): cartas novas, expressões, moedas e molduras de avatar.
// Os ícones usam o estilo de volume (lib/volume.mjs); as molduras são interface e ficam em 64x64.
import { Grid } from '../lib/grid.mjs';
import { mat } from '../lib/volume.mjs';
import { desenhaEstaca, desenhaAspirador, desenhaCruz, visao, raios, faisca } from './icons.mjs';
import {
  icone, OURO, PRATA, METAL, FERRO, MADEIRA, BRANCO, OSSO, ECTO, VERMELHO, LARANJA, AMARELO, VERDE, ROXO, LILAS, PELE,
} from './materiais.mjs';

// ─── cartas novas ─────────────────────────────────────────────
const estacaPrata = () => icone((m) => {
  m.backdrop((g) => raios(g, 16, 16, 15, 'b5', 12));
  desenhaEstaca(m, { haste: PRATA, ponta: { ...PRATA, tones: ['t3', 't4', 't5', 'w', 'w'] }, anel: OURO, veio: 't3', luz: 'w' });
  m.overlay((g) => { faisca(g, 26, 9); faisca(g, 6, 7, 'b5'); });
});

const aspiradorTurbo = () => icone((m) => {
  m.backdrop((g) => { for (const y of [6, 12, 18, 24]) g.line(1, y, 4, y, 'v5'); raios(g, 26, 7, 4, 'v5', 8); });
  desenhaAspirador(m, { visor: 'v5', brilho: 'w' });
  m.overlay((g) => { faisca(g, 29, 4, 'v6'); faisca(g, 24, 2, 'v5'); });
});

const cruzFlamejante = () => icone((m) => {
  // labaredas separadas (cada uma com volume), a de fora laranja e o miolo amarelo
  for (const [x, h, w] of [[6, 16, 5], [26, 16, 5], [11, 22, 5], [21, 22, 5]]) {
    m.part(LARANJA, 'sphere', (p) => p.poly([[x - w, 31], [x + w, 31], [x + 1, 31 - h]], 'x'), { light: 1 });
    m.part(AMARELO, 'sphere', (p) => p.poly([[x - 2, 31], [x + 2, 31], [x + 1, 31 - h * 0.55]], 'x'), { edge: false });
  }
  desenhaCruz(m);
});

const provocacao = () => icone((m) => {
  m.part(VERMELHO, 'sphere', (p) => { p.ellipse(16, 13, 13, 9, 'x'); p.poly([[7, 19], [12, 21], [4, 29]], 'x'); });
  m.paint((g) => { for (const x of [12, 19]) { g.rect(x, 7, 3, 8, 'w'); g.rect(x, 17, 3, 2, 'w'); } });
  m.overlay((g) => { faisca(g, 29, 3, 'y3'); faisca(g, 3, 4, 'y3'); });
});

const disfarce = () => icone((m) => {
  m.part(MADEIRA, 'cylinder', (p) => p.stroke(25, 19, 28, 28, 2, 'x'));
  m.part(ROXO, 'hcylinder', (p) => {
    p.ellipse(16, 15, 13, 7, 'x');
    p.poly([[3, 15], [8, 9], [6, 19]], 'x');
    p.poly([[29, 15], [24, 9], [26, 19]], 'x');
  });
  m.cut((p) => { p.ellipse(10, 15, 3, 2, 'x'); p.ellipse(22, 15, 3, 2, 'x'); });
  m.paint((g) => { g.ring(10, 15, 4, 1, 'y3'); g.ring(22, 15, 4, 1, 'y3'); g.set(16, 10, 'y4'); });
});

// ─── expressões ───────────────────────────────────────────────
/** Carinha redonda das expressões. */
function cara(material, detalhes) {
  return icone((m) => {
    m.part(material, 'sphere', (p) => p.circle(16, 16, 13, 'x'));
    detalhes(m);
  });
}

const emoteRisada = () => cara(AMARELO, (m) => m.paint((g) => {
  g.line(8, 12, 11, 10, 'k').line(11, 10, 13, 12, 'k');
  g.line(19, 12, 21, 10, 'k').line(21, 10, 24, 12, 'k');
  g.ellipse(16, 19, 6, 4, 'k2');
  g.erase((x, y) => y < 18 && Math.hypot((x - 16) / 6, (y - 19) / 4) < 1.1);
  g.rect(11, 18, 11, 1, 'w');
  g.ellipse(16, 22, 3, 1, 'r3');
}));

const emoteGg = () => cara(VERDE, (m) => {
  // joinha: punho fechado com o polegar para cima
  m.part(mat('s5', { line: 's2' }), 'sphere', (p) => { p.rect(9, 14, 13, 10, 'x'); p.rect(10, 5, 6, 11, 'x'); });
  m.paint((g) => { for (const y of [16, 19, 22]) g.rect(19, y, 3, 1, 's2'); g.line(16, 9, 16, 14, 's2'); });
});

const emoteSusto = () => cara(mat('gh4', { line: 'gh1' }), (m) => m.paint((g) => {
  g.circle(11, 13, 3, 'w'); g.circle(21, 13, 3, 'w');
  g.rect(11, 13, 1, 1, 'k'); g.rect(21, 13, 1, 1, 'k');
  g.ellipse(16, 22, 3, 4, 'k2');
}));

const emoteRaiva = () => cara(VERMELHO, (m) => {
  m.paint((g) => {
    g.line(7, 9, 13, 12, 'k').line(25, 9, 19, 12, 'k');
    g.rect(10, 13, 3, 2, 'k'); g.rect(19, 13, 3, 2, 'k');
    g.rect(10, 20, 12, 3, 'k2');
    for (const x of [11, 14, 17, 20]) g.set(x, 20, 'w');
  });
  m.overlay((g) => g.px([[25, 2], [27, 4], [25, 5], [28, 1]], 'k'));
});

const emoteCoracao = () => icone((m) => {
  m.part(VERMELHO, 'sphere', (p) => { p.circle(10, 12, 7, 'x'); p.circle(22, 12, 7, 'x'); p.poly([[3, 14], [29, 14], [16, 29]], 'x'); });
  m.overlay((g) => { faisca(g, 28, 4, 'r5'); g.set(4, 4, 'r5'); });
});

const emoteCaveira = () => icone((m) => {
  m.part(OSSO, 'sphere', (p) => { p.ellipse(16, 13, 11, 10, 'x'); p.rect(10, 20, 13, 8, 'x'); });
  m.paint((g) => {
    g.ellipse(11, 14, 3, 3, 'k'); g.ellipse(21, 14, 3, 3, 'k');
    g.set(11, 14, 'r3'); g.set(21, 14, 'r3');
    g.poly([[15, 19], [18, 19], [16.5, 22]], 'k2');
    for (const x of [12, 15, 18, 21]) g.rect(x, 25, 1, 3, 'q1');
  });
});

// ─── moedas e símbolos ────────────────────────────────────────
/** Ecto: gota de energia fantasma (moeda dos cosméticos). */
const ecto = () => icone((m) => {
  m.part(mat('v4', { line: 'v1' }), 'sphere', (p) => { p.circle(16, 19, 10, 'x'); p.poly([[8, 16], [24, 16], [16, 2]], 'x'); });
  m.paint((g) => { g.rect(12, 19, 2, 3, 'k2'); g.rect(18, 19, 2, 3, 'k2'); g.rect(14, 24, 4, 1, 'v2'); });
});

/** Taça de torneio: bojo largo e alças grandes. */
const taca = () => icone((m) => {
  for (const side of [-1, 1]) {
    m.part(OURO, 'sphere', (p) => { p.ring(16 + side * 10, 10, 4, 2, 'x'); p.erase((x) => (side < 0 ? x > 8 : x < 24)); }, { edge: false });
  }
  m.part(OURO, 'cylinder', (p) => { p.poly([[6, 4], [26, 4], [24, 13], [8, 13]], 'x'); p.ellipse(16, 13, 8, 5, 'x'); });
  m.part(OURO, 'cylinder', (p) => p.rect(14, 18, 5, 6, 'x'));
  m.part(MADEIRA, 'cylinder', (p) => p.rect(9, 24, 15, 5, 'x'));
  m.paint((g) => { g.rect(12, 26, 9, 1, 'y3'); g.rect(10, 6, 1, 4, 'w'); });
});

/** Coroa do Rei da Arena. */
const coroa = () => icone((m) => {
  m.part(OURO, 'cylinder', (p) => p.poly([[5, 25], [27, 25], [28, 9], [22, 16], [16, 6], [10, 16], [4, 9]], 'x'));
  m.part(OURO, 'hcylinder', (p) => p.rect(5, 24, 23, 4, 'x'));
  m.part(VERMELHO, 'sphere', (p) => p.circle(16, 19, 2, 'x'));
  m.part(mat('c4', { line: 'c1' }), 'sphere', (p) => { p.circle(9, 20, 1.5, 'x'); p.circle(23, 20, 1.5, 'x'); });
  m.part(AMARELO, 'sphere', (p) => { p.circle(16, 5, 2, 'x'); p.circle(4, 8, 2, 'x'); p.circle(28, 8, 2, 'x'); });
});

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
