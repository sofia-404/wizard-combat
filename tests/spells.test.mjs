import test from 'node:test';
import assert from 'node:assert/strict';
import {recognize,resample,GestureController} from '../dist/gesture.js';
import {narrowCorner} from './fixtures/narrow-corner.mjs';

test('Spell paths and Confringo rejection', () => {

let checks=0;
const path=(pairs,n=40)=>resample(pairs.map(([x,y])=>({x,y})),n);
const exp=path([[.25,.2],[.55,.2],[.55,.5]]);
function run(points,{step=33,gapAt=-1,gapFrames=0,cornerPause=0}={}){
  const events=[],c=new GestureController(e=>events.push(e));let t=0;
  const put=p=>c.update(p,t+=step);
  for(let i=0;i<16;i++)put(points[0]);
  for(let i=0;i<points.length;i++){
    if(i===gapAt)for(let j=0;j<gapFrames;j++)c.missing(t+=step);
    put(points[i]);
    if(i===Math.floor(points.length/2))for(let j=0;j<cornerPause;j++)put(points[i]);
  }
  for(let i=0;i<40;i++)put(points.at(-1));
  return events;
}
const casts=events=>events.filter(e=>e.type==='cast');
function expectCast(points,shape,options){
  const events=run(points,options),hits=casts(events);
  assert.equal(hits.length,1,JSON.stringify({shape,events}));
  assert.equal(hits[0].shape,shape);checks++;
  return hits[0];
}
// Existing paths keep reversed drawing order.
const old={Protego:Array.from({length:60},(_,i)=>({x:.45+.15*Math.cos(i/59*Math.PI*2),y:.35+.15*Math.sin(i/59*Math.PI*2)})),
  'Basic Cast':path([[.25,.2],[.4,.5],[.55,.2]]),Confringo:path([[.25,.2],[.55,.2],[.25,.5],[.55,.5]])};
for(const [shape,points] of Object.entries(old))for(const step of [22,33,50])for(const reverse of [false,true]){
  expectCast(reverse?[...points].reverse():points,shape,{step});
}
for(const scale of [.5,1,1.4])for(const dx of [-.1,.1])for(const step of [22,33,50]){
  const points=exp.map((p,i)=>({x:.25+(p.x-.25)*scale+dx+Math.sin(i*2)*.0015,y:.15+(p.y-.2)*scale+Math.cos(i*2)*.0015}));
  const hit=expectCast(points,'Expelliarmus',{step});
  assert.equal(hit.diagnostics.expelliarmusGate,'ok');assert.equal(hit.diagnostics.motionForm,'spell_corner');
}
for(const pairs of [
  [[.2,.2],[.5,.21],[.51,.24],[.51,.5]], // Small round corner.
  [[.2,.2],[.6,.22],[.58,.45]], // Small tilt and unequal arms.
  [[.2,.2],[.4,.2],[.4,.6]]
])expectCast(path(pairs),'Expelliarmus');

const negatives={
  reverse:[...exp].reverse(),mirrorX:exp.map(p=>({x:1-p.x,y:p.y})),mirrorY:exp.map(p=>({x:p.x,y:.7-p.y})),
  diagonal:path([[.2,.2],[.5,.5]]),horizontal:path([[.2,.2],[.5,.2]]),vertical:path([[.5,.2],[.5,.5]]),
  shortEnd:path([[.2,.2],[.5,.2],[.5,.23]]),shortStart:path([[.2,.2],[.23,.2],[.23,.5]]),
  diagonalCorner:path([[.2,.2],[.5,.35],[.5,.6]]),
  quarterArc:Array.from({length:40},(_,i)=>({x:.2+.3*Math.sin(i/39*Math.PI/2),y:.5-.3*Math.cos(i/39*Math.PI/2)})),
  return:path([[.2,.2],[.5,.5],[.2,.2]]),
  square:path([[.2,.2],[.5,.2],[.5,.5],[.2,.5],[.2,.2]]),
  reflectedZ:old.Confringo.map(p=>({x:1-p.x,y:p.y}))
};
for(const [name,points] of Object.entries(negatives)){
  assert.equal(recognize(points).accepted,false,name+' direct');
  assert.equal(casts(run(points)).length,0,name+' captured');checks++;
}
// A short corner pause may continue. A full end hold splits the gesture.
expectCast(exp,'Expelliarmus',{cornerPause:2});
assert.equal(casts(run(exp,{cornerPause:14})).length,0);checks++;
// A brief gap may resume. A missing point never counts as a pause.
for(const gapAt of [10,22,35]){
  const hit=expectCast(exp,'Expelliarmus',{gapAt,gapFrames:3});
  assert.equal(hit.diagnostics.gapResumes,1);
  const events=run(exp,{gapAt,gapFrames:9});
  assert.equal(casts(events).length,0);assert.equal(events.filter(e=>e.type==='cancel').length,1);checks++;
}
// Loss at the end cannot complete the spell. A new full gesture can recover.
for(const cut of [10,30,40]){
  const events=[],c=new GestureController(e=>events.push(e));let t=0;
  const put=p=>c.update(p,t+=33);
  for(let i=0;i<16;i++)put(exp[0]);
  for(const p of exp.slice(0,cut))put(p);
  for(let i=0;i<15;i++)c.missing(t+=33);
  assert.equal(casts(events).length,0);assert.equal(events.filter(e=>e.type==='cancel').length,1);
  for(let i=0;i<16;i++)put(exp[0]);
  for(const p of exp)put(p);
  for(let i=0;i<40;i++)put(exp.at(-1));
  assert.equal(casts(events).length,1);checks++;
}
// A jump after a gap cancels, including after the corner.
{
  const events=[],c=new GestureController(e=>events.push(e));let t=0;
  for(let i=0;i<16;i++)c.update(exp[0],t+=33);
  for(const p of exp.slice(0,30))c.update(p,t+=33);
  c.missing(t+=33);c.update({x:.9,y:.7},t+=99);
  assert.equal(casts(events).length,0);assert.ok(events.some(e=>e.cause==='gap_motion'));checks++;
}
// Keep direction, scale, sample count, and capture smoothing in the regression.
for(const scale of [.6,1,1.2])for(const count of [21,40,64])for(const reverse of [false,true]){
  let points=resample(narrowCorner.map(p=>({x:.2+(p.x-.3)*scale,y:.1+(p.y-.15)*scale})),count);
  if(reverse)points.reverse();
  const result=recognize(points);
  assert.equal(result.accepted,false,'narrow corner must not cast');
  assert.equal(result.score,0,'a rejected corner must have no match score');
  assert.equal(result.diagnostics.confringoGate,'z_strokes');
  assert.equal(casts(run(points)).length,0,'narrow corner after capture');checks++;
}
// Check Expelliarmus proportions on both sides of the existing .4--2.5 limit.
// Width/height is measured in camera units, not stretched preview pixels.
for(const ratio of [.18,.23,.327,.39,.41,.6,1,1.69,2.49,2.51,3]){
  const height=.4/Math.max(1,ratio),width=height*ratio;
  const points=path([[.2,.15],[.2+width,.15],[.2+width,.15+height]],64);
  const valid=ratio>=.4&&ratio<=2.5;
  const result=recognize(points);
  assert.equal(result.shape,valid?'Expelliarmus':'None',`arm ratio ${ratio}`);
  if(!valid)assert.equal(result.score,0);
  const hits=casts(run(points));
  if(ratio>=.6&&ratio<=1.69)assert.equal(hits.length,1);
  if(ratio<=.327||ratio>=3)assert.equal(hits.length,0);
  // Capture can shorten the first arm at slow speed. Check the measured shape.
  for(const hit of hits){
    assert.equal(hit.shape,'Expelliarmus');
    const measured=hit.diagnostics.width/hit.diagnostics.height;
    assert.ok(measured>=.399&&measured<=2.501,`captured ratio ${measured}`);
  }
  for(const form of ['reverse','mirrorX','mirrorY']){
    const wrong=form==='reverse'?[...points].reverse():points.map(p=>({x:form==='mirrorX'?1-p.x:p.x,y:form==='mirrorY'?.75-p.y:p.y}));
    assert.equal(recognize(wrong).accepted,false,`wrong ${form}, ratio ${ratio}`);
    assert.equal(casts(run(wrong)).length,0);checks++;
  }
  checks++;
}
// Known capture limit: the ready hold can shorten a slowly drawn first arm.
// This near-boundary input is ignored, not changed into a different spell.
{
  const events=run(path([[.2,.15],[.364,.15],[.364,.55]],64));
  assert.equal(casts(events).length,0);
  assert.ok(events.some(e=>e.type==='ignored'));checks++;
}
// A real narrow Confringo still has three clear strokes, in either drawing order.
for(const ratio of [.5,.7,1,1.4,2])for(const reverse of [false,true]){
  const height=.3,width=height*ratio;
  let points=path([[.15,.15],[.15+width,.15],[.15,.15+height],[.15+width,.15+height]],45);
  if(reverse)points.reverse();
  expectCast(points,'Confringo');
}
console.log(`PASS: ${checks} gesture cases. Simulated input only.`);
});
