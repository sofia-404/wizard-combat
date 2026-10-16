export const gameModes = Object.freeze({spellTraining:'Spell Training', practiceArena:'Practice Arena', soloDuel:'Solo Duel'});

export const stages = Object.freeze([
  ['courtyard', 'Courtyard', '01-courtyard', 'Moonlit castle courtyard and stone floor.'],
  ['forest', 'Forbidden Forest', '02-forest', 'Moonlit forest clearing.'],
  ['great-hall', 'Great Hall', '03-great-hall', 'Castle hall lit by floating candles.'],
  ['slytherin', 'Slytherin Dungeon', '04-slytherin', 'Green stone common room with underwater windows.'],
  ['gryffindor', 'Gryffindor Tower', '05-gryffindor', 'Crimson common room with a warm fireplace.'],
  ['ravenclaw', 'Ravenclaw Tower', '06-ravenclaw', 'Blue tower common room with starry windows.'],
  ['hufflepuff', 'Hufflepuff Basement', '07-hufflepuff', 'Warm stone common room with plants and round windows.'],
  ['platform', 'Platform 9¾', '08-platform', 'Brick railway station with a red steam train.'],
  ['castle-field', 'Castle Field', '09-castle-field', 'Open field overlooking a lake and distant castle.']
].map(([id, name, file, description]) => Object.freeze({id, name, description,
  image:`/assets/stages/${file}.jpg`, thumbnail:`/assets/stages/thumbs/${file}.jpg`})));

export const stageById = id => stages.find(stage => stage.id === id) || null;
export const stageChoices = Object.freeze([
  'courtyard', 'platform', null, 'forest', 'castle-field',
  'gryffindor', 'slytherin', 'great-hall', 'ravenclaw', 'hufflepuff'
].map(stageById));
export const chooseStage = (id, random = Math.random) => stageById(id) || stages[Math.floor(random() * stages.length)];
