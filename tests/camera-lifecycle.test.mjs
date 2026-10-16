import test from 'node:test';
import assert from 'node:assert/strict';
import {appHarness} from './helpers/app-harness.mjs';
import {deferred, settle} from './helpers/async.mjs';
import {resample} from '../dist/gesture.js';

test('repeated Start requests one stream; a stream arriving after Stop is released', async t => {
  const permission = deferred();
  const f = await appHarness(t, {getUserMedia:() => permission.promise});
  const starting = f.app.toggleGameCamera();
  await f.app.toggleGameCamera();
  assert.equal(f.permissionCalls, 1);
  f.app.stopGameCamera();
  permission.resolve(f.makeStream());
  await starting;
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.workers.length, 0);
  assert.equal(f.node('video').srcObject, null);
  assert.equal(f.state.cameraDisabled, false);
  assert.equal(f.state.camera, 'Start camera');
});

test('failed video playback releases the acquired stream and permits retry', async t => {
  let attempts = 0;
  const f = await appHarness(t, {play:async () => {if (++attempts === 1) throw Error('Playback failed');}});
  await f.app.toggleGameCamera();
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.node('video').srcObject, null);
  assert.equal(f.workers.length, 0);
  assert.equal(f.state.cameraDisabled, false);
  const retry = f.app.toggleGameCamera();
  await settle();
  f.workers[0].send({type:'ready'});
  await retry;
  assert.equal(f.state.cameraState, 'Camera on');
  assert.equal(f.tracks[1].stops, 0);
});

test('GPU load timeout falls back to CPU; a failed CPU load releases all resources', async t => {
  const f = await appHarness(t);
  const starting = f.app.toggleGameCamera();
  await settle();
  await f.advance(19999);
  assert.equal(f.workers.length, 1);
  await f.advance(1);
  assert.equal(f.workers[0].terminated, true);
  assert.equal(f.workers[1].messages[0].delegate, 'CPU');
  f.workers[1].send({type:'error', message:'CPU load failed'});
  await starting;
  assert.equal(f.workers[1].terminated, true);
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.state.camera, 'Start camera');
  assert.equal(f.state.cameraDisabled, false);
});

test('worker recovery ignores old results and Stop cancels a pending CPU recovery', async t => {
  const f = await appHarness(t);
  const starting = f.app.toggleGameCamera();
  await settle();
  const gpu = f.workers[0];
  gpu.send({type:'ready'});
  await starting;
  gpu.send({type:'error', message:'GPU lost'});
  await settle();
  assert.equal(gpu.terminated, true);
  const cpu = f.workers[1];
  assert.equal(cpu.messages[0].delegate, 'CPU');
  assert.equal(f.state.cameraState, 'Switching to CPU…');
  gpu.send({type:'ready'});
  gpu.send({type:'result', t:100, inference:1, landmarks:[]});
  assert.equal(f.state.cameraState, 'Switching to CPU…');
  assert.equal(f.state.tracking, 'Off');
  f.app.stopGameCamera();
  cpu.send({type:'ready'});
  await settle();
  assert.equal(cpu.terminated, true);
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.state.camera, 'Start camera');
  assert.equal(f.node('video').srcObject, null);
});

test('CPU recovery resumes frame capture and hand input, then disconnect stops capture', async t => {
  const f = await appHarness(t);
  const starting = f.app.toggleGameCamera();
  await settle();
  f.workers[0].send({type:'ready'});
  await starting;
  const gpu = f.workers[0];
  await f.frame(33, 1);
  assert.equal(gpu.messages.at(-1).type, 'frame');
  assert.equal(gpu.messages.at(-1).bitmap, f.bitmaps[0]);
  assert.equal(f.bitmaps[0].source, f.node('video'));
  // Lose the GPU while its frame is still pending.
  gpu.send({type:'error', message:'GPU lost'});
  const cpu = f.workers[1];
  await f.frame(33, 1);
  assert.equal(f.bitmaps.length, 1, 'capture pauses until the replacement is ready');
  assert.equal(cpu.messages.length, 1);
  cpu.send({type:'ready'});
  await settle();
  assert.equal(f.state.cameraState, 'Camera on');
  assert.equal(f.tracks[0].stops, 0);
  // The old worker's pending frame and video timestamp must not block recovery.
  await f.frame(33, 1);
  assert.equal(cpu.messages.at(-1).type, 'frame');
  assert.equal(cpu.messages.at(-1).bitmap, f.bitmaps[1]);
  assert.equal(gpu.messages.length, 2, 'the old worker receives no new frames');
  const points = Array.from({length:21}, (_, i) => ({x:.4 + (i % 5) * .01, y:.3 + Math.floor(i / 5) * .01}));
  const result = () => ({type:'result', t:cpu.messages.at(-1).t, inference:1,
    landmarks:[points], handedness:[[{categoryName:'Left', score:.9}]]});
  gpu.send(result());
  assert.equal(f.state.tracking, 'Off', 'old results remain ignored after CPU readiness');
  cpu.send(result());
  assert.equal(f.state.tracking, 'Left found');
  for (let i = 0; i < 8; i++) {
    const sent = cpu.messages.length;
    await f.frame();
    assert.equal(cpu.messages.length, sent + 1, 'each processed result permits the next frame');
    cpu.send(result());
  }
  await f.frame();
  assert.equal(f.node('phase').textContent, 'READY', 'recovered hand input reaches the real gesture controller');
  const captured = f.bitmaps.length, sent = cpu.messages.length;
  f.tracks[0].onended();
  assert.equal(cpu.terminated, true);
  assert.equal(f.tracks[0].stops, 1);
  assert.equal(f.state.cameraState, 'Camera disconnected');
  await f.frame();
  assert.equal(f.bitmaps.length, captured);
  assert.equal(cpu.messages.length, sent);
});

for (const action of ['stop', 'replace']) {
  test(`a bitmap completed after ${action} is closed once and never sent to a worker`, async t => {
    const pending = deferred();
    let created = 0;
    const f = await appHarness(t, {createBitmap:bitmap => ++created === 1 ? pending.promise : bitmap});
    const start = f.app.toggleGameCamera();
    await settle();
    const gpu = f.workers[0];
    gpu.send({type:'ready'}); await start;
    await f.frame();
    const late = f.bitmaps[0];
    assert.equal(gpu.messages.length, 1, 'bitmap creation is still pending');
    if (action === 'stop') {
      f.app.stopGameCamera();
    } else {
      gpu.send({type:'error', message:'GPU lost'});
      f.workers[1].send({type:'ready'});
      await settle();
    }
    pending.resolve(late);
    await settle();
    assert.equal(late.closed, 1);
    assert.equal(f.workers.some(worker => worker.messages.some(message => message.bitmap === late)), false);
    if (action === 'stop') {
      const restart = f.app.toggleGameCamera();
      await settle();
      f.workers[1].send({type:'ready'}); await restart;
    }
    await f.frame();
    const frame = f.workers[1].messages.at(-1);
    assert.equal(frame.type, 'frame');
    assert.equal(frame.bitmap, f.bitmaps[1]);
    assert.equal(frame.bitmap.closed, 0);
    assert.equal(late.closed, 1);
    f.app.stopGameCamera();
  });
}

for (const failure of ['stale_frame', 'worker_stall']) {
  test(`${failure} cancels the active stroke without a cast, then fresh input works`, async t => {
    const f = await appHarness(t), events = [];
    f.node('spellTrainingView').hidden = false;
    f.document.addEventListener('wizard:spell-training-gesture', ({detail}) => events.push(detail));
    const starting = f.app.toggleGameCamera();
    await settle();
    let worker = f.workers[0];
    worker.send({type:'ready'}); await starting;
    const path = resample([{x:.25,y:.2}, {x:.4,y:.5}, {x:.55,y:.2}], 45);
    const result = (point, time = f.now) => ({type:'result', t:time, inference:1,
      landmarks:[Array.from({length:21}, () => ({x:1-point.x, y:point.y * 4/3}))],
      handedness:[[{categoryName:'Left', score:.9}]]});
    const put = async point => {await f.frame(); worker.send(result(point));};
    for (let i = 0; i < 12; i++) await put(path[0]);
    for (const point of path.slice(0, 28)) await put(point);
    assert.equal(f.node('phase').textContent, 'DRAWING');
    if (failure === 'stale_frame') {
      worker.send(result(path[28], f.now - 351));
    } else {
      await f.frame(301);
    }
    assert.equal(events.filter(event => event.type === 'cast').length, 0);
    assert.deepEqual(events.filter(event => event.type === 'cancel').map(event => event.cause), [failure]);
    if (failure === 'worker_stall') {
      await f.frame(3200);
      assert.equal(worker.terminated, true);
      worker = f.workers[1];
      assert.equal(worker.messages[0].delegate, 'CPU');
      assert.equal(f.state.cameraState, 'Switching to CPU…');
      worker.send({type:'ready'}); await settle();
    }
    for (let i = 0; i < 12; i++) await put(path[0]);
    for (const point of path) await put(point);
    for (let i = 0; i < 20; i++) await put(path.at(-1));
    assert.deepEqual(events.filter(event => event.type === 'cast').map(event => event.shape), ['Basic Cast']);
    assert.equal(events.filter(event => event.type === 'cancel').length, 1);
    f.app.stopGameCamera();
  });
}
