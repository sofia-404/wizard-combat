import {matchLoop} from './loop.js';
import {matchStrokes} from './ordered-path.js';
import {matchOrderedCorner} from './ordered-corner.js';

function loop(context) {
  return context.loop ||= matchLoop(context);
}
function strokes(context) {
  return context.strokes ||= matchStrokes(context.sample, context.b);
}

// Types describe geometry, not spell names. Keep the proven fit algorithms.
export const checkers = Object.freeze({
  loop(context) {
    const fit = loop(context);
    return {...fit, failure: fit.gate === 'inward_turn' ? {
      priority: 2, cause: 'inward_turn', reason: 'Loop turns inward. Draw a round loop.'
    } : null};
  },
  valley(context, spell) {
    loop(context);
    const fit = {...strokes(context).V};
    const turn = Math.round(fit.cornerTurn || 0);
    context.diagnostics[spell.gesture.diagnosticKey+'CornerTurn'] = turn;
    if (fit.gate === 'ok' && context.diagnostics.circleCoverage < 210 && turn < 45) fit.gate = 'rounded_arc';
    return fit;
  },
  zigzag(context, spell) {
    const fit = strokes(context).Z;
    const key = spell.gesture.diagnosticKey;
    Object.assign(context.diagnostics, {
      strokeMatcher: 'ordered_segments', [key+'Orientation']: fit.orientation || 'unknown', [key+'Trim']: +(fit.trim || 0).toFixed(3)
    });
    return {...fit, failure: fit.gate === 'z_orientation' ? {
      priority: 1, cause: 'z_orientation', reason: `${spell.label} is mirrored. Follow the shown path.`
    } : null};
  },
  'ordered-corner': context => matchOrderedCorner(context.sample, context.b)
});
