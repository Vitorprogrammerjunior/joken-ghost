'use strict';
// Persistência: jogadores (contas anônimas, troféus, deck, cosméticos, missões),
// logins (Google/Discord) e sessões, saves da campanha, pontuações do Desafio do Dia
// e dados gerais (temporada atual).
//
// Token: o convidado tem um só (players.token_hash, o "código da conta"). Quem entra com
// Google ou Discord ganha uma sessão por aparelho (sessions) e o código de convidado deixa de valer.
//   DATABASE_URL definida -> Postgres (Neon)
//   senão                 -> arquivo JSON (DATA_FILE, padrão ./data/players.json)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DEFAULT_AVATAR } = require('./cosmetics');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const newId = () => crypto.randomBytes(8).toString('hex');
const newToken = () => crypto.randomBytes(24).toString('hex');

function cleanNickname(raw) {
  const nick = String(raw || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return nick.length >= 2 ? nick : `Caçador${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Mesmo nome sem diferença de maiúsculas, acentos ou espaços nas pontas ("Vitor" = "vítor"). */
const nickKey = (nick) => String(nick).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Nome livre para uma conta nova: o pedido, ou ele com números no fim se alguém já usa.
 * (Nomes repetidos de antes desta regra continuam valendo.)
 */
async function freeNickname(store, nick) {
  if (!await store.nicknameTaken(nick)) return nick;
  for (let i = 0; i < 20; i++) {
    const candidate = `${nick.slice(0, 12)}${Math.floor(1000 + Math.random() * 9000)}`;
    if (!await store.nicknameTaken(candidate)) return candidate;
  }
  return `${nick.slice(0, 8)}${Date.now().toString(36).slice(-8)}`;
}

/** Campos salvos de cada jogador. Os de JSON_FIELDS são listas/objetos. */
const FIELDS = [
  'id', 'nickname', 'trophies', 'best', 'wins', 'losses', 'character',
  'deck', 'builds', 'ecto', 'cosmetics', 'equipped', 'avatar', 'cups', 'season', 'seasonBest', 'missions',
  'createdAt', 'updatedAt',
];
const JSON_FIELDS = ['deck', 'builds', 'cosmetics', 'equipped', 'avatar', 'missions'];

function blankPlayer(nickname) {
  const now = new Date().toISOString();
  return {
    id: newId(), nickname: cleanNickname(nickname), trophies: 0, best: 0, wins: 0, losses: 0, character: 'cacador',
    deck: null,              // cartas em uso (null = as padrão)
    builds: null,            // builds salvas { list: [{ name, character, cards } | null], active }
    ecto: 0,                 // moeda dos cosméticos (missões, torneios, temporadas)
    cosmetics: [],           // ids de molduras e expressões compradas ou ganhas
    equipped: { frame: null },
    avatar: { ...DEFAULT_AVATAR }, // rosto de um caçador ou desenho do Ateliê
    cups: 0,                 // torneios vencidos
    season: 0,               // última temporada aplicada a este jogador
    seasonBest: 0,           // maior número de troféus nesta temporada
    missions: null,          // { day, list: [{ id, progress, claimed }] }
    createdAt: now, updatedAt: now,
  };
}

function pick(p) {
  const o = {};
  for (const k of FIELDS) if (p[k] !== undefined) o[k] = p[k];
  delete o.id; delete o.createdAt;
  return o;
}
function strip(p) { const o = {}; for (const k of FIELDS) o[k] = p[k]; return o; }
function rankOrder(a, b) {
  return b.trophies - a.trophies || b.wins - a.wins || String(a.createdAt).localeCompare(String(b.createdAt));
}
const dailyOrder = (a, b) => b.score - a.score || String(a.updatedAt).localeCompare(String(b.updatedAt));
const identityKey = (provider, subject) => `${provider}|${subject}`;

// ═══════════════════════ JSON ═══════════════════════
class JsonStore {
  constructor(file) {
    this.file = file;
    this.players = new Map();   // id -> player (com tokenHash)
    this.byToken = new Map();   // tokenHash -> id
    this.daily = new Map();     // `${day}|${playerId}` -> { day, playerId, score, waves, updatedAt }
    this.identities = new Map(); // `${provider}|${subject}` -> { provider, subject, playerId }
    this.sessions = new Map();  // tokenHash -> { tokenHash, playerId, createdAt }
    this.saves = new Map();     // `${playerId}|${slot}` -> { playerId, slot, data, updatedAt }
    this.meta = {};
    this.timer = null;
  }

  async init() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const raw of data.players || []) {
        const p = { ...blankPlayer(raw.nickname), ...raw };
        this.players.set(p.id, p);
        this.byToken.set(p.tokenHash, p.id);
      }
      for (const d of data.daily || []) this.daily.set(`${d.day}|${d.playerId}`, d);
      for (const i of data.identities || []) this.identities.set(identityKey(i.provider, i.subject), i);
      for (const s of data.sessions || []) this.sessions.set(s.tokenHash, s);
      for (const s of data.saves || []) this.saves.set(`${s.playerId}|${s.slot}`, s);
      this.meta = data.meta || {};
    } catch { /* arquivo ainda não existe */ }
    return this;
  }

  #persist() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  }

  flush() {
    clearTimeout(this.timer);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({
      players: [...this.players.values()], daily: [...this.daily.values()], meta: this.meta,
      identities: [...this.identities.values()], sessions: [...this.sessions.values()], saves: [...this.saves.values()],
    }));
    fs.renameSync(tmp, this.file);
  }

  // ─── jogadores ───
  async create(nickname) {
    const token = newToken();
    const p = { ...blankPlayer(nickname), tokenHash: hashToken(token) };
    p.nickname = await freeNickname(this, p.nickname);
    this.players.set(p.id, p);
    this.byToken.set(p.tokenHash, p.id);
    this.#persist();
    return { player: strip(p), token };
  }

  /** Alguém (fora `exceptId`) já usa esse nome? */
  async nicknameTaken(nickname, exceptId = null) {
    const key = nickKey(nickname);
    for (const p of this.players.values()) if (p.id !== exceptId && nickKey(p.nickname) === key) return true;
    return false;
  }

  async getByToken(token) {
    const hash = hashToken(token);
    const id = this.byToken.get(hash) ?? this.sessions.get(hash)?.playerId;
    return id && this.players.has(id) ? strip(this.players.get(id)) : null;
  }

  async getById(id) {
    const p = this.players.get(id);
    return p ? strip(p) : null;
  }

  async save(player) {
    const cur = this.players.get(player.id);
    if (!cur) return;
    Object.assign(cur, structuredClone(pick(player)), { updatedAt: new Date().toISOString() });
    this.#persist();
  }

  async top(limit = 50) {
    return [...this.players.values()].map(strip).sort(rankOrder).slice(0, limit);
  }

  async rankOf(player) {
    let ahead = 0;
    for (const p of this.players.values()) if (rankOrder(p, player) < 0) ahead++;
    return ahead + 1;
  }

  async count() { return this.players.size; }

  /** Fim de temporada: quem passou de `threshold` troféus perde metade do excedente. */
  async trimTrophies(threshold) {
    for (const p of this.players.values()) {
      if (p.trophies > threshold) p.trophies = threshold + Math.floor((p.trophies - threshold) / 2);
    }
    this.#persist();
  }

  // ─── Desafio do Dia ───
  /** Guarda a pontuação se for a melhor do jogador no dia. Retorna a melhor. */
  async submitDaily(day, playerId, score, waves) {
    const key = `${day}|${playerId}`;
    const cur = this.daily.get(key);
    if (!cur || score > cur.score) this.daily.set(key, { day, playerId, score, waves, updatedAt: new Date().toISOString() });
    this.#persist();
    return this.daily.get(key).score;
  }

  async dailyTop(day, limit = 20) {
    return [...this.daily.values()].filter(d => d.day === day).sort(dailyOrder).slice(0, limit)
      .map(d => ({ ...d, nickname: this.players.get(d.playerId)?.nickname ?? '?', character: this.players.get(d.playerId)?.character ?? 'cacador' }));
  }

  async dailyRank(day, playerId) {
    const list = [...this.daily.values()].filter(d => d.day === day).sort(dailyOrder);
    const i = list.findIndex(d => d.playerId === playerId);
    return { rank: i >= 0 ? i + 1 : null, total: list.length, score: i >= 0 ? list[i].score : null };
  }

  // ─── logins e sessões ───
  async findIdentity(provider, subject) {
    const i = this.identities.get(identityKey(provider, subject));
    return i ? this.getById(i.playerId) : null;
  }

  /** Liga o login à conta. false se esse login já pertence a alguém. */
  async linkIdentity(playerId, provider, subject) {
    const key = identityKey(provider, subject);
    if (this.identities.has(key)) return this.identities.get(key).playerId === playerId;
    this.identities.set(key, { provider, subject, playerId, createdAt: new Date().toISOString() });
    this.#persist();
    return true;
  }

  async identitiesOf(playerId) {
    return [...this.identities.values()].filter(i => i.playerId === playerId).map(i => i.provider).sort();
  }

  async createSession(playerId) {
    const token = newToken();
    this.sessions.set(hashToken(token), { tokenHash: hashToken(token), playerId, createdAt: new Date().toISOString() });
    this.#persist();
    return token;
  }

  /** Apaga uma sessão (sair). O código de convidado não é sessão e não é apagado aqui. */
  async deleteSession(token) {
    const ok = this.sessions.delete(hashToken(token));
    this.#persist();
    return ok;
  }

  /** O código de convidado para de valer (a conta passa a entrar só pelo login). */
  async revokeGuestToken(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    this.byToken.delete(p.tokenHash);
    p.tokenHash = hashToken(newToken());
    this.byToken.set(p.tokenHash, p.id);
    this.#persist();
  }

  // ─── saves da campanha ───
  async listSaves(playerId) {
    return [...this.saves.values()].filter(s => s.playerId === playerId)
      .sort((a, b) => a.slot - b.slot).map(({ slot, data, updatedAt }) => ({ slot, data: structuredClone(data), updatedAt }));
  }

  /** Guarda o save se for mais novo que o da nuvem (data null = arquivo apagado). Devolve o que ficou. */
  async putSave(playerId, slot, data, updatedAt) {
    const key = `${playerId}|${slot}`;
    const cur = this.saves.get(key);
    if (!cur || cur.updatedAt < updatedAt) this.saves.set(key, { playerId, slot, data: structuredClone(data), updatedAt });
    this.#persist();
    const { data: d, updatedAt: at } = this.saves.get(key);
    return { slot, data: structuredClone(d), updatedAt: at };
  }

  /** Apaga a conta e tudo ligado a ela (pedido do jogador). */
  async deletePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p) return false;
    this.byToken.delete(p.tokenHash);
    this.players.delete(playerId);
    for (const [k, i] of this.identities) if (i.playerId === playerId) this.identities.delete(k);
    for (const [k, s] of this.sessions) if (s.playerId === playerId) this.sessions.delete(k);
    for (const [k, s] of this.saves) if (s.playerId === playerId) this.saves.delete(k);
    for (const [k, d] of this.daily) if (d.playerId === playerId) this.daily.delete(k);
    this.#persist();
    return true;
  }

  // ─── dados gerais ───
  async getMeta(key) { return this.meta[key] ?? null; }
  async setMeta(key, value) { this.meta[key] = value; this.#persist(); }

  async close() { this.flush(); }
}

// ═══════════════════════ Postgres ═══════════════════════
class PgStore {
  /** @param {import('pg').Pool} pool */
  constructor(pool) { this.pool = pool; }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        token_hash TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        trophies INTEGER NOT NULL DEFAULT 0,
        best INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        character TEXT NOT NULL DEFAULT 'cacador',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    // colunas novas (bancos criados antes delas ganham as colunas aqui)
    for (const [col, type] of [
      ['deck', "TEXT"], ['ecto', 'INTEGER NOT NULL DEFAULT 0'], ['cosmetics', "TEXT NOT NULL DEFAULT '[]'"],
      ['equipped', "TEXT NOT NULL DEFAULT '{\"frame\":null}'"], ['cups', 'INTEGER NOT NULL DEFAULT 0'],
      ['season', 'INTEGER NOT NULL DEFAULT 0'], ['season_best', 'INTEGER NOT NULL DEFAULT 0'], ['missions', 'TEXT'],
      ['avatar', 'TEXT'], ['builds', 'TEXT'], ['nick_key', 'TEXT'],
    ]) {
      await this.pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    // nome normalizado para conferir nomes repetidos (contas de antes ganham o seu aqui)
    await this.pool.query('CREATE INDEX IF NOT EXISTS players_nick_key ON players (nick_key)');
    const { rows: noKey } = await this.pool.query('SELECT id, nickname FROM players WHERE nick_key IS NULL');
    for (const r of noKey) await this.pool.query('UPDATE players SET nick_key = $2 WHERE id = $1', [r.id, nickKey(r.nickname)]);
    await this.pool.query('CREATE INDEX IF NOT EXISTS players_rank ON players (trophies DESC, wins DESC)');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS daily_scores (
        day TEXT NOT NULL,
        player_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        waves INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (day, player_id)
      )`);
    await this.pool.query('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    // logins (só o id do jogador no Google/Discord: nada de e-mail ou nome)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS identities (
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        player_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (provider, subject)
      )`);
    await this.pool.query('CREATE INDEX IF NOT EXISTS identities_player ON identities (player_id)');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await this.pool.query('CREATE INDEX IF NOT EXISTS sessions_player ON sessions (player_id)');
    // updated_at vem do aparelho (ISO em UTC) para comparar qual save é o mais novo
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_saves (
        player_id TEXT NOT NULL,
        slot INTEGER NOT NULL,
        data TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (player_id, slot)
      )`);
    return this;
  }

  static row(r) {
    if (!r) return null;
    const parse = (v, fallback) => (v == null ? fallback : JSON.parse(v));
    return {
      id: r.id, nickname: r.nickname, trophies: r.trophies, best: r.best, wins: r.wins, losses: r.losses, character: r.character,
      deck: parse(r.deck, null), builds: parse(r.builds, null), ecto: r.ecto ?? 0, cosmetics: parse(r.cosmetics, []), equipped: parse(r.equipped, { frame: null }),
      avatar: parse(r.avatar, { ...DEFAULT_AVATAR }),
      cups: r.cups ?? 0, season: r.season ?? 0, seasonBest: r.season_best ?? 0, missions: parse(r.missions, null),
      createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  async create(nickname) {
    const token = newToken();
    const p = blankPlayer(nickname);
    p.nickname = await freeNickname(this, p.nickname);
    await this.pool.query(
      'INSERT INTO players (id, token_hash, nickname, trophies, best, wins, losses, character, nick_key) VALUES ($1,$2,$3,0,0,0,0,$4,$5)',
      [p.id, hashToken(token), p.nickname, p.character, nickKey(p.nickname)],
    );
    return { player: p, token };
  }

  async nicknameTaken(nickname, exceptId = null) {
    const { rows } = await this.pool.query('SELECT 1 FROM players WHERE nick_key = $1 AND id <> $2 LIMIT 1', [nickKey(nickname), exceptId ?? '']);
    return rows.length > 0;
  }

  async getByToken(token) {
    const hash = hashToken(token);
    const { rows } = await this.pool.query('SELECT * FROM players WHERE token_hash = $1', [hash]);
    if (rows[0]) return PgStore.row(rows[0]);
    const { rows: viaSession } = await this.pool.query(
      'SELECT p.* FROM sessions s JOIN players p ON p.id = s.player_id WHERE s.token_hash = $1', [hash]);
    return PgStore.row(viaSession[0]);
  }

  async getById(id) {
    const { rows } = await this.pool.query('SELECT * FROM players WHERE id = $1', [id]);
    return PgStore.row(rows[0]);
  }

  async save(p) {
    const json = (v) => (v == null ? null : JSON.stringify(v));
    await this.pool.query(
      `UPDATE players SET nickname=$2, trophies=$3, best=$4, wins=$5, losses=$6, character=$7,
        deck=$8, ecto=$9, cosmetics=$10, equipped=$11, cups=$12, season=$13, season_best=$14, missions=$15, avatar=$16, builds=$17, nick_key=$18, updated_at=NOW()
       WHERE id=$1`,
      [p.id, p.nickname, p.trophies, p.best, p.wins, p.losses, p.character,
        json(p.deck), p.ecto, json(p.cosmetics ?? []), json(p.equipped ?? { frame: null }), p.cups, p.season, p.seasonBest, json(p.missions),
        json(p.avatar), json(p.builds), nickKey(p.nickname)],
    );
  }

  async top(limit = 50) {
    const { rows } = await this.pool.query('SELECT * FROM players ORDER BY trophies DESC, wins DESC, created_at ASC LIMIT $1', [limit]);
    return rows.map(PgStore.row);
  }

  async rankOf(p) {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS ahead FROM players WHERE trophies > $1 OR (trophies = $1 AND wins > $2)',
      [p.trophies, p.wins],
    );
    return rows[0].ahead + 1;
  }

  async count() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS n FROM players');
    return rows[0].n;
  }

  async trimTrophies(threshold) {
    await this.pool.query(
      'UPDATE players SET trophies = $1::int + (trophies - $1::int) / 2, updated_at = NOW() WHERE trophies > $1::int',
      [threshold],
    );
  }

  async submitDaily(day, playerId, score, waves) {
    await this.pool.query(
      `INSERT INTO daily_scores (day, player_id, score, waves) VALUES ($1, $2, $3, $4)
       ON CONFLICT (day, player_id) DO UPDATE SET score = EXCLUDED.score, waves = EXCLUDED.waves, updated_at = NOW()
       WHERE daily_scores.score < EXCLUDED.score`,
      [day, playerId, score, waves],
    );
    const { rows } = await this.pool.query('SELECT score FROM daily_scores WHERE day = $1 AND player_id = $2', [day, playerId]);
    return rows[0].score;
  }

  async dailyTop(day, limit = 20) {
    const { rows } = await this.pool.query(
      `SELECT d.day, d.player_id, d.score, d.waves, d.updated_at, p.nickname, p.character
       FROM daily_scores d JOIN players p ON p.id = d.player_id
       WHERE d.day = $1 ORDER BY d.score DESC, d.updated_at ASC LIMIT $2`,
      [day, limit],
    );
    return rows.map(r => ({ day: r.day, playerId: r.player_id, score: r.score, waves: r.waves, nickname: r.nickname, character: r.character }));
  }

  async dailyRank(day, playerId) {
    const { rows } = await this.pool.query('SELECT score, updated_at FROM daily_scores WHERE day = $1 AND player_id = $2', [day, playerId]);
    const { rows: [{ total }] } = await this.pool.query('SELECT COUNT(*)::int AS total FROM daily_scores WHERE day = $1', [day]);
    if (!rows[0]) return { rank: null, total, score: null };
    const { rows: [{ ahead }] } = await this.pool.query(
      'SELECT COUNT(*)::int AS ahead FROM daily_scores WHERE day = $1 AND (score > $2 OR (score = $2 AND updated_at < $3))',
      [day, rows[0].score, rows[0].updated_at],
    );
    return { rank: ahead + 1, total, score: rows[0].score };
  }

  async findIdentity(provider, subject) {
    const { rows } = await this.pool.query(
      'SELECT p.* FROM identities i JOIN players p ON p.id = i.player_id WHERE i.provider = $1 AND i.subject = $2', [provider, subject]);
    return PgStore.row(rows[0]);
  }

  async linkIdentity(playerId, provider, subject) {
    await this.pool.query(
      'INSERT INTO identities (provider, subject, player_id) VALUES ($1, $2, $3) ON CONFLICT (provider, subject) DO NOTHING',
      [provider, subject, playerId]);
    // confere o dono em vez de contar linhas (DO NOTHING conta diferente em cada driver)
    const { rows } = await this.pool.query('SELECT player_id FROM identities WHERE provider = $1 AND subject = $2', [provider, subject]);
    return rows[0]?.player_id === playerId;
  }

  async identitiesOf(playerId) {
    const { rows } = await this.pool.query('SELECT provider FROM identities WHERE player_id = $1 ORDER BY provider', [playerId]);
    return rows.map(r => r.provider);
  }

  async createSession(playerId) {
    const token = newToken();
    await this.pool.query('INSERT INTO sessions (token_hash, player_id) VALUES ($1, $2)', [hashToken(token), playerId]);
    return token;
  }

  async deleteSession(token) {
    const { rowCount } = await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    return rowCount > 0;
  }

  async revokeGuestToken(playerId) {
    await this.pool.query('UPDATE players SET token_hash = $2 WHERE id = $1', [playerId, hashToken(newToken())]);
  }

  async listSaves(playerId) {
    const { rows } = await this.pool.query('SELECT slot, data, updated_at FROM campaign_saves WHERE player_id = $1 ORDER BY slot', [playerId]);
    return rows.map(r => ({ slot: r.slot, data: r.data == null ? null : JSON.parse(r.data), updatedAt: r.updated_at }));
  }

  async putSave(playerId, slot, data, updatedAt) {
    await this.pool.query(
      `INSERT INTO campaign_saves (player_id, slot, data, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (player_id, slot) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
       WHERE campaign_saves.updated_at < EXCLUDED.updated_at`,
      [playerId, slot, data == null ? null : JSON.stringify(data), updatedAt],
    );
    const { rows } = await this.pool.query('SELECT data, updated_at FROM campaign_saves WHERE player_id = $1 AND slot = $2', [playerId, slot]);
    return { slot, data: rows[0].data == null ? null : JSON.parse(rows[0].data), updatedAt: rows[0].updated_at };
  }

  async deletePlayer(playerId) {
    for (const table of ['identities', 'sessions', 'campaign_saves', 'daily_scores']) {
      await this.pool.query(`DELETE FROM ${table} WHERE player_id = $1`, [playerId]);
    }
    const { rowCount } = await this.pool.query('DELETE FROM players WHERE id = $1', [playerId]);
    return rowCount > 0;
  }

  async getMeta(key) {
    const { rows } = await this.pool.query('SELECT value FROM meta WHERE key = $1', [key]);
    return rows[0] ? JSON.parse(rows[0].value) : null;
  }

  async setMeta(key, value) {
    await this.pool.query(
      'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, JSON.stringify(value)],
    );
  }

  async close() { await this.pool.end(); }
}

async function createStore(env = process.env) {
  if (env.DATABASE_URL) {
    const { Pool } = require('pg');
    const ssl = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? false : { rejectUnauthorized: false };
    return new PgStore(new Pool({ connectionString: env.DATABASE_URL, ssl })).init();
  }
  return new JsonStore(env.DATA_FILE || path.join(__dirname, '..', 'data', 'players.json')).init();
}

module.exports = { createStore, JsonStore, PgStore, cleanNickname, nickKey, hashToken, blankPlayer };
