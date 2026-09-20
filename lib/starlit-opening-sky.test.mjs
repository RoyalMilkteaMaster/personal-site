import assert from 'node:assert/strict';
import { openingSky, animateOpeningSky } from './fantasy/opening-sky.mjs';
import { STRIDE, backgroundStars } from './particle-morph.ts';
import { portraitCamera } from './fixed-bust.ts';
import { stageShot } from './camera-sequence.ts';
const shot = stageShot('done', 1);
const camera = portraitCamera(shot.angle, shot.radius, shot.target);
const source = openingSky(1600), original = source.slice(), out = new Float32Array(source.length);
const legacy = backgroundStars(1600, 0);
assert.equal(source.length, legacy.length, 'opening reuses the existing sky slot budget');
assert.deepEqual(openingSky(1600), source, 'fixed points do not randomly regenerate each frame');
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
for (const time of [0, 8, 60]) {
  assert.equal(animateOpeningSky(source, time, out), out, 'animation reuses its output buffer');
  let center = 0, outside = 0, visible = 0;
  const bins = Array(16).fill(0), radialBands = Array(8).fill(0);
  for (let i = 0; i < out.length; i += STRIDE) {
    const rel = [0, 1, 2].map(j => out[i + j] - camera.eye[j]);
    const depth = -dot(rel, camera.back);
    assert(depth > 0, 'all sky stars use valid perspective depths');
    // Opening uses the legacy projection with full-window uAspect=1 on both devices.
    const x = dot(rel, camera.right) * 3.8 / depth;
    const y = dot(rel, camera.up) * 3.8 / depth;
    const radius = Math.hypot(x, y);
    if (radius < 0.2) center++;
    if (radius < 2) radialBands[Math.floor(radius * 4)]++;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) outside++;
    else { visible++; bins[Math.floor((y + 1) * 2) * 4 + Math.floor((x + 1) * 2)]++; }
  }
  assert(center > 20, 'central hole is filled with stars');
  assert(outside > 200, 'the field extends beyond the viewport rather than ending as a visible object');
  assert(visible > 500 && Math.min(...bins) > 10, 'all viewport regions retain background stars');
  assert(radialBands.every(n => n > 20), 'no hard inner ring or outer ring boundary');
  console.log(JSON.stringify({time,center,outside,visible,minimumRegion:Math.min(...bins),radialBands}));
}
assert.deepEqual(source, original, 'motion never mutates or rebuilds the source');
const speeds = [], near = [], far = [];
let dim = 0, bright = 0, minDepth = Infinity, maxDepth = -Infinity;
for (let i = 0; i < source.length; i += STRIDE) {
  speeds.push(source[i + 9]);
  if (source[i + 2] < 0.8) near.push(source[i + 9]);
  if (source[i + 2] > 2.1) far.push(source[i + 9]);
  minDepth = Math.min(minDepth, source[i + 2]); maxDepth = Math.max(maxDepth, source[i + 2]);
  if (source[i + 5] < 0.4) dim++;
  if (source[i + 5] > 0.65) bright++;
}
const mean = a => a.reduce((s,v)=>s+v,0)/a.length;
assert(maxDepth - minDepth > 2, 'multiple perspective depth layers');
assert(mean(near) > mean(far) * 1.3, 'near layers drift faster than distant layers');
assert(Math.max(...speeds) - Math.min(...speeds) > 0.01, 'motion is not a rigid whole-field rotation');
assert(dim > 1400 && bright > 20 && bright < 150, 'mostly dim stars with sparse bright accents');
assert.notDeepEqual(out, source, 'waiting time actually moves the field');
console.log('opening soft field / viewport overflow / filled center / depth-dependent motion / fixed slots: PASS');
