import {gameModes, stages, stageChoices, chooseStage} from './stages.js';
import {prepareArena} from './presentation/arena-ready.js';
import {characters} from './characters.js';
import {createCharacterPortrait} from './presentation/character-portrait.js';

export function createStageSelector(onStart, onChoice = () => {}) {
  const screen = document.getElementById('stageSelectView');
  const grid = document.getElementById('stageChoices');
  const preview = document.getElementById('stagePreview');
  const start = document.getElementById('stageStart');
  const status = document.getElementById('stageStatus');
  let mode, playerSkin, opponentSkin, choice = null, resolved = null, revision = 0;

  function select(stage, button) {
    revision++;
    choice = stage?.id || null;
    resolved = null;
    start.disabled = false;
    start.textContent = 'Start Game';
    screen.setAttribute('aria-busy', 'false');
    status.textContent = '';
    for (const tile of grid.children) tile.setAttribute('aria-pressed', String(tile === button));
    preview.src = (stage || stages[0]).image;
    preview.alt = stage?.description || '';
  }

  for (const stage of stageChoices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-tile';
    button.dataset.stage = stage?.id || 'random';
    button.setAttribute('aria-pressed', 'false');
    if (stage) {
      const image = document.createElement('img');
      image.src = stage.thumbnail;
      image.alt = '';
      image.width = 400;
      image.height = 225;
      button.append(image);
    } else {
      const mark = document.createElement('span');
      mark.className = 'stage-random';
      mark.textContent = '?';
      mark.setAttribute('aria-hidden', 'true');
      button.append(mark);
    }
    const label = document.createElement('span');
    label.className = 'stage-name';
    label.textContent = stage?.name || 'Random';
    button.append(label);
    button.addEventListener('click', event => {
      if (!stage && event.detail > 1) return;
      select(stage, button);
      onChoice(choice);
      if (!stage) startGame(event.detail === 0);
    });
    if (stage) button.addEventListener('dblclick', () => startGame(false));
    grid.append(button);
  }

  async function startGame(moveFocus) {
    const reveal = !choice;
    // Keep the resolved random stage during retries. Never roll on render or restart.
    const stage = resolved || chooseStage(choice);
    if (reveal) select(stage, grid.querySelector(`[data-stage="${stage.id}"]`));
    onChoice(stage.id);
    resolved = stage;
    const attempt = ++revision;
    start.disabled = true;
    start.textContent = 'Loading…';
    screen.setAttribute('aria-busy', 'true');
    status.textContent = '';
    // Give the chosen preview a full second before leaving, even on a fast load.
    const shown = reveal ? preview.decode().catch(() => {}).then(() =>
      new Promise(resolve => setTimeout(resolve, 1000))) : Promise.resolve();
    const [ready] = await Promise.all([
      prepareArena(document.querySelector(`#${mode}View .practice-arena`), stage, playerSkin, opponentSkin), shown
    ]);
    if (attempt !== revision) return;
    screen.setAttribute('aria-busy', 'false');
    start.disabled = false;
    start.textContent = ready ? 'Start Game' : 'Retry';
    if (ready) onStart(mode, stage.id, moveFocus);
    else {
      status.textContent = 'Stage could not load. Select Retry or another stage.';
      if (moveFocus && document.activeElement === document.body) start.focus();
    }
  }

  start.addEventListener('click', event => startGame(event.detail === 0));

  return {
    open(nextMode, stage = null, character = null, opponent = null) {
      mode = nextMode;
      playerSkin = character;
      opponentSkin = mode === 'soloDuel' ? opponent : null;
      select(stage, stage ? grid.querySelector(`[data-stage="${stage.id}"]`) : null);
      status.textContent = '';
      document.getElementById('stageMode').textContent = gameModes[mode];
      screen.querySelector('.stage-wizards').hidden = !!character;
      for (const portrait of screen.querySelectorAll('.stage-character')) portrait.remove();
      if (character) {
        for (const [index, actor] of [character, mode === 'soloDuel' ? opponent || characters[1] : characters[1]].entries()) {
          const frame = document.createElement('div');
          frame.className = 'stage-character' + (index ? ' stage-character-opponent' : '');
          frame.setAttribute('aria-hidden', 'true');
          frame.append(createCharacterPortrait(actor));
          screen.querySelector('.stage-hero').append(frame);
        }
      }
    },
    close() { revision++; }
  };
}
