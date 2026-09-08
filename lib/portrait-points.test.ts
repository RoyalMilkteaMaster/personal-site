import assert from 'node:assert/strict';
import {backgroundMask,portraitPoints} from './portrait-points.ts';
import {rotateHeldObjects,STRIDE} from './particle-morph.ts';
import {heldObjectPoints} from './held-object-points.ts';

// Neutral checker outside, purple silhouette enclosing a white object highlight.
const width=9,pixels=new Uint8ClampedArray(width*width*4);
for(let y=0;y<width;y++)for(let x=0;x<width;x++){
 const inside=x>=2&&x<=6&&y>=2&&y<=6;
 const colour=inside?[70,35,150,255]:[200,200,200,255];
 pixels.set(colour,(y*width+x)*4);
}
pixels.set([255,255,255,255],(4*width+4)*4);
const mask=backgroundMask(pixels,width,width);
assert.equal(mask[0],1);assert.equal(mask[4*width+4],0);
assert.equal(mask.reduce((a,b)=>a+b,0),56);
const withSliver=pixels.slice();withSliver.set([70,35,150,255],4*width*4);
assert.equal(backgroundMask(withSliver,width,width)[4*width],1,'Remove isolated neighbouring-pose slivers at crop edges');
const points=portraitPoints(pixels,width,width,400);
assert.equal(points.length,400*STRIDE);assert.ok(points.every(Number.isFinite));
assert.ok(Array.from({length:400},(_,i)=>points[i*STRIDE+3]).some(r=>r===1),'Preserve the white object core');
assert.ok(Array.from({length:400},(_,i)=>Math.abs(points[i*STRIDE])).every(x=>x<.34),'No checker geometry');
assert.ok(Array.from({length:400},(_,i)=>Math.hypot(...points.slice(i*STRIDE+6,i*STRIDE+9))).every(n=>Math.abs(n-1)<.001),'Unit surface normals for dynamic lighting');
for(const pose of [0,1,2]){
 const body=portraitPoints(pixels,width,width,2000,pose),object=heldObjectPoints(2000,pose);
 const model=new Float32Array(body.length+object.length);model.set(body);model.set(object,body.length);
 const held=Array.from({length:2000},(_,i)=>object.slice(i*STRIDE,(i+1)*STRIDE));
 const crown=held.filter((_,i)=>i%7===0);
 assert.ok(crown.every(p=>Math.hypot(p[0]-p[9],p[2]-p[11])<.050),'Crown remains a small inner accent');
 assert.ok(crown.some(p=>p[1]>p[10]+.04)&&crown.some(p=>p[1]<p[10]-.02),'Keep readable crown tips and band');
 assert.ok(held.length>10);assert.ok(model.every(Number.isFinite));
 assert.ok(held.some(p=>p[8]>.1)&&held.some(p=>p[8]<-.1),'Objects have front and back facing normals');
 assert.ok(Math.max(...held.map(p=>p[2]))-Math.min(...held.map(p=>p[2]))>(pose===0?.045:.08),'Held objects have depth proportional to their radius');
 if(pose===0){
  const upperFlame=held.filter(p=>p[1]>p[10]+.13);
  assert.ok(upperFlame.length>300,'The entire outer flame is an independent prop, not painted on the shirt');
  assert.ok(upperFlame.every(p=>p[12]>=1),'Every outer flame particle rotates with the ember');
 }
 if(pose===1){
  assert.ok(held.some(p=>p[1]<p[10]-.13),'Restore the lower ornament above the palm');
  assert.ok(held.some(p=>p[1]>p[10]+.16),'Restore the upper ornament and filament');
 }
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
  const rotated=rotateHeldObjects(model,angle/.48,new Float32Array(model.length));
  for(let k=0;k<model.length;k+=STRIDE){
   if(model[k+12]===0){assert.ok(Math.hypot(rotated[k]-model[k],rotated[k+1]-model[k+1],rotated[k+2]-model[k+2])<.0067,'Hand and body stars drift without moving the pose');continue;}
   const radius=(p:Float32Array)=>Math.hypot(p[k]-p[k+9],p[k+2]-p[k+11]);
   assert.ok(Math.abs(radius(rotated)-radius(model))<1e-6,'Rotation must not move the object away from its hand anchor');
   assert.equal(rotated[k+1],model[k+1],'Held object must not rise away from the palm');
  }
 }
}
console.log('Portrait sampling: exterior removal, white highlight retention and finite geometry passed.');

const cropped=new Uint8ClampedArray(100*100*4);
for(let y=0;y<100;y++)for(let x=0;x<100;x++)cropped.set(y>55?[80,45,160,255]:[255,255,255,255],(y*100+x)*4);
const wisps=portraitPoints(cropped,100,100,4000,0);
const xs=Array.from({length:4000},(_,i)=>wisps[i*STRIDE]);
assert.ok(xs.some(x=>x<-.52)&&xs.some(x=>x>.52),'Only a small continuation beyond both original crop edges');
assert.ok(xs.every(x=>Math.abs(x)<.586),'Side extension remains bounded, not a new silhouette');
assert.equal(wisps.length,4000*STRIDE,'Edge repair retains the existing particle total');
