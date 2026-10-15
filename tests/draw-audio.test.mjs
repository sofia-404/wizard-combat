import assert from 'node:assert/strict';
import test from 'node:test';
import {trailLevel, createDrawAudio} from '../dist/draw-audio.js';

test('stroke trail level follows fingertip speed within 0 to 1', () => {
  assert.equal(trailLevel(0), 0);
  assert.equal(trailLevel(.05), 0, 'tiny hand tremor stays silent');
  assert.ok(trailLevel(.3) > 0 && trailLevel(.3) < trailLevel(.6));
  assert.equal(trailLevel(.65), 1);
  assert.equal(trailLevel(5), 1, 'fast strokes do not get louder than the limit');
  assert.equal(trailLevel(Number.NaN), 0);
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
  const settings = {sfx:true, muted:false};
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
