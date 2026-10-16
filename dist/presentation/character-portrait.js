// Crop the original pair in the view. Keep the original image file unchanged.
export function createCharacterPortrait(character) {
  const frame = document.createElement('span');
  frame.className = 'character-portrait';
  if (character.crop) frame.dataset.crop = character.crop;
  const image = document.createElement('img');
  image.src = character.image;
  image.alt = '';
  image.decoding = 'async';
  frame.append(image);
  return frame;
}
