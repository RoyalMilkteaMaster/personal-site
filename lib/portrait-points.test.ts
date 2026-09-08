import assert from 'node:assert/strict';
import {backgroundMask,portraitPoints} from './portrait-points.ts';
import {STRIDE} from './particle-morph.ts';

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
 const model=portraitPoints(pixels,width,width,2000,pose);
 const held=Array.from({length:2000},(_,i)=>model.slice(i*STRIDE,(i+1)*STRIDE)).filter(p=>p[12]===1);
 assert.ok(held.length>10);assert.ok(model.every(Number.isFinite));
 assert.ok(held.some(p=>p[8]>.1)&&held.some(p=>p[8]<-.1),'Objects have front and back facing normals');
 assert.ok(Math.max(...held.map(p=>p[2]))-Math.min(...held.map(p=>p[2]))>(pose===0?.045:.08),'Held objects have depth proportional to their radius');
}
console.log('Portrait sampling: exterior removal, white highlight retention and finite geometry passed.');
