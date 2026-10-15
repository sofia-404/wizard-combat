import {spellList} from '../spells/index.js';
import {checkers} from './checkers.js';

export function matchGestures(points, sample, b, diagnostics, precisionScale = 1) {
  const context = {points, sample, b, diagnostics, precisionScale};
  return spellList.map(spell => ({spell, fit: checkers[spell.gesture.checker](context, spell)}));
}

// Some clear corners start a spell attempt even without a loop, valley, or zigzag.
export function matchesIntentCorner(sample, b, precisionScale = 1) {
  return spellList.some(spell => {
    if (!spell.gesture.startsIntent) return false;
    const fit = checkers[spell.gesture.checker]({points: sample, sample, b, diagnostics: {}, precisionScale}, spell);
    return fit.gate === 'ok' && fit.distance < fit.limit;
  });
}
