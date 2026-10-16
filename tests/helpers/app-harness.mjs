import {loadModule} from './load-module.mjs';
import {replaceGlobal, settle} from './async.mjs';

// Supply browser boundaries while running the real camera and recording code.
export async function appHarness(t, {getUserMedia, createBitmap = bitmap => bitmap, play = async () => {}, post = async () => ({ok:true})} = {}) {
  const document = new EventTarget(), window = new EventTarget(), workers = [], requests = [];
  const context = {clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){}};
  const animationFrames = new Map(), bitmaps = [];
  let frameId = 0;
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {id, hidden:false, textContent:'', style:{},
      getContext:() => context, play, videoWidth:640, videoHeight:480});
    return nodes.get(id);
  };
  document.getElementById = node;
  document.createElement = () => ({getContext:() => context});
  document.body = {classList:{contains:() => false}};
  document.hidden = false;
  node('spellTrainingView').hidden = node('soloDuelView').hidden = true;
  let now = 100, permissionCalls = 0;
  class Worker {
    constructor() { this.messages = []; this.terminated = false; workers.push(this); }
    postMessage(message) { this.messages.push(message); }
    terminate() { this.terminated = true; }
    send(data) { this.onmessage({data}); }
  }
  const tracks = [];
  const makeStream = () => {
    const track = {stops:0, onended:null, stop(){this.stops++;}};
    tracks.push(track);
    return {getTracks:() => [track], getVideoTracks:() => [track]};
  };
  for (const [name, value] of Object.entries({document, window, Worker,
    navigator:{mediaDevices:{getUserMedia:options => {
      permissionCalls++;
      return getUserMedia ? getUserMedia(options) : Promise.resolve(makeStream());
    }}},
    performance:{now:() => now},
    requestAnimationFrame:callback => {animationFrames.set(++frameId, callback); return frameId;},
    cancelAnimationFrame:id => animationFrames.delete(id),
    createImageBitmap:async source => {
      const bitmap = {source, closed:0, close(){this.closed++;}};
      bitmaps.push(bitmap);
      return createBitmap(bitmap);
    },
    fetch:async (url, options) => {
      requests.push({url, data:JSON.parse(options.body)});
      return post(url, options);
    }})) replaceGlobal(t, name, value);
  t.mock.timers.enable({apis:['setTimeout', 'setInterval']});
  // Share the real input-state module with the app through this tiny entry module.
  const entry = await loadModule('app-test-entry.js', {
    'app-test-entry.js':"export * from './app.js'; export * as input from './input-state.js';"
  });
  const input = entry.input;
  const advance = async ms => {now += ms; t.mock.timers.tick(ms); await settle();};
  return {app:entry, workers, requests, tracks, makeStream, node, document, window, bitmaps,
    get state(){return input.getInputState();}, get permissionCalls(){return permissionCalls;}, get now(){return now;},
    advance,
    async frame(ms = 33, videoTime) {
      await advance(ms);
      const video = node('video');
      video.readyState = 2;
      video.currentTime = videoTime ?? (video.currentTime || 0) + ms / 1000;
      const callbacks = [...animationFrames.values()];
      animationFrames.clear();
      for (const callback of callbacks) callback(now);
      await settle();
    }
  };
}
