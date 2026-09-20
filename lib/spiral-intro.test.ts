import assert from 'node:assert/strict';
import {spiralCameraPoint,spiralCameraOffset,spiralTransition,rearShoulderShot} from './spiral-intro.ts';
import {STRIDE} from './particle-morph.ts';

const front=new Float32Array([1,.1,.2,1,1,1,0,0,-1,0,0,0,-1, .2,.4,-.1,.7,.6,.8,0,0,-1,0,0,0,0, .3,-.4,0,1,.6,.2,0,0,-1,.3,-.4,0,1]);
const pixels=new Uint8ClampedArray(12*10*4);
for(let i=0;i<pixels.length;i+=4)pixels.set([80,50,130,255],i);
const rear=rearShoulderShot(front,{data:pixels,width:12,height:10} as ImageData);
assert.equal(rear.length,front.length);
assert.deepEqual(rear.slice(STRIDE*2),front.slice(STRIDE*2),'Rear sampling must not alter held objects');
assert.equal(rear[0],-front[0]);assert.equal(rear[2],-front[2]);
for(const leg of [0,1] as const){
 const from=leg?rear:front,to=leg?front:rear,out=front.slice();
 assert.deepEqual(spiralTransition(from,to,0,leg,out),from);
 assert.deepEqual(spiralTransition(from,to,1,leg,out),to);
 for(let frame=0;frame<=24;frame++)assert.ok(spiralTransition(from,to,frame/24,leg,out).every(Number.isFinite));
 for(const t of [0,1])assert.ok(Math.hypot(...Object.values(spiralCameraOffset(leg,t)))<1e-12);
 // Positive angular motion in x/z on each leg, including the second departure.
 spiralTransition(from,to,.01,leg,out);
 assert.ok(from[2]*out[0]-from[0]*out[2]>0,'Both sky turns continue in the same direction');
}
for(let t=.01;t<=2;t+=.01){
 const previous=spiralCameraPoint(t-.01),current=spiralCameraPoint(t);
 assert.ok(current.radius>previous.radius,'Camera spiral expands outward');
 assert.ok(current.angle<previous.angle,'Camera spiral never reverses');
}
console.log('Spiral intro: endpoints, same-direction arcs, fixed point count and prop preservation pass');
