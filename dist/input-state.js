// Shared camera and cast status. Views read state without hidden controls.
const state = {
  camera: 'Start camera', cameraDisabled: false, cameraState: 'Camera off', tracking: 'Off',
  lastShape: '—', lastReason: 'Draw, then stop briefly.', score: '—', resultTag: 'Waiting',
  saveStatus: 'No records yet'
};
export function getInputState() { return {...state}; }
export function updateInputState(values) {
  const changed = Object.keys(values).filter(key => state[key] !== values[key]);
  if (!changed.length) return;
  Object.assign(state, values);
  document.dispatchEvent(new CustomEvent('wizard:input-state', {detail: {changed}}));
}
