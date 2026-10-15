import test from 'node:test';
import assert from 'node:assert/strict';
import {spellList, spells, spellForShape, defaultLessonSpell} from '../dist/spells/index.js';
import {validateDefinitions} from '../dist/spells/validate.js';
import {castDamage} from '../dist/combat/cast.js';
import {TrainingDummy} from '../dist/combat/training-dummy.js';
import {SpellLesson} from '../dist/training/lesson.js';
import {ExpelliarmusLesson} from '../dist/lesson.js';
import {matchExpelliarmus} from '../dist/expelliarmus.js';
import {matchOrderedCorner} from '../dist/gestures/ordered-corner.js';
import {recognize, resample} from '../dist/gesture.js';
import {spellColor} from '../dist/presentation/spell-color.js';

const cast = (shape, score = 90) => ({type: 'cast', accepted: true, shape, score});

test('registry preserves labels and order; shared definitions cannot hold player state', () => {
  assert.deepEqual(spellList.map(spell => [spell.id, spell.label, spell.kind]), [
    ['circle', 'Circle', 'shape'], ['v', 'V', 'shape'], ['z', 'Z', 'shape'], ['expelliarmus', 'Expelliarmus', 'spell']
  ]);
  for (const spell of spellList) {
    assert.equal(spells[spell.id], spellForShape(spell.label));
    assert.throws(() => { spell.effects[0].tiers[0].value = 999; }, TypeError);
  }
  for (const name of ['unknown', 'toString', '__proto__']) assert.equal(spellForShape(name), undefined);
  assert.equal(defaultLessonSpell, spells.expelliarmus);
});

test('invalid definitions fail before a spell can enter play', () => {
  for (const change of [
    list => { list.push(structuredClone(list[0])); },
    list => { list[1].label = list[0].label; },
    list => { list[1].gesture.diagnosticKey = list[0].gesture.diagnosticKey; },
    list => { list[0].gesture.checker = 'missing'; },
    list => { list[0].gesture.scoreScale = 0; },
    list => { list[0].effects[0].type = 'missing'; },
    list => { list[0].effects[0].tiers.reverse(); },
    list => { list[0].effects[0].tiers[0].value = NaN; },
    list => { list[3].effects[1].durationMs = -1; },
    list => { list[3].effects[1].repeat = 'unknown'; },
    list => { list[0].visuals.cast = 'missing'; },
    list => { delete list[0].visuals.color; },
    list => { list[0].visuals.color = '#nothex'; },
    list => { list[0].visuals.color = null; },
    list => { list[3].lesson.requiredCasts = 0; }
  ]) {
    const definitions = structuredClone(spellList);
    change(definitions);
    assert.throws(() => validateDefinitions(definitions), /Invalid spell/);
  }
});

test('registered colors preserve the four Duel colors and the Circle fallback', () => {
  for (const [shape, color] of Object.entries({Circle:'#8ce8ff',V:'#c5a0ff',Z:'#ffe19a',Expelliarmus:'#ff927e'})) {
    assert.equal(spellForShape(shape).visuals.color,color);
    assert.equal(spellColor(shape),color);
  }
  for (const shape of [undefined,null,'unknown']) assert.equal(spellColor(shape),'#8ce8ff');
});

test('every registered spell keeps the exact damage boundaries', () => {
  for (const spell of spellList) {
    for (const [score, expected] of [[0,20], [77.999,20], [78,25], [87.999,25], [88,30], [100,30]]) {
      assert.equal(castDamage(cast(spell.label, score)), expected, `${spell.id}: ${score}`);
    }
    assert.equal(castDamage({...cast(spell.label), accepted: false}), 0);
    assert.equal(castDamage({...cast(spell.label), type: 'cancel'}), 0);
  }
  assert.equal(castDamage(cast('unknown')), 0);
});

test('effect and lesson state stay separate for each player; old imports still work', () => {
  const first = new TrainingDummy(), second = new TrainingDummy();
  first.cast(cast('Expelliarmus'), 100);
  assert.equal(second.disarmed, false);
  second.cast(cast('Expelliarmus'), 200);
  first.reset();
  assert.equal(second.restore(2199), false);
  assert.equal(second.restore(2200), true);
  const lesson = new SpellLesson('expelliarmus'), legacy = new ExpelliarmusLesson();
  lesson.start(); legacy.start();
  for (const event of [cast('V'), cast('Expelliarmus'), {type:'reject'}, cast('Expelliarmus'), cast('Expelliarmus')]) {
    lesson.update(event); legacy.update(event);
    assert.deepEqual([lesson.state,lesson.count,lesson.message], [legacy.state,legacy.count,legacy.message]);
  }
  lesson.stop(); assert.equal(legacy.state, 'complete');
  assert.equal(matchExpelliarmus, matchOrderedCorner);
});

test('registry selection preserves shape conflicts and direction rules', () => {
  const line = pairs => resample(pairs.map(([x,y]) => ({x,y})), 40);
  const paths = [
    ['Expelliarmus', line([[.25,.2],[.55,.2],[.55,.5]])],
    ['V', line([[.25,.2],[.4,.5],[.55,.2]])],
    ['Z', line([[.25,.2],[.55,.2],[.25,.5],[.55,.5]])],
    ['Circle', Array.from({length:60}, (_,i) => ({x:.45+.15*Math.cos(i/59*Math.PI*2),y:.35+.15*Math.sin(i/59*Math.PI*2)}))]
  ];
  for (const [shape, path] of paths) {
    const result = recognize(path);
    assert.equal(result.shape, shape);
    assert.equal(result.diagnostics.matchCandidates, shape, 'one candidate only');
    assert.ok(result.score >= 88);
  }
  for (const [, path] of [paths[0], paths[2]]) {
    assert.equal(recognize(path.map(p => ({...p,x:1-p.x}))).accepted, false);
  }
  assert.equal(recognize([...paths[0][1]].reverse()).accepted, false);
});
