// Visuais do Caçador liberados pelas estrelas (config/rewards.js).
// Cada visual troca as cores da roupa por uma rampa da paleta, mantendo o contorno
// e os tons de pele (cores de tools/sprites/lib/palette.mjs).

export const SKINS = {
  dourado: { id: 'dourado', name: 'Dourado', ramp: ['#7a2e14', '#8a5a12', '#cf9a22', '#f6d548', '#fff3a6'] },
  espectral: { id: 'espectral', name: 'Espectral', ramp: ['#3d4f86', '#6f88c4', '#a9c1ec', '#dbe8ff', '#f7fbff'] },
  sombrio: { id: 'sombrio', name: 'Sombrio', ramp: ['#1e0f33', '#3c1d63', '#6a34a3', '#a35fd9', '#d9a8ff'] },
};

/** Cores que nenhum visual troca: contorno e pele. */
export const SKIN_KEEP = ['#0e0b16', '#3b2116', '#6a3d26', '#9a6038', '#c98a58', '#f0bd8c'];
