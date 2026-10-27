// Ícones do Ateliê (editor de avatar em pixel art) e as notas do aviso e do botão de música.
// Estilo de volume (lib/volume.mjs), como os outros ícones.
import { icone, MADEIRA, METAL, PRATA, VERMELHO, BRANCO, VIDRO, CIANO, AZUL, ROXO, LILAS, AMARELO, CINZA, CINZA_ESCURO } from './materiais.mjs';
import { mat } from '../lib/volume.mjs';
import { faisca } from './icons.mjs';

/** Colcheia: a música que está tocando. Desligada, ela fica cinza e riscada. */
function nota({ off = false } = {}) {
  return icone((m) => {
    const cor = off ? CINZA : CIANO;
    m.part(cor, 'cylinder', (p) => { p.rect(15, 5, 3, 20, 'x'); p.poly([[16, 4], [26, 9], [26, 15], [17, 11]], 'x'); });
    m.part(cor, 'sphere', (p) => p.ellipse(11, 24, 6, 5, 'x'));
    if (off) m.part(VERMELHO, 'cylinder', (p) => p.stroke(4, 4, 28, 28, 3, 'x'));
  });
}

const pincel = () => icone((m) => {
  m.part(MADEIRA, 'cylinder', (p) => p.stroke(26, 4, 16, 15, 4, 'x'));
  m.part(METAL, 'cylinder', (p) => p.stroke(16, 15, 13, 18, 4, 'x'));
  m.part(VERMELHO, 'sphere', (p) => p.poly([[12, 17], [15, 20], [8, 28], [4, 29], [5, 25]], 'x'));
});

const borracha = () => icone((m) => {
  m.part(mat('r4', { line: 'r2' }), 'sphere', (p) => p.poly([[16, 4], [28, 16], [20, 24], [8, 12]], 'x'));
  m.part(BRANCO, 'sphere', (p) => p.poly([[8, 12], [20, 24], [16, 28], [4, 16]], 'x'));
});

const balde = () => icone((m) => {
  m.part(CINZA, 'flat', (p) => { p.ring(15, 11, 9, 1, 'x'); p.erase((x, y) => y > 10); }, { edge: false });
  m.part(METAL, 'cylinder', (p) => p.poly([[6, 11], [24, 11], [22, 28], [8, 28]], 'x'));
  m.part(AZUL, 'hcylinder', (p) => p.ellipse(15, 11, 8, 2, 'x'), { light: 1 });
  m.part(AZUL, 'sphere', (p) => { p.poly([[22, 11], [27, 13], [28, 21], [25, 22], [24, 15]], 'x'); p.circle(27, 25, 2, 'x'); });
});

const contaGotas = () => icone((m) => {
  m.part(VIDRO, 'cylinder', (p) => p.stroke(22, 10, 9, 23, 4, 'x'));
  m.part(VERMELHO, 'sphere', (p) => p.circle(25, 7, 4, 'x'));
  m.part(CINZA_ESCURO, 'cylinder', (p) => p.stroke(9, 23, 5, 27, 2, 'x'));
  m.part(AZUL, 'sphere', (p) => p.ellipse(4, 29, 1, 1, 'x'));
});

/** Espelho: desenha dos dois lados de uma vez. */
const espelho = () => icone((m) => {
  m.part(ROXO, 'sphere', (p) => p.poly([[13, 7], [3, 16], [13, 25]], 'x'));
  m.part(LILAS, 'sphere', (p) => p.poly([[19, 7], [29, 16], [19, 25]], 'x'), { light: -1 });
  m.part(AMARELO, 'cylinder', (p) => p.rect(15, 2, 2, 28, 'x'));
});

function seta(dir) {
  return icone((m) => {
    m.part(BRANCO, 'sphere', (p) => {
      p.ring(16, 19, 9, 4, 'x');
      p.erase((x, y) => y > 19);
      if (dir === 'undo') p.poly([[2, 17], [13, 17], [7, 26]], 'x');
      else p.poly([[30, 17], [19, 17], [25, 26]], 'x');
    });
  });
}

const lixeira = () => icone((m) => {
  m.part(PRATA, 'cylinder', (p) => p.poly([[7, 10], [25, 10], [23, 29], [9, 29]], 'x'));
  m.part(PRATA, 'hcylinder', (p) => { p.rect(5, 6, 22, 3, 'x'); p.rect(12, 3, 8, 3, 'x'); }, { light: 1 });
  m.paint((g) => { for (const x of [12, 16, 20]) g.rect(x, 13, 1, 13, 't2'); });
});

/** Mostrar/esconder as linhas da grade. */
const grade = () => icone((m) => {
  m.part(CINZA_ESCURO, 'flat', (p) => p.rect(4, 4, 24, 24, 'x'));
  m.paint((g) => {
    for (let i = 0; i <= 4; i++) { g.rect(4 + i * 6, 4, 1, 24, 'g4'); g.rect(4, 4 + i * 6, 24, 1, 'g4'); }
    g.rect(11, 11, 5, 5, 'y3');
    g.rect(17, 17, 5, 5, 'c4');
  });
  m.overlay((g) => faisca(g, 28, 3, 'y4'));
});

export function editorIconSheets() {
  return {
    nota: nota(), nota_off: nota({ off: true }), pincel: pincel(), borracha: borracha(), balde: balde(), conta_gotas: contaGotas(),
    espelho: espelho(), desfazer: seta('undo'), refazer: seta('redo'), lixeira: lixeira(), grade: grade(),
  };
}
