import {cancelGestureCapture} from './app.js';
import {prepareArena} from './presentation/arena-ready.js';
import {createArenaView} from './arena-view.js';
import {gameModes} from './stages.js';

const $ = id => document.getElementById(id);
const labels = gameModes;
const gameViews = Object.fromEntries(Object.keys(labels).map(view => [view, $(view + 'View')]));
const arenas = [createArenaView('practiceArena', labels.practiceArena), createArenaView('soloDuel', labels.soloDuel)];
let activeView = null;

// The main menu selects one screen. All views share one camera and detector.
export function selectGameView(view, stage = null, character = null, opponent = null) {
  if (view !== null && !Object.hasOwn(gameViews, view)) throw new Error(`Unknown game view: ${view}`);
  if (view) prepareArena(gameViews[view].querySelector('.practice-arena'), stage, character, view === 'soloDuel' ? opponent : null);
  const previousTab = activeView || 'menu';
  cancelGestureCapture('View changed. Hold still to start.');
  $(view ? view + 'CameraMount' : 'cameraHome').append($('viewport'));
  for (const [name, panel] of Object.entries(gameViews)) {
    panel.hidden = name !== view;
    $(name + 'Heading').hidden = name !== view;
  }
  $('gameViewName').hidden = true;
  $('gameViewName').textContent = labels[view] || '';
  activeView = view;
  document.body.classList.toggle('practice-arena-open', !!view);
  document.body.classList.toggle('spell-training-open', view === 'spellTraining');
  document.dispatchEvent(new CustomEvent('wizard:view', {detail: {view}}));
  for (const arena of arenas) arena.select(previousTab);
}
