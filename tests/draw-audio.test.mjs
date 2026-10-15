import assert from 'node:assert/strict';
import test from 'node:test';
import {trailLevel} from '../dist/draw-audio.js';

test('stroke trail level follows fingertip speed within 0 to 1', () => {
  assert.equal(trailLevel(0), 0);
  assert.equal(trailLevel(.05), 0, 'tiny hand tremor stays silent');
  assert.ok(trailLevel(.3) > 0 && trailLevel(.3) < trailLevel(.6));
  assert.equal(trailLevel(.65), 1);
  assert.equal(trailLevel(5), 1, 'fast strokes do not get louder than the limit');
  assert.equal(trailLevel(Number.NaN), 0);
});
