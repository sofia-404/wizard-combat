import {COMBAT_RULES} from './combat/rules.js';
import {createCombatStatus} from './presentation/combat-status.js';
import {createSpellEffects} from './practice-arena-effects.js';
import {PracticeArenaHealth, MAX_HEALTH} from './practice-arena-health.js';
import {renderHealthBars, listenForPlayerHits} from './presentation/health-view.js';
import {createDummyReactions, createPlayerReactions} from './practice-arena-reactions.js';
import {createGestureMirror} from './practice-arena-gesture.js';
import {createPracticeArenaDisarm} from './practice-arena-disarm.js';
import {record, toggleGameCamera, cancelGestureCapture} from './app.js';
import {createShieldView} from './presentation/shield-view.js';
import {createOpponentCharge} from './presentation/opponent-charge.js';
import {spellColor} from './presentation/spell-color.js';
import {createPracticeArenaEvents} from './presentation/practice-arena-events.js';
import {syncGameCamera} from './presentation/game-camera.js';

import {DuelFighter, DuelOpponent, duelDamage, applyDuelImpact} from './combat/solo-duel.js';

import {Rounds} from './combat/rounds.js';
import {createRoundView} from './presentation/round-view.js';

import {getInputState} from './input-state.js';
import {getSettings} from './settings.js';

// Each arena has its own combat state and uses the shared camera controller.
export function createArenaView(view, label) {
  const $ = id => document.getElementById(id.replace(/^practiceArena/, view));
  const arena = $('practiceArenaView').querySelector('.practice-arena');
  const events = createPracticeArenaEvents($('practiceArenaEvents'), $('practiceArenaEventsEmpty'));
  let previousCameraState = getInputState().cameraState;
  const opponent = view === 'soloDuel' ? new DuelOpponent() : null;
  const player = new DuelFighter();
  const target = opponent || new DuelFighter();
  const combatStatus = createCombatStatus($('practiceArenaCameraMount'), player);
  const targetName = opponent ? 'Opponent' : 'Dummy';
  const health = new PracticeArenaHealth({targetShield:opponent?.shield, ...(opponent ? {damageForCast:duelDamage} : {})});
  health.shield = player.shield;
  const rounds = new Rounds();
  const roundView = createRoundView(arena, targetName);
  let roundTick = null, pageHidden = false, chargeVisible = false, syncingRound = false;
  let wasReady = false, roundToken = 0, impactAt = 0, incomingImpactAt = 0, cueShown = false;

  function syncRound() {
    if (syncingRound) return;
    syncingRound = true;
    try {
      const ready = cameraReady();
      const previousPhase = rounds.phase, previousRound = rounds.number;
      rounds.update(performance.now(), ready);
      if (!ready && wasReady) clearEffects('round_paused');
      wasReady = ready;
      if (rounds.number !== previousRound) resetFighters();
      if (rounds.phase !== previousPhase) {
        cancelGestureCapture('Round changed. Hold still to begin.');
        if (rounds.phase === 'active') {
          events.add(`Round ${rounds.number}`, 'Fight');
          logPracticeArena('round_start', {reason:`Round ${rounds.number}`});
        }
      }
      roundView.render(rounds);
      const time = String(Math.ceil(rounds.timeRemaining / 1000));
      if ($('practiceArenaTimer').textContent !== time) $('practiceArenaTimer').textContent = time;
      if (ready && !rounds.over && roundTick === null) roundTick = setInterval(syncRound, 50);
      if (!ready || rounds.over) { clearInterval(roundTick); roundTick = null; }
      syncOpponent();
    } finally { syncingRound = false; }
  }

  const shieldView = createShieldView($('practiceArenaShield'), null, health.shield, {cx:295, cy:520, rx:260, ry:325});
  const opponentShieldView = opponent ? createShieldView($('practiceArenaOpponentShield'), null, opponent.shield, {cx:1420, cy:540, rx:260, ry:325}) : null;
  const opponentCharge = opponent ? createOpponentCharge($('practiceArenaDummyWand'), 0) : null;
  function logPracticeArena(cause, data = {}) {
    record({type: 'practiceArena', source: view, cause, playerHealth: health.player,
      dummyHealth: health.dummy, maxHealth: MAX_HEALTH, hits: health.hits, ...data});
  }
  const playerReactions = createPlayerReactions($('practiceArenaPlayerActor'));
  const dummyReactions = createDummyReactions($('practiceArenaDummyActor'), opponent ? 'Opponent' : 'Practice dummy');
  const dummyDisarm = createPracticeArenaDisarm($('practiceArenaDummyActor'), null, {dummy:target});
  const gestureMirror = createGestureMirror({
    source: $('overlay'), target: $('practiceArenaGesture'), video: $('video'), panel: $('practiceArenaView')
  });
  const incomingEffects = opponent ? createSpellEffects($('practiceArenaIncomingEffects'), cast => {
    if (!combatActive() || cast.roundToken !== roundToken) return;
    impactAt = incomingImpactAt = 0;
    document.dispatchEvent(new CustomEvent('wizard:player-hit', {detail:{view, ...cast}}));
  }, {start:{x:1348, y:534}, target:{x:295, y:520}, flightMs:cast => cast.flightMs, keepFlightTime:true}) : null;

  function cameraReady() {
    const input = getInputState();
    return !$('gameView').hidden && !$('practiceArenaView').hidden && !document.hidden && !pageHidden
      && input.camera === 'Stop camera' && input.cameraState === 'Camera on' && !input.cameraDisabled;
  }

  function combatActive() { return cameraReady() && rounds.active && !health.over; }

  function syncOpponent() {
    const now = performance.now(), active = combatActive();
    if (!active) player.cancelPending();
    else {
      const ready = player.update(now);
      if (ready) releasePlayerCast(ready);
    }
    combatStatus.render(now, active);
    if (!opponent) return;
    const action = opponent.update(now, {active, difficulty:getSettings().difficulty});
    const disarmed = opponent.disarmed;
    const preparation = opponent.defending?.noticed ? opponent.defending : opponent.preparing;
    if (preparation) {
      opponentCharge.refresh(preparation, now);
      chargeVisible = true;
    } else if (chargeVisible) {
      opponentCharge.clear();
      chargeVisible = false;
    }
    if (!active) {
      incomingEffects.clear();
    }
    if (health.over && opponent.shield.active(now)) {
      opponent.shield.reset();
      opponentShieldView.refresh();
    }
    if (action?.type === 'prepare-shield') {
      impactAt = incomingImpactAt;
      events.add('Opponent prepares Protego', 'Shield forming.');
      logPracticeArena('opponent_defend', {shape:'Protego'});
    } else if (action?.type === 'prepare') {
      impactAt = action.releaseAt + action.flightMs; cueShown = false;
      events.add(`Opponent prepares ${action.shape}`, 'Cast Protego before the spell hits.');
      logPracticeArena('opponent_prepare', {shape:action.shape});
    } else if (action?.type === 'shield') {
      opponentShieldView.refresh(spellColor('Protego'));
      events.add('Opponent cast Protego', 'Incoming spells blocked for 2 seconds.');
      logPracticeArena('opponent_shield', {shape:'Protego', duration:opponent.shield.expiresAt-now});
      document.dispatchEvent(new CustomEvent('wizard:opponent-cast', {detail:{...action, view}}));
    } else if (action?.type === 'cast') {
      const cast = {...action, id:crypto.randomUUID(), roundToken};
      impactAt = incomingImpactAt = now + cast.flightMs;
      incomingEffects.cast(cast);
      events.add(`Opponent cast ${action.shape}`, 'Incoming spell.');
      logPracticeArena('opponent_cast', {castId:cast.id, shape:cast.shape, damage:cast.damage});
      document.dispatchEvent(new CustomEvent('wizard:opponent-cast', {detail:{...cast, view}}));
    }
    const cue = active && impactAt > now && impactAt - now <= COMBAT_RULES.castCueMs;
    if (cue && !cueShown) { events.add('Cast Protego now', 'Incoming spell.'); cueShown = true; }
    const text = health.defeated ? 'Defeated' : !active ? '' : disarmed ? 'Disarmed'
      : cue ? 'Cast Protego now' : now < opponent.recoveryUntil ? `Recovering · ${((opponent.recoveryUntil-now)/1000).toFixed(1)} s`
      : opponent.defending?.noticed ? 'Preparing Protego' : opponent.preparing ? `Casting ${opponent.preparing.shape}` : opponent.shield.active(now) ? 'Protego active' : '';
    const state = $('practiceArenaDummyState');
    if (state.textContent !== text) state.textContent = text;
    if (state.hidden !== !text) state.hidden = !text;
    $('practiceArenaTracking').textContent = getInputState().tracking;
  }

  const effects = createSpellEffects($('practiceArenaEffects'), cast => {
    if (!combatActive() || cast.roundToken !== roundToken) return;
    const previousDummyHealth = health.dummy;
    const castToHitMs = Math.round(performance.now() - cast.launchedAt);
    const now = performance.now();
    const hit = health.hit(cast, now);
    if (!hit) return;
    const impact = applyDuelImpact(target, player, cast, hit, now);
    if (hit.blocked) {
      const perfect = impact.perfect;
      events.add(perfect ? 'Opponent perfect block' : 'Opponent blocked the spell', `${cast.shape} · 0 damage`);
      logPracticeArena('opponent_block', {castId:cast.id, shape:cast.shape, damage:0, reason:perfect ? 'perfect_block' : 'blocked'});
      syncOpponent();
      return;
    }
    document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail: {view, castId: cast.id, shape: cast.shape, ...hit}}));
    if (impact.disarmed) { impactAt = incomingImpactAt; dummyDisarm.refresh(); }
    dummyReactions.react(cast.shape, hit.defeated);
    renderHealth();
    logPracticeArena('hit', {castId: cast.id, shape: cast.shape, score: cast.score,
      castToHitMs, damage: hit.damage, previousDummyHealth});
    events.add(cast.shape, `${hit.damage} damage · ${cast.score}% precision`);
    if (health.defeated) {
      finishRound('player');
      logPracticeArena('defeat', {castId: cast.id});
    }
  }, opponent ? {flightMs:cast => cast.flightMs, keepFlightTime:true} : {});

  function clearEffects(cause) {
    for (const cast of health.pending.values()) logPracticeArena('cancel', {castId: cast.id, reason: cause});
    impactAt = incomingImpactAt = 0; cueShown = false;
    effects.clear();
    incomingEffects?.clear();
    opponent?.stop();
    player.cancelPending();
    opponentCharge?.clear();
    chargeVisible = false;
    health.cancelFlights();
    dummyReactions.settle();
    playerReactions.settle();
  }

  function renderHealth() {
    renderHealthBars(view, health);
    $('practiceArenaHits').textContent = `${health.hits} ${health.hits === 1 ? 'hit' : 'hits'}`;
    $('practiceArenaDefeat').hidden = !rounds.over;
    $('practiceArenaDefeat').querySelector('strong').textContent = `${rounds.winner === 'player' ? 'Player' : targetName} wins the match · ${rounds.wins.player}–${rounds.wins.opponent}`;
    syncCameraControl();
    $('practiceArenaDummyState').textContent = health.defeated ? 'Defeated' : '';
    $('practiceArenaDummyState').hidden = !health.defeated;
    arena.classList.toggle('is-defeated', health.defeated);
    arena.classList.toggle('is-player-defeated', health.playerDefeated);
    syncOpponent();
  }

  listenForPlayerHits(view, health, (hit, cast) => {
    const perfect = applyDuelImpact(player, target, cast, hit, performance.now()).perfect;
    if (perfect) impactAt = incomingImpactAt;
    renderHealth();
    events.add(perfect ? 'Perfect block' : hit.blocked ? 'Protego blocked the hit' : 'Player hit', `${hit.damage} damage`);
    logPracticeArena('player_hit', {damage:hit.damage, ...(opponent ? {castId:cast.id, shape:cast.shape || 'Basic Cast', reason:perfect ? 'perfect_block' : hit.blocked ? 'blocked' : 'hit'} : {})});
    if (hit.damage > 0) {
      if (opponent && !health.playerDefeated) playerReactions.react(cast.shape || 'Basic Cast');
      document.dispatchEvent(new CustomEvent('wizard:duel-hit', {detail:{view}}));
    }
    if (health.playerDefeated) {
      playerReactions.react('Basic Cast', true);
      finishRound('opponent');
      logPracticeArena('player_defeat');
    }
  }, cast => combatActive() && (cast.roundToken === undefined || cast.roundToken === roundToken));

  function finishRound(winner) {
    if (!rounds.finish(winner)) return;
    roundToken++;
    effects.cancelFlights();
    incomingEffects?.clear();
    health.cancelFlights();
    player.cancelPending();
    opponent?.stop();
    cancelGestureCapture('Round finished.');
    const name = winner === 'player' ? 'Player' : targetName;
    events.add(`${name} wins round ${rounds.number}`, `Round wins: ${rounds.wins.player}–${rounds.wins.opponent}`);
    logPracticeArena('round_end', {reason:`${name} wins round ${rounds.number}: ${rounds.wins.player}-${rounds.wins.opponent}`});
    if (rounds.over) {
      document.dispatchEvent(new CustomEvent('wizard:duel-defeat', {detail:{view, player:winner !== 'player'}}));
    }
    renderHealth();
    syncRound();
  }

  function resetFighters() {
    roundToken++;
    clearEffects('round_reset');
    target.reset();
    player.reset();
    health.resetDummy();
    health.resetPlayer();
    playerReactions.reset();
    dummyReactions.reset();
    dummyDisarm.reset();
    opponentShieldView?.refresh();
    shieldView.refresh();
    renderHealth();
  }

  $('practiceArenaResetDummy').addEventListener('click', () => {
    const restoreFocus = document.activeElement === $('practiceArenaResetDummy');
    const previousDummyHealth = health.dummy;
    rounds.reset();
    resetFighters();
    cancelGestureCapture('Match restarted.');
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
      active: !$('practiceArenaView').hidden, unavailable: rounds.over
    });
    if (hadFocus && button.hidden && !$('practiceArenaView').hidden) $('practiceArenaResetDummy').focus({preventScroll:true});
  }

  function syncControls() {
    syncCameraControl();
    copyText('tracking', 'practiceArenaTracking');
    syncRound();
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
    if (!combatActive() || syncingRound) return;
    if (detail.type === 'reject') events.add('Spell not cast', detail.reason);
    else if (detail.type === 'cancel' && !['camera_stopped', 'view_changed'].includes(detail.cause)) {
      events.add('Drawing cancelled', detail.reason);
    }
  });

  function releasePlayerCast(cast) {
    if (!combatActive()) return;
    const now = cast.launchedAt;
    if (cast.type === 'shield') {
      document.dispatchEvent(new CustomEvent('wizard:game-cast', {detail:{...cast, view}}));
      shieldView.refresh(spellColor(cast.shape));
      events.add(cast.shape, `0 damage · ${cast.score}% precision`);
      logPracticeArena('shield', {castId: cast.id, shape: cast.shape, score: cast.score, damage: 0,
        duration: health.shield.expiresAt-now});
      return;
    }
    const shot = health.launch({...cast, launchedAt: now, roundToken});
    if (!shot) return;
    opponent?.reactToAttack(shot.launchedAt, {
      active:combatActive(), difficulty:getSettings().difficulty, flightMs:shot.flightMs, id:shot.id
    });
    document.dispatchEvent(new CustomEvent('wizard:game-cast', {detail:{...shot, view}}));
    effects.cast(shot);
    logPracticeArena('cast', {castId: shot.id, shape: shot.shape, score: shot.score, damage: shot.damage});
  }

  document.addEventListener('wizard:cast', ({detail: cast}) => {
    if (!combatActive()) return;
    const result = player.submit(cast, performance.now());
    if (result.type === 'queued') {
      events.add('Spell ready', result.replaced ? 'Protego replaces the queued attack.' : `${cast.shape} will release after recovery.`);
      logPracticeArena('cast_queued', {castId:cast.id, shape:cast.shape, reason:result.replaced ? 'replaced_attack' : 'recovery'});
      if (result.replaced) logPracticeArena('queue_replaced', {castId:result.replaced, reason:'Protego takes priority'});
    } else if (result.type === 'rejected') {
      events.add('Spell not cast', result.reason);
      logPracticeArena('cast_rejected', {castId:cast.id, shape:cast.shape, reason:result.reason});
    }
    else releasePlayerCast(result);
    syncOpponent();
  });
  document.addEventListener('visibilitychange', () => {
    syncRound();
    shieldView.refresh();
    dummyDisarm.refresh();
    if (document.hidden) { clearEffects('page_hidden'); gestureMirror.stop(); }
    else gestureMirror.start();
    syncOpponent();
  });
  window.addEventListener('pagehide', () => { pageHidden = true; syncRound(); clearEffects('page_hidden'); gestureMirror.stop(); syncOpponent(); });
  window.addEventListener('pageshow', () => { pageHidden = false; syncRound(); dummyDisarm.refresh(); shieldView.refresh(); syncOpponent(); });
  renderHealth();
  syncControls();
  logPracticeArena('view_init');
  return {
    select(previousTab) {
      clearEffects('tab_change');
      dummyDisarm.refresh();
      shieldView.refresh();
      syncRound();
      if (!$('practiceArenaView').hidden) gestureMirror.start();
      else gestureMirror.stop();
      syncControls();
      if (view === 'practiceArena' || !$('practiceArenaView').hidden) logPracticeArena('tab_change', {previousTab});
      if (!$('practiceArenaView').hidden) document.dispatchEvent(new CustomEvent('wizard:duel-state', {detail:{view, over:rounds.over}}));
    }
  };
}
