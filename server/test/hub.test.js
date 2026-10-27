'use strict';
// Testes de ponta a ponta: servidor Socket.io real + clientes jogando cada modo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { JsonStore } = require('../src/store');
const { Hub } = require('../src/hub');
const { loadShared } = require('../src/shared');
const { RULES } = require('../src/catalog');

const FAST = { ...RULES, cardPhaseMs: 250, weaponPhaseMs: 250, visionWeaponMs: 150, revealMs: 30, reconnectGraceMs: 1500, botAfterMs: 150, botThinkMs: [5, 20] };
const RAID_FAST = { weaponMs: 250, revealMs: 30 };

async function setup(opts = {}) {
  const store = await new JsonStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-')), 'p.json')).init();
  const server = http.createServer();
  const io = new Server(server);
  const hub = new Hub(io, store, { shared: await loadShared(), rules: FAST, tournamentFillMs: 200, kingBotMs: 200, ratePerSec: 1000, ...opts });
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}`;
  const clients = [];
  const client = async (nickname, token) => {
    const c = connect(url, { transports: ['websocket'], forceNew: true });
    c.seen = [];
    c.onAny((ev, data) => c.seen.push([ev, data])); // guarda tudo para não perder eventos
    clients.push(c);
    const welcome = new Promise(r => c.once('welcome', r));
    c.emit('hello', { nickname, token });
    return { c, welcome: await welcome };
  };
  const close = async () => {
    clients.forEach(c => c.close());
    hub.stop();
    io.close();
    await new Promise(r => server.close(r));
  };
  return { client, close, store, hub };
}

const once = (c, ev) => new Promise(r => c.once(ev, r));
/** Espera um evento, inclusive se ele já chegou. */
const seenOrWait = (c, ev) => {
  const got = c.seen.find(([e]) => e === ev);
  return got ? Promise.resolve(got[1]) : once(c, ev);
};

/** Espera um evento que satisfaça `pred` (olha também os que já chegaram). */
const waitFor = (c, ev, pred) => {
  const got = c.seen.find(([e, d]) => e === ev && pred(d));
  if (got) return Promise.resolve(got[1]);
  return new Promise((resolve) => {
    const fn = (d) => { if (pred(d)) { c.off(ev, fn); resolve(d); } };
    c.on(ev, fn);
  });
};

/** O cliente joga sozinho: passa a carta e sempre usa a mesma arma. */
function autoplay(c, weapon) {
  c.on('card_phase', () => c.emit('pick_card', { cardId: null }));
  c.on('weapon_phase', (d) => c.emit('pick_weapon', { weapon: d.forbidden === weapon ? 'estaca' : weapon }));
  c.on('raid_phase', (d) => { if (d.alive) c.emit('pick_weapon', { weapon }); });
}

test('ranqueada completa: fila, cartas, armas, troféus e ranking', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Vitor');
    const b = await client('Amigo');
    assert.ok(a.welcome.token);
    assert.equal(a.welcome.catalog.cards.length, 16);
    assert.equal(a.welcome.profile.missions.length, 3);
    autoplay(a.c, 'cruz');
    autoplay(b.c, 'aspirador'); // cruz vence aspirador
    const startA = once(a.c, 'match_start');
    a.c.emit('queue_join', { mode: 'ranked' });
    b.c.emit('queue_join', { mode: 'ranked' });
    const ms = await startA;
    assert.equal(ms.kind, 'ranked');
    assert.equal(ms.fighters[1 - ms.you].nickname, 'Amigo');

    const [ea, eb] = await Promise.all([once(a.c, 'match_end'), once(b.c, 'match_end')]);
    assert.equal(ea.won, true);
    assert.equal(eb.won, false);
    assert.ok(ea.trophies.delta > 0);
    assert.equal(ea.profile.wins, 1);
    assert.ok(ea.profile.missions.find(m => m.id === 'jogar' || m.id === 'vencer' || m.progress >= 0));

    const rank = once(a.c, 'ranking');
    a.c.emit('ranking');
    const r = await rank;
    assert.equal(r.top[0].nickname, 'Vitor');
  } finally { await close(); }
});

test('fila vazia: um bot entra (sem troféus) e joga até o fim', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Sozinho');
    autoplay(a.c, 'cruz');
    a.c.emit('queue_join', { mode: 'casual' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.fighters[1 - ms.you].isBot, true);
    const end = await once(a.c, 'match_end');
    assert.equal(end.ranked, false);
    assert.equal(end.trophies, null);
  } finally { await close(); }
});

test('2x2 com bots: quatro caçadores, vida somada por lado', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Dupla');
    autoplay(a.c, 'aspirador');
    a.c.emit('queue_join', { mode: 'duo' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.fighters.length, 4);
    assert.equal(ms.sides[0].maxHp, 150);
    await once(a.c, 'match_end');
  } finally { await close(); }
});

test('chefe cooperativo com parceiro bot', async () => {
  const { client, close } = await setup();
  try {
    const raid = require('../src/raid');
    Object.assign(raid.RAID, RAID_FAST);
    const a = await client('Caçadora');
    autoplay(a.c, 'cruz');
    a.c.emit('queue_join', { mode: 'raid' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'raid');
    assert.equal(ms.hunters.length, 2);
    assert.ok(ms.boss.maxHp > 0);
    const result = await once(a.c, 'raid_result');
    assert.ok(result.exchanges.length >= 1);
    const end = await once(a.c, 'match_end');
    assert.equal(typeof end.won, 'boolean');
  } finally { await close(); }
});

test('torneio: bots completam a chave e o torneio termina', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Campeão');
    autoplay(a.c, 'estaca');
    a.c.emit('tournament_join');
    const state = await waitFor(a.c, 'tournament_state', d => d.status === 'done');
    assert.equal(state.entrants.length, 8);
    assert.equal(state.rounds.length, 3);
    assert.ok(state.rounds[2][0].winner);
  } finally { await close(); }
});

test('Rei da Arena: vira rei, um bot desafia e a fila assiste', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Rei');
    autoplay(a.c, 'cruz');
    a.c.emit('king_join');
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'king');
    await once(a.c, 'match_end');
    // depois da luta o vencedor (o caçador ou o bot) é rei com sequência 1 ou mais
    const state = await waitFor(a.c, 'king_state', d => d.matchId === null && d.king?.streak >= 1);
    assert.ok(state.king.nickname);
  } finally { await close(); }
});

test('espectador assiste uma partida em andamento', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Ana');
    const b = await client('Bia');
    const v = await client('Visita');
    autoplay(a.c, 'cruz');
    autoplay(b.c, 'aspirador');
    const started = once(a.c, 'match_start');
    a.c.emit('queue_join', { mode: 'casual' });
    b.c.emit('queue_join', { mode: 'casual' });
    await started;
    const watch = once(v.c, 'match_start');
    v.c.emit('spectate', { playerId: a.welcome.profile.id });
    const view = await watch;
    assert.equal(view.you, null);
    const rr = await once(v.c, 'round_result');
    assert.ok(rr.lanes.length === 1);
    const end = await once(v.c, 'match_end');
    assert.equal(end.spectator, true);
  } finally { await close(); }
});

test('desafio direto e abandono', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Ana');
    const b = await client('Bia');
    const got = once(b.c, 'challenge_received');
    a.c.emit('challenge', { targetId: b.welcome.profile.id });
    const ch = await got;
    const started = once(a.c, 'match_start');
    b.c.emit('challenge_answer', { fromId: ch.from.id, accept: true });
    await started;
    await once(a.c, 'card_phase');
    const end = once(a.c, 'match_end');
    b.c.close();
    const e = await end;
    assert.equal(e.won, true);
    assert.equal(e.reason, 'abandono');
  } finally { await close(); }
});

test('sala privada por código e reconexão com o mesmo token', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Dono');
    const created = once(a.c, 'room_created');
    a.c.emit('room_create');
    const { code } = await created;
    assert.match(code, /^JGH-[A-Z0-9]{4}$/);
    const b = await client('Convidado');
    const started = once(b.c, 'match_start');
    b.c.emit('room_join', { code: code.slice(4) });
    await started;
    const token = b.welcome.token;
    b.c.close();
    const b2 = await client('Convidado', token);
    const resume = await seenOrWait(b2.c, 'match_resume');
    assert.equal(resume.fighters[1 - resume.you].nickname, 'Dono');
  } finally { await close(); }
});

test('deck, loja de cosméticos e missões', async () => {
  const { client, close, store } = await setup();
  try {
    const a = await client('Colecionador');
    const err = once(a.c, 'error_msg');
    a.c.emit('set_deck', { cards: ['juizo'] }); // bloqueada
    assert.match((await err).message, /bloqueadas/);
    let prof = once(a.c, 'profile');
    a.c.emit('set_deck', { cards: ['escudo', 'cura'] });
    assert.deepEqual((await prof).deck, ['escudo', 'cura']);

    const poor = once(a.c, 'error_msg');
    a.c.emit('shop_buy', { id: 'ouro' });
    assert.match((await poor).message, /Ecto/);

    // ganha Ecto (como numa missão) e compra
    const p = await store.getByToken(a.welcome.token);
    assert.ok(p);
    a.c.close();
    p.ecto = 500;
    await store.save(p);
    const a2 = await client('Colecionador', a.welcome.token);
    prof = once(a2.c, 'profile');
    a2.c.emit('shop_buy', { id: 'ouro' });
    const after = await prof;
    assert.equal(after.ecto, 200);
    assert.ok(after.cosmetics.includes('ouro'));
    prof = once(a2.c, 'profile');
    a2.c.emit('equip_frame', { id: 'ouro' });
    assert.equal((await prof).equipped.frame, 'ouro');
  } finally { await close(); }
});
