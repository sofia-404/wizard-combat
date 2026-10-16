import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpellEffects} from '../dist/practice-arena-effects.js';
import {replaceGlobal} from './helpers/async.mjs';
import {element} from './helpers/combat-harness.mjs';

for (const reduced of [false, true]) {
  test(`projectiles hit once at flight time and cancel safely (${reduced ? 'reduced' : 'normal'} motion)`, t => {
    let now = 0, id = 0;
    const frames = new Map(), hits = [], svg = element('practiceArenaEffects');
    for (const [name, value] of Object.entries({
      document:{createElementNS:() => element()}, performance:{now:() => now},
      matchMedia:() => ({matches:reduced}),
      requestAnimationFrame:callback => {frames.set(++id, callback); return id;},
      cancelAnimationFrame:id => frames.delete(id)
    })) replaceGlobal(t, name, value);
    const effects = createSpellEffects(svg, cast => hits.push(cast.id));
    const frame = time => {
      now = time;
      const callbacks = [...frames.values()]; frames.clear();
      for (const callback of callbacks) callback(now);
    };
    const cast = id => effects.cast({id, shape:'Basic Cast'});
    cast('first');
    frame(999);
    assert.deepEqual(hits, [], 'reduced motion must not apply early damage');
    frame(1000);
    assert.deepEqual(hits, ['first']);
    frame(1400);
    assert.deepEqual(hits, ['first'], 'later animation frames cannot repeat an impact');
    cast('cancelled-flight');
    effects.cancelFlights();
    assert.equal(svg.children.length, 1, 'the existing impact may finish after flights are cancelled');
    frame(3000);
    assert.deepEqual(hits, ['first']);
    assert.equal(svg.children.length, 0);
    cast('cleared-flight');
    const lateFrame = [...frames.values()][0];
    effects.clear();
    assert.equal(frames.size, 0);
    assert.equal(svg.children.length, 0);
    now = 5000; lateFrame(now);
    assert.deepEqual(hits, ['first'], 'an already queued callback cannot revive a cleared flight');
    cast('fresh');
    frame(6500);
    frame(8000);
    assert.deepEqual(hits, ['first', 'fresh'], 'delayed frames hit once and new casts work after clear');
    assert.equal(frames.size, 0);
    assert.equal(svg.children.length, 0);
  });
}
