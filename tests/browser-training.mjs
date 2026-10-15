import {chromium} from 'playwright-core';
import {readFile,mkdir,mkdtemp,cp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
const root=path.dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
const folder=await mkdtemp(path.join(tmpdir(),'wizard-combat-browser-'));
const output=path.join(root,'.tmp/browser-check');
await mkdir(output,{recursive:true});
await cp(path.join(root,'dist'),path.join(folder,'dist'),{recursive:true});
await copyFile(path.join(root,'server.mjs'),path.join(folder,'server.mjs'));
let api;
let browser;
try{
 api=spawn(process.execPath,['server.mjs'],{cwd:folder,env:{...process.env,PORT:String(randomInt(20000,60000))},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{
  let output='',errors='';
  const timer=setTimeout(()=>reject(Error('Server start timed out: '+errors)),10000);
  api.stderr.on('data',data=>{errors+=data;});
  api.stdout.on('data',data=>{output+=data;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\//);if(match){clearTimeout(timer);resolve(match[0]);}});
  api.once('error',error=>{clearTimeout(timer);reject(error);});
  api.once('exit',code=>{clearTimeout(timer);reject(Error(`Server exited with ${code}: ${errors}`));});
 });
 const origin=new URL(base).origin;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['camera']});
 const page=await context.newPage(),errors=[],records=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/*',async route=>{
  const payload=route.request().postData(),endpoint=new URL(route.request().url()).pathname;if(endpoint==='/api/events')records.push(JSON.parse(payload));
  const response=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:payload});
  await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 await page.addInitScript(()=>{
  window.steps=[];window.step=0;
  window.Worker=class{
   postMessage(data){
    if(data.type==='init'){setTimeout(()=>this.onmessage({data:{type:'ready'}}),0);return;}
    data.bitmap.close();const s=window.steps[Math.min(window.step++,window.steps.length-1)];
    let landmarks=s&&!s.missing?[Array.from({length:21},()=>({x:1-s.x,y:s.y/.75,z:0}))]:[];
    if(s?.duplicate&&landmarks.length)landmarks.push(landmarks[0].map(p=>({...p,x:p.x+.003})));
    setTimeout(()=>this.onmessage({data:{type:'result',t:data.t,inference:12,landmarks,handedness:landmarks.map(()=>[{categoryName:s.label||'Left',score:.55}])}}),2);
   }
   terminate(){}
  };
 });
 await page.goto(base);

 assert.equal(await page.title(),'Wizard Combat');
 const send=async points=>page.evaluate(steps=>{window.steps=steps;window.step=0;},[...Array(18).fill(points[0]),...points,...Array(22).fill(points.at(-1))]);
 const saved=async()=>page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved on this laptop');
 const exp=resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}],40);
 const draw=async(points,shape)=>{
  for(let attempt=0;attempt<3;attempt++){
   const oldHits=parseInt(await page.locator('#hits').textContent()),start=records.length;
   await send(points);
   await page.waitForFunction(()=>window.step>=window.steps.length&&document.querySelector('#phase').textContent==='READY');await saved();
   const results=records.slice(start).filter(e=>['cast','reject','cancel','ignored'].includes(e.type));
   const casts=results.filter(e=>e.type==='cast');
   if(!casts.length&&results.some(e=>e.type==='cancel'&&['gap_duration','stale_frame','worker_stall'].includes(e.cause))&&attempt<2){
    console.log('Retry after a browser frame gap: '+shape);continue;
   }
   assert.equal(casts.length,1,JSON.stringify({shape,results}));
   assert.equal(casts[0].shape,shape);
   assert.equal(parseInt(await page.locator('#hits').textContent()),oldHits+1);
   assert.equal(await page.locator('#lastShape').textContent(),shape);
   const disarms=records.slice(start).filter(e=>e.cause==='dummy_disarm');
   assert.equal(disarms.length,shape==='Expelliarmus'?1:0);
   if(shape==='Expelliarmus'){
    assert.ok(await page.locator('#targetScene').evaluate(el=>el.classList.contains('disarmed')));
    assert.equal(await page.locator('#dummyStatus').textContent(),'Disarmed · Wand returns in 2 seconds');
   }
   return;
  }
 };
 const expectState=async(state,count)=>{
  assert.equal(await page.locator('#lessonCount').textContent(),`${count} / 3`);
  assert.equal(await page.locator('#lessonStart').isVisible(),state!=='active');
  assert.equal(await page.locator('#lessonStop').isVisible(),state!=='idle');
  if(state==='complete'){
   assert.equal(await page.locator('#lessonMessage').textContent(),'Lesson complete: 3/3.');
   assert.equal(await page.locator('#lessonStop').textContent(),'Finish lesson');
   assert.equal(await page.locator('#lessonStart').textContent(),'Practice again');
  }else if(state==='active')assert.equal(await page.locator('#lessonStop').textContent(),'Stop lesson');
  else assert.equal(await page.locator('#lessonStart').textContent(),'Start lesson');
 };
 await expectState('idle',0);
 await page.locator('#lessonStart').click();await expectState('active',0);
 assert.equal(await page.locator('#camera').textContent(),'Start camera');
 await send(Array(20).fill(exp[0]));await page.locator('#camera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 const circle=Array.from({length:50},(_,i)=>({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
 for(const [shape,points] of [['Circle',circle],['V',resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}],40)],['Z',resample([{x:.25,y:.2},{x:.6,y:.2},{x:.25,y:.45},{x:.6,y:.45}],40)]]){
  await draw(points,shape);await expectState('active',0);
 }
 // False paths and a loss must not hit, disarm, or advance the lesson.
 const noCast=async(steps,loss=false)=>{
  const start=records.length,oldHits=await page.locator('#hits').textContent();
  if(loss)await page.evaluate(steps=>{window.steps=steps;window.step=0;},steps);
  else await send(steps);
  await page.waitForFunction(()=>window.step>=window.steps.length);await saved();
  const results=records.slice(start);
  assert.ok(results.some(e=>['ignored','reject','cancel'].includes(e.type)));
  if(loss)assert.ok(results.some(e=>e.type==='cancel'&&e.endRule==='loss'));
  assert.ok(!results.some(e=>e.type==='cast'||e.cause==='dummy_disarm'));
  assert.equal(await page.locator('#hits').textContent(),oldHits);
  assert.equal(await page.locator('#dummyStatus').textContent(),'Wand ready');
  await expectState('active',0);
 };
 await noCast([...exp].reverse());
 await noCast(exp.map(p=>({x:1-p.x,y:p.y})));
 await noCast(resample([{x:.25,y:.2},{x:.55,y:.2}],40));
 await noCast([...Array(18).fill(exp[0]),...exp.slice(0,25),...Array(18).fill({missing:true})],true);
 for(let i=1;i<=3;i++){await draw(exp,'Expelliarmus');await expectState(i===3?'complete':'active',i);}
 await page.locator('.target-panel').screenshot({path:path.join(output,'disarmed.png')});
 await page.waitForFunction(()=>document.querySelector('#dummyStatus').textContent==='Wand ready');await saved();
 const returned=records.findLast(e=>e.cause==='dummy_return'),disarmed=records.findLast(e=>e.cause==='dummy_disarm');
 const elapsed=Date.parse(returned.at)-Date.parse(disarmed.at);
 assert.ok(elapsed>=1950&&elapsed<2400,'wand return timing: '+elapsed);
 await page.locator('.target-panel').screenshot({path:path.join(output,'ready.png')});
 assert.equal(await page.locator('#camera').textContent(),'Stop camera');
 await draw(exp,'Expelliarmus');await expectState('complete',3);
 await draw(circle,'Circle');await expectState('complete',3);
 await page.screenshot({path:path.join(output,'complete.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1100});
 await page.locator('#lessonStart').click();await expectState('active',0);
 assert.equal(await page.locator('#camera').textContent(),'Stop camera');
 for(let i=1;i<=3;i++)await draw(exp,'Expelliarmus');
 await expectState('complete',3);
 await page.locator('#lessonStop').click();await expectState('idle',0);await saved();
 assert.equal(await page.locator('#camera').textContent(),'Stop camera');
 assert.ok(records.some(e=>e.cause==='lesson_finish'&&e.lessonState==='idle'&&e.lessonCount===0));
 await draw(exp,'Expelliarmus');await expectState('idle',0);
 await page.locator('#lessonStart').click();await draw(exp,'Expelliarmus');await expectState('active',1);
 await page.locator('#lessonStop').click();await expectState('idle',0);
 assert.equal(await page.locator('#camera').textContent(),'Stop camera');
 await page.locator('#lessonStart').click();await draw(exp,'Expelliarmus');await expectState('active',1);
 await page.locator('#camera').click();await expectState('active',1);
 await page.waitForFunction(()=>document.querySelector('#dummyStatus').textContent==='Wand ready');
 assert.equal(await page.locator('#camera').textContent(),'Start camera');
 await page.locator('#lessonStop').click();await expectState('idle',0);
 assert.equal(await page.locator('#camera').textContent(),'Start camera');await saved();
 // A new session clears a pending return.
 await send(Array(20).fill(exp[0]));await page.locator('#camera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 await draw(exp,'Expelliarmus');await page.locator('#reset').click();await expectState('idle',0);
 assert.equal(await page.locator('#dummyStatus').textContent(),'Wand ready');
 const resetStart=records.length;
 await page.waitForTimeout(2200);await saved();
 assert.ok(!records.slice(resetStart).some(e=>e.cause==='dummy_return'));
 assert.equal(await page.locator('#hits').textContent(),'0 hits');
 await page.locator('#camera').click();await saved();
 assert.equal(errors.length,0,errors.join('\n'));
 const stored=(await readFile(path.join(folder,'play-data/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 for(const e of records.filter(e=>['dummy_disarm','dummy_return'].includes(e.cause)))assert.ok(stored.some(r=>r.id===e.id&&r.version===2));
 const finish=records.find(e=>e.cause==='lesson_finish');assert.ok(stored.some(e=>e.id===finish.id&&e.version===2));
 console.log(JSON.stringify({result:'PASS',checks:'disarm and two-second return; wand return with camera off; reset clears pending return; false casts and loss cause no disarm; saved dummy events; 3/3 complete stays visible; Finish lesson returns to free practice; Practice again resets; Stop lesson during training; camera controls remain separate; O/V/Z cannot advance; score/dummy unchanged; desktop/mobile; saved finish event',records:records.length}));
}finally{
 await browser?.close();
 if(api&&api.exitCode===null&&api.signalCode===null){const exited=once(api,'exit');api.kill();await exited;}
 await rm(folder,{recursive:true,force:true});
}
