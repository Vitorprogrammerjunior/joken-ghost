'use strict';
// Servidor multiplayer do JokenGhost: lobby, duelos entre caçadores, troféus e ranking.
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createStore } = require('./src/store');
const { Hub } = require('./src/hub');
const { leagueOf, CARDS, CHARACTERS, LEAGUES } = require('./src/catalog');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main() {
  const store = await createStore();
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
  app.get('/', (_req, res) => res.json({ ok: true, service: 'jokenghost-multiplayer', version: '2.0.0' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  // ranking público (usado também pela wiki)
  app.get('/api/ranking', async (_req, res) => {
    const top = await store.top(50);
    res.json(top.map((p, i) => ({ rank: i + 1, nickname: p.nickname, trophies: p.trophies, wins: p.wins, character: p.character, league: leagueOf(p.trophies) })));
  });

  app.get('/api/catalog', (_req, res) => res.json({ cards: CARDS, characters: CHARACTERS, leagues: LEAGUES }));

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, methods: ['GET', 'POST'] } });
  const hub = new Hub(io, store);

  server.listen(PORT, () => console.log(`JokenGhost multiplayer na porta ${PORT} (${process.env.DATABASE_URL ? 'Postgres' : 'arquivo JSON'})`));

  const shutdown = async () => {
    hub.stop();
    await store.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
