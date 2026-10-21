'use strict';
// Teste de ponta a ponta: servidor Socket.io real + dois clientes jogando uma partida.
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
const { RULES } = require('../src/catalog');

const FAST = { ...RULES, cardPhaseMs: 300, weaponPhaseMs: 300, revealMs: 50, reconnectGraceMs: 1500 };

async function setup() {
  const store = await new JsonStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-')), 'p.json')).init();
  const server = http.createServer();
  const io = new Server(server);
  const hub = new Hub(io, store, { rules: FAST });
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
  return { client, close, store };
}

const once = (c, ev) => new Promise(r => c.once(ev, r));
/** Espera um evento, inclusive se ele já chegou. */
const seenOrWait = (c, ev) => {
  const got = c.seen.find(([e]) => e === ev);
  return got ? Promise.resolve(got[1]) : once(c, ev);
};

test('partida rápida completa: fila, cartas, armas, troféus', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Vitor');
    const b = await client('Amigo');
    assert.ok(a.welcome.token);
    assert.equal(a.welcome.profile.trophies, 0);
    assert.equal(a.welcome.catalog.cards.length, 11);

    // os dois jogam sempre: A cruz, B aspirador (cruz vence aspirador)
    for (const [p, weapon] of [[a, 'cruz'], [b, 'aspirador']]) {
      p.c.on('card_phase', (d) => p.c.emit('pick_card', { cardId: null }));
      p.c.on('weapon_phase', () => p.c.emit('pick_weapon', { weapon }));
    }
    const startA = once(a.c, 'match_start');
    a.c.emit('queue_join');
    b.c.emit('queue_join');
    const ms = await startA;
    assert.equal(ms.opponent.nickname, 'Amigo');

    const endA = once(a.c, 'match_end');
    const endB = once(b.c, 'match_end');
    const [ea, eb] = await Promise.all([endA, endB]);
    assert.equal(ea.won, true);
    assert.equal(eb.won, false);
    assert.ok(ea.trophies.delta > 0);
    assert.equal(eb.trophies.after, 0);
    assert.equal(ea.profile.wins, 1);

    const rank = once(a.c, 'ranking');
    a.c.emit('ranking');
    const r = await rank;
    assert.equal(r.top[0].nickname, 'Vitor');
    assert.equal(r.me.rank, 1);
  } finally { await close(); }
});

test('desafio direto, Visão e abandono', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Ana');
    const b = await client('Bia');
    const got = once(b.c, 'challenge_received');
    a.c.emit('challenge', { targetId: b.welcome.profile.id });
    const ch = await got;
    assert.equal(ch.from.nickname, 'Ana');
    const started = once(a.c, 'match_start');
    b.c.emit('challenge_answer', { fromId: ch.from.id, accept: true });
    await started;

    // B abandona: A vence depois da carência de reconexão
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

    // B cai e volta com o token antes da carência acabar
    const token = b.welcome.token;
    b.c.close();
    const b2 = await client('Convidado', token);
    assert.equal(b2.welcome.profile.nickname, 'Convidado');
    const resume = await seenOrWait(b2.c, 'match_resume');
    assert.equal(resume.opponent.nickname, 'Dono');
  } finally { await close(); }
});
