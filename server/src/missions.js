'use strict';
// Missões diárias: 3 por jogador por dia, sorteadas com a data e o id do jogador
// (todo mundo tem missões diferentes, mas as suas não mudam se você recarregar).
// Recompensa: Ecto. Os eventos chegam das partidas, do Desafio do Dia e do chefe cooperativo.
const crypto = require('crypto');

const PER_DAY = 3;

/** `event` é o que conta progresso; `weapon` filtra rodadas vencidas com uma arma. */
const MISSIONS = [
  { id: 'jogar', text: 'Jogue 3 partidas', n: 3, reward: 20, event: 'match' },
  { id: 'vencer', text: 'Vença 2 partidas', n: 2, reward: 30, event: 'win' },
  { id: 'estaca', text: 'Vença 6 rodadas com a Estaca', n: 6, reward: 25, event: 'round_win', weapon: 'estaca' },
  { id: 'aspirador', text: 'Vença 6 rodadas com o Aspirador', n: 6, reward: 25, event: 'round_win', weapon: 'aspirador' },
  { id: 'cruz', text: 'Vença 6 rodadas com a Cruz', n: 6, reward: 25, event: 'round_win', weapon: 'cruz' },
  { id: 'cartas', text: 'Use 8 cartas', n: 8, reward: 20, event: 'card' },
  { id: 'empates', text: 'Empate 5 rodadas', n: 5, reward: 20, event: 'draw' },
  { id: 'desafio', text: 'Jogue o Desafio do Dia', n: 1, reward: 25, event: 'daily' },
  { id: 'chefe', text: 'Derrote um Chefe Cooperativo', n: 1, reward: 40, event: 'raid_win' },
  { id: 'duplas', text: 'Jogue 2 partidas 2x2', n: 2, reward: 25, event: 'duo' },
];

const missionById = (id) => MISSIONS.find(m => m.id === id);

/** Sorteio estável: as mesmas 3 missões para o mesmo jogador no mesmo dia. */
function missionsFor(day, playerId) {
  const scored = MISSIONS.map(m => ({ id: m.id, h: crypto.createHash('sha1').update(`${day}|${playerId}|${m.id}`).digest().readUInt32BE(0) }));
  return scored.sort((a, b) => a.h - b.h).slice(0, PER_DAY).map(s => s.id);
}

/** Garante as missões do dia (troca as de ontem). Retorna true se mudou. */
function ensureMissions(player, day) {
  if (player.missions?.day === day) return false;
  player.missions = { day, list: missionsFor(day, player.id).map(id => ({ id, progress: 0, claimed: false })) };
  return true;
}

/** Soma progresso nas missões que contam este evento. Retorna true se alguma andou. */
function track(player, event, { weapon = null, amount = 1 } = {}) {
  let changed = false;
  for (const m of player.missions?.list ?? []) {
    const def = missionById(m.id);
    if (!def || def.event !== event || (def.weapon && def.weapon !== weapon) || m.progress >= def.n) continue;
    m.progress = Math.min(def.n, m.progress + amount);
    changed = true;
  }
  return changed;
}

/** Resgata a recompensa de uma missão completa. */
function claim(player, id) {
  const m = player.missions?.list.find(x => x.id === id);
  const def = missionById(id);
  if (!m || !def) return { ok: false, reason: 'Missão não encontrada.' };
  if (m.claimed) return { ok: false, reason: 'Recompensa já resgatada.' };
  if (m.progress < def.n) return { ok: false, reason: 'Missão ainda não terminou.' };
  m.claimed = true;
  player.ecto = (player.ecto ?? 0) + def.reward;
  return { ok: true, reward: def.reward };
}

/** Dados para a tela. */
function missionsView(player) {
  return (player.missions?.list ?? []).map(m => {
    const def = missionById(m.id);
    return { id: m.id, text: def.text, n: def.n, reward: def.reward, progress: m.progress, claimed: m.claimed };
  });
}

module.exports = { MISSIONS, PER_DAY, missionsFor, ensureMissions, track, claim, missionsView };
