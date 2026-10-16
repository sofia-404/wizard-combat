import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareArena} from '../dist/presentation/arena-ready.js';
import {deferred, replaceGlobal} from './helpers/async.mjs';

function fixture(t) {
  const backgrounds = [], sprites = [], attributes = new Map();
  const background = {decode() {const request = deferred(); backgrounds.push(request); return request.promise;}};
  const sway = () => ({children:[], querySelector:() => null, closest:() => ({dataset:{}})});
  const player = sway(), dummy = sway();
  const arena = {dataset:{}, classList:{toggle(){}},
    setAttribute:(key, value) => attributes.set(key, value),
    querySelector:selector => ({'.arena-art':background, '.player-sway':player, '.dummy-sway':dummy})[selector],
    querySelectorAll:() => [{closest:() => null, matches:() => false, getAttribute:() => '/assets/practice-arena-wand.png'}]
  };
  replaceGlobal(t, 'Image', class {
    decode() {const request = deferred(); sprites.push(request); return request.promise;}
  });
  return {arena, attributes, backgrounds, sprites,
    finish(index, success) {
      backgrounds[index].resolve();
      if (success) sprites[index].resolve();
      else sprites[index].reject(Error('Sprite failed to decode'));
    }
  };
}
const stage = id => ({id, image:`/assets/${id}.jpg`, description:id});

for (const oldFirst of [true, false]) for (const oldSuccess of [true, false]) {
  test(`old image ${oldSuccess ? 'success' : 'failure'} cannot replace the new state (${oldFirst ? 'old' : 'new'} finishes first)`, async t => {
    const f = fixture(t);
    const old = prepareArena(f.arena, stage('old'));
    const latest = prepareArena(f.arena, stage('latest'));
    if (oldFirst) {
      f.finish(0, oldSuccess);
      assert.equal(await old, false);
      assert.equal(f.arena.dataset.artState, 'loading');
      assert.equal(f.attributes.get('aria-busy'), 'true');
    }
    f.finish(1, !oldSuccess);
    assert.equal(await latest, !oldSuccess);
    if (!oldFirst) {
      f.finish(0, oldSuccess);
      assert.equal(await old, false);
    }
    assert.equal(f.arena.dataset.stage, 'latest');
    assert.equal(f.arena.dataset.artState, oldSuccess ? 'failed' : 'ready');
    assert.equal(f.attributes.get('aria-busy'), 'false');
  });
}

test('a failed sprite can be retried for the same stage without reusing the failed load', async t => {
  const f = fixture(t), selected = stage('selected');
  const first = prepareArena(f.arena, selected);
  f.finish(0, false);
  assert.equal(await first, false);
  const retry = prepareArena(f.arena, selected);
  assert.equal(f.backgrounds.length, 2);
  assert.equal(f.arena.dataset.artState, 'loading');
  f.finish(1, true);
  assert.equal(await retry, true);
  assert.equal(f.arena.dataset.artState, 'ready');
});
