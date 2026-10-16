import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../dist/tracker-worker.js', import.meta.url), 'utf8');

function worker({detect, load = async () => ({detectForVideo:detect})}) {
  const messages = [], self = {postMessage:message => messages.push(message)};
  // Run the actual worker entry point. Only the external detector is simulated.
  runInNewContext(source, {self, importScripts(){}, performance:{now:() => 100},
    Vision:{FilesetResolver:{forVisionTasks:async () => ({})}, HandLandmarker:{createFromOptions:load}}});
  return {messages, send:data => self.onmessage({data})};
}

test('worker forwards the captured timestamp and closes each bitmap after detection', async () => {
  const landmarks = [[{x:.2,y:.3}]], handedness = [[{categoryName:'Left'}]];
  let closed = 0, detected = 0;
  const bitmap = {close(){closed++;}};
  const w = worker({detect(image, time) {
    detected++;
    assert.equal(image, bitmap);
    assert.equal(time, 42);
    assert.equal(closed, 0);
    return {landmarks, handedness};
  }});
  await w.send({type:'init', delegate:'GPU'});
  await w.send({type:'frame', bitmap, t:42});
  assert.equal(detected, 1);
  assert.equal(closed, 1);
  assert.equal(w.messages[1].type, 'result');
  assert.equal(w.messages[1].t, 42);
  assert.equal(w.messages[1].landmarks, landmarks);
  assert.equal(w.messages[1].handedness, handedness);
});

test('worker closes a failed frame and can process the next frame', async () => {
  let attempts = 0, closed = 0;
  const w = worker({detect() {
    if (++attempts === 1) throw Error('Detection failed');
    return {landmarks:[], handedness:[]};
  }});
  await w.send({type:'init'});
  for (const t of [100, 133]) await w.send({type:'frame', t, bitmap:{close(){closed++;}}});
  assert.equal(closed, 2);
  assert.deepEqual(w.messages.map(message => message.type), ['ready', 'error', 'result']);
  assert.match(w.messages[1].message, /Detection failed/);
  assert.equal(w.messages[2].t, 133);
});

test('failed model initialization reports an error without reporting ready', async () => {
  const w = worker({load:async () => {throw Error('Model unavailable');}});
  await w.send({type:'init', delegate:'GPU'});
  assert.deepEqual(w.messages.map(message => message.type), ['error']);
  assert.match(w.messages[0].message, /Model unavailable/);
});
