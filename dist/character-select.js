import {characters, characterById, chooseCharacter, defaultCharacter} from './characters.js';
import {gameModes} from './stages.js';
import {createCharacterPortrait} from './presentation/character-portrait.js';

export function createCharacterSelector(onNext, onChoice) {
  const $ = id => document.getElementById(id);
  const screen = $('characterSelectView'), grid = $('characterChoices');
  const next = $('characterNext'), status = $('characterStatus');
  let mode, editing, choices, resolved, revision = 0;

  function save() {
    onChoice({character:choices.player, opponent:choices.opponent, pick:editing === 'opponent' ? editing : null});
  }

  function showPortrait(prefix, id) {
    const character = characterById(id), preview = $(prefix + 'Preview');
    preview.replaceChildren(createCharacterPortrait(character || defaultCharacter));
    preview.classList.toggle('is-random', !character);
    $(prefix + 'Name').textContent = character?.name || 'Random';
  }

  function render() {
    const duel = mode === 'soloDuel';
    screen.dataset.editing = editing;
    screen.dataset.mode = mode;
    next.disabled = false;
    next.textContent = 'Choose location';
    screen.setAttribute('aria-busy', 'false');
    status.textContent = '';
    $('characterMode').textContent = gameModes[mode];
    grid.setAttribute('aria-label', editing === 'opponent' ? 'Choose your opponent' : 'Choose your character');
    $('opponentPanel').hidden = !duel;
    $('characterVersus').hidden = !duel;
    $('opponentName').hidden = !duel;
    $('playerRole').setAttribute('aria-pressed', String(editing === 'player'));
    $('opponentRole').setAttribute('aria-pressed', String(editing === 'opponent'));
    for (const tile of grid.children) {
      tile.setAttribute('aria-pressed', String(tile.dataset.character === choices[editing]));
      const p1 = tile.dataset.character === choices.player;
      const p2 = duel && tile.dataset.character === choices.opponent;
      tile.querySelector('.character-marker').textContent = [p1 && 'P1', p2 && 'P2'].filter(Boolean).join(' / ');
    }
    showPortrait('character', choices.player);
    if (duel) showPortrait('opponent', choices.opponent);
  }

  for (const [id, role] of [['playerRole', 'player'], ['opponentRole', 'opponent']]) {
    $(id).addEventListener('click', () => {
      if (role === 'opponent' && mode !== 'soloDuel') return;
      revision++;
      editing = role;
      render();
      save();
    });
  }

  for (const character of [...characters, null]) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'character-tile';
    tile.dataset.character = character?.id || 'random';
    tile.setAttribute('aria-label', character?.name || 'Random');
    if (character) tile.append(createCharacterPortrait(character));
    else {
      const mark = document.createElement('span');
      mark.className = 'character-random';
      mark.textContent = '?';
      mark.setAttribute('aria-hidden', 'true');
      tile.append(mark);
    }
    const label = document.createElement('span'), marker = document.createElement('span');
    label.className = 'character-label';
    label.textContent = character?.name || 'Random';
    marker.className = 'character-marker';
    marker.setAttribute('aria-hidden', 'true');
    tile.append(label, marker);
    tile.addEventListener('click', () => {
      revision++;
      const other = editing === 'player' ? choices.opponent : choices.player;
      choices[editing] = chooseCharacter(tile.dataset.character, Math.random, other).id;
      resolved[editing] = null;
      render();
      save();
    });
    grid.append(tile);
  }

  next.addEventListener('click', async event => {
    const attempt = ++revision, moveFocus = event.detail === 0;
    const roles = mode === 'soloDuel' ? ['player', 'opponent'] : ['player'];
    for (const role of roles) resolved[role] ||= chooseCharacter(choices[role]);
    const selection = {character:resolved.player.id, opponent:resolved.opponent?.id || null};
    next.disabled = true;
    next.textContent = 'Loading…';
    screen.setAttribute('aria-busy', 'true');
    status.textContent = '';
    try {
      await Promise.all(roles.map(role => {
        const image = new Image();
        image.src = resolved[role].image;
        return image.decode();
      }));
      if (attempt !== revision) return;
      onNext(mode, selection, moveFocus);
    } catch {
      if (attempt !== revision) return;
      next.textContent = 'Retry loading';
      status.textContent = 'Character images could not load. Retry loading or select another skin.';
    } finally {
      if (attempt === revision) {
        next.disabled = false;
        screen.setAttribute('aria-busy', 'false');
        if (moveFocus && document.activeElement === document.body) next.focus();
      }
    }
  });

  return {
    open(nextMode, character, opponent, pick) {
      revision++;
      mode = nextMode;
      const duel = mode === 'soloDuel';
      const player = chooseCharacter(character, Math.random, duel ? opponent : null).id;
      choices = {player, opponent:duel ? chooseCharacter(opponent, Math.random, player).id : null};
      resolved = {player:null, opponent:null};
      editing = mode === 'soloDuel' && pick === 'opponent' ? 'opponent' : 'player';
      render();
      save();
    },
    close() { revision++; }
  };
}
