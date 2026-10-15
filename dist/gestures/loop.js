import {matchCircle} from './circle-cloud.js';
import {loopTurns} from './path-turns.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// Difficulty scales distance and radial variation; direction gates stay fixed.
export function matchLoop({points,sample,b,diagnostics,precisionScale=1}){
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
  const gate=ratio<.5||ratio>2?'aspect_ratio':Math.abs(winding)<4.7||maxAngularGap>Math.PI/3?'partial_loop':radialSpread>.35*precisionScale?'uneven_loop':turns.circleIndent>.08&&turns.circleReverseTurn>45&&turns.pathReverseTurn>45?'inward_turn':circle.otherDistance+.02<circle.distance?'non_circle':'ok';
  Object.assign(diagnostics,{circleIndentLimit:.08,circleCornerMargin:.02,closure:+closure.toFixed(3),winding:+winding.toFixed(3)});
  return {distance:circle.distance,gate,limit:.12*precisionScale};
}
