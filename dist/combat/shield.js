import {COMBAT_RULES} from './rules.js';
import {applyShield} from './effects/shield.js';

export class Shield {
  constructor() { this.allowPerfect = true; this.reset(); }
  reset() { this.expiresAt = 0; this.readyAt = 0; this.startedAt = null; this.blockedOnce = false; }
  active(now) { return Number.isFinite(now) && now >= 0 && now < this.expiresAt; }
  cast(event, now) {
    if (!Number.isFinite(now) || now < 0 || now < this.readyAt || event.type !== 'cast'
      || !event.accepted || event.shape !== 'Protego') return false;
    return applyShield(this, {durationMs:COMBAT_RULES.shieldMs}, now);
  }
  block(now) {
    if (!this.active(now)) return false;
    const perfect = this.allowPerfect && !this.blockedOnce && now - this.startedAt <= COMBAT_RULES.perfectMs;
    this.blockedOnce = true;
    return perfect;
  }
  damage(amount, now) {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(amount) || amount < 0 || this.active(now)) return 0;
    return amount;
  }
}
