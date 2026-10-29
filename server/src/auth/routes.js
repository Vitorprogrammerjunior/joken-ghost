'use strict';
// Login com Google e Discord, mantendo o modo convidado.
//
//   1. POST /api/auth/intent  { provider, token?, nickname?, returnTo }  -> { url }
//      O jogo manda o código de convidado no corpo (nunca na URL) e recebe o endereço para abrir.
//   2. GET  /api/auth/start?intent=...   guarda o "state" num cookie deste servidor e vai ao provedor
//   3. GET  /api/auth/callback/:provider confere o state, descobre a conta e liga o login a ela:
//        - login já ligado a uma conta   -> entra nela (o convidado deste aparelho fica como está)
//        - convidado sem esse login       -> o login é ligado ao convidado (mantém troféus, Ecto, deck...)
//        - sem convidado                  -> conta nova
//      e volta ao jogo com um código de uso único no fragmento (#auth=...), nunca o token.
//   4. POST /api/auth/finish  { code }   -> { token, account, outcome }
//
// Também: /api/auth/providers, /me, /logout e /delete (apagar a conta e tudo dela).
const crypto = require('crypto');
const express = require('express');
const { enabledProviders, authorizeUrl, exchangeCode } = require('./providers');

const FLOW_TTL_MS = 10 * 60 * 1000;   // tempo para terminar o login no Google/Discord
const FINISH_TTL_MS = 2 * 60 * 1000;  // tempo para o jogo trocar o código pelo token
const MAX_PENDING = 2000;
const COOKIE = 'jg_oauth';

const randomId = () => crypto.randomBytes(24).toString('base64url');

/** Pedidos em andamento que expiram e só podem ser usados uma vez. */
class Pending {
  constructor(ttlMs, now) { this.ttlMs = ttlMs; this.now = now; this.map = new Map(); }

  put(value) {
    const t = this.now();
    for (const [k, v] of this.map) if (v.expires < t || this.map.size >= MAX_PENDING) this.map.delete(k); else break;
    const id = randomId();
    this.map.set(id, { value, expires: t + this.ttlMs });
    return id;
  }

  take(id) {
    const e = typeof id === 'string' ? this.map.get(id) : null;
    if (!e) return null;
    this.map.delete(id);
    return e.expires >= this.now() ? e.value : null;
  }
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @param {object} store  persistência (src/store.js)
 * @param {object} [o]
 * @param {() => string} [o.publicUrl]  endereço público deste servidor (o mesmo cadastrado no Google/Discord)
 * @param {(playerId: string) => void} [o.onDeleted]  conta apagada: derruba quem estiver conectado
 */
function authRoutes(store, { env = process.env, fetch = globalThis.fetch, now = () => Date.now(), publicUrl, onDeleted = () => {} } = {}) {
  const router = express.Router();
  const providers = enabledProviders(env);
  const baseUrl = publicUrl ?? (() => env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT || 3001}`);
  const callbackUrl = (id) => `${baseUrl()}/api/auth/callback/${id}`;
  const intents = new Pending(FLOW_TTL_MS, now);
  const flows = new Pending(FLOW_TTL_MS, now);
  const finishes = new Pending(FINISH_TTL_MS, now);

  // só volta para o jogo (nunca para um site qualquer, senão o código do login vazaria)
  const allowed = new Set([
    ...String(env.CLIENT_ORIGINS ?? '').split(','),
    env.CORS_ORIGIN && env.CORS_ORIGIN !== '*' ? env.CORS_ORIGIN : '',
  ].map(s => s.trim().replace(/\/$/, '')).filter(Boolean));
  function safeReturn(raw) {
    let url;
    try { url = new URL(raw); } catch { return null; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!local && !allowed.has(url.origin)) return null;
    return `${url.origin}${url.pathname}${url.search}`;
  }

  const json = express.json({ limit: '4kb' });
  const fail = (res, status, error) => res.status(status).json({ error });
  const accountOf = async (p) => ({ id: p.id, nickname: p.nickname, providers: await store.identitiesOf(p.id) });
  const back = (res, returnTo, hash) => res.redirect(302, `${returnTo}#${hash}`);

  router.get('/api/auth/providers', (_req, res) => {
    res.json({ providers: Object.values(providers).map(p => ({ id: p.id, name: p.name })) });
  });

  router.post('/api/auth/intent', json, (req, res) => {
    const { provider, token, nickname, returnTo } = req.body ?? {};
    if (!providers[provider]) return fail(res, 400, 'Login indisponível.');
    const target = safeReturn(returnTo);
    if (!target) return fail(res, 400, 'Endereço de volta não permitido.');
    const intent = intents.put({ provider, token: typeof token === 'string' ? token : null, nickname: String(nickname ?? ''), returnTo: target });
    res.json({ url: `${baseUrl()}/api/auth/start?intent=${intent}` });
  });

  router.get('/api/auth/start', (req, res) => {
    const intent = intents.take(req.query.intent);
    if (!intent) return res.status(400).type('text').send('Este link de login expirou. Volte ao jogo e tente de novo.');
    const state = flows.put(intent);
    const secure = baseUrl().startsWith('https:') ? '; Secure' : '';
    // o cookie prende o login a este navegador (ninguém consegue terminar um login começado por outro)
    res.setHeader('Set-Cookie', `${COOKIE}=${state}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${FLOW_TTL_MS / 1000}${secure}`);
    res.redirect(302, authorizeUrl(providers[intent.provider], {
      redirectUri: callbackUrl(intent.provider), state, devUrl: `${baseUrl()}/api/auth/dev`,
    }));
  });

  /** A conta tem algo a perder? (partidas, troféus, Ecto, taças ou campanha na nuvem) */
  async function hasProgress(p) {
    if (p.wins + p.losses > 0 || p.trophies > 0 || (p.ecto ?? 0) > 0 || (p.cups ?? 0) > 0) return true;
    return (await store.listSaves(p.id)).some(s => s.data);
  }

  /** Descobre a conta para este login (ver o passo 3 lá em cima). */
  async function resolveAccount(intent, subject) {
    const { provider } = intent;
    const linked = await store.findIdentity(provider, subject);
    const guest = intent.token ? await store.getByToken(intent.token) : null;
    if (linked) {
      if (!guest || guest.id === linked.id) return { player: linked, outcome: 'existing' };
      const guestIsGuest = (await store.identitiesOf(guest.id)).length === 0;
      // o login foi ligado antes a uma conta vazia (ex.: num navegador novo) e o progresso está neste
      // convidado: o login passa para o convidado e a conta vazia some
      if (guestIsGuest && await hasProgress(guest) && !await hasProgress(linked)
        && (await store.identitiesOf(linked.id)).length === 1) {
        await store.deletePlayer(linked.id);
        if (await store.linkIdentity(guest.id, provider, subject)) {
          await store.revokeGuestToken(guest.id);
          return { player: guest, outcome: 'linked' };
        }
      }
      // as duas têm progresso: entra na conta do login e o convidado deste aparelho fica separado
      return { player: linked, outcome: guestIsGuest && await hasProgress(guest) ? 'existing_guest_left' : 'existing' };
    }
    if (guest) {
      const had = await store.identitiesOf(guest.id);
      if (!had.includes(provider) && await store.linkIdentity(guest.id, provider, subject)) {
        if (!had.length) await store.revokeGuestToken(guest.id); // o código de convidado deixa de valer
        return { player: guest, outcome: had.length ? 'added' : 'linked' };
      }
    }
    const { player } = await store.create(intent.nickname);
    await store.revokeGuestToken(player.id);
    if (!await store.linkIdentity(player.id, provider, subject)) {
      // outro pedido ligou esse login ao mesmo tempo: usa a conta dele
      await store.deletePlayer(player.id);
      return { player: await store.findIdentity(provider, subject), outcome: 'existing' };
    }
    return { player, outcome: 'created' };
  }

  router.get('/api/auth/callback/:provider', async (req, res) => {
    const state = String(req.query.state ?? '');
    const cookie = readCookie(req, COOKIE);
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0`);
    const intent = cookie === state ? flows.take(state) : null;
    if (!intent || intent.provider !== req.params.provider) {
      return res.status(400).type('text').send('Este login expirou ou foi aberto em outro navegador. Volte ao jogo e tente de novo.');
    }
    if (req.query.error || !req.query.code) return back(res, intent.returnTo, 'auth_error=cancelado');
    try {
      const subject = await exchangeCode(providers[intent.provider], { code: String(req.query.code), redirectUri: callbackUrl(intent.provider), fetch });
      const { player, outcome } = await resolveAccount(intent, subject);
      const token = await store.createSession(player.id);
      back(res, intent.returnTo, `auth=${finishes.put({ token, playerId: player.id, outcome })}`);
    } catch (err) {
      console.error('login', intent.provider, err.message);
      back(res, intent.returnTo, 'auth_error=falhou');
    }
  });

  router.post('/api/auth/finish', json, async (req, res) => {
    const done = finishes.take(req.body?.code);
    const player = done && await store.getById(done.playerId);
    if (!player) return fail(res, 400, 'O login expirou. Tente de novo.');
    res.json({ token: done.token, outcome: done.outcome, account: await accountOf(player) });
  });

  /** Quem é o dono deste token (o convidado também tem conta, só que sem login). */
  router.post('/api/auth/me', json, async (req, res) => {
    const player = req.body?.token ? await store.getByToken(req.body.token) : null;
    if (!player) return fail(res, 401, 'Conta não encontrada.');
    res.json({ account: await accountOf(player) });
  });

  router.post('/api/auth/logout', json, async (req, res) => {
    if (typeof req.body?.token === 'string') await store.deleteSession(req.body.token);
    res.json({ ok: true });
  });

  router.post('/api/auth/delete', json, async (req, res) => {
    const player = req.body?.token ? await store.getByToken(req.body.token) : null;
    if (!player) return fail(res, 401, 'Conta não encontrada.');
    await store.deletePlayer(player.id);
    onDeleted(player.id);
    res.json({ ok: true });
  });

  // login de teste local: faz o papel da tela do Google/Discord
  if (providers.dev) {
    router.get('/api/auth/dev', (req, res) => {
      const redirect = String(req.query.redirect_uri ?? '');
      if (redirect !== callbackUrl('dev')) return res.status(400).type('text').send('redirect_uri inválido');
      res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Login de teste</title>
<body style="font:16px sans-serif;background:#111;color:#eee;display:grid;place-items:center;min-height:90vh">
<form method="get" action="${escapeHtml(redirect)}" style="display:grid;gap:12px;max-width:320px">
<h2>Login de teste (só local)</h2>
<label>Conta de teste <input name="code" value="teste-1" pattern="[a-z0-9-]{1,40}" required></label>
<input type="hidden" name="state" value="${escapeHtml(req.query.state ?? '')}">
<button>Entrar</button>
<a style="color:#aaa" href="${escapeHtml(redirect)}?error=access_denied&amp;state=${escapeHtml(encodeURIComponent(req.query.state ?? ''))}">Cancelar</a>
</form></body>`);
    });
  }

  return router;
}

module.exports = { authRoutes, Pending };
