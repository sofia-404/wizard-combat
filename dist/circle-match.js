import {Point,PointCloud,GreedyCloudMatch} from './vendor/pdollar.js';
const cloud=points=>new PointCloud('',points.map(p=>new Point(p.x,p.y,1)));
const circles=[.7,.85,1,1.2,1.4].map(height=>cloud(Array.from({length:97},(_,i)=>({x:Math.cos(i/96*Math.PI*2),y:height*Math.sin(i/96*Math.PI*2)}))));
const otherShapes=[
  [[0,0],[1,0],[1,1],[0,1],[0,0]],
  [[0,0],[1,0],[1,.7],[0,.7],[0,0]],
  [[0,0],[.7,0],[.7,1],[0,1],[0,0]],
  [[.5,0],[1,1],[0,1],[.5,0]]
].map(pairs=>cloud(pairs.map(([x,y])=>({x,y}))));
otherShapes.push(cloud(Array.from({length:11},(_,i)=>({x:Math.cos(i*Math.PI/5)*(i%2?.5:1),y:Math.sin(i*Math.PI/5)*(i%2?.5:1)}))));

// $P matches unordered point clouds. Repeated loops need no loop slicing.
// Normalize its weighted sum to a mean distance for our diagnostics and score.
export function matchCircle(points){
  const candidate=cloud(points),weight=(candidate.Points.length+1)/2;
  const d=Math.min(...circles.map(ref=>GreedyCloudMatch(candidate.Points,ref)))/weight;
  const other=Math.min(...otherShapes.map(ref=>GreedyCloudMatch(candidate.Points,ref)))/weight;
  return {distance:d,otherDistance:other};
}
