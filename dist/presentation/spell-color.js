import {spellForShape, spells} from '../spells/index.js';

// Keep the existing Circle fallback for missing or unknown shape labels.
export function spellColor(shape) {
  return (spellForShape(shape) || spells.circle).visuals.color;
}
