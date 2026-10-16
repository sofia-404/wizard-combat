import {castDamage} from './combat/cast.js';
import {spellForShape, spells} from './spells/index.js';
import {Shield} from './combat/shield.js';

export const MAX_HEALTH = 200;

// Keep score-only callers and unknown labels working with the existing default damage.
export function damageForAccuracy(score, shape) {
  if (!Number.isFinite(score) || score < 0 || score > 100) return 0;
  const spell = spellForShape(shape) || spells['basic-cast'];
  return castDamage({type: 'cast', accepted: true, shape: spell.label, score});
}

export class PracticeArenaHealth {
  constructor({targetShield = null} = {}) {
    this.targetShield = targetShield;
    this.receivedHits = new Set();
    this.player = MAX_HEALTH;
    this.shield = new Shield();
    this.resetDummy();
  }

  get defeated() { return this.dummy === 0; }
  get playerDefeated() { return this.player === 0; }
  get over() { return this.defeated || this.playerDefeated; }

  protect(cast, now) {
    if (this.playerDefeated || !cast.id || this.seen.has(cast.id) || !Number.isFinite(cast.score) || cast.score < 0 || cast.score > 100) return false;
    if (!this.shield.cast({...cast, type: 'cast', accepted: true}, now)) return false;
    this.seen.add(cast.id);
    return true;
  }

  takeDamage(amount, now) {
    const damage = Math.min(this.player, this.shield.damage(amount, now));
    this.player -= damage;
    return damage;
  }

  receiveHit(hit, now) {
    if (this.playerDefeated || !hit || typeof hit.id !== 'string' || !hit.id.trim() || this.receivedHits.has(hit.id)
      || !Number.isFinite(hit.damage) || hit.damage <= 0 || !Number.isFinite(now) || now < 0) return null;
    this.receivedHits.add(hit.id);
    const blocked = this.shield.active(now);
    const damage = this.takeDamage(hit.damage, now);
    if (this.playerDefeated) this.cancelFlights();
    return {damage, health: this.player, blocked};
  }

  resetPlayer() {
    this.player = MAX_HEALTH;
    this.shield.reset();
  }

  resetDummy() {
    this.targetShield?.reset();
    this.shield.reset();
    this.resetTarget();
  }

  resetTarget() {
    this.dummy = MAX_HEALTH;
    this.hits = 0;
    this.pending = new Map();
    this.seen = new Set();
  }

  launch(cast) {
    const damage = damageForAccuracy(cast.score, cast.shape);
    if (this.over || !damage || !cast.id || this.seen.has(cast.id)) return null;
    const shot = Object.freeze({...cast, damage});
    this.seen.add(shot.id);
    this.pending.set(shot.id, shot);
    return shot;
  }

  hit(shot, now) {
    // Object identity also rejects callbacks from before a reset.
    if (this.over || this.pending.get(shot.id) !== shot) return null;
    this.pending.delete(shot.id);
    if (this.targetShield?.active(now)) return {damage:0, health:this.dummy, defeated:false, blocked:true};
    const damage = Math.min(this.dummy, shot.damage);
    this.dummy -= damage;
    this.hits++;
    if (this.defeated) this.cancelFlights();
    return {damage, health: this.dummy, defeated: this.defeated};
  }

  cancelFlights() { this.pending.clear(); }
}
