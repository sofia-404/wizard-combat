const folder = '/assets/characters/portraits-v1/';
const pair = '/assets/stages/selection-wizards.png';

// Cosmetic art only. All characters use the same combat rules.
export const characters = Object.freeze([
  {id:'original-wizard', name:'Original Wizard', title:'', image:pair, crop:'left'},
  {id:'original-witch', name:'Original Witch', title:'The first witch', image:pair, crop:'right'},
  ...[
    ['rowan', 'Rowan', 'The Duelist'], ['mara', 'Mara', 'The Ember Witch'],
    ['silas', 'Silas', 'The Scholar'], ['iris', 'Iris', 'The Astronomer'],
    ['bram', 'Bram', 'The Warden'], ['slytherin', 'Slytherin', 'Green and silver'],
    ['gryffindor', 'Gryffindor', 'Scarlet and gold'], ['ravenclaw', 'Ravenclaw', 'Blue and bronze'],
    ['hufflepuff', 'Hufflepuff', 'Yellow and black']
  ].map(([id, name, title]) => ({id, name, title, image:folder + id + '.png'}))
].map(character => Object.freeze({...character,
  battleImage:'/assets/characters/battle-v1/' + character.id + '.png',
  battleGrip:Object.freeze(character.id === 'mara' ? [.815, .25] : [.875, .24])
})));

export const defaultCharacter = characters[0];
export const characterById = id => characters.find(character => character.id === id) || null;
export function chooseCharacter(id, random = Math.random, exclude = null) {
  const selected = characterById(id);
  if (selected) return selected;
  const pool = characters.filter(character => character.id !== exclude);
  return pool[Math.floor(random() * pool.length)];
}
