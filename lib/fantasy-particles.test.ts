import assert from 'node:assert/strict';
import { expandSnapshot } from './fantasy-particles.mjs';
import { identity, inverse, multiply } from './fantasy/matrix.mjs';
import { cameraMatrix } from './fantasy/camera.mjs';

// Expansion must keep every original chapter star exactly once at full opacity,
// including its material and diameter. No old pose is resampled to fit the pool.
for (const [oldCount, newCount] of [
  [1, 3],
  [13, 101],
  [80946, 251494],
]) {
  const input = new Float32Array(oldCount * 10);
  for (let i = 0; i < oldCount; i++)
    input.set([i * 0.01, 0, 0, 2, i, 1, 0.5, 1, 1.25, 0.32], i * 10);
  const out = expandSnapshot(input, newCount),
    seen = new Set();
  for (let i = 0; i < newCount; i++)
    if (out[i * 10 + 7] !== 0) {
      const id = out[i * 10 + 4];
      assert(!seen.has(id));
      seen.add(id);
      assert.deepEqual(
        out.slice(i * 10, i * 10 + 10),
        input.slice(id * 10, id * 10 + 10),
      );
    }
  assert.equal(seen.size, oldCount);
}
assert.throws(() => expandSnapshot(new Float32Array(100), 9));

// Reprojecting a captured 3D clip point while leaving the intro must be the
// same as moving the actual camera around its original world point.
const camera = {
  az: 72,
  el: -14,
  dist: 0.98,
  target: [0.03, 0.68, -0.02],
  roll: -0.8,
  fov: 30,
};
const a = cameraMatrix(camera, { height: 710 }, 0.883).M;
const b = cameraMatrix(
  { ...camera, az: 250, dist: 1.6, target: [0, 0.5, 0] },
  { height: 710 },
  0.883,
).M;
const delta = multiply(b, inverse(a));
const transform = (m: Float32Array, p: number[]) =>
  Array.from({ length: 4 }, (_, r) =>
    p.reduce((s, v, c) => s + m[c * 4 + r] * v, 0),
  );
for (let i = 0; i < 100; i++) {
  const p = [Math.sin(i) * 0.4, 0.2 + i * 0.005, Math.cos(i) * 0.3, 1];
  const actual = transform(delta, transform(a, p)),
    expected = transform(b, p);
  actual.forEach((v, j) => assert(Math.abs(v - expected[j]) < 0.0001));
}
multiply(a, inverse(a)).forEach((v, i) =>
  assert(Math.abs(v - identity()[i]) < 0.0001),
);
console.log(
  'Shared chapter identities/materials and interrupted 3D camera reprojection passed.',
);
