import {createSpellEffects} from './practice-arena-effects.js';
import {PracticeArenaHealth, MAX_HEALTH} from './practice-arena-health.js';
import {renderHealthBars, listenForPlayerHits} from './presentation/health-view.js';
import {createDummyReactions, createPlayerReactions} from './practice-arena-reactions.js';
import {createGestureMirror} from './practice-arena-gesture.js';
import {createPracticeArenaDisarm} from './practice-arena-disarm.js';
import {record, toggleGameCamera} from './app.js';
import {createShieldView} from './presentation/shield-view.js';
import {createOpponentCharge} from './presentation/opponent-charge.js';
import {spellColor} from './presentation/spell-color.js';
import {createPracticeArenaEvents} from './presentation/practice-arena-events.js';
import {syncGameCamera} from './presentation/game-camera.js';

import {SoloOpponent, SOLO_RULES} from './combat/solo-opponent.js';

import {getInputState} from './input-state.js';
import {getSettings} from './settings.js';

// Each arena has its own combat state and uses the shared camera controller.
export function createArenaView(view, label) {
  const $ = id => document.getElementById(id.replace(/^practiceArena/, view));
  const arena = $('practiceArenaView').querySelector('.practice-arena');
  const events = createPracticeArenaEvents($('practiceArenaEvents'), $('practiceArenaEventsEmpty'));
  let previousCameraState = getInputState().cameraState;
  const opponent = view === 'soloDuel' ? new SoloOpponent() : null;
  const targetName = opponent ? 'Opponent' : 'Dummy';
  const health = new PracticeArenaHealth({targetShield:opponent?.shield});
  let opponentTick = null, pageHidden = false;
  let timeRemaining = 100000;
  let timerDeadline = null;
  let timerTick;
  function renderTimer() {
    if (timerDeadline !== null) timeRemaining = Math.max(0, timerDeadline - performance.now());
    const text = String(Math.ceil(timeRemaining / 1000));
    if ($('practiceArenaTimer').textContent !== text) $('practiceArenaTimer').textContent = text;
    if (!timeRemaining) { clearInterval(timerTick); timerDeadline = null; }
  }
  function pauseTimer() {
    renderTimer();
    clearInterval(timerTick);
    timerDeadline = null;
  }
  function syncTimer() {
    pauseTimer();
    if (!$('practiceArenaView').hidden && !document.hidden && !health.over && timeRemaining > 0) {
      timerDeadline = performance.now() + timeRemaining;
      timerTick = setInterval(renderTimer, 100);
    }
  }
  const shieldView = createShieldView($('practiceArenaShield'), null, health.shield, {cx:295, cy:520, rx:260, ry:325});
  const opponentShieldView = opponent ? createShieldView($('practiceArenaOpponentShield'), null, opponent.shield, {cx:1420, cy:540, rx:260, ry:325}) : null;
  const opponentCharge = opponent ? createOpponentCharge($('practiceArenaDummyWand'), SOLO_RULES.warningMs) : null;
  function logPracticeArena(cause, data = {}) {
    record({type: 'practiceArena', source: view, cause, playerHealth: health.player,
      dummyHealth: health.dummy, maxHealth: MAX_HEALTH, hits: health.hits, ...data});
  }
  const playerReactions = createPlayerReactions($('practiceArenaPlayerActor'));
  const dummyReactions = createDummyReactions($('practiceArenaDummyActor'), opponent ? 'Opponent' : 'Practice dummy');
  const dummyDisarm = createPracticeArenaDisarm($('practiceArenaDummyActor'), null);
  const gestureMirror = createGestureMirror({
    source: $('overlay'), target: $('practiceArenaGesture'), video: $('video'), panel: $('practiceArenaView')
  });
  const incomingEffects = opponent ? createSpellEffects($('practiceArenaIncomingEffects'), cast => {
    if (!opponentActive()) return;
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view, ...cast}}));
  }, {start:{x:1348, y:534}, target:{x:295, y:520}, flightMs:SOLO_RULES.flightMs, keepFlightTime:true}) : null;

  function opponentActive() {
    const input = getInputState();
    return !$('gameView').hidden && !$('practiceArenaView').hidden && !document.hidden && !pageHidden && !health.over
      && input.camera === 'Stop camera' && input.cameraState === 'Camera on' && !input.cameraDisabled;
  }

  function syncOpponent() {
    if (!opponent) return;
    const now = performance.now(), active = opponentActive();
    const disarmed = $('practiceArenaDummyActor').dataset.disarmed === 'true';
    const action = opponent.update(now, {active, disarmed, difficulty:getSettings().difficulty});
    opponentCharge.refresh(opponent.preparing, now);
    if (!active) {
      clearInterval(opponentTick);
      opponentTick = null;
      incomingEffects.clear();
    } else if (opponentTick === null) opponentTick = setInterval(syncOpponent, 50);
    if (health.over) opponent.shield.reset();
    opponentShieldView.refresh(spellColor('Protego'));
    if (action?.type === 'prepare') {
      events.add(`Opponent prepares ${action.shape}`, 'Cast Protego before the spell hits.');
      logPracticeArena('opponent_prepare', {shape:action.shape});
    } else if (action?.type === 'shield') {
      events.add('Opponent cast Protego', 'Incoming spells blocked for 3 seconds.');
      logPracticeArena('opponent_shield', {shape:'Protego', duration:opponent.shield.expiresAt-now});
      document.dispatchEvent(new CustomEvent('wizard:opponent-cast', {detail:{...action, view}}));
    } else if (action?.type === 'cast') {
      const cast = {id:crypto.randomUUID(), shape:action.shape, damage:action.damage, launchedAt:now};
      incomingEffects.cast(cast);
      events.add(`Opponent cast ${action.shape}`, 'Incoming spell.');
      logPracticeArena('opponent_cast', {castId:cast.id, shape:cast.shape, damage:cast.damage});
      document.dispatchEvent(new CustomEvent('wizard:opponent-cast', {detail:{...cast, view}}));
    }
    const text = health.defeated ? 'Defeated' : !active ? '' : disarmed ? 'Disarmed'
      : opponent.preparing ? `Casting ${opponent.preparing.shape}` : opponent.shield.active(now) ? 'Protego active' : '';
    $('practiceArenaDummyState').textContent = text;
    $('practiceArenaDummyState').hidden = !text;
  }

  const effects = createSpellEffects($('practiceArenaEffects'), cast => {
    const previousDummyHealth = health.dummy;
    const castToHitMs = Math.round(performance.now() - cast.launchedAt);
    const hit = health.hit(cast, performance.now());
    if (!hit) return;
    if (hit.blocked) {
      events.add('Opponent blocked the spell', `${cast.shape} · 0 damage`);
      logPracticeArena('opponent_block', {castId:cast.id, shape:cast.shape, damage:0});
      return;
    }
    document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail: {view, castId: cast.id, shape: cast.shape, ...hit}}));
    dummyDisarm.hit(cast);
    dummyReactions.react(cast.shape, hit.defeated);
    renderHealth();
    logPracticeArena('hit', {castId: cast.id, shape: cast.shape, score: cast.score,
      castToHitMs, damage: hit.damage, previousDummyHealth});
    events.add(cast.shape, `${hit.damage} damage · ${cast.score}% precision`);
    if (health.defeated) {
      pauseTimer();
      effects.cancelFlights();
      events.add(`${targetName} defeated`, `${health.hits} hits · Select Restart to continue.`);
      document.dispatchEvent(new CustomEvent('wizard:duel-defeat', {detail:{view}}));
      logPracticeArena('defeat', {castId: cast.id});
    }
  }, opponent ? {flightMs:SOLO_RULES.flightMs, keepFlightTime:true} : {});

  function clearEffects(cause) {
    for (const cast of health.pending.values()) logPracticeArena('cancel', {castId: cast.id, reason: cause});
    effects.clear();
    incomingEffects?.clear();
    opponent?.stop();
    opponentCharge?.clear();
    health.cancelFlights();
    dummyReactions.settle();
    playerReactions.settle();
  }

  function renderHealth() {
    renderHealthBars(view, health);
    $('practiceArenaHits').textContent = `${health.hits} ${health.hits === 1 ? 'hit' : 'hits'}`;
    $('practiceArenaDefeat').hidden = !health.over;
    $('practiceArenaDefeat').querySelector('strong').textContent = health.playerDefeated ? 'Player defeated' : `${targetName} defeated`;
    syncCameraControl();
    $('practiceArenaDummyState').textContent = health.defeated ? 'Defeated' : '';
    $('practiceArenaDummyState').hidden = !health.defeated;
    arena.classList.toggle('is-defeated', health.defeated);
    arena.classList.toggle('is-player-defeated', health.playerDefeated);
    syncOpponent();
  }

  listenForPlayerHits(view, health, (hit, cast) => {
    renderHealth();
    events.add(hit.blocked ? 'Protego blocked the hit' : 'Player hit', `${hit.damage} damage`);
    logPracticeArena('player_hit', {damage:hit.damage, ...(opponent ? {castId:cast.id, shape:cast.shape || 'Basic Cast', reason:hit.blocked ? 'blocked' : 'hit'} : {})});
    if (hit.damage > 0) {
      if (opponent && !health.playerDefeated) playerReactions.react(cast.shape || 'Basic Cast');
      document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail:{view}}));
    }
    if (health.playerDefeated) {
      playerReactions.react('Basic Cast', true);
      pauseTimer();
      effects.cancelFlights();
      events.add('Player defeated', 'Select Restart to continue.');
      document.dispatchEvent(new CustomEvent('wizard:duel-defeat', {detail:{view, player:true}}));
      logPracticeArena('player_defeat');
    }
  });

  $('practiceArenaResetDummy').addEventListener('click', () => {
    const restoreFocus = document.activeElement === $('practiceArenaResetDummy');
    const previousDummyHealth = health.dummy;
    clearEffects('dummy_reset');
    opponent?.reset();
    health.resetDummy();
    health.resetPlayer();
    playerReactions.reset();
    pauseTimer();
    timeRemaining = 100000;
    syncTimer();
    shieldView.refresh();
    dummyReactions.reset();
    dummyDisarm.reset();
    renderHealth();
    document.dispatchEvent(new CustomEvent('wizard:duel-reset', {detail:{view}}));
    events.clear();
    events.add(`${label} restarted`, `${targetName} health: ${MAX_HEALTH} / ${MAX_HEALTH}`);
    syncControls();
    if (restoreFocus) $('practiceArenaCamera').focus({preventScroll:true});
    logPracticeArena('reset', {previousDummyHealth});
  });

  function copyText(from, to) {
    const text = getInputState()[from];
    if ($(to).textContent !== text) $(to).textContent = text;
  }

  function syncCameraControl() {
    const button = $('practiceArenaCamera');
    const hadFocus = document.activeElement === button;
    syncGameCamera(button, arena, {
      active: !$('practiceArenaView').hidden, unavailable: health.over
    });
    if (hadFocus && button.hidden && !$('practiceArenaView').hidden) $('practiceArenaResetDummy').focus({preventScroll:true});
  }

  function syncControls() {
    syncCameraControl();
    copyText('tracking', 'practiceArenaTracking');
    syncOpponent();
  }

  $('practiceArenaCamera').addEventListener('click', toggleGameCamera);
  document.addEventListener('wizard:input-state', ({detail}) => {
    if (detail.changed.includes('cameraState')) {
      const state = getInputState().cameraState;
      const stopped = state.startsWith('Camera stopped');
      if (!$('practiceArenaView').hidden && (!stopped || previousCameraState === 'Camera on' || previousCameraState === 'Switching to CPU…')) {
        events.add(stopped ? 'Camera stopped' : state);
      }
      previousCameraState = state;
    }
    syncControls();
  });

  document.addEventListener('wizard:practice-arena-gesture', ({detail}) => {
    if ($('practiceArenaView').hidden || document.hidden) return;
    if (detail.type === 'reject') events.add('Spell not cast', detail.reason);
    else if (detail.type === 'cancel' && !['camera_stopped', 'view_changed'].includes(detail.cause)) {
      events.add('Drawing cancelled', detail.reason);
    }
  });

  document.addEventListener('wizard:cast', ({detail: cast}) => {
    if ($('gameView').hidden || $('practiceArenaView').hidden || document.hidden) return;
    const now = performance.now();
    if (health.protect(cast, now)) {
      document.dispatchEvent(new CustomEvent('wizard:game-cast', {detail:{...cast, view}}));
      shieldView.refresh(spellColor(cast.shape));
      events.add(cast.shape, `0 damage · ${cast.score}% precision`);
      logPracticeArena('shield', {castId: cast.id, shape: cast.shape, score: cast.score, damage: 0,
        duration: health.shield.expiresAt-now});
      return;
    }
    const shot = health.launch({...cast, launchedAt: performance.now()});
    if (!shot) return;
    opponent?.reactToAttack(shot.launchedAt, {
      active:opponentActive(), disarmed:$('practiceArenaDummyActor').dataset.disarmed === 'true',
      difficulty:getSettings().difficulty
    });
    document.dispatchEvent(new CustomEvent('wizard:game-cast', {detail:{...shot, view}}));
    effects.cast(shot);
    logPracticeArena('cast', {castId: shot.id, shape: shot.shape, score: shot.score, damage: shot.damage});
  });
  document.addEventListener('visibilitychange', () => {
    syncTimer();
    shieldView.refresh();
    dummyDisarm.refresh();
    if (document.hidden) { clearEffects('page_hidden'); gestureMirror.stop(); }
    else gestureMirror.start();
    syncOpponent();
  });
  window.addEventListener('pagehide', () => { pageHidden = true; pauseTimer(); clearEffects('page_hidden'); gestureMirror.stop(); syncOpponent(); });
  window.addEventListener('pageshow', () => { pageHidden = false; syncTimer(); dummyDisarm.refresh(); shieldView.refresh(); syncOpponent(); });
  renderHealth();
  syncControls();
  logPracticeArena('view_init');
  return {
    select(previousTab) {
      clearEffects('tab_change');
      dummyDisarm.refresh();
      shieldView.refresh();
      syncTimer();
      if (!$('practiceArenaView').hidden) gestureMirror.start();
      else gestureMirror.stop();
      syncControls();
      if (view === 'practiceArena' || !$('practiceArenaView').hidden) logPracticeArena('tab_change', {previousTab});
      if (!$('practiceArenaView').hidden) document.dispatchEvent(new CustomEvent('wizard:duel-state', {detail:{view, over:health.over}}));
    }
  };
}
