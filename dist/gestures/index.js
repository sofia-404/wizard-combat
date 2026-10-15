import {spellList} from '../spells/index.js';
import {checkers} from './checkers.js';

export function matchGestures(points, sample, b, diagnostics) {
  const context = {points, sample, b, diagnostics};
  return spellList.map(spell => ({spell, fit: checkers[spell.gesture.checker](context)}));
}

// Some clear corners start a spell attempt even without a loop, V, or zigzag.
export function matchesIntentCorner(sample, b) {
  return spellList.some(spell => {
    if (!spell.gesture.startsIntent) return false;
    const fit = checkers[spell.gesture.checker]({points: sample, sample, b, diagnostics: {}});
    return fit.gate === 'ok' && fit.distance < fit.limit;
  });
}
