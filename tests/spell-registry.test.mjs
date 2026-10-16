import test from 'node:test';
import assert from 'node:assert/strict';
import {spellList, spells, spellForShape, defaultLessonSpell} from '../dist/spells/index.js';
import {validateDefinitions} from '../dist/spells/validate.js';
import {castDamage} from '../dist/combat/cast.js';
import {PracticeDummy} from '../dist/combat/practice-dummy.js';
import {SpellLesson} from '../dist/spell-training/lesson.js';
import {ExpelliarmusLesson} from '../dist/lesson.js';
import {matchExpelliarmus} from '../dist/expelliarmus.js';
import {matchOrderedCorner} from '../dist/gestures/ordered-corner.js';
import {recognize, resample} from '../dist/gesture.js';
import {spellColor} from '../dist/presentation/spell-color.js';

const cast = (shape, score = 90) => ({type: 'cast', accepted: true, shape, score});

test('registry preserves labels and order; shared definitions cannot hold player state', () => {
  assert.deepEqual(spellList.map(spell => [spell.id, spell.label, spell.kind]), [
    ['protego', 'Protego', 'spell'], ['basic-cast', 'Basic Cast', 'spell'], ['confringo', 'Confringo', 'spell'], ['expelliarmus', 'Expelliarmus', 'spell']
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
    list => { list[1].effects[0].tiers.push({minScore:10,value:20}); },
    list => { list[1].effects[0].tiers[0].value = NaN; },
    list => { list[3].effects[1].durationMs = -1; },
    list => { list[0].effects[0].durationMs = 0; },
    list => { list[0].effects[0].target = 'target'; },
    list => { list[0].effects[0].repeat = 'stack'; },
    list => { list[3].effects[1].repeat = 'unknown'; },
    list => { list[0].visuals.cast = 'missing'; },
    list => { delete list[0].visuals.color; },
    list => { list[0].visuals.color = '#nothex'; },
    list => { list[0].visuals.color = null; },
    list => { list[0].sound = '/audio/menu-click.wav'; },
    list => { list[0].sound = '/spells/circle/../../server.mjs'; },
    list => { list[0].sound = null; },
    list => { list[3].lesson.requiredCasts = 0; }
  ]) {
    const definitions = structuredClone(spellList);
    change(definitions);
    assert.throws(() => validateDefinitions(definitions), /Invalid spell/);
  }
});

test('registered colors include red Confringo and preserve the Protego fallback', () => {
  for (const [shape, color] of Object.entries({Protego:'#8ce8ff','Basic Cast':'#c5a0ff',Confringo:'#ef4444',Expelliarmus:'#ff927e'})) {
    assert.equal(spellForShape(shape).visuals.color,color);
    assert.equal(spellColor(shape),color);
  }
  for (const shape of [undefined,null,'unknown']) assert.equal(spellColor(shape),'#8ce8ff');
});

test('attack damage is fixed across accuracy scores; shields do no damage', () => {
  for (const spell of spellList) {
    for (const [score, expected] of [[0,20], [77.999,20], [78,25], [87.999,25], [88,30], [100,30]]) {
      assert.equal(castDamage(cast(spell.label, score)), ({'Basic Cast':20,Confringo:40,Expelliarmus:10,Protego:0})[spell.label], `${spell.id}: ${score}`);
    }
    assert.equal(castDamage({...cast(spell.label), accepted: false}), 0);
    assert.equal(castDamage({...cast(spell.label), type: 'cancel'}), 0);
  }
  assert.equal(castDamage(cast('unknown')), 0);
});

test('effect and lesson state stay separate for each player; old imports still work', () => {
  const first = new PracticeDummy(), second = new PracticeDummy();
  first.cast(cast('Expelliarmus'), 100);
  assert.equal(second.disarmed, false);
  second.cast(cast('Expelliarmus'), 200);
  first.reset();
  assert.equal(second.restore(2199), false);
  assert.equal(second.restore(2200), true);
  const lesson = new SpellLesson('expelliarmus'), legacy = new ExpelliarmusLesson();
  lesson.start(); legacy.start();
  for (const event of [cast('Basic Cast'), cast('Expelliarmus'), {type:'reject'}, cast('Expelliarmus'), cast('Expelliarmus')]) {
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
    ['Basic Cast', line([[.25,.2],[.4,.5],[.55,.2]])],
    ['Confringo', line([[.25,.2],[.55,.2],[.25,.5],[.55,.5]])],
    ['Protego', Array.from({length:60}, (_,i) => ({x:.45+.15*Math.cos(i/59*Math.PI*2),y:.35+.15*Math.sin(i/59*Math.PI*2)}))]
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

test('Confringo uses its spell name in results and diagnostics, with the existing zigzag rules', () => {
  assert.equal(spells.confringo.kind, 'spell');
  assert.equal(spells.confringo.gesture.checker, 'zigzag');
  assert.equal(spellForShape('Z'), undefined);
  assert.equal(spells.z, undefined);
  const points = resample([{x:.25,y:.2},{x:.55,y:.2},{x:.25,y:.5},{x:.55,y:.5}], 40);
  for (const path of [points, [...points].reverse()]) {
    const result = recognize(path);
    assert.equal(result.shape, 'Confringo');
    assert.equal(result.diagnostics.matchCandidates, 'Confringo');
    assert.equal(result.diagnostics.confringoGate, 'ok');
    assert.equal(result.diagnostics.confringoOrientation, 'normal');
    assert.equal(Object.keys(result.diagnostics).some(key => /^z[A-Z]/.test(key)), false);
  }
  const mirrored = recognize(points.map(point => ({...point, x:1-point.x})));
  assert.equal(mirrored.accepted, false);
  assert.equal(mirrored.cause, 'z_orientation');
  assert.equal(mirrored.reason, 'Confringo is mirrored. Follow the shown path.');
});


test('Basic Cast keeps its movement, effects, and bidirectional recognition', () => {
  const spell = spells['basic-cast'];
  assert.equal(spell.kind, 'spell');
  assert.deepEqual(spell.gesture, {checker:'valley', scoreScale:.15, diagnosticKey:'basiccast', strokeDiagnostics:true});
  assert.equal(spell.lesson, null);
  assert.deepEqual(spell.effects, [{type:'damage', tiers:[{minScore:0,value:20}]}]);
  assert.deepEqual(spell.visuals, {cast:'dummy-hit', color:'#c5a0ff'});
  assert.equal(spellForShape('V'), undefined);
  assert.equal(spells.v, undefined);
  assert.match(spell.guide.label, /Basic Cast: start at the dot.*Either direction.*Pause at the end/);
  assert.equal(spell.guide.elements[0][0], 'circle');
  assert.equal(spell.guide.elements.at(-1)[1].d, 'M50 6L54 10L50 14L46 10Z');
  const points = resample([{x:.25,y:.2},{x:.4,y:.5},{x:.55,y:.2}], 40);
  for (const path of [points, [...points].reverse()]) {
    const result = recognize(path);
    assert.equal(result.shape, 'Basic Cast');
    assert.ok(result.score >= 88);
    assert.equal(result.diagnostics.matchCandidates, 'Basic Cast');
    assert.equal(result.diagnostics.basiccastGate, 'ok');
    assert.ok(result.diagnostics.basiccastCornerTurn >= 45);
    assert.equal(Object.keys(result.diagnostics).some(key => /^v[A-Z]/.test(key)), false);
  }
});

test('every registered spell sound exists in its spell folder', async () => {
  const {access} = await import('node:fs/promises');
  for (const spell of spellList.filter(spell => spell.sound !== undefined)) {
    assert.match(spell.sound, new RegExp(`^/spells/${spell.id}/`));
    await access(new URL(`../dist${spell.sound}`, import.meta.url));
  }
});
