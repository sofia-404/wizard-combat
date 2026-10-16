import {applyArenaCharacters} from './arena-characters.js';

const pending = new WeakMap();

// The background and SVG character layers must appear in the same frame.
export function prepareArena(arena, stage = null, character = null, opponent = null) {
  const background = arena.querySelector('.arena-art');
  const source = stage?.image || '/assets/practice-arena-background.jpg';
  const key = [source, character?.id, opponent?.id].join('|');
  const cached = pending.get(arena);
  if (cached?.key === key) return cached.ready;
  arena.dataset.artState = 'loading';
  arena.setAttribute('aria-busy', 'true');
  applyArenaCharacters(arena, character, opponent);
  if (stage) arena.dataset.stage = stage.id;
  else delete arena.dataset.stage;
  background.src = source;
  background.alt = stage?.description || 'Moonlit ruined castle and stone arena.';
  background.loading = 'eager';
  const sources = new Set([...arena.querySelectorAll('.practice-arena-actors image')]
    .filter(layer => !layer.closest('.skin-original-hidden, defs') &&
      (!(stage || character) || !layer.matches('.arena-backing, .practice-arena-player-repair')))
    .map(layer => layer.getAttribute('href')));
  const images = [...sources].map(src => {
    const image = new Image();
    image.src = src;
    return image;
  });
  const entry = {key};
  const ready = Promise.all([background, ...images].map(image => image.decode())).then(() => {
    if (pending.get(arena) !== entry) return false;
    arena.dataset.artState = 'ready';
    return true;
  }, () => {
    if (pending.get(arena) !== entry) return false;
    // Keep controls usable on a plain arena if any image fails. Retry on entry.
    arena.dataset.artState = 'failed';
    pending.delete(arena);
    return false;
  }).finally(() => {
    if (!pending.has(arena) || pending.get(arena) === entry) arena.setAttribute('aria-busy', 'false');
  });
  entry.ready = ready;
  pending.set(arena, entry);
  return ready;
}
