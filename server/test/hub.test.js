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

const FAST = { ...RULES, introMs: 60, roundIntroMs: 20, banPhaseMs: 150, cardPhaseMs: 250, cardRevealMs: 30, specialRevealMs: 30, weaponPhaseMs: 250, visionWeaponMs: 150, revealMs: 30, specialResultMs: 10, reconnectGraceMs: 1500 };
const RAID_FAST = { weaponMs: 250, revealMs: 30 };

async function setup(opts = {}) {
  const store = await new JsonStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-')), 'p.json')).init();
  const server = http.createServer();
  const io = new Server(server);
  const hub = new Hub(io, store, { shared: await loadShared(), rules: FAST, tournamentFillMs: 200, ratePerSec: 1000, ...opts });
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

/** Joga com uma arma por lado: o lado 0 vence sempre (cruz vence aspirador), então a partida acaba. */
function autoplayBySide(c) {
  let weapon = 'cruz';
  c.on('match_start', (m) => { weapon = m.fighters[m.you].side === 0 ? 'cruz' : 'aspirador'; });
  c.on('card_phase', () => c.emit('pick_card', { cardId: null }));
  c.on('weapon_phase', () => c.emit('pick_weapon', { weapon }));
}

/** Armas sorteadas: entre vários jogadores alguém sempre acaba vencendo. */
function autoplayRandom(c) {
  const weapons = ['estaca', 'aspirador', 'cruz'];
  c.on('card_phase', () => c.emit('pick_card', { cardId: null }));
  c.on('weapon_phase', (d) => c.emit('pick_weapon', { weapon: weapons.filter(w => w !== d.forbidden)[Math.floor(Math.random() * 2)] }));
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

test('ranqueada: cada um vê a build do outro e bane uma carta antes da 1ª rodada', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Vitor');
    const b = await client('Amigo');
    a.c.emit('save_build', { slot: 1, name: 'Juízo', character: 'sombra', cards: ['juizo', 'escudo', 'cura'] });
    const prof = await waitFor(a.c, 'profile', (p) => p.activeBuild === 1);
    assert.equal(prof.character, 'sombra');
    assert.deepEqual(prof.deck, ['juizo', 'escudo', 'cura']);
    assert.equal(prof.builds[1].name, 'Juízo');
    a.c.emit('save_build', { slot: 2, character: 'luna', cards: ['juizo', 'escudo_sagrado', 'visao'] });
    assert.match((await waitFor(a.c, 'error_msg', (e) => /orçamento/.test(e.message))).message, /orçamento/);

    autoplay(a.c, 'cruz');
    autoplay(b.c, 'aspirador');
    b.c.on('ban_phase', (d) => b.c.emit('ban_card', { cardId: d.deck.includes('escudo') ? 'escudo' : d.deck[0] }));
    a.c.emit('queue_join', { mode: 'ranked' });
    b.c.emit('queue_join', { mode: 'ranked' });
    const ban = await seenOrWait(b.c, 'ban_phase');
    assert.deepEqual(ban.deck, ['juizo', 'escudo', 'cura'], 'B vê a build de A');
    const { banned } = await seenOrWait(a.c, 'bans');
    const youA = (await seenOrWait(a.c, 'match_start')).you;
    assert.equal(banned[youA], 'escudo', 'B baniu o Escudo de A');
    assert.equal(banned[1 - youA], 'vampirismo', 'A não escolheu: bane a carta mais cara de B');
    const hand = await seenOrWait(a.c, 'card_phase');
    assert.ok(!hand.hand.includes('escudo'));
    await seenOrWait(a.c, 'match_end');

    a.c.emit('use_build', { slot: 0 });
    assert.match((await waitFor(a.c, 'error_msg', (e) => /não existe/.test(e.message))).message, /não existe/);
  } finally { await close(); }
});

const BOT_FAST = { ...FAST, rankedBot: { ...RULES.rankedBot, waitMs: [200, 300], newPlayerWaitMs: [100, 150], cardThinkMs: [5, 30], weaponThinkMs: [5, 30] } };

test('ranqueada sozinho: um adversário completa a partida sem se revelar e vale troféus', async () => {
  const { client, close } = await setup({ rules: BOT_FAST });
  try {
    const a = await client('Solitario');
    autoplay(a.c, 'cruz');
    a.c.emit('queue_join', { mode: 'ranked' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'ranked');
    assert.equal(ms.ranked, true);
    const opp = ms.fighters[1 - ms.you];
    assert.equal('isBot' in opp, false, 'a visão da partida não diz que é bot');
    assert.ok(opp.nickname.length >= 2);
    assert.ok(Math.abs(opp.trophies - 0) <= 70);
    const end = await once(a.c, 'match_end');
    assert.equal(end.ranked, true);
    assert.notEqual(end.trophies, null);
    // o bot não fica salvo: não aparece no ranking
    const rank = once(a.c, 'ranking');
    a.c.emit('ranking');
    const r = await rank;
    assert.equal(r.top.some(p => p.id === opp.id || p.nickname === opp.nickname), false);
    assert.equal(r.total, 1);
  } finally { await close(); }
});

test('ranqueada no topo (com o teto ligado): sem bot, só jogadores', async () => {
  const { client, close, store } = await setup({ rules: { ...BOT_FAST, rankedBot: { ...BOT_FAST.rankedBot, maxTrophies: 1600 } } });
  try {
    const a = await client('Lenda');
    const p = await store.getByToken(a.welcome.token);
    a.c.close();
    p.trophies = 1700; p.best = p.trophies; p.wins = 30;
    await store.save(p);
    const b = await client('Lenda', a.welcome.token);
    b.c.emit('queue_join', { mode: 'ranked' });
    await new Promise(r => setTimeout(r, 2500));
    assert.equal(b.c.seen.some(([e]) => e === 'match_start'), false);
  } finally { await close(); }
});

test('fila sozinho: ninguém entra no lugar de um caçador', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Sozinho');
    a.c.emit('queue_join', { mode: 'casual' });
    await new Promise(r => setTimeout(r, 2500)); // mais de dois ciclos do matchmaker
    assert.equal(a.c.seen.some(([e]) => e === 'match_start'), false);
  } finally { await close(); }
});

test('casual: dois caçadores, sem troféus', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Ana');
    const b = await client('Bia');
    autoplay(a.c, 'cruz');
    autoplay(b.c, 'aspirador');
    a.c.emit('queue_join', { mode: 'casual' });
    b.c.emit('queue_join', { mode: 'casual' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'casual');
    const end = await once(a.c, 'match_end');
    assert.equal(end.ranked, false);
    assert.equal(end.trophies, null);
  } finally { await close(); }
});

test('2x2: quatro caçadores, vida somada por lado, e quem cai fica parado', async () => {
  const { client, close } = await setup();
  try {
    const players = await Promise.all(['Um', 'Dois', 'Tres', 'Quatro'].map(n => client(n)));
    players.forEach(p => autoplayBySide(p.c));
    const starts = players.map(p => once(p.c, 'match_start'));
    players.forEach(p => p.c.emit('queue_join', { mode: 'duo' }));
    const views = await Promise.all(starts);
    assert.equal(views[0].fighters.length, 4);
    assert.equal(views[0].sides[0].maxHp, 150);
    // um caçador cai: depois da carência o parceiro segue jogando, sem perder por abandono
    const dropped = views.findIndex(v => v.fighters[v.you].side === 0);
    const watcher = players.find((_, k) => k !== dropped);
    const away = waitFor(watcher.c, 'seat_status', d => d.away === true);
    players[dropped].c.close();
    await away;
    const end = await once(watcher.c, 'match_end');
    assert.notEqual(end.reason, 'abandono');
  } finally { await close(); }
});

test('chefe cooperativo com dois caçadores', async () => {
  const { client, close } = await setup();
  try {
    const raid = require('../src/raid');
    Object.assign(raid.RAID, RAID_FAST);
    const a = await client('Caçadora');
    const b = await client('Parceiro');
    autoplay(a.c, 'cruz');
    autoplay(b.c, 'estaca');
    a.c.emit('queue_join', { mode: 'raid' });
    b.c.emit('queue_join', { mode: 'raid' });
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'raid');
    assert.equal(ms.hunters.length, 2);
    assert.ok(ms.boss.maxHp > 0);
    const result = await once(a.c, 'raid_result');
    assert.equal(result.exchanges.length, 2);
    const end = await once(a.c, 'match_end');
    assert.equal(typeof end.won, 'boolean');
  } finally { await close(); }
});

test('torneio: com 5 inscritos a chave é de 8 e alguns passam direto', async () => {
  const { client, close } = await setup();
  try {
    const players = await Promise.all(['A', 'B', 'C', 'D', 'E'].map(n => client(`Jog${n}`)));
    players.forEach(p => autoplayRandom(p.c));
    for (const p of players) p.c.emit('tournament_join');
    const state = await waitFor(players[0].c, 'tournament_state', d => d.status === 'done');
    assert.equal(state.entrants.length, 5);
    assert.equal(state.size, 8);
    assert.equal(state.rounds.length, 3);
    assert.equal(state.rounds[0].filter(m => m.b == null).length, 3);
    assert.ok(state.rounds[2][0].winner);
  } finally { await close(); }
});

test('torneio: com menos de 4 inscritos ele espera', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Cedo');
    const b = await client('Tambem');
    a.c.emit('tournament_join');
    b.c.emit('tournament_join');
    await new Promise(r => setTimeout(r, 1500)); // a espera (200ms) já passou
    const last = a.c.seen.filter(([e]) => e === 'tournament_state').at(-1)[1];
    assert.equal(last.status, 'waiting');
    assert.equal(last.min, 4);
  } finally { await close(); }
});

test('Rei da Arena: o primeiro vira rei, o segundo desafia e o vencedor fica', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Rei');
    const b = await client('Desafiante');
    autoplay(a.c, 'cruz');
    autoplay(b.c, 'aspirador');
    a.c.emit('king_join');
    await waitFor(a.c, 'king_state', d => d.king?.nickname === 'Rei');
    b.c.emit('king_join');
    const ms = await once(a.c, 'match_start');
    assert.equal(ms.kind, 'king');
    await once(a.c, 'match_end');
    const state = await waitFor(a.c, 'king_state', d => d.matchId === null && d.king?.streak >= 1);
    assert.equal(state.king.nickname, 'Rei'); // cruz vence aspirador
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

test('nome: não pode pegar o nome de outro caçador', async () => {
  const { client, close } = await setup();
  try {
    const a = await client('Vitor');
    const b = await client('Amigo');
    b.c.emit('set_nickname', { nickname: 'vítor' });
    const err = await waitFor(b.c, 'error_msg', (e) => e.field === 'nickname');
    assert.match(err.message, /já é de outro caçador/);
    a.c.emit('set_nickname', { nickname: 'VITOR' });
    assert.equal((await waitFor(a.c, 'profile', (p) => p.nickname === 'VITOR')).nickname, 'VITOR', 'mudar só as maiúsculas do próprio nome pode');
    b.c.emit('set_nickname', { nickname: 'Amiga' });
    assert.equal((await waitFor(b.c, 'profile', (p) => p.nickname === 'Amiga')).nickname, 'Amiga');
  } finally { await close(); }
});

test('build, loja de cosméticos e missões', async () => {
  const { client, close, store } = await setup();
  try {
    const a = await client('Colecionador');
    const err = once(a.c, 'error_msg');
    a.c.emit('set_deck', { cards: ['juizo', 'escudo_sagrado', 'visao'] }); // 11 pontos
    assert.match((await err).message, /orçamento/);
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
