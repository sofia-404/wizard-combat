import {getInputState} from '../input-state.js';

// Both game views move the same button between the arena and navigation.
export function syncGameCamera(button, arena, {active, unavailable = false}) {
  const state = getInputState();
  const running = state.camera === 'Stop camera';
  const parent = running ? document.querySelector('.game-navigation') : arena;
  const hadFocus = document.activeElement === button;
  button.textContent = running ? 'Stop camera' : 'Start camera';
  button.disabled = state.cameraDisabled;
  button.hidden = !active || (unavailable && !running);
  if (button.parentElement !== parent) {
    parent.append(button);
    if (hadFocus && !button.hidden) button.focus({preventScroll:true});
  }
}
