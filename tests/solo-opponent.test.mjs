import test from 'node:test';
import assert from 'node:assert/strict';
import {SoloOpponent, SOLO_RULES} from '../dist/combat/solo-opponent.js';
import {PracticeArenaHealth} from '../dist/practice-arena-health.js';

const active = {active:true};
test('opponent waits for readiness and alternates attacks without a fixed shield turn', () => {
  const opponent = new SoloOpponent();
  assert.equal(opponent.update(0, {active:false}), null);
  assert.equal(opponent.update(1000, active), null);
  assert.equal(opponent.update(3999, active), null);
  assert.equal(opponent.update(4000, active).type, 'prepare');
  assert.equal(opponent.update(5499, active), null);
  const first = opponent.update(5500, active);
  assert.equal(first.shape, 'Basic Cast');
  assert.equal(first.damage, 25);
  assert.equal(opponent.update(6000, active), null, 'one cast per turn');
  assert.equal(opponent.update(7000, active).shape, 'Confringo');
  assert.equal(opponent.update(8500, active).type, 'cast');
  assert.equal(opponent.update(10000, active).shape, 'Basic Cast');
  assert.equal(opponent.update(11500, active).type, 'cast');
  assert.equal(opponent.shield.active(12000), false);
  assert.equal(opponent.update(13000, active).shape, 'Confringo');
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
  assert.equal(action.type, 'prepare');
  opponent.reset();
  assert.equal(opponent.shield.active(103000), false);
  opponent.update(200000, active);
  opponent.update(203000, active);
  assert.equal(opponent.update(300000, active).type, 'cast');
  assert.equal(opponent.update(300000, active), null);
  assert.equal(opponent.nextActionAt, 301500);
});

for (const [difficulty, attackMs, warningMs] of [['easy',5000,2000], ['normal',3000,1500], ['hard',2000,1000]]) {
  test(`${difficulty} attack intervals include the warning and do not replay overdue casts`, () => {
    const opponent = new SoloOpponent(), state = {...active, difficulty};
    opponent.update(0, state);
    assert.equal(opponent.update(2999, state), null);
    for (let i = 0; i < 3; i++) {
      const start = 3000 + i * attackMs;
      const warning = opponent.update(start, state);
      assert.equal(warning.type, 'prepare');
      assert.equal(warning.warningMs, warningMs);
      assert.equal(opponent.update(start + warningMs - 1, state), null);
      assert.equal(opponent.update(start + warningMs, state).type, 'cast');
      assert.equal(opponent.nextActionAt, start + attackMs);
      assert.equal(opponent.update(start + attackMs - 1, state), null);
    }
    opponent.update(3000 + 3 * attackMs, state);
    assert.equal(opponent.update(100000, state).type, 'cast');
    assert.notEqual(opponent.update(100000, state)?.type, 'cast');
    assert.equal(opponent.update(100000, state), null);
  });
}

test('attack difficulty changes keep the current warning and wait, then apply to the next attack', () => {
  const opponent = new SoloOpponent(), easy = {...active, difficulty:'easy'}, hard = {...active, difficulty:'hard'};
  opponent.update(0, easy);
  opponent.update(3000, easy);
  assert.equal(opponent.update(4999, hard), null);
  assert.equal(opponent.update(5000, hard).type, 'cast');
  assert.equal(opponent.update(7999, hard), null);
  assert.equal(opponent.update(8000, hard).type, 'prepare');
  assert.equal(opponent.update(8999, hard), null);
  assert.equal(opponent.update(9000, hard).type, 'cast');
  assert.equal(opponent.nextActionAt, 10000);
});

test('invalid attack difficulty uses Normal and training keeps six-second intervals', () => {
  for (const difficulty of [undefined, null, 'unknown', 'toString']) {
    const opponent = new SoloOpponent(), state = {...active, difficulty};
    opponent.update(0, state);
    opponent.update(3000, state);
    assert.equal(opponent.update(4499, state), null);
    assert.equal(opponent.update(4500, state).type, 'cast');
    assert.equal(opponent.nextActionAt, 6000);
  }
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const opponent = new SoloOpponent({attacksOnly:true}), state = {...active, difficulty};
    opponent.update(0, state);
    opponent.update(3000, state);
    assert.equal(opponent.update(4999, state), null);
    assert.equal(opponent.update(5000, state).type, 'cast');
    assert.equal(opponent.nextActionAt, 9000);
  }
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
  assert.equal(opponent.reactToAttack(0, active), false);
  for (const [index, shape] of ['Basic Cast', 'Confringo', 'Basic Cast', 'Confringo'].entries()) {
    const now = SOLO_RULES.readyMs + index * SOLO_RULES.actionMs;
    assert.equal(opponent.update(now, active).shape, shape);
    const event = opponent.update(now + SOLO_RULES.warningMs, active);
    assert.equal(event.type, 'cast');
    assert.equal(event.damage, 25);
    assert.equal(opponent.shield.active(now), false);
  }
});

test('reactive Protego interrupts preparation, lasts three seconds, and leaves a three-second opening', () => {
  const opponent = new SoloOpponent();
  opponent.update(0, active);
  opponent.update(3000, active);
  assert.equal(opponent.reactToAttack(4000, active), true);
  assert.equal(opponent.reactToAttack(4100, active), false, 'a second shot cannot delay the reaction');
  assert.equal(opponent.update(4199, active), null);
  assert.equal(opponent.update(4200, active).type, 'shield');
  assert.equal(opponent.preparing, null);
  assert.equal(opponent.reactToAttack(5000, active), false, 'an active shield cannot be extended');
  assert.equal(opponent.shield.expiresAt, 7200);
  assert.equal(opponent.update(7199, active), null);
  assert.equal(opponent.update(7200, active).type, 'prepare', 'attacks resume after protection ends');
  assert.equal(opponent.shield.active(7200), false);
  assert.equal(opponent.reactToAttack(10199, active), false);
  assert.equal(opponent.reactToAttack(10200, active), true);
  assert.equal(opponent.update(10400, active).type, 'shield');
});

test('stopping, disarm, reset, and late updates cannot create a stale defense', () => {
  for (const state of [{active:false}, {active:true, disarmed:true}]) {
    const opponent = new SoloOpponent();
    assert.equal(opponent.reactToAttack(0, state), false);
    opponent.update(0, active);
    opponent.reactToAttack(100, active);
    opponent.update(200, state);
    assert.equal(opponent.defending, null);
    opponent.update(300, active);
    assert.equal(opponent.shield.active(300), false);
  }
  const opponent = new SoloOpponent();
  opponent.update(0, active);
  opponent.reactToAttack(100, active);
  opponent.update(700, active);
  assert.equal(opponent.shield.active(700), false, 'no late shield after the incoming spell reaches its target');
  opponent.reactToAttack(800, active);
  opponent.reset();
  opponent.update(1000, active);
  assert.equal(opponent.shield.active(1000), false);
  opponent.reactToAttack(1000, active);
  opponent.update(1200, active);
  opponent.stop();
  assert.equal(opponent.reactToAttack(4300, active), false, 'a pause does not reset cooldown');
  opponent.reset();
  assert.equal(opponent.reactToAttack(4300, active), true, 'Restart resets cooldown');
});

for (const [difficulty, reactionMs, cooldownMs] of [['easy',400,9000], ['normal',200,6000], ['hard',100,4500]]) {
  test(`${difficulty} defense respects reaction, shield expiry, and cooldown boundaries`, () => {
    const opponent = new SoloOpponent(), state = {...active, difficulty};
    opponent.update(0, active);
    assert.equal(opponent.reactToAttack(1000, state), true);
    const activatedAt = 1000 + reactionMs;
    assert.equal(opponent.update(activatedAt - 1, active), null);
    assert.equal(opponent.update(activatedAt, active).type, 'shield');
    assert.equal(opponent.shield.active(activatedAt + 2999), true);
    assert.equal(opponent.shield.active(activatedAt + 3000), false);
    assert.equal(opponent.reactToAttack(activatedAt + cooldownMs - 1, state), false);
    assert.equal(opponent.reactToAttack(activatedAt + cooldownMs, state), true);
    const training = new SoloOpponent({attacksOnly:true});
    assert.equal(training.reactToAttack(1000, state), false);
  });
}

test('missing or invalid defense difficulty uses Normal', () => {
  for (const difficulty of [undefined, null, 'unknown', 'toString']) {
    const opponent = new SoloOpponent();
    opponent.update(0, active);
    opponent.reactToAttack(0, {...active, difficulty});
    assert.equal(opponent.update(199, active), null);
    assert.equal(opponent.update(200, active).type, 'shield');
    assert.equal(opponent.shieldReadyAt, 6200);
  }
});

test('difficulty changes apply to the next defense without rewriting pending or active timers', () => {
  const opponent = new SoloOpponent(), state = {...active, difficulty:'easy'};
  opponent.update(0, active);
  opponent.reactToAttack(0, state);
  state.difficulty = 'hard';
  assert.equal(opponent.reactToAttack(50, state), false);
  assert.equal(opponent.update(100, active), null);
  assert.equal(opponent.update(400, active).type, 'shield');
  assert.equal(opponent.reactToAttack(5000, state), false);
  assert.equal(opponent.shieldReadyAt, 9400);
  assert.equal(opponent.reactToAttack(9400, state), true);
  assert.notEqual(opponent.update(9499, active)?.type, 'shield');
  assert.equal(opponent.update(9500, active).type, 'shield');
  assert.equal(opponent.shieldReadyAt, 14000);
});
