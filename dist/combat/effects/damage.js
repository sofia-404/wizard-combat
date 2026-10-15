// Keep the current score boundaries, including the lowest tier fallback.
export function damageValue(effect, score) {
  return (effect.tiers.find(tier => score >= tier.minScore) || effect.tiers.at(-1)).value;
}
