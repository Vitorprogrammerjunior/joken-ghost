'use strict';
// Cosméticos da Arena: avatar, molduras e expressões. Não mudam o jogo, só o visual.
// Molduras e expressões são compradas com Ecto (ganho em missões, torneios, Rei da Arena e temporadas).
// O avatar é o rosto de um caçador liberado ou um desenho feito no Ateliê (formato em src/domain/avatar.js).

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

/** Avatar de conta nova: o rosto do caçador inicial (o desenho fica guardado mesmo sem uso). */
const DEFAULT_AVATAR = Object.freeze({ kind: 'hunter', hunter: 'cacador', art: null });

/**
 * Troca o avatar: `{ kind: 'hunter', hunter }` (caçador liberado) ou `{ kind: 'art', art }` (desenho do Ateliê).
 * @param {{ unlocked: string[], isValidArt: (art: string) => boolean }} rules
 */
function setAvatar(player, { kind, hunter, art } = {}, { unlocked, isValidArt }) {
  const current = player.avatar ?? DEFAULT_AVATAR;
  if (kind === 'hunter') {
    if (!unlocked.includes(hunter)) return { ok: false, reason: 'Caçador bloqueado.' };
    player.avatar = { ...current, kind, hunter };
    return { ok: true };
  }
  if (kind === 'art') {
    if (!isValidArt(art)) return { ok: false, reason: 'Desenho inválido.' };
    player.avatar = { ...current, kind, art };
    return { ok: true };
  }
  return { ok: false, reason: 'Avatar inválido.' };
}

/** O que os outros jogadores veem: o avatar em uso (sem o desenho guardado, se não for ele) e a moldura. */
function publicLook(player) {
  const a = player.avatar ?? DEFAULT_AVATAR;
  return {
    avatar: a.kind === 'art' ? { kind: 'art', art: a.art } : { kind: 'hunter', hunter: a.hunter },
    frame: player.equipped?.frame ?? null,
  };
}

module.exports = { FRAMES, EMOTES, FREE, DEFAULT_AVATAR, cosmeticById, owns, buy, equipFrame, grant, canEmote, setAvatar, publicLook };
