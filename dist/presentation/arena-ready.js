const pending = new WeakMap();

// The background and SVG character layers must appear in the same frame.
export function prepareArena(arena) {
  if (pending.has(arena)) return pending.get(arena);
  arena.dataset.artState = 'loading';
  arena.setAttribute('aria-busy', 'true');
  const background = arena.querySelector('.arena-art');
  background.loading = 'eager';
  const sources = new Set([...arena.querySelectorAll('.practice-arena-actors image')]
    .map(layer => layer.getAttribute('href')));
  const images = [...sources].map(src => {
    const image = new Image();
    image.src = src;
    return image;
  });
  const ready = Promise.all([background, ...images].map(image => image.decode())).then(() => {
    arena.dataset.artState = 'ready';
  }, () => {
    // Keep controls usable on a plain arena if any image fails. Retry on entry.
    arena.dataset.artState = 'failed';
    pending.delete(arena);
  }).finally(() => arena.setAttribute('aria-busy', 'false'));
  pending.set(arena, ready);
  return ready;
}
