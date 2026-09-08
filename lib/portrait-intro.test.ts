import assert from 'node:assert/strict';
import {portraitIntro,INTRO_DURATION} from './portrait-intro.ts';
import {STRIDE} from './particle-morph.ts';
const source=new Float32Array(100*STRIDE);
for(let i=0;i<100;i++)source.set([Math.sin(i)*.3,.4+i*.004,-.2,1,.8,.6,0,0,-1,0,0,0,0],i*STRIDE);
const out=source.slice();
for(const time of [0,900,1800,2800,3500,4800,6199]){
 portraitIntro(source,time,out);assert.ok(out.every(Number.isFinite));assert.equal(out.length,source.length);
 for(let k=0;k<source.length;k+=STRIDE)assert.deepEqual(out.slice(k+3,k+6),source.slice(k+3,k+6),'Camera movement retains each star colour and identity');
}
portraitIntro(source,INTRO_DURATION,out);assert.deepEqual(out,source,'Intro ends at the exact approved first pose');
const before=portraitIntro(source,INTRO_DURATION-1,out).slice();
assert.ok(before.every((v,i)=>Math.abs(v-source[i])<.00001),'No jump when the camera lands');
assert.throws(()=>portraitIntro(source,0,new Float32Array(2)));
console.log('Portrait camera: finite frames, constant identities and seamless final pose passed.');
