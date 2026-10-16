import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureController,resample} from '../dist/gesture.js';
import {ExpelliarmusLesson} from '../dist/lesson.js';
import {PracticeDummy} from '../dist/dummy.js';

test('Consecutive casts, fresh paths, and recovery', () => {

const line=pairs=>resample(pairs.map(([x,y])=>({x,y})),40);
const shapes={
  Expelliarmus:line([[0,0],[.24,0],[.24,.24]]),
  'Basic Cast':line([[0,0],[.12,.24],[.24,0]]),
  Confringo:line([[0,0],[.24,0],[0,.24],[.24,.24]]),
  Protego:Array.from({length:50},(_,i)=>({x:.1*(Math.cos(i/49*2*Math.PI)-1),y:.1*Math.sin(i/49*2*Math.PI)}))
};
const place=(points,p)=>points.map(q=>({x:q.x+p.x,y:q.y+p.y}));
function trial(){
  let t=0,disarms=0;const events=[],lesson=new ExpelliarmusLesson(),dummy=new PracticeDummy();
  lesson.start();
  const c=new GestureController(e=>{events.push(e);lesson.update(e);if(dummy.cast(e,t))disarms++;});
  const put=p=>c.update(p,t+=33);
  const hold=(p,n=12)=>{for(let i=0;i<n;i++)put(p);};
  const draw=points=>{
    const start=events.length;
    points.forEach(put);
    for(let i=0;i<18&&!events.slice(start).some(e=>['cast','reject','ignored'].includes(e.type));i++)put(points.at(-1));
    return events.slice(start).filter(e=>['cast','reject','ignored','cancel'].includes(e.type));
  };
  return {c,events,lesson,dummy,put,hold,draw,
    missing:n=>{for(let i=0;i<n;i++)c.missing(t+=33);},
    disarms:()=>disarms,now:()=>t};
}

// Every shape can follow every shape with no new start hold.
for(const [first,a] of Object.entries(shapes))for(const [second,b] of Object.entries(shapes)){
  const s=trial(),start={x:.25,y:.2},one=place(a,start);
  s.hold(start);assert.equal(s.draw(one)[0].shape,first);
  assert.equal(s.c.state,'ready');assert.equal(s.c.path.length,0);
  const firstEndedAt=s.now(),two=place(b,one.at(-1)),results=s.draw(two);
  assert.equal(results.length,1,first+' -> '+second);
  assert.equal(results[0].type,'cast');assert.equal(results[0].shape,second);
  assert.equal(results[0].diagnostics.captureNo,2);
  assert.ok(results[0].path.every(p=>p.t>=firstEndedAt));
  const count=Number(first==='Expelliarmus')+Number(second==='Expelliarmus');
  assert.equal(s.lesson.count,count);assert.equal(s.disarms(),Math.min(1,count));
  s.hold(two.at(-1),120);
  assert.equal(s.events.filter(e=>e.type==='cast').length,2,'holding cannot duplicate a cast');
}

// Starting still requires a hold. Failed moves also require a new hold.
{
  const s=trial();s.draw(place(shapes.Expelliarmus,{x:.25,y:.2}));
  assert.equal(s.events.filter(e=>e.type==='cast').length,0);
}
const seed=()=>{
  const s=trial(),points=place(shapes.Expelliarmus,{x:.25,y:.2});
  s.hold(points[0]);s.draw(points);return {s,end:points.at(-1)};
};
const wrong=[
  line([[0,0],[-.24,-.24]]), // Normal return movement.
  line([[0,0],[.24,0]]),
  line([[0,0],[0,-.24],[-.24,-.24]]), // Reverse Expelliarmus.
  line([[0,0],[-.24,0],[-.24,.24]]), // Reflected Expelliarmus.
  line([[0,0],[.24,0],[.24,.24],[0,.24],[0,0]])
];
for(const points of wrong){
  const {s,end}=seed(),results=s.draw(place(points,end));
  assert.ok(results.length>0);assert.ok(results.every(e=>e.type!=='cast'));
  assert.equal(s.c.state,'waiting');assert.equal(s.lesson.count,1);assert.equal(s.disarms(),1);
}
// Small movement around the end point must not cast.
{
  const {s,end}=seed();
  for(let i=0;i<120;i++)s.put({x:end.x+Math.sin(i)*.005,y:end.y+Math.cos(i)*.005});
  assert.equal(s.events.filter(e=>e.type==='cast').length,1);
}
// Keep the prior point/time so a gap or jump cannot start an unchecked cast.
for(const duringDraw of [false,true]){
  const {s,end}=seed();
  if(duringDraw)place(shapes.Expelliarmus,end).slice(0,20).forEach(s.put);
  s.missing(10);assert.equal(s.c.state,'waiting');
  assert.equal(s.events.filter(e=>e.type==='cast').length,1);
  if(duringDraw)assert.ok(s.events.some(e=>e.type==='cancel'));
  s.hold(end,4);assert.equal(s.c.state,'waiting','loss requires a full new hold');
  s.hold(end);s.draw(place(shapes.Expelliarmus,end));
  assert.equal(s.events.filter(e=>e.type==='cast').length,2);
}
{
  const {s}=seed();s.put({x:.9,y:.7});
  assert.equal(s.c.state,'waiting');assert.equal(s.events.filter(e=>e.type==='cast').length,1);
}
{
  const {s,end}=seed();s.c.update(end,s.now()+250);
  assert.equal(s.c.state,'waiting','a frame delay after a cast requires a new hold');
  assert.equal(s.events.filter(e=>e.type==='cast').length,1);
}
for(const cause of ['camera_stopped','input_changed']){
  const {s,end}=seed();s.c.cancel('Stopped',cause);s.hold(end,4);
  assert.equal(s.c.state,'waiting');assert.equal(s.events.filter(e=>e.type==='cast').length,1);
}
console.log('PASS: 16 immediate cast pairs, fresh paths, no duplicate/false casts, lesson/disarm counts, tracking loss, and control resets.');
});
