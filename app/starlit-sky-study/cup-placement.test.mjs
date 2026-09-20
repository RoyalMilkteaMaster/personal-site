import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseGlb,worldMesh} from '../../lib/fantasy/glb.mjs';
import { createPath } from '../../lib/fantasy/orbit.mjs';
import { introCamera } from '../../lib/fantasy/starlit-intro.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
import { cupStudyCamera,CUP_CENTER,CUP_SCALE } from './cup-placement.mjs';
import { openingStudyCamera } from './opening-camera.mjs';
const path=createPath(JSON.parse(fs.readFileSync('public/fantasy/camera-alignment.json')));
const raw=fs.readFileSync('work/starlit-implementation/visual-revision/cup-study/model-preview/milktea-points.bin');
const data=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
assert.equal(data.length/10,52185);
for(let k=0;k<data.length;k+=10){assert(Math.hypot(data[k],data[k+2])<=.396311);assert(data[k+1]>=-.481959&&data[k+1]<=.486567);}
const meshRaw=fs.readFileSync('public/fantasy/source.glb'),mesh=worldMesh(parseGlb(meshRaw.buffer.slice(meshRaw.byteOffset,meshRaw.byteOffset+meshRaw.byteLength))),body=Array.from(mesh.position);
for(const name of ['surface-stars.f32','reference-stars.f32']){const raw=fs.readFileSync('public/fantasy/'+name),points=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);for(let i=0;i<points.length;i+=8)body.push(points[i],points[i+1],points[i+2]);}
for(const [width,height] of [[1280,720],[1000,790],[390,844]]) for(const sample of [0,1,2,4,5,...Array.from({length:101},(_,i)=>[0,1,i/100]),...Array.from({length:101},(_,i)=>[1,2,i/100])]){
 const step=typeof sample==='number'?sample:-1;
 const weights=Array.from({length:6},(_,i)=>Number(i===step));
 if(Array.isArray(sample)){weights[sample[0]]=1-sample[2];weights[sample[1]]=sample[2];}
 const cam=openingStudyCamera(cupStudyCamera(path,{cameraWeights:weights},width/height),weights[0],0);
 const m=cameraFrame(cam,{width,height}).screenM;
 if(step===5){const baseline=introCamera(path,{cameraWeights:weights},width/height);for(const key of ['dist','el','roll','fov','frameScaleY'])assert.deepEqual(cam[key],baseline[key]);assert.deepEqual(cam.target,[baseline.target[0],baseline.target[1]+.14+.43*Math.max(0,Math.min(1,(.8-width/height)/.34)),baseline.target[2]]);assert(Math.abs((cam.az-baseline.az)%360)<1e-9);}
 const box=[Infinity,-Infinity,Infinity,-Infinity];
 // Full yaw sweep is bounded by this cylinder, including straw/ears/tail/charms.
 for(let j=0;j<360;j++) for(const y of [-.481958,.486566]) {
  const a=j*Math.PI/180,p=[Math.cos(a)*.396311*CUP_SCALE+CUP_CENTER[0],y*CUP_SCALE+CUP_CENTER[1],Math.sin(a)*.396311*CUP_SCALE+CUP_CENTER[2]];
  const q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);
  const x=q[0]/q[2],yy=q[1]/q[2];box[0]=Math.min(box[0],x);box[1]=Math.max(box[1],x);box[2]=Math.min(box[2],yy);box[3]=Math.max(box[3],yy);
 }
 if(step>=0)console.log({width,height,step,box});
 const outside=[0,1,2].some(axis=>[-1,1].some(sign=>{
  const plane=[0,1,2,3].map(i=>m[i*4+3]+sign*m[i*4+axis]);
  const maximum=plane[0]*CUP_CENTER[0]+plane[1]*CUP_CENTER[1]+plane[2]*CUP_CENTER[2]+plane[3]+.396311*CUP_SCALE*Math.hypot(plane[0],plane[2])+Math.max(plane[1]*-.481958*CUP_SCALE,plane[1]*.486566*CUP_SCALE);
  return maximum<0;
 }));
 if(step<3)assert(outside,'early entire sweep outside '+JSON.stringify({width,height,sample,box}));
 if(step===4||(step===5&&width/height>.8))assert(box[0]>-1&&box[1]<1&&box[2]>-1&&box[3]<1,'cup sweep fully framed in cup/full view');
 if(step===4||step===5){
  const bounds=[Infinity,-Infinity,Infinity,-Infinity];let maxDepth=-Infinity;
  for(let i=0;i<body.length;i+=3){const p=body.slice(i,i+3),q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);maxDepth=Math.max(maxDepth,q[2]);bounds[0]=Math.min(bounds[0],q[0]/q[2]);bounds[1]=Math.max(bounds[1],q[0]/q[2]);bounds[2]=Math.min(bounds[2],q[1]/q[2]);bounds[3]=Math.max(bounds[3],q[1]/q[2]);}
  console.log({width,height,step,bodyBounds:bounds,maxBodyDepth:maxDepth});
  if(step===4){let inside=0;for(let i=0;i<body.length;i+=3){const p=body.slice(i,i+3),q=[0,1,2,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);if(q[3]>.02&&[0,1,2].every(j=>Math.abs(q[j])<=q[3]))inside++;}const clips=[];for(let k=0;k<mesh.position.length;k+=3){const p=mesh.position.subarray(k,k+3);clips.push([0,1,2,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]));}
 let potentialTriangles=0;for(let k=0;k<mesh.index.length;k+=3){const tri=[clips[mesh.index[k]],clips[mesh.index[k+1]],clips[mesh.index[k+2]]];if(![0,1,2].some(axis=>[-1,1].some(sign=>tri.every(q=>q[3]+sign*q[axis]<0))))potentialTriangles++;}
 console.log({inside,potentialTriangles});assert.equal(inside,0,'body source points outside cup view');assert.equal(potentialTriangles,0,'all body triangles rejected by a frustum plane');}
  else {assert(bounds[0]>-1&&bounds[1]<1&&bounds[3]<1,'full body width and head visible; lower cut intentionally cropped');let overlap=0,maxCut=-Infinity;for(let i=0;i<body.length;i+=3){const p=body.slice(i,i+3),q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]),x=q[0]/q[2],y=q[1]/q[2];if(p[1]<.025)maxCut=Math.max(maxCut,y);if(x>=box[0]&&x<=box[1]&&y>=box[2]&&y<=box[3])overlap++;}console.log({overlapBodyPointsInCupBox:overlap,maxCutBandNDC:maxCut});assert(maxCut<-1,'entire 0-.025 source cut band below viewport');if(width/height>.8){assert.equal(overlap,0);assert(bounds[0]-box[1]>(box[1]-box[0])*.5,'at least half-cup-width gap from body bounds');}}

 }
}
