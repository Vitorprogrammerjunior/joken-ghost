'use strict';
// Logins aceitos (OAuth 2.0, fluxo "authorization code" feito no servidor com a chave secreta).
// Pedimos o mínimo: só o id fixo da pessoa no Google ("openid") ou no Discord ("identify").
// Nada de e-mail, nome ou foto; o apelido continua sendo o do jogo.
//
// Variáveis de ambiente (só no Render, nunca no código):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
//   AUTH_DEV_LOGIN=1  login de teste local, sem Google/Discord (desligado em produção)

const PROVIDERS = {
  google: {
    name: 'Google',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid',
    extra: { prompt: 'select_account' },
    subjectOf: (user) => user.sub,
  },
  discord: {
    name: 'Discord',
    env: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    scope: 'identify',
    extra: { prompt: 'none' },
    subjectOf: (user) => user.id,
  },
};

/** Login de teste: uma página do próprio servidor faz o papel do Google/Discord. */
const DEV = { name: 'Teste local', dev: true };

/** Logins configurados neste servidor: id -> { name, clientId, clientSecret, ... }. */
function enabledProviders(env = process.env) {
  const out = {};
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const [idVar, secretVar] = p.env;
    if (env[idVar] && env[secretVar]) out[id] = { ...p, id, clientId: env[idVar], clientSecret: env[secretVar] };
  }
  if (env.AUTH_DEV_LOGIN === '1' && env.NODE_ENV !== 'production') out.dev = { ...DEV, id: 'dev' };
  return out;
}

/** Endereço da tela de login do provedor. */
function authorizeUrl(provider, { redirectUri, state, devUrl }) {
  if (provider.dev) return `${devUrl}?${new URLSearchParams({ state, redirect_uri: redirectUri })}`;
  const q = new URLSearchParams({
    client_id: provider.clientId, redirect_uri: redirectUri, response_type: 'code',
    scope: provider.scope, state, ...provider.extra,
  });
  return `${provider.authorizeUrl}?${q}`;
}

/**
 * Troca o código da volta do login pelo id da pessoa no provedor.
 * @returns {Promise<string>} subject (id fixo da pessoa no Google/Discord)
 */
async function exchangeCode(provider, { code, redirectUri, fetch = globalThis.fetch }) {
  if (provider.dev) {
    if (!/^[a-z0-9-]{1,40}$/.test(code)) throw new Error('código de teste inválido');
    return code;
  }
  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
      client_id: provider.clientId, client_secret: provider.clientSecret,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.access_token) throw new Error(`${provider.name} recusou o código (${tokenRes.status})`);
  const userRes = await fetch(provider.userUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  const user = await userRes.json().catch(() => ({}));
  const subject = userRes.ok ? provider.subjectOf(user) : null;
  if (!subject) throw new Error(`${provider.name} não devolveu a conta (${userRes.status})`);
  return String(subject);
}

module.exports = { PROVIDERS, enabledProviders, authorizeUrl, exchangeCode };
