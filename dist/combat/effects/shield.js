import {COMBAT_RULES} from '../rules.js';

export function applyShield(target, effect, now) {
  if (!Number.isFinite(now) || now < 0 || now < (target.readyAt || 0)) return false;
  target.startedAt = now;
  target.expiresAt = now + effect.durationMs;
  target.readyAt = now + COMBAT_RULES.shieldCooldownMs;
  target.blockedOnce = false;
  return true;
}
