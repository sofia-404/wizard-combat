import assert from 'node:assert/strict';
import test from 'node:test';
import {characters, chooseCharacter} from '../dist/characters.js';

test('random character picks exclude the other skin and can reach every remaining skin', () => {
  for (const other of characters) {
    const picks = new Set();
    for (let i = 0; i < characters.length - 1; i++) {
      let rolls = 0;
      const picked = chooseCharacter('random', () => { rolls++; return i / (characters.length - 1); }, other.id);
      assert.notEqual(picked.id, other.id);
      assert.equal(rolls, 1);
      picks.add(picked.id);
    }
    assert.equal(picks.size, characters.length - 1);
  }
});

test('manual picks allow matching skins and do not roll', () => {
  for (const character of characters) {
    assert.equal(chooseCharacter(character.id, () => assert.fail('Manual pick must not roll'), character.id), character);
  }
});

test('player-only random picks retain the full roster', () => {
  for (let i = 0; i < characters.length; i++) {
    assert.equal(chooseCharacter(null, () => i / characters.length), characters[i]);
  }
});
