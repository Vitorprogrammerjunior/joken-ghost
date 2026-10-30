'use strict';
// Catálogo do multiplayer: regras, cartas, builds, caçadores e ligas.
// O servidor é a fonte da verdade; o cliente recebe isto no 'welcome'.

const RULES = {
  baseDamage: 20,
  passiveBonus: 5,         // dano extra com a arma preferida do personagem
  weaponCardBonus: 15,     // cartas de arma: dano extra se vencer com aquela arma
  baseHp: 100,
  duoHpScale: 0.75,        // 2x2: a vida somada da dupla vale 75% (a partida não fica longa demais)
  handSize: 3,
  banPhaseMs: 15000,       // 1x1: antes da 1ª rodada cada um vê a build do outro e bane 1 carta dela
  introMs: 4800,           // entrada "VS" do cliente (os dois ficam uns 3s na tela) antes da 1ª fase
  roundIntroMs: 2000,      // "RODADA N" na tela antes das cartas
  cardPhaseMs: 7000,
  cardRevealMs: 3400,      // as cartas jogadas viram na tela de todos antes das armas
  specialRevealMs: 4600,   // ... mais tempo quando tem carta lendária (movimento especial)
  weaponPhaseMs: 7000,
  visionWeaponMs: 3500,    // quem enfrenta a Visão tem metade do tempo para escolher a arma
  revealMs: 3400,
  suddenDeathRound: 8,     // a partir daqui o dano dobra
  maxRounds: 15,           // depois desta rodada vence quem tiver mais vida (empate: segue até alguém passar na frente)
  reconnectGraceMs: 15000,
  // Ranqueada com pouca gente: um adversário controlado pelo servidor completa a partida.
  // Ele não é anunciado; a dificuldade acompanha o nível do jogador (src/bots/).
  // Quem está na fila sempre cai com outra pessoa se houver; o bot só entra quando não há ninguém.
  // Os limites (null = sem limite) ficam desligados enquanto o jogo tem pouca gente.
  rankedBot: {
    maxTrophies: null,              // acima disso a ranqueada seria só entre jogadores (ex.: 1600)
    waitMs: [18000, 30000],         // espera (sorteada) antes de completar com bot
    newPlayerWaitMs: [6000, 10000], // contas novas esperam menos nas primeiras partidas
    newPlayerMatches: 3,
    perHour: null,                  // partidas contra bot por jogador, por hora (ex.: 5)
    cardThinkMs: [900, 3800],       // tempo de "pensar" (parece uma pessoa)
    weaponThinkMs: [1300, 5600],
  },
};

/**
 * Todas as cartas e caçadores ficam abertos para todo mundo: quem ganha é quem monta e joga melhor.
 * `cost`: pontos que a carta gasta do orçamento da build (é aqui que se equilibra uma carta forte demais).
 * `weapon`: carta de arma (bônus se vencer com ela).
 */
const CARDS = [
  { id: 'escudo', name: 'Escudo', rarity: 'comum', cost: 1, desc: 'Se você perder a rodada, não toma dano.' },
  { id: 'cura', name: 'Bálsamo', rarity: 'comum', cost: 1, desc: 'Recupera 15 de vida no início da rodada.' },
  { id: 'golpe_duplo', name: 'Golpe Duplo', rarity: 'comum', cost: 1, desc: 'Se você vencer a rodada, causa dano dobrado.' },
  { id: 'sorte', name: 'Trevo da Sorte', rarity: 'raro', cost: 2, desc: 'Se vencer, causa +10 de dano. Se empatar, recupera 10 de vida.' },
  { id: 'estaca_prata', name: 'Estaca de Prata', rarity: 'raro', cost: 2, weapon: 'estaca', desc: 'Se vencer com a Estaca, causa +15 de dano.' },
  { id: 'empate_forte', name: 'Empate Forte', rarity: 'raro', cost: 2, desc: 'Se empatar, o oponente toma 15 de dano.' },
  { id: 'aspirador_turbo', name: 'Aspirador Turbo', rarity: 'raro', cost: 2, weapon: 'aspirador', desc: 'Se vencer com o Aspirador, causa +15 de dano.' },
  { id: 'espinhos', name: 'Espinhos', rarity: 'raro', cost: 2, desc: 'Se perder, devolve 12 de dano ao oponente.' },
  { id: 'cruz_flamejante', name: 'Cruz Flamejante', rarity: 'raro', cost: 2, weapon: 'cruz', desc: 'Se vencer com a Cruz, causa +15 de dano.' },
  { id: 'provocacao', name: 'Provocação', rarity: 'raro', cost: 2, desc: 'O oponente não pode repetir a arma da rodada anterior.' },
  { id: 'vampirismo', name: 'Vampirismo', rarity: 'epico', cost: 3, desc: 'Se vencer, recupera metade do dano que causou.' },
  { id: 'disfarce', name: 'Disfarce', rarity: 'epico', cost: 3, desc: 'A Visão do oponente vê uma arma falsa. Se vencer, +10 de dano.' },
  { id: 'furia', name: 'Fúria', rarity: 'epico', cost: 3, desc: 'Se vencer com menos da metade da vida, causa +20 de dano.' },
  { id: 'visao', name: 'Visão', rarity: 'epico', cost: 3, desc: 'O oponente tem metade do tempo para escolher a arma, e você vê qual foi.' },
  { id: 'escudo_sagrado', name: 'Escudo Sagrado', rarity: 'lendario', cost: 4, desc: 'Você não toma dano nesta rodada e recupera 10 de vida.' },
  { id: 'juizo', name: 'Juízo Final', rarity: 'lendario', cost: 4, desc: 'Se vencer, dano triplo. Se perder, toma +10 de dano.' },
];

/** Build: até 6 cartas diferentes que somam no máximo 10 pontos (vale para todos os modos). */
const DECK = { size: 6, budget: 10 };
/** Builds salvas por jogador (caçador + cartas, com nome). */
const BUILD_SLOTS = 5;
const BUILD_NAME_MAX = 20;

/** Cartas de quem nunca montou uma build (e de quem tem uma build antiga que não cabe nas regras). */
const DEFAULT_DECK = ['golpe_duplo', 'escudo', 'cura', 'sorte', 'estaca_prata', 'vampirismo'];

/** Builds prontas: os adversários automáticos sorteiam uma (todas cabem no orçamento). */
const PRESET_DECKS = [
  DEFAULT_DECK,
  ['juizo', 'escudo', 'golpe_duplo', 'provocacao', 'espinhos'],
  ['visao', 'disfarce', 'escudo', 'cura', 'golpe_duplo'],
  ['escudo_sagrado', 'vampirismo', 'escudo', 'cura', 'golpe_duplo'],
  ['furia', 'cruz_flamejante', 'aspirador_turbo', 'escudo', 'golpe_duplo', 'cura'],
  ['empate_forte', 'espinhos', 'provocacao', 'sorte', 'escudo', 'cura'],
];

const CHARACTERS = [
  { id: 'cacador', name: 'Caçador', passive: 'Equilibrado: sem ponto fraco.' },
  { id: 'luna', name: 'Dra. Luna', weapon: 'aspirador', passive: 'Aspirador causa +5 de dano.' },
  { id: 'bento', name: 'Padre Bento', weapon: 'cruz', passive: 'Cruz causa +5 de dano.' },
  { id: 'helga', name: 'Van Helga', weapon: 'estaca', passive: 'Estaca causa +5 de dano.' },
  { id: 'ze', name: 'Mestre Zé', hp: 120, passive: 'Começa com 120 de vida.' },
  { id: 'sombra', name: 'Sombra', dodgeFirst: true, passive: 'Desvia do primeiro golpe que levaria na partida.' },
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

function leagueOf(trophies) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.trophies) league = l;
  return league.id;
}

/** Pontos que as cartas gastam do orçamento. */
const deckCost = (ids) => ids.reduce((sum, id) => sum + (cardById(id)?.cost ?? 0), 0);

/** As cartas cabem na build: diferentes, até DECK.size e dentro do orçamento? */
function validateDeck(ids) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !cardById(id))) return { ok: false, reason: 'Build inválida.' };
  if (ids.length > DECK.size) return { ok: false, reason: `A build tem no máximo ${DECK.size} cartas.` };
  const cost = deckCost(ids);
  if (cost > DECK.budget) return { ok: false, reason: `As cartas passam do orçamento (${cost}/${DECK.budget} pontos).` };
  return { ok: true };
}

/** Cartas que o jogador usa: as montadas (se ainda valerem) ou as padrão. */
function deckOf(player) {
  return player.deck?.length && validateDeck(player.deck).ok ? player.deck : DEFAULT_DECK;
}

/**
 * Confere e limpa uma build salva { name, character, cards }.
 * @returns {{ ok: true, build: object } | { ok: false, reason: string }}
 */
function cleanBuild(build) {
  if (!build || typeof build !== 'object') return { ok: false, reason: 'Build inválida.' };
  if (!characterById(build.character)) return { ok: false, reason: 'Caçador inválido.' };
  if (!Array.isArray(build.cards) || !build.cards.length) return { ok: false, reason: 'Ponha pelo menos uma carta.' };
  const check = validateDeck(build.cards);
  if (!check.ok) return check;
  const name = String(build.name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, BUILD_NAME_MAX) || 'Minha build';
  return { ok: true, build: { name, character: build.character, cards: [...build.cards] } };
}

module.exports = {
  RULES, CARDS, DECK, BUILD_SLOTS, DEFAULT_DECK, PRESET_DECKS, CHARACTERS, LEAGUES, WEAPONS, BEATS, WEAPON_MOVE,
  cardById, characterById, leagueOf, deckCost, validateDeck, deckOf, cleanBuild,
};
