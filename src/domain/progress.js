// Arquivos de save (slots) e migração do formato antigo.
// O armazenamento é injetado (localStorage no jogo, Map nos testes).

export const SAVE_VERSION = 2;
export const SLOT_COUNT = 3;
const KEY = (slot) => `jokenghost_save_${slot}`;
const DELETED_KEY = (slot) => `jokenghost_save_${slot}_deleted`; // hora em que o arquivo foi apagado (para a nuvem)
const OWNER_KEY = 'jokenghost_save_owner';                      // conta dona dos arquivos deste aparelho

export function newProfile(slot) {
  const now = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    slot,
    createdAt: now,
    updatedAt: now,
    coins: 0,
    unlocked: 1,
    stars: {},
    starsHard: {},      // estrelas do modo Pesadelo
    upgrades: {},       // níveis comprados na oficina
    skin: null,         // visual do Caçador liberado pelas estrelas
    hard: false,        // jogar no modo Pesadelo
    endless: { best: 0, runs: 0 },   // Noite Sem Fim: recorde de ondas
    daily: { day: null, best: 0 },   // Desafio do Dia: melhor pontuação do dia
    bestiary: {},
    stats: { battlesWon: 0, battlesLost: 0, turns: 0 },
    finished: false,
  };
}

/** Converte qualquer versão salva para a atual. */
export function migrate(raw, slot) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version === SAVE_VERSION) return { ...newProfile(slot), ...raw, slot };
  // v1 (jogo antigo): { slot, date, level, coins, bestiaryCount }
  const p = newProfile(slot);
  p.coins = Number(raw.coins) || 0;
  p.unlocked = Math.min(4, Math.max(1, Number(raw.level) || 1));
  p.migratedFrom = 1;
  return p;
}

export class SaveManager {
  /** @param {{ getItem(k): string|null, setItem(k, v): void, removeItem(k): void }} storage */
  constructor(storage, slots = SLOT_COUNT) {
    this.storage = storage;
    this.slots = slots;
  }

  load(slot) {
    try {
      return migrate(JSON.parse(this.storage.getItem(KEY(slot))), slot);
    } catch {
      return null;
    }
  }

  list() {
    return Array.from({ length: this.slots }, (_, i) => ({ slot: i + 1, data: this.load(i + 1) }));
  }

  create(slot) {
    const p = newProfile(slot);
    this.save(p);
    return p;
  }

  save(profile) {
    profile.updatedAt = new Date().toISOString();
    try {
      this.storage.setItem(KEY(profile.slot), JSON.stringify(profile));
      this.storage.removeItem(DELETED_KEY(profile.slot));
      return true;
    } catch {
      return false;
    }
  }

  remove(slot) {
    try {
      this.storage.removeItem(KEY(slot));
      this.storage.setItem(DELETED_KEY(slot), new Date().toISOString());
    } catch { /* armazenamento indisponível */ }
  }

  // ─── nuvem (src/net/CloudSync.js) ─────────────────────────────
  /** Cada arquivo com a hora do último save; arquivo apagado vem com data null. */
  entries() {
    return Array.from({ length: this.slots }, (_, i) => {
      const slot = i + 1;
      const data = this.load(slot);
      if (data) return { slot, data, updatedAt: data.updatedAt };
      return { slot, data: null, updatedAt: this.storage.getItem(DELETED_KEY(slot)) };
    });
  }

  /** Grava um arquivo que veio da nuvem como ele está (sem mudar a hora); null apaga. */
  restore(slot, data, updatedAt) {
    try {
      if (data) {
        this.storage.setItem(KEY(slot), JSON.stringify({ ...data, slot, updatedAt }));
        this.storage.removeItem(DELETED_KEY(slot));
      } else {
        this.storage.removeItem(KEY(slot));
        if (updatedAt) this.storage.setItem(DELETED_KEY(slot), updatedAt);
        else this.storage.removeItem(DELETED_KEY(slot));
      }
    } catch { /* armazenamento indisponível */ }
  }

  get owner() { return this.storage.getItem(OWNER_KEY); }
  set owner(id) { if (id) this.storage.setItem(OWNER_KEY, id); else this.storage.removeItem(OWNER_KEY); }

  /** Tira todos os arquivos deste aparelho (ao sair da conta: eles estão na nuvem). */
  clearAll() {
    for (let slot = 1; slot <= this.slots; slot++) this.restore(slot, null, null);
    this.owner = null;
  }
}

/** Registra uma fase vencida: estrelas (do modo normal ou Pesadelo), desbloqueio e estatísticas. */
export function recordVictory(profile, levelId, stars, totalLevels, { hard = false } = {}) {
  const book = hard ? profile.starsHard : profile.stars;
  book[levelId] = Math.max(book[levelId] || 0, stars);
  profile.unlocked = Math.min(totalLevels, Math.max(profile.unlocked, levelId + 1));
  profile.stats.battlesWon++;
  if (levelId === totalLevels) profile.finished = true;
}

export function recordDefeat(profile) {
  profile.stats.battlesLost++;
}
