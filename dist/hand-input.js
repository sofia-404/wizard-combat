const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const meanDistance=(a,b)=>a.reduce((sum,p,i)=>sum+distance(p,b[i]),0)/a.length;
const palmPoints=points=>[0,5,9,13,17].map(i=>points[i]);
const controlPoint=(points,mode)=>mode==='grip'?{x:(points[5].x+points[9].x)/2,y:(points[5].y+points[9].y)/2}:points[8];

export class HandInput {
  constructor(){this.reset();}
  reset(){this.palm=null;this.point=null;this.velocity={x:0,y:0};this.pointVelocity={x:0,y:0};this.lastT=null;this.labelT=null;}
  select(data,hand,mode='tip'){
    const dt=this.lastT===null?0:data.t-this.lastT;
    const locked=this.palm&&dt>0&&dt<=260;
    const predicted=locked?{x:this.palm.x+this.velocity.x*dt,y:this.palm.y+this.velocity.y*dt}:null;
    const predictedPoint=locked?{x:this.point.x+this.pointVelocity.x*dt,y:this.point.y+this.pointVelocity.y*dt}:null;
    const candidates=(data.landmarks||[]).map((points,i)=>{
      const info=data.handedness?.[i]?.[0];
      const label=info?.categoryName||'?';
      const valid=points.length===21&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      const palm=valid?{x:(points[0].x+points[5].x+points[9].x+points[17].x)/4,y:(points[0].y+points[5].y+points[9].y+points[17].y)/4}:null;
      const size=valid?Math.max(.04,distance(points[5],points[17]),distance(points[0],points[9])):0;
      const point=valid?controlPoint(points,mode):null;
      const cost=locked&&valid?distance(palm,predicted)+distance(point,predictedPoint):0;
      return {points,label,confidence:info?.score||0,palm,point,size,cost};
    });
    const detail={detected:candidates.map(c=>c.label).join(',')||'None',handCount:candidates.length,labelConfidence:Math.max(0,...candidates.map(c=>c.confidence)),duplicateHands:0,uniqueHands:0,candidateSeparation:0,duplicatePalmDistance:0,duplicatePointDistance:0,selectedPalmError:0,selectedPointError:0,selectionRule:locked?'motion':'label'};
    const fail=cause=>({cause,...detail});
    if(!candidates.length)return fail('no_hand');
    // Two similar landmark sets with the same label represent one candidate.
    // Keep the candidate closest to the current motion, or the strongest label at acquisition.
    const sorted=candidates.filter(c=>c.palm).sort((a,b)=>locked?a.cost-b.cost:b.confidence-a.confidence);
    const valid=[];
    for(const candidate of sorted){
      // Finger estimates can differ on one physical hand. Compare the palm skeleton.
      const duplicate=valid.find(other=>candidate.label===other.label&&
        Math.min(candidate.size,other.size)/Math.max(candidate.size,other.size)>.65&&
        meanDistance(palmPoints(candidate.points),palmPoints(other.points))<Math.min(candidate.size,other.size)*.45);
      if(duplicate){
        detail.duplicateHands++;
        detail.duplicatePalmDistance=+distance(candidate.palm,duplicate.palm).toFixed(4);
        detail.duplicatePointDistance=+distance(candidate.point,duplicate.point).toFixed(4);
      }else valid.push(candidate);
    }
    detail.uniqueHands=valid.length;
    if(!valid.length)return fail('invalid_points');
    let chosen;
    if(locked){
      const near=valid.map(c=>({...c,d:c.cost})).sort((a,b)=>a.d-b.d);
      if(distance(near[0].palm,this.palm)>Math.min(.35,.12+dt*.0012))return fail('hand_jump');
      if(near[1]){
        detail.candidateSeparation=+distance(near[0].palm,near[1].palm).toFixed(4);
        if(near[1].d-near[0].d<.025)return fail('hands_overlap');
      }
      chosen=near[0];detail.labelConfidence=chosen.confidence;
      if(chosen.label!==hand&&data.t-this.labelT>250)return fail('wrong_hand');
    }else{
      const matches=valid.filter(c=>c.label===hand);
      if(!matches.length)return fail('wrong_hand');
      if(matches.length>1)return fail('hands_overlap');
      chosen=matches[0];
    }
    detail.selectedPalmError=locked?+distance(chosen.palm,predicted).toFixed(4):0;
    detail.selectedPointError=locked?+distance(chosen.point,predictedPoint).toFixed(4):0;
    this.velocity=locked?{x:(chosen.palm.x-this.palm.x)/dt,y:(chosen.palm.y-this.palm.y)/dt}:{x:0,y:0};
    this.pointVelocity=locked?{x:(chosen.point.x-this.point.x)/dt,y:(chosen.point.y-this.point.y)/dt}:{x:0,y:0};
    this.palm=chosen.palm;this.point=chosen.point;this.lastT=data.t;
    if(chosen.label===hand)this.labelT=data.t;
    return {...detail,points:chosen.points,labelConfidence:chosen.confidence,cause:chosen.label===hand?'tracked':'label_hold'};
  }
}
