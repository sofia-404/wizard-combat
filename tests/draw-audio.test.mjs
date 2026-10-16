import assert from 'node:assert/strict';
import test from 'node:test';
import {trailLevel, createDrawAudio} from '../dist/draw-audio.js';
import {deferred, replaceGlobal, settle} from './helpers/async.mjs';

test('stroke trail level follows fingertip speed within 0 to 1', () => {
  assert.equal(trailLevel(0), 0);
  assert.equal(trailLevel(.05), 0, 'tiny hand tremor stays silent');
  assert.ok(trailLevel(.3) > 0 && trailLevel(.3) < trailLevel(.6));
  assert.equal(trailLevel(.65), 1);
  assert.equal(trailLevel(5), 1, 'fast strokes do not get louder than the limit');
  assert.equal(trailLevel(Number.NaN), 0);
});

function loadingAudio(t, fetchSound) {
  const document = new EventTarget(), window = new EventTarget();
  document.hidden = false;
  const decode = deferred();
  const calls = {contexts:0, sources:0, starts:0, decodes:0, gain:0};
  let context;
  class AudioContext {
    constructor() {calls.contexts++; context = this; this.state = 'running'; this.currentTime = 0;}
    resume() {this.state = 'running'; return Promise.resolve();}
    suspend() {this.state = 'suspended'; return Promise.resolve();}
    decodeAudioData() {calls.decodes++; return decode.promise;}
    createGain() {return {connect(){}, gain:{value:0, cancelScheduledValues(){},
      setValueAtTime(value){calls.gain = value;}, setTargetAtTime(value){calls.gain = value;}}};}
    createBufferSource() {calls.sources++; return {connect(){}, start(){calls.starts++;}, playbackRate:{setTargetAtTime(){}}};}
  }
  window.AudioContext = AudioContext;
  for (const [name, value] of Object.entries({document, window, AudioContext, fetch:fetchSound})) replaceGlobal(t, name, value);
  const audio = createDrawAudio(() => ({sfx:true, sfxVolume:35, muted:false}));
  return {document, window, audio, decode, calls, get context(){return context;}};
}

test('pointer and keyboard unlock share one pending audio load; late decode stays silent after stop', async t => {
  let fetches = 0;
  const f = loadingAudio(t, async () => {fetches++; return {arrayBuffer:async () => new ArrayBuffer(0)};});
  f.document.dispatchEvent(new Event('pointerdown'));
  f.document.dispatchEvent(new Event('keydown'));
  await settle();
  assert.equal(fetches, 1);
  assert.equal(f.calls.contexts, 1);
  assert.equal(f.calls.decodes, 1);
  f.audio.stop();
  f.document.hidden = true;
  f.decode.resolve({});
  await settle();
  assert.equal(f.calls.sources, 1);
  assert.equal(f.calls.starts, 1);
  assert.equal(f.calls.gain, 0);
  assert.equal(f.context.state, 'suspended');
  f.document.hidden = false;
  f.audio.update(true, .65);
  assert.ok(f.calls.gain > 0, 'later drawing can use the decoded sound');
  assert.equal(f.context.state, 'running');
});

test('a failed sound request can retry on the next unlock event', async t => {
  let fetches = 0;
  const f = loadingAudio(t, async () => {
    if (++fetches === 1) throw Error('Sound unavailable');
    return {arrayBuffer:async () => new ArrayBuffer(0)};
  });
  f.document.dispatchEvent(new Event('pointerdown'));
  await settle();
  assert.equal(f.calls.sources, 0);
  f.audio.update(true, .65);
  assert.equal(f.calls.gain, 0);
  f.document.dispatchEvent(new Event('keydown'));
  await settle();
  f.decode.resolve({});
  await settle();
  f.audio.update(true, .65);
  assert.equal(fetches, 2);
  assert.equal(f.calls.contexts, 1);
  assert.equal(f.calls.sources, 1);
  assert.ok(f.calls.gain > 0);
});

test('drawing audio stops without another animation frame and can restart', async t => {
  const mockGlobal = (name, value) => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {value, configurable:true, writable:true});
    t.after(() => {if(saved)Object.defineProperty(globalThis, name, saved);else delete globalThis[name];});
  };
  const document = new EventTarget(), window = new EventTarget();
  document.hidden = false;
  let context, level = 0;
  class AudioContext {
    constructor() { context = this; this.state = 'running'; this.currentTime = 0; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
    createGain() { return {connect(){}, gain:{value:0, cancelScheduledValues(){},
      setValueAtTime(value){level=value;}, setTargetAtTime(value){level=value;}}}; }
    createBufferSource() { return {connect(){}, start(){}, playbackRate:{setTargetAtTime(){}}}; }
  }
  window.AudioContext = AudioContext;
  mockGlobal('document', document); mockGlobal('window', window);
  mockGlobal('AudioContext', AudioContext);
  mockGlobal('fetch', async () => ({arrayBuffer:async () => new ArrayBuffer(0)}));
  const settings = {sfx:true, sfxVolume:35, muted:false};
  const audio = createDrawAudio(() => settings);
  document.dispatchEvent(new Event('pointerdown'));
  await new Promise(resolve => setImmediate(resolve));
  const start = () => {audio.update(true, .65); assert.ok(level > 0); assert.equal(context.state, 'running');};
  const stopped = () => {assert.equal(level, 0); assert.equal(context.state, 'suspended');};
  start(); document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); stopped();
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); stopped();
  start(); window.dispatchEvent(new Event('pagehide')); stopped();
  start(); settings.muted = true; window.dispatchEvent(new Event('wizard-settings')); stopped();
  settings.muted = false; start(); settings.sfx = false;
  window.dispatchEvent(new Event('wizard-settings')); stopped();
  settings.sfx = true; start(); audio.stop(); stopped();
  audio.update(false, 0); stopped();
});
