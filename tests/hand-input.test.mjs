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
  assert.equal(input.select(frame(300, 'Right'), 'Left').cause, 'wrong_hand');
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
