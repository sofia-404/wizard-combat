const ns = 'http://www.w3.org/2000/svg';
const wandSource = '/assets/practice-arena-wand.png';

function image(attributes) {
  const node = document.createElementNS(ns, 'image');
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

// Map the existing wand's grip (1348,534) and tip (1289,618) to the new pose.
function placeWand(node, hand, tip) {
  const dx = tip.x - hand.x, dy = tip.y - hand.y;
  const lengthSquared = 59 * 59 + 84 * 84;
  const a = (-59 * dx + 84 * dy) / lengthSquared;
  const b = (-59 * dy - 84 * dx) / lengthSquared;
  node.setAttribute('transform', `matrix(${a} ${b} ${-b} ${a} ${hand.x - a * 1348 + b * 534} ${hand.y - b * 1348 - a * 534})`);
}

function applySkin(arena, character, opponent) {
  const sway = arena.querySelector(opponent ? '.dummy-sway' : '.player-sway');
  const actor = sway.closest('[data-pose]');
  const wand = opponent ? sway.querySelector('[id$="DummyWand"]') : null;
  const wandImage = wand?.querySelector('image');
  sway.querySelector('.battle-skin')?.remove();
  for (const layer of sway.children) {
    if (layer !== wand) layer.classList.toggle('skin-original-hidden', !!character);
  }
  if (!character) {
    delete actor.dataset.skin;
    if (wand) {
      wandImage.removeAttribute('transform');
      wand.style.removeProperty('transform-origin');
      wand.style.removeProperty('--skin-wand-drop-y');
      wand.querySelector('.dummy-wand').style.removeProperty('animation');
      delete wand.dataset.tipX;
      delete wand.dataset.tipY;
    }
    return;
  }
  actor.dataset.skin = character.id;
  const size = opponent ? 470 : 520, center = opponent ? 1420 : 295;
  const x = center - size / 2, y = 773 - size * .967;
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('class', 'battle-skin');
  group.setAttribute('aria-hidden', 'true');
  const body = image({href:character.battleImage, x, y, width:size, height:size});
  if (opponent) body.setAttribute('transform', `translate(${center * 2} 0) scale(-1 1)`);
  group.append(body);
  sway.prepend(group);
  const [gripX, gripY] = character.battleGrip;
  const hand = {x:center + (opponent ? -1 : 1) * (gripX - .5) * size, y:y + gripY * size};
  const tip = opponent ? {x:hand.x - 90, y:hand.y - 35} : {x:560, y:374};
  if (opponent) {
    placeWand(wandImage, hand, tip);
    wand.dataset.tipX = tip.x;
    wand.dataset.tipY = tip.y;
    wand.style.transformOrigin = `${hand.x}px ${hand.y}px`;
    wand.style.setProperty('--skin-wand-drop-y', `${773 - hand.y}px`);
    // Whole-body idle motion already carries the new hand and wand together.
    wand.querySelector('.dummy-wand').style.animation = 'none';
  } else {
    const playerWand = image({href:wandSource, x:1285, y:526, width:68, height:96, preserveAspectRatio:'none'});
    placeWand(playerWand, hand, tip);
    group.prepend(playerWand);
  }
}

// Keep the existing actor groups: hit, fall, idle, and disarm controllers retain ownership.
export function applyArenaCharacters(arena, character, opponent) {
  applySkin(arena, character, false);
  applySkin(arena, opponent, true);
  arena.classList.toggle('has-player-skin', !!character);
}
