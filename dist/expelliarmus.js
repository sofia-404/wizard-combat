// Spell path: right, then down in screen coordinates.
// Keep this fit separate from the existing O/V/Z limits.
export function matchExpelliarmus(points,b,precisionScale=1){
  const missing={distance:1,gate:'ordered_corner',bend:0,efficiency:0,limit:.045*precisionScale};
  const n=points.length,diag=Math.hypot(b.width,b.height);
  if(n<12||Math.min(b.width,b.height)<.05||b.width/b.height<.4||b.width/b.height>2.5)return missing;
  const segment=(start,end)=>{
    const a=points[start],z=points[end],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);
    let sum=0,max=0,length=0;
    for(let i=start;i<=end;i++){
      const p=points[i];
      if(i>start)length+=Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y);
      const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len))):0;
      const d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);sum+=d;max=Math.max(max,d);
    }
    return {dx,dy,error:sum/(end-start+1)/diag,bend:max/Math.max(len,1e-6),efficiency:len/Math.max(length,1e-6)};
  };
  let best=missing;
  for(let i=5;i<n-5;i++){
    const a=segment(0,i),z=segment(i,n-1);
    if(a.dx<b.width*.75||Math.abs(a.dy)>b.height*.2||z.dy<b.height*.75||Math.abs(z.dx)>b.width*.2)continue;
    const reach=Math.min(8,i,n-1-i),p=points[i],before=points[i-reach],after=points[i+reach];
    const ux=p.x-before.x,uy=p.y-before.y,vx=after.x-p.x,vy=after.y-p.y;
    const turn=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy)*180/Math.PI;
    const bend=Math.max(a.bend,z.bend),efficiency=Math.min(a.efficiency,z.efficiency);
    const gate=turn<55?'rounded_corner':bend>.18*precisionScale||efficiency<1-(1-.88)*precisionScale?'curved_strokes':'ok';
    const candidate={distance:(a.error+z.error)/2,gate,bend,efficiency,limit:.045*precisionScale};
    if((gate==='ok'&&best.gate!=='ok')||(gate===best.gate&&candidate.distance<best.distance)||best===missing)best=candidate;
  }
  return best;
}
