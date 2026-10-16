import {spellRule} from './combat/rules.js';
import {spellColor} from './presentation/spell-color.js';
import {spellForShape} from './spells/index.js';

// Positions use the source artwork coordinates, so effects follow the image at any size.
const START = {x: 560, y: 374};
const TARGET = {x: 1410, y: 465};
const FLIGHT_MS = cast => spellRule(cast.shape)?.flightMs || 0;
const IMPACT_MS = 750;

export function createSpellEffects(svg, onImpact, {start = START, target = TARGET, flightMs = FLIGHT_MS, keepFlightTime = true} = {}) {
  const active = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function element(name, attributes, parent) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }

  function tick(now) {
    frame = 0;
    for (const spell of active) {
      const start = spell.start;
      const age = now - spell.started;
      const flight = spell.reduced && !keepFlightTime ? 0 : spell.flightMs;
      if (age < flight) {
        if (spell.reduced) continue;
        const progress = Math.max(0, age / flight);
        const tail = Math.max(0, progress - .18);
        const x = start.x + (target.x - start.x) * progress;
        const y = start.y + (target.y - start.y) * progress;
        spell.trail.setAttribute('x1', start.x + (target.x - start.x) * tail);
        spell.trail.setAttribute('y1', start.y + (target.y - start.y) * tail);
        spell.trail.setAttribute('x2', x);
        spell.trail.setAttribute('y2', y);
        spell.orb.setAttribute('cx', x);
        spell.orb.setAttribute('cy', y);
      } else {
        if (!spell.hit) {
          spell.hit = true;
          spell.group.dataset.phase = 'impact';
          spell.trail.remove();
          spell.orb.remove();
          spell.burst.setAttribute('visibility', 'visible');
          onImpact(spell.cast);
        }
        const progress = Math.min(1, (age - flight) / IMPACT_MS);
        spell.ring.setAttribute('r', spell.reduced ? 44 : 15 + progress * 85);
        spell.glow.setAttribute('r', spell.reduced ? 26 : 12 + progress * 36);
        spell.burst.setAttribute('opacity', spell.reduced ? .8 : 1 - progress);
        if (progress >= 1) {
          spell.group.remove();
          active.delete(spell);
        }
      }
    }
    if (active.size) frame = requestAnimationFrame(tick);
  }

  return {
    cast(cast) {
      if (spellForShape(cast.shape)?.visuals.cast === 'shield') return;
      const wand = svg.id.endsWith('IncomingEffects') ? svg.closest('.practice-arena')?.querySelector('[id$="DummyWand"][data-tip-x]') : null;
      const origin = wand ? {x:Number(wand.dataset.tipX), y:Number(wand.dataset.tipY)} : start;
      const group = element('g', {'data-spell': cast.shape, 'data-phase': 'flight', class: 'practice-arena-spell'}, svg);
      const color = spellColor(cast.shape);
      const trail = element('line', {x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y, stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round'}, group);
      const orb = element('circle', {cx: origin.x, cy: origin.y, r: 9, fill: '#fff', stroke: color, 'stroke-width': 4}, group);
      if (reducedMotion.matches) { trail.setAttribute('visibility', 'hidden'); orb.setAttribute('visibility', 'hidden'); }
      const burst = element('g', {visibility: 'hidden'}, group);
      const glow = element('circle', {cx: target.x, cy: target.y, r: 12, fill: color, opacity: .65}, burst);
      const ring = element('circle', {cx: target.x, cy: target.y, r: 15, fill: 'none', stroke: color, 'stroke-width': 5}, burst);
      active.add({cast, group, trail, orb, burst, glow, ring, start:origin, hit: false, started: performance.now(),
        flightMs:typeof flightMs === 'function' ? flightMs(cast) : flightMs, reduced: reducedMotion.matches});
      if (!frame) frame = requestAnimationFrame(tick);
    },
    clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      active.clear();
      svg.replaceChildren();
    },
    cancelFlights() {
      for (const spell of active) {
        if (spell.hit) continue;
        spell.group.remove();
        active.delete(spell);
      }
    }
  };
}
