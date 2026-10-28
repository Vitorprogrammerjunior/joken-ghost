'use strict';
// Login com Google/Discord (provedores simulados) e campanha na nuvem.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { JsonStore } = require('../src/store');
const { authRoutes } = require('../src/auth/routes');
const { saveRoutes } = require('../src/saves');
const { enabledProviders } = require('../src/auth/providers');

const ENV = {
  GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret',
  DISCORD_CLIENT_ID: 'discord-id', DISCORD_CLIENT_SECRET: 'discord-secret',
  CLIENT_ORIGINS: 'https://jogo.example',
};
const GAME = 'http://localhost:5173/';

/** Google e Discord de mentira: o código "x" vira a pessoa "g-x" / "d-x". */
async function fakeFetch(url, init = {}) {
  const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
  if (url.includes('oauth2.googleapis.com/token') || url.includes('discord.com/api/oauth2/token')) {
    const body = new URLSearchParams(String(init.body));
    if (!body.get('client_secret')?.endsWith('-secret')) return reply(401, {});
    return body.get('code') === 'ruim' ? reply(400, { error: 'invalid_grant' }) : reply(200, { access_token: `at-${body.get('code')}` });
  }
  const code = String(init.headers?.Authorization ?? '').replace('Bearer at-', '');
  if (url.includes('openidconnect.googleapis.com')) return reply(200, { sub: `g-${code}` });
  if (url.includes('discord.com/api/users/@me')) return reply(200, { id: `d-${code}` });
  throw new Error(`fetch inesperado: ${url}`);
}

async function setup({ env = ENV, now = () => Date.now() } = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-auth-')), 'players.json');
  const store = await new JsonStore(file).init();
  const deleted = [];
  let base = '';
  const app = express();
  app.use(authRoutes(store, { env, fetch: fakeFetch, now, publicUrl: () => base, onDeleted: (id) => deleted.push(id) }));
  app.use(saveRoutes(store, { now }));
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const post = async (p, body) => {
    const res = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  /** Faz o login inteiro como o navegador faria. `code` é quem a pessoa é no provedor. */
  async function login(provider, { token, code = 'ana', cookie, cancel = false, returnTo = GAME } = {}) {
    const intent = await post('/api/auth/intent', { provider, token, nickname: 'Ana', returnTo });
    if (intent.status !== 200) return { intent };
    const start = await fetch(intent.body.url, { redirect: 'manual' });
    assert.equal(start.status, 302);
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const jar = cookie ?? start.headers.get('set-cookie').split(';')[0];
    const q = cancel ? `error=access_denied&state=${state}` : `code=${code}&state=${state}`;
    const cb = await fetch(`${base}/api/auth/callback/${provider}?${q}`, { redirect: 'manual', headers: { cookie: jar } });
    if (cb.status !== 302) return { callback: cb.status, providerUrl: start.headers.get('location') };
    const back = new URL(cb.headers.get('location'));
    const hash = new URLSearchParams(back.hash.slice(1));
    if (!hash.get('auth')) return { error: hash.get('auth_error'), back };
    const finish = await post('/api/auth/finish', { code: hash.get('auth') });
    return { ...finish.body, back, providerUrl: start.headers.get('location'), code: hash.get('auth') };
  }

  return { store, post, login, deleted, base: () => base, close: () => new Promise(r => server.close(r)) };
}

test('provedores: só os configurados; o login de teste nunca liga em produção', () => {
  assert.deepEqual(Object.keys(enabledProviders({})), []);
  assert.deepEqual(Object.keys(enabledProviders({ GOOGLE_CLIENT_ID: 'x' })), [], 'sem a chave secreta não liga');
  assert.deepEqual(Object.keys(enabledProviders(ENV)), ['google', 'discord']);
  assert.deepEqual(Object.keys(enabledProviders({ AUTH_DEV_LOGIN: '1' })), ['dev']);
  assert.deepEqual(Object.keys(enabledProviders({ AUTH_DEV_LOGIN: '1', NODE_ENV: 'production' })), []);
});

test('login liga a conta de convidado e mantém o progresso', async () => {
  const t = await setup();
  try {
    const guest = await t.store.create('Vitor');
    Object.assign(guest.player, { trophies: 420, ecto: 75 });
    await t.store.save(guest.player);

    const r = await t.login('google', { token: guest.token });
    assert.equal(r.outcome, 'linked');
    assert.equal(r.account.id, guest.player.id);
    assert.deepEqual(r.account.providers, ['google']);
    assert.equal(r.back.origin + r.back.pathname, 'http://localhost:5173/');
    // pede só o mínimo ao Google
    const asked = new URL(r.providerUrl);
    assert.equal(asked.origin, 'https://accounts.google.com');
    assert.equal(asked.searchParams.get('scope'), 'openid');
    assert.equal(asked.searchParams.get('redirect_uri'), `${t.base()}/api/auth/callback/google`);

    const me = await t.store.getByToken(r.token);
    assert.equal(me.trophies, 420);
    assert.equal(me.ecto, 75);
    assert.equal(await t.store.getByToken(guest.token), null, 'o código de convidado deixa de valer');
    assert.equal((await t.post('/api/auth/finish', { code: r.code })).status, 400, 'o código da volta só vale uma vez');

    // outro aparelho, sem nada salvo: entra na mesma conta
    const phone = await t.login('google', {});
    assert.equal(phone.outcome, 'existing');
    assert.equal(phone.account.id, guest.player.id);
    assert.notEqual(phone.token, r.token, 'uma sessão por aparelho');

    // outro aparelho com um convidado próprio: entra na conta do login, sem juntar os dois
    const other = await t.store.create('Outro');
    const switched = await t.login('google', { token: other.token });
    assert.equal(switched.outcome, 'existing');
    assert.equal(switched.account.id, guest.player.id);
    assert.ok(await t.store.getByToken(other.token), 'o convidado do outro aparelho continua existindo');

    // liga o Discord à mesma conta
    const discord = await t.login('discord', { token: r.token, code: 'ana' });
    assert.equal(discord.outcome, 'added');
    assert.deepEqual(discord.account.providers, ['discord', 'google']);
    assert.equal((await t.login('discord', { code: 'ana' })).account.id, guest.player.id);

    // sem convidado e com uma pessoa nova: conta nova
    const fresh = await t.login('discord', { code: 'bia' });
    assert.equal(fresh.outcome, 'created');
    assert.notEqual(fresh.account.id, guest.player.id);
    assert.equal(fresh.account.nickname, 'Ana');

    // /me, sair
    assert.deepEqual((await t.post('/api/auth/me', { token: phone.token })).body.account.providers, ['discord', 'google']);
    await t.post('/api/auth/logout', { token: phone.token });
    assert.equal((await t.post('/api/auth/me', { token: phone.token })).status, 401);
    assert.equal((await t.post('/api/auth/me', { token: r.token })).status, 200, 'sair num aparelho não tira o outro');
  } finally { await t.close(); }
});

test('login: recusa volta para outro site, outro navegador, cancelamento e código ruim', async () => {
  const t = await setup();
  try {
    assert.equal((await t.login('google', { returnTo: 'https://golpe.example/' })).intent.status, 400);
    assert.equal((await t.login('github', {})).intent.status, 400);
    assert.ok((await t.login('google', { returnTo: 'https://jogo.example/?server=x' })).token, 'o site do jogo vale');
    assert.equal((await t.login('google', { cookie: 'jg_oauth=outro' })).callback, 400, 'state preso ao navegador');
    assert.equal((await t.login('google', { cancel: true })).error, 'cancelado');
    assert.equal((await t.login('google', { code: 'ruim' })).error, 'falhou');
    assert.equal(await t.store.count(), 1, 'só a conta do login que deu certo');
  } finally { await t.close(); }
});

test('login expira', async () => {
  let clock = 1e12;
  const t = await setup({ now: () => clock });
  try {
    const intent = await t.post('/api/auth/intent', { provider: 'google', returnTo: GAME });
    clock += 11 * 60 * 1000;
    assert.equal((await fetch(intent.body.url, { redirect: 'manual' })).status, 400);
  } finally { await t.close(); }
});

test('campanha na nuvem: só com login, fica o mais novo e apagar também sincroniza', async () => {
  let clock = Date.parse('2026-10-28T12:00:00.000Z');
  const t = await setup({ now: () => clock });
  try {
    const guest = await t.store.create('Convidado');
    const save = (slot, coins, updatedAt) => ({ slot, updatedAt, data: { version: 2, slot, coins, updatedAt } });
    assert.equal((await t.post('/api/saves', { token: guest.token })).status, 403, 'convidado não usa a nuvem');
    assert.equal((await t.post('/api/saves', { token: 'nada' })).status, 401);

    const { token } = await t.login('google', { token: guest.token });
    assert.deepEqual((await t.post('/api/saves', { token })).body.saves, []);
    let r = await t.post('/api/saves/put', { token, saves: [save(1, 10, '2026-10-28T10:00:00.000Z'), save(2, 5, '2026-10-28T10:00:00.000Z')] });
    assert.equal(r.status, 200);
    // um aparelho com o arquivo mais velho não apaga o progresso novo
    r = await t.post('/api/saves/put', { token, saves: [save(1, 1, '2026-10-28T09:00:00.000Z')] });
    assert.equal(r.body.saves[0].data.coins, 10);
    // apagar o arquivo 2
    await t.post('/api/saves/put', { token, saves: [{ slot: 2, data: null, updatedAt: '2026-10-28T11:00:00.000Z' }] });
    const list = (await t.post('/api/saves', { token })).body.saves;
    assert.deepEqual(list.map(s => [s.slot, s.data?.coins ?? null]), [[1, 10], [2, null]]);
    // relógio do aparelho no futuro: vale a hora do servidor
    r = await t.post('/api/saves/put', { token, saves: [save(3, 7, '2030-01-01T00:00:00.000Z')] });
    assert.equal(r.body.saves[0].updatedAt, '2026-10-28T12:00:00.000Z');

    for (const bad of [[save(4, 1, '2026-10-28T10:00:00.000Z')], [{ ...save(1, 1, 'ontem') }], [{ slot: 1, updatedAt: '2026-10-28T13:00:00.000Z', data: { version: 2, slot: 2 } }], []]) {
      assert.equal((await t.post('/api/saves/put', { token, saves: bad })).status, 400);
    }
    const huge = save(1, 1, '2026-10-28T13:00:00.000Z');
    huge.data.junk = 'x'.repeat(40 * 1024);
    assert.equal((await t.post('/api/saves/put', { token, saves: [huge] })).status, 400);

    // apagar a conta
    const player = await t.store.getByToken(token);
    assert.equal((await t.post('/api/auth/delete', { token })).status, 200);
    assert.deepEqual(t.deleted, [player.id]);
    assert.equal((await t.post('/api/saves', { token })).status, 401);
    assert.equal(await t.store.findIdentity('google', 'g-ana'), null, 'dá para entrar de novo do zero');
  } finally { await t.close(); }
});

test('login de teste local: a página faz o papel do provedor', async () => {
  const t = await setup({ env: { AUTH_DEV_LOGIN: '1' } });
  try {
    const intent = await t.post('/api/auth/intent', { provider: 'dev', returnTo: GAME });
    const start = await fetch(intent.body.url, { redirect: 'manual' });
    const page = await fetch(start.headers.get('location'));
    assert.match(await page.text(), /Login de teste/);
    const r = await t.login('dev', { code: 'teste-1' });
    assert.equal(r.outcome, 'created');
    assert.deepEqual(r.account.providers, ['dev']);
    assert.equal((await fetch(`${t.base()}/api/auth/dev?redirect_uri=https://golpe.example`)).status, 400);
  } finally { await t.close(); }
});
