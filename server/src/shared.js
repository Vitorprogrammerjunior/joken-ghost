'use strict';
// Regras do jogo compartilhadas com o cliente (src/domain e src/config, em ES modules).
// O servidor usa o mesmo código para refazer corridas do Desafio do Dia, para a IA
// do chefe cooperativo e para validar os desenhos de avatar. No Render o repositório inteiro é clonado, então a pasta
// src/ existe ao lado de server/.
const path = require('path');
const { pathToFileURL } = require('url');

const SRC = path.join(__dirname, '..', '..', 'src');
const load = (file) => import(pathToFileURL(path.join(SRC, file)).href);

let cache = null;

/** Carrega (uma vez) os módulos de regras usados pelo servidor. */
function loadShared() {
  cache ??= Promise.all([
    load('domain/run.js'), load('domain/enemyAI.js'), load('domain/random.js'), load('domain/rps.js'), load('config/enemies.js'),
    load('domain/avatar.js'),
  ]).then(([run, ai, random, rps, enemies, avatar]) => ({
    ...run, ...ai, ...random, outcome: rps.outcome, ENEMIES: enemies.ENEMIES, isValidArt: avatar.isValidArt,
  }));
  return cache;
}

module.exports = { loadShared };
