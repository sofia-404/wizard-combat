import test from 'node:test';
import assert from 'node:assert/strict';
import {Rounds, ROUND_RULES} from '../dist/combat/rounds.js';

function start(rounds, time = 0) {
  rounds.update(time, true);
  rounds.update(time + 1500, true);
  rounds.update(time + 2000, true);
  assert.equal(rounds.active, true);
  return time + 2000;
}

test('camera readiness, Round, and Fight must finish before combat and timer start', () => {
  const rounds = new Rounds();
  rounds.update(10000, false);
  assert.equal(rounds.phase, 'waiting');
  assert.equal(rounds.finish('player'), false);
  rounds.update(11000, true);
  assert.equal(rounds.phase, 'intro');
  rounds.update(12499, true);
  assert.equal(rounds.phase, 'intro');
  rounds.update(12500, true);
  assert.equal(rounds.phase, 'fight');
  assert.equal(rounds.active, false);
  assert.equal(rounds.timeRemaining, 100000);
  rounds.update(13000, true);
  assert.equal(rounds.active, true);
  assert.equal(rounds.timeRemaining, 100000);
  rounds.update(14000, true);
  assert.equal(rounds.timeRemaining, 99000);
  rounds.update(200000, true);
  assert.equal(rounds.timeRemaining, 0);
  assert.equal(rounds.over, false, 'zero time does not decide the match');
});

for (const winners of [['player','player'], ['opponent','opponent'], ['player','opponent','player'], ['opponent','player','opponent']]) {
  test(`first to two wins: ${winners.join(', ')}`, () => {
    const rounds = new Rounds();
    let now = start(rounds);
    for (const [i, winner] of winners.entries()) {
      assert.equal(rounds.number, i + 1);
      assert.equal(rounds.finish(winner), true);
      assert.equal(rounds.finish(winner), false, 'duplicate result cannot award another win');
      if (i === winners.length - 1) break;
      assert.equal(rounds.phase, 'result');
      rounds.update(now += ROUND_RULES.resultMs, true);
      assert.equal(rounds.phase, 'intro');
      assert.equal(rounds.timeRemaining, 100000);
      rounds.update(now += ROUND_RULES.introMs, true);
      rounds.update(now += ROUND_RULES.fightMs, true);
    }
    assert.equal(rounds.over, true);
    assert.equal(rounds.wins[winners.at(-1)], 2);
    rounds.update(now + 100000, true);
    assert.equal(rounds.number, winners.length);
    rounds.reset();
    assert.equal(rounds.phase, 'waiting');
    assert.deepEqual(rounds.wins, {player:0, opponent:0});
    assert.equal(rounds.number, 1);
  });
}

test('camera loss freezes announcements, result transitions, and active time', () => {
  for (const phase of ['intro', 'fight', 'active', 'result']) {
    const rounds = new Rounds();
    let now = 0;
    rounds.update(now, true);
    if (phase !== 'intro') rounds.update(now += 1500, true);
    if (['active', 'result'].includes(phase)) rounds.update(now += 500, true);
    if (phase === 'result') rounds.finish('player');
    rounds.update(now, false);
    const snapshot = [rounds.phase, rounds.remaining, rounds.timeRemaining, rounds.number];
    rounds.update(now + 60000, false);
    assert.equal(rounds.active, false);
    assert.equal(rounds.finish('opponent'), false);
    rounds.update(now + 60000, true);
    assert.deepEqual([rounds.phase, rounds.remaining, rounds.timeRemaining, rounds.number], snapshot);
    rounds.update(now + 60100, true);
    assert.equal(rounds.phase, phase);
    assert.deepEqual(rounds.wins, {player:phase === 'result' ? 1 : 0, opponent:0});
  }
});

test('delayed frames do not skip Fight and matches stay separate', () => {
  const solo = new Rounds(), practice = new Rounds();
  solo.update(0, true);
  solo.update(60000, true);
  assert.equal(solo.phase, 'fight');
  assert.equal(solo.timeRemaining, 100000);
  solo.update(60500, true);
  solo.finish('player');
  assert.deepEqual(practice.wins, {player:0, opponent:0});
  assert.equal(practice.phase, 'waiting');
});
