import test from 'node:test';
import assert from 'node:assert/strict';
import {DuelFighter, DuelOpponent, duelDamage, applyDuelImpact} from '../dist/combat/solo-duel.js';
import {COMBAT_RULES, COMBAT_SPELLS, DIFFICULTIES} from '../dist/combat/rules.js';
import {PracticeArenaHealth} from '../dist/practice-arena-health.js';
const cast = (shape, id = shape, score = 95) => ({shape,id,score});
const active = {active:true};

test('every mode uses fixed damage, rejects invalid scores, and consumes impacts once', () => {
  for (const [shape, damage] of [['Basic Cast',20],['Confringo',40],['Expelliarmus',10],['Protego',0]]) {
    for (const score of [0,78,88,100]) {
      assert.equal(duelDamage(score,shape),damage);
      const health=new PracticeArenaHealth(), shot=health.launch({...cast(shape,shape,score),damage:999});
      if (!damage) { assert.equal(shot,null); continue; }
      assert.equal(health.dummy,200);
      assert.equal(health.hit(shot,100).damage,damage);
      assert.equal(health.hit(shot,101),null);
    }
  }
  for (const score of [-1,101,NaN,Infinity,'95']) assert.equal(duelDamage(score,'Basic Cast'),0);
  for (const shape of ['unknown','toString',null]) assert.equal(duelDamage(95,shape),0);
});

test('flight and recovery start at release; drawing and recovery overlap', () => {
  for (const [shape,flight,recovery] of [['Basic Cast',1000,600],['Confringo',1200,2000],['Expelliarmus',1100,800]]) {
    const f=new DuelFighter(), first=f.submit(cast(shape),100);
    assert.equal(first.flightMs,flight); assert.equal(f.recoveryUntil,100+recovery);
    assert.equal(f.submit(cast('Basic Cast','next'),200).type,'queued');
    assert.equal(f.update(99+recovery),null);
    assert.equal(f.update(100+recovery).launchedAt,100+recovery);
    assert.equal(f.update(100+recovery),null);
  }
});

test('Protego replaces one queued attack, preserves recovery, and starts only on release', () => {
  const f=new DuelFighter(); f.submit(cast('Confringo'),0);
  f.submit(cast('Basic Cast','queued'),100);
  assert.equal(f.submit(cast('Protego'),200).replaced,'queued');
  assert.equal(f.recoveryUntil,2000); assert.equal(f.shield.active(200),false);
  assert.equal(f.submit(cast('Expelliarmus'),300).type,'rejected');
  assert.equal(f.update(1999),null); assert.equal(f.update(2000).type,'shield');
  assert.equal(f.shield.expiresAt,4000); assert.equal(f.shieldReadyAt,6000);
  assert.equal(f.submit(cast('Basic Cast','queued'),6000).type,'rejected');
});

test('an unavailable shield cannot replace a queued attack', () => {
  const f=new DuelFighter(); f.submit(cast('Protego'),0); f.submit(cast('Confringo'),100);
  f.submit(cast('Basic Cast'),200);
  assert.equal(f.submit(cast('Protego','early'),300).type,'rejected');
  assert.equal(f.queued.shape,'Basic Cast');
});

test('shield lasts two seconds, cannot refresh, and has four seconds between releases', () => {
  const f=new DuelFighter(); f.submit(cast('Protego'),100);
  assert.equal(f.shield.active(2099),true); assert.equal(f.shield.active(2100),false);
  assert.equal(f.submit(cast('Protego','early'),4099).type,'rejected');
  assert.equal(f.shield.expiresAt,2100);
  assert.equal(f.submit(cast('Protego','ready'),4100).type,'shield');
});

test('disarm lasts two seconds, cannot extend, clears preparation and queue, then protects for four seconds', () => {
  for (const f of [new DuelFighter(),new DuelOpponent()]) {
    f.submit(cast('Confringo'),0); f.submit(cast('Basic Cast'),100);
    f.preparing={shape:'Confringo'}; assert.equal(f.disarm(200),true);
    assert.equal(f.queued,null); assert.equal(f.returnAt,2200);
    assert.equal(f.disarm(1000),false); assert.equal(f.returnAt,2200);
    assert.equal(f.submit(cast('Protego'),2199).type,'rejected');
    assert.equal(f.restore(2200),true); assert.equal(f.disarm(6199),false);
    assert.equal(f.disarm(6200),true);
  }
});

test('invalid times and duplicate IDs cannot change fighter state', () => {
  const f=new DuelFighter(); f.disarm(100);
  assert.equal(f.submit(cast('Basic Cast'),NaN).type,'rejected'); assert.equal(f.returnAt,2100);
  for (const id of ['',null,undefined]) assert.equal(f.submit({shape:'Basic Cast',score:95,id},3000).type,'rejected');
});

test('only an accepted impact disarms; shields prevent damage and disarm', () => {
  const target=new DuelFighter(), player=new DuelFighter(), health=new PracticeArenaHealth({targetShield:target.shield});
  target.submit(cast('Protego'),0);
  const shot=health.launch(cast('Expelliarmus'));
  assert.equal(applyDuelImpact(target,player,shot,health.hit(shot,900),900).disarmed,false);
  const next=health.launch(cast('Expelliarmus','next'));
  assert.equal(applyDuelImpact(target,player,next,health.hit(next,2200),2200).disarmed,true);
  assert.equal(applyDuelImpact(target,player,next,health.hit(next,2201),2201).disarmed,false);
});

test('player perfect block includes 400 ms once; penalty does not shorten longer recovery or remove flights', () => {
  for (const delay of [399,400,401]) {
    const player=new DuelFighter(), attacker=new DuelOpponent();
    player.submit(cast('Protego'),1000); attacker.preparing={shape:'Confringo'};
    const result=applyDuelImpact(player,attacker,cast('Basic Cast'),{blocked:true,damage:0},1000+delay);
    assert.equal(result.perfect,delay<=400);
    assert.equal(player.shield.block(1000+delay),false);
    if (delay<=400) { assert.equal(attacker.recoveryUntil,2500+delay); assert.equal(attacker.preparing,null); }
  }
  const player=new DuelFighter(); player.recoveryUntil=10000; player.punish(1000); assert.equal(player.recoveryUntil,10000);
  const health=new PracticeArenaHealth(), shot=health.launch(cast('Basic Cast'));
  player.punish(1100); assert.equal(health.hit(shot,1200).damage,20);
});

for (const difficulty of Object.keys(DIFFICULTIES)) {
  test(`${difficulty}: notice, visible shield preparation, probability, and no automatic perfect blocks`, () => {
    const p=DIFFICULTIES[difficulty], o=new DuelOpponent({random:()=>0});
    o.update(0,active);
    assert.equal(o.reactToAttack(0,{...active,difficulty,flightMs:1200,id:'one'}),true);
    assert.equal(o.update(p.noticeMs-1,active),null);
    assert.equal(o.update(p.noticeMs,active).type,'prepare-shield');
    assert.equal(o.shield.active(p.noticeMs),false);
    assert.equal(o.update(p.noticeMs+p.shieldPrepareMs,active).type,'shield');
    assert.equal(o.shield.block(p.noticeMs+p.shieldPrepareMs+1),false);
    const miss=new DuelOpponent({random:()=>p.shieldChance});
    assert.equal(miss.reactToAttack(0,{...active,difficulty,id:'one'}),false);
    miss.random=()=>0;
    assert.equal(miss.reactToAttack(1,{...active,difficulty,id:'one'}),false,'same attack cannot reroll');
    assert.equal(miss.reactToAttack(1,{...active,difficulty,id:'two'}),true);
  });
  test(`${difficulty}: attack spacing is independent of recovery, including delayed frames`, () => {
    const o=new DuelOpponent(), state={...active,difficulty}, p=DIFFICULTIES[difficulty];
    o.update(0,state); const first=o.update(COMBAT_RULES.readyMs,state);
    assert.equal(first.warningMs,p.warnings['Basic Cast']);
    const release=o.update(first.releaseAt,state);
    const nextStart=release.launchedAt+p.attackGapMs-p.warnings.Confringo;
    assert.equal(o.update(nextStart-1,state),null);
    const next=o.update(nextStart,state); assert.equal(next.shape,'Confringo');
    const second=o.update(next.releaseAt,state);
    assert.equal(second.launchedAt-release.launchedAt,p.attackGapMs);
    o.update(second.launchedAt+p.attackGapMs-p.warnings['Basic Cast'],state);
    const late=o.update(100000,state); assert.equal(late.type,'cast');
    assert.equal(o.update(100000,state),null); assert.equal(o.nextAttackAt,100000+p.attackGapMs);
  });
}

test('stop, disarm, punishment and reset cancel defense; an expired threat cannot create a late shield', () => {
  for (const cancel of [o=>o.stop(),o=>o.disarm(100),o=>o.punish(100),o=>o.reset()]) {
    const o=new DuelOpponent({random:()=>0});o.update(0,active);o.reactToAttack(0,{...active,id:'one'});
    cancel(o); assert.equal(o.defending,null); assert.equal(o.update(900,active)?.type==='shield',false);
  }
  const o=new DuelOpponent({random:()=>0});o.update(0,active);o.reactToAttack(0,{...active,flightMs:600});
  assert.notEqual(o.update(600,active)?.type,'shield'); assert.equal(o.shield.active(600),false);
});

test('prepared actions keep their difficulty settings; the next preparation uses the new profile', () => {
  const o=new DuelOpponent({random:()=>0});o.update(0,{...active,difficulty:'easy'});
  const first=o.update(3000,{...active,difficulty:'easy'});
  assert.equal(o.update(first.releaseAt-1,{...active,difficulty:'hard'}),null);
  o.update(first.releaseAt,{...active,difficulty:'hard'});
  assert.equal(o.nextAttackAt,first.releaseAt+8000);
});
