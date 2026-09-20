import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parseGlb, worldMesh } from '../../lib/fantasy/glb.mjs';
import { createPath } from '../../lib/fantasy/orbit.mjs';
import { introCamera } from '../../lib/fantasy/starlit-intro.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
const raw=fs.readFileSync('public/fantasy/source.glb');
const points=worldMesh(parseGlb(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength))).position;
const path=createPath(JSON.parse(fs.readFileSync('public/fantasy/camera-alignment.json')));
for (const [width,height] of [[1280,720],[390,844]]) {
 const cam=introCamera(path,{cameraWeights:[0,0,0,0,0,1]},width/height);
 const m=cameraFrame(cam,{width,height}).screenM;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let k=0;k<points.length;k+=3){
  const p=points.subarray(k,k+3),q=[0,1,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);
  minX=Math.min(minX,q[0]/q[2]);maxX=Math.max(maxX,q[0]/q[2]);minY=Math.min(minY,q[1]/q[2]);maxY=Math.max(maxY,q[1]/q[2]);
 }
 console.log({width,height,dist:cam.dist,boundsNDC:[minX,maxX,minY,maxY]});
 assert(minX>=-1 && maxX<=1 && minY>=-1 && maxY<=1,'full source bounds must fit');
}
