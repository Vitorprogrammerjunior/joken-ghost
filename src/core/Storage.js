/** localStorage que nunca lança erro (modo privado, cota cheia, etc.). */
const memory = new Map();

export const storage = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch { memory.set(key, String(value)); }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch { memory.delete(key); }
  },
};
