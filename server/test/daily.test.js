'use strict';
// Desafio do Dia: o servidor refaz a corrida e só aceita a pontuação conferida.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { JsonStore } = require('../src/store');
const { dailyRoutes } = require('../src/daily');
const { loadShared } = require('../src/shared');

async function setup(now) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jg-daily-')), 'players.json');
  const store = await new JsonStore(file).init();
  const app = express();
  app.use(dailyRoutes(store, { now: () => now }));
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (p, body) => fetch(url + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { store, url, post, close: () => new Promise(r => server.close(r)) };
}

/** Joga a corrida do dia vencendo o alvo sempre (como um jogador perfeito). */
async function perfectRun(day) {
  const { createDailyRun, daySeed } = await loadShared();
  const { outcome } = await import('../../src/domain/rps.js');
  const { WEAPONS } = await import('../../src/config/weapons.js');
  const run = createDailyRun(daySeed(day));
  for (let guard = 0; guard < 2000 && !run.over; guard++) {
    if (run.offer) { run.chooseRelic(run.offer[0]); continue; }
    const t = run.battle.alive()[0];
    const w = Object.values(WEAPONS).find(x => outcome(x.move, t.intent) === 'win').id;
    run.attack(w, t.uid);
  }
  return run;
}

test('desafio do dia: corrida conferida entra no ranking; adulterada não', async () => {
  const now = new Date('2026-10-26T15:00:00Z');
  const { post, url, close } = await setup(now);
  try {
    const run = await perfectRun('2026-10-26');
    let res = await post('/api/daily', { nickname: 'Vitor', day: '2026-10-26', actions: run.actions });
    let body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.score, run.score);
    assert.equal(body.rank, 1);
    assert.ok(body.token, 'cria a conta no primeiro envio');

    const ranking = await (await fetch(`${url}/api/daily?day=2026-10-26`)).json();
    assert.equal(ranking.top[0].nickname, 'Vitor');

    res = await post('/api/daily', { token: 'nao-existe', day: '2026-10-26', actions: run.actions });
    assert.equal(res.status, 401);
    res = await post('/api/daily', { nickname: 'Trapaça', day: '2026-10-26', actions: run.actions.slice(0, 3) });
    assert.equal(res.status, 400);
    res = await post('/api/daily', { nickname: 'Antigo', day: '2026-10-20', actions: run.actions });
    assert.equal(res.status, 400);

    const me = await (await post('/api/daily/me', { token: body.token, day: '2026-10-26' })).json();
    assert.equal(me.rank, 1);
  } finally {
    await close();
  }
});
