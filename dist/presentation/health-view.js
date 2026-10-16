import {MAX_HEALTH} from '../practice-arena-health.js';

export function renderHealthBars(view, health) {
  for (const actor of ['player', 'dummy']) {
    const id = view + actor[0].toUpperCase() + actor.slice(1) + 'Health';
    const bar = document.getElementById(id);
    bar.max = MAX_HEALTH;
    bar.value = health[actor];
    bar.textContent = `${health[actor]} of ${MAX_HEALTH}`;
    document.getElementById(id + 'Text').textContent = `${health[actor]} / ${MAX_HEALTH}`;
  }
}

// A hit producer sends {view, id, damage} at impact. This does not start attacks.
export function listenForPlayerHits(view, health, onHit) {
  document.addEventListener('wizard:player-hit', ({detail}) => {
    if (detail?.view !== view || document.hidden || document.getElementById(view + 'View').hidden) return;
    const hit = health.receiveHit(detail, performance.now());
    if (hit) onHit(hit, detail);
  });
}
