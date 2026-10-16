import {Shield} from './shield.js';
import {castDamage} from './cast.js';

export const SOLO_RULES = Object.freeze({readyMs:3000, actionMs:6000, warningMs:2000, flightMs:600, score:85});
const OPPONENT_PROFILES = Object.freeze({
  easy:Object.freeze({reactionMs:400, cooldownMs:9000, attackMs:5000, warningMs:2000}),
  normal:Object.freeze({reactionMs:200, cooldownMs:6000, attackMs:3000, warningMs:1500}),
  hard:Object.freeze({reactionMs:100, cooldownMs:4500, attackMs:2000, warningMs:1000})
});
const profileFor = difficulty => OPPONENT_PROFILES[Object.hasOwn(OPPONENT_PROFILES, difficulty) ? difficulty : 'normal'];

// Combat timing only. The view supplies camera, visibility, defeat, and disarm state.
export class SoloOpponent {
  constructor({attacksOnly = false} = {}) {
    this.attacksOnly = attacksOnly;
    this.shield = new Shield();
    this.reset();
  }

  reset() {
    this.stop();
    this.action = 0;
    this.shieldReadyAt = 0;
    this.shield.reset();
  }

  stop() {
    this.running = false;
    this.nextActionAt = 0;
    this.preparing = null;
    this.defending = null;
  }

  reactToAttack(now, {active, disarmed = false, difficulty = 'normal'}) {
    if (this.attacksOnly || !active || disarmed || this.defending || this.shield.active(now) || now < this.shieldReadyAt) return false;
    const profile = profileFor(difficulty);
    this.defending = {at:now + profile.reactionMs, impactAt:now + SOLO_RULES.flightMs, cooldownMs:profile.cooldownMs};
    return true;
  }

  update(now, {active, disarmed = false, difficulty = 'normal'}) {
    if (!active) { this.stop(); return null; }
    if (!this.running) {
      this.running = true;
      this.nextActionAt = now + SOLO_RULES.readyMs;
    }
    if (disarmed) {
      this.preparing = null;
      this.defending = null;
      this.nextActionAt = now + SOLO_RULES.readyMs;
      return null;
    }
    if (this.defending && now >= this.defending.at) {
      const inFlight = now < this.defending.impactAt;
      const cooldownMs = this.defending.cooldownMs;
      this.defending = null;
      if (inFlight) {
        this.shield.cast({type:'cast', accepted:true, shape:'Protego', score:100}, now);
        this.shieldReadyAt = now + cooldownMs;
        this.preparing = null;
        this.nextActionAt = this.shield.expiresAt;
        return {type:'shield', shape:'Protego'};
      }
    }
    if (this.shield.active(now)) return null;
    if (this.preparing) {
      if (now < this.preparing.releaseAt) return null;
      const event = {...this.preparing, type:'cast'};
      this.preparing = null;
      // A delayed frame must not cause a burst of overdue attacks.
      this.nextActionAt = now + event.attackMs - event.warningMs;
      return event;
    }
    if (now < this.nextActionAt) return null;
    this.action++;
    const profile = profileFor(difficulty);
    const attackMs = this.attacksOnly ? SOLO_RULES.actionMs : profile.attackMs;
    const warningMs = this.attacksOnly ? SOLO_RULES.warningMs : profile.warningMs;
    this.nextActionAt = now + attackMs;
    const shape = this.action % 2 === 1 ? 'Basic Cast' : 'Confringo';
    const damage = castDamage({type:'cast', accepted:true, shape, score:SOLO_RULES.score});
    this.preparing = {shape, damage, releaseAt:now + warningMs, attackMs, warningMs};
    return {...this.preparing, type:'prepare'};
  }
}
