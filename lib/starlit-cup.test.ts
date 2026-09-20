import assert from 'node:assert/strict';
import {
  cupGeometry,
  cupStarGeometry,
} from './fantasy/starlit-constellation.mjs';

const lines = cupGeometry();
const stars = cupStarGeometry(lines);
const vertices = (data: Float32Array) =>
  Array.from({ length: data.length / 3 }, (_, i) =>
    Array.from(data.slice(i * 3, i * 3 + 3)),
  );
const linePoints = vertices(lines),
  starPoints = vertices(stars);
assert(lines.length > 0 && lines.length % 6 === 0);
assert(stars.length > 0 && stars.length % 3 === 0);
assert(lines.every(Number.isFinite) && stars.every(Number.isFinite));
assert.deepEqual(cupGeometry(), lines, 'geometry is stable across calls');
const key = (p: number[]) => p.map((v) => v.toFixed(6)).join(',');
assert.equal(
  new Set(starPoints.map(key)).size,
  starPoints.length,
  'no duplicated bright joints',
);

// A broad cup must retain width when viewed around the whole rotation.
const body = linePoints.filter((p) => p[1] <= 0.23);
const span = (values: number[]) => Math.max(...values) - Math.min(...values);
const bodyHeight = span(body.map((p) => p[1]));
for (let degrees = 0; degrees < 360; degrees += 15) {
  const a = (degrees * Math.PI) / 180;
  const width = span(body.map(([x, , z]) => x * Math.cos(a) + z * Math.sin(a)));
  assert(width > bodyHeight * 1.2, `short, broad body at ${degrees} degrees`);
}
for (const side of [-1, 1]) {
  const ear = linePoints.filter(([x, y]) => x * side > 0.28 && y > 0.48);
  assert(ear.length > 0, 'two raised ear tips');
  assert(span(ear.map((p) => p[2])) > 0.1, 'ears have front/back depth');
}
const strawTop = linePoints.filter((p) => p[1] > 0.65);
assert(strawTop.length >= 8, 'straw extends above the ears with an open rim');
assert(span(strawTop.map((p) => p[2])) > 0.05, 'straw has tube thickness');
assert(
  Math.min(...strawTop.map((p) => p[0])) > 0.15,
  'straw leans away from its base',
);

// The interior contains multiple separated spherical clusters, without lines.
const joints = new Set(linePoints.map(key));
const pearls = starPoints.filter((p) => !joints.has(key(p)));
assert(
  pearls.length > 0 &&
    pearls.every(
      ([x, y, z]) => y < -0.17 && y > -0.36 && Math.hypot(x, z) < 0.34,
    ),
);
const remaining = new Set(pearls);
let clusters = 0;
while (remaining.size) {
  const cluster = [remaining.values().next().value!];
  remaining.delete(cluster[0]);
  for (let i = 0; i < cluster.length; i++) {
    for (const p of remaining) {
      if (Math.hypot(...p.map((v, j) => v - cluster[i][j])) < 0.035) {
        cluster.push(p);
        remaining.delete(p);
      }
    }
  }
  const dimensions = [0, 1, 2].map((axis) => span(cluster.map((p) => p[axis])));
  assert(Math.min(...dimensions) > 0.07, 'pearls have volume in every axis');
  assert(
    Math.max(...dimensions) / Math.min(...dimensions) < 1.2,
    'pearls remain round',
  );
  clusters++;
}
assert(clusters >= 4, 'multiple distinct pearls, not one dense ball');
console.log(
  `cup geometry: PASS; ${lines.length / 6} segments, ${stars.length / 3} unique stars, ${clusters} round pearls, 24 yaw samples`,
);
