import assert from 'node:assert/strict';
import { volumeStars } from './volume-sky.mjs';
const b=volumeStars(),d=volumeStars(35000,true);
const stats=a=>{let near=0,max=0;for(let k=0;k<a.length;k+=5){const r=Math.hypot(...a.subarray(k,k+3));near+=r<1;max=Math.max(max,r);}return {count:a.length/5,nearRatio:near/(a.length/5),maxRadius:max};};
const bs=stats(b),ds=stats(d);
assert.equal(ds.count,35000);
assert(ds.nearRatio<bs.nearRatio/2);
assert(Math.abs(ds.maxRadius/bs.maxRadius-1.5)<.01);
let retained=0,dimmed=0;
for(let k=3;k<d.length;k+=5){const ratio=d[k]/b[k];if(Math.abs(ratio-1)<1e-5)retained++;else {assert(Math.abs(ratio-.74)<1e-5);dimmed++;}}
assert(retained>2500 && retained<4500);
console.log({B:bs,D:ds,retained,dimmed,note:'Geometry/brightness only; GPU comparison still required.'});
