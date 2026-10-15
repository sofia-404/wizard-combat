import {chromium} from 'playwright-core';
import {readFile,mkdir,mkdtemp,cp,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomInt} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resample} from '../dist/gesture.js';
import {openGameMode} from './browser-game-mode.mjs';
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
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/*',async route=>{
  const payload=route.request().postData(),endpoint=new URL(route.request().url()).pathname;if(endpoint==='/api/events')records.push(JSON.parse(payload));
  const response=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:payload});
  await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 await page.addInitScript(()=>{
  window.steps=[];window.step=0;window.acceptedCasts=0;
  document.addEventListener('wizard:cast',()=>window.acceptedCasts++);
  window.Worker=class{
   postMessage(data){
    if(data.type==='init'){setTimeout(()=>this.onmessage({data:{type:'ready'}}),0);return;}
    data.bitmap.close();
    if(window.followUp&&window.acceptedCasts>=window.followUp.afterCasts){
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
 const openMode=(name,target=page)=>openGameMode(target,name);

 await openMode('Fight');
 page.setDefaultTimeout(20000);
 const exp=resample([{x:.25,y:.2},{x:.55,y:.2},{x:.55,y:.5}],40);
 const circle=Array.from({length:40},(_,i)=>({x:.55+.1*(Math.cos(i/39*2*Math.PI)-1),y:.5+.1*Math.sin(i/39*2*Math.PI)}));
 await page.evaluate(point=>{window.steps=Array(20).fill(point);window.step=0;},exp[0]);
 await page.locator('#fightCamera').click();
 await page.waitForFunction(()=>document.querySelector('#phase').textContent==='READY');
 const start=records.length;
 // Start the second spell on the first frame after the first accepted cast.
 await page.evaluate(({exp,circle})=>{
  window.steps=[...Array(18).fill(exp[0]),...exp,...Array(22).fill(exp.at(-1))];window.step=0;
  window.followUp={afterCasts:1,points:[...circle,...Array(22).fill(circle.at(-1))]};
 },{exp,circle});
 await page.waitForFunction(()=>window.acceptedCasts===2&&window.step>=window.steps.length);
 await page.waitForFunction(async()=>(await import('/input-state.js')).getInputState().saveStatus==='Saved on this laptop');
 await page.waitForTimeout(700);
 const casts=records.slice(start).filter(e=>e.type==='cast');
 assert.deepEqual(casts.map(e=>e.shape),['Expelliarmus','Protego']);
 assert.equal(await page.evaluate(()=>window.acceptedCasts),2,'holding must not repeat a cast');
 assert.equal(await page.locator('#fightHits').textContent(),'1 hit');
 assert.equal(await page.locator('#fightDummyHealth').evaluate(el=>el.value),170);
 assert.equal(await page.locator('#fightShield').evaluate(el=>el.classList.contains('shield-active')),true);
 const stored=(await readFile(path.join(folder,'play-data/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 for(const cast of casts){
  assert.ok(stored.some(e=>e.id===cast.id&&e.activeTab==='fight'&&e.version===3));
  assert.ok((await readFile(path.join(folder,'play-data',cast.resultImage))).length>0);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: immediate Expelliarmus-to-Protego, no extra hold, no duplicate cast, Fight effects, saved records and path cards. Simulated input only.');
}finally{
 await browser?.close();
 if(api&&api.exitCode===null&&api.signalCode===null){const exited=once(api,'exit');api.kill();await exited;}
 await rm(folder,{recursive:true,force:true});
}
