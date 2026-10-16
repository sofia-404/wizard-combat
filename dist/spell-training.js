import {SpellTrainingSession} from './spell-training/session.js';
import {SoloOpponent, SOLO_RULES} from './combat/solo-opponent.js';
import {PracticeArenaHealth} from './practice-arena-health.js';
import {renderHealthBars, listenForPlayerHits} from './presentation/health-view.js';
import {spellList, spellForShape} from './spells/index.js';
import {createSpellEffects} from './practice-arena-effects.js';
import {createDummyReactions, createPlayerReactions} from './practice-arena-reactions.js';
import {createPracticeArenaDisarm} from './practice-arena-disarm.js';
import {createGestureMirror} from './practice-arena-gesture.js';
import {createShieldView} from './presentation/shield-view.js';
import {createOpponentCharge} from './presentation/opponent-charge.js';
import {createPracticeArenaEvents} from './presentation/practice-arena-events.js';
import {syncGameCamera} from './presentation/game-camera.js';
import {record, cancelGestureCapture, toggleGameCamera} from './app.js';

import {getInputState} from './input-state.js';

const $ = id => document.getElementById(id);
const session = new SpellTrainingSession();
const seen = new Set();
const events = createPracticeArenaEvents($('spellTrainingEvents'), $('spellTrainingEventsEmpty'));
let previousCameraState = getInputState().cameraState;
let cameraReady = false;
let completionDismissed = false;
const health = new PracticeArenaHealth();
const opponent = new SoloOpponent({attacksOnly:true});
const opponentCharge = createOpponentCharge($('spellTrainingDummyWand'), SOLO_RULES.warningMs);
const incoming = new Set();
let opponentTick = null, chargeVisible = false;
let pageHidden = false;
const RESTART_DELAY_MS = 2000;
let restartAt = 0;
let restartTimer = null;
let playerRestartAt = 0;
let playerRestartTimer = null;
const shield = health.shield;
const shieldView = createShieldView($('spellTrainingShield'), null, shield, {cx:295, cy:520, rx:260, ry:325});
const playerReactions = createPlayerReactions($('spellTrainingPlayerActor'));
const reactions = createDummyReactions($('spellTrainingDummyActor'));
const disarm = createPracticeArenaDisarm($('spellTrainingDummyActor'), null);
listenForPlayerHits('spellTraining', health, (hit, cast) => {
  renderHealthBars('spellTraining', health);
  events.add(hit.blocked ? 'Protego blocked the hit' : 'Player hit', `${hit.damage} damage`);
  if (incoming.delete(cast.id) && session.spell.id === 'protego') {
    session.update({type:hit.blocked ? 'block' : 'hit', id:cast.id, blocked:hit.blocked});
    renderLesson();
  }
  record({type:'practiceArena', source:'spellTraining', cause:'player_hit', playerHealth:health.player,
    dummyHealth:health.dummy, damage:hit.damage});
  if (hit.damage > 0) {
    if (!health.playerDefeated) playerReactions.react(cast.shape || 'Basic Cast');
    document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail:{view:'spellTraining'}}));
  }
  if (health.playerDefeated) {
    document.dispatchEvent(new CustomEvent('wizard:duel-defeat', {detail:{view:'spellTraining', player:true}}));
    playerReactions.react('Basic Cast', true);
    effects.cancelFlights();
    events.add('Player defeated', 'Restarts in 2 seconds');
    playerRestartAt = performance.now() + RESTART_DELAY_MS;
    playerRestartTimer = setTimeout(refreshRestart, RESTART_DELAY_MS);
  }
  syncOpponent();
});
const incomingEffects = createSpellEffects($('spellTrainingIncomingEffects'), cast => {
  if (!opponentActive()) return;
  document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view:'spellTraining', ...cast}}));
}, {start:{x:1348, y:534}, target:{x:295, y:520}, flightMs:SOLO_RULES.flightMs, keepFlightTime:true});

function opponentActive() {
  const input = getInputState();
  return session.spell.id === 'protego' && session.state === 'active' && !health.over
    && !$('gameView').hidden && !$('spellTrainingView').hidden && !document.hidden && !pageHidden
    && input.camera === 'Stop camera' && input.cameraState === 'Camera on' && !input.cameraDisabled;
}
function stopOpponent() {
  clearInterval(opponentTick);
  opponentTick = null;
  opponent.stop();
  opponentCharge.clear();
  chargeVisible = false;
  incomingEffects.clear();
  incoming.clear();
  $('spellTrainingDummyState').hidden = true;
  set('spellTrainingDummyState', '');
}
function syncOpponent() {
  if (!opponentActive()) { stopOpponent(); return; }
  const now = performance.now();
  const disarmed = $('spellTrainingDummyActor').dataset.disarmed === 'true';
  const action = opponent.update(now, {active:true, disarmed});
  if (opponent.preparing) {
    opponentCharge.refresh(opponent.preparing, now);
    chargeVisible = true;
  } else if (chargeVisible) {
    opponentCharge.clear();
    chargeVisible = false;
  }
  if (opponentTick === null) opponentTick = setInterval(syncOpponent, 50);
  if (action?.type === 'prepare') {
    events.add(`Opponent prepares ${action.shape}`, 'Cast Protego before the spell hits.');
  } else if (action?.type === 'cast') {
    const cast = {id:crypto.randomUUID(), shape:action.shape, damage:action.damage, launchedAt:now};
    incoming.add(cast.id);
    incomingEffects.cast(cast);
    events.add(`Opponent cast ${action.shape}`, 'Incoming spell.');
    document.dispatchEvent(new CustomEvent('wizard:opponent-cast', {detail:{...cast, view:'spellTraining'}}));
  }
  const text = disarmed ? 'Disarmed' : opponent.preparing ? `Casting ${opponent.preparing.shape}` : '';
  const state = $('spellTrainingDummyState');
  if (state.textContent !== text) state.textContent = text;
  if (state.hidden !== !text) state.hidden = !text;
}
const effects = createSpellEffects($('spellTrainingEffects'), cast => {
  const hit = health.hit(cast);
  if (!hit) return;
  document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail:{view:'spellTraining'}}));
  disarm.hit(cast);
  reactions.react(cast.shape, hit.defeated);
  renderHealthBars('spellTraining', health);
  events.add(cast.shape, `${hit.damage} damage · ${cast.score}% precision`);
  if (hit.defeated) {
    document.dispatchEvent(new CustomEvent('wizard:duel-defeat', {detail:{view:'spellTraining'}}));
    effects.cancelFlights();
    events.add('Dummy defeated', 'Restarts in 2 seconds');
    restartAt = performance.now() + RESTART_DELAY_MS;
    restartTimer = setTimeout(refreshRestart, RESTART_DELAY_MS);
  }
  syncOpponent();
});
const mirror = createGestureMirror({
  source: $('overlay'), target: $('spellTrainingGesture'), video: $('video'), panel: $('spellTrainingView')
});
function set(id, value) {
  if ($(id).textContent !== value) $(id).textContent = value;
}
function log(cause) {
  record({type:'settings', source:'spellTraining', cause, shape:session.spell.label, lessonState:session.state, lessonCount:session.count});
}
function clearEffects() {
  stopOpponent();
  effects.clear();
  health.cancelFlights();
  reactions.settle();
  playerReactions.settle();
}
function syncAudioState() {
  document.dispatchEvent(new CustomEvent('wizard:duel-state', {detail:{view:'spellTraining', over:health.over}}));
}
function resetTarget() {
  clearTimeout(restartTimer);
  restartTimer = null;
  restartAt = 0;
  clearEffects();
  health.resetTarget();
  reactions.reset();
  disarm.reset();
  renderHealthBars('spellTraining', health);
  syncAudioState();
  syncOpponent();
}
function refreshRestart() {
  if (playerRestartAt && performance.now() >= playerRestartAt) {
    clearTimeout(playerRestartTimer);
    playerRestartTimer = null;
    playerRestartAt = 0;
    health.resetPlayer();
    playerReactions.reset();
    shieldView.refresh();
    renderHealthBars('spellTraining', health);
    events.add('Player ready', '200 / 200 health');
    syncAudioState();
    syncOpponent();
  }
  if (!restartAt || performance.now() < restartAt) return;
  resetTarget();
  events.add('Dummy ready', '200 / 200 health');
}
function renderGuide() {
  const spell = session.spell;
  let svg;
  if (spell.id === 'expelliarmus') {
    svg = $('expelliarmusGuide').content.querySelector('svg').cloneNode(true);
    for (const node of svg.querySelectorAll('[id]')) node.id = 'spellTraining' + node.id;
    svg.setAttribute('aria-labelledby', 'spellTraininglessonDiagramTitle spellTraininglessonDiagramDesc');
  } else {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lesson-schema');
    svg.setAttribute('viewBox', '0 0 340 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', spell.guide.label);
    // SVG aligns the stop diamond with the final path tangent.
    const endMarker = `<defs><marker id="spellTrainingGuideEnd" viewBox="-18 -18 36 36"
      markerWidth="36" markerHeight="36" refX="0" refY="0" orient="auto" markerUnits="userSpaceOnUse">
      <path class="schema-end" d="M-16 0L0-16L16 0L0 16Z"/>
    </marker></defs>`;
    // Display the existing paths with the same marks as the Expelliarmus guide.
    const diagrams = {
      'basic-cast': `
        ${endMarker}
        <path class="schema-border" d="M40.96 57.26L170 257.06L299.04 57.26M51.04 50.74L170 234.94L288.96 50.74"/>
        <path class="schema-path" d="M46 54L170 246L294 54" marker-end="url(#spellTrainingGuideEnd)"/>
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
        <path class="schema-path" d="M194.85 57.27A96 96 0 1 1 145.15 57.27" marker-end="url(#spellTrainingGuideEnd)"/>
        <g class="schema-ring"><circle cx="266" cy="150" r="10"/><circle cx="170" cy="246" r="10"/><circle cx="74" cy="150" r="10"/></g>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(237.88 82.12) rotate(45)"/>
        <path class="schema-arrows" d="M-7-6L0 0L-7 6" transform="translate(102.12 217.88) rotate(225)"/>
        <circle class="schema-start" cx="194.85" cy="57.27" r="9"/>
        <text x="194.85" y="30" text-anchor="middle">START</text><text x="145.15" y="30" text-anchor="middle">STOP</text>`
    };
    svg.innerHTML = diagrams[spell.id];
  }
  $('spellTrainingGuide').replaceChildren(svg);
}
function renderLesson() {
  const complete = session.state === 'complete';
  const protego = session.spell.id === 'protego';
  if (!complete || !protego) completionDismissed = false;
  const completion = $('spellTrainingCompletion');
  const wasHidden = completion.hidden;
  const mount = document.querySelector(protego ? '#spellTrainingView .practice-arena' : '#spellTrainingView .spell-training-guide-area');
  if (completion.parentElement !== mount) mount.prepend(completion);
  completion.classList.toggle('practice-arena-defeat', protego);
  completion.classList.toggle('is-popup', protego);
  completion.setAttribute('role', protego ? 'dialog' : 'status');
  completion.setAttribute('aria-labelledby', 'spellTrainingLearnedTitle');
  $('spellTrainingCompletionClose').hidden = !protego;
  set('spellTrainingProgressLabel', protego ? 'Attacks blocked' : 'Correct casts');
  set('spellTrainingCompletionText', protego ? 'Lesson complete. Three attacks blocked.' : 'Lesson complete. Three correct casts.');
  set('spellTrainingTargetName', protego ? 'Opponent' : 'Dummy');
  set('spellTrainingTargetRole', protego ? 'OPPONENT' : 'TARGET');
  $('spellTrainingDummyHealth').setAttribute('aria-label', protego ? 'Opponent health' : 'Dummy health');
  set('spellTrainingCount', `${session.count} / ${session.requiredCasts}`);
  $('spellTrainingProgress').value = session.count;
  set('spellTrainingProgress', `${session.count} of ${session.requiredCasts}`);
  completion.hidden = !complete || (protego && completionDismissed);
  const message = session.state === 'idle' || session.message === 'No cast. Follow the path. Pause only at the end.' ? '' : session.message;
  $('spellTrainingMessage').hidden = complete || !message;
  set('spellTrainingLearnedTitle', `${session.spell.label} learned`);
  set('spellTrainingMessage', message);
  set('spellTrainingLearnedTotal', `${session.learned.size} of ${spellList.length} spells learned`);
  if (protego && wasHidden && !completion.hidden) $('spellTrainingCompletionClose').focus({preventScroll:true});
  for (const option of $('spellTrainingSpell').options) {
    const spell = spellList.find(item => item.id === option.value);
    option.textContent = spell.label + (session.learned.has(spell.id) ? ' · Learned' : '');
  }
}
function dismissCompletion() {
  completionDismissed = true;
  $('spellTrainingCompletion').hidden = true;
  $('spellTrainingSpell').focus({preventScroll:true});
}
$('spellTrainingCompletionClose').addEventListener('click', dismissCompletion);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || $('spellTrainingView').hidden || session.spell.id !== 'protego' || $('spellTrainingCompletion').hidden) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dismissCompletion();
}, true);
for (const spell of spellList) {
  const option = document.createElement('option');
  option.value = spell.id;
  option.textContent = spell.label;
  $('spellTrainingSpell').append(option);
}
$('spellTrainingSpell').value = session.spell.id;
$('spellTrainingSpell').addEventListener('change', () => {
  cancelGestureCapture('Spell changed. Hold still to start.');
  clearEffects();
  session.select($('spellTrainingSpell').value);
  if (cameraReady && session.state === 'idle') startLesson();
  renderGuide();renderLesson();
  syncOpponent();
  log('spell_training_spell');
});
function startLesson() {
  cancelGestureCapture('Lesson started. Hold still to start.');
  resetTarget();
  session.start();renderLesson();
  opponent.reset();
  syncOpponent();
  log('spell_training_start');
}
document.addEventListener('wizard:spell-training-gesture', ({detail: event}) => {
  if ($('spellTrainingView').hidden || document.hidden || health.playerDefeated) return;
  if (event.type === 'capture') return;
  if (seen.has(event.id)) return;
  seen.add(event.id);
  session.update(event);renderLesson();
  record({id:event.id, type:event.type, source:'spellTraining', shape:event.shape || 'None', score:event.score || 0,
    reason:event.reason || '', cause:event.cause || 'unknown', expected:session.spell.label,
    lessonState:session.state, lessonCount:session.count});
  if (event.type !== 'cast' || !event.accepted) {
    if (event.type === 'reject') events.add('Spell not cast', event.reason);
    else if (event.type === 'cancel' && !['camera_stopped', 'view_changed'].includes(event.cause)) {
      events.add('Drawing cancelled', event.reason);
    }
    return;
  }
  if (shield.cast(event, performance.now())) {
    document.dispatchEvent(new CustomEvent('wizard:spell-training-cast', {detail:{view:'spellTraining', id:event.id, shape:event.shape}}));
    shieldView.refresh(spellForShape(event.shape).visuals.color);
    events.add(event.shape, `0 damage · ${event.score}% precision`);
    return;
  }
  const shot = spellForShape(event.shape) && health.launch(event);
  if (shot) {
    document.dispatchEvent(new CustomEvent('wizard:spell-training-cast', {detail:{view:'spellTraining', id:event.id, shape:event.shape}}));
    effects.cast(shot);
  }
});
function syncControls() {
  set('spellTrainingTracking', getInputState().tracking);
  syncGameCamera($('spellTrainingCamera'), document.querySelector('#spellTrainingView .practice-arena'), {
    active: !$('spellTrainingView').hidden
  });
  const input = getInputState();
  const ready = input.camera === 'Stop camera' && !input.cameraDisabled;
  const started = ready && !cameraReady;
  cameraReady = ready;
  if (started && !$('spellTrainingView').hidden) startLesson();
  syncOpponent();
}
$('spellTrainingCamera').addEventListener('click', toggleGameCamera);
document.addEventListener('wizard:input-state', ({detail}) => {
  if (detail.changed.includes('cameraState')) {
    const state = getInputState().cameraState;
    const stopped = state.startsWith('Camera stopped');
    const wasRunning = previousCameraState === 'Camera on' || previousCameraState === 'Switching to CPU…';
    if (wasRunning && getInputState().camera === 'Start camera') {
      session.stopActive();
      clearEffects();renderLesson();
      log('spell_training_stop');
    }
    if (!$('spellTrainingView').hidden && (!stopped || previousCameraState === 'Camera on' || previousCameraState === 'Switching to CPU…')) {
      events.add(stopped ? 'Camera stopped' : state);
    }
    previousCameraState = state;
  }
  syncControls();
});
document.addEventListener('wizard:view', ({detail}) => {
  refreshRestart();
  clearEffects();disarm.refresh();shieldView.refresh();syncControls();
  if (detail.view === 'spellTraining') {mirror.start();syncAudioState();}
  else mirror.stop();
});
document.addEventListener('visibilitychange', () => {
  refreshRestart();
  disarm.refresh();shieldView.refresh();
  if (document.hidden) {clearEffects();mirror.stop();}
  else mirror.start();
  syncOpponent();
});
window.addEventListener('pagehide', () => {pageHidden = true;clearEffects();mirror.stop();});
window.addEventListener('pageshow', () => {pageHidden = false;refreshRestart();disarm.refresh();syncOpponent();});
renderHealthBars('spellTraining', health);
renderGuide();renderLesson();syncControls();
