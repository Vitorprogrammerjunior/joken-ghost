// Curvas de animação e utilitários de tempo do comercial.
// Tudo é função do tempo t (em segundos): o mesmo t sempre gera o mesmo quadro.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

/** Progresso 0..1 de t dentro do intervalo [a, b]. */
export const span = (t, a, b) => clamp((t - a) / (b - a));

export const ease = {
  linear: (k) => k,
  outCubic: (k) => 1 - (1 - k) ** 3,
  inCubic: (k) => k ** 3,
  inOutCubic: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  outBack: (k) => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  outElastic: (k) => (k === 0 || k === 1 ? k : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  outExpo: (k) => (k === 1 ? 1 : 1 - 2 ** (-10 * k)),
};

/** Entra (0 -> 1) em [a, a + dur] com a curva `fn`. */
export const enter = (t, a, dur, fn = ease.outCubic) => fn(span(t, a, a + dur));

/** Pulso que decai: 1 em `a` e some em `dur` segundos (flashes, tremidas). */
export const decay = (t, a, dur) => (t < a ? 0 : Math.max(0, 1 - (t - a) / dur) ** 2);

/** Gerador com semente (mulberry32): partículas e transições iguais em todo quadro. */
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
