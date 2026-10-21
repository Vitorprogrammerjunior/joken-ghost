// Caçadores jogáveis. Os desbloqueios e passivas valem no multiplayer (regras no servidor);
// aqui ficam nome e visual, e o personagem escolhido também aparece na campanha.

export const CHARACTERS = {
  cacador: { id: 'cacador', name: 'Caçador', title: 'O novato da mochila', trophies: 0, passive: 'Equilibrado: sem ponto fraco.' },
  luna: { id: 'luna', name: 'Dra. Luna', title: 'Cientista do sobrenatural', trophies: 150, passive: 'Aspirador causa +5 de dano.' },
  bento: { id: 'bento', name: 'Padre Bento', title: 'Exorcista aposentado', trophies: 400, passive: 'Cruz causa +5 de dano.' },
  helga: { id: 'helga', name: 'Van Helga', title: 'Caçadora de vampiros', trophies: 650, passive: 'Estaca causa +5 de dano.' },
  ze: { id: 'ze', name: 'Mestre Zé', title: 'Veterano de mil batalhas', trophies: 1000, passive: 'Começa com 120 de vida.' },
  sombra: { id: 'sombra', name: 'Sombra', title: '???', trophies: 1600, passive: '15% de chance de desviar de um golpe.' },
};

const KEY = 'jokenghost_char';

/** Personagem escolhido (salvo no navegador). */
export function selectedCharacter(storage) {
  const id = storage.getItem(KEY);
  return CHARACTERS[id] ? id : 'cacador';
}

export function selectCharacter(storage, id) {
  if (CHARACTERS[id]) storage.setItem(KEY, id);
}
