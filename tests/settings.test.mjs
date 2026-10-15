import assert from 'node:assert/strict';
import test from 'node:test';
import {loadSettings,saveSettings,normalizeSettings,SETTINGS_KEY} from '../dist/settings.js';
import {recognize,resample,GestureController} from '../dist/gesture.js';
test('settings persist independent sound choices and selected hand and difficulty',()=>{
  const store=new Map();const storage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
  const expected={music:false,sfx:true,muted:true,hand:'Right',difficulty:'hard'};
  assert.equal(saveSettings(storage,expected),true);assert.deepEqual(loadSettings(storage),expected);
  storage.setItem(SETTINGS_KEY,'bad JSON');assert.equal(loadSettings(storage).hand,'Left');
});
test('unavailable storage and invalid settings safely use defaults',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(loadSettings(storage).difficulty,'normal');assert.equal(saveSettings(storage,{}),false);
  assert.deepEqual(normalizeSettings({music:'false',hand:'Unknown',difficulty:'expert'}),{music:true,sfx:true,muted:false,hand:'Left',difficulty:'normal'});
});
const path=resample([{x:.2,y:.2},{x:.5,y:.2},{x:.5,y:.5}],64);
test('every difficulty preserves the Expelliarmus direction and minimum size',()=>{
  for(const difficulty of ['easy','normal','hard']){
    assert.equal(recognize(path,difficulty).shape,'Expelliarmus');
    assert.equal(recognize([...path].reverse(),difficulty).accepted,false);
    assert.equal(recognize(path.map(p=>({x:p.x*.1,y:p.y*.1})),difficulty).cause,'too_small');
  }
  assert.deepEqual(recognize(path),recognize(path,'normal'));
});
test('difficulty applies capture timeout while normal retains six seconds',()=>{
  for(const [difficulty,limit] of [['easy',9000],['normal',6000],['hard',3500]]){
    const events=[];const controller=new GestureController(event=>events.push(event),{difficulty});
    // Draw continuously around a loop so an end hold cannot finish the capture.
    let t=0;const put=p=>controller.update(p,t+=33);
    for(let i=0;i<20;i++)put({x:.65,y:.4});
    for(let i=0;i<400&&!events.some(e=>e.type==='reject');i++){const a=i*.09;put({x:.5+.15*Math.cos(a),y:.4+.15*Math.sin(a)});}
    const result=events.find(e=>e.type==='reject');assert.ok(result,difficulty);assert.equal(result.cause,'too_long');
    assert.ok(result.duration>=limit&&result.duration<limit+100,difficulty+': '+result.duration);
  }
});
function bowedExpelliarmus(amplitude){
  const points=[];
  // Bow each stroke while preserving the spell's right-then-down direction.
  for(let i=0;i<=40;i++){const t=i/40;points.push({x:.2+.3*t,y:.2+Math.sin(t*Math.PI)*amplitude});}
  for(let i=1;i<=40;i++){const t=i/40;points.push({x:.5+Math.sin(t*Math.PI)*amplitude,y:.2+.3*t});}
  return resample(points);
}
test('Easy accepts a bowed spell that Normal rejects',()=>{
  const trace=bowedExpelliarmus(.05);
  assert.equal(recognize(trace,'easy').shape,'Expelliarmus');
  assert.equal(recognize(trace,'normal').accepted,false);
});
test('Normal accepts a bowed spell that Hard rejects',()=>{
  const trace=bowedExpelliarmus(.035);
  assert.equal(recognize(trace,'normal').shape,'Expelliarmus');
  assert.equal(recognize(trace,'hard').accepted,false);
});
test('Easy still rejects reflected Z and Expelliarmus paths',()=>{
  const z=resample([{x:.2,y:.2},{x:.5,y:.2},{x:.2,y:.5},{x:.5,y:.5}]);
  const reflect=points=>points.map(point=>({x:1-point.x,y:point.y}));
  assert.equal(recognize(z,'easy').shape,'Z');
  assert.equal(recognize(reflect(z),'easy').accepted,false);
  assert.equal(recognize(path,'easy').shape,'Expelliarmus');
  assert.equal(recognize(reflect(path),'easy').accepted,false);
});
