'use strict';
// Partida do Chefe Cooperativo (regras em src/raid.js).
// Cada rodada: o chefe decide o golpe contra cada caçador, cada um escolhe a arma, resultado.
const raidRules = require('../raid');
const { leagueOf, WEAPONS, BEATS } = require('../catalog');
const { MOVE_WEAPON } = require('../bots');
const { Match } = require('./Match');

const START_DELAY_MS = 2600;
const counterOf = (weapon) => Object.keys(BEATS).find(w => BEATS[w] === weapon);

class RaidMatch extends Match {
  /**
   * @param {object} o  tudo de Match, mais:
   * @param {string} o.bossId
   * @param {string} o.stage
   * @param {object} o.shared  regras compartilhadas (src/shared.js)
   * @param {() => number} o.rng
   */
  constructor(o) {
    super(o);
    this.stage = o.stage;
    this.rng = o.rng;
    this.raid = raidRules.createRaid(this.seats.map(s => s.player), o.bossId, o.shared, this.rng);
    this.endsAt = 0;
    this.phaseTimers = [];
  }

  start() {
    this.seats.forEach((_, i) => this.send(i, 'match_start', this.view(i)));
    this.toSpectators('match_start', this.view(null));
    this.later(START_DELAY_MS, () => this.#round());
  }

  #round() {
    const raid = raidRules.startRaidRound(this.raid);
    this.endsAt = this.now() + raidRules.RAID.weaponMs;
    for (const t of this.phaseTimers) this.cancel(t);
    this.phaseTimers = [this.later(raidRules.RAID.weaponMs, () => this.#resolve())];
    this.seats.forEach((s, i) => {
      const h = raid.hunters[i];
      this.send(i, 'raid_phase', { round: raid.round, endsIn: raidRules.RAID.weaponMs, tell: h.tell, alive: h.hp > 0 });
      if (s.player.isBot && h.hp > 0) {
        const [min, max] = this.rules.botThinkMs;
        this.phaseTimers.push(this.later(min + Math.floor(this.rng() * (max - min)), () => this.pickWeapon(i, this.#botWeapon(h))));
      }
    });
    this.toSpectators('raid_phase', { round: raid.round, endsIn: raidRules.RAID.weaponMs, tell: null, alive: false });
  }

  /** Parceiro bot: confia nas pistas do chefe metade das vezes; senão joga no escuro. */
  #botWeapon(h) {
    if (h.tell && this.rng() < 0.5) return counterOf(MOVE_WEAPON[h.tell]);
    return WEAPONS[Math.floor(this.rng() * WEAPONS.length)];
  }

  pickWeapon(i, weapon) {
    if (!raidRules.pickRaidWeapon(this.raid, i, weapon)) return;
    this.send(i, 'weapon_locked', { weapon });
    this.toAll('seat_ready', { seat: i, phase: 'weapon' });
    if (raidRules.allLocked(this.raid)) this.#resolve();
  }

  #resolve() {
    if (this.raid.phase !== 'weapon') return;
    for (const t of this.phaseTimers) this.cancel(t);
    this.phaseTimers = [];
    const r = raidRules.resolveRaid(this.raid);
    this.toAll('raid_result', r);
    if (r.over) this.later(raidRules.RAID.revealMs, () => this.finish({ won: r.won, reason: r.won ? 'chefe derrotado' : 'caçadores caíram' }));
    else this.later(raidRules.RAID.revealMs, () => this.#round());
  }

  pickCard() { /* o chefe cooperativo não usa cartas */ }

  /** Desistir ou cair: o caçador sai da luta (a vida dele zera); o parceiro continua. */
  forfeit(i) { this.#leave(i); }
  abandon(i) { this.#leave(i); }

  #leave(i) {
    const h = this.raid.hunters[i];
    h.hp = 0;
    h.locked = true;
    this.toAll('seat_status', { seat: i, connected: false, out: true });
    // sem nenhum humano de pé, a luta acaba (um bot sozinho não joga para ninguém)
    const humansUp = this.seats.some((s, k) => !s.player.isBot && this.raid.hunters[k].hp > 0);
    if (!humansUp) this.finish({ won: false, reason: 'caçadores caíram' });
    else if (raidRules.allLocked(this.raid)) this.#resolve();
  }

  view(i) {
    const { boss, hunters, round, phase } = this.raid;
    const me = i == null ? null : hunters[i];
    return {
      matchId: this.id, kind: this.kind, stage: this.stage, you: i,
      boss: { id: boss.id, name: boss.def.name, sprite: boss.def.sprite, hp: boss.hp, maxHp: boss.maxHp, phase: boss.phase, phases: boss.def.phases?.length ?? 0 },
      hunters: hunters.map((h, k) => ({
        seat: k, id: h.id, nickname: h.nickname, character: h.character, hp: h.hp, maxHp: h.maxHp,
        league: leagueOf(this.seats[k].player.trophies ?? 0), frame: this.seats[k].player.equipped?.frame ?? null, isBot: !!this.seats[k].player.isBot,
      })),
      round, phase,
      endsIn: Math.max(0, this.endsAt - this.now()),
      tell: me && phase === 'weapon' ? me.tell : null,
      locked: !!me?.locked,
      spectators: this.spectators.size,
      history: hunters.map(h => h.history),
    };
  }
}

module.exports = { RaidMatch };
