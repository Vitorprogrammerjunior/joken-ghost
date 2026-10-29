'use strict';
// O perfil de um adversário automático: parece um jogador comum do mesmo nível (troféus perto,
// caçador, uma build pronta, avatar e moldura que aquele nível teria). Existe só durante a partida:
// não é salvo, não entra no ranking nem na lista de quem está online.
const crypto = require('crypto');
const { CHARACTERS, PRESET_DECKS } = require('../catalog');
const { botNickname } = require('./names');

/** Estilos de jogo "legíveis" (as IAs dos monstros): o bot cai neles quando não está lendo o jogador. */
const STYLES = [
  { type: 'sticky', repeat: 0.5 },
  { type: 'cycle', sequence: ['pedra', 'papel', 'tesoura'], noise: 0.25 },
  { type: 'cycle', sequence: ['tesoura', 'papel', 'pedra'], noise: 0.25 },
  { type: 'mimic', chance: 0.45 },
  { type: 'coward', chance: 0.6 },
  { type: 'random', bias: { pedra: 1.4, papel: 1, tesoura: 1 } },
  { type: 'random', bias: { pedra: 1, papel: 1, tesoura: 1.4 } },
];

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const between = ([min, max], rng) => min + Math.round(rng() * (max - min));

/**
 * @param {object} opponent  o jogador que vai enfrentar o bot
 * @param {() => number} rng
 */
function createBotPersona(opponent, rng = Math.random) {
  const trophies = Math.max(0, opponent.trophies + between([-70, 70], rng));
  const best = trophies + between([0, 140], rng);
  const characters = CHARACTERS.map(c => c.id);
  const character = pick(characters, rng);
  const frames = best >= 700 ? [null, 'madeira', 'prata', 'ouro'] : best >= 300 ? [null, 'madeira', 'prata'] : [null, null, 'madeira'];
  const wins = between([0, 12], rng) + Math.floor(best / 25);
  return {
    id: crypto.randomBytes(8).toString('hex'),
    isBot: true,                     // só o servidor sabe; nenhuma visão de partida manda isso
    nickname: botNickname(rng),
    trophies, best, seasonBest: best,
    wins, losses: Math.round(wins * (0.7 + rng() * 0.6)),
    character,
    deck: [...pick(PRESET_DECKS, rng)], // uma das builds prontas
    avatar: { kind: 'hunter', hunter: rng() < 0.75 ? character : pick(characters, rng), art: null },
    equipped: { frame: pick(frames, rng) },
    style: pick(STYLES, rng),
  };
}

module.exports = { createBotPersona, STYLES };
