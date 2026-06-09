'use strict';

const CHOICES = ['pedra', 'papel', 'tesoura'];
const WINS_AGAINST = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };
const ROUNDS_TO_WIN = 3;

const PERK_POOL = [
  { id: 'escudo',       name: 'Escudo',        desc: 'Se perderia, empata nesta rodada' },
  { id: 'golpe_duplo',  name: 'Golpe Duplo',   desc: 'Vitoria vale 2 pontos' },
  { id: 'empate_forte', name: 'Empate Forte',  desc: 'Empate conta como vitoria' },
  { id: 'visao',        name: 'Visao',         desc: 'Ve quando o oponente ja escolheu' },
  { id: 'resistencia',  name: 'Resistencia',   desc: 'Oponente nao ganha ponto se vencer' },
  { id: 'sorte',        name: 'Sorte',         desc: '50% de ganhar ponto extra na vitoria' },
];

const ATTACK_LABELS = {
  hunter:  { pedra: 'Estaca',     papel: 'Aspirador', tesoura: 'Cruz' },
  monster: { pedra: 'Possessao',  papel: 'Assombracao', tesoura: 'Maldicao' },
};

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `JGH-${code}`;
}

function pickRandomPerks(count = 3) {
  const pool = [...PERK_POOL];
  const picked = [];
  while (picked.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function rpsOutcome(attackA, attackB) {
  if (attackA === attackB) return 'draw';
  if (WINS_AGAINST[attackA] === attackB) return 'a';
  return 'b';
}

function resolveRound(hunterAttack, monsterAttack, hunterPerk, monsterPerk) {
  const base = rpsOutcome(hunterAttack, monsterAttack);
  let outcome = base === 'draw' ? 'draw' : base === 'a' ? 'hunter' : 'monster';

  let hunterPoints = 0;
  let monsterPoints = 0;

  if (outcome === 'hunter') hunterPoints = 1;
  else if (outcome === 'monster') monsterPoints = 1;

  // Escudo: converte derrota em empate
  if (outcome === 'monster' && hunterPerk === 'escudo') {
    outcome = 'draw';
    monsterPoints = 0;
  }
  if (outcome === 'hunter' && monsterPerk === 'escudo') {
    outcome = 'draw';
    hunterPoints = 0;
  }

  // Empate Forte
  if (outcome === 'draw') {
    if (hunterPerk === 'empate_forte') hunterPoints = 1;
    if (monsterPerk === 'empate_forte') monsterPoints = 1;
  }

  // Golpe Duplo
  if (outcome === 'hunter' && hunterPerk === 'golpe_duplo') hunterPoints = 2;
  if (outcome === 'monster' && monsterPerk === 'golpe_duplo') monsterPoints = 2;

  // Resistencia: oponente nao ganha ponto ao vencer
  if (outcome === 'hunter' && monsterPerk === 'resistencia') {
    hunterPoints = 0;
    outcome = 'draw';
  }
  if (outcome === 'monster' && hunterPerk === 'resistencia') {
    monsterPoints = 0;
    outcome = 'draw';
  }

  // Sorte: 50% ponto extra na vitoria
  if (outcome === 'hunter' && hunterPerk === 'sorte' && Math.random() < 0.5) hunterPoints += 1;
  if (outcome === 'monster' && monsterPerk === 'sorte' && Math.random() < 0.5) monsterPoints += 1;

  return {
    outcome,
    hunterPoints,
    monsterPoints,
    hunterAttack,
    monsterAttack,
    hunterPerk,
    monsterPerk,
    labels: {
      hunter: ATTACK_LABELS.hunter[hunterAttack],
      monster: ATTACK_LABELS.monster[monsterAttack],
    },
  };
}

function defaultAttack() {
  return randChoice(CHOICES);
}

function defaultPerk(offeredPerks) {
  return offeredPerks.length ? offeredPerks[0].id : null;
}

module.exports = {
  CHOICES,
  ROUNDS_TO_WIN,
  PERK_POOL,
  ATTACK_LABELS,
  generateRoomCode,
  pickRandomPerks,
  resolveRound,
  defaultAttack,
  defaultPerk,
};
