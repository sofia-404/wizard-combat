import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {stages, stageChoices, stageById, chooseStage} from '../dist/stages.js';

test('stage choices contain nine local backgrounds and Random in the third position', async () => {
  assert.equal(stages.length, 9);
  assert.equal(new Set(stages.map(stage => stage.id)).size, 9);
  assert.equal(stageChoices.length, 10);
  assert.equal(stageChoices[2], null);
  for (const stage of stages) {
    await access(new URL('../dist' + stage.image, import.meta.url));
    await access(new URL('../dist' + stage.thumbnail, import.meta.url));
  }
});

test('explicit choices never roll; an empty choice can reach every stage', () => {
  for (const stage of stages) {
    assert.equal(chooseStage(stage.id, () => { throw Error('Unexpected random choice'); }), stage);
  }
  const outcomes = Array.from({length:9}, (_, i) => chooseStage(null, () => (i + .5) / 9).id);
  assert.deepEqual(outcomes, stages.map(stage => stage.id));
  assert.equal(stageById('unknown'), null);
  assert.equal(stageById('toString'), null);
});
