const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const median3=(a,b,c)=>[a,b,c].sort((x,y)=>x-y)[1];

// Follow the outer loop so a short start tail or repeated lap does not make a notch.
// A broad inward turn is evidence of another shape, independent of its name.
export function loopTurns(points,bounds){
  const count=48,centre={x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2};
  const diag=Math.hypot(bounds.width,bounds.height),radii=[];
  // Preserve an inward start/end turn across a small closure gap.
  const closed=Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<diag*.25;
  const outlinePath=closed?[...points,points[0]]:points;
  for(let i=0;i<count;i++){
    const angle=i*2*Math.PI/count,ray={x:Math.cos(angle),y:Math.sin(angle)};
    let radius=0;
    for(let j=1;j<outlinePath.length;j++){
      const a=sub(outlinePath[j-1],centre),edge=sub(outlinePath[j],outlinePath[j-1]),den=cross(ray,edge);
      if(Math.abs(den)<1e-10)continue;
      const r=cross(a,edge)/den,t=cross(a,ray)/den;
      if(r>0&&t>=0&&t<=1)radius=Math.max(radius,r);
    }
    radii.push(radius);
  }
  if(radii.filter(r=>r>0).length<count/2)return {circleIndent:0,circleReverseTurn:0};
  // Interpolate a missing arc. Do not turn an allowed closure gap into a notch.
  const filled=radii.map((r,i)=>{
    if(r)return r;
    let left=1,right=1;
    while(!radii[(i-left+count)%count])left++;
    while(!radii[(i+right)%count])right++;
    return (radii[(i-left+count)%count]*right+radii[(i+right)%count]*left)/(left+right);
  });
  const outline=filled.map((r,i)=>{
    const smooth=median3(filled[(i+count-1)%count],r,filled[(i+1)%count]),angle=i*2*Math.PI/count;
    return {x:Math.cos(angle)*smooth,y:Math.sin(angle)*smooth};
  });
  const sorted=[...outline].sort((a,b)=>a.x-b.x||a.y-b.y);
  const half=list=>{
    const hull=[];
    for(const p of list){while(hull.length>1&&cross(sub(hull.at(-1),hull.at(-2)),sub(p,hull.at(-1)))<=0)hull.pop();hull.push(p);}
    return hull.slice(0,-1);
  };
  const hull=[...half(sorted),...half([...sorted].reverse())];
  let indent=0,reverseTurn=0;
  for(let i=0;i<count;i++){
    const p=outline[i],a=sub(p,outline[(i+count-1)%count]),b=sub(outline[(i+1)%count],p);
    const turn=Math.atan2(cross(a,b),a.x*b.x+a.y*b.y);
    // Small point errors alone must not reject a loop.
    let depth=Infinity;
    for(let j=0;j<hull.length;j++){
      const start=hull[j],edge=sub(hull[(j+1)%hull.length],start),q=sub(p,start);
      const t=Math.max(0,Math.min(1,(q.x*edge.x+q.y*edge.y)/(edge.x**2+edge.y**2||1)));
      depth=Math.min(depth,Math.hypot(q.x-t*edge.x,q.y-t*edge.y)/diag);
    }
    indent=Math.max(indent,depth);
    if(depth>.04&&turn<0)reverseTurn-=turn;
  }
  // Confirm the notch in the drawn order. An open spiral can make a radial
  // step without a real inward turn in the player's path.
  const turns=[],n=points.length,reach=3;
  for(let i=closed?0:reach;i<(closed?n:n-reach);i++){
    const a=sub(points[i],points[(i-reach+n)%n]),b=sub(points[(i+reach)%n],points[i]);
    turns.push(Math.atan2(cross(a,b),a.x*b.x+a.y*b.y));
  }
  const sign=Math.sign(turns.reduce((a,b)=>a+b,0));
  const pathReverse=Math.max(0,...turns.map(t=>-t*sign))*180/Math.PI;
  return {circleIndent:+indent.toFixed(4),circleReverseTurn:Math.round(reverseTurn*180/Math.PI),pathReverseTurn:Math.round(pathReverse)};
}
