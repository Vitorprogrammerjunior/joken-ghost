// Multiplayer: endereço do servidor e como desenhar cartas/ligas.
// As regras (cartas, personagens, troféus) vêm do servidor no 'welcome'.

/** Servidor Socket.io (Render, plano grátis). Pode ser trocado na URL: ?server=https://outro-servidor */
export function serverUrl() {
  const override = new URLSearchParams(location.search).get('server');
  if (override) return override;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'http://localhost:3001';
  return 'https://joken-ghost.onrender.com';
}

export const RARITY = {
  comum: { name: 'Comum', frame: 'card/card_comum' },
  raro: { name: 'Rara', frame: 'card/card_raro' },
  epico: { name: 'Épica', frame: 'card/card_epico' },
  lendario: { name: 'Lendária', frame: 'card/card_lendario' },
};

export const LEAGUE_NAMES = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', platina: 'Platina', lenda: 'Lenda' };

export const cardIcon = (id) => `icon/perk_${id}`;
export const leagueIcon = (id) => `icon/liga_${id}`;
