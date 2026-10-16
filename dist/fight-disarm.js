import {TrainingDummy} from './combat/training-dummy.js';

export function createFightDisarm(actor, status, {
  now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout
} = {}) {
  const dummy = new TrainingDummy();
  let timer;

  function render() {
    actor.dataset.disarmed = String(dummy.disarmed);
    const text = dummy.disarmed ? 'Disarmed · Wand returns in 2 seconds' : 'Wand ready';
    if (status && status.textContent !== text) status.textContent = text;
  }

  function refresh() {
    cancel(timer);
    dummy.restore(now());
    render();
    // The deadline keeps its elapsed time while the camera or view is inactive.
    if (dummy.disarmed) timer = schedule(refresh, Math.max(0, dummy.returnAt - now()));
  }

  render();
  return {
    hit(cast) {
      // Fight calls this only after health.hit accepts the shot.
      if (dummy.cast({...cast, type: 'cast', accepted: true}, now())) refresh();
    },
    reset() {
      cancel(timer);
      dummy.reset();
      render();
    },
    refresh
  };
}
