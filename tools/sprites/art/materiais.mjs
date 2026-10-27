// Materiais do estilo de volume (lib/volume.mjs): 5 tons do escuro ao brilho + linha interna.
// Ícones e monstros usam os mesmos materiais, então tudo combina.
import { Model, mat } from '../lib/volume.mjs';

export const OURO = { tones: ['y1', 'y2', 'y3', 'y4', 'w'], line: 'o1' };
export const PRATA = { tones: ['t2', 't3', 't4', 't5', 'w'], line: 't1' };
export const METAL = mat('t4', { line: 't1' });
export const FERRO = mat('t3', { line: 't1' });
export const MADEIRA = mat('m4', { line: 'm1' });
export const MADEIRA_CLARA = { tones: ['m3', 'm4', 'm5', 'm6', 'm6'], line: 'm2' };
export const PERGAMINHO = { tones: ['m4', 'm5', 'm6', 'q4', 'q4'], line: 'm3' };
export const OSSO = { tones: ['q1', 'q2', 'q3', 'q4', 'w'], line: 'g2' };
export const BRANCO = { tones: ['g3', 'g4', 'g5', 'w', 'w'], line: 'g2' };
export const VIDRO = { tones: ['gh2', 'gh3', 'gh4', 'gh5', 'w'], line: 'gh1' };
export const ECTO = mat('gh3', { line: 'gh1' });
export const VERMELHO = mat('r3', { line: 'r1' });
export const LARANJA = mat('o3', { line: 'o1' });
export const AMARELO = { tones: ['y2', 'y3', 'y3', 'y4', 'w'], line: 'y1' };
export const VERDE = mat('v4', { line: 'v1' });
export const VERDE_ESCURO = mat('v3', { line: 'v1' });
export const CIANO = mat('c3', { line: 'c1' });
export const AZUL = mat('b3', { line: 'b1' });
export const ROXO = mat('p3', { line: 'p1' });
export const LILAS = mat('p4', { line: 'p2' });
export const PELE = mat('s4', { line: 's1' });
export const PELE_ESCURA = mat('s3', { line: 's1' });
export const CINZA = mat('g4', { line: 'g1' });
export const CINZA_ESCURO = mat('g2', { line: 'k' });
export const PEDRA = mat('t3', { line: 't1' });
export const SOMBRA = mat('p2', { line: 'k' });

/** Monta um ícone: `draw(m)` recebe um Model 32x32 e o resultado é o quadro 64x64. */
export function icone(draw) {
  const m = new Model();
  draw(m);
  return m.render();
}
