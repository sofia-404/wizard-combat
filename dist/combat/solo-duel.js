import {Shield} from './shield.js';

import {COMBAT_RULES, COMBAT_SPELLS, difficultyProfile, spellRule as ruleFor} from './rules.js';
import {applyDisarm} from './effects/disarm.js';

// Compatibility names; these rules now apply in every mode.
export const DUEL_SPELLS = COMBAT_SPELLS;
export const DUEL_RULES = COMBAT_RULES;
export function duelDamage(score, shape) {
  return Number.isFinite(score) && score >= 0 && score <= 100 ? ruleFor(shape)?.damage || 0 : 0;
}

// Call only after health accepts the impact, so duplicate or cancelled shots have no effects.
export function applyDuelImpact(defender, attacker, cast, hit, now) {
  if (!hit) return {perfect:false, disarmed:false};
  const perfect = hit.blocked && defender.shield.block(now);
  if (perfect) attacker.punish(now);
  const disarmed = !hit.blocked && hit.damage > 0 && cast.shape === 'Expelliarmus' && defender.disarm(now);
  return {perfect:!!perfect, disarmed:!!disarmed};
}

export class DuelFighter {
  constructor() {
    this.shield = new Shield();
    this.reset();
  }
  reset() {
    this.shield.reset();
    this.recoveryUntil = 0;
    this.returnAt = 0;
    this.disarmProtectedUntil = 0;
    this.queued = null;
    this.seen = new Set();
  }
  get shieldReadyAt() { return this.shield.readyAt; }
  get disarmed() { return this.returnAt > 0; }
  restore(now) {
    if (!this.disarmed || now < this.returnAt) return false;
    this.returnAt = 0;
    return true;
  }
  cancelPending() { this.queued = null; }
  disarm(now) {
    this.restore(now);
    if (!applyDisarm(this, {durationMs:COMBAT_RULES.disarmMs}, now)) return false;
    this.cancelPending();
    return true;
  }
  punish(now) {
    this.recoveryUntil = Math.max(this.recoveryUntil, now + DUEL_RULES.counterMs);
    this.cancelPending();
  }
  submit(cast, now) {
    const rule = ruleFor(cast?.shape);
    if (!rule || typeof cast.id !== 'string' || !cast.id.trim() || this.seen.has(cast.id)
      || !Number.isFinite(cast.score) || cast.score < 0 || cast.score > 100
      || !Number.isFinite(now) || now < 0) return {type:'rejected', reason:'Invalid or repeated cast'};
    this.restore(now);
    if (this.disarmed) return {type:'rejected', reason:'Disarmed. Wait for the wand.'};
    if (cast.shape === 'Protego' && now < this.shieldReadyAt) {
      return {type:'rejected', reason:`Protego ready in ${((this.shieldReadyAt-now)/1000).toFixed(1)} s`};
    }
    const replaced = this.queued && cast.shape === 'Protego' && this.queued.shape !== 'Protego' ? this.queued.id : null;
    if (this.queued && !replaced) return {type:'rejected', reason:'One spell is already ready.'};
    this.seen.add(cast.id);
    if (now < this.recoveryUntil) {
      this.queued = {...cast};
      return {type:'queued', shape:cast.shape, replaced};
    }
    this.queued = null;
    return this.release(cast, now);
  }
  release(cast, now) {
    const rule = ruleFor(cast.shape);
    this.recoveryUntil = Math.max(this.recoveryUntil, now + rule.recoveryMs);
    if (cast.shape === 'Protego') {
      this.shield.cast({...cast, type:'cast', accepted:true}, now);
    }
    return {...cast, ...rule, type:cast.shape === 'Protego' ? 'shield' : 'cast', launchedAt:now};
  }
  update(now) {
    this.restore(now);
    if (this.disarmed || !this.queued || now < this.recoveryUntil) return null;
    const cast = this.queued;
    this.queued = null;
    return this.release(cast, now);
  }
}

// The same opponent drives Solo Duel and the attacks-only Protego lesson.
export class DuelOpponent extends DuelFighter {
  constructor({attacksOnly = false, random = Math.random} = {}) {
    super();
    this.attacksOnly = attacksOnly;
    this.random = random;
    // Reactive shields are not timed parries, on any difficulty.
    this.shield.allowPerfect = false;
  }
  reset() {
    super.reset();
    this.action = 0;
    this.threats = new Set();
    this.stop();
  }
  cancelPending() {
    super.cancelPending();
    this.preparing = null;
    this.defending = null;
  }
  stop() {
    this.running = false;
    this.nextActionAt = 0;
    this.nextAttackAt = 0;
    this.cancelPending();
  }
  reactToAttack(now, {active, difficulty = 'normal', flightMs = COMBAT_SPELLS['Basic Cast'].flightMs, id} = {}) {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(flightMs) || flightMs <= 0) return false;
    if (id && this.threats.has(id)) return false;
    if (id) this.threats.add(id);
    this.restore(now);
    if (this.attacksOnly || !active || this.disarmed || now < this.recoveryUntil || this.defending
      || this.shield.active(now) || now < this.shieldReadyAt) return false;
    const profile = difficultyProfile(difficulty);
    if (this.random() >= profile.shieldChance) return false;
    this.defending = {shape:'Protego', noticeAt:now + profile.noticeMs,
      releaseAt:now + profile.noticeMs + profile.shieldPrepareMs,
      warningMs:profile.shieldPrepareMs, impactAt:now + flightMs, noticed:false};
    return true;
  }
  update(now, {active, difficulty = 'normal', disarmed = false} = {}) {
    if (!active) { this.stop(); return null; }
    this.restore(now);
    if (!this.running) {
      this.running = true;
      this.nextActionAt = now + COMBAT_RULES.readyMs;
    }
    if (disarmed) { this.cancelPending(); this.nextActionAt = now + COMBAT_RULES.readyMs; return null; }
    if (this.disarmed || now < this.recoveryUntil) return null;
    if (this.defending) {
      const defense = this.defending;
      if (now >= defense.impactAt) this.defending = null;
      else {
        if (now < defense.noticeAt) return null;
        this.preparing = null;
        if (now >= defense.releaseAt) {
          this.defending = null;
          const event = this.release({shape:'Protego', score:100}, now);
          this.nextActionAt = this.shield.expiresAt;
          return event;
        }
        if (!defense.noticed) { defense.noticed = true; return {...defense, type:'prepare-shield'}; }
        return null;
      }
    }
    if (this.shield.active(now)) return null;
    if (this.preparing) {
      if (now < this.preparing.releaseAt) return null;
      const preparation = this.preparing;
      const event = this.release(preparation, now);
      this.preparing = null;
      // Anchor to the actual release. A late frame never causes catch-up attacks.
      this.nextAttackAt = now + preparation.attackGapMs;
      this.nextActionAt = this.recoveryUntil;
      return event;
    }
    const profile = difficultyProfile(difficulty);
    const shape = this.action % 2 ? 'Confringo' : 'Basic Cast';
    const warningMs = profile.warnings[shape];
    if (now < Math.max(this.nextActionAt, this.nextAttackAt - warningMs)) return null;
    this.action++;
    this.preparing = {shape, ...ruleFor(shape), score:85, warningMs,
      attackGapMs:profile.attackGapMs, releaseAt:now + warningMs};
    return {...this.preparing, type:'prepare'};
  }
}
