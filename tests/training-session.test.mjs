import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainingSession} from '../dist/training/session.js';
import {SpellLesson} from '../dist/training/lesson.js';
import {spellList, spells} from '../dist/spells/index.js';

const cast = (spell, extra = {}) => ({type: 'cast', accepted: true, shape: spell.label, ...extra});

test('every registered spell needs three accepted casts without changing its definition', () => {
  const definitions = JSON.stringify(spellList);
  const session = new TrainingSession();
  for (const spell of spellList) {
    session.select(spell.id);
    assert.strictEqual(session.spell, spell);
    assert.equal(session.state, 'idle');
    assert.equal(session.requiredCasts, 3);
    session.update(cast(spell));
    assert.equal(session.count, 0);
    session.start();
    for (let count = 1; count <= 3; count++) {
      session.update(cast(spell));
      assert.equal(session.count, count);
      assert.equal(session.state, count === 3 ? 'complete' : 'active');
    }
    assert.ok(session.learned.has(spell.id));
    const message = session.message;
    session.update(cast(spell));
    assert.equal(session.count, 3);
    assert.equal(session.message, message);
  }
  assert.equal(session.learned.size, spellList.length);
  assert.equal(JSON.stringify(spellList), definitions);
});

test('wrong spells, rejected input, and cancels give feedback without progress', () => {
  const session = new TrainingSession();
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
  const session = new TrainingSession();
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
  const session = new TrainingSession();
  session.start();
  session.update(cast(session.spell));
  session.select('protego');
  assert.equal(session.state, 'idle');
  session.start();
  session.update(cast(session.spell));
  session.select('expelliarmus');
  assert.equal(session.state, 'active');
  assert.equal(session.count, 1);
  session.update(cast(session.spell));
  session.update(cast(session.spell));
  session.select('protego');
  assert.equal(session.count, 1);
  session.start();
  assert.equal(session.count, 0);
  session.update(cast(session.spell));
  session.stop();
  session.update(cast(session.spell));
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

test('Training progress stays separate from Practice and other Training sessions', () => {
  const session = new TrainingSession();
  const practice = new SpellLesson();
  practice.start();
  practice.update(cast(spells.expelliarmus));
  session.start();
  for (let i = 0; i < 3; i++) session.update(cast(session.spell));
  assert.equal(practice.count, 1);
  assert.equal(practice.state, 'active');
  const fresh = new TrainingSession();
  assert.equal(fresh.count, 0);
  assert.equal(fresh.learned.size, 0);
});
