import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as realTimeout, clearTimeout as clearRealTimeout} from 'node:timers';
import {appHarness} from './helpers/app-harness.mjs';
import {deferred, settle} from './helpers/async.mjs';

test('an image retry preserves queue order without resending the saved event', async t => {
  const image = deferred();
  let images = 0;
  const f = await appHarness(t, {post:async url => {
    if (url === '/api/results' && ++images === 1) return image.promise;
    return {ok:true};
  }});
  f.app.record({id:'first', type:'cast'}, 'image-data');
  await settle();
  f.app.record({id:'second', type:'tracking'});
  assert.deepEqual(f.requests.map(item => [item.url, item.data.id]), [
    ['/api/events', 'first'], ['/api/results', 'first']
  ]);
  image.resolve({ok:false});
  await settle();
  assert.match(f.state.saveStatus, /Save failed/);
  await f.advance(5000);
  assert.deepEqual(f.requests.map(item => [item.url, item.data.id]), [
    ['/api/events', 'first'], ['/api/results', 'first'], ['/api/results', 'first'], ['/api/events', 'second']
  ]);
  assert.equal(f.requests[1].data.png, f.requests[2].data.png);
  assert.equal(f.requests[0].data.session, f.requests[3].data.session);
  assert.equal(f.state.saveStatus, 'Saved on this laptop');
  await f.advance(5000);
  assert.equal(f.requests.length, 4, 'successful records leave the queue');
});

test('a timed-out event remains first in the queue and blocks its image until retry succeeds', async t => {
  // Node's native AbortSignal timeout uses real time, outside the mocked retry clock.
  const timeout = t.mock.method(AbortSignal, 'timeout');
  let signal;
  let posts = 0;
  const f = await appHarness(t, {post:async (url, options) => {
    if (++posts !== 1) return {ok:true};
    signal = options.signal;
    return new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), {once:true});
    });
  }});
  f.app.record({id:'first', type:'cast'}, 'image-data');
  f.app.record({id:'second', type:'tracking'});
  assert.equal(f.requests.length, 1, 'only one flush runs at a time');
  assert.ok(signal instanceof AbortSignal, 'the pending request must receive an abort signal');
  assert.equal(signal.aborted, false);
  assert.deepEqual(timeout.mock.calls[0].arguments, [4000], 'saving has a four-second deadline');
  assert.equal(f.state.saveStatus, 'Saving locally…');
  await new Promise((resolve, reject) => {
    const guard = realTimeout(() => reject(Error('The request did not abort')), 6000);
    signal.addEventListener('abort', () => {clearRealTimeout(guard); resolve();}, {once:true});
  });
  await settle();
  assert.equal(signal.reason.name, 'TimeoutError');
  assert.match(f.state.saveStatus, /Save failed/);
  assert.equal(f.requests.length, 1, 'the image and next event remain blocked until retry');
  await f.advance(5000);
  assert.deepEqual(f.requests.map(item => [item.url, item.data.id]), [
    ['/api/events', 'first'], ['/api/events', 'first'], ['/api/results', 'first'], ['/api/events', 'second']
  ]);
  assert.deepEqual(f.requests[0].data, f.requests[1].data, 'retry keeps the original event and ID');
  assert.equal(f.state.saveStatus, 'Saved on this laptop');
});
