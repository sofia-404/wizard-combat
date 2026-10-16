import {chromium} from 'playwright-core';
import {readFile,mkdir,mkdtemp,cp,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
import {openGameMode, startSelectedMode} from './browser-game-mode.mjs';
const root=path.dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
const cameraFps=Number(process.env.PRACTICE_CAMERA_FPS||20);
assert.ok(Number.isInteger(cameraFps)&&cameraFps>=10&&cameraFps<=60,'PRACTICE_CAMERA_FPS must be an integer from 10 to 60');
await mkdir(path.join(root,'.tmp'),{recursive:true});
const folder=await mkdtemp(path.join(root,'.tmp/browser-server-'));
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
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:[`--use-fake-device-for-media-stream=fps=${cameraFps}`,'--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},permissions:['camera']});
 context.setDefaultTimeout(20000);
 const page=await context.newPage(),errors=[],records=[];
 page.on('console',message=>{if(message.text().startsWith('Gesture fixture retry:'))console.log(message.text());});
 let failedHitSaves=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/*',async route=>{
  const payload=route.request().postData(),endpoint=new URL(route.request().url()).pathname;if(endpoint==='/api/events')records.push(JSON.parse(payload));
  const event=JSON.parse(payload);
  if(endpoint==='/api/events'&&event.type==='practiceArena'&&event.cause==='hit'&&!failedHitSaves){
   failedHitSaves++;
   await route.fulfill({status:503,contentType:'application/json',body:'{"error":"test save failure"}'});return;
  }
  const response=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:payload});
  await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 await page.addInitScript(()=>{
  window.steps=[];window.step=0;window.workerStarts=0;window.cameraStarts=0;window.attackCasts=0;window.fixtureFrames=[];
  document.addEventListener('wizard:cast', ({detail}) => {window.gestureReplay=null;if(detail.damage>0)window.attackCasts++;});
  const recoverTiming=({detail})=>{
   if(detail.type==='cast'){window.gestureReplay=null;return;}
   if(detail.type!=='cancel'||!['gap_duration','worker_stall','stale_frame'].includes(detail.cause)
    ||!window.gestureReplay||window.gestureRetries>=2)return;
   console.warn(`Gesture fixture retry: ${detail.cause} (${++window.gestureRetries}/2)`);
   window.steps=window.gestureReplay;window.step=0;
  };
  document.addEventListener('wizard:practice-arena-gesture',recoverTiming);
  document.addEventListener('wizard:spell-training-gesture',recoverTiming);
  const getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=(...args)=>{window.cameraStarts++;return getUserMedia(...args);};
  window.Worker=class{
   postMessage(data){
    if(data.type==='init'){window.workerStarts++;setTimeout(()=>this.onmessage({data:{type:'ready'}}),0);return;}
    data.bitmap.close();
    // Replay the recorded detector samples even when video frames arrive late.
    // Long stalls still reach the app's normal tracking-loss checks.
    const frameTimes=[];
    for(let t=Math.max(this.lastFrameT??data.t,data.t-250)+50;t<data.t-25;t+=50)frameTimes.push(t);
    frameTimes.push(data.t);this.lastFrameT=data.t;
    setTimeout(()=>{for(const t of frameTimes){
    if(window.followUp&&window.attackCasts>=window.followUp.afterHits){
     window.steps=window.followUp.points;window.step=0;window.followUp=null;
    }
    // Paths describe 50 ms samples. Slow camera frames must not slow the gesture.
    if(window.step===0){window.stepsStartedAt=t;window.pathStarted=false;}
    let index=Math.round((t-window.stepsStartedAt)/50);
    if(!window.pathStarted&&index>=18){
     // Keep the start hold until tracking has acquired the new position.
     if(document.querySelector('#phase').textContent==='READY'){
      window.pathStarted=true;window.stepsStartedAt=t-18*50;index=18;
     }else index=17;
    }
    window.step=index+1;
    const s=window.steps[Math.min(index,window.steps.length-1)];
    if(index<window.steps.length){
     window.fixtureFrames.push({index,t:Math.round(t),phase:document.querySelector('#phase').textContent});
     if(window.fixtureFrames.length>120)window.fixtureFrames.shift();
    }
    let landmarks=s&&!s.missing?[Array.from({length:21},()=>({x:1-s.x,y:s.y/.75,z:0}))]:[];
    if(s?.duplicate&&landmarks.length)landmarks.push(landmarks[0].map(p=>({...p,x:p.x+.003})));
    this.onmessage({data:{type:'result',t,inference:12,landmarks,handedness:landmarks.map(()=>[{categoryName:s.label||'Left',score:.55}])}});
    }},2);
   }
   terminate(){}
  };
 });
 await page.goto(base);
 const openMode=(name,target=page)=>openGameMode(target,name);

 const setInputOptions=async(hand,point)=>{
  await page.locator('#gameBack').click();
  await page.getByRole('button',{name:'Options',exact:true}).click();
  await page.locator('#handSetting').selectOption(hand);
  await page.locator('#pointSetting').selectOption(point);
  await page.keyboard.press('Escape');
  await openMode('Practice Arena');
 };
 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 await page.getByRole('button',{name:'Practice Arena',exact:true}).click(); await startSelectedMode(page);
 assert.equal(await page.locator('#practiceArenaView').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.cameraStarts),0,'menu entry leaves the camera off');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 assert.equal(await page.locator('[data-view="practiceArena"]').evaluate(el=>el===document.activeElement),true);
 await openMode('Spell Training');


 assert.deepEqual(await page.locator('#gameView [role="region"]').evaluateAll(nodes=>nodes.map(node=>node.id)),['practiceArenaView','soloDuelView','spellTrainingView']);
 await page.evaluate(()=>{
  window.originalViewport=document.querySelector('#viewport');
  window.originalParent=window.originalViewport.parentElement;
  window.effectLog=[];
  new MutationObserver(changes=>{
   for(const change of changes){
    for(const node of change.addedNodes){
     if(node.nodeType===1&&node.matches('.practice-arena-spell'))window.effectLog.push({shape:node.dataset.spell,phase:'flight',at:performance.now(),health:document.querySelector('#practiceArenaDummyHealth').value});
    }
    if(change.type==='attributes'&&change.target.dataset.phase==='impact')window.effectLog.push({shape:change.target.dataset.spell,phase:'impact',at:performance.now(),health:document.querySelector('#practiceArenaDummyHealth').value});
   }
  }).observe(document.querySelector('#practiceArenaEffects'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-phase']});
 });
 await openMode('Practice Arena');
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement.id==='practiceArenaCameraMount'),true);
 await setInputOptions('Right','grip');
 assert.equal(await page.locator('#handSetting').inputValue(),'Right');assert.equal(await page.locator('#pointSetting').inputValue(),'grip');
 assert.equal(await page.locator('#practiceArenaHand, #practiceArenaPoint').count(),0);
 assert.equal(await page.locator('#swap, #practiceArenaSwap, #spellTrainingSwap').count(),0);
 await setInputOptions('Left','tip');
 const exp=resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}],40);
 const send=async(points,recover=false)=>{
  if(await page.evaluate(()=>!document.querySelector('#practiceArenaView').hidden && document.querySelector('#video').srcObject && ['waiting','intro','fight'].includes(document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase))) {
   await page.waitForFunction(()=>document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase==='active');
  }
  return page.evaluate(({steps,recover})=>{
  window.steps=steps;window.step=0;window.gestureRetries=0;window.gestureReplay=recover?steps:null;
 },{steps:[...Array(18).fill(points[0]),...points,...Array(22).fill(points.at(-1))],recover});
 };
 await send(Array(20).fill(exp[0]));await page.locator('#practiceArenaCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('#practiceArenaCamera').textContent(),'Stop camera');
 assert.match(await page.locator('#practiceArenaEvents').textContent(), /Camera on/);
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 // Return through the menu; release the camera and restore the exact nodes and settings.
 await openMode('Spell Training');
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement===window.originalParent),true);
 await setInputOptions('Right','grip');
 await openMode('Practice Arena');
 assert.equal(await page.locator('#handSetting').inputValue(),'Right');assert.equal(await page.locator('#pointSetting').inputValue(),'grip');
 await setInputOptions('Left','tip');
 assert.equal(await page.evaluate(()=>window.originalStream.getVideoTracks()[0].readyState),'ended');
 assert.equal(await page.locator('#practiceArenaCamera').textContent(),'Start camera');
 await send(Array(20).fill(exp[0]));await page.locator('#practiceArenaCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.evaluate(()=>window.cameraStarts),2);assert.equal(await page.evaluate(()=>window.workerStarts),2);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject!==window.originalStream&&el.srcObject.getVideoTracks()[0].readyState==='live'),true);
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 // Reset isolated test fixtures without exposing a reset control during play.
 const resetFixture=async target=>{
  await target.locator('#practiceArenaResetDummy').evaluate(button=>button.click());
  if(target===page) await target.waitForFunction(()=>document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase==='active');
  else {
   await target.evaluate(async()=>(await import('/input-state.js')).updateInputState({camera:'Stop camera',cameraState:'Camera on',cameraDisabled:false}));
   await target.clock.runFor(2000);
  }
 };
 const dummyHealth=()=>page.locator('#practiceArenaDummyHealth').evaluate(el=>el.value);
 assert.equal(await page.locator('#practiceArenaResetDummy').isVisible(),false);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(el=>el.value),200);
 const circle=Array.from({length:50},(_,i)=>({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
 const shieldHits=await page.evaluate(()=>window.attackCasts);
 await send(circle,true);
 await page.waitForFunction(()=>document.querySelector('#practiceArenaShield').classList.contains('shield-active'));
 assert.equal(await page.evaluate(async () => (await import('/input-state.js')).getInputState().lastShape),'Protego');
 assert.equal(await page.evaluate(()=>window.attackCasts),shieldHits);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#practiceArenaHits').textContent(),'0 hits');
 assert.equal(await page.locator('.practice-arena-spell').count(),0);
 assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 await page.waitForFunction(()=>window.step>=window.steps.length);
 await page.waitForFunction(()=>!document.querySelector('#practiceArenaShield').classList.contains('shield-active'));
 for(const [shape,points] of [['Expelliarmus',exp],['Basic Cast',resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}],40)],['Confringo',resample([{x:.25,y:.2},{x:.6,y:.2},{x:.25,y:.45},{x:.6,y:.45}],40)]]){
  await resetFixture(page);
  const oldHits=await page.evaluate(()=>window.attackCasts);
  const effectStart=await page.evaluate(()=>window.effectLog.length);
  await send(points,true);
  if(shape==='Expelliarmus'){
   await page.waitForFunction(()=>document.querySelector('#phase').textContent==='DRAWING');
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#practiceArenaGesture');
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return data.some((value,index)=>index%4===3&&value>0);
   });
   assert.equal(await page.evaluate(()=>document.querySelector('#practiceArenaGesture').toDataURL()===document.querySelector('#overlay').toDataURL()),true);
   await page.screenshot({path:path.join(output,'practice-arena-live-gesture.png'),fullPage:true});
  }
  await page.waitForFunction(count=>window.attackCasts===count,oldHits+1);
  await page.waitForFunction(()=>document.querySelector('.practice-arena-spell[data-phase="impact"]'));
  assert.equal(await page.locator('#practiceArenaEvents li strong').filter({hasText:new RegExp('^'+shape+'$')}).count(),1);
  assert.match(await page.locator('#practiceArenaEvents li').first().textContent(),/\d+ damage/);
  assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'recoil');
  assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-reaction'),shape);
  assert.equal(await page.locator('#practiceArenaDummyActor').evaluate(el=>el.getAnimations().length),1);
  assert.equal(await page.locator('#practiceArenaHits').textContent(),'1 hit');
  const score=Number((await page.evaluate(async () => (await import('/input-state.js')).getInputState().score)).replace('%',''));
  assert.equal(await dummyHealth(),200-({'Basic Cast':20,Confringo:40,Expelliarmus:10}[shape]));
  if(shape==='Expelliarmus')await page.screenshot({path:path.join(output,'practice-arena-hit.png'),fullPage:true});
  if(shape==='Confringo')await page.screenshot({path:path.join(output,'confringo-impact.png'),fullPage:true});
  await page.waitForFunction(()=>!document.querySelector('.practice-arena-spell'));
  assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
  if(shape==='Basic Cast'){
   await page.setViewportSize({width:1920,height:1080});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'basic-cast-practice-arena-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'basic-cast-practice-arena-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1440,height:1100});
  }
  if(shape==='Confringo'){
   await page.setViewportSize({width:1920,height:1080});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'confringo-practice-arena-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'confringo-practice-arena-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1440,height:1100});
  }
  const seen=await page.evaluate(start=>window.effectLog.slice(start),effectStart);
  assert.deepEqual(seen.map(({shape,phase})=>({shape,phase})),[{shape,phase:'flight'},{shape,phase:'impact'}]);
  assert.equal(seen[0].health,200,'no damage at launch');
  assert.ok(Math.abs(seen[1].at-seen[0].at-({'Basic Cast':1000,Confringo:1200,Expelliarmus:1100}[shape]))<150,'shared flight time');
  console.log(`${shape} cast-to-hit: ${Math.round(seen[1].at-seen[0].at)} ms`);
  assert.equal(await page.evaluate(()=>window.attackCasts),oldHits+1);
 }
 console.log('PASS: three attack spells produce one flight and one impact each; settings preserved and camera restarted through the menu.');
 // Reversed paths and tracking losses never produce an effect.
 const beforeBadHealth=await dummyHealth();
 const badStart=await page.evaluate(()=>window.effectLog.length),badHits=await page.evaluate(()=>window.attackCasts);
 await send([...exp].reverse());await page.waitForFunction(()=>window.step>=window.steps.length);
 await page.evaluate(points=>{window.steps=[...Array(18).fill(points[0]),...points.slice(0,25),...Array(18).fill({missing:true})];window.step=0;},exp);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),badStart);
 assert.equal(await page.evaluate(()=>window.attackCasts),badHits);
 assert.equal(await dummyHealth(),beforeBadHealth);
 assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 assert.ok((await page.locator('#practiceArenaEvents').textContent()).includes(await page.evaluate(async () => (await import('/input-state.js')).getInputState().lastReason)));
 // Hide in-flight effects on menu return; never replay them on entry.
 await page.evaluate(()=>document.addEventListener('wizard:cast',()=>document.querySelector('#gameBack').click(),{once:true}));
 await send(exp,true);await page.waitForFunction(()=>!document.querySelector('#mainMenu').hidden);
 assert.equal(await page.evaluate(()=>window.originalStream.getVideoTracks()[0].readyState),'ended');
 await openMode('Spell Training');
 await send(Array(20).fill(exp[0]));await page.locator('#spellTrainingCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('.practice-arena-spell').count(),0);
 const beforeSpellTraining=await page.evaluate(()=>window.effectLog.length);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 await send(circle,true);await page.waitForFunction(()=>document.querySelector('#spellTrainingShield').classList.contains('shield-active'));
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),beforeSpellTraining);
 await openMode('Practice Arena');assert.equal(await page.locator('.practice-arena-spell').count(),0);
 await send(Array(20).fill(exp[0]));await page.locator('#practiceArenaCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 assert.equal(await dummyHealth(),beforeBadHealth,'Spell Training casts and cancelled flights do not damage the Practice Arena dummy');
 // Reduced motion keeps a stationary impact and text feedback, without flight.
 await page.emulateMedia({reducedMotion:'reduce'});
 await send(exp,true);await page.waitForFunction(()=>document.querySelector('.practice-arena-spell[data-phase="impact"]'));
 assert.equal(await page.locator('.practice-arena-spell>line').count(),0);
 assert.equal(await page.locator('.practice-arena-spell>circle').count(),0);
 assert.equal(await page.locator('#practiceArenaDummyActor').evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');
 await page.waitForFunction(()=>!document.querySelector('.practice-arena-spell'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Defeat, reset, and stale flights. Use detected spells rather than synthetic cast events.
 const castsBeforeReset=await page.evaluate(()=>window.attackCasts);
 await resetFixture(page);
 assert.equal(await page.evaluate(()=>window.attackCasts),castsBeforeReset);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject===window.originalStream),true);
 for(let round=1;round<=2;round++){
 for(const expected of [160,120,80,40,0]){
  await send(resample([{x:.25,y:.2},{x:.6,y:.2},{x:.25,y:.45},{x:.6,y:.45}],40),true);
  await page.waitForFunction(value=>document.querySelector('#practiceArenaDummyHealth').value===value,expected);
  await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.practice-arena-spell'));
 }
 if(round===1) await page.waitForFunction(()=>document.querySelector('#practiceArenaView .practice-arena').dataset.roundPhase==='active');
 }
 await page.waitForFunction(()=>document.querySelector('#practiceArenaDummyActor').dataset.pose==='fallen');
 assert.equal(await page.locator('#practiceArenaDefeat').isVisible(),true);
 assert.equal(await page.locator('#practiceArenaDefeat #practiceArenaResetDummy').isVisible(),true);
 assert.equal(await page.locator('#practiceArenaDummyState').textContent(),'Defeated');
 assert.equal(await page.locator('#practiceArenaHits').textContent(),'5 hits');
 assert.equal(await page.locator('#practiceArenaPlayerHealth').evaluate(el=>el.value),200);
 await page.screenshot({path:path.join(output,'practice-arena-defeat.png'),fullPage:true});
 const defeatLog=await page.evaluate(()=>window.effectLog.length);
 await send(exp);await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),defeatLog);
 assert.equal(await dummyHealth(),0);
 assert.match(await page.locator('#practiceArenaEvents').textContent(),/Player wins round 2/);
 await openMode('Spell Training');await openMode('Practice Arena');
 assert.equal(await page.locator('#practiceArenaCamera').isVisible(),false,'defeat shows reset without a camera overlay');
 // Start simulated input directly to keep testing reset with an active camera.
 await send(Array(20).fill(exp[0]));
 await page.evaluate(async () => (await import('/app.js')).toggleGameCamera());
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('#practiceArenaDefeat').isVisible(),true);
 assert.equal(await page.locator('#practiceArenaDefeat #practiceArenaResetDummy').isVisible(),true);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(output,'practice-arena-defeat-mobile.png'),fullPage:true});
 await page.locator('#practiceArenaResetDummy').focus();
 assert.equal(await page.locator('#practiceArenaResetDummy').evaluate(button=>button===document.activeElement),true);
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('#practiceArenaResetDummy').isVisible(),false);
 assert.equal(await page.locator('#practiceArenaCamera').evaluate(button=>button===document.activeElement),true);
 await page.setViewportSize({width:1920,height:1080});
 assert.equal(await dummyHealth(),200);assert.equal(await page.locator('#practiceArenaHits').textContent(),'0 hits');
 assert.equal(await page.locator('#practiceArenaDefeat').isVisible(),false);
 assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#practiceArenaCamera').textContent(),'Stop camera');
 const castsBeforeFlight=await page.evaluate(()=>window.attackCasts);
 await page.evaluate(()=>{window.resetInFlight=false;document.addEventListener('wizard:cast',()=>{document.querySelector('#practiceArenaResetDummy').click();window.resetInFlight=true;},{once:true});});
 await send(exp,true);await page.waitForFunction(()=>window.resetInFlight);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('.practice-arena-spell').count(),0);
 await page.waitForFunction(()=>window.step>=window.steps.length);await page.waitForTimeout(700);
 assert.equal(await dummyHealth(),200,'reset cancels pending damage');
 assert.equal(await page.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#practiceArenaHits').textContent(),'0 hits');
 assert.equal(await page.evaluate(()=>window.attackCasts),parseInt(castsBeforeFlight)+1);
 await send(exp,true);await page.waitForFunction(()=>document.querySelector('#practiceArenaDummyHealth').value===190);
 await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.practice-arena-spell'));
 console.log('PASS: health changes at impact, fixed damage, defeat, post-defeat blocking, local reset, and stale-flight cancellation.');

 await page.locator('#practiceArenaCamera').click();
 assert.equal(await page.locator('#practiceArenaCamera').textContent(),'Start camera');
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='OFF');
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('#practiceArenaGesture');
  return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.every(value=>value===0);
 });
 const stoppedHits=await page.evaluate(()=>window.attackCasts);await send(circle);await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>window.attackCasts),stoppedHits);
 assert.equal(await page.locator('.practice-arena-spell').count(),0);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Practice Arena must fit ${width}px`);
  await page.screenshot({path:path.join(output,`practice-arena-live-${width}.png`),fullPage:true});
 }
 await openMode('Spell Training');
 assert.equal(await page.locator('#viewport').evaluate(el=>el.parentElement===window.originalParent),true);
 assert.equal(await page.evaluate(async () => (await import('/input-state.js')).getInputState().camera),'Start camera');
 await page.locator('#spellTrainingCamera').click();
 await page.waitForFunction(async ()=>(await import('/input-state.js')).getInputState().camera==='Stop camera');
 await page.locator('#spellTrainingCamera').click();await openMode('Practice Arena');
 assert.equal(await page.locator('#practiceArenaHits').textContent(),'1 hit');
 assert.equal(await dummyHealth(),190,'Spell Training lesson controls leave Practice Arena health unchanged');
 await page.waitForFunction(async ()=>(await import('/input-state.js')).getInputState().saveStatus==='Saved on this laptop');
 assert.equal(errors.length,0,errors.join('\n'));
 // Read persisted records, including a hit whose first save failed. Logs must not change gameplay.
 const stored=(await readFile(path.join(folder,'play-data/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const practiceArenaRecords=stored.filter(e=>e.type==='practiceArena'&&e.source==='practiceArena'),launches=practiceArenaRecords.filter(e=>e.cause==='cast');
 const hitRecords=practiceArenaRecords.filter(e=>e.cause==='hit');
 assert.equal(failedHitSaves,1);
 assert.ok(practiceArenaRecords.some(e=>e.cause==='view_init'&&e.activeTab==='menu'));
 assert.ok(practiceArenaRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='menu'&&e.activeTab==='practiceArena'));
 assert.ok(practiceArenaRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='practiceArena'&&e.activeTab==='menu'));
 assert.equal(new Set(hitRecords.map(e=>e.castId)).size,hitRecords.length,'one saved hit per cast');
 for(const hit of hitRecords){
  const launch=launches.find(e=>e.castId===hit.castId);
  const gesture=stored.find(e=>e.id===hit.castId&&e.type==='cast');
  assert.ok(launch&&gesture,'hit links to launch and original gesture');
  assert.equal(hit.session,gesture.session);assert.equal(hit.activeTab,'practiceArena');
  assert.equal(hit.previousDummyHealth-hit.damage,hit.dummyHealth);
  assert.equal(hit.playerHealth,200);assert.equal(hit.maxHealth,200);
  assert.ok(hit.castToHitMs>=1000&&hit.castToHitMs<1400,'measured hit delay');
 }
 for(const launch of launches){
  assert.equal(practiceArenaRecords.filter(e=>e.castId===launch.castId&&['hit','cancel'].includes(e.cause)).length,1);
 }
 const shields=practiceArenaRecords.filter(e=>e.cause==='shield');
 assert.equal(shields.length,1);assert.equal(shields[0].shape,'Protego');assert.equal(shields[0].damage,0);
 assert.ok(stored.some(e=>e.id===shields[0].castId&&e.type==='cast'&&e.shape==='Protego'&&e.protegoGate==='ok'));
 assert.ok(!hitRecords.some(e=>e.castId===shields[0].castId));
 const defeats=practiceArenaRecords.filter(e=>e.cause==='defeat');
 assert.equal(defeats.length,2);assert.equal(defeats[0].dummyHealth,0);
 assert.equal(hitRecords.find(e=>e.castId===defeats[0].castId).dummyHealth,0);
 assert.ok(practiceArenaRecords.some(e=>e.cause==='reset'&&e.previousDummyHealth===0&&e.dummyHealth===200&&e.hits===0));
 for(const reason of ['round_paused','round_reset'])assert.ok(practiceArenaRecords.some(e=>e.cause==='cancel'&&e.reason===reason),reason);
 const spellTrainingCasts=stored.filter(e=>e.type==='cast'&&e.activeTab==='spellTraining');
 assert.ok(spellTrainingCasts.length>0);
 for(const cast of spellTrainingCasts)assert.ok(!launches.some(e=>e.castId===cast.id),'Spell Training does not launch Practice Arena spells');
 assert.ok(stored.every(e=>['menu','practiceArena','spellTraining'].includes(e.activeTab)));
 for(const cast of stored.filter(e=>e.type==='cast'&&e.activeTab==='practiceArena')) {
  assert.ok(cast.resultImage);
  assert.ok((await readFile(path.join(folder,'play-data',cast.resultImage))).length>0);
 }
 console.log('PASS: saved Practice Arena route, cast, hit timing, health, defeat, reset, cancellation, session links, and failed-save retry.');
 // Leaving Practice Arena stops its shared camera and preserves target health.
 await page.locator('#practiceArenaCamera').click();
 await page.waitForFunction(async ()=>(await import('/input-state.js')).getInputState().camera==='Stop camera');
 await page.locator('#gameBack').click();
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 assert.equal(await page.locator('.practice-arena-spell').count(),0);
 await page.getByRole('button',{name:'Practice Arena',exact:true}).click(); await startSelectedMode(page);
 assert.equal(await dummyHealth(),190);
 assert.equal(await page.locator('#practiceArenaCamera').textContent(),'Start camera');
 // Camera permission errors are visible and recoverable directly in Practice Arena.
 const denied=await context.newPage();
 await denied.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await denied.goto(base);await denied.getByRole('button',{name:'Practice Arena',exact:true}).click(); await startSelectedMode(denied);await denied.locator('#practiceArenaCamera').click();
 await denied.waitForFunction(()=>document.querySelector('#practiceArenaEvents').textContent.includes('permission denied'));
 assert.equal(await denied.locator('#practiceArenaCamera').isEnabled(),true);
 assert.equal(await denied.locator('#practiceArenaCamera').textContent(),'Start camera');
 assert.equal(await denied.locator('#viewport').isVisible(),true);
 await denied.close();
 // Exercise presentation races in isolation. This page uses no camera input.
 let poses=await context.newPage();await poses.clock.install();await poses.goto(base);await poses.getByRole('button',{name:'Practice Arena',exact:true}).click(); await startSelectedMode(poses);
 // Both figures idle at rest. A falling dummy and reduced motion stop that motion.
 // Character art replaces the two separate player arm layers.
 const IDLE=['player-breathe','player-sway','','','dummy-breathe','dummy-sway','dummy-wand'];
 const idle=()=>poses.evaluate(()=>[...document.querySelectorAll('#practiceArenaView .idle')].map(group=>group.getAnimations().map(animation=>animation.animationName).join()));
 assert.deepEqual(await idle(),IDLE);
 await poses.evaluate(async()=>{
  const {createDummyReactions}=await import('/practice-arena-reactions.js');
  window.reactions=createDummyReactions(document.querySelector('#practiceArenaDummyActor'));
  window.reactions.react('Basic Cast');window.reactions.react('Confringo');
 });
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-reaction'),'Confringo');
 assert.equal(await poses.locator('#practiceArenaDummyActor').evaluate(el=>el.getAnimations().length),1);
 await poses.evaluate(()=>window.reactions.reset());
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 await poses.evaluate(()=>window.reactions.react('Expelliarmus',true));
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'falling');
 assert.deepEqual(await idle(),[...IDLE.slice(0,4),'','',''],'the wizard keeps moving while the dummy falls');
 await poses.evaluate(()=>window.reactions.reset());await poses.waitForTimeout(1000);
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await poses.locator('#practiceArenaDummyActor').evaluate(el=>el.getAnimations().length),0);
 assert.deepEqual(await idle(),IDLE);
 await poses.emulateMedia({reducedMotion:'reduce'});
 assert.deepEqual(await idle(),IDLE.map(()=>''));
 assert.equal(await poses.evaluate(()=>[...document.querySelectorAll('#practiceArenaView .idle')].every(group=>getComputedStyle(group).transform==='none')),true);
 await poses.evaluate(()=>window.reactions.react('Basic Cast',true));
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'fallen');
 assert.equal(await poses.locator('#practiceArenaDummyActor').evaluate(el=>el.getAnimations().length),0);
 await poses.evaluate(()=>window.reactions.settle());
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'fallen');
 // Check both color consumers without camera input or changing game state.
 for (const reducedMotion of ['no-preference','reduce']) {
  await poses.emulateMedia({reducedMotion});
  const colors=await poses.evaluate(async()=>{
   const {createSpellEffects}=await import('/practice-arena-effects.js');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   const effects=createSpellEffects(svg,()=>{}),actor=document.querySelector('#practiceArenaDummyActor');
   const results=[];
   for (const shape of ['Basic Cast','Confringo','Expelliarmus','unknown']) {
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
  const expected={Protego:['#8ce8ff','140, 232, 255'],'Basic Cast':['#c5a0ff','197, 160, 255'],Confringo:['#ef4444','239, 68, 68'],Expelliarmus:['#ff927e','255, 146, 126'],unknown:['#8ce8ff','140, 232, 255']};
  for (const result of colors) {
   const [hex,rgb]=expected[result.shape];
   for (const part of ['trail','orb','glow','ring']) assert.equal(result[part],hex,`${result.shape} ${part}`);
   assert.ok(result.reaction.includes(`rgb(${rgb})`),`${result.shape}: ${result.reaction}`);
  }
 }
 console.log('PASS: registered flight, impact, and recoil colors; unknown-shape fallback; both motion settings.');
 // Synthetic cast checks stay separate from the detected-cast record assertions above.
 await poses.close();
 poses=await context.newPage();
 const disarmTime=new Date('2026-10-15T12:00:00Z');
 await poses.clock.install({time:disarmTime});
 await poses.clock.pauseAt(new Date(disarmTime.getTime()+1000));
 await poses.route('**/api/*',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await poses.emulateMedia({reducedMotion:'no-preference'});
 await poses.goto(base);await poses.getByRole('button',{name:'Practice Arena',exact:true}).click(); await startSelectedMode(poses);
 await resetFixture(poses);
 await poses.evaluate(()=>{
  window.syntheticCast=0;
  new MutationObserver(changes=>{
   if(changes.some(change=>change.target.dataset.disarmed==='true'))window.disarmedAt=performance.now();
  }).observe(document.querySelector('#practiceArenaDummyActor'),{attributes:true,attributeFilter:['data-disarmed']});
 });
 const castAtDummy=async shape=>{
  await poses.evaluate(async()=>(await import('/input-state.js')).updateInputState({camera:'Stop camera',cameraState:'Camera on',cameraDisabled:false}));
  if(await poses.locator('#practiceArenaView .practice-arena').getAttribute('data-round-phase')!=='active')await poses.clock.runFor(2000);
  return poses.evaluate(shape=>document.dispatchEvent(new CustomEvent('wizard:cast',{
  detail:{id:`disarm-${++window.syntheticCast}`,shape,score:90,damage:30}
 })),shape);
 };
 // Shield timers and display use an isolated clock, not the camera frame rate.
 for(const reducedMotion of ['no-preference','reduce']){
  await poses.emulateMedia({reducedMotion});
  await castAtDummy('Protego');
  assert.equal(await poses.locator('#practiceArenaShield').evaluate(el=>el.classList.contains('shield-active')),true);
  assert.equal(await poses.locator('.practice-arena-spell').count(),0);
  assert.equal(await poses.locator('#practiceArenaDummyHealth').evaluate(el=>el.value),200);
  assert.equal(await poses.locator('#practiceArenaHits').textContent(),'0 hits');
  if(reducedMotion==='reduce')assert.equal(await poses.locator('#practiceArenaShield').evaluate(el=>el.getAnimations().length),0);
  if(reducedMotion==='no-preference'){
   await poses.clock.runFor(200);
   for(const width of [1920,390]){
    await poses.setViewportSize({width,height:1080});
    assert.equal(await poses.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await poses.screenshot({path:path.join(output,`protego-practice-arena-${width}.png`),fullPage:true});
   }
  }
  await poses.clock.runFor(1000);await castAtDummy('Protego');
  await openMode('Spell Training',poses);await poses.clock.runFor(1000);await openMode('Practice Arena',poses);
  assert.equal(await poses.locator('#practiceArenaShield').evaluate(el=>el.classList.contains('shield-active')),false,'repeat cast cannot extend the two-second shield');
  await poses.clock.runFor(2000);
  await castAtDummy('Protego');await resetFixture(poses);
  assert.equal(await poses.locator('#practiceArenaShield').evaluate(el=>el.classList.contains('shield-active')),false);
 }
 await poses.emulateMedia({reducedMotion:'no-preference'});
 console.log('PASS: Protego shield, no damage or strike, repeat cast, expiry, menu routes, dummy reset, desktop/mobile, and reduced motion.');
 const isDisarmed=()=>poses.locator('#practiceArenaDummyActor').getAttribute('data-disarmed');
 const untilReturn=async()=>{
  const remaining=await poses.evaluate(()=>window.disarmedAt+2000-performance.now());
  await poses.clock.runFor(remaining-1);
  assert.equal(await isDisarmed(),'true','wand stays dropped until the full two seconds pass');
  await poses.clock.runFor(1);
  assert.equal(await isDisarmed(),'false');
 };
 assert.equal(await poses.locator('#practiceArenaCamera').textContent(),'Stop camera');
 const readyWandTransform=await poses.locator('#practiceArenaDummyWand').evaluate(el=>getComputedStyle(el).transform);
 await castAtDummy('Expelliarmus');
 assert.equal(await isDisarmed(),'false','launch does not drop the wand');
 await poses.clock.runFor(100);
 assert.equal(await isDisarmed(),'false','flight does not drop the wand');
 await poses.clock.runFor(1050);
 assert.equal(await isDisarmed(),'true','impact drops the wand with simulated camera readiness');
 assert.equal(await poses.locator('#practiceArenaDummyWand .idle').evaluate(group=>group.getAnimations().length),0,'a dropped wand stops swaying');
 assert.equal(await poses.locator('#practiceArenaEvents li strong').first().textContent(), 'Expelliarmus');
 // Inspect the rendered motion: release, accelerating fall, one small bounce, rest.
 const wandFall=await poses.locator('#practiceArenaDummyWand').evaluate(wand=>{
  const animation=wand.getAnimations()[0];
  if(!animation)return null;
  animation.pause();
  const duration=animation.effect.getTiming().duration;
  const positions=[0,.18,.51,.84,.92,1].map(progress=>{
   animation.currentTime=duration*progress;
   const matrix=new DOMMatrix(getComputedStyle(wand).transform);
   return {x:matrix.e,y:matrix.f};
  });
  animation.currentTime=0;animation.play();
  return positions;
 });
 assert.ok(wandFall,'a visible hit starts the wand fall');
 assert.ok(wandFall[1].x<wandFall[0].x&&wandFall[1].y<wandFall[0].y,'the wand moves out from the hand');
 assert.ok(wandFall[3].y-wandFall[2].y>wandFall[2].y-wandFall[1].y,'the fall gains speed');
 assert.ok(wandFall[4].y<wandFall[3].y&&wandFall[3].y-wandFall[4].y<=6,'the landing has only a small bounce');
 assert.ok(Math.abs(wandFall[5].y-wandFall[3].y)<1,'the wand settles on the ground');
 await poses.clock.runFor(450);
 await poses.setViewportSize({width:1920,height:1080});
 assert.equal(await poses.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await poses.screenshot({path:path.join(output,'practice-arena-disarmed-desktop.png'),fullPage:true,animations:'disabled'});
 assert.notEqual(await poses.locator('#practiceArenaDummyWand').evaluate(el=>getComputedStyle(el).transform),readyWandTransform,'the dropped wand moves away from its ready pose');
 await poses.setViewportSize({width:390,height:844});
 assert.equal(await poses.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await poses.screenshot({path:path.join(output,'practice-arena-disarmed-mobile.png'),fullPage:true,animations:'disabled'});
 await untilReturn();
 assert.equal(await poses.locator('#practiceArenaDummyWand .idle').evaluate(group=>group.getAnimations().length),1,'a returned wand sways again');
 await resetFixture(poses);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await untilReturn();
 for(const shape of ['Protego','Basic Cast','Confringo']){
  await resetFixture(poses);
  await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
  const deadline=await poses.evaluate(()=>window.disarmedAt+2000);
  await poses.clock.runFor(500);await castAtDummy(shape);await poses.clock.runFor(160);
  assert.equal(await isDisarmed(),'true',`${shape} does not restore the wand`);
  await poses.clock.runFor(deadline-await poses.evaluate(()=>performance.now()));
  assert.equal(await isDisarmed(),'false',`${shape} does not extend disarm`);
 }
 await resetFixture(poses);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await resetFixture(poses);
 assert.equal(await isDisarmed(),'false','dummy reset restores the wand');
 await castAtDummy('Expelliarmus');
 await openMode('Spell Training',poses);await poses.clock.runFor(200);
 await openMode('Practice Arena',poses);
 assert.equal(await isDisarmed(),'false','a canceled flight cannot disarm');
 assert.equal(await poses.locator('#practiceArenaDummyHealth').evaluate(el=>el.value),200);
 await poses.clock.runFor(800); // The cancelled spell still has its release recovery.
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await openMode('Spell Training',poses);await poses.clock.runFor(1000);
 await openMode('Practice Arena',poses);
 assert.equal(await isDisarmed(),'true','menu routes preserve remaining disarm time');
 await poses.clock.runFor(1000);
 assert.equal(await isDisarmed(),'false');
 await resetFixture(poses);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await poses.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.equal(await poses.locator('.practice-arena-spell').count(),0);
 await poses.clock.runFor(2100);
 await poses.evaluate(()=>{
  delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.equal(await isDisarmed(),'false','hidden-page time still counts');
 await poses.emulateMedia({reducedMotion:'reduce'});
 await resetFixture(poses);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 assert.equal(await isDisarmed(),'true','reduced motion keeps the disarm state');
 assert.equal(await poses.locator('#practiceArenaDummyWand').evaluate(el=>el.getAnimations().length),0);
 await untilReturn();
 await resetFixture(poses);
 for(let i=0;i<9;i++){await castAtDummy('Basic Cast');await poses.clock.runFor(1050);}
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 await poses.clock.runFor(6000);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(1150);
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'fallen');
 assert.equal(await isDisarmed(),'true','lethal Expelliarmus still disarms');
 await untilReturn();
 await poses.clock.runFor(50);
 assert.equal(await poses.locator('#practiceArenaDummyActor').getAttribute('data-pose'),'ready','the next round resets the fallen target');
 console.log('PASS: Practice Arena impact disarm, two-second return, repeat impact, other spells, reset, canceled flight, camera off, menu routes, hidden page, reduced motion, and lethal hit.');
 await poses.close();
 console.log('PASS: per-spell recoil, final fall, standing reset, repeated hits, reset during fall, and reduced-motion poses.');

 console.log('PASS: rejected paths, tracking loss, stopped camera, permission denial, hidden-tab cleanup, reduced motion, separate lesson controls, and responsive layout.');
}catch(error){
 const page=browser?.contexts()[0]?.pages()[0];
 if(page&&!page.isClosed())console.error('Practice Arena failure state:',await page.evaluate(async()=>({
  step:window.step,totalSteps:window.steps?.length,attackCasts:window.attackCasts,
  frames:window.fixtureFrames,
  phase:document.querySelector('#phase')?.textContent,
  input:(await import('/input-state.js')).getInputState(),
  events:document.querySelector('#practiceArenaEvents')?.textContent
 })).catch(()=>null));
 throw error;
}finally{
 await browser?.close();
 if(api&&api.exitCode===null&&api.signalCode===null){const exited=once(api,'exit');api.kill();await exited;}
 await rm(folder,{recursive:true,force:true});
}
