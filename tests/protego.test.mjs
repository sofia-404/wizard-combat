import test from 'node:test';
import assert from 'node:assert/strict';
import {Shield} from '../dist/combat/shield.js';
import {FightHealth} from '../dist/fight-health.js';
import {TrainingDummy} from '../dist/combat/training-dummy.js';
import {castDamage} from '../dist/combat/cast.js';
import {spells, spellForShape} from '../dist/spells/index.js';
import {recognize} from '../dist/gesture.js';

const cast = {id:'shield-1',type:'cast',accepted:true,shape:'Protego',score:90};

test('Protego keeps the circle path in both directions and records the spell name', () => {
  const points=Array.from({length:60},(_,i)=>({x:.45+.15*Math.cos(i/59*2*Math.PI),y:.35+.15*Math.sin(i/59*2*Math.PI)}));
  for(const path of [points,[...points].reverse()]){
    const result=recognize(path);
    assert.equal(result.shape,'Protego');
    assert.equal(result.diagnostics.matchCandidates,'Protego');
    assert.equal(result.diagnostics.protegoGate,'ok');
  }
  assert.equal(spells.protego.kind,'spell');
  assert.equal(spells.circle,undefined);
  assert.equal(spellForShape('Circle'),undefined);
  for(const score of [0,77,78,88,100])assert.equal(castDamage({...cast,score}),0);
  const dummy=new TrainingDummy();
  assert.equal(dummy.cast(cast,100),false);
  assert.equal(dummy.disarmed,false);
  assert.equal('expiresAt' in dummy,false,'shield must target the caster');
});

test('shield blocks damage for three seconds; repeat casts refresh without stacking', () => {
  const shield=new Shield(),other=new Shield();
  assert.equal(shield.damage(30,99),30);
  assert.equal(shield.cast(cast,100),true);
  assert.equal(shield.damage(30,100),0);
  assert.equal(shield.damage(30,3099),0);
  assert.equal(shield.damage(30,3100),30);
  shield.cast(cast,2000);
  assert.equal(shield.expiresAt,5000);
  assert.equal(other.damage(30,2001),30);
  for(const event of [{...cast,type:'reject'},{...cast,accepted:false},{...cast,shape:'Expelliarmus'}])assert.equal(shield.cast(event,3000),false);
  assert.equal(shield.expiresAt,5000);
  shield.reset();
  assert.equal(shield.damage(30,3001),30);
  for(const amount of [NaN,Infinity,-1,'30'])assert.equal(shield.damage(amount,3001),0);
});

test('Fight shield has no hit or projectile, blocks incoming damage, and resets', () => {
  const health=new FightHealth();
  assert.equal(health.protect(cast,100),true);
  assert.equal(health.protect(cast,200),false,'duplicate cast cannot extend protection');
  assert.equal(health.shield.expiresAt,3100);
  assert.equal(health.launch(cast),null);
  assert.equal(health.dummy,200);
  assert.equal(health.hits,0);
  assert.equal(health.pending.size,0);
  assert.equal(health.takeDamage(30,3099),0);
  assert.equal(health.player,200);
  assert.equal(health.takeDamage(30,3100),30);
  assert.equal(health.player,170);
  assert.equal(health.protect({...cast,id:'shield-2'},4000),true);
  health.cancelFlights();
  assert.equal(health.takeDamage(30,4001),0,'tab changes do not end the timed shield');
  health.resetDummy();
  assert.equal(health.takeDamage(500,4002),170);
  assert.equal(health.player,0);
  for(const score of [NaN,-1,101])assert.equal(health.protect({...cast,id:'bad',score},5000),false);
});
