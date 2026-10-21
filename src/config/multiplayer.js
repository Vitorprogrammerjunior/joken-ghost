// Endereço do servidor multiplayer (Socket.io no Railway).
// Pode ser trocado na URL: ?server=https://outro-servidor
export function serverUrl() {
  const override = new URLSearchParams(location.search).get('server');
  if (override) return override;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'http://localhost:3001';
  return 'https://joken-ghost-production.up.railway.app';
}

/** Rótulos e ícones das jogadas por papel. */
export const MP_MOVES = {
  hunter: {
    pedra: { name: 'Estaca', icon: 'icon/estaca', fx: 'fx/estaca' },
    papel: { name: 'Aspirador', icon: 'icon/aspirador', fx: 'fx/aspirador' },
    tesoura: { name: 'Cruz', icon: 'icon/cruz', fx: 'fx/cruz' },
  },
  monster: {
    pedra: { name: 'Possessão', icon: 'icon/possessao', fx: 'fx/possessao' },
    papel: { name: 'Assombração', icon: 'icon/assombracao', fx: 'fx/assombracao' },
    tesoura: { name: 'Maldição', icon: 'icon/maldicao', fx: 'fx/maldicao' },
  },
};

/** Textos dos perks (o servidor manda sem acento). */
export const PERKS = {
  escudo: { name: 'Escudo', desc: 'Se perderia, empata nesta rodada.' },
  golpe_duplo: { name: 'Golpe Duplo', desc: 'Sua vitória vale 2 pontos.' },
  empate_forte: { name: 'Empate Forte', desc: 'Empate conta como vitória.' },
  visao: { name: 'Visão', desc: 'Vê quando o oponente já escolheu.' },
  resistencia: { name: 'Resistência', desc: 'O oponente não pontua se vencer.' },
  sorte: { name: 'Sorte', desc: '50% de ponto extra ao vencer.' },
};
