import test from 'node:test';
import assert from 'node:assert/strict';
import {SoloOpponent} from '../dist/combat/solo-opponent.js';
import {DuelOpponent} from '../dist/combat/solo-duel.js';
import {DIFFICULTIES, difficultyProfile} from '../dist/combat/rules.js';

test('training and duel share one opponent model; training never shields', () => {
  assert.equal(SoloOpponent,DuelOpponent);
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const o=new SoloOpponent({attacksOnly:true,random:()=>0}), state={active:true,difficulty};
    assert.equal(o.reactToAttack(0,state),false);
    o.update(0,state);const first=o.update(3000,state);
    assert.equal(first.shape,'Basic Cast'); assert.equal(first.damage,20);
    assert.equal(first.warningMs,DIFFICULTIES[difficulty].warnings['Basic Cast']);
    o.update(first.releaseAt,state);
    const start=first.releaseAt+DIFFICULTIES[difficulty].attackGapMs-DIFFICULTIES[difficulty].warnings.Confringo;
    const second=o.update(start,state);assert.equal(second.shape,'Confringo');assert.equal(second.damage,40);
  }
});
test('invalid profiles use Normal and difficulty rises without changing player spell effects', () => {
  for (const key of [undefined,null,'unknown','toString']) assert.equal(difficultyProfile(key),DIFFICULTIES.normal);
  assert.ok(DIFFICULTIES.easy.attackGapMs>DIFFICULTIES.normal.attackGapMs);
  assert.ok(DIFFICULTIES.normal.attackGapMs>DIFFICULTIES.hard.attackGapMs);
  assert.ok(DIFFICULTIES.easy.shieldChance<DIFFICULTIES.normal.shieldChance);
  assert.ok(DIFFICULTIES.normal.shieldChance<DIFFICULTIES.hard.shieldChance);
});
