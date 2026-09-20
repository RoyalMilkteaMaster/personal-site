import assert from 'node:assert/strict';
import { volumeStars } from './volume-sky.mjs';
const stars = volumeStars(), radial = [0,0,0], octants = Array(8).fill(0);
for (let k=0; k<stars.length; k+=5) {
  const [x,y,z] = stars.slice(k,k+3), r=Math.hypot(x,y,z);
  assert(r>=.059 && r<=2.461);
  radial[r<.8 ? 0 : r<1.6 ? 1 : 2]++;
  octants[(x>0?1:0)+(y>0?2:0)+(z>0?4:0)]++;
}
assert(radial.every(n=>n>1000));
assert(octants.every(n=>n>4000));
console.log({radial,octants, note:'Geometry-only verification; appearance requires GPU review.'});
