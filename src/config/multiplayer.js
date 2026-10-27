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

/** Modos da Arena (o servidor confirma as regras de cada um). */
export const MODES = {
  ranked: { name: 'Ranqueada', desc: 'Vale troféus. Seu deck e seu caçador.', icon: 'icon/trofeu' },
  casual: { name: 'Casual', desc: 'Treino sem troféus.', icon: 'icon/espadas' },
  duo: { name: '2x2', desc: 'Dupla contra dupla, vida somada. Começa quando 4 caçadores entram na fila.', icon: 'icon/duelo' },
  raid: { name: 'Chefe Cooperativo', desc: 'Você e um parceiro contra um chefe da campanha. Vale Ecto.', icon: 'icon/caveira' },
  tournament: { name: 'Torneio Relâmpago', desc: 'De 4 a 8 caçadores em mata-mata. O campeão leva uma taça e Ecto.', icon: 'icon/taca' },
  king: { name: 'Rei da Arena', desc: 'Quem vence fica. Cada vitória como rei vale Ecto.', icon: 'icon/coroa' },
};

export const frameSprite = (id) => `ui/moldura_${id}`;
export const emoteIcon = (id) => `icon/emote_${id}`;
