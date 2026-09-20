import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createPath,
  advanceTarget,
  cameraEye,
  siteCamera,
  TIMING,
} from './fantasy/orbit.mjs';
import { cameraFrame, cameraMatrix } from './fantasy/camera.mjs';

const alignment = JSON.parse(
  fs.readFileSync(
    new URL('../public/fantasy/camera-alignment.json', import.meta.url),
    'utf8',
  ),
);
const p = createPath(alignment),
  t = p.timing;
assert.equal(t.turn, 0.7);
assert.equal(t.type, 0.9);
assert.equal(t.wait, 3);
assert.equal(t.propFade, 0.7);
assert(Math.abs(t.backStart - t.frontEnd - t.turn) < 1e-12);
assert(
  Math.abs(t.return / t.turn - p.travel.backEyeArc / p.travel.frontEyeArc) <
    1e-12,
);
assert.equal(t.end, t.wideStart + TIMING.propFade);
assert.equal(advanceTarget(t.type - 0.001, t), null);
assert.equal(advanceTarget(t.type, t), t.frontEnd);
assert.equal(advanceTarget(t.frontEnd, t), null);
assert.equal(advanceTarget(t.backStart + t.type - 0.001, t), null);
assert.equal(advanceTarget(t.backStart + t.type, t), t.backEnd);
assert.equal(advanceTarget(t.backEnd, t), null);
assert.equal(p.at(t.wideStart).propReveal, 0);
assert.equal(p.at(t.end).propReveal, 1);
assert.deepEqual(p.at(0).camera, alignment.near);
assert.deepEqual(p.at(t.end).camera, p.wide);

// Compare measured curved travel and speed profiles, rather than endpoint chords.
function trace(start: number, duration: number) {
  const samples = 1000,
    speeds: number[] = [];
  let previous = cameraEye(p.at(start).camera),
    lastAz = p.at(start).camera.az,
    total = 0;
  for (let i = 1; i <= samples; i++) {
    const c = p.at(start + (duration * i) / samples).camera,
      eye = cameraEye(c);
    assert(c.az >= lastAz - 1e-10);
    lastAz = c.az;
    const d = Math.hypot(...eye.map((v: number, j: number) => v - previous[j]));
    previous = eye;
    total += d;
    speeds.push(d / (duration / samples));
  }
  return { total, speeds };
}
const a = trace(t.frontEnd, t.turn),
  b = trace(t.backEnd, t.return);
assert(Math.abs(a.total / t.turn - b.total / t.return) < 0.0001);
for (let i = 1; i < 999; i++)
  assert(Math.abs(a.speeds[i] - b.speeds[i]) < 0.004);
assert(a.speeds[0] < 0.03 && a.speeds.at(-1)! < 0.03);
assert(b.speeds[0] < 0.03 && b.speeds.at(-1)! < 0.03);
for (const aspect of [0.883, 0.962, 1.602]) {
  const near = siteCamera(p, p.near, 0, aspect),
    wide = siteCamera(p, p.wide, 1, aspect);
  assert.deepEqual(near.target, p.near.target);
  assert.equal(wide.el, -10.5);
  assert.deepEqual(wide.target, p.wide.target);
  assert.equal(near.frameScaleY, 1);
  assert.equal(wide.frameScaleY, 1);
  const nearFov =
    (Math.atan(Math.tan((14 * Math.PI) / 180) * Math.max(1, 1 / aspect)) *
      360) /
    Math.PI;
  const wideFov =
    (Math.atan(Math.tan((14 * Math.PI) / 180) * Math.max(1, 0.62 / aspect)) *
      360) /
    Math.PI;
  assert(Math.abs(near.fov - nearFov) < 1e-10);
  assert(Math.abs(wide.fov - wideFov) < 1e-10);
  const canvas = { width: Math.round(710 * aspect), height: 710 };
  for (const c of [near, wide])
    assert.deepEqual(
      cameraFrame(c, canvas).screenM,
      cameraMatrix(c, canvas, canvas.width / canvas.height).M,
    );
}
const rear = siteCamera(p, p.rear, p.split, 627 / 710),
  frame = cameraFrame(rear, { width: 627, height: 710 });
assert.deepEqual(p.rear, {
  az: 183,
  el: 0,
  dist: 1.18,
  target: [0.035, 0.62, -0.04],
  roll: 0,
  fov: 28,
});
assert.deepEqual(frame.viewport, [0, 0, 627, 710]);
assert.deepEqual(frame.screenM, frame.M);
assert.deepEqual(p.at(t.backStart).camera, p.at(t.backEnd - 1e-6).camera);
// True level is the optical axis, independent of the mesh's asymmetric pose.
for (const time of [t.backStart, t.backStart + t.type, t.backEnd - 1e-6]) {
  const c = p.at(time).camera,
    eye = cameraEye(c);
  assert.equal(eye[1], c.target[1]);
  assert.equal((c.target[1] - eye[1]) / c.dist, 0);
  assert.equal(c.roll, 0);
}
// Latest user chooses a static close back shot, with natural side cropping.
for (const aspect of [0.65, 627 / 710, 390 / 405, 1.6, 2]) {
  for (let i = 0; i <= 200; i++) {
    const shot = p.at((t.end * i) / 200),
      cam = siteCamera(p, shot.camera, shot.u, aspect);
    assert.equal(cam.frameScaleY, 1);
  }
  const expectedFov =
    (Math.atan(
      Math.tan((p.rear.fov * Math.PI) / 360) * Math.max(1, 1 / aspect),
    ) *
      360) /
    Math.PI;
  assert(
    Math.abs(siteCamera(p, p.rear, p.split, aspect).fov - expectedFov) < 1e-10,
  );
}
console.log(
  JSON.stringify(
    {
      timing: t,
      shippedArcIntegrationSteps: 1024,
      shippedTravel: p.travel,
      validationPathSamples: 1000,
      measuredEyeLengths: [a.total, b.total],
      meanEyeSpeeds: [a.total / t.turn, b.total / t.return],
      peakSpeeds: [Math.max(...a.speeds), Math.max(...b.speeds)],
    },
    null,
    2,
  ),
);
