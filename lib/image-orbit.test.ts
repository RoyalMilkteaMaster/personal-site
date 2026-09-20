import assert from 'node:assert/strict';
import {imageOrbit,imageOrbitFrames} from './image-orbit.ts';
import {STRIDE,ease} from './particle-morph.ts';

// A coloured silhouette, one prop and one sky star exercise the real sampler
// and correspondence builder without depending on a browser canvas.
const size=32,data=new Uint8ClampedArray(size*size*4).fill(255);
for(let y=3;y<30;y++)for(let x=8;x<24;x++)data.set([80,50+y,130,255],(y*size+x)*4);
const view={data,width:size,height:size} as ImageData;
const front=new Float32Array(82*STRIDE);
for(let i=0;i<80;i++)front.set([(i%8-4)*.12,.7-Math.floor(i/8)*.1,0,.5,.3,.8,0,0,-1,0,0,0,0],i*STRIDE);
front.set([.4,-2,.1,1,.8,.2,0,0,-1,.4,-2,.1,2],80*STRIDE);
front.set([1,.5,.4,.7,.7,1,0,0,0,0,0,0,-1],81*STRIDE);
const copy=front.slice();
const frames=imageOrbitFrames(front,Array(5).fill(view)),out=front.slice();
assert.deepEqual(front,copy,'Preparing views never edits the original pose');
assert.equal(frames.length,6);
for(const frame of frames){
 assert.equal(frame.length,front.length,'Every view retains the complete particle pool');
 assert.ok(frame.every(Number.isFinite));
 assert.deepEqual(frame.slice(80*STRIDE,81*STRIDE),front.slice(80*STRIDE,81*STRIDE),'Hidden prop remains the same object');
}
assert.deepEqual(imageOrbit(frames,0,out),front);
assert.deepEqual(imageOrbit(frames,1,out),frames[5]);
for(let n=0;n<=120;n++){
 imageOrbit(frames,n/120,out);
 assert.ok(out.every(Number.isFinite));
 assert.deepEqual(out.slice(80*STRIDE,81*STRIDE),front.slice(80*STRIDE,81*STRIDE));
}
// Invert the timing curve and inspect both sides of every image boundary.
for(const angle of [.15,.32,.54,.76,1]){
 let lo=0,hi=1;for(let n=0;n<32;n++){const mid=(lo+hi)/2;if(ease(mid)<angle)lo=mid;else hi=mid;}
 const t=(lo+hi)/2,left=imageOrbit(frames,t-1e-6,out).slice(),right=imageOrbit(frames,t+1e-6,out).slice();
 assert.ok(left.every((v,i)=>Math.abs(v-right[i])<.001),'No jump at a view boundary, including the sky endpoint');
}
assert.throws(()=>imageOrbitFrames(front,[view]));
assert.throws(()=>imageOrbit(frames,.5,new Float32Array(1)));
assert.deepEqual(front,copy);
// Region boundaries are structural: collar stars cannot migrate into hair.
for(let k=0;k<80*STRIDE;k+=STRIDE){
 const band=Math.floor((.925-front[k+1])/1.818*8);
 for(const frame of frames){
  assert.equal(Math.floor((.925-frame[k+1])/1.818*8),band);
  assert.equal(frame[k+1],front[k+1],'Turning the view must not make the head bob');
 }
 for(let j=k+STRIDE;j<80*STRIDE;j+=STRIDE){
  if(front[k+1]!==front[j+1]||front[k]>front[j])continue;
  for(const frame of frames)assert.ok(frame[k]<=frame[j],'Neighbouring stars must keep their left/right order');
 }
}
// Continuity of position alone missed the previous jerks. Test velocity too,
// including a trajectory whose direction reverses at an intermediate view.
const trajectory=[0,.2,.15,.4,.35,.45].map(x=>new Float32Array([x,.1,0,1,1,1,0,0,-1,0,0,0,0]));
const point=new Float32Array(STRIDE);
for(const angle of [.15,.32,.54,.76]){
 let lo=0,hi=1;for(let n=0;n<32;n++){const mid=(lo+hi)/2;if(ease(mid)<angle)lo=mid;else hi=mid;}
 const t=(lo+hi)/2,dt=.0001;
 const left=imageOrbit(trajectory,t-dt,point)[0],center=imageOrbit(trajectory,t,point)[0],right=imageOrbit(trajectory,t+dt,point)[0];
 assert.ok(Math.abs((center-left)/dt-(right-center)/dt)<.02,'Star velocity must not snap at a view boundary');
}
console.log('Image orbit: real sampling, fixed pool, prop preservation, finite frames and continuous boundaries passed.');
