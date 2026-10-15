import {spellForShape} from '../spells/index.js';
import {effects} from './effects/index.js';

export function castDamage(event) {
  const spell = spellForShape(event.shape);
  if (event.type !== 'cast' || !event.accepted || !spell) return 0;
  return spell.effects.reduce((total, effect) => total + (effects[effect.type].value?.(effect, event.score) || 0), 0);
}

export function applyCast(event, target, now, recipient = 'target') {
  const spell = spellForShape(event.shape);
  if (event.type !== 'cast' || !event.accepted || !spell) return false;
  let changed = false;
  for (const effect of spell.effects) {
    if ((effect.target || 'target') !== recipient) continue;
    if (effects[effect.type].apply?.(target, effect, now)) changed = true;
  }
  return changed;
}
