import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createIntro, introCamera } from './fantasy/starlit-intro.mjs';
import { createPath } from './fantasy/orbit.mjs';
import {
  backgroundStars,
  rotateHeldObjects,
  STRIDE,
} from './particle-morph.ts';
import { cameraFrame } from './fantasy/camera.mjs';
const path = createPath(
  JSON.parse(
    fs.readFileSync(
      new URL('../public/fantasy/camera-alignment.json', import.meta.url),
    ),
  ),
);
const bytes = fs.readFileSync(
  new URL('../public/fantasy/surface-stars.f32', import.meta.url),
);
const stars = new Float32Array(
  bytes.buffer,
  bytes.byteOffset,
  bytes.byteLength / 4,
);
const player = createIntro();
for (const aspect of [0.46, 16 / 9]) {
  const c = introCamera(path, player.state(), aspect);
  const f = cameraFrame(c, { width: 720 * aspect, height: 720 });
  const bins = Array(16).fill(0);
  for (let i = 0; i < stars.length; i += 8) {
    const p = [stars[i], stars[i + 1], stars[i + 2]];
    if (p.reduce((s, v, j) => s + stars[i + 3 + j] * (f.eye[j] - v), 0) <= 0)
      continue;
    const clip = [0, 1, 2, 3].map(
      (r) => f.M[r + 12] + p.reduce((s, v, j) => s + f.M[r + j * 4] * v, 0),
    );
    if (clip[3] <= 0 || clip.slice(0, 3).some((v) => Math.abs(v) >= clip[3]))
      continue;
    bins[
      Math.floor((clip[1] / clip[3] + 1) * 2) * 4 +
        Math.floor((clip[0] / clip[3] + 1) * 2)
    ]++;
  }
  assert(
    Math.min(...bins) >= 5,
    'actual face surface stars cover all sixteen viewport regions, including corners',
  );
  console.log(
    JSON.stringify({
      aspect,
      minimumRegionStars: Math.min(...bins),
      total: bins.reduce((a, b) => a + b),
    }),
  );
}
const start = introCamera(path, player.state(), 1);
assert.deepEqual(
  introCamera(path, player.state(), 1),
  start,
  'waiting face stays fixed',
);
const source = backgroundStars(1000, 0),
  a = new Float32Array(source.length),
  b = new Float32Array(source.length);
rotateHeldObjects(source, 0, a);
rotateHeldObjects(source, 2, b);
for (let i = 0; i < source.length; i += STRIDE) {
  const radius = Math.hypot(a[i], a[i + 1]);
  assert(
    Math.abs(Math.hypot(b[i], b[i + 1]) - radius) < 1e-6,
    'legacy stars orbit the existing center without inventing a new shape',
  );
  assert(
    Math.hypot(b[i] - a[i], b[i + 1] - a[i + 1]) > 0.01,
    'the background actually moves while the face stays fixed',
  );
  assert.equal(b[i + 2], a[i + 2]);
}
player.selectStep(1);
player.tick(0.8);
assert(player.state().settled);
assert.deepEqual(
  introCamera(path, player.state(), 1),
  introCamera(path, player.state(), 1),
  'front is steady after the reveal',
);
player.selectStep(0);
player.tick(0.8);
assert.equal(player.state().stage, 'waiting');
assert.equal(
  player.state().cameraWeights[0],
  1,
  'reverse scroll restores the same face closeup',
);
console.log(
  'opening native surface coverage / original background orbit / fixed face / steady front / reverse: PASS',
);
