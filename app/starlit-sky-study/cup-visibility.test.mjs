import assert from 'node:assert/strict';
import fs from 'node:fs';
import {studyCupIntersectsView} from './cup-renderer.mjs';
import {brandSkyCamera} from './brand-sky.mjs';
import {cameraFrame} from '../../lib/fantasy/camera.mjs';
import {createPath} from '../../lib/fantasy/orbit.mjs';
import {CUP_CENTER,CUP_SCALE} from './cup-placement.mjs';
const path=createPath(JSON.parse(fs.readFileSync('public/fantasy/camera-alignment.json')));
const bytes=fs.readFileSync('public/fantasy/milktea-12/points.bin');
const data=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
for(let i=0;i<data.length;i+=10){assert(Math.hypot(data[i],data[i+2])<.40);assert(Math.abs(data[i+1])<.49);}
for(const [width,height,visible] of [[1440,900,true],[390,844,false],[768,1024,false]]){
 const camera=brandSkyCamera(path,{cameraWeights:[0,0,0,0,0,1]},width/height),m=cameraFrame(camera,{width,height}).screenM;
 // 獨立逐點投影12個角度，而非複製保守包絡算法。
 let pixels=0;const box=[Infinity,-Infinity,Infinity,-Infinity];
 for(let a=0;a<Math.PI*2;a+=Math.PI/6)for(let i=0;i<data.length;i+=10){
  const p=[CUP_CENTER[0]+CUP_SCALE*(Math.cos(a)*data[i]+Math.sin(a)*data[i+2]),CUP_CENTER[1]+CUP_SCALE*data[i+1],CUP_CENTER[2]+CUP_SCALE*(-Math.sin(a)*data[i]+Math.cos(a)*data[i+2])];
  const q=[0,1,2,3].map(r=>m[r]*p[0]+m[r+4]*p[1]+m[r+8]*p[2]+m[r+12]);
  const x=q[0]/q[3],y=q[1]/q[3];box[0]=Math.min(box[0],x);box[1]=Math.max(box[1],x);box[2]=Math.min(box[2],y);box[3]=Math.max(box[3],y);
  if(q[3]>0&&q.slice(0,3).every(v=>Math.abs(v)<=q[3]))pixels++;
 }
 assert.equal(pixels>0,visible,'Spec允許手機結尾杯在畫外；不修改相機來迎合測試');
 assert.equal(studyCupIntersectsView(m),visible,'skip fully offscreen cup with shipping camera');
 console.log({width,height,visible,pixels,box});
}
console.log('shipping camera: desktop cup visible; portrait intentionally outside; culling agrees');
