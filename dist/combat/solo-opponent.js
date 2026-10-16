import {Shield} from './shield.js';
import {castDamage} from './cast.js';

export const SOLO_RULES = Object.freeze({readyMs:3000, actionMs:6000, warningMs:2000, flightMs:600, score:85});

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
    this.shield.reset();
  }

  stop() {
    this.running = false;
    this.nextActionAt = 0;
    this.preparing = null;
  }

  update(now, {active, disarmed = false}) {
    if (!active) { this.stop(); return null; }
    if (!this.running) {
      this.running = true;
      this.nextActionAt = now + SOLO_RULES.readyMs;
    }
    if (disarmed) {
      this.preparing = null;
      this.nextActionAt = now + SOLO_RULES.readyMs;
      return null;
    }
    if (this.preparing) {
      if (now < this.preparing.releaseAt) return null;
      const event = {...this.preparing, type:'cast'};
      this.preparing = null;
      // A delayed frame must not cause a burst of overdue attacks.
      this.nextActionAt = now + SOLO_RULES.actionMs - SOLO_RULES.warningMs;
      return event;
    }
    if (now < this.nextActionAt) return null;
    this.action++;
    this.nextActionAt = now + SOLO_RULES.actionMs;
    if (!this.attacksOnly && this.action % 3 === 0) {
      this.shield.cast({type:'cast', accepted:true, shape:'Protego', score:100}, now);
      return {type:'shield', shape:'Protego'};
    }
    const shape = (this.attacksOnly ? this.action % 2 : this.action % 3) === 1 ? 'Basic Cast' : 'Confringo';
    const damage = castDamage({type:'cast', accepted:true, shape, score:SOLO_RULES.score});
    this.preparing = {shape, damage, releaseAt:now + SOLO_RULES.warningMs};
    return {...this.preparing, type:'prepare'};
  }
}
