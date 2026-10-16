import assert from 'node:assert/strict';
import test from 'node:test';
import {recognize, resample, GestureController} from '../dist/gesture.js';

const line = pairs => resample(pairs.map(([x, y]) => ({x, y})), 45);
const shapes = {
  Protego: Array.from({length: 60}, (_, i) => ({x: .45 + .15 * Math.cos(i / 59 * Math.PI * 2), y: .35 + .15 * Math.sin(i / 59 * Math.PI * 2)})),
  'Basic Cast': line([[.25, .2], [.4, .5], [.55, .2]]),
  Confringo: line([[.25, .2], [.55, .2], [.25, .5], [.55, .5]])
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
test('straight paths, a reflected Confringo, and a square do not cast', () => {
  for (const points of [
    line([[.2, .2], [.6, .2]]), line([[.2, .2], [.6, .6]]),
    shapes.Confringo.map(point => ({x: 1 - point.x, y: point.y})),
    line([[.2, .2], [.5, .2], [.5, .5], [.2, .5], [.2, .2]])
  ]) {
    assert.equal(recognize(points).accepted, false);
    assert.equal(casts(capture(points)).length, 0);
  }
});
test('a successful cast clears capture and is ready for the next shape', () => {
  const events = [], controller = new GestureController(event => events.push(event));
  let time = 0;
  const put = point => controller.update(point, time += 33);
  for (let i = 0; i < 20; i++) put(shapes['Basic Cast'][0]);
  shapes['Basic Cast'].forEach(put);
  for (let i = 0; i < 20 && !casts(events).length; i++) put(shapes['Basic Cast'].at(-1));
  assert.equal(casts(events).length, 1);
  assert.equal(controller.state, 'ready');
  assert.equal(controller.path.length, 0);
});

test('a continuous hold becomes ready at 260 ms, not one frame early', () => {
  const events = [], controller = new GestureController(event => events.push(event));
  const point = {x:.3, y:.3};
  for (const time of [0, 65, 130, 195, 259]) controller.update(point, time);
  assert.equal(controller.state, 'waiting');
  controller.update(point, 260);
  assert.equal(controller.state, 'ready');
  controller.update(point, 261);
  assert.equal(controller.state, 'ready');
  assert.equal(events.length, 0, 'a hold alone is not a spell');
});

for (const gap of [200, 201]) {
  test(`a ${gap} ms gap ${gap <= 200 ? 'resumes' : 'cancels'} the current drawing`, () => {
    const events = [], controller = new GestureController(event => events.push(event));
    const points = shapes['Basic Cast'];
    let now = 0;
    const put = point => controller.update(point, now += 33);
    for (let i = 0; i < 12; i++) put(points[0]);
    points.slice(0, 28).forEach(put);
    assert.equal(controller.state, 'drawing');
    controller.missing(now + 50);
    now += gap;
    controller.update(points[27], now);
    if (gap <= 200) {
      assert.equal(controller.state, 'drawing');
      points.slice(28).forEach(put);
      for (let i = 0; i < 20; i++) put(points.at(-1));
      assert.equal(casts(events).length, 1);
      assert.equal(casts(events)[0].shape, 'Basic Cast');
      assert.equal(casts(events)[0].diagnostics.gapResumes, 1);
      assert.equal(events.filter(event => event.type === 'cancel').length, 0);
    } else {
      assert.equal(controller.state, 'waiting');
      assert.equal(events.filter(event => event.type === 'cancel').length, 1);
      assert.equal(casts(events).length, 0);
      for (let i = 0; i < 12; i++) put(points[0]);
      points.forEach(put);
      for (let i = 0; i < 20; i++) put(points.at(-1));
      assert.equal(casts(events).length, 1, 'a fresh drawing works after cancellation');
    }
  });
}
