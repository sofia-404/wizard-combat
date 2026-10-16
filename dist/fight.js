import {createSpellEffects} from './fight-effects.js';
import {FightHealth, MAX_HEALTH} from './fight-health.js';
import {renderHealthBars, listenForPlayerHits} from './presentation/health-view.js';
import {createDummyReactions} from './fight-reactions.js';
import {createGestureMirror} from './fight-gesture.js';
import {createFightDisarm} from './fight-disarm.js';
import {record, cancelGestureCapture, toggleGameCamera} from './app.js';
import {createShieldView} from './presentation/shield-view.js';
import {spellColor} from './presentation/spell-color.js';
import {createFightEvents} from './presentation/fight-events.js';
import {syncGameCamera} from './presentation/game-camera.js';
import {prepareArena} from './presentation/arena-ready.js';

import {getInputState} from './input-state.js';

const $ = id => document.getElementById(id);
const gameViews = {training: $('trainingView'), fight: $('fightView')};
let activeView = null;
const viewport = $('viewport');
const events = createFightEvents($('fightEvents'), $('fightEventsEmpty'));
let previousCameraState = getInputState().cameraState;
const health = new FightHealth();
let timeRemaining = 100000;
let timerDeadline = null;
let timerTick;
function renderTimer() {
  if (timerDeadline !== null) timeRemaining = Math.max(0, timerDeadline - performance.now());
  const text = String(Math.ceil(timeRemaining / 1000));
  if ($('fightTimer').textContent !== text) $('fightTimer').textContent = text;
  if (!timeRemaining) { clearInterval(timerTick); timerDeadline = null; }
}
function pauseTimer() {
  renderTimer();
  clearInterval(timerTick);
  timerDeadline = null;
}
function syncTimer() {
  pauseTimer();
  if (!$('fightView').hidden && !document.hidden && !health.defeated && timeRemaining > 0) {
    timerDeadline = performance.now() + timeRemaining;
    timerTick = setInterval(renderTimer, 100);
  }
}
const shieldView = createShieldView($('fightShield'), null, health.shield, {cx:295, cy:520, rx:260, ry:325});
function logFight(cause, data = {}) {
  record({type: 'fight', source: 'fight', cause, playerHealth: health.player,
    dummyHealth: health.dummy, maxHealth: MAX_HEALTH, hits: health.hits, ...data});
}
const dummyReactions = createDummyReactions($('fightDummyActor'));
const dummyDisarm = createFightDisarm($('fightDummyActor'), null);
const gestureMirror = createGestureMirror({
  source: $('overlay'), target: $('fightGesture'), video: $('video'), panel: $('fightView')
});
const effects = createSpellEffects($('fightEffects'), cast => {
  const previousDummyHealth = health.dummy;
  const castToHitMs = Math.round(performance.now() - cast.launchedAt);
  const hit = health.hit(cast);
  if (!hit) return;
  document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail: {castId: cast.id, shape: cast.shape, ...hit}}));
  dummyDisarm.hit(cast);
  dummyReactions.react(cast.shape, hit.defeated);
  renderHealth();
  logFight('hit', {castId: cast.id, shape: cast.shape, score: cast.score,
    castToHitMs, damage: hit.damage, previousDummyHealth});
  events.add(cast.shape, `${hit.damage} damage · ${cast.score}% precision`);
  if (health.defeated) {
    pauseTimer();
    effects.cancelFlights();
    events.add('Dummy defeated', `${health.hits} hits · Select Restart to continue.`);
    document.dispatchEvent(new CustomEvent('wizard:duel-defeat'));
    logFight('defeat', {castId: cast.id});
  }
});

function clearEffects(cause) {
  for (const cast of health.pending.values()) logFight('cancel', {castId: cast.id, reason: cause});
  effects.clear();
  health.cancelFlights();
  dummyReactions.settle();
}

function renderHealth() {
  renderHealthBars('fight', health);
  $('fightHits').textContent = `${health.hits} ${health.hits === 1 ? 'hit' : 'hits'}`;
  $('fightDefeat').hidden = !health.defeated;
  syncCameraControl();
  $('fightDummyState').textContent = health.defeated ? 'Defeated' : '';
  $('fightDummyState').hidden = !health.defeated;
  document.querySelector('.fight-arena').classList.toggle('is-defeated', health.defeated);
}

listenForPlayerHits('fight', health, hit => {
  renderHealth();
  events.add(hit.blocked ? 'Protego blocked the hit' : 'Player hit', `${hit.damage} damage`);
  logFight('player_hit', {damage:hit.damage});
});

$('fightResetDummy').addEventListener('click', () => {
  const restoreFocus = document.activeElement === $('fightResetDummy');
  const previousDummyHealth = health.dummy;
  clearEffects('dummy_reset');
  health.resetDummy();
  pauseTimer();
  timeRemaining = 100000;
  syncTimer();
  shieldView.refresh();
  dummyReactions.reset();
  dummyDisarm.reset();
  renderHealth();
  document.dispatchEvent(new CustomEvent('wizard:duel-reset'));
  events.clear();
  events.add('Fight restarted', `Dummy health: ${MAX_HEALTH} / ${MAX_HEALTH}`);
  syncControls();
  if (restoreFocus) $('fightCamera').focus({preventScroll:true});
  logFight('reset', {previousDummyHealth});
});

// The main menu selects one existing screen. No nested mode navigation remains.
export function selectGameView(view) {
  if (view !== null && !Object.hasOwn(gameViews, view)) throw new Error(`Unknown game view: ${view}`);
  const fight = view === 'fight';
  const training = view === 'training';
  if (view) prepareArena(gameViews[view].querySelector('.fight-arena'));
  const previousTab = activeView || 'menu';
  cancelGestureCapture('View changed. Hold still to start.');
  // Move the same video and overlay. Keep one camera controller and detector.
  if (fight) $('fightCameraMount').append(viewport);
  else if (training) $('trainingCameraMount').append(viewport);
  else $('cameraHome').append(viewport);
  clearEffects('tab_change');
  dummyDisarm.refresh();
  shieldView.refresh();
  for (const [name, panel] of Object.entries(gameViews)) panel.hidden = name !== view;
  $('fightHeading').hidden = !fight;
  $('trainingHeading').hidden = !training;
  $('gameViewName').hidden = true;
  activeView = view;
  document.body.classList.toggle('fight-open', fight || training);
  document.body.classList.toggle('training-open', training);
  syncTimer();
  $('gameViewName').textContent = training ? 'Training' : fight ? 'Fight' : '';
  document.dispatchEvent(new CustomEvent('wizard:view', {detail: {view}}));
  if (fight) gestureMirror.start();
  else gestureMirror.stop();
  syncControls();
  // Retain the existing record keys for older local log readers.
  if (previousTab !== (view || 'menu')) logFight('tab_change', {previousTab});
}

function copyText(from, to) {
  const text = getInputState()[from];
  if ($(to).textContent !== text) $(to).textContent = text;
}

function syncCameraControl() {
  const button = $('fightCamera');
  const hadFocus = document.activeElement === button;
  syncGameCamera(button, document.querySelector('#fightView .fight-arena'), {
    active: activeView === 'fight', unavailable: health.defeated
  });
  if (hadFocus && button.hidden && activeView === 'fight') $('fightResetDummy').focus({preventScroll:true});
}

function syncControls() {
  syncCameraControl();
  copyText('tracking', 'fightTracking');
}

$('fightCamera').addEventListener('click', toggleGameCamera);
document.addEventListener('wizard:input-state', ({detail}) => {
  if (detail.changed.includes('cameraState')) {
    const state = getInputState().cameraState;
    const stopped = state.startsWith('Camera stopped');
    if (activeView === 'fight' && (!stopped || previousCameraState === 'Camera on' || previousCameraState === 'Switching to CPU…')) {
      events.add(stopped ? 'Camera stopped' : state);
    }
    previousCameraState = state;
  }
  syncControls();
});

document.addEventListener('wizard:fight-gesture', ({detail}) => {
  if (activeView !== 'fight' || document.hidden) return;
  if (detail.type === 'reject') events.add('Spell not cast', detail.reason);
  else if (detail.type === 'cancel' && !['camera_stopped', 'view_changed'].includes(detail.cause)) {
    events.add('Drawing cancelled', detail.reason);
  }
});

document.addEventListener('wizard:cast', ({detail: cast}) => {
  if ($('gameView').hidden || $('fightView').hidden || document.hidden) return;
  const now = performance.now();
  if (health.protect(cast, now)) {
    shieldView.refresh(spellColor(cast.shape));
    events.add(cast.shape, `0 damage · ${cast.score}% precision`);
    logFight('shield', {castId: cast.id, shape: cast.shape, score: cast.score, damage: 0,
      duration: health.shield.expiresAt-now});
    return;
  }
  const shot = health.launch({...cast, launchedAt: performance.now()});
  if (!shot) return;
  effects.cast(shot);
  logFight('cast', {castId: shot.id, shape: shot.shape, score: shot.score, damage: shot.damage});
});
document.addEventListener('visibilitychange', () => {
  syncTimer();
  shieldView.refresh();
  dummyDisarm.refresh();
  if (document.hidden) { clearEffects('page_hidden'); gestureMirror.stop(); }
  else gestureMirror.start();
});
window.addEventListener('pagehide', () => { pauseTimer(); clearEffects('page_hidden'); gestureMirror.stop(); });
window.addEventListener('pageshow', () => { syncTimer(); dummyDisarm.refresh(); shieldView.refresh(); });
renderHealth();
syncControls();
logFight('view_init');
