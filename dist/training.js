import {TrainingSession} from './training/session.js';
import {spellList, spellForShape} from './spells/index.js';
import {createSpellEffects} from './fight-effects.js';
import {createDummyReactions} from './fight-reactions.js';
import {createFightDisarm} from './fight-disarm.js';
import {createGestureMirror} from './fight-gesture.js';
import {Shield} from './combat/shield.js';
import {castDamage} from './combat/cast.js';
import {createShieldView} from './presentation/shield-view.js';
import {record, cancelGestureCapture, toggleGameCamera} from './app.js';

import {getInputState} from './input-state.js';

const $ = id => document.getElementById(id);
const session = new TrainingSession();
const seen = new Set();
const shield = new Shield();
const shieldView = createShieldView($('trainingShield'), $('trainingShieldStatus'), shield, {cx:295, cy:520, rx:260, ry:325});
const reactions = createDummyReactions($('trainingDummyActor'));
const disarm = createFightDisarm($('trainingDummyActor'), $('trainingWandStatus'));
const effects = createSpellEffects($('trainingEffects'), cast => {
  disarm.hit(cast);
  reactions.react(cast.shape);
  set('trainingArenaResult', `${cast.shape} hit the dummy · ${cast.damage} damage`);
});
const mirror = createGestureMirror({
  source: $('overlay'), target: $('trainingGesture'), video: $('video'), panel: $('trainingView'),
  phase: $('phase'), instruction: $('instruction'), result: $('trainingArenaResult'),
  status: {phase: $('trainingArenaPhase'), instruction: $('trainingArenaInstruction'), result: $('trainingArenaResult')}
});
function set(id, value) {
  if ($(id).textContent !== value) $(id).textContent = value;
}
function log(cause) {
  record({type:'settings', source:'training', cause, shape:session.spell.label, lessonState:session.state, lessonCount:session.count});
}
function clearEffects() {
  effects.clear();
  reactions.settle();
}
function renderGuide() {
  const spell = session.spell;
  set('trainingSpellTitle', spell.label);
  set('trainingArenaSpell', spell.label);
  set('trainingDescription', spell.description);
  set('trainingEffectNote', spell.effects.some(effect => effect.type === 'shield')
    ? 'Protego protects you for three seconds. It does not hit the dummy.'
    : spell.effects.some(effect => effect.type === 'disarm')
      ? "Expelliarmus removes the dummy's wand for two seconds."
      : 'This spell hits the dummy. Only the selected spell counts toward the lesson.');
  let svg;
  if (spell.id === 'expelliarmus') {
    svg = $('expelliarmusGuide').content.querySelector('svg').cloneNode(true);
    for (const node of svg.querySelectorAll('[id]')) node.id = 'training' + node.id;
    svg.setAttribute('aria-labelledby', 'traininglessonDiagramTitle traininglessonDiagramDesc');
  } else {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lesson-schema');
    svg.setAttribute('viewBox', '0 0 340 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', spell.guide.label);
    // SVG aligns the stop diamond with the final path tangent.
    const endMarker = `<defs><marker id="trainingGuideEnd" viewBox="-18 -18 36 36"
      markerWidth="36" markerHeight="36" refX="0" refY="0" orient="auto" markerUnits="userSpaceOnUse">
      <path class="schema-end" d="M-16 0L0-16L16 0L0 16Z"/>
    </marker></defs>`;
    // Display the existing paths with the same marks as the Expelliarmus guide.
    const diagrams = {
      'basic-cast': `
        ${endMarker}
        <path class="schema-border" d="M40.96 57.26L170 257.06L299.04 57.26M51.04 50.74L170 234.94L288.96 50.74"/>
        <path class="schema-path" d="M46 54L170 246L294 54" marker-end="url(#trainingGuideEnd)"/>
        <g class="schema-ring"><circle cx="77" cy="102" r="10"/><circle cx="139" cy="198" r="10"/><circle cx="201" cy="198" r="10"/><circle cx="263" cy="102" r="10"/></g>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(108 150) rotate(57.14)"/>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(232 150) rotate(-57.14)"/>
        <circle class="schema-start" cx="46" cy="54" r="9"/>
        <text x="46" y="30" text-anchor="middle">START</text><text x="294" y="30" text-anchor="middle">STOP</text>`,
      'confringo': `
        <path class="schema-border" d="M46 48H298L64 230H280M46 60H262L28 242H280"/>
        <path class="schema-path" d="M46 54H280L46 236H280"/>
        <g class="schema-ring"><circle cx="108" cy="54" r="10"/><circle cx="218" cy="54" r="10"/><circle cx="218" cy="102.22" r="10"/><circle cx="108" cy="187.78" r="10"/><circle cx="108" cy="236" r="10"/><circle cx="218" cy="236" r="10"/></g>
        <path class="schema-arrows" d="M158 48L165 54L158 60M162 137L160 148L171 149M158 230L165 236L158 242"/>
        <circle class="schema-start" cx="46" cy="54" r="9"/>
        <path class="schema-end" d="M280 220L296 236L280 252L264 236Z"/>
        <text x="27" y="30">START</text><text x="261" y="275">STOP</text>`,
      'protego': `
        ${endMarker}
        <path class="schema-border" d="M193.29 63.07A90 90 0 1 1 146.71 63.07M196.40 51.48A102 102 0 1 1 143.60 51.48"/>
        <path class="schema-path" d="M194.85 57.27A96 96 0 1 1 145.15 57.27" marker-end="url(#trainingGuideEnd)"/>
        <g class="schema-ring"><circle cx="266" cy="150" r="10"/><circle cx="170" cy="246" r="10"/><circle cx="74" cy="150" r="10"/></g>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(237.88 82.12) rotate(45)"/>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(102.12 217.88) rotate(225)"/>
        <circle class="schema-start" cx="194.85" cy="57.27" r="9"/>
        <text x="194.85" y="30" text-anchor="middle">START</text><text x="145.15" y="30" text-anchor="middle">STOP</text>`
    };
    svg.innerHTML = diagrams[spell.id];
  }
  const caption = document.createElement('p');
  caption.textContent = {
    expelliarmus: 'Move right, then down.',
    'basic-cast': 'Move down, then up. Either direction.',
    confringo: 'Right, down-left, then right. Either end.',
    protego: 'Draw a circle in either direction.'
  }[spell.id];
  $('trainingGuide').replaceChildren(svg, caption);
}
function renderLesson() {
  const complete = session.state === 'complete';
  set('trainingCount', `${session.count} / ${session.requiredCasts}`);
  $('trainingProgress').value = session.count;
  set('trainingProgress', `${session.count} of ${session.requiredCasts}`);
  $('trainingCompletion').hidden = !complete;
  $('trainingMessage').hidden = complete;
  set('trainingLearnedTitle', `${session.spell.label} learned`);
  set('trainingMessage', complete ? `${session.spell.label} learned. Choose another spell, or practice again.` : session.message);
  $('trainingStart').hidden = session.state === 'active';
  set('trainingStart', complete ? 'Practice again' : 'Start lesson');
  $('trainingStop').hidden = session.state === 'idle';
  set('trainingStop', complete ? 'Finish lesson' : 'Stop lesson');
  set('trainingLearnedTotal', `${session.learned.size} of ${spellList.length} spells learned`);
  for (const option of $('trainingSpell').options) {
    const spell = spellList.find(item => item.id === option.value);
    option.textContent = spell.label + (session.learned.has(spell.id) ? ' · Learned' : '');
  }
}
for (const spell of spellList) {
  const option = document.createElement('option');
  option.value = spell.id;
  option.textContent = spell.label;
  $('trainingSpell').append(option);
}
$('trainingSpell').value = session.spell.id;
$('trainingSpell').addEventListener('change', () => {
  cancelGestureCapture('Spell changed. Hold still to start.');
  clearEffects();
  session.select($('trainingSpell').value);
  renderGuide();renderLesson();
  set('trainingArenaResult', session.state === 'complete' ? `${session.spell.label} learned. Lesson complete.`
    : session.state === 'active' ? `Continue the ${session.spell.label} lesson.` : 'Start a lesson to count correct casts.');
  log('training_spell');
});
$('trainingStart').addEventListener('click', () => {
  cancelGestureCapture('Lesson started. Hold still to start.');
  clearEffects();session.start();renderLesson();
  set('trainingArenaResult', `Draw ${session.spell.label}. Pause to cast.`);
  log('training_start');
});
$('trainingStop').addEventListener('click', () => {
  const complete = session.state === 'complete';
  cancelGestureCapture('Lesson stopped. Hold still to start.');
  clearEffects();session.stop();renderLesson();
  set('trainingArenaResult', complete ? 'Lesson finished. Choose a spell to train.' : 'Lesson stopped. Start a lesson to count correct casts.');
  log(complete ? 'training_finish' : 'training_stop');
});
document.addEventListener('wizard:training-gesture', ({detail: event}) => {
  if ($('trainingView').hidden || document.hidden) return;
  if (event.type === 'capture') return;
  if (seen.has(event.id)) return;
  seen.add(event.id);
  session.update(event);renderLesson();
  record({id:event.id, type:event.type, source:'training', shape:event.shape || 'None', score:event.score || 0,
    reason:event.reason || '', cause:event.cause || 'unknown', expected:session.spell.label,
    lessonState:session.state, lessonCount:session.count});
  if (event.type !== 'cast' || !event.accepted) {
    set('trainingArenaResult', event.reason || 'Follow the path and try again.');
    return;
  }
  document.dispatchEvent(new CustomEvent('wizard:training-cast', {detail:{id:event.id, shape:event.shape}}));
  if (shield.cast(event, performance.now())) {
    shieldView.refresh(spellForShape(event.shape).visuals.color);
    set('trainingArenaResult', `${event.shape} cast · Shield active`);
    return;
  }
  const damage = castDamage(event);
  if (damage) {
    set('trainingArenaResult', `${event.shape} cast · ${damage} damage`);
    effects.cast({...event, damage});
  }
});
function syncControls() {
  for (const [source, target] of [['camera','trainingCamera'], ['cameraState','trainingCameraState'], ['tracking','trainingTracking']]) set(target, getInputState()[source]);
  $('trainingCamera').disabled = getInputState().cameraDisabled;
}
$('trainingCamera').addEventListener('click', toggleGameCamera);
document.addEventListener('wizard:input-state', syncControls);
document.addEventListener('wizard:view', ({detail}) => {
  clearEffects();disarm.refresh();shieldView.refresh();syncControls();
  if (detail.view === 'training') mirror.start();
  else mirror.stop();
});
document.addEventListener('visibilitychange', () => {
  disarm.refresh();shieldView.refresh();
  if (document.hidden) {clearEffects();mirror.stop();}
  else mirror.start();
});
window.addEventListener('pagehide', () => {clearEffects();mirror.stop();});
window.addEventListener('pageshow', () => disarm.refresh());
renderGuide();renderLesson();syncControls();
