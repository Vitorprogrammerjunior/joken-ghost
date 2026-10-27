// Preferências do jogador (som, efeitos, tela).

const KEY = 'jokenghost_options';

export const DEFAULT_OPTIONS = {
  musicVol: 45,
  sfxVol: 80,
  shake: true,
  damageNumbers: true,
  toasts: true,
  nowPlaying: true,       // aviso "Tocando: ..." quando a música muda
  pixelPerfect: false,
  muted: false,
};

export function loadOptions(storage) {
  try {
    const raw = JSON.parse(storage.getItem(KEY)) || {};
    // compatibilidade com o formato antigo
    if (raw.bgmVol != null && raw.musicVol == null) raw.musicVol = raw.bgmVol;
    if (raw.floatingCoins != null && raw.damageNumbers == null) raw.damageNumbers = raw.floatingCoins;
    const out = { ...DEFAULT_OPTIONS };
    for (const k of Object.keys(DEFAULT_OPTIONS)) if (typeof raw[k] === typeof DEFAULT_OPTIONS[k]) out[k] = raw[k];
    return out;
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(storage, options) {
  try { storage.setItem(KEY, JSON.stringify(options)); } catch { /* sem armazenamento */ }
}
