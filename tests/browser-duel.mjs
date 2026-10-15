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
 const context=await browser.newContext({viewport:{width:1920,height:1080},permissions:['camera']});
 const page=await context.newPage(),errors=[],records=[];
 let failedHitSaves=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/*',async route=>{
  const payload=route.request().postData(),endpoint=new URL(route.request().url()).pathname;if(endpoint==='/api/events')records.push(JSON.parse(payload));
  const event=JSON.parse(payload);
  if(endpoint==='/api/events'&&event.type==='duel'&&event.cause==='hit'&&!failedHitSaves){
   failedHitSaves++;
   await route.fulfill({status:503,contentType:'application/json',body:'{"error":"test save failure"}'});return;
  }
  const response=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:payload});
  await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 await page.addInitScript(()=>{
  window.steps=[];window.step=0;window.workerStarts=0;window.cameraStarts=0;
  const getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=(...args)=>{window.cameraStarts++;return getUserMedia(...args);};
  window.Worker=class{
   postMessage(data){
    if(data.type==='init'){window.workerStarts++;setTimeout(()=>this.onmessage({data:{type:'ready'}}),0);return;}
    data.bitmap.close();
    if(window.followUp&&parseInt(document.querySelector('#hits').textContent)>=window.followUp.afterHits){
     window.steps=window.followUp.points;window.step=0;window.followUp=null;
    }
    const s=window.steps[Math.min(window.step++,window.steps.length-1)];
    let landmarks=s&&!s.missing?[Array.from({length:21},()=>({x:1-s.x,y:s.y/.75,z:0}))]:[];
    if(s?.duplicate&&landmarks.length)landmarks.push(landmarks[0].map(p=>({...p,x:p.x+.003})));
    setTimeout(()=>this.onmessage({data:{type:'result',t:data.t,inference:12,landmarks,handedness:landmarks.map(()=>[{categoryName:s.label||'Left',score:.55}])}}),2);
   }
   terminate(){}
  };
 });
 await page.goto(base);
 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 await page.getByRole('button',{name:'Fight',exact:true}).click();
 assert.equal(await page.locator('#duelView').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.cameraStarts),0,'menu entry leaves the camera off');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 assert.equal(await page.locator('[data-view="fight"]').evaluate(el=>el===document.activeElement),true);
 await page.getByRole('button',{name:'Training',exact:true}).click();


 assert.equal(await page.locator('#practiceView').isVisible(),true);
 await page.evaluate(()=>{
  window.originalViewport=document.querySelector('#viewport');
  window.originalParent=window.originalViewport.parentElement;
  window.effectLog=[];
  new MutationObserver(changes=>{
   for(const change of changes){
    for(const node of change.addedNodes){
     if(node.nodeType===1&&node.matches('.duel-spell'))window.effectLog.push({shape:node.dataset.spell,phase:'flight',at:performance.now(),health:document.querySelector('#duelDummyHealth').value});
    }
    if(change.type==='attributes'&&change.target.dataset.phase==='impact')window.effectLog.push({shape:change.target.dataset.spell,phase:'impact',at:performance.now(),health:document.querySelector('#duelDummyHealth').value});
   }
  }).observe(document.querySelector('#duelEffects'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-phase']});
 });
 await page.locator('#duelTab').click();
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement.id==='duelCameraMount'),true);
 await page.locator('#duelHand').selectOption('Right');assert.equal(await page.locator('#hand').inputValue(),'Right');
 await page.locator('#duelPoint').selectOption('grip');assert.equal(await page.locator('#point').inputValue(),'grip');
 await page.locator('#duelSwap').check();assert.equal(await page.locator('#swap').isChecked(),true);
 await page.locator('#duelHand').selectOption('Left');await page.locator('#duelPoint').selectOption('tip');await page.locator('#duelSwap').uncheck();
 const exp=resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}],40);
 const send=async points=>page.evaluate(steps=>{window.steps=steps;window.step=0;},[...Array(18).fill(points[0]),...points,...Array(22).fill(points.at(-1))]);
 await send(Array(20).fill(exp[0]));await page.locator('#duelCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('#duelCamera').textContent(),'Stop camera');
 await page.waitForFunction(()=>document.querySelector('#duelArenaPhase').textContent==='READY');
 assert.equal(await page.locator('#duelArenaInstruction').textContent(),await page.locator('#instruction').textContent());
 assert.equal(await page.locator('#duelCastStatus').textContent(),'Hold still until READY. Draw one shape.');
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 // Return to Practice with a live camera; restore the exact nodes and settings.
 await page.locator('#backToPractice').click();
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement===window.originalParent),true);
 await page.locator('#hand').selectOption('Right');await page.locator('#point').selectOption('grip');
 await page.locator('#duelTab').click();
 assert.equal(await page.locator('#duelHand').inputValue(),'Right');assert.equal(await page.locator('#duelPoint').inputValue(),'grip');
 await page.locator('#duelHand').selectOption('Left');await page.locator('#duelPoint').selectOption('tip');
 assert.equal(await page.evaluate(()=>window.cameraStarts),1);assert.equal(await page.evaluate(()=>window.workerStarts),1);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject===window.originalStream&&el.srcObject.getVideoTracks()[0].readyState==='live'),true);
 const dummyHealth=()=>page.locator('#duelDummyHealth').evaluate(el=>el.value);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#duelPlayerHealth').evaluate(el=>el.value),200);
 const circle=Array.from({length:50},(_,i)=>({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
 for(const [shape,points] of [['Expelliarmus',exp],['Circle',circle],['V',resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}],40)],['Z',resample([{x:.25,y:.2},{x:.6,y:.2},{x:.25,y:.45},{x:.6,y:.45}],40)]]){
  await page.locator('#duelResetDummy').click();
  const oldHits=parseInt(await page.locator('#hits').textContent());
  const effectStart=await page.evaluate(()=>window.effectLog.length);
  await send(points);
  if(shape==='Expelliarmus'){
   await page.waitForFunction(()=>document.querySelector('#duelArenaPhase').textContent==='DRAWING');
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#duelGesture');
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return data.some((value,index)=>index%4===3&&value>0);
   });
   assert.equal(await page.evaluate(()=>document.querySelector('#duelGesture').toDataURL()===document.querySelector('#overlay').toDataURL()),true);
   await page.screenshot({path:path.join(output,'duel-live-gesture.png'),fullPage:true});
  }
  await page.waitForFunction(count=>parseInt(document.querySelector('#hits').textContent)===count,oldHits+1);
  await page.waitForFunction(()=>document.querySelector('.duel-spell[data-phase="impact"]'));
  assert.match(await page.locator('#duelCastStatus').textContent(),new RegExp(shape+' hit the dummy'));
  assert.equal(await page.locator('#duelDummyActor').getAttribute('data-pose'),'recoil');
  assert.equal(await page.locator('#duelDummyActor').getAttribute('data-reaction'),shape);
  assert.equal(await page.locator('#duelDummyActor').evaluate(el=>el.getAnimations().length),1);
  assert.equal(await page.locator('#duelHits').textContent(),'1 hit');
  const score=Number((await page.locator('#score').textContent()).replace('%',''));
  assert.equal(await dummyHealth(),200-(score>=88?30:score>=78?25:20));
  if(shape==='Expelliarmus')await page.screenshot({path:path.join(output,'duel-hit.png'),fullPage:true});
  await page.waitForFunction(()=>!document.querySelector('.duel-spell'));
  assert.equal(await page.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
  const seen=await page.evaluate(start=>window.effectLog.slice(start),effectStart);
  assert.deepEqual(seen.map(({shape,phase})=>({shape,phase})),[{shape,phase:'flight'},{shape,phase:'impact'}]);
  assert.equal(seen[0].health,200,'no damage at launch');
  assert.ok(seen[1].at-seen[0].at<300,'cast-to-hit must stay below 300 ms');
  console.log(`${shape} cast-to-hit: ${Math.round(seen[1].at-seen[0].at)} ms`);
  assert.equal(parseInt(await page.locator('#hits').textContent()),oldHits+1);
 }
 console.log('PASS: four detected spells produce one flight and one impact each; camera and controls shared across tabs.');
 // Reversed paths and tracking losses never produce an effect.
 const beforeBadHealth=await dummyHealth();
 const badStart=await page.evaluate(()=>window.effectLog.length),badHits=await page.locator('#hits').textContent();
 await send([...exp].reverse());await page.waitForFunction(()=>window.step>=window.steps.length);
 await page.evaluate(points=>{window.steps=[...Array(18).fill(points[0]),...points.slice(0,25),...Array(18).fill({missing:true})];window.step=0;},exp);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),badStart);
 assert.equal(await page.locator('#hits').textContent(),badHits);
 assert.equal(await dummyHealth(),beforeBadHealth);
 assert.equal(await page.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#duelResult').textContent(),await page.locator('#lastReason').textContent());
 // Hide in-flight effects on tab changes; never replay them on return.
 await page.evaluate(()=>document.addEventListener('wizard:cast',()=>document.querySelector('#practiceTab').click(),{once:true}));
 await send(exp);await page.waitForFunction(()=>!document.querySelector('#practiceView').hidden);
 assert.equal(await page.locator('.duel-spell').count(),0);
 const beforePractice=await page.evaluate(()=>window.effectLog.length);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 const oldHits=parseInt(await page.locator('#hits').textContent());
 await send(circle);await page.waitForFunction(n=>parseInt(document.querySelector('#hits').textContent)===n,oldHits+1);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),beforePractice);
 await page.locator('#duelTab').click();assert.equal(await page.locator('.duel-spell').count(),0);
 assert.equal(await page.locator('#duelCastStatus').textContent(),'Last spell: Circle');
 assert.equal(await dummyHealth(),beforeBadHealth,'Practice casts and cancelled flights do not damage the Duel dummy');
 // Reduced motion keeps a stationary impact and text feedback, without flight.
 await page.emulateMedia({reducedMotion:'reduce'});
 await send(exp);await page.waitForFunction(()=>document.querySelector('.duel-spell[data-phase="impact"]'));
 assert.equal(await page.locator('.duel-spell>line').count(),0);
 assert.equal(await page.locator('.duel-spell>circle').count(),0);
 assert.equal(await page.locator('#duelDummyActor').evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');
 await page.waitForFunction(()=>!document.querySelector('.duel-spell'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Defeat, reset, and stale flights. Use detected spells rather than synthetic cast events.
 const practiceBeforeReset=await page.locator('#hits').textContent();
 await page.locator('#duelResetDummy').click();
 assert.equal(await page.locator('#hits').textContent(),practiceBeforeReset);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject===window.originalStream),true);
 for(const expected of [170,140,110,80,50,20,0]){
  await send(exp);
  await page.waitForFunction(value=>document.querySelector('#duelDummyHealth').value===value,expected);
  await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.duel-spell'));
 }
 await page.waitForFunction(()=>document.querySelector('#duelDummyActor').dataset.pose==='fallen');
 assert.equal(await page.locator('#duelDefeat').isVisible(),true);
 assert.equal(await page.locator('#duelDummyState').textContent(),'Defeated');
 assert.equal(await page.locator('#duelHits').textContent(),'7 hits');
 assert.equal(await page.locator('#duelPlayerHealth').evaluate(el=>el.value),200);
 await page.screenshot({path:path.join(output,'duel-defeat.png'),fullPage:true});
 const defeatLog=await page.evaluate(()=>window.effectLog.length);
 await send(exp);await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),defeatLog);
 assert.equal(await dummyHealth(),0);
 assert.match(await page.locator('#duelCastStatus').textContent(),/Dummy defeated/);
 await page.locator('#practiceTab').click();await page.locator('#duelTab').click();
 assert.equal(await page.locator('#duelDefeat').isVisible(),true);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(output,'duel-defeat-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#duelResetDummy').click();
 assert.equal(await dummyHealth(),200);assert.equal(await page.locator('#duelHits').textContent(),'0 hits');
 assert.equal(await page.locator('#duelDefeat').isVisible(),false);
 assert.equal(await page.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#duelCamera').textContent(),'Stop camera');
 const practiceBeforeFlight=await page.locator('#hits').textContent();
 await page.evaluate(()=>{window.resetInFlight=false;document.addEventListener('wizard:cast',()=>{document.querySelector('#duelResetDummy').click();window.resetInFlight=true;},{once:true});});
 await send(exp);await page.waitForFunction(()=>window.resetInFlight);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('.duel-spell').count(),0);
 await page.waitForFunction(()=>window.step>=window.steps.length);await page.waitForTimeout(700);
 assert.equal(await dummyHealth(),200,'reset cancels pending damage');
 assert.equal(await page.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#duelHits').textContent(),'0 hits');
 assert.equal(parseInt(await page.locator('#hits').textContent()),parseInt(practiceBeforeFlight)+1);
 await send(exp);await page.waitForFunction(()=>document.querySelector('#duelDummyHealth').value===170);
 await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.duel-spell'));
 console.log('PASS: health changes at impact, accuracy damage, defeat, post-defeat blocking, local reset, and stale-flight cancellation.');

 await page.locator('#duelCamera').click();
 assert.equal(await page.locator('#duelCamera').textContent(),'Start camera');
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 await page.waitForFunction(()=>document.querySelector('#duelArenaPhase').textContent==='OFF');
 assert.equal(await page.locator('#duelGesture').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.every(value=>value===0)),true);
 const stoppedHits=await page.locator('#hits').textContent();await send(circle);await page.waitForTimeout(700);
 assert.equal(await page.locator('#hits').textContent(),stoppedHits);
 assert.equal(await page.locator('.duel-spell').count(),0);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,`duel-live-${width}.png`),fullPage:true});
 }
 await page.locator('#backToPractice').click();
 assert.equal(await page.locator('#viewport').evaluate(el=>el.parentElement===window.originalParent),true);
 assert.equal(await page.locator('#camera').textContent(),'Start camera');
 await page.locator('#reset').click();await page.locator('#duelTab').click();
 assert.equal(await page.locator('#duelHits').textContent(),'1 hit');
 assert.equal(await dummyHealth(),170,'Practice session reset leaves Duel health unchanged');
 await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved on this laptop');
 assert.equal(errors.length,0,errors.join('\n'));
 // Read persisted records, including a hit whose first save failed. Logs must not change gameplay.
 const stored=(await readFile(path.join(folder,'play-data/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const duelRecords=stored.filter(e=>e.type==='duel'),launches=duelRecords.filter(e=>e.cause==='cast');
 const hitRecords=duelRecords.filter(e=>e.cause==='hit');
 assert.equal(failedHitSaves,1);
 assert.ok(duelRecords.some(e=>e.cause==='view_init'&&e.activeTab==='practice'));
 assert.ok(duelRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='practice'&&e.activeTab==='duel'));
 assert.ok(duelRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='duel'&&e.activeTab==='practice'));
 assert.equal(new Set(hitRecords.map(e=>e.castId)).size,hitRecords.length,'one saved hit per cast');
 for(const hit of hitRecords){
  const launch=launches.find(e=>e.castId===hit.castId);
  const gesture=stored.find(e=>e.id===hit.castId&&e.type==='cast');
  assert.ok(launch&&gesture,'hit links to launch and original gesture');
  assert.equal(hit.session,gesture.session);assert.equal(hit.activeTab,'duel');
  assert.equal(hit.previousDummyHealth-hit.damage,hit.dummyHealth);
  assert.equal(hit.playerHealth,200);assert.equal(hit.maxHealth,200);
  assert.ok(hit.castToHitMs>=0&&hit.castToHitMs<300,'measured hit delay');
 }
 for(const launch of launches){
  assert.equal(duelRecords.filter(e=>e.castId===launch.castId&&['hit','cancel'].includes(e.cause)).length,1);
 }
 const defeats=duelRecords.filter(e=>e.cause==='defeat');
 assert.equal(defeats.length,1);assert.equal(defeats[0].dummyHealth,0);
 assert.equal(hitRecords.find(e=>e.castId===defeats[0].castId).dummyHealth,0);
 assert.ok(duelRecords.some(e=>e.cause==='reset'&&e.previousDummyHealth===0&&e.dummyHealth===200&&e.hits===0));
 for(const reason of ['tab_change','dummy_reset'])assert.ok(duelRecords.some(e=>e.cause==='cancel'&&e.reason===reason));
 const practiceCasts=stored.filter(e=>e.type==='cast'&&e.activeTab==='practice');
 assert.ok(practiceCasts.length>0);
 for(const cast of practiceCasts)assert.ok(!launches.some(e=>e.castId===cast.id),'Practice does not launch Duel spells');
 assert.ok(duelRecords.some(e=>e.session!==hitRecords[0].session&&e.cause==='tab_change'&&e.dummyHealth===170),'new session keeps Duel health');
 console.log('PASS: saved Duel tab, cast, hit timing, health, defeat, reset, cancellation, session links, and failed-save retry.');
 // Leaving Duel stops its shared camera and preserves target health.
 await page.locator('#duelCamera').click();
 await page.waitForFunction(()=>document.querySelector('#camera').textContent==='Stop camera');
 await page.locator('#trainingBack').click();
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 assert.equal(await page.locator('.duel-spell').count(),0);
 await page.getByRole('button',{name:'Fight',exact:true}).click();
 assert.equal(await dummyHealth(),170);
 assert.equal(await page.locator('#duelCamera').textContent(),'Start camera');
 // Camera permission errors are visible and recoverable directly in Duel.
 const denied=await context.newPage();
 await denied.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await denied.goto(base);await denied.getByRole('button',{name:'Fight',exact:true}).click();await denied.locator('#duelCamera').click();
 await denied.waitForFunction(()=>document.querySelector('#duelCameraState').textContent.includes('permission denied'));
 assert.equal(await denied.locator('#duelCamera').isEnabled(),true);
 assert.equal(await denied.locator('#duelCamera').textContent(),'Start camera');
 assert.equal(await denied.locator('#viewport').isVisible(),true);
 await denied.close();
 // Exercise presentation races in isolation. This page uses no camera or game events.
 const poses=await context.newPage();await poses.goto(base);await poses.getByRole('button',{name:'Fight',exact:true}).click();
 await poses.evaluate(async()=>{
  const {createDummyReactions}=await import('/duel-reactions.js');
  window.reactions=createDummyReactions(document.querySelector('#duelDummyActor'));
  window.reactions.react('Circle');window.reactions.react('Z');
 });
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-reaction'),'Z');
 assert.equal(await poses.locator('#duelDummyActor').evaluate(el=>el.getAnimations().length),1);
 await poses.evaluate(()=>window.reactions.reset());
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
 await poses.evaluate(()=>window.reactions.react('Expelliarmus',true));
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-pose'),'falling');
 await poses.evaluate(()=>window.reactions.reset());await poses.waitForTimeout(1000);
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await poses.locator('#duelDummyActor').evaluate(el=>el.getAnimations().length),0);
 await poses.emulateMedia({reducedMotion:'reduce'});
 await poses.evaluate(()=>window.reactions.react('V',true));
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-pose'),'fallen');
 assert.equal(await poses.locator('#duelDummyActor').evaluate(el=>el.getAnimations().length),0);
 await poses.evaluate(()=>window.reactions.settle());
 assert.equal(await poses.locator('#duelDummyActor').getAttribute('data-pose'),'fallen');
 // Check both color consumers without camera input or changing game state.
 for (const reducedMotion of ['no-preference','reduce']) {
  await poses.emulateMedia({reducedMotion});
  const colors=await poses.evaluate(async()=>{
   const {createSpellEffects}=await import('/duel-effects.js');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   const effects=createSpellEffects(svg,()=>{}),actor=document.querySelector('#duelDummyActor');
   const results=[];
   for (const shape of ['Circle','V','Z','Expelliarmus','unknown']) {
    effects.cast({id:shape,shape,score:90});
    window.reactions.reset();window.reactions.react(shape);
    results.push({shape,trail:svg.querySelector('line').getAttribute('stroke'),
     orb:svg.querySelector('g>circle').getAttribute('stroke'),
     glow:svg.querySelector('g>g>circle').getAttribute('fill'),
     ring:svg.querySelector('g>g>circle:last-child').getAttribute('stroke'),
     reaction:actor.getAnimations()[0].effect.getKeyframes()[0].filter});
    effects.clear();window.reactions.reset();
   }
   return results;
  });
  const expected={Circle:['#8ce8ff','140, 232, 255'],V:['#c5a0ff','197, 160, 255'],Z:['#ffe19a','255, 225, 154'],Expelliarmus:['#ff927e','255, 146, 126'],unknown:['#8ce8ff','140, 232, 255']};
  for (const result of colors) {
   const [hex,rgb]=expected[result.shape];
   for (const part of ['trail','orb','glow','ring']) assert.equal(result[part],hex,`${result.shape} ${part}`);
   assert.ok(result.reaction.includes(`rgb(${rgb})`),`${result.shape}: ${result.reaction}`);
  }
 }
 console.log('PASS: registered flight, impact, and recoil colors; unknown-shape fallback; both motion settings.');
 await poses.close();
 console.log('PASS: per-spell recoil, final fall, standing reset, repeated hits, reset during fall, and reduced-motion poses.');

 console.log('PASS: rejected paths, tracking loss, stopped camera, permission denial, hidden-tab cleanup, reduced motion, session reset, and responsive layout.');
}finally{
 await browser?.close();
 if(api&&api.exitCode===null&&api.signalCode===null){const exited=once(api,'exit');api.kill();await exited;}
 await rm(folder,{recursive:true,force:true});
}
