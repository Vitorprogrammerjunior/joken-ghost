// Código de uma build para compartilhar: "JG:luna:juizo,escudo,cura".
// O servidor confere a build de novo quando ela é salva; aqui só lê e escreve o texto.

const PREFIX = 'JG';

/** @param {{ character: string, cards: string[] }} build */
export function encodeBuild({ character, cards }) {
  return `${PREFIX}:${character}:${cards.join(',')}`;
}

/**
 * Lê um código colado. Retorna { ok: true, character, cards } ou { ok: false, reason }.
 * @param {string} code
 * @param {{ characters: { id: string }[], cards: { id: string }[] }} catalog
 */
export function decodeBuild(code, catalog) {
  const parts = String(code ?? '').trim().split(':');
  if (parts.length !== 3 || parts[0].toUpperCase() !== PREFIX) return { ok: false, reason: 'Esse código não é de uma build.' };
  const [, character, list] = parts;
  if (!catalog.characters.some(c => c.id === character)) return { ok: false, reason: 'O caçador desse código não existe.' };
  const cards = list.split(',').map(s => s.trim()).filter(Boolean);
  if (!cards.length || new Set(cards).size !== cards.length) return { ok: false, reason: 'As cartas desse código estão erradas.' };
  if (cards.some(id => !catalog.cards.some(c => c.id === id))) return { ok: false, reason: 'Esse código tem uma carta que não existe.' };
  return { ok: true, character, cards };
}

/** Pontos que as cartas gastam do orçamento. */
export function buildCost(cards, catalog) {
  return cards.reduce((sum, id) => sum + (catalog.cards.find(c => c.id === id)?.cost ?? 0), 0);
}
