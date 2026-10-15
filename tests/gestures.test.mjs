import assert from 'node:assert/strict';
import test from 'node:test';
import {recognize, resample, GestureController} from '../dist/gesture.js';

const line = pairs => resample(pairs.map(([x, y]) => ({x, y})), 45);
const shapes = {
  Circle: Array.from({length: 60}, (_, i) => ({x: .45 + .15 * Math.cos(i / 59 * Math.PI * 2), y: .35 + .15 * Math.sin(i / 59 * Math.PI * 2)})),
  V: line([[.25, .2], [.4, .5], [.55, .2]]),
  Z: line([[.25, .2], [.55, .2], [.25, .5], [.55, .5]])
};
function capture(points, {step = 33, gapAt = -1, gapFrames = 0, stop = false} = {}) {
  const events = [], controller = new GestureController(event => events.push(event));
  let time = 0;
  const put = point => controller.update(point, time += step);
  for (let i = 0; i < 20; i++) put(points[0]);
  for (let i = 0; i < points.length; i++) {
    if (i === gapAt) for (let j = 0; j < gapFrames; j++) controller.missing(time += step);
    put(points[i]);
  }
  if (stop) controller.cancel('Camera stopped', 'camera_stopped');
  else for (let i = 0; i < 60; i++) put(points.at(-1));
  return events;
}
const casts = events => events.filter(event => event.type === 'cast');

for (const [shape, points] of Object.entries(shapes)) {
  test(`${shape}: one cast at three speeds and in both directions`, () => {
    for (const step of [22, 33, 50]) for (const reverse of [false, true]) {
      const path = reverse ? [...points].reverse() : points;
      assert.equal(recognize(path).shape, shape);
      const hits = casts(capture(path, {step}));
      assert.equal(hits.length, 1);
      assert.equal(hits[0].shape, shape);
    }
  });
  test(`${shape}: a short gap resumes; a long gap cancels`, () => {
    assert.equal(casts(capture(points, {gapAt: 20, gapFrames: 3})).length, 1);
    const events = capture(points.slice(0, 30), {gapAt: 20, gapFrames: 9});
    assert.equal(casts(events).length, 0);
    assert.ok(events.some(event => event.type === 'cancel' && event.diagnostics.endRule === 'loss'));
  });
  test(`${shape}: a manual stop cancels without a cast`, () => {
    const events = capture(points.slice(0, 25), {stop: true});
    assert.equal(casts(events).length, 0);
    assert.ok(events.some(event => event.type === 'cancel' && event.diagnostics.endRule === 'stop'));
  });
}
test('straight paths, a reflected Z, and a square do not cast', () => {
  for (const points of [
    line([[.2, .2], [.6, .2]]), line([[.2, .2], [.6, .6]]),
    shapes.Z.map(point => ({x: 1 - point.x, y: point.y})),
    line([[.2, .2], [.5, .2], [.5, .5], [.2, .5], [.2, .2]])
  ]) {
    assert.equal(recognize(points).accepted, false);
    assert.equal(casts(capture(points)).length, 0);
  }
});
test('a successful cast clears capture and requires a new hold', () => {
  const events = [], controller = new GestureController(event => events.push(event));
  let time = 0;
  const put = point => controller.update(point, time += 33);
  for (let i = 0; i < 20; i++) put(shapes.V[0]);
  shapes.V.forEach(put);
  for (let i = 0; i < 20 && !casts(events).length; i++) put(shapes.V.at(-1));
  assert.equal(casts(events).length, 1);
  assert.equal(controller.state, 'waiting');
  assert.equal(controller.path.length, 0);
});
