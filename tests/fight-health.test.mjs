import test from 'node:test';
import assert from 'node:assert/strict';
import {FightHealth, damageForAccuracy} from '../dist/fight-health.js';
import {spellList} from '../dist/spells/index.js';
import {castDamage} from '../dist/combat/cast.js';

test('accuracy bands match current damage, including boundaries', () => {
  for (const [score, damage] of [[0,20],[77.99,20],[78,25],[87.99,25],[88,30],[100,30]]) {
    assert.equal(damageForAccuracy(score), damage);
  }
  for (const score of [-1,101,NaN,Infinity,undefined,'90']) assert.equal(damageForAccuracy(score),0);
});

test('Fight uses the registered spell damage and keeps score validation and fallback behavior', () => {
  for (const spell of spellList) {
    for (const score of [0,77.99,78,87.99,88,100]) {
      const expected = castDamage({type:'cast',accepted:true,shape:spell.label,score});
      assert.equal(damageForAccuracy(score,spell.label),expected);
      const health = new FightHealth();
      const shot = health.launch({id:'registered',shape:spell.label,score,damage:999});
      if(!expected){assert.equal(shot,null);continue;}
      assert.equal(shot.damage,expected,'ignore caller-supplied damage');
      assert.equal(health.hits,0,'launch must not apply damage');
      assert.equal(health.hit(shot).damage,expected);
    }
    for (const score of [-1,101,NaN,Infinity,undefined,'90']) {
      assert.equal(damageForAccuracy(score,spell.label),0);
      assert.equal(new FightHealth().launch({id:'invalid',shape:spell.label,score}),null);
    }
  }
  for (const shape of [undefined,null,'unknown']) {
    for (const score of [0,78,88]) assert.equal(damageForAccuracy(score,shape),damageForAccuracy(score));
  }
});

test('health changes at impact once; the static dummy cannot hurt the player', () => {
  const health = new FightHealth();
  const cast = {id:'first',shape:'Basic Cast',score:78,damage:999};
  const shot = health.launch(cast);
  assert.equal(health.dummy,200);
  assert.equal(health.launch(cast),null);
  assert.deepEqual(health.hit(shot),{damage:25,health:175,defeated:false});
  assert.equal(health.hit(shot),null);
  assert.equal(health.hits,1);
  assert.equal(health.player,200);
});

test('lethal damage clamps at zero and blocks all further hits until reset', () => {
  const health = new FightHealth();
  const shots = Array.from({length:8},(_,i)=>health.launch({id:String(i),score:100}));
  assert.deepEqual(shots.slice(0,7).map(shot=>health.hit(shot).damage),[30,30,30,30,30,30,20]);
  assert.equal(health.dummy,0);
  assert.equal(health.defeated,true);
  assert.equal(health.hits,7);
  assert.equal(health.hit(shots[7]),null);
  assert.equal(health.launch({id:'after-defeat',score:100}),null);
  health.resetDummy();
  assert.equal(health.dummy,200);
  assert.equal(health.hits,0);
  assert.equal(health.defeated,false);
  assert.equal(health.hit(shots[7]),null);
  assert.equal(health.hit(health.launch({id:'new-round',score:50})).health,180);
});

test('reset and leaving the view cancel pending damage without healing prior hits', () => {
  const health = new FightHealth();
  health.hit(health.launch({id:'hit',score:80}));
  const cancelled = health.launch({id:'cancelled',score:100});
  health.cancelFlights();
  assert.equal(health.hit(cancelled),null);
  assert.equal(health.dummy,175);
  const old = health.launch({id:'same-id',score:100});
  health.resetDummy();
  const fresh = health.launch({id:'same-id',score:100});
  assert.equal(health.hit(old),null);
  assert.equal(health.dummy,200);
  assert.equal(health.hit(fresh).health,170);
  assert.equal(health.player,200);
});

test('Training target reset keeps player health and an active shield', () => {
  const health = new FightHealth();
  health.receiveHit({id:'player-hit',damage:25},50);
  const shots = Array.from({length:8}, (_, i) => health.launch({id:`practice-${i}`,shape:'Basic Cast',score:95}));
  for (const shot of shots.slice(0,7)) health.hit(shot);
  assert.equal(health.dummy,0);
  assert.equal(health.hit(shots[7]),null);
  health.shield.cast({type:'cast',accepted:true,shape:'Protego'},100);
  health.resetTarget();
  assert.equal(health.dummy,200);
  assert.equal(health.player,175);
  assert.equal(health.hit(shots[7]),null,'old flights cannot hit the restored target');
  assert.equal(health.shield.active(101),true);
  assert.equal(health.hit(health.launch({id:'next-round',score:95})).health,170);
});

test('incoming player hits validate, apply once, respect Protego, and clamp at zero', () => {
  const health = new FightHealth();
  assert.deepEqual(health.receiveHit({id:'first',damage:25},100),{damage:25,health:175,blocked:false});
  assert.equal(health.receiveHit({id:'first',damage:25},101),null);
  for (const damage of [-1,0,NaN,Infinity,'20']) assert.equal(health.receiveHit({id:'invalid',damage},100),null);
  assert.equal(health.receiveHit({id:'',damage:20},100),null);
  assert.equal(health.receiveHit({id:'bad-time',damage:20},NaN),null);
  health.shield.cast({type:'cast',accepted:true,shape:'Protego'},200);
  assert.deepEqual(health.receiveHit({id:'blocked',damage:30},201),{damage:0,health:175,blocked:true});
  assert.equal(health.receiveHit({id:'blocked',damage:30},3200),null,'a blocked hit cannot replay after shield expiry');
  assert.deepEqual(health.receiveHit({id:'lethal',damage:999},3200),{damage:175,health:0,blocked:false});
  assert.equal(health.dummy,200);
});
