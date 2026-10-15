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

export class DuelHealth {
  constructor() {
    this.player = MAX_HEALTH; // The static dummy does not attack.
    this.shield = new Shield();
    this.resetDummy();
  }

  get defeated() { return this.dummy === 0; }

  protect(cast, now) {
    if (!cast.id || this.seen.has(cast.id) || !Number.isFinite(cast.score) || cast.score < 0 || cast.score > 100) return false;
    if (!this.shield.cast({...cast, type: 'cast', accepted: true}, now)) return false;
    this.seen.add(cast.id);
    return true;
  }

  takeDamage(amount, now) {
    const damage = Math.min(this.player, this.shield.damage(amount, now));
    this.player -= damage;
    return damage;
  }

  resetDummy() {
    this.shield.reset();
    this.dummy = MAX_HEALTH;
    this.hits = 0;
    this.pending = new Map();
    this.seen = new Set();
  }

  launch(cast) {
    const damage = damageForAccuracy(cast.score, cast.shape);
    if (this.defeated || !damage || !cast.id || this.seen.has(cast.id)) return null;
    const shot = Object.freeze({...cast, damage});
    this.seen.add(shot.id);
    this.pending.set(shot.id, shot);
    return shot;
  }

  hit(shot) {
    // Object identity also rejects callbacks from before a reset.
    if (this.defeated || this.pending.get(shot.id) !== shot) return null;
    this.pending.delete(shot.id);
    const damage = Math.min(this.dummy, shot.damage);
    this.dummy -= damage;
    this.hits++;
    if (this.defeated) this.cancelFlights();
    return {damage, health: this.dummy, defeated: this.defeated};
  }

  cancelFlights() { this.pending.clear(); }
}
