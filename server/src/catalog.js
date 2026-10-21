'use strict';
// Catálogo do multiplayer: cartas, caçadores, ligas e regras.
// O servidor é a fonte da verdade; o cliente recebe isto no 'welcome'.

const RULES = {
  baseDamage: 20,
  passiveBonus: 5,         // dano extra com a arma preferida do personagem
  baseHp: 100,
  handSize: 3,
  cardPhaseMs: 10000,
  weaponPhaseMs: 10000,
  revealMs: 4200,
  suddenDeathRound: 12,    // a partir daqui o dano dobra
  reconnectGraceMs: 15000,
};

const CARDS = [
  { id: 'escudo', name: 'Escudo', rarity: 'comum', trophies: 0, desc: 'Se você perder a rodada, não toma dano.' },
  { id: 'cura', name: 'Bálsamo', rarity: 'comum', trophies: 0, desc: 'Recupera 15 de vida no início da rodada.' },
  { id: 'golpe_duplo', name: 'Golpe Duplo', rarity: 'comum', trophies: 0, desc: 'Se você vencer a rodada, causa dano dobrado.' },
  { id: 'sorte', name: 'Trevo da Sorte', rarity: 'raro', trophies: 100, desc: 'Se vencer, 50% de chance de causar +20 de dano.' },
  { id: 'empate_forte', name: 'Empate Forte', rarity: 'raro', trophies: 200, desc: 'Se empatar, o oponente toma 15 de dano.' },
  { id: 'espinhos', name: 'Espinhos', rarity: 'raro', trophies: 300, desc: 'Se perder, devolve 12 de dano ao oponente.' },
  { id: 'vampirismo', name: 'Vampirismo', rarity: 'epico', trophies: 500, desc: 'Se vencer, recupera metade do dano que causou.' },
  { id: 'furia', name: 'Fúria', rarity: 'epico', trophies: 750, desc: 'Se vencer com menos de 50 de vida, causa +20 de dano.' },
  { id: 'visao', name: 'Visão', rarity: 'epico', trophies: 900, desc: 'Se o oponente escolher a arma antes de você, você vê qual foi.' },
  { id: 'escudo_sagrado', name: 'Escudo Sagrado', rarity: 'lendario', trophies: 1200, desc: 'Você não toma dano nenhum nesta rodada.' },
  { id: 'juizo', name: 'Juízo Final', rarity: 'lendario', trophies: 1800, desc: 'Se você vencer a rodada, causa dano triplo.' },
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

module.exports = {
  RULES, CARDS, CHARACTERS, LEAGUES, WEAPONS, BEATS,
  cardById, characterById, unlockedCards, unlockedCharacters, leagueOf,
};
