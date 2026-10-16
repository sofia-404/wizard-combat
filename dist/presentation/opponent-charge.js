import {spellColor} from './spell-color.js';

// Display only. The opponent model supplies the preparation and release time.
export function createOpponentCharge(wand, warningMs) {
  const ns = 'http://www.w3.org/2000/svg';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, attributes, parent) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };
  // The tip is at the lower-left end of the wand artwork. Inherit its idle motion.
  const group = make('g', {class:'opponent-charge', transform:'translate(1289 618)',
    visibility:'hidden', 'aria-hidden':'true', 'pointer-events':'none'}, wand.querySelector('.dummy-wand'));
  const defs = make('defs', {}, group);
  const gradientId = wand.id + '-charge-glow';
  const gradient = make('radialGradient', {id:gradientId}, defs);
  for (const [offset, opacity] of [['0%', '.85'], ['30%', '.5'], ['65%', '.18'], ['100%', '0']]) {
    make('stop', {offset, 'stop-color':'currentColor', 'stop-opacity':opacity}, gradient);
  }
  const glow = make('circle', {r:54, fill:`url(#${gradientId})`}, group);
  make('circle', {r:30, fill:'none', stroke:'currentColor', 'stroke-width':2, opacity:.35}, group);
  const arc = make('circle', {r:30, fill:'none', stroke:'currentColor', 'stroke-width':4,
    'stroke-linecap':'round', pathLength:100, transform:'rotate(-90)'}, group);
  const core = make('circle', {r:10, fill:'#fff', stroke:'currentColor', 'stroke-width':4}, group);

  function clear() {
    group.setAttribute('visibility', 'hidden');
    delete group.dataset.spell;
  }
  function refresh(preparing, now) {
    group.setAttribute('transform', `translate(${wand.dataset.tipX || 1289} ${wand.dataset.tipY || 618})`);
    if (!preparing) { clear(); return; }
    const progress = reducedMotion.matches ? .65 : Math.max(0, Math.min(1, 1 - (preparing.releaseAt - now) / (preparing.warningMs ?? warningMs)));
    group.dataset.spell = preparing.shape;
    group.style.color = spellColor(preparing.shape);
    group.setAttribute('visibility', 'visible');
    glow.setAttribute('r', 54 + progress * 16);
    core.setAttribute('r', 10 + progress * 6);
    arc.setAttribute('stroke-dasharray', reducedMotion.matches ? '100 100' : `${6 + progress * 94} 100`);
  }
  return {refresh, clear};
}
