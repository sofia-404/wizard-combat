import {checkers} from '../gestures/checkers.js';
import {effects} from '../combat/effects/index.js';
import {animations} from '../presentation/animations.js';

export function validateDefinitions(definitions) {
  const ids = new Set(), labels = new Set(), diagnosticKeys = new Set();
  const positive = value => Number.isFinite(value) && value > 0;
  for (const spell of definitions) {
    const fail = message => { throw new Error(`Invalid spell ${spell.id || '(missing ID)'}: ${message}`); };
    if (!/^[a-z][a-z0-9-]*$/.test(spell.id || '') || ids.has(spell.id)) fail('ID missing or repeated');
    if (typeof spell.label !== 'string' || !spell.label || labels.has(spell.label)) fail('label missing or repeated');
    if (!['shape', 'spell'].includes(spell.kind) || !Number.isInteger(spell.version) || spell.version < 1) fail('kind or version');
    const gesture = spell.gesture;
    if (!gesture || !Object.hasOwn(checkers, gesture.checker) || !positive(gesture.scoreScale)) fail('gesture checker or score scale');
    if (!/^[a-z][a-z0-9]*$/.test(gesture.diagnosticKey || '') || diagnosticKeys.has(gesture.diagnosticKey)) fail('diagnostic key missing or repeated');
    if (typeof gesture.strokeDiagnostics !== 'boolean') fail('stroke diagnostics flag');
    if (!spell.guide?.viewBox || !Array.isArray(spell.guide.elements) || !spell.guide.elements.length) fail('guide missing');
    for (const [tag, attributes] of spell.guide.elements) {
      if (!['circle', 'path'].includes(tag) || !attributes || typeof attributes !== 'object') fail('guide element');
    }
    if (typeof spell.description !== 'string' || !Array.isArray(spell.effects)) fail('description or effects');
    for (const effect of spell.effects) {
      if (!Object.hasOwn(effects, effect.type)) fail('unknown effect');
      if (effect.type === 'damage') {
        const tiers = effect.tiers;
        if (!Array.isArray(tiers) || !tiers.length || tiers.at(-1).minScore !== 0) fail('damage tiers');
        for (let i = 0; i < tiers.length; i++) {
          const tier = tiers[i];
          if (!Number.isFinite(tier.minScore) || tier.minScore < 0 || tier.minScore > 100 ||
              !Number.isFinite(tier.value) || tier.value < 0 || (i && tier.minScore >= tiers[i-1].minScore)) fail('damage tier order or value');
        }
      }
      if (effect.type === 'disarm' && (!positive(effect.durationMs) || effect.repeat !== 'refresh')) fail('disarm settings');
    }
    if (!Object.hasOwn(animations, spell.visuals?.cast)) fail('cast animation');
    if (typeof spell.visuals.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(spell.visuals.color)) fail('spell color');
    if (spell.lesson) {
      if (!Number.isInteger(spell.lesson.requiredCasts) || spell.lesson.requiredCasts < 1) fail('lesson count');
      for (const field of ['start', 'idle', 'complete', 'correction']) if (typeof spell.lesson[field] !== 'string') fail('lesson message');
    }
    ids.add(spell.id); labels.add(spell.label); diagnosticKeys.add(gesture.diagnosticKey);
  }
}
