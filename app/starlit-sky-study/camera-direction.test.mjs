import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createPath } from '../../lib/fantasy/orbit.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
import { cupStudyCamera } from './cup-placement.mjs';
const path=createPath(JSON.parse(fs.readFileSync('public/fantasy/camera-alignment.json')));
const canvas={width:1280,height:720},aspect=1280/720;
const x=(p,c)=>{const m=cameraFrame(c,canvas).screenM;return (m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/(m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]);};
// At the front, +az moves a forward-facing landmark left, matching the top of
// the sky's +Z positive orbit (counterclockwise in the displayed image).
const front={target:[0,0,0],az:0,el:0,dist:1,fov:28};
assert(x([0,.1,.1],{...front,az:1})<x([0,.1,.1],front));
assert(-Math.sin(.025)<0);
for(const [from,to] of [[1,2],[2,3],[3,4],[4,5],[2,4]]){
 let previous=-Infinity;
 for(let n=0;n<=100;n++){
  const weights=Array(6).fill(0);weights[from]=1-n/100;weights[to]+=n/100;
  const c=cupStudyCamera(path,{cameraWeights:weights},aspect);
  assert(c.az>=previous-1e-9);previous=c.az;
  assert([...c.target,c.az,c.dist,c.fov].every(Number.isFinite));
 }
 console.log({from,to,finalAz:previous});
}
console.log('Main forward orbits increase az; reverse reading traverses the same weights backwards. Opening keeps the short dolly framing correction.');
