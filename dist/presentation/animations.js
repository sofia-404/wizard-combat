// These functions only change the display. They do not apply game effects.
export const animations = Object.freeze({
  'dummy-hit': (scene) => {
    scene.classList.remove('hit');
    void scene.offsetWidth;
    scene.classList.add('hit');
  }
});
