import assert from 'node:assert/strict';
import test from 'node:test';
import {HandInput} from '../dist/hand-input.js';

const points = Array.from({length: 21}, (_, i) => ({x: .4 + (i % 5) * .01, y: .3 + Math.floor(i / 5) * .01}));
const frame = (t, label = 'Left', landmarks = [points]) => ({
  t, landmarks, handedness: landmarks.map(() => [{categoryName: label, score: .9}])
});

test('selects the requested hand and supports swapped labels', () => {
  const input = new HandInput();
  assert.equal(input.select(frame(0), 'Left').cause, 'tracked');
  input.reset();
  assert.equal(input.select(frame(0, 'Right'), 'Left').cause, 'wrong_hand');
  assert.equal(input.select(frame(33, 'Right'), 'Left', true).cause, 'tracked');
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
