// Fit ordered strokes to the resampled path. Stroke lengths can differ.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function fitStrokes(points,bounds){
  const n=points.length,diag=Math.hypot(bounds.width,bounds.height),cache=new Map();
  const segment=(a,b)=>{
    const key=a*n+b;if(cache.has(key))return cache.get(key);
    const start=points[a],end=points[b],dx=end.x-start.x,dy=end.y-start.y,len=distance(start,end);
    let length=0,sum=0,max=0;
    for(let i=a;i<=b;i++){
      if(i>a)length+=distance(points[i-1],points[i]);
      const t=len?Math.max(0,Math.min(1,((points[i].x-start.x)*dx+(points[i].y-start.y)*dy)/(len*len))):0;
      const d=distance(points[i],{x:start.x+t*dx,y:start.y+t*dy});sum+=d;max=Math.max(max,d);
    }
    const fit={dx,dy,error:sum/(b-a+1)/diag,bend:max/Math.max(len,1e-6),efficiency:len/Math.max(length,1e-6)};
    cache.set(key,fit);return fit;
  };
  const result=(parts,shape)=>{
    const error=parts.reduce((s,p)=>s+p.error,0)/parts.length;
    const bend=Math.max(...parts.map(p=>p.bend)),efficiency=Math.min(...parts.map(p=>p.efficiency));
    return {distance:error,gate:bend>.23||efficiency<(shape==='V'?.85:.75)?'curved_strokes':'ok',bend,efficiency,limit:shape==='V'?.065:.045};
  };
  const missing=gate=>({distance:1,gate,bend:0,efficiency:0,limit:.045});
  let v=missing('v_strokes'),z=missing('z_strokes');
  const low=points.flatMap((p,i)=>p.y>=bounds.maxY-bounds.height*.05?[i]:[]);
  for(const bottom of low){
    if(bottom<5||bottom>=n-5)continue;
    const a=segment(0,bottom),b=segment(bottom,n-1);
    if(a.dy>=bounds.height*.40&&b.dy<=-bounds.height*.40&&a.dx*b.dx>0&&
      Math.min(Math.abs(a.dx),Math.abs(b.dx))>=bounds.width*.08){
      const candidate=result([a,b],'V');
      // Local direction change at the bottom, independent of the bounding-box centre.
      const reach=Math.min(8,bottom,n-1-bottom),p=points[bottom],before=points[bottom-reach],after=points[bottom+reach];
      const ux=p.x-before.x,uy=p.y-before.y,vx=after.x-p.x,vy=after.y-p.y;
      candidate.cornerTurn=Math.abs(Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy))*180/Math.PI;
      if((candidate.gate==='ok'&&v.gate!=='ok')||(candidate.gate===v.gate&&candidate.distance<v.distance)||v.gate==='v_strokes')v=candidate;
    }
  }
  // Two horizontal strokes, joined by a diagonal in the opposite direction.
  // Match the displayed Z: the diagonal slopes up to the right.
  // Reversing point order is allowed; reflecting either axis is not.
  for(let i=5;i<n-10;i++)for(let j=i+5;j<n-5;j++){
    const a=segment(0,i),b=segment(i,j),c=segment(j,n-1);
    if(a.dx*c.dx<=0||a.dx*b.dx>=0||
      Math.min(Math.abs(a.dx),Math.abs(c.dx))<bounds.width*.18||Math.abs(b.dx)<bounds.width*.35||
      Math.max(Math.abs(a.dy),Math.abs(c.dy))>bounds.height*.35||Math.abs(b.dy)<bounds.height*.60||
      Math.abs(points.at(-1).y-points[0].y)<bounds.height*.65)continue;
    const candidate=result([a,b,c],'Z');
    candidate.orientation=b.dx*b.dy<0?'normal':'reflected';
    if(candidate.orientation==='reflected'&&candidate.gate==='ok')candidate.gate='z_orientation';
    const rank=gate=>({ok:0,z_orientation:1,curved_strokes:2,z_strokes:3})[gate];
    if(rank(candidate.gate)<rank(z.gate)||(candidate.gate===z.gate&&candidate.distance<z.distance))z=candidate;
  }
  return {V:v,Z:z};
}

export function matchStrokes(points,bounds){
  const fit=fitStrokes(points,bounds);
  fit.Z.trim=0;
  if((fit.Z.gate==='ok'||fit.Z.gate==='z_orientation')&&fit.Z.distance<fit.Z.limit)return fit;
  for(const trim of [3,6,9])for(const end of ['start','end']){
    const part=end==='start'?points.slice(trim):points.slice(0,-trim);
    const candidate=fitStrokes(part,bounds).Z;
    if(candidate.gate==='ok'&&candidate.distance<candidate.limit){
      fit.Z={...candidate,trim:trim/(points.length-1)};return fit;
    }
  }
  return fit;
}
