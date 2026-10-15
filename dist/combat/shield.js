import {applyCast} from './cast.js';

export class Shield {
  constructor() { this.reset(); }
  reset() { this.expiresAt = 0; }
  active(now) { return Number.isFinite(now) && now >= 0 && now < this.expiresAt; }
  cast(event, now) {
    if (!Number.isFinite(now) || now < 0) return false;
    return applyCast(event, this, now, 'self');
  }
  damage(amount, now) {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(amount) || amount < 0 || this.active(now)) return 0;
    return amount;
  }
}
