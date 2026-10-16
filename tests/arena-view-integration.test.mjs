import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './helpers/load-module.mjs';
import {combatHarness} from './helpers/combat-harness.mjs';

test('old incoming and outgoing impacts cannot damage the next round or award a second win', async t => {
  const f = combatHarness(t);
  // Disable random defense so this test controls when damage happens.
  t.mock.method(Math, 'random', () => .99);
  const {createArenaView, input} = await loadModule('arena-test-entry.js', {
    ...f.replacements,
    'arena-test-entry.js':"export {createArenaView} from './arena-view.js'; export * as input from './input-state.js';"
  });
  const send = (type, detail) => f.document.dispatchEvent(new CustomEvent(type, {detail}));
  const defeats = [];
  f.document.addEventListener('wizard:duel-defeat', ({detail}) => defeats.push(detail));
  createArenaView('soloDuel', 'Solo Duel');
  input.updateInputState({camera:'Stop camera', cameraState:'Camera on', cameraDisabled:false});
  f.advance(2000);
  const arena = f.node('soloDuelView').querySelector('.practice-arena');
  assert.equal(arena.dataset.roundPhase, 'active');
  const incoming = f.effects.get('soloDuelIncomingEffects'), outgoing = f.effects.get('soloDuelEffects');
  const waitForShot = () => {
    const before = incoming.shots.length;
    for (let elapsed = 0; elapsed < 10000 && incoming.shots.length === before; elapsed += 50) f.advance(50);
    assert.ok(incoming.shots.length > before);
    return incoming.shots.at(-1);
  };
  const cast = id => send('wizard:cast', {id, type:'cast', accepted:true, shape:'Basic Cast', score:95});
  const hit = (id, roundToken) => send('wizard:player-hit', {view:'soloDuel', id, damage:200, roundToken});
  const health = () => [f.node('soloDuelPlayerHealth').value, f.node('soloDuelDummyHealth').value];
  const ends = () => f.records.filter(event => event.cause === 'round_end');
  const oldIncoming = waitForShot();
  cast('old-outgoing');
  const oldOutgoing = outgoing.shots.at(-1);
  assert.ok(oldOutgoing);
  hit('first-loss', oldIncoming.roundToken);
  assert.equal(arena.dataset.roundPhase, 'result');
  assert.equal(ends().length, 1);
  assert.equal(defeats.length, 0, 'one lost round is not a lost match');
  hit('duplicate-loss', oldIncoming.roundToken);
  incoming.impact(oldIncoming);
  outgoing.impact(oldOutgoing);
  assert.equal(ends().length, 1);
  f.advance(4000);
  assert.deepEqual([arena.dataset.round, arena.dataset.roundPhase], ['2', 'active']);
  assert.deepEqual(health(), [200, 200]);
  incoming.impact(oldIncoming);
  hit('late-old-round', oldIncoming.roundToken);
  outgoing.impact(oldOutgoing);
  assert.deepEqual(health(), [200, 200], 'all three old delivery paths reject the previous round');
  assert.equal(ends().length, 1);
  cast('fresh-outgoing');
  const freshOutgoing = outgoing.shots.at(-1);
  assert.equal(freshOutgoing.id, 'fresh-outgoing');
  f.advance(freshOutgoing.flightMs);
  outgoing.impact(freshOutgoing);
  assert.equal(health()[1], 180, 'current-round outgoing hits still work');
  const freshIncoming = waitForShot();
  assert.notEqual(freshIncoming.roundToken, oldIncoming.roundToken);
  incoming.impact(freshIncoming);
  assert.equal(health()[0], 200 - freshIncoming.damage, 'current-round incoming hits still work');
  hit('second-loss', freshIncoming.roundToken);
  hit('repeat-second-loss', freshIncoming.roundToken);
  assert.equal(arena.dataset.roundPhase, 'complete');
  assert.equal(ends().length, 2);
  assert.deepEqual(defeats, [{view:'soloDuel', player:true}]);
  assert.equal(arena.querySelector('.combatant-dummy').children.at(-1).getAttribute('aria-label'), 'Opponent: 2 of 2 round wins');
});
