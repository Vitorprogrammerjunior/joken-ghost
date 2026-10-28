'use strict';
// Apelidos dos adversários automáticos: genéricos, no mesmo estilo dos jogadores de verdade
// (inclusive o "CaçadorNNNN" que toda conta nova recebe). Um nome novo a cada partida.

const THEMES = ['Caçador', 'Sombra', 'Lobo', 'Corvo', 'Vela', 'Ecto', 'Noturno', 'Fantasma', 'Lua', 'Morcego',
  'Bruxa', 'Cripta', 'Neblina', 'Uivo', 'Trevo', 'Raio', 'Zumbi', 'Vampiro', 'Gárgula', 'Abóbora'];
const TAGS = ['BR', 'XD', 'Pro', 'Zero', 'Rei', '007', 'Jr', 'Neo', 'Top', 'X'];
const PEOPLE = ['lucas', 'gabi', 'pedro', 'duda', 'rafa', 'bia', 'joao', 'mari', 'enzo', 'lari', 'theo', 'vini', 'nina', 'caio', 'leo', 'manu'];
const NOUNS = ['Lobo', 'Corvo', 'Sombra', 'Raio', 'Uivo', 'Vulto', 'Eco'];
const ADJECTIVES = ['Veloz', 'Sombrio', 'Feroz', 'Sinistro', 'Ligeiro', 'Valente', 'Gelado', 'Brabo', 'Noturno'];

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const digits = (n, rng) => String(Math.floor(rng() * 10 ** n)).padStart(n, '0');

/** Um apelido de até 16 caracteres. */
function botNickname(rng = Math.random) {
  const r = rng();
  let nick;
  if (r < 0.35) nick = `${pick(THEMES, rng)}${1000 + Math.floor(rng() * 9000)}`;
  else if (r < 0.6) nick = `${pick(THEMES, rng)}${pick(TAGS, rng)}`;
  else if (r < 0.85) nick = `${pick(PEOPLE, rng)}${digits(2, rng)}`;
  else nick = `${pick(NOUNS, rng)}${pick(ADJECTIVES, rng)}`;
  return nick.slice(0, 16);
}

module.exports = { botNickname };
