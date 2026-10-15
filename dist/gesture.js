import {matchCircle} from './circle-match.js';
import {matchStrokes} from './stroke-match.js';
import {matchExpelliarmus} from './expelliarmus.js';
import {loopTurns} from './path-turns.js';
// Image-width units, including y. This preserves physical shape proportions.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function bounds(points){
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
export function resample(points,n=64){
  if(points.length<2)return [];
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));
  const total=lengths.at(-1);if(total<1e-8)return [];
  let j=1;return Array.from({length:n},(_,i)=>{const target=total*i/(n-1);while(j<lengths.length-1&&lengths[j]<target)j++;const span=lengths[j]-lengths[j-1],r=span?(target-lengths[j-1])/span:0;return {x:points[j-1].x+(points[j].x-points[j-1].x)*r,y:points[j-1].y+(points[j].y-points[j-1].y)*r};});
}
// This implementation keeps image proportions and also handles a straight return path.
export function movementIntent(points,precisionScale=1){
  if(points.length<3)return {intent:false,lineDeviation:0};
  const b=bounds(points),diag=Math.hypot(b.width,b.height);
  const a=points[0],far=points.reduce((best,p)=>distance(a,p)>distance(a,best)?p:best,a);
  const dx=far.x-a.x,dy=far.y-a.y,len=Math.hypot(dx,dy);
  const deviation=len?Math.max(...points.map(p=>Math.abs(dx*(p.y-a.y)-dy*(p.x-a.x))/len))/Math.max(diag,1e-6):0;
  // Count a shape structure, not any bend in a return move.
  let length=0;for(let i=1;i<points.length;i++)length+=distance(points[i-1],points[i]);
  const end=points.at(-1),bottom=b.maxY;
  const valley=b.height>0&&bottom-a.y>=b.height*.40&&bottom-end.y>=b.height*.40;
  let direction=0,extreme=a.x,reversals=0;
  const step=Math.max(.02,b.width*.18);
  for(const p of points){
    if(direction===0){if(Math.abs(p.x-extreme)>=step){direction=Math.sign(p.x-extreme);extreme=p.x;}}
    else if((p.x-extreme)*direction>0)extreme=p.x;
    else if((extreme-p.x)*direction>=step){direction=-direction;extreme=p.x;reversals++;}
  }
  const zigzag=reversals>=2&&Math.abs(end.y-a.y)>=b.height*.50;
  const loop=distance(a,end)<diag*.65&&length>diag*1.7;
  const corner=!loop&&!zigzag&&!valley&&Math.max(b.width,b.height)>=.10&&deviation>=.12
    ?matchExpelliarmus(resample(points),b,precisionScale):null;
  const motionForm=loop?'loop':zigzag?'zigzag':valley?'valley':corner?.gate==='ok'&&corner.distance<corner.limit?'spell_corner':'move';
  return {intent:Math.max(b.width,b.height)>=.10&&deviation>=.12&&motionForm!=='move',lineDeviation:+deviation.toFixed(4),motionForm};
}
export const DIFFICULTY_PROFILES=Object.freeze({easy:{limitFactor:1.35,captureMs:9000},normal:{limitFactor:1,captureMs:6000},hard:{limitFactor:.7,captureMs:3500}});
export function recognize(points,difficulty='normal'){
  const profile=DIFFICULTY_PROFILES[difficulty]||DIFFICULTY_PROFILES.normal;
  const b=points.length?bounds(points):{width:0,height:0};
  const diagnostics={samples:points.length,width:+b.width.toFixed(4),height:+b.height.toFixed(4),minSize:.10};
  const empty=(reason,cause)=>({accepted:false,shape:'None',score:0,margin:0,reason,cause,diagnostics});
  if(points.length<5)return empty('Too few points','too_few_points');
  if(Math.max(b.width,b.height)<.10)return empty('Draw a larger shape','too_small');
  const sample=resample(points);if(!sample.length)return empty('No movement','no_movement');
  const ratio=b.width/Math.max(b.height,1e-6),diag=Math.hypot(b.width,b.height);
  const closure=distance(points[0],points.at(-1))/diag;
  let winding=0;const center={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2};
  for(let i=1;i<sample.length;i++){let d=Math.atan2(sample[i].y-center.y,sample[i].x-center.x)-Math.atan2(sample[i-1].y-center.y,sample[i-1].x-center.x);while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;winding+=d;}
  const angles=sample.map(p=>Math.atan2(p.y-center.y,p.x-center.x)).sort((a,b)=>a-b);
  let maxAngularGap=angles[0]+2*Math.PI-angles.at(-1);
  for(let i=1;i<angles.length;i++)maxAngularGap=Math.max(maxAngularGap,angles[i]-angles[i-1]);
  const radii=sample.map(p=>distance(p,center)),meanRadius=radii.reduce((a,b)=>a+b,0)/radii.length;
  const radialSpread=Math.sqrt(radii.reduce((sum,r)=>sum+(r-meanRadius)**2,0)/radii.length)/Math.max(meanRadius,1e-6);
  const circle=matchCircle(points),turns=loopTurns(sample,b);
  Object.assign(diagnostics,turns);
  Object.assign(diagnostics,{circleMatcher:'$P',circleCoverage:Math.round((2*Math.PI-maxAngularGap)*180/Math.PI),circleTurns:+(Math.abs(winding)/(2*Math.PI)).toFixed(2),radialSpread:+radialSpread.toFixed(3),circleOtherDistance:+circle.otherDistance.toFixed(4),circleLimit:.12});
  const circleGate=ratio<.5||ratio>2?'aspect_ratio':Math.abs(winding)<4.7||maxAngularGap>Math.PI/3?'partial_loop':radialSpread>.35*profile.limitFactor?'uneven_loop':turns.circleIndent>.08&&turns.circleReverseTurn>45&&turns.pathReverseTurn>45?'inward_turn':circle.otherDistance+.02<circle.distance?'non_circle':'ok';
  const strokes=matchStrokes(sample,b,profile.limitFactor);
  // A broad arc has no distinct bottom turn. Allow a clear V with uneven arms.
  diagnostics.vCornerTurn=Math.round(strokes.V.cornerTurn||0);
  diagnostics.circleIndentLimit=.08;
  if(strokes.V.gate==='ok'&&diagnostics.circleCoverage<210&&diagnostics.vCornerTurn<45)strokes.V.gate='rounded_arc';
  const fits={Circle:{distance:circle.distance,gate:circleGate,limit:.12*profile.limitFactor},...strokes,Expelliarmus:matchExpelliarmus(sample,b,profile.limitFactor)};
  const matches=[];
  for(const [shape,fit] of Object.entries(fits)){
    const key=shape.toLowerCase();
    diagnostics[key+'Distance']=+fit.distance.toFixed(4);diagnostics[key+'Gate']=fit.gate;
    diagnostics[key+'Limit']=fit.limit;
    if(shape!=='Circle'){
      diagnostics[key+'Bend']=+fit.bend.toFixed(4);diagnostics[key+'Efficiency']=+fit.efficiency.toFixed(4);
    }
    if(fit.gate==='ok'&&fit.distance<fit.limit)matches.push(shape);
  }
  // Each method must pass its own limits. Never rank unrelated distance scales.
  const accepted=matches.length===1,shape=accepted?matches[0]:'None';
  const cause=accepted?'matched':matches.length>1?'ambiguous_shape':strokes.Z.gate==='z_orientation'?'z_orientation':circleGate==='inward_turn'?'inward_turn':'shape_distance';
  Object.assign(diagnostics,{strokeMatcher:'ordered_segments',zOrientation:strokes.Z.orientation||'unknown',zTrim:+(strokes.Z.trim||0).toFixed(3),circleCornerMargin:.02,matchCandidates:matches.join(',')||'None',closure:+closure.toFixed(3),winding:+winding.toFixed(3)});
  const score=accepted?Math.max(0,Math.round(100*(1-fits[shape].distance/(shape==='Circle'?.45:.15)))):0;
  return {accepted,shape,score,margin:0,cause,
    reason:accepted?'Shape accepted':cause==='z_orientation'?'Z is reversed. Follow the Z shown.':cause==='inward_turn'?'Loop turns inward. Draw a round loop.':matches.length>1?'Shape unclear. Draw one clear shape.':'No match. Follow one of the shapes shown.',diagnostics};
}

function movementDiagnostics(path,precisionScale=1){const {lineDeviation,motionForm}=movementIntent(path,precisionScale);return {lineDeviation,motionForm:motionForm||'move'};}

// All distances use image width. Holds use a time window, not a moving anchor.
const HOLD_MS=260,HOLD_SPAN=.025,START_SPAN=.045,MAX_GAP_MS=200;
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
export class GestureController{
  constructor(onEvent=()=>{},options={}){this.onEvent=onEvent;this.captureNo=0;this.setDifficulty(options.difficulty);this.reset();}
  setDifficulty(value){this.difficulty=Object.hasOwn(DIFFICULTY_PROFILES,value)?value:'normal';}
  reset(){
    this.state='waiting';this.path=[];this.intent=false;this.recent=[];this.raw=[];this.anchor=null;
    this.last=null;this.lastT=null;this.speed=0;this.startedAt=0;this.missingCause=null;
    this.gapCause='none';this.gaps=0;this.gapResumes=0;this.maxGapMs=0;this.gapDistance=0;this.gapAllowed=0;
    this.holdSpan=0;this.holdMs=0;this.startSpan=0;
    this.message='Hold your hand still briefly';
  }
  diagnostics(endRule,path=this.path){
    let pathLength=0;for(let i=1;i<path.length;i++)pathLength+=distance(path[i-1],path[i]);
    return {captureNo:this.captureNo,endRule,...movementDiagnostics(path,Math.max(1,DIFFICULTY_PROFILES[this.difficulty].limitFactor)),startSpan:+this.startSpan.toFixed(4),holdSpan:+this.holdSpan.toFixed(4),holdMs:Math.round(this.holdMs),gapCause:this.gapCause,gaps:this.gaps,gapResumes:this.gapResumes,maxGapMs:Math.ceil(this.maxGapMs),gapDistance:+this.gapDistance.toFixed(4),gapAllowed:+this.gapAllowed.toFixed(4),pathLength:+pathLength.toFixed(4)};
  }
  cancel(reason='Tracking lost',cause='tracking_lost'){
    if(this.state==='drawing'){
      const endRule=['camera_stopped','input_changed','too_long'].includes(cause)?'stop':'loss';
      this.onEvent({type:'cancel',reason,cause,path:this.path.slice(),duration:(this.lastT||0)-this.startedAt,
        diagnostics:{...this.diagnostics(endRule),stopCause:cause,shapeStarted:Number(this.intent)}});
    }
    this.reset();this.message=reason;
  }
  missing(t,reason='Hand not detected. Start again.',cause='no_hand'){
    if(!this.missingCause){this.gaps++;this.gapCause=cause;this.recent=[];this.raw=[];}
    this.missingCause=cause;this.message='Tracking gap. Keep your hand in view.';
    const gap=this.lastT===null?0:t-this.lastT;this.maxGapMs=Math.max(this.maxGapMs,gap);
    if(this.lastT===null||gap>MAX_GAP_MS)this.cancel(reason,cause);
  }
  finish(path,t,endRule){
    if(endRule==='timeout'&&!movementIntent(path,Math.max(1,DIFFICULTY_PROFILES[this.difficulty].limitFactor)).intent){this.cancel('No end pause. Start again.','too_long');return;}
    if(!movementIntent(path,Math.max(1,DIFFICULTY_PROFILES[this.difficulty].limitFactor)).intent){
      this.onEvent({type:'ignored',shape:'None',reason:'Repositioning move ignored',cause:'reposition',path,duration:Math.round(t-this.startedAt),latency:0,diagnostics:this.diagnostics(endRule,path)});
      this.reset();return;
    }
    const result=recognize(path,this.difficulty),timedOut=endRule==='timeout';
    this.onEvent({...result,accepted:timedOut?false:result.accepted,type:!timedOut&&result.accepted?'cast':'reject',
      ...(timedOut?{reason:'No end pause. Hold still after the shape.',cause:'too_long'}:{}),
      path,duration:Math.round((path.at(-1)?.t||t)-this.startedAt),latency:Math.round(t-(path.at(-1)?.t||t)),
      diagnostics:{...result.diagnostics,...this.diagnostics(endRule,path)}});
    const nextAnchor=this.recent.at(-1),last=this.last,raw=this.raw.slice();
    this.reset();
    if(result.accepted&&endRule==='pause'){
      // The end hold also prepares the next cast. Keep only a fresh start point.
      this.state='ready';this.anchor={...nextAnchor};this.recent=[{...nextAnchor}];
      this.raw=raw;this.last=last;this.lastT=t;
      this.message='Ready. Draw one shape.';
    }
  }
  update(p,t){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){this.missing(t);return;}
    const dt=this.lastT===null?0:t-this.lastT;let resumed=false;
    if(this.lastT!==null&&dt<=0){this.cancel('Camera time error. Start again.','frame_order');return;}
    if(this.last&&(this.missingCause||dt>100)){
      if(!this.missingCause){this.gaps++;this.gapCause='frame_gap';}
      this.maxGapMs=Math.max(this.maxGapMs,dt);
      this.gapDistance=distance(p,this.last);
      this.gapAllowed=Math.min(.28,Math.max(.08,.04+this.speed*dt/1000*1.8));
      if(dt>MAX_GAP_MS)this.cancel('Hand missing too long. Start again.','gap_duration');
      else if(this.gapDistance>this.gapAllowed)this.cancel('Hand position changed too far. Start again.','gap_motion');
      else{
        this.gapResumes++;resumed=true;this.missingCause=null;this.recent=[];this.raw=[];
        this.message=this.state==='drawing'?'Drawing. Hold still to cast.':'Hold your hand still briefly';
      }
    }
    if(!resumed&&this.last&&distance(p,this.last)>.24){this.cancel('Hand jumped. Start again.','point_jump');}
    if(this.last&&dt>0)this.speed=.5*this.speed+.5*distance(p,this.last)*1000/dt;
    this.last={...p};this.lastT=t;
    // A three-frame median removes isolated point noise without a long trailing path.
    this.raw.push(p);if(this.raw.length>3)this.raw.shift();
    const q={x:median(this.raw.map(v=>v.x)),y:median(this.raw.map(v=>v.y)),t};
    this.recent.push(q);
    while(this.recent.length>1&&this.recent[1].t<t-HOLD_MS)this.recent.shift();
    const box=bounds(this.recent);this.holdSpan=Math.max(box.width,box.height);this.holdMs=t-this.recent[0].t;
    const quiet=this.holdMs>=HOLD_MS&&this.holdSpan<=HOLD_SPAN;
    if(this.state==='waiting'){
      if(quiet){this.state='ready';this.anchor={...q};this.message='Ready. Draw one shape.';}
      return;
    }
    if(this.state==='ready'){
      if(quiet)this.anchor={...q};
      if(!this.anchor){this.anchor={...q};return;}
      if(distance(q,this.anchor)<START_SPAN||this.holdSpan<START_SPAN)return;
      this.state='drawing';this.captureNo++;this.startSpan=this.holdSpan;
      this.path=[{...this.anchor},...this.recent.filter(v=>v.t>this.anchor.t)];
      this.startedAt=this.path[0].t;this.message='Drawing. Hold still to cast.';
      // Keep the first straight segment, but do not count it as a spell attempt yet.
      return;
    }
    if(!this.path.length||distance(q,this.path.at(-1))>.0035)this.path.push(q);
    if(!this.intent&&movementIntent(this.path,Math.max(1,DIFFICULTY_PROFILES[this.difficulty].limitFactor)).intent){
      this.intent=true;this.onEvent({type:'capture',cause:'shape_start',reason:'Shape started',diagnostics:this.diagnostics('start')});
    }
    if(quiet){
      // Remove the final stationary tail, then use its centre as the endpoint.
      const endT=this.recent[0].t;
      const end={x:median(this.recent.map(v=>v.x)),y:median(this.recent.map(v=>v.y)),t:endT};
      const path=this.path.filter(v=>v.t<endT);path.push(end);
      this.finish(path,t,'pause');return;
    }
    if(t-this.startedAt>DIFFICULTY_PROFILES[this.difficulty].captureMs)this.finish(this.path.slice(),t,'timeout');
  }
}
