'use strict';
// Desafio do Dia: ranking diário. O cliente manda as jogadas da corrida e o servidor
// refaz tudo com a semente do dia; só a pontuação conferida entra no ranking.
const express = require('express');
const { loadShared } = require('./shared');

const MAX_ACTIONS = 4000;       // uma corrida de 10 ondas fica bem abaixo disso
const SUBMIT_COOLDOWN_MS = 3000;

/**
 * @param {object} store  persistência (src/store.js)
 * @param {{ now?: () => Date, onPlayed?: (player: object) => Promise<void> }} [opts]
 *   onPlayed: avisado quando uma corrida válida chega (missões diárias).
 */
function dailyRoutes(store, { now = () => new Date(), onPlayed = async () => {} } = {}) {
  const router = express.Router();
  const lastSubmit = new Map(); // playerId -> horário

  const validDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const rows = (list) => list.map((d, i) => ({ rank: i + 1, nickname: d.nickname, character: d.character, score: d.score, waves: d.waves }));

  router.get('/api/daily', async (req, res) => {
    const { dayKey } = await loadShared();
    const day = validDay(req.query.day) ? req.query.day : dayKey(now());
    res.json({ day, top: rows(await store.dailyTop(day, 20)) });
  });

  /** Minha posição no dia (o código da conta vai no corpo, nunca na URL). */
  router.post('/api/daily/me', express.json({ limit: '4kb' }), async (req, res) => {
    const { token, day } = req.body ?? {};
    const player = token ? await store.getByToken(token) : null;
    if (!player || !validDay(day)) return res.status(400).json({ error: 'Pedido inválido.' });
    res.json(await store.dailyRank(day, player.id));
  });

  router.post('/api/daily', express.json({ limit: '256kb' }), async (req, res) => {
    const { dayKey, daySeed, replayDaily } = await loadShared();
    const { token, nickname, day, actions } = req.body ?? {};

    // a corrida pode ter começado antes da meia-noite: vale hoje e ontem
    const today = dayKey(now());
    const yesterday = dayKey(new Date(now().getTime() - 24 * 3600 * 1000));
    if (day !== today && day !== yesterday) return res.status(400).json({ error: 'Este desafio já acabou.' });
    if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS) {
      return res.status(400).json({ error: 'Corrida inválida.' });
    }

    let player = token ? await store.getByToken(token) : null;
    if (token && !player) return res.status(401).json({ error: 'Conta não encontrada.' });
    let newToken = null;
    if (!player) ({ player, token: newToken } = await store.create(nickname)); // conta anônima no primeiro envio

    const last = lastSubmit.get(player.id) ?? 0;
    if (now().getTime() - last < SUBMIT_COOLDOWN_MS) return res.status(429).json({ error: 'Espere um pouco antes de enviar de novo.' });
    lastSubmit.set(player.id, now().getTime());

    const check = replayDaily(daySeed(day), actions);
    if (!check.ok) return res.status(400).json({ error: `Corrida não confere: ${check.reason}` });

    const best = await store.submitDaily(day, player.id, check.score, check.wavesCleared);
    await onPlayed(player);
    res.json({ score: check.score, best, ...(await store.dailyRank(day, player.id)), token: newToken });
  });

  return router;
}

module.exports = { dailyRoutes };
