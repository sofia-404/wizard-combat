import test from 'node:test';
import assert from 'node:assert/strict';
import {SoloOpponent, SOLO_RULES} from '../dist/combat/solo-opponent.js';
import {PracticeArenaHealth} from '../dist/practice-arena-health.js';

const active = {active:true};
test('opponent waits for readiness, warns, attacks, and casts Protego on its third turn', () => {
  const opponent = new SoloOpponent();
  assert.equal(opponent.update(0, {active:false}), null);
  assert.equal(opponent.update(1000, active), null);
  assert.equal(opponent.update(3999, active), null);
  assert.equal(opponent.update(4000, active).type, 'prepare');
  assert.equal(opponent.update(5999, active), null);
  const first = opponent.update(6000, active);
  assert.equal(first.shape, 'Basic Cast');
  assert.equal(first.damage, 25);
  assert.equal(opponent.update(6000, active), null, 'one cast per turn');
  assert.equal(opponent.update(10000, active).shape, 'Confringo');
  assert.equal(opponent.update(12000, active).type, 'cast');
  assert.equal(opponent.update(16000, active).type, 'shield');
  assert.equal(opponent.shield.active(18999), true);
  assert.equal(opponent.shield.active(19000), false);
  assert.equal(opponent.update(22000, active).shape, 'Basic Cast');
});

test('stop, disarm, and reset cancel prepared attacks without overdue bursts', () => {
  const opponent = new SoloOpponent();
  opponent.update(0, active);
  opponent.update(3000, active);
  opponent.update(4000, {active:true, disarmed:true});
  assert.equal(opponent.preparing, null);
  assert.equal(opponent.update(5000, active), null);
  assert.equal(opponent.update(7000, active).type, 'prepare');
  opponent.update(8000, {active:false});
  assert.equal(opponent.update(100000, active), null);
  assert.equal(opponent.update(102999, active), null);
  const action = opponent.update(103000, active);
  assert.equal(action.type, 'shield');
  opponent.reset();
  assert.equal(opponent.shield.active(103000), false);
  opponent.update(200000, active);
  opponent.update(203000, active);
  assert.equal(opponent.update(300000, active).type, 'cast');
  assert.equal(opponent.update(300000, active), null);
  assert.equal(opponent.nextActionAt, 300000 + SOLO_RULES.actionMs - SOLO_RULES.warningMs);
});

test('opponent shield checks impact time, consumes a blocked shot once, and keeps other views separate', () => {
  const opponent = new SoloOpponent();
  const health = new PracticeArenaHealth({targetShield:opponent.shield});
  const practice = new PracticeArenaHealth();
  const spell = {id:'attack', shape:'Expelliarmus', score:95};
  const shot = health.launch(spell);
  opponent.shield.cast({type:'cast', accepted:true, shape:'Protego', score:100}, 100);
  assert.equal(health.hit(shot, 3099).blocked, true);
  assert.equal(health.dummy, 200);
  assert.equal(health.hits, 0);
  assert.equal(health.hit(shot, 3100), null);
  assert.equal(practice.hit(practice.launch(spell), 100).damage, 30);
  assert.equal(health.hit(health.launch({...spell,id:'after'}), 3100).damage, 30);
  assert.equal(health.hits, 1);
  health.resetDummy();
  assert.equal(opponent.shield.active(101), false);
});

test('player Protego blocks opponent damage at impact and expires normally', () => {
  const health = new PracticeArenaHealth();
  health.protect({id:'protego', shape:'Protego', score:95}, 100);
  assert.equal(health.receiveHit({id:'blocked', damage:25}, 3099).blocked, true);
  assert.equal(health.player, 200);
  assert.equal(health.receiveHit({id:'after', damage:25}, 3100).damage, 25);
  assert.equal(health.player, 175);
});


test('Protego training alternates attacks without casting an opponent shield', () => {
  const opponent = new SoloOpponent({attacksOnly:true});
  opponent.update(0, active);
  for (const [index, shape] of ['Basic Cast', 'Confringo', 'Basic Cast', 'Confringo'].entries()) {
    const now = SOLO_RULES.readyMs + index * SOLO_RULES.actionMs;
    assert.equal(opponent.update(now, active).shape, shape);
    const event = opponent.update(now + SOLO_RULES.warningMs, active);
    assert.equal(event.type, 'cast');
    assert.equal(event.damage, 25);
    assert.equal(opponent.shield.active(now), false);
  }
});
