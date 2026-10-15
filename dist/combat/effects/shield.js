export function applyShield(target, effect, now) {
  target.expiresAt = now + effect.durationMs;
  return true;
}
