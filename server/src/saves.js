'use strict';
// Campanha na nuvem: os arquivos (slots) de quem entrou com Google ou Discord.
// O aparelho manda cada arquivo com a hora em que foi salvo; fica sempre o mais novo.
// data null = arquivo apagado (para o apagar chegar aos outros aparelhos).
//   POST /api/saves      { token }                                   -> { saves: [{ slot, data, updatedAt }] }
//   POST /api/saves/put  { token, saves: [{ slot, data, updatedAt }] } -> { saves: [...o que ficou na nuvem] }
const express = require('express');

const SLOTS = 3;                 // src/domain/progress.js (SLOT_COUNT)
const MAX_SAVE_BYTES = 32 * 1024;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Confere um arquivo vindo do aparelho. Devolve o motivo do erro ou null. */
function invalidSave(s) {
  if (!s || !Number.isInteger(s.slot) || s.slot < 1 || s.slot > SLOTS) return 'Arquivo inválido.';
  if (typeof s.updatedAt !== 'string' || !ISO.test(s.updatedAt)) return 'Data do arquivo inválida.';
  if (s.data === null) return null;
  if (typeof s.data !== 'object' || Array.isArray(s.data) || !Number.isInteger(s.data.version) || s.data.slot !== s.slot) return 'Arquivo inválido.';
  if (JSON.stringify(s.data).length > MAX_SAVE_BYTES) return 'Arquivo grande demais.';
  return null;
}

/** @param {object} store persistência (src/store.js) */
function saveRoutes(store, { now = () => Date.now() } = {}) {
  const router = express.Router();
  const json = express.json({ limit: '128kb' });
  const fail = (res, status, error) => res.status(status).json({ error });

  /** Dono do token, se ele tem login (convidado não salva na nuvem). */
  async function owner(req, res) {
    const player = typeof req.body?.token === 'string' ? await store.getByToken(req.body.token) : null;
    if (!player) { fail(res, 401, 'Conta não encontrada.'); return null; }
    if (!(await store.identitiesOf(player.id)).length) { fail(res, 403, 'Entre com Google ou Discord para salvar na nuvem.'); return null; }
    return player;
  }

  router.post('/api/saves', json, async (req, res) => {
    const player = await owner(req, res);
    if (player) res.json({ saves: await store.listSaves(player.id) });
  });

  router.post('/api/saves/put', json, async (req, res) => {
    const list = req.body?.saves;
    if (!Array.isArray(list) || !list.length || list.length > SLOTS) return fail(res, 400, 'Pedido inválido.');
    for (const s of list) { const why = invalidSave(s); if (why) return fail(res, 400, why); }
    const player = await owner(req, res);
    if (!player) return;
    // relógio adiantado no aparelho não pode deixar um arquivo "para sempre mais novo"
    const latest = new Date(now() + MAX_FUTURE_MS).toISOString();
    const saves = [];
    for (const s of list) {
      const at = s.updatedAt > latest ? new Date(now()).toISOString() : s.updatedAt;
      saves.push(await store.putSave(player.id, s.slot, s.data, at));
    }
    res.json({ saves });
  });

  return router;
}

module.exports = { saveRoutes, invalidSave, SLOTS };
