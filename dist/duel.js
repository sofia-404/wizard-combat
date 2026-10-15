import {createSpellEffects} from './duel-effects.js';
import {DuelHealth, MAX_HEALTH} from './duel-health.js';
import {createDummyReactions} from './duel-reactions.js';
import {createGestureMirror} from './duel-gesture.js';
import {record} from './app.js';

const $ = id => document.getElementById(id);
const tabs = [...document.querySelectorAll('.view-tab')];
const viewport = $('viewport');
const practiceSlot = document.createComment('Shared camera view returns here');
viewport.before(practiceSlot);
let lastCastId = null;
let resetNotice = false;
const health = new DuelHealth();
function logDuel(cause, data = {}) {
  record({type: 'duel', source: 'duel', cause, playerHealth: health.player,
    dummyHealth: health.dummy, maxHealth: MAX_HEALTH, hits: health.hits, ...data});
}
const dummyReactions = createDummyReactions($('duelDummyActor'));
const gestureMirror = createGestureMirror({
  source: $('overlay'), target: $('duelGesture'), video: $('video'), panel: $('duelView'),
  phase: $('phase'), instruction: $('instruction'), result: $('duelCastStatus'),
  status: {phase: $('duelArenaPhase'), instruction: $('duelArenaInstruction'), result: $('duelArenaResult')}
});
const effects = createSpellEffects($('duelEffects'), cast => {
  const previousDummyHealth = health.dummy;
  const castToHitMs = Math.round(performance.now() - cast.launchedAt);
  const hit = health.hit(cast);
  if (!hit) return;
  dummyReactions.react(cast.shape, hit.defeated);
  renderHealth();
  logDuel('hit', {castId: cast.id, shape: cast.shape, score: cast.score,
    castToHitMs, damage: hit.damage, previousDummyHealth});
  if (health.defeated) {
    effects.cancelFlights();
    showDefeat();
    logDuel('defeat', {castId: cast.id});
  } else if (cast.id === lastCastId) $('duelCastStatus').textContent = `${cast.shape} hit the dummy · ${hit.damage} damage`;
});

function clearEffects(cause) {
  for (const cast of health.pending.values()) logDuel('cancel', {castId: cast.id, reason: cause});
  effects.clear();
  health.cancelFlights();
  dummyReactions.settle();
  lastCastId = null;
}

function renderHealth() {
  for (const [id, value] of [['duelPlayerHealth', health.player], ['duelDummyHealth', health.dummy]]) {
    $(id).max = MAX_HEALTH;
    $(id).value = value;
    $(id).textContent = `${value} of ${MAX_HEALTH}`;
    $(id + 'Text').textContent = `${value} / ${MAX_HEALTH}`;
  }
  $('duelHits').textContent = `${health.hits} ${health.hits === 1 ? 'hit' : 'hits'}`;
  $('duelDefeat').hidden = !health.defeated;
  $('duelDummyState').textContent = health.defeated ? 'Defeated' : 'Static · No return fire';
  document.querySelector('.duel-arena').classList.toggle('is-defeated', health.defeated);
}

function showDefeat() {
  $('duelCastStatus').textContent = 'Dummy defeated. Select Reset dummy.';
  $('duelResult').textContent = `${health.hits} hits · Dummy health: 0 / ${MAX_HEALTH}`;
}

$('duelResetDummy').addEventListener('click', () => {
  const previousDummyHealth = health.dummy;
  clearEffects('dummy_reset');
  health.resetDummy();
  dummyReactions.reset();
  renderHealth();
  resetNotice = true;
  syncControls();
  logDuel('reset', {previousDummyHealth});
});

function selectTab(tab, focus = false) {
  const duel = tab.id === 'duelTab';
  const previousTab = $('duelView').hidden ? 'practice' : 'duel';
  // Move the same video and overlay. Keep one stream, worker, and detector.
  if (duel) $('duelCameraMount').append(viewport);
  else practiceSlot.after(viewport);
  clearEffects('tab_change');
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !selected;
  }
  document.body.classList.toggle('duel-open', duel);
  if (duel) gestureMirror.start();
  else gestureMirror.stop();
  syncControls();
  if (previousTab !== (duel ? 'duel' : 'practice')) logDuel('tab_change', {previousTab});
  document.dispatchEvent(new CustomEvent('wizard:game-view', {detail: {view: duel ? 'duel' : 'practice'}}));
  if (focus) tab.focus();
}

// The menu reuses the existing tabs and camera without resetting either mode.
export function selectGameView(view) {
  selectTab($(view === 'duel' ? 'duelTab' : 'practiceTab'));
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
}
$('backToPractice').addEventListener('click', () => selectTab(tabs[0], true));

function copyText(from, to) {
  const text = $(from).textContent;
  if ($(to).textContent !== text) $(to).textContent = text;
}

function syncControls() {
  copyText('camera', 'duelCamera');
  $('duelCamera').disabled = $('camera').disabled;
  copyText('cameraState', 'duelCameraState');
  copyText('tracking', 'duelTracking');
  $('duelHand').value = $('hand').value;
  $('duelPoint').value = $('point').value;
  $('duelSwap').checked = $('swap').checked;
  if (health.defeated) { showDefeat(); return; }
  if (resetNotice) {
    $('duelCastStatus').textContent = 'Dummy reset. Hold still until READY.';
    $('duelResult').textContent = `Dummy health restored to ${MAX_HEALTH}.`;
    return;
  }
  $('duelResult').textContent = $('resultTag').textContent === 'CAST'
    ? `${$('lastShape').textContent} · ${$('score').textContent} match`
    : $('lastReason').textContent;
  if ($('resultTag').textContent !== 'CAST') {
    lastCastId = null;
    $('duelCastStatus').textContent = $('resultTag').textContent === 'Waiting'
      ? ($('camera').textContent === 'Stop camera' ? 'Hold still until READY. Draw one shape.' : 'Start the camera. Hold still until READY.')
      : $('lastReason').textContent;
  } else if (!lastCastId) $('duelCastStatus').textContent = `Last spell: ${$('lastShape').textContent}`;
}

// Use the existing handlers, including their cancellation and error behavior.
$('duelCamera').addEventListener('click', () => $('camera').click());
for (const [source, mirror] of [['hand', 'duelHand'], ['point', 'duelPoint'], ['swap', 'duelSwap']]) {
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
  if ($('trainingView').hidden || $('duelView').hidden || document.hidden) return;
  const shot = health.launch({...cast, launchedAt: performance.now()});
  if (!shot) return;
  resetNotice = false;
  lastCastId = cast.id;
  $('duelCastStatus').textContent = `${shot.shape} cast · ${shot.damage} damage`;
  effects.cast(shot);
  logDuel('cast', {castId: shot.id, shape: shot.shape, score: shot.score, damage: shot.damage});
});
$('reset').addEventListener('click', () => clearEffects('practice_reset'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearEffects('page_hidden'); gestureMirror.stop(); }
  else gestureMirror.start();
});
window.addEventListener('pagehide', () => { clearEffects('page_hidden'); gestureMirror.stop(); });
renderHealth();
syncControls();
logDuel('view_init');
