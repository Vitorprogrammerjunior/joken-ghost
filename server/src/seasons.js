'use strict';
// Temporadas mensais do ranking (horário de Brasília).
// No dia 1º: quem passou de 1000 troféus perde metade do que passou (o resto continua),
// e cada jogador ganha uma recompensa pela melhor liga que alcançou na temporada.
// Desbloqueios de cartas e personagens nunca se perdem (usam a melhor marca de todas).
const { leagueOf } = require('./catalog');
const { grant } = require('./cosmetics');

const TIME_ZONE = 'America/Sao_Paulo';
const RESET_THRESHOLD = 1000;

/** Recompensa pela melhor liga da temporada. */
const REWARDS = {
  bronze: { ecto: 20, frame: null },
  prata: { ecto: 50, frame: 'temporada_prata' },
  ouro: { ecto: 100, frame: 'temporada_ouro' },
  platina: { ecto: 150, frame: 'temporada_platina' },
  lenda: { ecto: 250, frame: 'temporada_lenda' },
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Ano e mês (0-11) no fuso do Brasil. */
function yearMonth(date) {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).format(date).split('-').map(Number);
  return { y, m: m - 1 };
}

/** Número da temporada (cresce 1 por mês). */
function seasonId(date = new Date()) {
  const { y, m } = yearMonth(date);
  return y * 12 + m;
}

/** Nome e quando acaba (meia-noite do dia 1º seguinte em Brasília, que é UTC-3). */
function seasonInfo(date = new Date()) {
  const { y, m } = yearMonth(date);
  const next = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
  const endsAt = Date.UTC(next.y, next.m, 1, 3, 0, 0);
  return { id: y * 12 + m, name: `Temporada de ${MONTHS[m]}`, endsAt };
}

/**
 * Fecha a temporada de um jogador que volta depois da virada do mês:
 * entrega a recompensa da liga alcançada e começa a contar a nova.
 * Contas novas (season 0) só entram na temporada atual. Retorna a recompensa ou null.
 */
function settlePlayer(player, currentId) {
  if (player.season === currentId) return null;
  const isNew = !player.season;
  const league = leagueOf(player.seasonBest ?? 0);
  player.season = currentId;
  player.seasonBest = player.trophies;
  if (isNew) return null;
  const reward = REWARDS[league];
  player.ecto = (player.ecto ?? 0) + reward.ecto;
  if (reward.frame) grant(player, reward.frame);
  return { league, ...reward };
}

/**
 * Virada global: corta os troféus acima do limite uma única vez por temporada
 * (o último corte fica salvo nos dados gerais).
 */
async function rollSeason(store, date = new Date()) {
  const current = seasonId(date);
  const last = await store.getMeta('season');
  if (last == null) { await store.setMeta('season', current); return false; }
  if (last === current) return false;
  await store.trimTrophies(RESET_THRESHOLD);
  await store.setMeta('season', current);
  return true;
}

module.exports = { RESET_THRESHOLD, REWARDS, seasonId, seasonInfo, settlePlayer, rollSeason };
