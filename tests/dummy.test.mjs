import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainingDummy} from '../dist/dummy.js';
import {GestureController,resample} from '../dist/gesture.js';

test('Disarm timing and gesture integration', () => {

const dummy=new TrainingDummy(),exp={type:'cast',accepted:true,shape:'Expelliarmus'};
assert.equal(dummy.disarmed,false);
for(const event of [
  ...['Protego','Basic Cast','Confringo'].map(shape=>({...exp,shape})),
  ...['reject','ignored','cancel','capture'].map(type=>({...exp,type})),
  {...exp,accepted:false}
]){
  assert.equal(dummy.cast(event,100),false);
  assert.equal(dummy.disarmed,false);
}
assert.equal(dummy.cast(exp,100),true);
assert.equal(dummy.restore(2099),false);
assert.equal(dummy.disarmed,true);
assert.equal(dummy.restore(2100),true);
assert.equal(dummy.restore(2101),false,'return occurs once');
dummy.cast(exp,3000);dummy.cast(exp,4000);
assert.equal(dummy.restore(5000),false,'another Expelliarmus restarts the wait');
dummy.cast({...exp,shape:'Basic Cast'},5500);
dummy.cast({...exp,type:'cancel'},5900);
assert.equal(dummy.restore(6000),true,'other events do not extend the wait');
dummy.cast(exp,7000);dummy.reset();
assert.equal(dummy.disarmed,false);
assert.equal(dummy.restore(9000),false,'session reset has no later return');

// Feed real capture results to the dummy. Simulated paths are not player tests.
const path=pairs=>resample(pairs.map(([x,y])=>({x,y})),40);
const points=path([[.25,.2],[.55,.2],[.55,.5]]);
function run(points,loss=false){
  dummy.reset();let t=0,disarms=0;const events=[];
  const controller=new GestureController(e=>{events.push(e);if(dummy.cast(e,t))disarms++;});
  const put=p=>controller.update(p,t+=33);
  for(let i=0;i<16;i++)put(points[0]);
  for(const p of loss?points.slice(0,25):points)put(p);
  if(loss)for(let i=0;i<15;i++)controller.missing(t+=33);
  else for(let i=0;i<40;i++)put(points.at(-1));
  return {disarms,events};
}
assert.equal(run(points).disarms,1);
for(const shape of [
  [...points].reverse(),points.map(p=>({x:1-p.x,y:p.y})),
  path([[.2,.2],[.5,.2]]),path([[.25,.2],[.4,.5],[.55,.2]]),
  path([[.25,.2],[.55,.2],[.25,.5],[.55,.5]]),
  Array.from({length:60},(_,i)=>({x:.45+.15*Math.cos(i/59*Math.PI*2),y:.35+.15*Math.sin(i/59*Math.PI*2)}))
])assert.equal(run(shape).disarms,0);
const lost=run(points,true);
assert.equal(lost.disarms,0);assert.ok(lost.events.some(e=>e.type==='cancel'));
assert.equal(run(points).disarms,1,'casting recovers after loss');
console.log('PASS: dummy disarm, two-second return, repeat cast, reset, Protego/Basic Cast/Confringo, false casts, tracking loss, and recovery.');
});
