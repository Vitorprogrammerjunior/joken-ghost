'use strict';
// Cosméticos da Arena: molduras de avatar e expressões. Não mudam o jogo, só o visual.
// São comprados com Ecto (ganho em missões, torneios, Rei da Arena e temporadas).

const FRAMES = [
  { id: 'madeira', name: 'Moldura de Madeira', price: 0 },
  { id: 'prata', name: 'Moldura de Prata', price: 150 },
  { id: 'ouro', name: 'Moldura de Ouro', price: 300 },
  { id: 'fantasma', name: 'Moldura Fantasma', price: 450 },
  // só ganhas no fim de cada temporada, pela liga alcançada
  { id: 'temporada_prata', name: 'Temporada: Prata', price: null, season: 'prata' },
  { id: 'temporada_ouro', name: 'Temporada: Ouro', price: null, season: 'ouro' },
  { id: 'temporada_platina', name: 'Temporada: Platina', price: null, season: 'platina' },
  { id: 'temporada_lenda', name: 'Temporada: Lenda', price: null, season: 'lenda' },
];

const EMOTES = [
  { id: 'risada', name: 'Risada', price: 0 },
  { id: 'gg', name: 'Bom jogo', price: 0 },
  { id: 'susto', name: 'Susto', price: 0 },
  { id: 'raiva', name: 'Raiva', price: 100 },
  { id: 'coracao', name: 'Coração', price: 100 },
  { id: 'caveira', name: 'Caveira', price: 120 },
];

const ALL = [...FRAMES.map(f => ({ ...f, kind: 'frame' })), ...EMOTES.map(e => ({ ...e, kind: 'emote' }))];
const cosmeticById = (id) => ALL.find(c => c.id === id);

/** Itens que todo mundo tem desde o começo. */
const FREE = ALL.filter(c => c.price === 0).map(c => c.id);

const owns = (player, id) => FREE.includes(id) || (player.cosmetics ?? []).includes(id);

/** Compra com Ecto. Retorna { ok, reason? }. */
function buy(player, id) {
  const item = cosmeticById(id);
  if (!item || item.price == null) return { ok: false, reason: 'Item indisponível.' };
  if (owns(player, id)) return { ok: false, reason: 'Você já tem este item.' };
  if ((player.ecto ?? 0) < item.price) return { ok: false, reason: 'Ecto insuficiente.' };
  player.ecto -= item.price;
  player.cosmetics = [...(player.cosmetics ?? []), id];
  return { ok: true };
}

/** Coloca a moldura (null = nenhuma). */
function equipFrame(player, id) {
  if (id != null && (cosmeticById(id)?.kind !== 'frame' || !owns(player, id))) return { ok: false, reason: 'Moldura bloqueada.' };
  player.equipped = { ...(player.equipped ?? {}), frame: id };
  return { ok: true };
}

/** Dá um item de presente (recompensa de temporada), se ainda não tiver. */
function grant(player, id) {
  if (!owns(player, id)) player.cosmetics = [...(player.cosmetics ?? []), id];
}

const canEmote = (player, id) => cosmeticById(id)?.kind === 'emote' && owns(player, id);

module.exports = { FRAMES, EMOTES, FREE, cosmeticById, owns, buy, equipFrame, grant, canEmote };
