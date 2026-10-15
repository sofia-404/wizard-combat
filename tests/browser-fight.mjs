import {chromium} from 'playwright-core';
import {readFile,mkdir,mkdtemp,cp,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
const root=path.dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
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
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},permissions:['camera']});
 const page=await context.newPage(),errors=[],records=[];
 let failedHitSaves=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/*',async route=>{
  const payload=route.request().postData(),endpoint=new URL(route.request().url()).pathname;if(endpoint==='/api/events')records.push(JSON.parse(payload));
  const event=JSON.parse(payload);
  if(endpoint==='/api/events'&&event.type==='fight'&&event.cause==='hit'&&!failedHitSaves){
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
 const openMode=async(name,target=page)=>{
  if(await target.locator('#gameView').isVisible())await target.locator('#gameBack').click();
  assert.equal(await target.locator('#mainMenu').isVisible(),true);
  assert.equal(await target.locator('#video').evaluate(el=>el.srcObject),null);
  await target.getByRole('button',{name,exact:true}).click();
  const selected={'Training':'trainingView','Fight':'fightView','[OLD] Practice':'legacyPracticeView'}[name];
  for(const id of ['trainingView','fightView','legacyPracticeView'])assert.equal(await target.locator('#'+id).isVisible(),id===selected);
  assert.equal(await target.locator('#gameView [role="tablist"], #gameView [role="tab"], #gameView .view-tabs').count(),0);
  assert.equal(await target.locator('#gameBack').evaluate(el=>el===document.activeElement),true);
 };

 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 await page.getByRole('button',{name:'Fight',exact:true}).click();
 assert.equal(await page.locator('#fightView').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.cameraStarts),0,'menu entry leaves the camera off');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#mainMenu').isVisible(),true);
 assert.equal(await page.locator('[data-view="fight"]').evaluate(el=>el===document.activeElement),true);
 await page.getByRole('button',{name:'[OLD] Practice',exact:true}).click();


 assert.equal(await page.locator('#legacyPracticeView').isVisible(),true);
 await page.evaluate(()=>{
  window.originalViewport=document.querySelector('#viewport');
  window.originalParent=window.originalViewport.parentElement;
  window.effectLog=[];
  new MutationObserver(changes=>{
   for(const change of changes){
    for(const node of change.addedNodes){
     if(node.nodeType===1&&node.matches('.fight-spell'))window.effectLog.push({shape:node.dataset.spell,phase:'flight',at:performance.now(),health:document.querySelector('#fightDummyHealth').value});
    }
    if(change.type==='attributes'&&change.target.dataset.phase==='impact')window.effectLog.push({shape:change.target.dataset.spell,phase:'impact',at:performance.now(),health:document.querySelector('#fightDummyHealth').value});
   }
  }).observe(document.querySelector('#fightEffects'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-phase']});
 });
 await openMode('Fight');
 assert.match(await page.locator('.fight-spell-guide').textContent(),/Basic Cast/);
 assert.match(await page.locator('.fight-spell-guide').textContent(),/Confringo/);
 assert.equal(await page.locator('.fight-spell-guide span').filter({hasText:/^Z$/}).count(),0);
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement.id==='fightCameraMount'),true);
 await page.locator('#fightHand').selectOption('Right');assert.equal(await page.locator('#hand').inputValue(),'Right');
 await page.locator('#fightPoint').selectOption('grip');assert.equal(await page.locator('#point').inputValue(),'grip');
 await page.locator('#fightSwap').check();assert.equal(await page.locator('#swap').isChecked(),true);
 await page.locator('#fightHand').selectOption('Left');await page.locator('#fightPoint').selectOption('tip');await page.locator('#fightSwap').uncheck();
 const exp=resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}],40);
 const send=async points=>page.evaluate(steps=>{window.steps=steps;window.step=0;},[...Array(18).fill(points[0]),...points,...Array(22).fill(points.at(-1))]);
 await send(Array(20).fill(exp[0]));await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('#fightCamera').textContent(),'Stop camera');
 await page.waitForFunction(()=>document.querySelector('#fightArenaPhase').textContent==='READY');
 assert.equal(await page.locator('#fightArenaInstruction').textContent(),await page.locator('#instruction').textContent());
 assert.equal(await page.locator('#fightCastStatus').textContent(),'Hold still until READY. Draw one shape.');
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 // Return through the menu; release the camera and restore the exact nodes and settings.
 await openMode('[OLD] Practice');
 assert.equal(await page.locator('#viewport').evaluate(el=>el===window.originalViewport&&el.parentElement===window.originalParent),true);
 await page.locator('#hand').selectOption('Right');await page.locator('#point').selectOption('grip');
 await openMode('Fight');
 assert.equal(await page.locator('#fightHand').inputValue(),'Right');assert.equal(await page.locator('#fightPoint').inputValue(),'grip');
 await page.locator('#fightHand').selectOption('Left');await page.locator('#fightPoint').selectOption('tip');
 assert.equal(await page.evaluate(()=>window.originalStream.getVideoTracks()[0].readyState),'ended');
 assert.equal(await page.locator('#fightCamera').textContent(),'Start camera');
 await send(Array(20).fill(exp[0]));await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.evaluate(()=>window.cameraStarts),2);assert.equal(await page.evaluate(()=>window.workerStarts),2);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject!==window.originalStream&&el.srcObject.getVideoTracks()[0].readyState==='live'),true);
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 const dummyHealth=()=>page.locator('#fightDummyHealth').evaluate(el=>el.value);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#fightPlayerHealth').evaluate(el=>el.value),200);
 const circle=Array.from({length:50},(_,i)=>({x:.45+.15*Math.cos(i/49*Math.PI*2),y:.35+.15*Math.sin(i/49*Math.PI*2)}));
 const shieldHits=await page.locator('#hits').textContent();
 await send(circle);
 await page.waitForFunction(()=>document.querySelector('#fightShield').classList.contains('shield-active'));
 assert.equal(await page.locator('#lastShape').textContent(),'Protego');
 assert.equal(await page.locator('#hits').textContent(),shieldHits);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#fightHits').textContent(),'0 hits');
 assert.equal(await page.locator('.fight-spell').count(),0);
 assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 await page.waitForFunction(()=>window.step>=window.steps.length);
 await page.waitForFunction(()=>!document.querySelector('#fightShield').classList.contains('shield-active'));
 assert.equal(await page.locator('#fightShieldStatus').textContent(),'Shield inactive');
 for(const [shape,points] of [['Expelliarmus',exp],['Basic Cast',resample([{x:.25,y:.2},{x:.4,y:.5},{x:.6,y:.2}],40)],['Confringo',resample([{x:.25,y:.2},{x:.6,y:.2},{x:.25,y:.45},{x:.6,y:.45}],40)]]){
  await page.locator('#fightResetDummy').click();
  const oldHits=parseInt(await page.locator('#hits').textContent());
  const effectStart=await page.evaluate(()=>window.effectLog.length);
  await send(points);
  if(shape==='Expelliarmus'){
   await page.waitForFunction(()=>document.querySelector('#fightArenaPhase').textContent==='DRAWING');
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#fightGesture');
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return data.some((value,index)=>index%4===3&&value>0);
   });
   assert.equal(await page.evaluate(()=>document.querySelector('#fightGesture').toDataURL()===document.querySelector('#overlay').toDataURL()),true);
   await page.screenshot({path:path.join(output,'fight-live-gesture.png'),fullPage:true});
  }
  await page.waitForFunction(count=>parseInt(document.querySelector('#hits').textContent)===count,oldHits+1);
  await page.waitForFunction(()=>document.querySelector('.fight-spell[data-phase="impact"]'));
  assert.match(await page.locator('#fightCastStatus').textContent(),new RegExp(shape+' hit the dummy'));
  assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'recoil');
  assert.equal(await page.locator('#fightDummyActor').getAttribute('data-reaction'),shape);
  assert.equal(await page.locator('#fightDummyActor').evaluate(el=>el.getAnimations().length),1);
  assert.equal(await page.locator('#fightHits').textContent(),'1 hit');
  const score=Number((await page.locator('#score').textContent()).replace('%',''));
  assert.equal(await dummyHealth(),200-(score>=88?30:score>=78?25:20));
  if(shape==='Expelliarmus')await page.screenshot({path:path.join(output,'fight-hit.png'),fullPage:true});
  if(shape==='Confringo')await page.screenshot({path:path.join(output,'confringo-impact.png'),fullPage:true});
  await page.waitForFunction(()=>!document.querySelector('.fight-spell'));
  assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
  if(shape==='Basic Cast'){
   await page.setViewportSize({width:1920,height:1080});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'basic-cast-fight-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'basic-cast-fight-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1440,height:1100});
  }
  if(shape==='Confringo'){
   await page.setViewportSize({width:1920,height:1080});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'confringo-fight-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,'confringo-fight-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1440,height:1100});
  }
  const seen=await page.evaluate(start=>window.effectLog.slice(start),effectStart);
  assert.deepEqual(seen.map(({shape,phase})=>({shape,phase})),[{shape,phase:'flight'},{shape,phase:'impact'}]);
  assert.equal(seen[0].health,200,'no damage at launch');
  assert.ok(seen[1].at-seen[0].at<300,'cast-to-hit must stay below 300 ms');
  console.log(`${shape} cast-to-hit: ${Math.round(seen[1].at-seen[0].at)} ms`);
  assert.equal(parseInt(await page.locator('#hits').textContent()),oldHits+1);
 }
 console.log('PASS: three attack spells produce one flight and one impact each; settings preserved and camera restarted through the menu.');
 // Reversed paths and tracking losses never produce an effect.
 const beforeBadHealth=await dummyHealth();
 const badStart=await page.evaluate(()=>window.effectLog.length),badHits=await page.locator('#hits').textContent();
 await send([...exp].reverse());await page.waitForFunction(()=>window.step>=window.steps.length);
 await page.evaluate(points=>{window.steps=[...Array(18).fill(points[0]),...points.slice(0,25),...Array(18).fill({missing:true})];window.step=0;},exp);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),badStart);
 assert.equal(await page.locator('#hits').textContent(),badHits);
 assert.equal(await dummyHealth(),beforeBadHealth);
 assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#fightResult').textContent(),await page.locator('#lastReason').textContent());
 // Hide in-flight effects on menu return; never replay them on entry.
 await page.evaluate(()=>document.addEventListener('wizard:cast',()=>document.querySelector('#gameBack').click(),{once:true}));
 await send(exp);await page.waitForFunction(()=>!document.querySelector('#mainMenu').hidden);
 assert.equal(await page.evaluate(()=>window.originalStream.getVideoTracks()[0].readyState),'ended');
 await openMode('[OLD] Practice');
 await send(Array(20).fill(exp[0]));await page.locator('#camera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('.fight-spell').count(),0);
 const beforeLegacyPractice=await page.evaluate(()=>window.effectLog.length);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 const oldHits=parseInt(await page.locator('#hits').textContent());
 await send(circle);await page.waitForFunction(()=>document.querySelector('#lastShape').textContent==='Protego');
 assert.equal(parseInt(await page.locator('#hits').textContent()),oldHits);
 await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),beforeLegacyPractice);
 await openMode('Fight');assert.equal(await page.locator('.fight-spell').count(),0);
 await send(Array(20).fill(exp[0]));await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 await page.evaluate(()=>{window.originalStream=document.querySelector('#video').srcObject;});
 assert.equal(await page.locator('#fightCastStatus').textContent(),'Last spell: Protego');
 assert.equal(await dummyHealth(),beforeBadHealth,'Practice casts and cancelled flights do not damage the Fight dummy');
 // Reduced motion keeps a stationary impact and text feedback, without flight.
 await page.emulateMedia({reducedMotion:'reduce'});
 await send(exp);await page.waitForFunction(()=>document.querySelector('.fight-spell[data-phase="impact"]'));
 assert.equal(await page.locator('.fight-spell>line').count(),0);
 assert.equal(await page.locator('.fight-spell>circle').count(),0);
 assert.equal(await page.locator('#fightDummyActor').evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');
 await page.waitForFunction(()=>!document.querySelector('.fight-spell'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Defeat, reset, and stale flights. Use detected spells rather than synthetic cast events.
 const legacyPracticeBeforeReset=await page.locator('#hits').textContent();
 await page.locator('#fightResetDummy').click();
 assert.equal(await page.locator('#hits').textContent(),legacyPracticeBeforeReset);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject===window.originalStream),true);
 for(const expected of [170,140,110,80,50,20,0]){
  await send(exp);
  await page.waitForFunction(value=>document.querySelector('#fightDummyHealth').value===value,expected);
  await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.fight-spell'));
 }
 await page.waitForFunction(()=>document.querySelector('#fightDummyActor').dataset.pose==='fallen');
 assert.equal(await page.locator('#fightDefeat').isVisible(),true);
 assert.equal(await page.locator('#fightDummyState').textContent(),'Defeated');
 assert.equal(await page.locator('#fightHits').textContent(),'7 hits');
 assert.equal(await page.locator('#fightPlayerHealth').evaluate(el=>el.value),200);
 await page.screenshot({path:path.join(output,'fight-defeat.png'),fullPage:true});
 const defeatLog=await page.evaluate(()=>window.effectLog.length);
 await send(exp);await page.waitForFunction(()=>window.step>=window.steps.length);
 assert.equal(await page.evaluate(()=>window.effectLog.length),defeatLog);
 assert.equal(await dummyHealth(),0);
 assert.match(await page.locator('#fightCastStatus').textContent(),/Dummy defeated/);
 await openMode('[OLD] Practice');await openMode('Fight');
 assert.equal(await page.locator('#fightCamera').textContent(),'Start camera');
 await send(Array(20).fill(exp[0]));await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 assert.equal(await page.locator('#fightDefeat').isVisible(),true);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(output,'fight-defeat-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#fightResetDummy').click();
 assert.equal(await dummyHealth(),200);assert.equal(await page.locator('#fightHits').textContent(),'0 hits');
 assert.equal(await page.locator('#fightDefeat').isVisible(),false);
 assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#fightCamera').textContent(),'Stop camera');
 const legacyPracticeBeforeFlight=await page.locator('#hits').textContent();
 await page.evaluate(()=>{window.resetInFlight=false;document.addEventListener('wizard:cast',()=>{document.querySelector('#fightResetDummy').click();window.resetInFlight=true;},{once:true});});
 await send(exp);await page.waitForFunction(()=>window.resetInFlight);
 assert.equal(await dummyHealth(),200);
 assert.equal(await page.locator('.fight-spell').count(),0);
 await page.waitForFunction(()=>window.step>=window.steps.length);await page.waitForTimeout(700);
 assert.equal(await dummyHealth(),200,'reset cancels pending damage');
 assert.equal(await page.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await page.locator('#fightHits').textContent(),'0 hits');
 assert.equal(parseInt(await page.locator('#hits').textContent()),parseInt(legacyPracticeBeforeFlight)+1);
 await send(exp);await page.waitForFunction(()=>document.querySelector('#fightDummyHealth').value===170);
 await page.waitForFunction(()=>window.step>=window.steps.length&&!document.querySelector('.fight-spell'));
 console.log('PASS: health changes at impact, accuracy damage, defeat, post-defeat blocking, local reset, and stale-flight cancellation.');

 await page.locator('#fightCamera').click();
 assert.equal(await page.locator('#fightCamera').textContent(),'Start camera');
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 await page.waitForFunction(()=>document.querySelector('#fightArenaPhase').textContent==='OFF');
 assert.equal(await page.locator('#fightGesture').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.every(value=>value===0)),true);
 const stoppedHits=await page.locator('#hits').textContent();await send(circle);await page.waitForTimeout(700);
 assert.equal(await page.locator('#hits').textContent(),stoppedHits);
 assert.equal(await page.locator('.fight-spell').count(),0);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Fight must fit ${width}px`);
  await page.screenshot({path:path.join(output,`fight-live-${width}.png`),fullPage:true});
 }
 await openMode('[OLD] Practice');
 assert.equal(await page.locator('#viewport').evaluate(el=>el.parentElement===window.originalParent),true);
 assert.equal(await page.locator('#camera').textContent(),'Start camera');
 await page.locator('#reset').click();await openMode('Fight');
 assert.equal(await page.locator('#fightHits').textContent(),'1 hit');
 assert.equal(await dummyHealth(),170,'Practice session reset leaves Fight health unchanged');
 await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved on this laptop');
 assert.equal(errors.length,0,errors.join('\n'));
 // Read persisted records, including a hit whose first save failed. Logs must not change gameplay.
 const stored=(await readFile(path.join(folder,'play-data/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const fightRecords=stored.filter(e=>e.type==='fight'),launches=fightRecords.filter(e=>e.cause==='cast');
 const hitRecords=fightRecords.filter(e=>e.cause==='hit');
 assert.equal(failedHitSaves,1);
 assert.ok(fightRecords.some(e=>e.cause==='view_init'&&e.activeTab==='menu'));
 assert.ok(fightRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='menu'&&e.activeTab==='fight'));
 assert.ok(fightRecords.some(e=>e.cause==='tab_change'&&e.previousTab==='fight'&&e.activeTab==='menu'));
 assert.equal(new Set(hitRecords.map(e=>e.castId)).size,hitRecords.length,'one saved hit per cast');
 for(const hit of hitRecords){
  const launch=launches.find(e=>e.castId===hit.castId);
  const gesture=stored.find(e=>e.id===hit.castId&&e.type==='cast');
  assert.ok(launch&&gesture,'hit links to launch and original gesture');
  assert.equal(hit.session,gesture.session);assert.equal(hit.activeTab,'fight');
  assert.equal(hit.previousDummyHealth-hit.damage,hit.dummyHealth);
  assert.equal(hit.playerHealth,200);assert.equal(hit.maxHealth,200);
  assert.ok(hit.castToHitMs>=0&&hit.castToHitMs<300,'measured hit delay');
 }
 for(const launch of launches){
  assert.equal(fightRecords.filter(e=>e.castId===launch.castId&&['hit','cancel'].includes(e.cause)).length,1);
 }
 const shields=fightRecords.filter(e=>e.cause==='shield');
 assert.equal(shields.length,1);assert.equal(shields[0].shape,'Protego');assert.equal(shields[0].damage,0);
 assert.ok(stored.some(e=>e.id===shields[0].castId&&e.type==='cast'&&e.shape==='Protego'&&e.protegoGate==='ok'));
 assert.ok(!hitRecords.some(e=>e.castId===shields[0].castId));
 const defeats=fightRecords.filter(e=>e.cause==='defeat');
 assert.equal(defeats.length,1);assert.equal(defeats[0].dummyHealth,0);
 assert.equal(hitRecords.find(e=>e.castId===defeats[0].castId).dummyHealth,0);
 assert.ok(fightRecords.some(e=>e.cause==='reset'&&e.previousDummyHealth===0&&e.dummyHealth===200&&e.hits===0));
 for(const reason of ['tab_change','dummy_reset'])assert.ok(fightRecords.some(e=>e.cause==='cancel'&&e.reason===reason));
 const legacyPracticeCasts=stored.filter(e=>e.type==='cast'&&e.activeTab==='legacy-practice');
 assert.ok(legacyPracticeCasts.length>0);
 for(const cast of legacyPracticeCasts)assert.ok(!launches.some(e=>e.castId===cast.id),'Practice does not launch Fight spells');
 assert.ok(fightRecords.some(e=>e.session!==hitRecords[0].session&&e.cause==='tab_change'&&e.dummyHealth===170),'new session keeps Fight health');
 console.log('PASS: saved Fight route, cast, hit timing, health, defeat, reset, cancellation, session links, and failed-save retry.');
 // Leaving Fight stops its shared camera and preserves target health.
 await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#camera').textContent==='Stop camera');
 await page.locator('#gameBack').click();
 assert.equal(await page.locator('#video').evaluate(el=>el.srcObject),null);
 assert.equal(await page.locator('.fight-spell').count(),0);
 await page.getByRole('button',{name:'Fight',exact:true}).click();
 assert.equal(await dummyHealth(),170);
 assert.equal(await page.locator('#fightCamera').textContent(),'Start camera');
 // Camera permission errors are visible and recoverable directly in Fight.
 const denied=await context.newPage();
 await denied.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await denied.goto(base);await denied.getByRole('button',{name:'Fight',exact:true}).click();await denied.locator('#fightCamera').click();
 await denied.waitForFunction(()=>document.querySelector('#fightCameraState').textContent.includes('permission denied'));
 assert.equal(await denied.locator('#fightCamera').isEnabled(),true);
 assert.equal(await denied.locator('#fightCamera').textContent(),'Start camera');
 assert.equal(await denied.locator('#viewport').isVisible(),true);
 await denied.close();
 // Exercise presentation races in isolation. This page uses no camera input.
 let poses=await context.newPage();await poses.goto(base);await poses.getByRole('button',{name:'Fight',exact:true}).click();
 // Both figures idle at rest. A falling dummy and reduced motion stop that motion.
 const IDLE=['player-breathe','player-sway','player-back-arm','player-wand-arm','dummy-breathe','dummy-sway','dummy-wand'];
 const idle=()=>poses.evaluate(()=>[...document.querySelectorAll('#fightView .idle')].map(group=>group.getAnimations().map(animation=>animation.animationName).join()));
 assert.deepEqual(await idle(),IDLE);
 await poses.evaluate(async()=>{
  const {createDummyReactions}=await import('/fight-reactions.js');
  window.reactions=createDummyReactions(document.querySelector('#fightDummyActor'));
  window.reactions.react('Basic Cast');window.reactions.react('Confringo');
 });
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-reaction'),'Confringo');
 assert.equal(await poses.locator('#fightDummyActor').evaluate(el=>el.getAnimations().length),1);
 await poses.evaluate(()=>window.reactions.reset());
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 await poses.evaluate(()=>window.reactions.react('Expelliarmus',true));
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'falling');
 assert.deepEqual(await idle(),[...IDLE.slice(0,4),'','',''],'the wizard keeps moving while the dummy falls');
 await poses.evaluate(()=>window.reactions.reset());await poses.waitForTimeout(1000);
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'ready');
 assert.equal(await poses.locator('#fightDummyActor').evaluate(el=>el.getAnimations().length),0);
 assert.deepEqual(await idle(),IDLE);
 await poses.emulateMedia({reducedMotion:'reduce'});
 assert.deepEqual(await idle(),IDLE.map(()=>''));
 assert.equal(await poses.evaluate(()=>[...document.querySelectorAll('#fightView .idle')].every(group=>getComputedStyle(group).transform==='none')),true);
 await poses.evaluate(()=>window.reactions.react('Basic Cast',true));
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'fallen');
 assert.equal(await poses.locator('#fightDummyActor').evaluate(el=>el.getAnimations().length),0);
 await poses.evaluate(()=>window.reactions.settle());
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'fallen');
 // Check both color consumers without camera input or changing game state.
 for (const reducedMotion of ['no-preference','reduce']) {
  await poses.emulateMedia({reducedMotion});
  const colors=await poses.evaluate(async()=>{
   const {createSpellEffects}=await import('/fight-effects.js');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   const effects=createSpellEffects(svg,()=>{}),actor=document.querySelector('#fightDummyActor');
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
 await poses.goto(base);await poses.getByRole('button',{name:'Fight',exact:true}).click();
 await poses.locator('#fightResetDummy').click();
 await poses.evaluate(()=>{
  window.syntheticCast=0;
  new MutationObserver(changes=>{
   if(changes.some(change=>change.target.dataset.disarmed==='true'))window.disarmedAt=performance.now();
  }).observe(document.querySelector('#fightDummyActor'),{attributes:true,attributeFilter:['data-disarmed']});
 });
 const castAtDummy=shape=>poses.evaluate(shape=>document.dispatchEvent(new CustomEvent('wizard:cast',{
  detail:{id:`disarm-${++window.syntheticCast}`,shape,score:90,damage:30}
 })),shape);
 // Shield timers and display use an isolated clock, not the camera frame rate.
 for(const reducedMotion of ['no-preference','reduce']){
  await poses.emulateMedia({reducedMotion});
  await castAtDummy('Protego');
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),true);
  assert.equal(await poses.locator('.fight-spell').count(),0);
  assert.equal(await poses.locator('#fightDummyHealth').evaluate(el=>el.value),200);
  assert.equal(await poses.locator('#fightHits').textContent(),'0 hits');
  if(reducedMotion==='reduce')assert.equal(await poses.locator('#fightShield').evaluate(el=>el.getAnimations().length),0);
  if(reducedMotion==='no-preference'){
   await poses.clock.runFor(200);
   for(const width of [1920,390]){
    await poses.setViewportSize({width,height:1080});
    assert.equal(await poses.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await poses.screenshot({path:path.join(output,`protego-fight-${width}.png`),fullPage:true});
   }
  }
  await poses.clock.runFor(1000);await castAtDummy('Protego');
  await openMode('[OLD] Practice',poses);await poses.clock.runFor(1000);await openMode('Fight',poses);
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),true);
  await poses.clock.runFor(1999);
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),true);
  await poses.clock.runFor(1);
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),false);
  await castAtDummy('Protego');await poses.locator('#fightResetDummy').click();
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),false);
  await castAtDummy('Protego');await openMode('[OLD] Practice',poses);await poses.locator('#reset').click();await openMode('Fight',poses);
  assert.equal(await poses.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),false);
 }
 await poses.emulateMedia({reducedMotion:'no-preference'});
 console.log('PASS: Protego shield, no damage or strike, repeat cast, expiry, menu routes, both resets, desktop/mobile, and reduced motion.');
 const isDisarmed=()=>poses.locator('#fightDummyActor').getAttribute('data-disarmed');
 const untilReturn=async()=>{
  const remaining=await poses.evaluate(()=>window.disarmedAt+2000-performance.now());
  await poses.clock.runFor(remaining-1);
  assert.equal(await isDisarmed(),'true','wand stays dropped until the full two seconds pass');
  await poses.clock.runFor(1);
  assert.equal(await isDisarmed(),'false');
  assert.equal(await poses.locator('#fightWandStatus').textContent(),'Wand ready');
 };
 assert.equal(await poses.locator('#fightCamera').textContent(),'Start camera');
 const readyWandTransform=await poses.locator('#fightDummyWand').evaluate(el=>getComputedStyle(el).transform);
 await castAtDummy('Expelliarmus');
 assert.equal(await isDisarmed(),'false','launch does not drop the wand');
 await poses.clock.runFor(100);
 assert.equal(await isDisarmed(),'false','flight does not drop the wand');
 await poses.clock.runFor(60);
 assert.equal(await isDisarmed(),'true','impact drops the wand with the camera off');
 assert.equal(await poses.locator('#fightDummyWand .idle').evaluate(group=>group.getAnimations().length),0,'a dropped wand stops swaying');
 assert.equal(await poses.locator('#fightWandStatus').textContent(),'Disarmed · Wand returns in 2 seconds');
 // Inspect the rendered motion: release, accelerating fall, one small bounce, rest.
 const wandFall=await poses.locator('#fightDummyWand').evaluate(wand=>{
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
 await poses.screenshot({path:path.join(output,'fight-disarmed-desktop.png'),fullPage:true,animations:'disabled'});
 assert.notEqual(await poses.locator('#fightDummyWand').evaluate(el=>getComputedStyle(el).transform),readyWandTransform,'the dropped wand moves away from its ready pose');
 await poses.setViewportSize({width:390,height:844});
 assert.equal(await poses.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await poses.screenshot({path:path.join(output,'fight-disarmed-mobile.png'),fullPage:true,animations:'disabled'});
 await untilReturn();
 assert.equal(await poses.locator('#fightDummyWand .idle').evaluate(group=>group.getAnimations().length),1,'a returned wand sways again');
 await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
 await poses.clock.runFor(1000);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
 await untilReturn();
 for(const shape of ['Protego','Basic Cast','Confringo']){
  await poses.locator('#fightResetDummy').click();
  await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
  const deadline=await poses.evaluate(()=>window.disarmedAt+2000);
  await poses.clock.runFor(500);await castAtDummy(shape);await poses.clock.runFor(160);
  assert.equal(await isDisarmed(),'true',`${shape} does not restore the wand`);
  await poses.clock.runFor(deadline-await poses.evaluate(()=>performance.now()));
  assert.equal(await isDisarmed(),'false',`${shape} does not extend disarm`);
 }
 await poses.locator('#fightResetDummy').click();
 await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
 await poses.locator('#fightResetDummy').click();
 assert.equal(await isDisarmed(),'false','dummy reset restores the wand');
 await castAtDummy('Expelliarmus');
 await openMode('[OLD] Practice',poses);await poses.clock.runFor(200);
 await openMode('Fight',poses);
 assert.equal(await isDisarmed(),'false','a canceled flight cannot disarm');
 assert.equal(await poses.locator('#fightDummyHealth').evaluate(el=>el.value),200);
 await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
 await openMode('[OLD] Practice',poses);await poses.clock.runFor(1000);
 await openMode('Fight',poses);
 assert.equal(await isDisarmed(),'true','menu routes preserve remaining disarm time');
 await poses.clock.runFor(1000);
 assert.equal(await isDisarmed(),'false');
 await castAtDummy('Expelliarmus');await poses.clock.runFor(160);
 await poses.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.equal(await poses.locator('.fight-spell').count(),0);
 await poses.clock.runFor(2100);
 await poses.evaluate(()=>{
  delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
 });
 assert.equal(await isDisarmed(),'false','hidden-page time still counts');
 await poses.emulateMedia({reducedMotion:'reduce'});
 await poses.locator('#fightResetDummy').click();
 await castAtDummy('Expelliarmus');await poses.clock.runFor(20);
 assert.equal(await isDisarmed(),'true','reduced motion keeps the disarm state');
 assert.equal(await poses.locator('#fightDummyWand').evaluate(el=>el.getAnimations().length),0);
 await untilReturn();
 await poses.locator('#fightResetDummy').click();
 for(let i=0;i<6;i++){await castAtDummy('Basic Cast');await poses.clock.runFor(20);}
 await castAtDummy('Expelliarmus');await poses.clock.runFor(20);
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'fallen');
 assert.equal(await isDisarmed(),'true','lethal Expelliarmus still disarms');
 await untilReturn();
 assert.equal(await poses.locator('#fightDummyActor').getAttribute('data-pose'),'fallen');
 console.log('PASS: Fight impact disarm, two-second return, repeat impact, other spells, reset, canceled flight, camera off, menu routes, hidden page, reduced motion, and lethal hit.');
 await poses.close();
 console.log('PASS: per-spell recoil, final fall, standing reset, repeated hits, reset during fall, and reduced-motion poses.');

 console.log('PASS: rejected paths, tracking loss, stopped camera, permission denial, hidden-tab cleanup, reduced motion, session reset, and responsive layout.');
}finally{
 await browser?.close();
 if(api&&api.exitCode===null&&api.signalCode===null){const exited=once(api,'exit');api.kill();await exited;}
 await rm(folder,{recursive:true,force:true});
}
