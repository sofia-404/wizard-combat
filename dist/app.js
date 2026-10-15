import {getSettings,updateSettings} from './settings.js';
import {GestureController,bounds} from './gesture.js';
import {ExpelliarmusLesson} from './lesson.js';
import {TrainingDummy} from './dummy.js';
import {HandInput} from './hand-input.js';
import {resultCard,resultTitle} from './result-card.js';
const $=id=>document.getElementById(id);
const video=$('video'),canvas=$('overlay'),ctx=canvas.getContext('2d'),preview=$('pathPreview'),pc=preview.getContext('2d');
let stream=null,worker=null,token=0,modelReady=false,busy=false,loading=false,delegate='GPU',recovering=false;
let lastVideoTime=-1,lastSent=0,lastResult=0,rateStart=0,rateCount=0,hz=0,inference=0,selectedPoints=null,cursor=null;
let session=crypto.randomUUID(),events=[],hits=0,flashUntil=0,lastPath=[],lastPathUntil=0,lastUI='',saveQueue=[],saving=false;
$('hand').value=getSettings().hand;
const controller=new GestureController(onGesture,{difficulty:getSettings().difficulty});
const handInput=new HandInput();
const lesson=new ExpelliarmusLesson();
const dummy=new TrainingDummy();
let inputSettings=readSettings(),tracking={},trackingAt=0,trackingFrames=0,noHandFrames=0,labelHoldFrames=0,wrongHandFrames=0,edgeFrames=0,duplicateFrames=0,lastFrameT=null;
function readSettings(){return {hand:$('hand').value,point:$('point').value,swap:Number($('swap').checked),expected:$('expected').value,difficulty:getSettings().difficulty};}
function reportTracking(cause,data={}){
  tracking={...tracking,...data,trackingCause:cause};trackingFrames++;
  if(cause==='no_hand')noHandFrames++;
  if(cause==='label_hold')labelHoldFrames++;
  if(cause==='wrong_hand')wrongHandFrames++;
  if(cause==='edge')edgeFrames++;
  if(data.duplicateHands>0)duplicateFrames++;
  const now=performance.now();
  if(now-trackingAt>=1000){
    record({type:'tracking',...tracking,state:controller.state,frames:trackingFrames,noHandFrames,labelHoldFrames,wrongHandFrames,edgeFrames,duplicateFrames,hz:Math.round(hz),inference:Math.round(inference)});
    trackingAt=now;trackingFrames=0;noHandFrames=0;labelHoldFrames=0;wrongHandFrames=0;edgeFrames=0;duplicateFrames=0;
  }
}
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function set(id,value){if($(id).textContent!==String(value))$(id).textContent=String(value);}
function record(data,png=null){
  const event={id:crypto.randomUUID(),session,at:new Date().toISOString(),source:'camera',version:3,...inputSettings,lessonState:lesson.state,lessonCount:lesson.count,...data};
  saveQueue.push({event,png,eventSaved:false});flush();
}
async function flush(){
  if(saving||!saveQueue.length)return;saving=true;set('saveStatus','Saving locally…');
  try{
    const post=async(url,data)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Save failed');};
    while(saveQueue.length){
      const item=saveQueue[0];
      if(!item.eventSaved){await post('/api/events',item.event);item.eventSaved=true;}
      if(item.png)await post('/api/results',{id:item.event.id,png:item.png});
      saveQueue.shift();
    }
    set('saveStatus','Saved on this laptop');$('saveStatus').classList.remove('bad');
  }
  catch{set('saveStatus','Save failed. Keep this page open.');$('saveStatus').classList.add('bad');}
  finally{saving=false;}
}
setInterval(flush,5000);
function onGesture(event){
  if(event.type==='capture'){record({type:'capture',cause:event.cause,...tracking,...event.diagnostics});return;}
  lesson.update(event);renderLesson();
  const now=performance.now();
  const result={type:event.type,shape:event.shape||'None',score:event.score||0,margin:event.margin||0,latency:Math.round((event.latency||0)+Math.max(0,now-(controller.lastT||now))),duration:Math.round(event.duration||0),reason:event.reason||'',expected:inputSettings.expected,hz:Math.round(hz),inference:Math.round(inference)};
  Object.assign(result,tracking,event.diagnostics||{},{cause:event.cause||'unknown'});
  if(event.path?.length){const b=bounds(event.path);Object.assign(result,{samples:event.path.length,width:+b.width.toFixed(4),height:+b.height.toFixed(4)});}
  lastPath=event.path||[];lastPathUntil=now+3500;drawPreview(lastPath,event.type==='cast');
  Object.assign(result,{id:crypto.randomUUID(),at:new Date().toISOString(),hand:inputSettings.hand,point:inputSettings.point});
  result.resultImage='results/'+result.id+'.png';
  if(event.type!=='ignored')events.push(result);record(result,resultCard(result,preview));
  set('lastShape',resultTitle(result));
  set('lastReason',event.reason);set('resultTag',event.type==='cast'?'CAST':event.type==='cancel'?(result.endRule==='loss'?'LOST':'STOP'):event.type==='ignored'?'MOVE':'RETRY');
  set('score',event.shape&&event.shape!=='None'?event.score+'%':'—');set('latency',event.type==='cancel'?'—':result.latency+' ms');
  set('diagnosis',event.type==='cancel'?event.reason:`${result.shape==='None'?'Path':'Closest: '+result.shape} | Size ${Math.round(Math.max(result.width||0,result.height||0)*100)}% | ${result.samples||0} points`);
  if(event.type==='cast'){
    hits++;set('hits',`${hits} ${hits===1?'hit':'hits'}`);
    const damage=event.score>=88?30:event.score>=78?25:20;
    set('impact','+'+damage);set('targetNote',`${event.shape} · ${damage} damage`);
    $('targetScene').classList.remove('hit');void $('targetScene').offsetWidth;$('targetScene').classList.add('hit');flashUntil=now+1100;
    if(dummy.cast(event,now)){
      renderDummy();record({type:'settings',cause:'dummy_disarm',reason:'Dummy disarmed. Wand returns in 2 seconds.'});
    }
  }
  renderSession();
}
function renderDummy(){
  $('targetScene').classList.toggle('disarmed',dummy.disarmed);
  set('dummyStatus',dummy.disarmed?'Disarmed · Wand returns in 2 seconds':'Wand ready');
  $('dummy').setAttribute('aria-label',dummy.disarmed?'Training dummy with dropped wand':'Training dummy holding a wand');
}
function renderLesson(){
  set('lessonCount',`${lesson.count} / 3`);$('lessonProgress').value=lesson.count;
  const complete=lesson.state==='complete';
  set('lessonProgress',`${lesson.count} of 3`);
  set('lessonMessage',complete?'Lesson complete: 3/3.':lesson.message);
  $('lessonMessage').classList.toggle('lesson-complete',complete);
  set('lessonStart',complete?'Practice again':'Start lesson');
  $('lessonStart').hidden=lesson.state==='active';
  $('lessonStart').className=complete?'quiet':'primary';
  set('lessonStop',complete?'Finish lesson':'Stop lesson');
  $('lessonStop').hidden=lesson.state==='idle';
  $('lessonStop').className=complete?'primary':'quiet';
}
function renderSession(){
  const completed=events.filter(e=>e.type==='cast'||e.type==='reject');
  const casts=completed.filter(e=>e.type==='cast'),trials=completed.filter(e=>e.expected!=='Any');
  set('attempts',completed.length);set('accepted',casts.length);set('rejected',completed.length-casts.length);
  set('lost',events.filter(e=>e.type==='cancel'&&e.endRule==='loss').length);
  set('accuracy',trials.length?`${trials.filter(e=>e.type==='cast'&&e.shape===e.expected).length}/${trials.length}`:'—');
  const times=casts.map(e=>e.latency).sort((a,b)=>a-b);set('p90',times.length?times[Math.max(0,Math.ceil(times.length*.9)-1)]+' ms':'—');
  $('events').replaceChildren();
  if(!events.length){const li=document.createElement('li');li.textContent='No gestures yet.';li.className='muted';$('events').append(li);}
  for(const e of events.slice(-8).reverse()){
    const li=document.createElement('li'),label=document.createElement('span'),detail=document.createElement('span');
    label.textContent=e.type==='cast'?`${e.shape} · ${e.score}%`:`${e.type==='cancel'?resultTitle(e):'Rejected'} · ${e.reason}`;
    detail.textContent=e.expected==='Any'?(e.type==='cast'?e.latency+' ms':''):`Expected ${e.expected}${e.type==='cast'&&e.shape===e.expected?' · correct':' · missed'}`;
    if(e.type!=='cast')li.className='muted';li.append(label,detail);$('events').append(li);
  }
}
function drawPreview(points,accepted){
  pc.clearRect(0,0,preview.width,preview.height);if(points.length<2)return;
  const b=bounds(points),scale=Math.min(125/Math.max(b.width,.01),100/Math.max(b.height,.01));
  const map=p=>({x:85+(p.x-(b.minX+b.maxX)/2)*scale,y:70+(p.y-(b.minY+b.maxY)/2)*scale});
  pc.beginPath();points.forEach((p,i)=>{const a=map(p);i?pc.lineTo(a.x,a.y):pc.moveTo(a.x,a.y);});pc.strokeStyle=accepted?'#2f7251':'#b77748';pc.lineWidth=3;pc.lineCap='round';pc.lineJoin='round';pc.stroke();
  const first=map(points[0]);pc.beginPath();pc.arc(first.x,first.y,4,0,Math.PI*2);pc.fillStyle='#b77748';pc.fill();
}
export function stopTrainingCamera(){stopCamera('Camera stopped. Lesson progress kept.');}
function stopCamera(reason='Camera stopped'){
  if(stream)record({type:'camera',reason});
  token++;loading=false;modelReady=false;recovering=false;busy=false;
  worker?.terminate();worker=null;
  if(stream){for(const track of stream.getTracks()){track.onended=null;track.stop();}}
  stream=null;video.srcObject=null;selectedPoints=null;cursor=null;lastVideoTime=-1;controller.cancel(reason,'camera_stopped');lastUI='';
  handInput.reset();tracking={};lastFrameT=null;trackingAt=0;trackingFrames=0;noHandFrames=0;labelHoldFrames=0;wrongHandFrames=0;edgeFrames=0;duplicateFrames=0;
  $('camera').disabled=false;set('camera','Start camera');set('cameraState',reason);set('tracking','Off');set('engine','—');set('hz','—');set('inference','—');set('phase','OFF');set('instruction',reason);$('empty').hidden=false;
}
async function createTracker(useDelegate,run){
  const w=new Worker('/tracker-worker.js');worker=w;
  await new Promise((resolve,reject)=>{
    let finished=false;const timer=setTimeout(()=>finish(Error('Model load timed out')),20000);
    function finish(error){if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve();}
    w.onerror=e=>{if(run!==token)return;if(!finished)finish(Error(e.message||'Tracking failed'));else recover('Tracking worker failed');};
    w.onmessage=({data})=>{
      if(run!==token||worker!==w)return;
      if(data.type==='ready'){delegate=useDelegate;finish();}
      else if(data.type==='error'){if(!finished)finish(Error(data.message));else recover('Tracking error');}
      else if(data.type==='result')receive(data);
    };
    w.postMessage({type:'init',delegate:useDelegate});
  });
}
async function recover(reason){
  if(recovering||!stream)return;
  if(delegate==='CPU'){stopCamera(reason+'. Restart the camera.');return;}
  recovering=true;modelReady=false;busy=false;record({type:'camera',reason,cause:'worker_error'});controller.cancel('Tracking reset. Start again.','worker_error');handInput.reset();worker?.terminate();set('cameraState','Switching to CPU…');const run=token;
  try{await createTracker('CPU',run);if(run!==token)return;modelReady=true;recovering=false;lastResult=performance.now();lastVideoTime=-1;set('engine','CPU');set('cameraState','Camera on');}
  catch{if(run===token)stopCamera('Tracking failed. Restart the camera.');}
}
async function startCamera(){
  if(loading)return;
  if(stream){stopCamera();return;}
  stopCamera('Starting camera…');loading=true;const run=token;$('camera').disabled=true;set('camera','Starting…');set('instruction','Allow camera access. Loading hand tracking.');
  try{
    const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:60}},audio:false});
    if(run!==token){media.getTracks().forEach(t=>t.stop());return;}
    stream=media;video.srcObject=media;await video.play();
    if(run!==token)return;
    stream.getVideoTracks()[0].onended=()=>stopCamera('Camera disconnected');
    canvas.width=video.videoWidth||640;canvas.height=video.videoHeight||480;$('viewport').style.aspectRatio=canvas.width+'/'+canvas.height;
    try{await createTracker('GPU',run);}catch{if(run!==token)return;worker?.terminate();await createTracker('CPU',run);}
    if(run!==token)return;
    loading=false;modelReady=true;rateStart=performance.now();rateCount=0;lastResult=performance.now();lastVideoTime=-1;lastSent=0;
    $('empty').hidden=true;$('camera').disabled=false;set('camera','Stop camera');set('cameraState','Camera on');set('engine',delegate);record({type:'camera',reason:'Started '+delegate});
  }catch(error){if(run!==token)return;const reason=error.name==='NotAllowedError'?'Camera permission denied. Allow access and retry.':error.name==='NotFoundError'?'No camera found.':error.name==='NotReadableError'?'Camera is busy. Close other camera apps.':'Camera could not start. '+String(error.message).slice(0,100);stopCamera(reason);set('instruction',reason);}
}
function receive(data){
  busy=false;const now=performance.now();lastResult=now;inference=data.inference;rateCount++;
  if(now-rateStart>1000){hz=rateCount*1000/(now-rateStart);rateStart=now;rateCount=0;set('hz',Math.round(hz)+' Hz');}
  set('inference',Math.round(inference)+' ms');
  const timing={frameAge:Math.round(now-data.t),frameGap:lastFrameT===null?0:Math.round(data.t-lastFrameT),gapMs:controller.lastT===null?0:Math.round(data.t-controller.lastT)};lastFrameT=data.t;
  if(now-data.t>350){reportTracking('stale_frame',timing);controller.cancel('Camera delayed. Start again.','stale_frame');handInput.reset();selectedPoints=null;cursor=null;return;}
  const selection=handInput.select(data,inputSettings.hand,Boolean(inputSettings.swap),inputSettings.point);
  const {points:chosen,cause,...detail}=selection;
  const point=chosen?(inputSettings.point==='grip'?{x:(chosen[5].x+chosen[9].x)/2,y:(chosen[5].y+chosen[9].y)/2}:chosen[8]):null;
  const edge=point&&(point.x<.02||point.x>.98||point.y<.02||point.y>.98);
  reportTracking(edge?'edge':cause,{...timing,...detail,labelConfidence:+detail.labelConfidence.toFixed(3)});
  const reasons={no_hand:'Hand not detected',wrong_hand:'Selected hand not found',hands_overlap:'Separate your hands',hand_jump:'Hand moved too far',invalid_points:'Hand points invalid'};
  set('tracking',chosen?(cause==='label_hold'?'Hand held through label change':inputSettings.hand+' found'):reasons[cause]);
  if(!chosen){
    if(cause==='no_hand'||cause==='hands_overlap')controller.missing(data.t,reasons[cause]+'. Start again.',cause);
    else controller.cancel(reasons[cause]+'. Start again.',cause);
    selectedPoints=null;cursor=null;return;
  }
  if(edge){controller.cancel('Hand at edge. Move inward.','edge');set('tracking','Hand at edge');selectedPoints=null;cursor=null;return;}
  selectedPoints=chosen;cursor={x:1-point.x,y:point.y*canvas.height/canvas.width};controller.update(cursor,data.t);
}
function animate(now){
  requestAnimationFrame(animate);
  if(dummy.restore(now)){
    renderDummy();record({type:'settings',cause:'dummy_return',reason:'Dummy wand returned.'});
  }
  if(modelReady&&stream){
    if(now-lastResult>300){reportTracking('worker_stall',{frameAge:Math.round(now-lastResult)});controller.cancel('Tracking delayed. Start again.','worker_stall');handInput.reset();selectedPoints=null;cursor=null;set('tracking','Tracking delayed');}
    if(now-lastResult>3500){recover('Tracking stopped');}
    if(!busy&&video.readyState>=2&&video.currentTime!==lastVideoTime&&now-lastSent>=28){
      busy=true;lastVideoTime=video.currentTime;lastSent=now;const run=token,w=worker;
      createImageBitmap(video).then(bitmap=>{if(run!==token||w!==worker||!modelReady){bitmap.close();return;}w.postMessage({type:'frame',bitmap,t:now},[bitmap]);}).catch(()=>{if(run===token){busy=false;reportTracking('frame_error');controller.cancel('Camera frame unavailable','frame_error');}});
    }
    set('phase',controller.missingCause?'HOLD':controller.state==='waiting'?'HOLD':controller.state.toUpperCase());
    if(controller.message!==lastUI){set('instruction',controller.message);lastUI=controller.message;}
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(selectedPoints){ctx.strokeStyle='#b2d7a777';ctx.lineWidth=1.3;for(const [a,b] of connections){ctx.beginPath();ctx.moveTo((1-selectedPoints[a].x)*canvas.width,selectedPoints[a].y*canvas.height);ctx.lineTo((1-selectedPoints[b].x)*canvas.width,selectedPoints[b].y*canvas.height);ctx.stroke();}}
  const path=controller.state==='drawing'?controller.path:now<lastPathUntil?lastPath:[];
  if(path.length>1){ctx.strokeStyle=controller.state==='drawing'?'#c2f3a0':'#e8bf83';ctx.shadowColor='#8ce67e';ctx.shadowBlur=8;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x*canvas.width,p.y*canvas.width):ctx.moveTo(p.x*canvas.width,p.y*canvas.width));ctx.stroke();ctx.shadowBlur=0;}
  if(cursor){ctx.beginPath();ctx.arc(cursor.x*canvas.width,cursor.y*canvas.width,controller.state==='ready'?10:6,0,Math.PI*2);ctx.fillStyle=controller.state==='ready'?'#c2f3a0':'#ffffff';ctx.fill();ctx.strokeStyle='#29432f';ctx.lineWidth=2;ctx.stroke();}
  if(flashUntil&&now>flashUntil){$('targetScene').classList.remove('hit');flashUntil=0;}
}
$('lessonStart').addEventListener('click',()=>{
  controller.cancel('Lesson started. Hold still to start.','input_changed');
  lesson.start();renderLesson();lastPath=[];lastUI='';
  record({type:'settings',cause:'lesson_start',reason:'Expelliarmus lesson started'});
});
$('lessonStop').addEventListener('click',()=>{
  const finished=lesson.state==='complete';
  controller.cancel('Lesson stopped. Hold still to start.','input_changed');
  lesson.stop();renderLesson();lastPath=[];lastUI='';
  record({type:'settings',cause:finished?'lesson_finish':'lesson_stop',reason:finished?'Expelliarmus lesson finished':'Expelliarmus lesson stopped'});
});
$('camera').addEventListener('click',startCamera);
for(const id of ['hand','point','swap','expected'])$(id).addEventListener('change',()=>{controller.cancel('Input changed. Hold still to start.','input_changed');inputSettings=readSettings();handInput.reset();tracking={};record({type:'settings',reason:'Input changed'});cursor=null;selectedPoints=null;lastPath=[];lastUI='';});
$('reset').addEventListener('click',()=>{controller.reset();lesson.stop();renderLesson();dummy.reset();renderDummy();handInput.reset();tracking={};set('diagnosis','No captured shape yet.');events=[];hits=0;session=crypto.randomUUID();lastPath=[];drawPreview([],false);set('hits','0 hits');set('lastShape','—');set('lastReason','Draw, then stop briefly.');set('score','—');set('latency','—');set('resultTag','Waiting');set('targetNote','Accepted shapes cast at the dummy.');record({type:'reset',reason:'New test session'});renderSession();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||loading))stopCamera('Paused. Start camera to resume.');});
window.addEventListener('pagehide',()=>stopCamera('Page closed'));
requestAnimationFrame(animate);

window.addEventListener('wizard-settings',()=>{const settings=getSettings();if(settings.hand===inputSettings.hand&&settings.difficulty===inputSettings.difficulty)return;controller.cancel('Options changed. Hold still to start.','input_changed');controller.setDifficulty(settings.difficulty);$('hand').value=settings.hand;inputSettings=readSettings();handInput.reset();tracking={};cursor=null;selectedPoints=null;lastPath=[];lastUI='';record({type:'settings',reason:'Drawing options changed'});});
$('hand').addEventListener('change',()=>updateSettings({hand:$('hand').value}));
