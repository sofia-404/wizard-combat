import circle from './circle/definition.js';
import v from './v/definition.js';
import z from './z/definition.js';
import expelliarmus from './expelliarmus/definition.js';
import {validateDefinitions} from './validate.js';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const definitions = [circle, v, z, expelliarmus];
validateDefinitions(definitions);
export const spellList = freeze(definitions);
export const spells = freeze(Object.fromEntries(spellList.map(spell => [spell.id, spell])));
const byShape = Object.freeze(Object.fromEntries(spellList.map(spell => [spell.label, spell])));

// Preserve the existing event/log labels at the boundary. IDs are used internally.
export function spellForShape(shape) {
  return Object.hasOwn(byShape, shape) ? byShape[shape] : undefined;
}
// The existing lesson screen teaches this spell. Registration order must not change it.
export const defaultLessonSpell = spells.expelliarmus;
