import {createSpellEffects} from './fight-effects.js';
import {FightHealth, MAX_HEALTH} from './fight-health.js';
import {createDummyReactions} from './fight-reactions.js';
import {createGestureMirror} from './fight-gesture.js';
import {createFightDisarm} from './fight-disarm.js';
import {record, cancelGestureCapture} from './app.js';
import {createShieldView} from './presentation/shield-view.js';
import {spellColor} from './presentation/spell-color.js';

const $ = id => document.getElementById(id);
const gameViews = {training: $('trainingView'), fight: $('fightView'), 'legacy-practice': $('legacyPracticeView')};
let activeView = null;
const viewport = $('viewport');
const legacyPracticeSlot = document.createComment('Shared camera view returns here');
viewport.before(legacyPracticeSlot);
let lastCastId = null;
let resetNotice = false;
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
const shieldView = createShieldView($('fightShield'), $('fightShieldStatus'), health.shield, {cx:295, cy:520, rx:260, ry:325});
function logFight(cause, data = {}) {
  record({type: 'fight', source: 'fight', cause, playerHealth: health.player,
    dummyHealth: health.dummy, maxHealth: MAX_HEALTH, hits: health.hits, ...data});
}
const dummyReactions = createDummyReactions($('fightDummyActor'));
const dummyDisarm = createFightDisarm($('fightDummyActor'), $('fightWandStatus'));
const gestureMirror = createGestureMirror({
  source: $('overlay'), target: $('fightGesture'), video: $('video'), panel: $('fightView'),
  phase: $('phase'), instruction: $('instruction'), result: $('fightCastStatus'),
  status: {phase: $('fightArenaPhase'), instruction: $('fightArenaInstruction'), result: $('fightArenaResult')}
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
  if (health.defeated) {
    pauseTimer();
    effects.cancelFlights();
    showDefeat();
    document.dispatchEvent(new CustomEvent('wizard:duel-defeat'));
    logFight('defeat', {castId: cast.id});
  } else if (cast.id === lastCastId) $('fightCastStatus').textContent = `${cast.shape} hit the dummy · ${hit.damage} damage`;
});

function clearEffects(cause) {
  for (const cast of health.pending.values()) logFight('cancel', {castId: cast.id, reason: cause});
  effects.clear();
  health.cancelFlights();
  dummyReactions.settle();
  lastCastId = null;
}

function renderHealth() {
  for (const [id, value] of [['fightPlayerHealth', health.player], ['fightDummyHealth', health.dummy]]) {
    $(id).max = MAX_HEALTH;
    $(id).value = value;
    $(id).textContent = `${value} of ${MAX_HEALTH}`;
    $(id + 'Text').textContent = `${value} / ${MAX_HEALTH}`;
  }
  $('fightHits').textContent = `${health.hits} ${health.hits === 1 ? 'hit' : 'hits'}`;
  $('fightDefeat').hidden = !health.defeated;
  $('fightDummyState').textContent = health.defeated ? 'Defeated' : 'Static · No return fire';
  document.querySelector('.fight-arena').classList.toggle('is-defeated', health.defeated);
}

function showDefeat() {
  $('fightCastStatus').textContent = 'Dummy defeated. Select Reset dummy.';
  $('fightResult').textContent = `${health.hits} hits · Dummy health: 0 / ${MAX_HEALTH}`;
}

$('fightResetDummy').addEventListener('click', () => {
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
  resetNotice = true;
  syncControls();
  logFight('reset', {previousDummyHealth});
});

// The main menu selects one existing screen. No nested mode navigation remains.
export function selectGameView(view) {
  if (view !== null && !Object.hasOwn(gameViews, view)) throw new Error(`Unknown game view: ${view}`);
  const fight = view === 'fight';
  const training = view === 'training';
  const previousTab = activeView || 'menu';
  cancelGestureCapture('View changed. Hold still to start.');
  // Move the same video and overlay. Keep one camera controller and detector.
  if (fight) $('fightCameraMount').append(viewport);
  else if (training) $('trainingCameraMount').append(viewport);
  else legacyPracticeSlot.after(viewport);
  clearEffects('tab_change');
  dummyDisarm.refresh();
  shieldView.refresh();
  for (const [name, panel] of Object.entries(gameViews)) panel.hidden = name !== view;
  activeView = view;
  document.body.classList.toggle('fight-open', fight || training);
  document.body.classList.toggle('training-open', training);
  syncTimer();
  $('gameViewName').textContent = training ? 'Training' : fight ? 'Fight' : view ? '[OLD] Practice' : '';
  document.dispatchEvent(new CustomEvent('wizard:view', {detail: {view}}));
  if (fight) gestureMirror.start();
  else gestureMirror.stop();
  syncControls();
  // Retain the existing record keys for older local log readers.
  if (previousTab !== (view || 'menu')) logFight('tab_change', {previousTab});
}

function copyText(from, to) {
  const text = $(from).textContent;
  if ($(to).textContent !== text) $(to).textContent = text;
}

function syncControls() {
  copyText('camera', 'fightCamera');
  $('fightCamera').disabled = $('camera').disabled;
  copyText('cameraState', 'fightCameraState');
  copyText('tracking', 'fightTracking');
  $('fightHand').value = $('hand').value;
  $('fightPoint').value = $('point').value;
  $('fightSwap').checked = $('swap').checked;
  if (health.defeated) { showDefeat(); return; }
  if (resetNotice) {
    $('fightCastStatus').textContent = 'Dummy reset. Hold still until READY.';
    $('fightResult').textContent = `Dummy health restored to ${MAX_HEALTH}.`;
    return;
  }
  $('fightResult').textContent = $('resultTag').textContent === 'CAST'
    ? `${$('lastShape').textContent} · ${$('score').textContent} match`
    : $('lastReason').textContent;
  if ($('resultTag').textContent !== 'CAST') {
    lastCastId = null;
    $('fightCastStatus').textContent = $('resultTag').textContent === 'Waiting'
      ? ($('camera').textContent === 'Stop camera' ? 'Hold still until READY. Draw one shape.' : 'Start the camera. Hold still until READY.')
      : $('lastReason').textContent;
  } else if (!lastCastId) $('fightCastStatus').textContent = `Last spell: ${$('lastShape').textContent}`;
}

// Use the existing handlers, including their cancellation and error behavior.
$('fightCamera').addEventListener('click', () => $('camera').click());
for (const [source, mirror] of [['hand', 'fightHand'], ['point', 'fightPoint'], ['swap', 'fightSwap']]) {
  $(mirror).addEventListener('change', () => {
    if (source === 'swap') $(source).checked = $(mirror).checked;
    else $(source).value = $(mirror).value;
    $(source).dispatchEvent(new Event('change', {bubbles: true}));
  });
  $(source).addEventListener('change', syncControls);
}
const observer = new MutationObserver(syncControls);
for (const id of ['camera', 'cameraState', 'tracking']) {
  observer.observe($(id), {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled']});
}
const resultObserver = new MutationObserver(() => { resetNotice = false; syncControls(); });
for (const id of ['lastReason', 'lastShape', 'score', 'resultTag']) {
  resultObserver.observe($(id), {childList: true, subtree: true, characterData: true});
}

document.addEventListener('wizard:cast', ({detail: cast}) => {
  if ($('gameView').hidden || $('fightView').hidden || document.hidden) return;
  const now = performance.now();
  if (health.protect(cast, now)) {
    resetNotice = false;
    lastCastId = cast.id;
    shieldView.refresh(spellColor(cast.shape));
    $('fightCastStatus').textContent = `${cast.shape} cast · ${(health.shield.expiresAt-now)/1000}-second shield`;
    logFight('shield', {castId: cast.id, shape: cast.shape, score: cast.score, damage: 0,
      duration: health.shield.expiresAt-now});
    return;
  }
  const shot = health.launch({...cast, launchedAt: performance.now()});
  if (!shot) return;
  resetNotice = false;
  lastCastId = cast.id;
  $('fightCastStatus').textContent = `${shot.shape} cast · ${shot.damage} damage`;
  effects.cast(shot);
  logFight('cast', {castId: shot.id, shape: shot.shape, score: shot.score, damage: shot.damage});
});
$('reset').addEventListener('click', () => { clearEffects('legacy_practice_reset'); shieldView.clear(); });
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
