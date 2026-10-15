import test from 'node:test';
import assert from 'node:assert/strict';
import {ExpelliarmusLesson} from '../dist/lesson.js';
import {GestureController,resample} from '../dist/gesture.js';

test('Three-cast lesson and gesture integration', () => {

const lesson=new ExpelliarmusLesson();
const cast=shape=>({type:'cast',accepted:true,shape});
lesson.update(cast('Expelliarmus'));assert.equal(lesson.count,0,'free practice must not count');
lesson.start();assert.equal(lesson.state,'active');
lesson.update(cast('Expelliarmus'));assert.equal(lesson.count,1);
for(const shape of ['Circle','V','Z']){
  lesson.update(cast(shape));assert.equal(lesson.count,1,shape+' must not advance');
}
for(const event of [{type:'cast',shape:'Expelliarmus',accepted:false},{type:'reject'},
  {type:'ignored'},{type:'capture'},{type:'cancel',reason:'Tracking lost'}]){
  lesson.update(event);assert.equal(lesson.count,1,'only a correct cast advances');
}
lesson.update(cast('Expelliarmus'));assert.equal(lesson.count,2);assert.equal(lesson.state,'active');
lesson.update(cast('Expelliarmus'));assert.equal(lesson.count,3);assert.equal(lesson.state,'complete');
const completeMessage=lesson.message;
for(const shape of ['Expelliarmus','Circle','V','Z'])lesson.update(cast(shape));
assert.equal(lesson.count,3);assert.equal(lesson.message,completeMessage);
lesson.start();assert.equal(lesson.count,0);assert.equal(lesson.state,'active');
lesson.stop();lesson.update(cast('Expelliarmus'));assert.equal(lesson.count,0);assert.equal(lesson.state,'idle');

// Real gesture-controller events must produce one lesson increment per cast.
lesson.start();let t=0;
const controller=new GestureController(e=>lesson.update(e));
const draw=pairs=>{
  const points=resample(pairs.map(([x,y])=>({x,y})),40);
  for(let i=0;i<16;i++)controller.update(points[0],t+=33);
  for(const p of points)controller.update(p,t+=33);
  for(let i=0;i<40;i++)controller.update(points.at(-1),t+=33);
};
draw([[.25,.2],[.55,.2],[.55,.5]]);assert.equal(lesson.count,1);
draw([[.25,.2],[.4,.5],[.55,.2]]);assert.equal(lesson.count,1);
draw([[.25,.2],[.55,.2],[.25,.5],[.55,.5]]);assert.equal(lesson.count,1);
draw([[.25,.2],[.55,.2],[.55,.5]]);assert.equal(lesson.count,2);
draw([[.25,.2],[.55,.2],[.55,.5]]);assert.equal(lesson.count,3);assert.equal(lesson.state,'complete');
draw([[.25,.2],[.55,.2],[.55,.5]]);assert.equal(lesson.count,3);
console.log('PASS: lesson start, reset, exit, three casts, wrong shapes, failures, losses, completion cap, and capture integration.');
});
