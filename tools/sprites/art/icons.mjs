// Ícones (estilo de volume, desenhados em 32x32 e ampliados para 64x64):
// armas, golpes dos monstros, itens, interface, cartas e ligas.
import {
  icone, OURO, PRATA, METAL, FERRO, MADEIRA, MADEIRA_CLARA, PERGAMINHO, OSSO, BRANCO, VIDRO, ECTO,
  VERMELHO, LARANJA, VERDE, VERDE_ESCURO, CIANO, AZUL, ROXO, LILAS, PELE, PELE_ESCURA, CINZA, CINZA_ESCURO, PEDRA, SOMBRA,
} from './materiais.mjs';
import { mat } from '../lib/volume.mjs';

/** Raios de luz atrás de um ícone (no fundo, sem contorno). */
export function raios(g, cx, cy, r, c, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    g.line(cx, cy, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c);
  }
}

/** Brilhinho em cruz. */
export function faisca(g, x, y, c = 'w') {
  g.px([[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], c);
}

// ═══════════════════════ armas do Caçador ═══════════════════════
// As armas são "desenhos" que recebem o Model: as cartas da Arena reaproveitam com outro material.

/** Estaca de madeira (ou de outro material, na carta Estaca de Prata). */
export function desenhaEstaca(m, { haste = MADEIRA, ponta = MADEIRA_CLARA, anel = FERRO, veio = 'm3', luz = 'm6' } = {}) {
  m.part(haste, 'cylinder', (p) => p.stroke(5, 26, 17, 14, 5, 'x'));
  m.part(ponta, 'cylinder', (p) => p.poly([[14, 11], [21, 18], [29, 2]], 'x'));
  m.part(anel, 'cylinder', (p) => p.stroke(6, 24, 8, 22, 6, 'x'));
  m.paint((g) => { g.line(9, 24, 16, 17, veio); g.line(19, 12, 25, 6, luz); });
}
export const estaca = () => icone((m) => desenhaEstaca(m));

/** Aspirador de fantasmas: tanque com visor, mangueira e bocal. */
export function desenhaAspirador(m, { visor = 'v4', brilho = 'v6' } = {}) {
  m.part(METAL, 'cylinder', (p) => p.rect(3, 9, 12, 16, 'x'));
  m.part(CINZA_ESCURO, 'cylinder', (p) => p.stroke(14, 20, 20, 15, 2, 'x'));
  m.part(PRATA, 'cylinder', (p) => p.stroke(19, 15, 27, 7, 3, 'x'));
  m.paint((g) => {
    g.rect(5, 12, 7, 6, 'k2');
    g.rect(6, 13, 5, 4, visor);
    g.rect(6, 13, 2, 1, brilho);
    g.rect(5, 21, 8, 1, 't2');
    g.set(4, 10, 'r3');
  });
}
export const aspirador = () => icone((m) => {
  desenhaAspirador(m);
  m.overlay((g) => { faisca(g, 29, 4, 'v5'); g.set(26, 3, 'v6'); });
});

/** Cruz de ouro com um rubi. */
export function desenhaCruz(m) {
  m.part(OURO, 'cylinder', (p) => p.rect(13, 3, 6, 27, 'x'));
  m.part(OURO, 'hcylinder', (p) => p.rect(6, 9, 20, 5, 'x'));
  m.paint((g) => { g.rect(15, 10, 2, 2, 'r3'); g.set(15, 10, 'r5'); });
}
export const cruz = () => icone((m) => {
  m.backdrop((g) => raios(g, 16, 13, 14, 'y4', 8));
  desenhaCruz(m);
});

// ═══════════════════════ golpes dos monstros ═══════════════════════
const possessao = () => icone((m) => {
  m.part(SOMBRA, 'hcylinder', (p) => p.ellipse(16, 27, 12, 3, 'x'));
  m.part(LILAS, 'cylinder', (p) => {
    p.rect(9, 13, 13, 14, 'x');
    for (const [x, h] of [[9, 9], [12, 11], [15, 12], [18, 11]]) p.rect(x, 13 - h + 4, 3, h, 'x');
    p.stroke(21, 19, 26, 13, 3, 'x');   // polegar
  });
  m.paint((g) => { for (const x of [12, 15, 18]) g.line(x, 9, x, 13, 'p2'); });
});

const assombracao = () => icone((m) => {
  m.part(AZUL, 'flat', (p) => { p.ring(16, 16, 14, 2, 'x'); p.ring(16, 16, 10, 1, 'x'); }, { edge: false });
  m.part(ECTO, 'sphere', (p) => {
    p.ellipse(16, 14, 6, 6, 'x');
    p.rect(10, 14, 13, 6, 'x');
    p.poly([[10, 19], [23, 19], [21, 23], [18, 21], [16, 24], [13, 21], [11, 23]], 'x');
  });
  m.paint((g) => { g.rect(13, 12, 2, 3, 'k'); g.rect(18, 12, 2, 3, 'k'); g.ellipse(16, 18, 1, 1, 'k2'); });
});

const maldicao = () => icone((m) => {
  m.part(ROXO, 'cylinder', (p) => {
    p.poly([[5, 28], [27, 28], [26, 12], [22, 18], [20, 6], [16, 14], [12, 5], [10, 17], [6, 11]], 'x');
  });
  m.part(OSSO, 'sphere', (p) => { p.ellipse(16, 17, 7, 6, 'x'); p.rect(12, 21, 9, 5, 'x'); });
  m.paint((g) => {
    g.rect(12, 16, 3, 3, 'p1'); g.rect(18, 16, 3, 3, 'p1');
    g.set(13, 17, 'p5'); g.set(19, 17, 'p5');
    g.set(16, 20, 'k2');
    for (const x of [13, 15, 17, 19]) g.set(x, 24, 'q1');
  });
});

// ═══════════════════════ itens ═══════════════════════
/** Frasco redondo com líquido; `r` é o raio do bulbo. */
function frasco(liquido, r, extra) {
  return icone((m) => {
    const cy = 30 - r - 1;
    m.part(VIDRO, 'sphere', (p) => { p.circle(16, cy, r, 'x'); p.rect(14, cy - r - 5, 5, 6, 'x'); });
    m.part(liquido, 'sphere', (p) => {
      p.circle(16, cy, r - 1, 'x');
      p.erase((x, y) => y < cy - 1);
    }, { edge: false });
    m.part(MADEIRA, 'hcylinder', (p) => p.rect(13, cy - r - 7, 7, 3, 'x'));
    m.paint((g) => { g.rect(12, cy - 3, 1, 3, 'w'); g.set(13, cy - 4, 'w'); });
    extra?.(m, cy);
  });
}

const pocao = () => frasco(VERMELHO, 7);
const pocaoGrande = () => frasco(VERMELHO, 9, (m) => m.overlay((g) => faisca(g, 27, 8, 'r5')));
const aguaBenta = () => frasco(AZUL, 8, (m, cy) => m.paint((g) => { g.rect(15, cy - 1, 2, 6, 'w'); g.rect(13, cy + 1, 6, 2, 'w'); }));

const elixir = () => icone((m) => {
  m.part(VIDRO, 'cylinder', (p) => p.poly([[14, 8], [19, 8], [19, 14], [26, 28], [7, 28], [14, 14]], 'x'));
  m.part(LARANJA, 'cylinder', (p) => p.poly([[11, 20], [22, 20], [25, 27], [8, 27]], 'x'), { edge: false });
  m.part(ROXO, 'hcylinder', (p) => p.rect(13, 5, 7, 3, 'x'));
  m.paint((g) => { g.rect(15, 10, 1, 4, 'w'); g.set(10, 25, 'y4'); });
  m.overlay((g) => { faisca(g, 4, 9, 'y4'); faisca(g, 28, 13, 'y4'); g.set(27, 4, 'w'); });
});

const amuleto = () => icone((m) => {
  m.part(OURO, 'flat', (p) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + i * 0.1125);
      p.circle(16 + Math.cos(a) * 12, 13 + Math.sin(a) * 9, 1, 'x');
    }
  }, { edge: false });
  m.part(OURO, 'sphere', (p) => p.poly([[16, 11], [24, 20], [16, 29], [8, 20]], 'x'));
  m.part(AZUL, 'sphere', (p) => p.poly([[16, 14], [21, 20], [16, 26], [11, 20]], 'x'), { light: 1 });
  m.overlay((g) => faisca(g, 14, 17));
});

const vela = () => icone((m) => {
  m.part(OURO, 'hcylinder', (p) => p.ellipse(16, 27, 11, 3, 'x'));
  m.part(BRANCO, 'cylinder', (p) => p.rect(12, 11, 9, 16, 'x'));
  m.part(LARANJA, 'sphere', (p) => p.poly([[16, 2], [19, 7], [16, 10], [13, 7]], 'x'), { light: 1 });
  m.paint((g) => { g.rect(15, 6, 2, 3, 'y4'); g.line(16, 10, 16, 11, 'k2'); g.rect(13, 12, 2, 4, 'g5'); });
});

const moeda = () => icone((m) => {
  m.part(OURO, 'sphere', (p) => p.circle(16, 16, 13, 'x'));
  m.paint((g) => {
    g.ring(16, 16, 10, 1, 'y2');
    g.ellipse(16, 14, 5, 4, 'y1'); g.rect(13, 17, 7, 4, 'y1');       // caveirinha gravada
    g.rect(13, 13, 2, 2, 'y3'); g.rect(18, 13, 2, 2, 'y3');
    for (const x of [14, 16, 18]) g.rect(x, 19, 1, 2, 'y2');
  });
});

function coracao(material) {
  return icone((m) => {
    m.part(material, 'sphere', (p) => {
      p.circle(10, 11, 7, 'x'); p.circle(22, 11, 7, 'x');
      p.poly([[3, 13], [29, 13], [16, 28]], 'x');
    });
  });
}

function altoFalante(m) {
  m.part(PRATA, 'cylinder', (p) => { p.rect(4, 12, 6, 9, 'x'); p.poly([[9, 12], [17, 5], [17, 28], [9, 21]], 'x'); });
}
const somOn = () => icone((m) => {
  altoFalante(m);
  m.part(BRANCO, 'flat', (p) => {
    for (const r of [6, 10]) { p.ring(17, 16, r, 2, 'x'); }
    p.erase((x) => x < 20);
  }, { edge: false });
});
const somOff = () => icone((m) => {
  altoFalante(m);
  m.part(VERMELHO, 'cylinder', (p) => { p.stroke(20, 11, 28, 21, 3, 'x'); p.stroke(28, 11, 20, 21, 3, 'x'); });
});

const cadeado = () => icone((m) => {
  m.part(PRATA, 'cylinder', (p) => { p.ring(16, 12, 7, 3, 'x'); p.erase((x, y) => y > 13); p.rect(9, 12, 3, 4, 'x'); p.rect(20, 12, 3, 4, 'x'); });
  m.part(OURO, 'cylinder', (p) => p.rect(6, 15, 21, 14, 'x'));
  m.paint((g) => { g.circle(16, 20, 2, 'k2'); g.rect(15, 21, 3, 5, 'k2'); g.set(16, 20, 'y1'); });
});

function estrela(material) {
  return icone((m) => {
    m.part(material, 'sphere', (p) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 14;
        pts.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
      }
      p.poly(pts, 'x');
    });
  });
}

const caveira = () => icone((m) => {
  m.part(OSSO, 'sphere', (p) => { p.ellipse(16, 13, 11, 10, 'x'); p.rect(10, 20, 13, 8, 'x'); });
  m.paint((g) => {
    g.ellipse(11, 14, 3, 3, 'k'); g.ellipse(21, 14, 3, 3, 'k');
    g.set(11, 14, 'r3'); g.set(21, 14, 'r3');
    g.poly([[15, 19], [18, 19], [16.5, 22]], 'k2');
    for (const x of [12, 15, 18, 21]) g.rect(x, 25, 1, 3, 'q1');
  });
});

const livro = () => icone((m) => {
  m.part(PERGAMINHO, 'cylinder', (p) => p.rect(9, 4, 19, 25, 'x'));
  m.part(ROXO, 'cylinder', (p) => p.rect(5, 3, 20, 26, 'x'));
  m.part(OURO, 'cylinder', (p) => p.rect(5, 3, 3, 26, 'x'), { edge: false });
  m.paint((g) => {
    g.ellipse(15, 15, 5, 3, 'w');
    g.circle(15, 15, 2, 'p1');
    g.set(15, 15, 'r3');
    g.frame(9, 6, 13, 19, 'y2');
  });
});

const sacola = () => icone((m) => {
  m.part(MADEIRA, 'sphere', (p) => { p.ellipse(16, 20, 11, 9, 'x'); p.poly([[11, 12], [21, 12], [19, 6], [13, 6]], 'x'); });
  m.part(MADEIRA_CLARA, 'flat', (p) => { p.circle(12, 5, 2, 'x'); p.circle(20, 5, 2, 'x'); });
  m.part(OURO, 'hcylinder', (p) => p.rect(11, 11, 11, 2, 'x'));
  m.paint((g) => {
    // cifrão: S de pixels com a barra no meio
    g.rect(14, 16, 5, 1, 'y3'); g.rect(13, 17, 1, 2, 'y3'); g.rect(14, 19, 4, 1, 'y3');
    g.rect(18, 20, 1, 2, 'y3'); g.rect(13, 22, 5, 1, 'y3'); g.rect(16, 15, 1, 9, 'y4');
  });
});

const espadas = () => icone((m) => {
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 4 : 28, x1 = s < 0 ? 26 : 6;
    m.part(PRATA, 'cylinder', (p) => p.stroke(x0, 3, x1 + s * 0, 23, 3, 'x'));
    m.part(OURO, 'hcylinder', (p) => p.stroke(x1 - s * 3, 20, x1 + s * 3, 26, 2, 'x'));
    m.part(MADEIRA, 'cylinder', (p) => p.stroke(x1 + s * 1, 24, x1 + s * 4, 28, 2, 'x'));
  }
});

const pausa = () => icone((m) => {
  m.part(BRANCO, 'cylinder', (p) => { p.rect(8, 5, 6, 22, 'x'); p.rect(18, 5, 6, 22, 'x'); });
});

const fechar = () => icone((m) => {
  m.part(VERMELHO, 'cylinder', (p) => { p.stroke(6, 6, 25, 25, 5, 'x'); p.stroke(25, 6, 6, 25, 5, 'x'); });
});

function seta(dir) {
  return icone((m) => {
    m.part(BRANCO, 'sphere', (p) => p.poly(dir === 'left' ? [[24, 4], [24, 28], [6, 16]] : [[8, 4], [8, 28], [26, 16]], 'x'));
  });
}

const engrenagem = () => icone((m) => {
  m.part(METAL, 'sphere', (p) => {
    p.circle(16, 16, 10, 'x');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      p.rect(Math.round(16 + Math.cos(a) * 11) - 2, Math.round(16 + Math.sin(a) * 11) - 2, 5, 5, 'x');
    }
  });
  m.cut((p) => p.circle(16, 16, 4, 'x'));
});

const disquete = () => icone((m) => {
  m.part(AZUL, 'flat', (p) => p.poly([[4, 4], [24, 4], [28, 8], [28, 28], [4, 28]], 'x'));
  m.part(PRATA, 'cylinder', (p) => p.rect(9, 4, 13, 8, 'x'));
  m.part(BRANCO, 'hcylinder', (p) => p.rect(8, 17, 16, 11, 'x'));
  m.paint((g) => { g.rect(17, 5, 3, 6, 'b2'); g.rect(10, 20, 12, 1, 'g3'); g.rect(10, 23, 9, 1, 'g3'); });
});

const duelo = () => icone((m) => {
  m.part(mat('k2', { line: 'k' }), 'sphere', (p) => { p.circle(10, 11, 7, 'x'); p.circle(6, 16, 4, 'x'); });
  m.part(PELE_ESCURA, 'sphere', (p) => p.ellipse(12, 15, 5, 6, 'x'));
  m.part(ROXO, 'cylinder', (p) => p.rect(3, 24, 13, 6, 'x'));
  m.part(ECTO, 'sphere', (p) => { p.ellipse(23, 14, 7, 7, 'x'); p.poly([[16, 15], [30, 15], [29, 27], [25, 24], [22, 28], [18, 24], [16, 27]], 'x'); });
  m.paint((g) => { g.rect(14, 13, 1, 2, 'k'); g.rect(20, 12, 3, 3, 'w'); g.rect(20, 13, 2, 2, 'r3'); });
  m.overlay((g) => g.poly([[17, 3], [14, 11], [17, 11], [14, 19], [21, 9], [18, 9], [20, 3]], 'y3'));
});

const pergaminho = () => icone((m) => {
  m.part(PERGAMINHO, 'cylinder', (p) => p.rect(7, 6, 18, 20, 'x'));
  m.part(MADEIRA_CLARA, 'hcylinder', (p) => { p.rect(5, 3, 22, 4, 'x'); p.rect(5, 25, 22, 4, 'x'); });
  m.paint((g) => { for (const y of [10, 13, 16, 19, 22]) g.rect(10, y, y === 22 ? 7 : 12, 1, 'm3'); });
});

export const trofeu = () => icone((m) => {
  for (const side of [-1, 1]) {
    m.part(OURO, 'sphere', (p) => {
      p.ring(16 + side * 9, 10, 4, 2, 'x');
      p.erase((x) => (side < 0 ? x > 9 : x < 23));
    }, { edge: false });
  }
  m.part(OURO, 'cylinder', (p) => p.poly([[8, 5], [25, 5], [24, 10], [21, 15], [12, 15], [9, 10]], 'x'));
  m.part(OURO, 'hcylinder', (p) => p.rect(7, 4, 19, 2, 'x'), { light: 1, edge: false });
  m.part(OURO, 'cylinder', (p) => p.rect(14, 16, 5, 5, 'x'));
  m.part(OURO, 'cylinder', (p) => p.ellipse(16, 20, 4, 1, 'x'));
  m.part(OURO, 'cylinder', (p) => p.poly([[11, 22], [22, 22], [23, 25], [10, 25]], 'x'));
  m.part(MADEIRA, 'cylinder', (p) => p.rect(8, 26, 17, 3, 'x'));
  m.paint((g) => { g.set(11, 7, 'w'); g.set(11, 8, 'w'); g.set(12, 7, 'y4'); });
});

const check = () => icone((m) => {
  m.part(VERDE, 'cylinder', (p) => { p.stroke(5, 16, 12, 24, 5, 'x'); p.stroke(12, 24, 27, 7, 5, 'x'); });
});

const alvo = () => icone((m) => {
  m.part(VERMELHO, 'flat', (p) => {
    p.ring(16, 16, 10, 2, 'x');
    p.rect(15, 2, 3, 8, 'x'); p.rect(15, 23, 3, 8, 'x'); p.rect(2, 15, 8, 3, 'x'); p.rect(23, 15, 8, 3, 'x');
  });
  m.part(LARANJA, 'sphere', (p) => p.circle(16, 16, 2, 'x'));
});

const interrogacao = () => icone((m) => {
  m.part(BRANCO, 'cylinder', (p) => {
    p.ring(16, 11, 7, 4, 'x');
    p.erase((x, y) => y > 11 && x < 17);
    p.rect(14, 16, 5, 6, 'x');
    p.rect(14, 24, 5, 5, 'x');
  });
});

const jogar = () => icone((m) => {
  m.part(VERDE, 'sphere', (p) => p.poly([[8, 4], [8, 28], [27, 16]], 'x'));
});

const casa = () => icone((m) => {
  m.part(MADEIRA_CLARA, 'cylinder', (p) => p.rect(7, 14, 19, 15, 'x'));
  m.part(VERMELHO, 'hcylinder', (p) => p.poly([[3, 15], [16, 3], [29, 15], [26, 17], [6, 17]], 'x'));
  m.part(MADEIRA, 'cylinder', (p) => p.rect(14, 20, 6, 9, 'x'));
  m.paint((g) => { g.rect(9, 18, 3, 3, 'y3'); g.set(9, 18, 'y4'); g.set(18, 24, 'y3'); });
});

const repetir = () => icone((m) => {
  m.part(BRANCO, 'sphere', (p) => {
    p.ring(16, 17, 10, 4, 'x');
    p.erase((x, y) => x > 17 && y < 15);
    p.poly([[17, 3], [27, 9], [17, 15]], 'x');
  });
});

/**
 * Balão de pensamento das pistas. O jogo desenha em escala 2 e põe o ícone do golpe
 * em escala 1 por cima: o centro da nuvem tem que ficar em (34, 24) do quadro de 64.
 */
const pista = () => icone((m) => {
  const NUVEM = { tones: ['q2', 'q3', 'q4', 'w', 'w'], line: 'q1' };
  m.part(NUVEM, 'sphere', (p) => {
    for (const [x, y, r] of [[12, 10, 6.5], [19, 8, 6.5], [24, 13, 6], [18, 17, 6.5], [11, 16, 6]]) p.circle(x, y, r, 'x');
  }, { edge: false });
  m.part(NUVEM, 'sphere', (p) => { p.circle(6, 25, 2, 'x'); p.circle(3, 29, 1, 'x'); });
});

const bolsa = () => icone((m) => {
  m.part(MADEIRA, 'sphere', (p) => { p.ellipse(16, 19, 11, 10, 'x'); p.poly([[10, 11], [22, 11], [20, 6], [12, 6]], 'x'); });
  m.part(MADEIRA_CLARA, 'hcylinder', (p) => p.rect(8, 10, 17, 3, 'x'));
  m.part(OURO, 'sphere', (p) => p.rect(14, 12, 5, 5, 'x'));
});

const martelo = () => icone((m) => {
  m.part(MADEIRA, 'cylinder', (p) => p.stroke(6, 27, 18, 14, 3, 'x'));
  m.part(FERRO, 'sphere', (p) => p.poly([[13, 7], [22, 2], [29, 12], [20, 17]], 'x'));
  m.paint((g) => g.line(15, 7, 21, 4, 't5'));
});

// ═══════════════════════ cartas (perks) ═══════════════════════
function escudo(material, cruzMat) {
  return (m) => {
    m.part(material, 'cylinder', (p) => p.poly([[5, 4], [27, 4], [27, 17], [16, 29], [5, 17]], 'x'));
    if (cruzMat) {
      m.part(cruzMat, 'cylinder', (p) => p.rect(14, 8, 5, 15, 'x'));
      m.part(cruzMat, 'hcylinder', (p) => p.rect(10, 11, 13, 4, 'x'));
    }
  };
}
const perkEscudo = () => icone(escudo(AZUL, OURO));

function punho(m, dx, dy) {
  m.part(PELE, 'sphere', (p) => {
    p.rect(4 + dx, 8 + dy, 12, 10, 'x');
    p.rect(2 + dx, 12 + dy, 4, 5, 'x');
  });
  m.paint((g) => { for (const x of [7, 10, 13]) g.line(x + dx, 8 + dy, x + dx, 11 + dy, 's2'); });
}
const perkGolpeDuplo = () => icone((m) => {
  punho(m, 0, 11);
  punho(m, 13, 2);
  m.overlay((g) => { faisca(g, 29, 2, 'y4'); g.set(3, 29, 'y4'); });
});

const perkEmpateForte = () => icone((m) => {
  m.part(OURO, 'cylinder', (p) => { p.rect(15, 4, 3, 22, 'x'); p.rect(4, 7, 25, 2, 'x'); });
  for (const x of [8, 25]) {
    m.part(OURO, 'hcylinder', (p) => { p.line(x - 4, 9, x - 4, 18, 'x'); p.line(x + 4, 9, x + 4, 18, 'x'); p.ellipse(x, 19, 5, 2, 'x'); });
  }
  m.part(MADEIRA, 'hcylinder', (p) => p.rect(9, 26, 15, 3, 'x'));
});

/** Olho aberto (carta Visão e o botão de assistir partidas). */
export const visao = () => icone((m) => {
  m.part(BRANCO, 'sphere', (p) => p.poly([[2, 16], [9, 8], [16, 6], [23, 8], [30, 16], [23, 24], [16, 26], [9, 24]], 'x'));
  m.part(ROXO, 'sphere', (p) => p.circle(16, 16, 7, 'x'));
  m.paint((g) => { g.circle(16, 16, 3, 'k'); g.rect(13, 13, 2, 2, 'w'); });
});

const perkResistencia = () => icone((m) => {
  m.part(PEDRA, 'cylinder', (p) => {
    p.rect(6, 9, 21, 20, 'x');
    for (const x of [6, 12, 18, 24]) p.rect(x, 4, 4, 5, 'x');
  });
  m.paint((g) => {
    for (const y of [13, 18, 23]) g.rect(7, y, 19, 1, 't2');
    for (const [x, y] of [[12, 9], [20, 13], [10, 18], [18, 18], [14, 23], [22, 23]]) g.rect(x, y, 1, 5, 't2');
    g.rect(14, 22, 5, 7, 'k2');
  });
});

const perkSorte = () => icone((m) => {
  m.part(VERDE_ESCURO, 'cylinder', (p) => p.stroke(16, 16, 22, 30, 2, 'x'));
  m.part(VERDE, 'sphere', (p) => {
    for (const [x, y] of [[11, 10], [21, 10], [11, 19], [21, 19]]) p.circle(x, y, 5.5, 'x');
  });
  m.paint((g) => { g.line(16, 6, 16, 23, 'v2'); g.line(6, 15, 26, 15, 'v2'); g.set(9, 8, 'v6'); });
});

const perkCura = () => icone((m) => {
  m.part(VERMELHO, 'sphere', (p) => { p.circle(10, 11, 7, 'x'); p.circle(22, 11, 7, 'x'); p.poly([[3, 13], [29, 13], [16, 28]], 'x'); });
  m.part(VERDE, 'cylinder', (p) => { p.rect(14, 8, 5, 13, 'x'); p.rect(10, 12, 13, 5, 'x'); }, { light: 1 });
});

const perkEspinhos = () => icone((m) => {
  m.part(PRATA, 'sphere', (p) => {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      p.poly([[16 + Math.cos(a - 0.35) * 8, 16 + Math.sin(a - 0.35) * 8], [16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15],
        [16 + Math.cos(a + 0.35) * 8, 16 + Math.sin(a + 0.35) * 8]], 'x');
    }
  });
  m.part(VERDE_ESCURO, 'sphere', (p) => p.circle(16, 16, 8, 'x'));
  m.paint((g) => { g.line(11, 13, 14, 15, 'k'); g.line(21, 13, 18, 15, 'k'); g.rect(13, 19, 6, 1, 'k'); });
});

const perkVampirismo = () => icone((m) => {
  // boca aberta: lábios vermelhos, fundo escuro e as presas
  m.part(VERMELHO, 'hcylinder', (p) => p.ellipse(16, 12, 14, 8, 'x'));
  m.paint((g) => {
    g.ellipse(16, 12, 11, 5, 'r1');
    g.rect(6, 7, 21, 2, 'w');                           // dentes de cima
    g.poly([[7, 8], [11, 8], [9, 15]], 'w');            // presas
    g.poly([[21, 8], [25, 8], [23, 15]], 'w');
    g.set(9, 13, 'g5'); g.set(23, 13, 'g5');
  });
  m.part(VERMELHO, 'sphere', (p) => { p.ellipse(9, 24, 2, 3, 'x'); p.poly([[9, 19], [11, 23], [7, 23]], 'x'); });
  m.part(VERMELHO, 'sphere', (p) => { p.ellipse(23, 26, 2, 3, 'x'); p.poly([[23, 21], [25, 25], [21, 25]], 'x'); });
});

const perkFuria = () => icone((m) => {
  m.part(LARANJA, 'sphere', (p) => {
    for (const [x, h] of [[7, 17], [12, 23], [17, 26], [22, 22], [26, 16]]) p.poly([[x - 5, 29], [x + 5, 29], [x, 29 - h]], 'x');
  }, { edge: false, light: 1 });
  m.part(PELE, 'sphere', (p) => { p.rect(9, 15, 14, 13, 'x'); p.rect(7, 19, 4, 6, 'x'); });
  m.paint((g) => { for (const x of [12, 15, 18]) g.line(x, 15, x, 18, 's2'); });
});

const perkEscudoSagrado = () => icone((m) => {
  m.part(OURO, 'flat', (p) => { p.ring(16, 4, 5, 2, 'x'); }, { edge: false });
  escudo(BRANCO, OURO)(m);
  m.overlay((g) => { faisca(g, 3, 9, 'y4'); faisca(g, 29, 9, 'y4'); g.set(4, 22, 'y4'); g.set(28, 22, 'y4'); });
});

const perkJuizo = () => icone((m) => {
  m.part(CINZA_ESCURO, 'sphere', (p) => { for (const [x, y, r] of [[10, 12, 6], [17, 8, 7], [24, 12, 6], [16, 14, 7]]) p.circle(x, y, r, 'x'); });
  m.part(OURO, 'cylinder', (p) => p.poly([[17, 15], [11, 23], [16, 23], [12, 31], [22, 19], [17, 19], [20, 15]], 'x'), { light: 1 });
});

// ═══════════════════════ ligas ═══════════════════════
function liga(cor, coroa = false) {
  return icone((m) => {
    m.part(mat(cor, { line: 'k' }), 'cylinder', (p) => p.poly([[5, 6], [27, 6], [27, 20], [16, 30], [5, 20]], 'x'));
    m.part(mat('g1', { line: 'k' }), 'flat', (p) => p.poly([[9, 10], [23, 10], [23, 19], [16, 25], [9, 19]], 'x'));
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7;
      pts.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
    }
    m.part(mat(cor), 'sphere', (p) => p.poly(pts, 'x'), { light: 2, edge: false });
    if (coroa) m.part(OURO, 'cylinder', (p) => p.poly([[8, 7], [24, 7], [25, 1], [21, 4], [16, 0], [11, 4], [7, 1]], 'x'));
  });
}

export function iconSheets() {
  return {
    estaca: estaca(), aspirador: aspirador(), cruz: cruz(),
    possessao: possessao(), assombracao: assombracao(), maldicao: maldicao(),
    pocao: pocao(), pocao_grande: pocaoGrande(), agua_benta: aguaBenta(), elixir: elixir(),
    amuleto: amuleto(), vela: vela(), moeda: moeda(), coracao: coracao(VERMELHO), coracao_vazio: coracao(CINZA_ESCURO),
    som_on: somOn(), som_off: somOff(),
    cadeado: cadeado(), estrela: estrela(OURO), estrela_vazia: estrela(CINZA_ESCURO),
    caveira: caveira(), livro: livro(), sacola: sacola(), espadas: espadas(),
    pausa: pausa(), fechar: fechar(), seta_esq: seta('left'), seta_dir: seta('right'),
    engrenagem: engrenagem(), disquete: disquete(), duelo: duelo(), pergaminho: pergaminho(),
    trofeu: trofeu(), check: check(), alvo: alvo(), interrogacao: interrogacao(),
    jogar: jogar(), casa: casa(), repetir: repetir(), pista: pista(), bolsa: bolsa(), martelo: martelo(),
    perk_escudo: perkEscudo(), perk_golpe_duplo: perkGolpeDuplo(), perk_empate_forte: perkEmpateForte(),
    perk_visao: visao(), perk_resistencia: perkResistencia(), perk_sorte: perkSorte(),
    perk_cura: perkCura(), perk_espinhos: perkEspinhos(), perk_vampirismo: perkVampirismo(),
    perk_furia: perkFuria(), perk_escudo_sagrado: perkEscudoSagrado(), perk_juizo: perkJuizo(),
    liga_bronze: liga('o2'), liga_prata: liga('t4'), liga_ouro: liga('y3'), liga_platina: liga('c4'), liga_lenda: liga('p4', true),
  };
}
