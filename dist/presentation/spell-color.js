import {spellForShape, spells} from '../spells/index.js';

// Keep the existing cyan fallback for missing or unknown shape labels.
export function spellColor(shape) {
  return (spellForShape(shape) || spells.protego).visuals.color;
}
