import assert from 'node:assert/strict';
import test from 'node:test';
import {HandInput} from '../dist/hand-input.js';

const points = Array.from({length: 21}, (_, i) => ({x: .4 + (i % 5) * .01, y: .3 + Math.floor(i / 5) * .01}));
const frame = (t, label = 'Left', landmarks = [points]) => ({
  t, landmarks, handedness: landmarks.map(() => [{categoryName: label, score: .9}])
});

test('selects either drawing hand without reversing detector labels', () => {
  const right = points.map(p => ({...p, x: p.x + .3}));
  const data = {t: 0, landmarks: [points, right], handedness: [
    [{categoryName: 'Left', score: .9}], [{categoryName: 'Right', score: .9}]
  ]};
  for (const [hand, expected] of [['Left', points], ['Right', right]]) {
    const selected = new HandInput().select(data, hand);
    assert.equal(selected.cause, 'tracked');
    assert.equal(selected.points, expected);
    const opposite = hand === 'Left' ? 'Right' : 'Left';
    assert.equal(new HandInput().select(frame(0, opposite), hand).cause, 'wrong_hand');
  }
});
test('keeps fingertip and wand-grip tracking points', () => {
  const input = new HandInput();
  input.select(frame(0), 'Left');
  assert.deepEqual(input.point, points[8]);
  input.reset();
  input.select(frame(0), 'Left', 'grip');
  assert.deepEqual(input.point, {x: (points[5].x + points[9].x) / 2, y: (points[5].y + points[9].y) / 2});
});
test('holds a brief label change but rejects a longer change', () => {
  const input = new HandInput();
  input.select(frame(0), 'Left');
  assert.equal(input.select(frame(33, 'Right'), 'Left').cause, 'label_hold');
  // Keep frames close together to isolate label expiry from loss of the lock.
  for (const t of [100, 200, 249, 250]) {
    assert.equal(input.select(frame(t, 'Right'), 'Left').cause, 'label_hold', `at ${t} ms`);
  }
  assert.equal(input.select(frame(251, 'Right'), 'Left').cause, 'wrong_hand');
  assert.equal(input.select(frame(284), 'Left').cause, 'tracked');
  assert.equal(input.select(frame(500, 'Right'), 'Left').cause, 'label_hold', 'correct label renews the grace period');
});

test('a hand can be reacquired at a new position after tracking loss or reset', () => {
  const moved = points.map(point => ({...point, x:point.x + .4}));
  for (const reset of [false, true]) {
    const input = new HandInput();
    input.select(frame(0), 'Left');
    assert.equal(input.select(frame(33, 'Left', [moved])).cause, 'hand_jump');
    if (reset) input.reset();
    else assert.equal(input.select(frame(200, 'Left', [])).cause, 'no_hand');
    const selected = input.select(frame(reset ? 66 : 261, 'Left', [moved]), 'Left');
    assert.equal(selected.cause, 'tracked');
    assert.equal(selected.selectionRule, 'label');
    assert.equal(selected.points, moved);
  }
});

test('duplicate confidence and order do not switch an acquired hand away from its motion', () => {
  const shifted = points.map(point => ({...point, x:point.x + .005}));
  for (const reverse of [false, true]) {
    const candidates = [{points, score:.7}, {points:shifted, score:.99}];
    if (reverse) candidates.reverse();
    const data = {t:33, landmarks:candidates.map(item => item.points),
      handedness:candidates.map(item => [{categoryName:'Left', score:item.score}])};
    assert.equal(new HandInput().select(data, 'Left').points, shifted, 'acquire the stronger label');
    const input = new HandInput();
    input.select(frame(0), 'Left');
    const selected = input.select(data, 'Left');
    assert.equal(selected.points, points, 'keep the motion match after acquisition');
    assert.equal(selected.duplicateHands, 1);
  }
});
test('combines duplicate detections of the same hand', () => {
  const selected = new HandInput().select(frame(0, 'Left', [points, points]), 'Left');
  assert.equal(selected.cause, 'tracked');
  assert.equal(selected.duplicateHands, 1);
  assert.equal(selected.uniqueHands, 1);
});
test('reports missing and invalid hand points', () => {
  const input = new HandInput();
  assert.equal(input.select(frame(0, 'Left', []), 'Left').cause, 'no_hand');
  assert.equal(input.select(frame(33, 'Left', [[{x: NaN, y: 0}]]), 'Left').cause, 'invalid_points');
});
