import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuelDisarm} from '../dist/duel-disarm.js';
import {DuelHealth} from '../dist/duel-health.js';

function fixture() {
  let time = 1000, next = 0;
  const timers = new Map();
  const actor = {dataset: {}}, status = {textContent: ''};
  const disarm = createDuelDisarm(actor, status, {
    now: () => time,
    schedule: (callback, delay) => { timers.set(++next, {callback, at: time + delay}); return next; },
    cancel: id => timers.delete(id)
  });
  return {actor, status, disarm, timers,
    advance(ms, runTimers = true) {
      time += ms;
      if (runTimers) for (const [id, timer] of [...timers]) {
        if (timer.at <= time) { timers.delete(id); timer.callback(); }
      }
    }
  };
}
const cast = (shape = 'Expelliarmus') => ({type: 'cast', accepted: true, shape, score: 90});

test('Duel wand returns two seconds after an impact', () => {
  const f = fixture();
  assert.equal(f.actor.dataset.disarmed, 'false');
  assert.equal(f.status.textContent, 'Wand ready');
  f.advance(120);
  f.disarm.hit(cast());
  assert.equal(f.actor.dataset.disarmed, 'true');
  assert.equal(f.status.textContent, 'Disarmed · Wand returns in 2 seconds');
  f.advance(1999);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1);
  assert.equal(f.actor.dataset.disarmed, 'false');
  assert.equal(f.status.textContent, 'Wand ready');
});

test('a repeat Expelliarmus impact restarts the shared disarm deadline', () => {
  const f = fixture();
  f.disarm.hit(cast());
  f.advance(1500);
  f.disarm.hit(cast());
  assert.equal(f.timers.size, 1);
  f.advance(500);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1499);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1);
  assert.equal(f.actor.dataset.disarmed, 'false');
});

test('other spells do not restore or extend disarm', () => {
  const f = fixture();
  for (const shape of ['Protego', 'Basic Cast', 'Confringo', 'unknown']) f.disarm.hit(cast(shape));
  assert.equal(f.actor.dataset.disarmed, 'false');
  f.disarm.hit(cast());
  f.advance(1000);
  for (const shape of ['Protego', 'Basic Cast', 'Confringo']) f.disarm.hit(cast(shape));
  f.advance(1000);
  assert.equal(f.actor.dataset.disarmed, 'false');
});

test('Duel launch and impact payloads apply disarm without recognition event fields', () => {
  const f = fixture(), health = new DuelHealth();
  const shot = health.launch({id: 'actual-duel-payload', shape: 'Expelliarmus', score: 90, damage: 30});
  assert.equal(shot.type, undefined);
  assert.equal(shot.accepted, undefined);
  assert.equal(f.actor.dataset.disarmed, 'false');
  f.advance(120);
  assert.ok(health.hit(shot));
  f.disarm.hit(shot);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1999);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1);
  assert.equal(f.actor.dataset.disarmed, 'false');
});

test('dummy reset clears disarm and its pending return', () => {
  const f = fixture();
  f.disarm.hit(cast());
  f.disarm.reset();
  assert.equal(f.actor.dataset.disarmed, 'false');
  assert.equal(f.timers.size, 0);
  f.advance(1000);
  f.disarm.hit(cast());
  f.advance(1000);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1000);
  assert.equal(f.actor.dataset.disarmed, 'false');
});

test('view refresh preserves remaining time and catches throttled return timers', () => {
  const f = fixture();
  f.disarm.hit(cast());
  f.advance(700, false);
  f.disarm.refresh();
  f.advance(1299);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.advance(1);
  assert.equal(f.actor.dataset.disarmed, 'false');
  f.disarm.hit(cast());
  f.advance(5000, false);
  assert.equal(f.actor.dataset.disarmed, 'true');
  f.disarm.refresh();
  assert.equal(f.actor.dataset.disarmed, 'false');
  assert.equal(f.timers.size, 0);
});
