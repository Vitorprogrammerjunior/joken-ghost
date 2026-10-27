'use strict';
// Catálogo do multiplayer: regras, cartas, deck, caçadores, ligas e cosméticos.
// O servidor é a fonte da verdade; o cliente recebe isto no 'welcome'.

const RULES = {
  baseDamage: 20,
  passiveBonus: 5,         // dano extra com a arma preferida do personagem
  weaponCardBonus: 15,     // cartas de arma: dano extra se vencer com aquela arma
  baseHp: 100,
  duoHpScale: 0.75,        // 2x2: a vida somada da dupla vale 75% (a partida não fica longa demais)
  handSize: 3,
  cardPhaseMs: 10000,
  weaponPhaseMs: 10000,
  visionWeaponMs: 5000,    // quem enfrenta a Visão tem só 5s para escolher a arma
  revealMs: 4200,
  suddenDeathRound: 12,    // a partir daqui o dano dobra
  reconnectGraceMs: 15000,
};

/** `weapon`: carta de arma (bônus se vencer com ela). */
const CARDS = [
  { id: 'escudo', name: 'Escudo', rarity: 'comum', trophies: 0, desc: 'Se você perder a rodada, não toma dano.' },
  { id: 'cura', name: 'Bálsamo', rarity: 'comum', trophies: 0, desc: 'Recupera 15 de vida no início da rodada.' },
  { id: 'golpe_duplo', name: 'Golpe Duplo', rarity: 'comum', trophies: 0, desc: 'Se você vencer a rodada, causa dano dobrado.' },
  { id: 'sorte', name: 'Trevo da Sorte', rarity: 'raro', trophies: 100, desc: 'Se vencer, 50% de chance de causar +20 de dano.' },
  { id: 'estaca_prata', name: 'Estaca de Prata', rarity: 'raro', trophies: 150, weapon: 'estaca', desc: 'Se vencer com a Estaca, causa +15 de dano.' },
  { id: 'empate_forte', name: 'Empate Forte', rarity: 'raro', trophies: 200, desc: 'Se empatar, o oponente toma 15 de dano.' },
  { id: 'aspirador_turbo', name: 'Aspirador Turbo', rarity: 'raro', trophies: 250, weapon: 'aspirador', desc: 'Se vencer com o Aspirador, causa +15 de dano.' },
  { id: 'espinhos', name: 'Espinhos', rarity: 'raro', trophies: 300, desc: 'Se perder, devolve 12 de dano ao oponente.' },
  { id: 'cruz_flamejante', name: 'Cruz Flamejante', rarity: 'raro', trophies: 350, weapon: 'cruz', desc: 'Se vencer com a Cruz, causa +15 de dano.' },
  { id: 'provocacao', name: 'Provocação', rarity: 'raro', trophies: 450, desc: 'O oponente não pode repetir a arma da rodada anterior.' },
  { id: 'vampirismo', name: 'Vampirismo', rarity: 'epico', trophies: 500, desc: 'Se vencer, recupera metade do dano que causou.' },
  { id: 'disfarce', name: 'Disfarce', rarity: 'epico', trophies: 650, desc: 'A Visão do oponente vê uma arma falsa. Se vencer, +10 de dano.' },
  { id: 'furia', name: 'Fúria', rarity: 'epico', trophies: 750, desc: 'Se vencer com menos da metade da vida, causa +20 de dano.' },
  { id: 'visao', name: 'Visão', rarity: 'epico', trophies: 900, desc: 'O oponente tem só 5s para escolher a arma, e você vê qual foi.' },
  { id: 'escudo_sagrado', name: 'Escudo Sagrado', rarity: 'lendario', trophies: 1200, desc: 'Você não toma dano nesta rodada e recupera 10 de vida.' },
  { id: 'juizo', name: 'Juízo Final', rarity: 'lendario', trophies: 1800, desc: 'Se vencer, dano triplo. Se perder, toma +10 de dano.' },
];

/** Deck: 8 cartas, no máximo 1 lendária e 2 épicas (vale para todos os modos). */
const DECK = { size: 8, maxByRarity: { lendario: 1, epico: 2 } };

/** Ordem que o deck padrão usa para escolher as cartas. */
const CARD_PRIORITY = [
  'juizo', 'escudo_sagrado', 'visao', 'vampirismo', 'furia', 'disfarce',
  'golpe_duplo', 'sorte', 'estaca_prata', 'aspirador_turbo', 'cruz_flamejante',
  'escudo', 'espinhos', 'provocacao', 'empate_forte', 'cura',
];

const CHARACTERS = [
  { id: 'cacador', name: 'Caçador', trophies: 0, passive: 'Equilibrado: sem ponto fraco.' },
  { id: 'luna', name: 'Dra. Luna', trophies: 150, weapon: 'aspirador', passive: 'Aspirador causa +5 de dano.' },
  { id: 'bento', name: 'Padre Bento', trophies: 400, weapon: 'cruz', passive: 'Cruz causa +5 de dano.' },
  { id: 'helga', name: 'Van Helga', trophies: 650, weapon: 'estaca', passive: 'Estaca causa +5 de dano.' },
  { id: 'ze', name: 'Mestre Zé', trophies: 1000, hp: 120, passive: 'Começa com 120 de vida.' },
  { id: 'sombra', name: 'Sombra', trophies: 1600, dodge: 0.15, passive: '15% de chance de desviar de um golpe.' },
];

const LEAGUES = [
  { id: 'bronze', name: 'Bronze', trophies: 0 },
  { id: 'prata', name: 'Prata', trophies: 300 },
  { id: 'ouro', name: 'Ouro', trophies: 700 },
  { id: 'platina', name: 'Platina', trophies: 1200 },
  { id: 'lenda', name: 'Lenda', trophies: 2000 },
];

const WEAPONS = ['estaca', 'aspirador', 'cruz'];
/** estaca (pedra) vence cruz (tesoura); aspirador (papel) vence estaca; cruz vence aspirador. */
const BEATS = { estaca: 'cruz', aspirador: 'estaca', cruz: 'aspirador' };
/** Arma -> jogada do jokenpô (para usar a IA dos chefes da campanha no Chefe Cooperativo). */
const WEAPON_MOVE = { estaca: 'pedra', aspirador: 'papel', cruz: 'tesoura' };

const cardById = (id) => CARDS.find(c => c.id === id);
const characterById = (id) => CHARACTERS.find(c => c.id === id);

/** Melhor marca de troféus libera personagens e cartas (cair de troféus não bloqueia). */
function unlockedCards(best) { return CARDS.filter(c => best >= c.trophies).map(c => c.id); }
function unlockedCharacters(best) { return CHARACTERS.filter(c => best >= c.trophies).map(c => c.id); }

function leagueOf(trophies) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.trophies) league = l;
  return league.id;
}

/** O deck respeita o tamanho, as cartas liberadas e o limite por raridade? */
function validateDeck(ids, best) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return { ok: false, reason: 'Deck inválido.' };
  if (ids.length > DECK.size) return { ok: false, reason: `O deck tem no máximo ${DECK.size} cartas.` };
  const unlocked = unlockedCards(best);
  if (ids.some(id => !unlocked.includes(id))) return { ok: false, reason: 'Há cartas bloqueadas no deck.' };
  for (const [rarity, max] of Object.entries(DECK.maxByRarity)) {
    if (ids.filter(id => cardById(id).rarity === rarity).length > max) {
      return { ok: false, reason: `No máximo ${max} carta(s) ${rarity === 'epico' ? 'épica(s)' : 'lendária'} no deck.` };
    }
  }
  return { ok: true };
}

/** Deck automático: as melhores cartas liberadas dentro dos limites. */
function defaultDeck(best) {
  const unlocked = unlockedCards(best);
  const deck = [];
  for (const id of CARD_PRIORITY) {
    if (deck.length >= DECK.size || !unlocked.includes(id)) continue;
    if (validateDeck([...deck, id], best).ok) deck.push(id);
  }
  return deck;
}

/** Deck que o jogador usa: o montado (se ainda for válido) ou o automático. */
function deckOf(player) {
  return player.deck && validateDeck(player.deck, player.best).ok && player.deck.length > 0 ? player.deck : defaultDeck(player.best);
}

module.exports = {
  RULES, CARDS, DECK, CARD_PRIORITY, CHARACTERS, LEAGUES, WEAPONS, BEATS, WEAPON_MOVE,
  cardById, characterById, unlockedCards, unlockedCharacters, leagueOf, validateDeck, defaultDeck, deckOf,
};
