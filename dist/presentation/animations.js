// These functions only change the display. They do not apply game effects.
export const animations = Object.freeze({
  // The timed shield view owns this animation; the target must not flash.
  shield: scene => scene.classList.remove('hit'),
  'dummy-hit': (scene) => {
    scene.classList.remove('hit');
    void scene.offsetWidth;
    scene.classList.add('hit');
  }
});
