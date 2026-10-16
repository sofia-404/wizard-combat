import {COMBAT_RULES} from '../rules.js';

export function applyDisarm(target, effect, now) {
  if (!Number.isFinite(now) || now < 0 || now < (target.returnAt || 0) || now < (target.disarmProtectedUntil || 0)) return false;
  target.returnAt = now + effect.durationMs;
  target.disarmProtectedUntil = target.returnAt + COMBAT_RULES.disarmProtectionMs;
  return true;
}
