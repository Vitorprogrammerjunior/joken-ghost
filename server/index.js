'use strict';

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const {
  ROUNDS_TO_WIN,
  generateRoomCode,
  pickRandomPerks,
  resolveRound,
  defaultAttack,
  defaultPerk,
} = require('./gameLogic');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const PERK_PHASE_MS = 12000;
const ATTACK_PHASE_MS = 8000;
const REVEAL_MS = 3500;
const BETWEEN_ROUNDS_MS = 1500;

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'jokenghost-multiplayer', version: '1.0.0' });
});
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, methods: ['GET', 'POST'] },
});

/** @type {Map<string, object>} */
const rooms = new Map();
/** @type {Map<string, string>} socketId -> roomCode */
const socketRoom = new Map();

function normalizeCode(code) {
  const c = (code || '').toUpperCase().trim().replace(/\s/g, '');
  if (c.startsWith('JGH-')) return c;
  if (c.length === 4) return `JGH-${c}`;
  return c;
}

function getPlayer(room, socketId) {
  return room.players.find(p => p.id === socketId) || null;
}

function getOpponent(room, socketId) {
  return room.players.find(p => p.id !== socketId) || null;
}

function publicRoomState(room) {
  return {
    code: room.code,
    state: room.state,
    round: room.round,
    roundsToWin: ROUNDS_TO_WIN,
    scores: {
      hunter: room.players.find(p => p.role === 'hunter')?.score || 0,
      monster: room.players.find(p => p.role === 'monster')?.score || 0,
    },
    players: room.players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      role: p.role,
      score: p.score,
      connected: p.connected,
    })),
  };
}

function emitRoom(room, event, payload) {
  io.to(room.code).emit(event, payload);
}

function clearRoomTimers(room) {
  if (room.timers) {
    for (const t of Object.values(room.timers)) clearTimeout(t);
  }
  room.timers = {};
}

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  clearRoomTimers(room);
  rooms.delete(code);
}

function leaveRoom(socketId) {
  const code = socketRoom.get(socketId);
  if (!code) return;
  const room = rooms.get(code);
  if (!room) {
    socketRoom.delete(socketId);
    return;
  }

  const player = getPlayer(room, socketId);
  if (player) player.connected = false;

  socketRoom.delete(socketId);

  const stillConnected = room.players.filter(p => p.connected);
  if (stillConnected.length === 0) {
    cleanupRoom(code);
    return;
  }

  emitRoom(room, 'player_left', {
    nickname: player?.nickname,
    room: publicRoomState(room),
  });

  if (room.state !== 'waiting' && room.state !== 'finished') {
    room.state = 'finished';
    clearRoomTimers(room);
    const winner = stillConnected[0];
    emitRoom(room, 'match_end', {
      winner: winner.role,
      winnerNickname: winner.nickname,
      reason: 'opponent_left',
      scores: publicRoomState(room).scores,
    });
  }
}

function startPerkPhase(room) {
  room.state = 'perk_select';
  room.offeredPerks = pickRandomPerks(3);
  room.phaseEndsAt = Date.now() + PERK_PHASE_MS;

  for (const p of room.players) {
    p.perk = null;
    p.attack = null;
    p.perkLocked = false;
    p.attackLocked = false;
  }

  emitRoom(room, 'perk_phase', {
    round: room.round,
    perks: room.offeredPerks,
    timerMs: PERK_PHASE_MS,
    room: publicRoomState(room),
  });

  clearRoomTimers(room);
  room.timers.perk = setTimeout(() => {
    for (const p of room.players) {
      if (!p.perk) p.perk = defaultPerk(room.offeredPerks);
      p.perkLocked = true;
    }
    startAttackPhase(room);
  }, PERK_PHASE_MS);
}

function startAttackPhase(room) {
  room.state = 'attack_select';
  room.phaseEndsAt = Date.now() + ATTACK_PHASE_MS;

  emitRoom(room, 'attack_phase', {
    round: room.round,
    timerMs: ATTACK_PHASE_MS,
    room: publicRoomState(room),
  });

  room.timers.attack = setTimeout(() => {
    for (const p of room.players) {
      if (!p.attack) p.attack = defaultAttack();
      p.attackLocked = true;
    }
    resolveAndBroadcast(room);
  }, ATTACK_PHASE_MS);
}

function maybeStartAttackPhase(room) {
  if (room.players.every(p => p.perkLocked)) startAttackPhase(room);
}

function resolveAndBroadcast(room) {
  const hunter = room.players.find(p => p.role === 'hunter');
  const monster = room.players.find(p => p.role === 'monster');
  if (!hunter || !monster) return;

  if (!hunter.attack) hunter.attack = defaultAttack();
  if (!monster.attack) monster.attack = defaultAttack();
  if (!hunter.perk) hunter.perk = defaultPerk(room.offeredPerks);
  if (!monster.perk) monster.perk = defaultPerk(room.offeredPerks);

  const result = resolveRound(
    hunter.attack,
    monster.attack,
    hunter.perk,
    monster.perk,
  );

  hunter.score += result.hunterPoints;
  monster.score += result.monsterPoints;

  room.state = 'reveal';

  emitRoom(room, 'round_result', {
    round: room.round,
    result,
    scores: { hunter: hunter.score, monster: monster.score },
    roundsToWin: ROUNDS_TO_WIN,
  });

  const hunterWins = hunter.score >= ROUNDS_TO_WIN;
  const monsterWins = monster.score >= ROUNDS_TO_WIN;

  if (hunterWins || monsterWins) {
    room.state = 'finished';
    room.timers.end = setTimeout(() => {
      emitRoom(room, 'match_end', {
        winner: hunterWins ? 'hunter' : 'monster',
        winnerNickname: hunterWins ? hunter.nickname : monster.nickname,
        reason: 'normal',
        scores: { hunter: hunter.score, monster: monster.score },
      });
    }, REVEAL_MS);
    return;
  }

  room.timers.next = setTimeout(() => {
    room.round += 1;
    startPerkPhase(room);
  }, REVEAL_MS + BETWEEN_ROUNDS_MS);
}

function startMatch(room) {
  room.state = 'playing';
  room.round = 1;
  for (const p of room.players) {
    p.score = 0;
    p.perk = null;
    p.attack = null;
    p.perkLocked = false;
    p.attackLocked = false;
  }

  emitRoom(room, 'match_start', {
    room: publicRoomState(room),
    roundsToWin: ROUNDS_TO_WIN,
  });

  setTimeout(() => startPerkPhase(room), 1200);
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ nickname } = {}) => {
    leaveRoom(socket.id);

    const nick = (nickname || 'Cacador').slice(0, 16);
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode();

    const room = {
      code,
      state: 'waiting',
      round: 0,
      offeredPerks: [],
      players: [{
        id: socket.id,
        nickname: nick,
        role: 'hunter',
        score: 0,
        perk: null,
        attack: null,
        perkLocked: false,
        attackLocked: false,
        connected: true,
      }],
      timers: {},
    };

    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.join(code);

    socket.emit('room_created', {
      code,
      role: 'hunter',
      room: publicRoomState(room),
    });
  });

  socket.on('join_room', ({ code, nickname } = {}) => {
    leaveRoom(socket.id);

    const normalized = normalizeCode(code);
    const room = rooms.get(normalized);
    if (!room) {
      socket.emit('error_msg', { message: 'Sala nao encontrada.' });
      return;
    }
    if (room.state !== 'waiting') {
      socket.emit('error_msg', { message: 'Partida ja em andamento.' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error_msg', { message: 'Sala cheia.' });
      return;
    }

    const nick = (nickname || 'Monstro').slice(0, 16);
    room.players.push({
      id: socket.id,
      nickname: nick,
      role: 'monster',
      score: 0,
      perk: null,
      attack: null,
      perkLocked: false,
      attackLocked: false,
      connected: true,
    });

    socketRoom.set(socket.id, normalized);
    socket.join(normalized);

    socket.emit('room_joined', {
      code: normalized,
      role: 'monster',
      room: publicRoomState(room),
    });

    emitRoom(room, 'player_joined', { room: publicRoomState(room) });
    startMatch(room);
  });

  socket.on('pick_perk', ({ perkId } = {}) => {
    const code = socketRoom.get(socket.id);
    const room = code && rooms.get(code);
    if (!room || room.state !== 'perk_select') return;

    const player = getPlayer(room, socket.id);
    if (!player || player.perkLocked) return;

    const valid = room.offeredPerks.some(p => p.id === perkId);
    if (!valid) return;

    player.perk = perkId;
    player.perkLocked = true;

    const opponent = getOpponent(room, socket.id);
    socket.emit('perk_confirmed', { perkId });

    if (opponent?.connected) {
      socket.to(room.code).emit('opponent_perk_locked');
    }

    maybeStartAttackPhase(room);
  });

  socket.on('pick_attack', ({ choice } = {}) => {
    const code = socketRoom.get(socket.id);
    const room = code && rooms.get(code);
    if (!room || room.state !== 'attack_select') return;

    const player = getPlayer(room, socket.id);
    if (!player || player.attackLocked) return;
    if (!['pedra', 'papel', 'tesoura'].includes(choice)) return;

    player.attack = choice;
    player.attackLocked = true;

    socket.emit('attack_confirmed', { choice });

    const opponent = getOpponent(room, socket.id);
    if (opponent?.connected) {
      socket.to(room.code).emit('opponent_attack_locked', { locked: true });
    }

    if (room.players.every(p => p.attackLocked)) {
      clearTimeout(room.timers.attack);
      resolveAndBroadcast(room);
    }
  });

  socket.on('leave_room', () => leaveRoom(socket.id));

  socket.on('disconnect', () => leaveRoom(socket.id));
});

server.listen(PORT, () => {
  console.log(`JokenGhost multiplayer server on port ${PORT}`);
});
