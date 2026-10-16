import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './helpers/load-module.mjs';
import {combatHarness} from './helpers/combat-harness.mjs';

async function training(t) {
  const f = combatHarness(t);
  const {node, document, effects, records} = f;
  let id = 0;
  const {input} = await loadModule('training-test-entry.js', {
    ...f.replacements,
    'training-test-entry.js':"import './spell-training.js'; export * as input from './input-state.js';"
  });
  input.updateInputState({camera:'Stop camera', cameraState:'Camera on', cameraDisabled:false});
  const outgoing = effects.get('spellTrainingEffects');
  return {...f, input, outgoing, incoming:effects.get('spellTrainingIncomingEffects'), records,
    get count(){return node('spellTrainingProgress').value;},
    get health(){return node('spellTrainingDummyHealth').value;},
    cast(shape) {
      const cast = {id:`cast-${++id}`, type:'cast', accepted:true, shape, score:95};
      document.dispatchEvent(new CustomEvent('wizard:spell-training-gesture', {detail:cast}));
      return cast;
    },
    select(spell) {node('spellTrainingSpell').value = spell; node('spellTrainingSpell').dispatchEvent(new Event('change'));},
  };
}

test('tracker recovery cancels a queued lesson spell without clearing earned progress', async t => {
  const f = await training(t);
  f.cast('Expelliarmus');
  assert.equal(f.count, 1);
  f.advance(800);
  f.cast('Confringo');
  const queued = f.cast('Expelliarmus');
  assert.ok(f.records.some(event => event.cause === 'cast_queued' && event.castId === queued.id));
  f.input.updateInputState({cameraState:'Switching to CPU…'});
  f.advance(2500);
  f.input.updateInputState({cameraState:'Camera on'});
  f.advance(100);
  assert.equal(f.count, 1, 'recovery preserves the attempt but does not release its old queue');
  assert.equal(f.outgoing.shots.some(shot => shot.id === queued.id), false);
  assert.equal(f.records.some(event => event.cause === 'cast' && event.castId === queued.id), false);
  f.cast('Expelliarmus');
  assert.equal(f.count, 2, 'fresh input works after recovery');
});

test('changing lessons during recovery cancels the old queue and rejects a late impact', async t => {
  const f = await training(t);
  f.cast('Confringo');
  const oldShot = f.outgoing.shots.at(-1);
  const oldQueue = f.cast('Expelliarmus');
  f.select('basic-cast');
  assert.equal(f.count, 0);
  const fresh = f.cast('Basic Cast');
  assert.equal(f.count, 0, 'the new lesson still waits for release recovery');
  f.outgoing.impact(oldShot);
  assert.equal(f.health, 200, 'the previous lesson cannot damage the restored target');
  f.advance(2000);
  assert.equal(f.count, 1);
  assert.equal(f.outgoing.shots.some(shot => shot.id === oldQueue.id), false);
  const freshShot = f.outgoing.shots.find(shot => shot.id === fresh.id);
  assert.ok(freshShot, 'the new lesson releases its own queued spell');
  f.advance(freshShot.flightMs);
  f.outgoing.impact(freshShot);
  assert.equal(f.health, 180, 'the current lesson can still apply damage');
  f.outgoing.impact(oldShot);
  assert.equal(f.health, 180);
  assert.equal(f.count, 1);
});

test('camera Stop clears active training progress and pending combat, then a fresh attempt works', async t => {
  const f = await training(t);
  f.select('protego');
  const waitForShot = () => {
    const before = f.incoming.shots.length;
    for (let elapsed = 0; elapsed < 10000 && f.incoming.shots.length === before; elapsed += 50) f.advance(50);
    assert.ok(f.incoming.shots.length > before, 'the real opponent must launch an attack');
    return f.incoming.shots.at(-1);
  };
  const first = waitForShot();
  f.cast('Protego');
  f.incoming.impact(first);
  assert.equal(f.count, 1, 'earn a block before stopping');
  const lateIncoming = waitForShot();
  f.cast('Confringo');
  const lateOutgoing = f.outgoing.shots.at(-1);
  assert.ok(lateOutgoing);
  const cleared = [f.incoming.clears, f.outgoing.clears];
  const cancelled = f.cancellations.length;
  f.input.updateInputState({camera:'Start camera', cameraState:'Camera stopped. Lesson stopped.', cameraDisabled:false});
  assert.equal(f.count, 0);
  assert.ok(f.incoming.clears > cleared[0]);
  assert.ok(f.outgoing.clears > cleared[1]);
  f.incoming.impact(lateIncoming);
  f.outgoing.impact(lateOutgoing);
  assert.deepEqual([f.node('spellTrainingPlayerHealth').value, f.health], [200, 200]);
  const shots = [f.incoming.shots.length, f.outgoing.shots.length];
  f.cast('Expelliarmus');
  f.advance(10000);
  assert.deepEqual([f.incoming.shots.length, f.outgoing.shots.length], shots);
  assert.equal(f.count, 0);
  f.input.updateInputState({camera:'Stop camera', cameraState:'Camera on', cameraDisabled:false});
  assert.equal(f.count, 0);
  assert.ok(f.cancellations.length > cancelled, 'a fresh lesson clears gesture capture');
  const fresh = waitForShot();
  f.cast('Protego');
  f.incoming.impact(fresh);
  assert.equal(f.count, 1, 'the new attempt can earn progress');
  assert.equal(f.node('spellTrainingPlayerHealth').value, 200);
});
