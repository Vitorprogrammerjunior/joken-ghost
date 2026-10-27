// Avatar do perfil na Arena: o rosto de um caçador ou um desenho do jogador em pixel art.
// O desenho é uma grade 16x16 guardada como texto: um dígito hexadecimal por pixel
// (índice na paleta abaixo), linha por linha. O servidor usa este mesmo módulo para validar.

export const ART_SIZE = 16;

/** Paleta do Ateliê (cores da paleta do jogo). O índice 0 é transparente: mostra o fundo. */
export const ART_PALETTE = [
  null,
  '#0e0b16', '#6e6a80', '#f4f2fa', '#d23a3a', '#f08c2a', '#f6d548', '#5fb24a', '#2fb5b5',
  '#3a5cc4', '#6a34a3', '#ffb3a0', '#f0bd8c', '#9a6038', '#6a3d26', '#6b4029',
];

const ART_PATTERN = new RegExp(`^[0-9a-f]{${ART_SIZE * ART_SIZE}}$`);

export const isValidArt = (art) => typeof art === 'string' && ART_PATTERN.test(art);

/** Desenho vazio (tudo transparente). */
export const blankArt = () => '0'.repeat(ART_SIZE * ART_SIZE);

/** Texto -> lista de índices da paleta (um por pixel). */
export const decodeArt = (art) => [...art].map(ch => parseInt(ch, 16));

/** Lista de índices -> texto. */
export const encodeArt = (pixels) => pixels.map(i => i.toString(16)).join('');

export const isBlankArt = (art) => /^0*$/.test(art);
