export function applyDisarm(target, effect, now) {
  target.returnAt = now + effect.durationMs;
  return true;
}
