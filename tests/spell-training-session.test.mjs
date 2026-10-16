import test from 'node:test';
import assert from 'node:assert/strict';
import {SpellTrainingSession} from '../dist/spell-training/session.js';
import {SpellLesson} from '../dist/spell-training/lesson.js';
import {spellList, spells} from '../dist/spells/index.js';

const progress = spell => spell.id === 'protego' ? {type:'block', blocked:true} : cast(spell);
const cast = (spell, extra = {}) => ({type: 'cast', accepted: true, shape: spell.label, ...extra});

test('every registered spell needs three casts or Protego blocks without changing its definition', () => {
  const definitions = JSON.stringify(spellList);
  const session = new SpellTrainingSession();
  for (const spell of spellList) {
    session.select(spell.id);
    assert.strictEqual(session.spell, spell);
    assert.equal(session.state, 'idle');
    assert.equal(session.requiredCasts, 3);
    session.update(progress(spell));
    assert.equal(session.count, 0);
    session.start();
    for (let count = 1; count <= 3; count++) {
      session.update(progress(spell));
      assert.equal(session.count, count);
      assert.equal(session.state, count === 3 ? 'complete' : 'active');
    }
    assert.ok(session.learned.has(spell.id));
    const message = session.message;
    session.update(progress(spell));
    assert.equal(session.count, 3);
    assert.equal(session.message, message);
  }
  assert.equal(session.learned.size, spellList.length);
  assert.equal(JSON.stringify(spellList), definitions);
});

test('wrong spells, rejected input, and cancels give feedback without progress', () => {
  const session = new SpellTrainingSession();
  session.start();
  session.update(cast(spells.expelliarmus));
  for (const spell of spellList.filter(spell => spell.id !== session.spell.id)) {
    session.update(cast(spell));
    assert.match(session.message, new RegExp(spell.label));
    assert.equal(session.count, 1);
  }
  for (const event of [cast(spells.expelliarmus, {accepted: false}), {type: 'reject'},
    {type: 'ignored'}, {type: 'cancel', reason: 'Tracking lost'}]) {
    session.update(event);
    assert.equal(session.count, 1);
  }
  assert.equal(session.message, 'No cast. Tracking lost');
  session.update({type: 'capture'});
  session.update(null);
  assert.equal(session.count, 1);
});

test('duplicate event objects and cast IDs cannot increase progress', () => {
  const session = new SpellTrainingSession();
  session.start();
  const event = cast(session.spell);
  session.update(event);
  session.update(event);
  assert.equal(session.count, 1);
  session.update(cast(session.spell, {id: 'one'}));
  session.update(cast(session.spell, {id: 'one'}));
  session.update(cast(session.spell, {castId: 'one'}));
  for (const id of ['', ' ', null, undefined, {}, NaN, Infinity]) {
    session.update(cast(session.spell, {id}));
  }
  assert.equal(session.count, 2);
  session.start();
  session.update(event);
  session.update(cast(session.spell, {id: 'one'}));
  assert.equal(session.count, 0);
  session.update(cast(session.spell, {castId: 'two'}));
  assert.equal(session.count, 1);
});

test('select resumes each lesson and start or stop resets only the selected attempt', () => {
  const session = new SpellTrainingSession();
  session.start();
  session.update(progress(session.spell));
  session.select('protego');
  assert.equal(session.state, 'idle');
  session.start();
  session.update(progress(session.spell));
  session.select('expelliarmus');
  assert.equal(session.state, 'active');
  assert.equal(session.count, 1);
  session.update(progress(session.spell));
  session.update(progress(session.spell));
  session.select('protego');
  assert.equal(session.count, 1);
  session.start();
  assert.equal(session.count, 0);
  session.update(progress(session.spell));
  session.stop();
  session.update(progress(session.spell));
  assert.equal(session.state, 'idle');
  assert.equal(session.count, 0);
  assert.ok(session.learned.has('expelliarmus'));
  session.select('expelliarmus');
  assert.equal(session.state, 'complete');
  session.start();
  assert.equal(session.count, 0);
  assert.ok(session.learned.has('expelliarmus'));
  assert.throws(() => session.select('missing'), /Unknown spell/);
  assert.equal(session.spell.id, 'expelliarmus');
});

test('Spell Training progress stays separate from other lesson and Spell Training sessions', () => {
  const session = new SpellTrainingSession();
  const otherLesson = new SpellLesson();
  otherLesson.start();
  otherLesson.update(cast(spells.expelliarmus));
  session.start();
  for (let i = 0; i < 3; i++) session.update(progress(session.spell));
  assert.equal(otherLesson.count, 1);
  assert.equal(otherLesson.state, 'active');
  const fresh = new SpellTrainingSession();
  assert.equal(fresh.count, 0);
  assert.equal(fresh.learned.size, 0);
});


test('camera stop clears every active attempt and keeps completed lessons', () => {
  const session = new SpellTrainingSession();
  session.start();
  session.update(progress(session.spell));
  session.select('basic-cast');
  session.start();
  session.update(progress(session.spell));
  session.select('protego');
  session.start();
  for (let i = 0; i < 3; i++) session.update(progress(session.spell));
  session.stopActive();
  assert.equal(session.state, 'complete');
  assert.equal(session.count, 3);
  assert.ok(session.learned.has('protego'));
  for (const id of ['expelliarmus', 'basic-cast']) {
    session.select(id);
    assert.equal(session.state, 'idle');
    assert.equal(session.count, 0);
    session.update(progress(session.spell));
    assert.equal(session.count, 0);
  }
});


test('Protego counts unique blocked impacts, not shield casts or missed attacks', () => {
  const session = new SpellTrainingSession('protego');
  session.start();
  for (const event of [cast(session.spell), {type:'hit', id:'miss'},
    {type:'block', blocked:false, id:'unblocked'}, {type:'reject'}, cast(spells['basic-cast'])]) session.update(event);
  assert.equal(session.count, 0);
  const block = {type:'block', blocked:true, id:'block-1'};
  session.update(block);
  session.update(block);
  session.update({...block});
  assert.equal(session.count, 1);
  session.select('basic-cast');
  session.start();
  session.update({type:'block', blocked:true, id:'other-lesson'});
  assert.equal(session.count, 0);
  session.select('protego');
  session.update({type:'block', blocked:true, id:'block-2'});
  session.update({type:'block', blocked:true, id:'block-3'});
  assert.equal(session.state, 'complete');
  assert.ok(session.learned.has('protego'));
  assert.match(session.message, /Three attacks blocked/);
});
