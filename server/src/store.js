'use strict';
// Persistência dos jogadores (contas anônimas, troféus, ranking).
//   DATABASE_URL definida -> Postgres (Railway)
//   senão                 -> arquivo JSON (DATA_FILE, padrão ./data/players.json)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const newId = () => crypto.randomBytes(8).toString('hex');
const newToken = () => crypto.randomBytes(24).toString('hex');

function cleanNickname(raw) {
  const nick = String(raw || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return nick.length >= 2 ? nick : `Caçador${Math.floor(1000 + Math.random() * 9000)}`;
}

function blankPlayer(nickname) {
  const now = new Date().toISOString();
  return { id: newId(), nickname: cleanNickname(nickname), trophies: 0, best: 0, wins: 0, losses: 0, character: 'cacador', createdAt: now, updatedAt: now };
}

// ═══════════════════════ JSON ═══════════════════════
class JsonStore {
  constructor(file) {
    this.file = file;
    this.players = new Map();   // id -> player (com tokenHash)
    this.byToken = new Map();   // tokenHash -> id
    this.timer = null;
  }

  async init() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const p of data.players || []) { this.players.set(p.id, p); this.byToken.set(p.tokenHash, p.id); }
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
    fs.writeFileSync(tmp, JSON.stringify({ players: [...this.players.values()] }));
    fs.renameSync(tmp, this.file);
  }

  async create(nickname) {
    const token = newToken();
    const p = { ...blankPlayer(nickname), tokenHash: hashToken(token) };
    this.players.set(p.id, p);
    this.byToken.set(p.tokenHash, p.id);
    this.#persist();
    return { player: strip(p), token };
  }

  async getByToken(token) {
    const id = this.byToken.get(hashToken(token));
    return id ? strip(this.players.get(id)) : null;
  }

  async save(player) {
    const cur = this.players.get(player.id);
    if (!cur) return;
    Object.assign(cur, pick(player), { updatedAt: new Date().toISOString() });
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
    await this.pool.query('CREATE INDEX IF NOT EXISTS players_rank ON players (trophies DESC, wins DESC)');
    return this;
  }

  static row(r) {
    return r && {
      id: r.id, nickname: r.nickname, trophies: r.trophies, best: r.best, wins: r.wins, losses: r.losses,
      character: r.character, createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  async create(nickname) {
    const token = newToken();
    const p = blankPlayer(nickname);
    await this.pool.query(
      'INSERT INTO players (id, token_hash, nickname, trophies, best, wins, losses, character) VALUES ($1,$2,$3,0,0,0,0,$4)',
      [p.id, hashToken(token), p.nickname, p.character],
    );
    return { player: p, token };
  }

  async getByToken(token) {
    const { rows } = await this.pool.query('SELECT * FROM players WHERE token_hash = $1', [hashToken(token)]);
    return PgStore.row(rows[0]) || null;
  }

  async save(p) {
    await this.pool.query(
      'UPDATE players SET nickname=$2, trophies=$3, best=$4, wins=$5, losses=$6, character=$7, updated_at=NOW() WHERE id=$1',
      [p.id, p.nickname, p.trophies, p.best, p.wins, p.losses, p.character],
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

  async close() { await this.pool.end(); }
}

const FIELDS = ['id', 'nickname', 'trophies', 'best', 'wins', 'losses', 'character', 'createdAt', 'updatedAt'];
function pick(p) { const o = {}; for (const k of FIELDS) if (p[k] !== undefined) o[k] = p[k]; delete o.id; delete o.createdAt; return o; }
function strip(p) { const o = {}; for (const k of FIELDS) o[k] = p[k]; return o; }
function rankOrder(a, b) {
  return b.trophies - a.trophies || b.wins - a.wins || String(a.createdAt).localeCompare(String(b.createdAt));
}

async function createStore(env = process.env) {
  if (env.DATABASE_URL) {
    const { Pool } = require('pg');
    const ssl = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? false : { rejectUnauthorized: false };
    return new PgStore(new Pool({ connectionString: env.DATABASE_URL, ssl })).init();
  }
  return new JsonStore(env.DATA_FILE || path.join(__dirname, '..', 'data', 'players.json')).init();
}

module.exports = { createStore, JsonStore, PgStore, cleanNickname, hashToken };
