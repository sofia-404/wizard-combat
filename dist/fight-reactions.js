import {spellColor} from './presentation/spell-color.js';
import {spellForShape} from './spells/index.js';

const READY = 'translate(0px, 0px) rotate(0deg)';
const FALLEN = 'translate(-35px, 45px) rotate(-84deg)';
const REACTIONS = {
  default: {moves: [READY, 'translate(14px, -5px) rotate(3deg)', 'translate(-4px, 0px) rotate(-1deg)', READY]},
  'Basic Cast': {moves: [READY, 'translate(22px, 8px) rotate(7deg)', 'translate(10px, 4px) rotate(3deg)', READY]},
  Confringo: {moves: [READY, 'translate(18px, 0px) rotate(3deg)', 'translate(-10px, 0px) rotate(-3deg)', 'translate(15px, 0px) rotate(2deg)', 'translate(-6px, 0px) rotate(-1deg)', READY]},
  Expelliarmus: {moves: [READY, 'translate(30px, -12px) rotate(10deg)', 'translate(16px, -2px) rotate(4deg)', READY]}
};

// Display only. Health decides when a hit or defeat occurs.
export function createDummyReactions(actor) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animation = null;
  let defeated = false;
  let version = 0;

  function cancel() {
    version++;
    animation?.cancel();
    animation = null;
  }

  function settle() {
    cancel();
    actor.style.transform = defeated ? FALLEN : READY;
    actor.style.filter = 'none';
    actor.dataset.pose = defeated ? 'fallen' : 'ready';
    delete actor.dataset.reaction;
    actor.setAttribute('aria-label', defeated ? 'Training dummy, fallen and defeated' : 'Training dummy, standing ready');
  }

  function react(shape, lethal = false) {
    if (spellForShape(shape)?.visuals.cast === 'shield') return;
    if (defeated) return;
    cancel();
    defeated = lethal;
    const reaction = REACTIONS[shape] || REACTIONS.default;
    actor.dataset.reaction = shape;
    actor.dataset.pose = lethal ? 'falling' : 'recoil';
    actor.setAttribute('aria-label', lethal ? 'Training dummy falling' : `Training dummy hit by ${shape}`);
    const glow = `drop-shadow(0 0 12px ${spellColor(shape)}) brightness(1.25)`;
    actor.style.transform = lethal ? FALLEN : READY;
    actor.style.filter = 'none';

    if (reducedMotion.matches && lethal) { settle(); return; }
    const moves = reducedMotion.matches ? [READY, READY] : lethal
      ? [READY, 'translate(22px, -7px) rotate(7deg)', 'translate(-15px, 20px) rotate(-38deg)', FALLEN]
      : reaction.moves;
    const frames = moves.map((transform, i) => ({transform, filter: i === moves.length - 1 ? 'none' : glow}));
    const current = version;
    animation = actor.animate(frames, {duration: reducedMotion.matches ? 220 : lethal ? 900 : 560, easing: 'ease-out'});
    animation.finished.then(() => { if (version === current) settle(); }).catch(() => {});
  }

  reducedMotion.addEventListener('change', settle);
  settle();
  return {
    react,
    settle,
    reset() { defeated = false; settle(); }
  };
}
