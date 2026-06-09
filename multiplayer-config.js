// URL do servidor multiplayer (Railway em producao).
// Altere serverUrl apos deploy no Railway.
window.JOKENGHOST_MP_CONFIG = {
  serverUrl: (() => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('server');
    if (override) return override;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    // Substitua pela URL publica do Railway, ex: https://jokenghost-mp.up.railway.app
    return 'https://jokenghost-mp.up.railway.app';
  })(),
};
