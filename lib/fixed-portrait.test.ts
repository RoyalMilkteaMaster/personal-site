import assert from 'node:assert/strict';
import {fixedBust, bustCamera} from './fixed-bust.ts';
import {Sweep} from './figure-sweep.ts';
import {heldObjectPoints} from './held-object-points.ts';
import {STRIDE, rotateHeldObjects} from './particle-morph.ts';

// These checks cover the structural faults the fixed portrait work fixed. None
// of them says the figure looks right: that is a visual review against rendered
// frames, and this file deliberately does not pretend otherwise.

// ---------------------------------------------------------------------------
// figure-sweep: the two defects that produced holes and banding
// ---------------------------------------------------------------------------
const column = new Sweep([
 {c: [0, 1, 0], rx: 0.2, rz: 0.2},
 {c: [0, 0.5, 0], rx: 0.3, rz: 0.3},
 {c: [0, 0, 0], rx: 0.25, rz: 0.25},
]);

// An uncapped sweep is an open tube. If the end cross-sections extended along
// the axis forever, a torso would swallow the collar above it and a skull would
// swallow the crown of hair above that — both showed up as black holes.
assert.ok(column.inside([0, 0.5, 0]), 'a point on the axis is inside');
assert.ok(!column.inside([0, 1.4, 0]), 'a point past the first cap is outside');
assert.ok(!column.inside([0, -0.4, 0]), 'a point past the last cap is outside');
assert.ok(!column.inside([0.5, 0.5, 0]), 'a point outside the cross-section is outside');

// A capped end is a closed dome instead. Both halves matter: the surface has to
// exist, so the camera cannot look down the bore and see the far wall facing
// away from it, and the volume has to count as solid there so neighbouring
// parts are still culled underneath the dome rather than poking through it.
const capped = new Sweep([
 {c: [0, 1, 0], rx: 0.2, rz: 0.2},
 {c: [0, 0.5, 0], rx: 0.3, rz: 0.3},
 {c: [0, 0, 0], rx: 0.25, rz: 0.25},
], undefined, [true, true]);
assert.ok(capped.inside([0, 1.1, 0]), 'a capped end is solid just past its last station');
assert.ok(!capped.inside([0, 1 + capped.capHeight(0) * 1.6, 0]), 'but the dome still ends');
for (const [end, sign] of [[0, 1], [1, -1]] as const) {
 for (const theta of [0.3, 1.9, 4.4]) {
  const rim = capped.capPoint(end, Math.PI / 2, theta), wall = capped.point(end, theta);
  assert.ok(Math.hypot(rim[0] - wall[0], rim[1] - wall[1], rim[2] - wall[2]) < 1e-9,
   'the dome meets the tube wall exactly, so the join carries no seam');
  const pole = capped.capPoint(end, 0.05, theta), n = capped.capNormal(end, 0.4, theta);
  assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-6, 'cap normals are unit length');
  assert.ok(n[1] * sign > 0.2, 'a cap normal points out along the axis, not back into the volume');
  assert.ok(pole[1] * sign > (end ? -0.05 : 0.95), 'the dome bulges past the end station');
 }
}

// Station blending must be C1. Linear blending makes the surface a stack of
// truncated cones whose normals jump at every station, which renders as flat
// horizontal bands across the hair.
let worst = 0;
for (const theta of [0, 1, 2, 3, 4, 5]) {
 let previous = null;
 for (let i = 0; i <= 400; i++) {
  const n = column.normal(i / 400, theta);
  assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-6, 'sweep normals are unit length');
  if (previous) worst = Math.max(worst, Math.hypot(n[0] - previous[0], n[1] - previous[1], n[2] - previous[2]));
  previous = n;
 }
}
assert.ok(worst < 0.05, `neighbouring sweep normals stay continuous (worst step ${worst.toFixed(4)})`);

// ---------------------------------------------------------------------------
// A stand-in plate shaped like the first pose: head, body, and a sleeve wing on
// the reaching side. The real calibration is against the drawing; this only has
// to exercise the same code paths.
// ---------------------------------------------------------------------------
// `hair` widens only the head rows, which is how the depth check below asks the
// builder a question the drawing itself answers.
function plate(width: number, height: number, hair = 1) {
 const data = new Uint8ClampedArray(width * height * 4).fill(255);
 const put = (x: number, y: number, rgb: number[]) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  data.set([...rgb, 255], (y * width + x) * 4);
 };
 for (let y = 0; y < height; y++) {
  if (y >= 35 && y < 300) {
   const half = (40 + 75 * Math.sin(Math.PI * Math.min(1, (y - 30) / 300))) * (y < 240 ? hair : 1);
   for (let x = Math.round(320 - half); x <= Math.round(320 + half); x++) put(x, y, y < 170 ? [120, 96, 170] : [44, 40, 96]);
  }
  if (y >= 285) {
   const half = 95 + 30 * Math.sin(y / 160);
   for (let x = Math.round(300 - half); x <= Math.round(300 + half); x++) put(x, y, [150, 140, 205]);
   if (y >= 300 && y <= 620) for (let x = Math.max(0, 300 - Math.round(half) - 190); x < 300 - half; x++) put(x, y, [170, 160, 215]);
  }
 }
 return {width, height, data} as ImageData;
}
const rearPlate = (width: number, height: number) => {
 const data = new Uint8ClampedArray(width * height * 4).fill(255);
 for (let y = 10; y < height; y++) for (let x = 150; x < width - 150; x++) data.set([96, 80, 160, 255], (y * width + x) * 4);
 return {width, height, data} as ImageData;
};

const rear = rearPlate(612, 512);
const built = fixedBust(plate(557, 941), rear);
const snapshot = built.points.slice();
const {points, bodyCount, bodyOnly, objectCount} = built;
const total = points.length / STRIDE;

assert.equal(total, bodyCount + 1200, 'the sky is the tail of the same buffer');
assert.equal(bodyCount, bodyOnly + objectCount, 'bodyCount covers the figure plus the held object');
assert.ok(bodyOnly > 40000, `the figure has a usable point budget (${bodyOnly})`);
assert.ok(points.every(Number.isFinite), 'every field is finite');

// Fixed geometry: two builds of the same plate are identical, and evaluating the
// camera never touches a particle.
assert.deepEqual(fixedBust(plate(557, 941), rear).points, snapshot, 'the build is deterministic');
for (let degrees = 0; degrees <= 360; degrees += 5) bustCamera(degrees * Math.PI / 180);
assert.deepEqual(points, snapshot, 'camera evaluation never changes a particle');

let low = Infinity, high = -Infinity, deep = 0, headFront = 0, headBack = 0;
for (let i = 0; i < bodyOnly; i++) {
 const k = i * STRIDE;
 assert.ok(Math.abs(Math.hypot(points[k + 6], points[k + 7], points[k + 8]) - 1) < 1e-5, 'figure normals are unit length');
 assert.equal(points[k + 12], 0, 'figure points carry the body role');
 low = Math.min(low, points[k + 1]);
 high = Math.max(high, points[k + 1]);
 if (points[k + 2] > 0.5) deep++;
 if (points[k + 1] > 0.15 && points[k + 1] < 0.85) {
  if (points[k + 2] > 0.15) headFront++;
  if (points[k + 2] < -0.15) headBack++;
 }
}

// A03: this is the whole outstretched pose, not a head-and-shoulders crop. The head
// occupies roughly the top world unit, so a bust would never reach this far down.
assert.ok(high - low > 2.6, `the figure spans the full pose, not a bust (${(high - low).toFixed(2)})`);
assert.ok(low < -1.6, `the figure continues well below the shoulders (${low.toFixed(2)})`);

// The reaching arm is modelled in depth rather than flattened onto the plate.
assert.ok(deep > 800, `the reaching hand carries real forward depth (${deep} points beyond z=0.5)`);
assert.ok(headFront > 500 && headBack > 500, `the head has distinct front and back surfaces (${headFront}/${headBack})`);

// ---------------------------------------------------------------------------
// The held object: same object, moved to this palm, and it has to spin in place
// there rather than orbit the hand.
//
// heldObjectPoints returns absolute positions with its own pivot already added
// in, and repeats that pivot in fields 9..11. Re-anchoring is therefore
// (position - pivot) * scale + newAnchor on all three axes. An earlier build did
// that on x and y but left z absolute while storing the new anchor as the pivot,
// so the shape's centre ended up 0.586 away from the pivot rotateHeldObjects
// turns it about: the flame swung round a 0.59 circle instead of standing still,
// and at rest it sat inside the chest with 70% of it hidden behind the figure.
// ---------------------------------------------------------------------------
const pivot = [points[bodyOnly * STRIDE + 9], points[bodyOnly * STRIDE + 10], points[bodyOnly * STRIDE + 11]];
assert.ok(pivot[2] > 0.5, 'the object pivot is out in front with the palm');
const reference = heldObjectPoints(objectCount, 0);
let scaleLow = Infinity, scaleHigh = 0, farthestFromPivot = 0, compared = 0;
for (let i = 0; i < objectCount; i++) {
 const k = (bodyOnly + i) * STRIDE, r = i * STRIDE;
 assert.ok(points[k + 12] > 0.5, 'held object points keep a prop role');
 for (let a = 0; a < 3; a++) assert.equal(points[k + 9 + a], pivot[a], 'every object point shares the palm pivot');
 const own = Math.hypot(points[k] - pivot[0], points[k + 1] - pivot[1], points[k + 2] - pivot[2]);
 farthestFromPivot = Math.max(farthestFromPivot, own);
 // Position and pivot must be transformed by the same thing on every axis, so
 // the offset from the pivot is the source object's offset times one number.
 const source = Math.hypot(reference[r] - reference[r + 9], reference[r + 1] - reference[r + 10], reference[r + 2] - reference[r + 11]);
 if (source < 0.02) continue; // near the pivot the ratio is all rounding
 compared++;
 scaleLow = Math.min(scaleLow, own / source);
 scaleHigh = Math.max(scaleHigh, own / source);
}
assert.ok(compared > 1000, 'enough of the object is far enough from the pivot to compare');
assert.ok(scaleHigh - scaleLow < 1e-4,
 `position and pivot are re-anchored by the same transform on every axis (scale ${scaleLow.toFixed(5)}..${scaleHigh.toFixed(5)})`);
assert.ok(farthestFromPivot < 1.3, 'the object stays a held object rather than filling the scene');

// Through the real shared helper, over a whole turn. The prop's own asymmetry is
// allowed; anything beyond it means the stored pivot is not the object's centre.
const FULL_TURN_SECONDS = 2 * Math.PI / 0.48;
const centroidOf = (buffer: Float32Array) => {
 let x = 0, y = 0, z = 0;
 for (let i = bodyOnly; i < bodyCount; i++) {const k = i * STRIDE; x += buffer[k]; y += buffer[k + 1]; z += buffer[k + 2];}
 return [x / objectCount, y / objectCount, z / objectCount];
};
let referenceOrbit = 0;
{
 const spun = new Float32Array(reference.length);
 const own = [reference[9], reference[10], reference[11]];
 for (let step = 0; step <= 48; step++) {
  rotateHeldObjects(reference, step / 48 * FULL_TURN_SECONDS, spun);
  let x = 0, z = 0;
  for (let k = 0; k < spun.length; k += STRIDE) {x += spun[k]; z += spun[k + 2];}
  referenceOrbit = Math.max(referenceOrbit, Math.hypot(x / objectCount - own[0], z / objectCount - own[2]));
 }
}
const SCALE = scaleHigh, ALLOWED_ORBIT = referenceOrbit * SCALE * 1.05;
const turned = new Float32Array(points.length);
let worstOrbit = 0, worstBody = 0, worstBase = 0;
for (let step = 0; step <= 48; step++) {
 rotateHeldObjects(points, step / 48 * FULL_TURN_SECONDS, turned);
 const centre = centroidOf(turned);
 worstOrbit = Math.max(worstOrbit, Math.hypot(centre[0] - pivot[0], centre[2] - pivot[2]));
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  worstBody = Math.max(worstBody, Math.hypot(turned[k] - points[k], turned[k + 1] - points[k + 1], turned[k + 2] - points[k + 2]));
 }
 // The flame's foot must stay on the hand for the whole turn, not just at rest.
 let lowest = Infinity, base = [0, 0, 0];
 for (let i = bodyOnly; i < bodyCount; i++) {
  const k = i * STRIDE;
  if (turned[k + 1] < lowest) {lowest = turned[k + 1]; base = [turned[k], turned[k + 1], turned[k + 2]];}
 }
 let nearest = Infinity;
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  nearest = Math.min(nearest, Math.hypot(points[k] - base[0], points[k + 1] - base[1], points[k + 2] - base[2]));
 }
 worstBase = Math.max(worstBase, nearest);
}
assert.ok(worstOrbit <= ALLOWED_ORBIT,
 `the object turns on its own axis at the palm (centroid ${worstOrbit.toFixed(5)} from the pivot, the source object's own ${ALLOWED_ORBIT.toFixed(5)})`);
assert.ok(worstBase < 0.09, `the flame keeps its foot on the hand all the way round (worst gap ${worstBase.toFixed(4)})`);
// Only the documented micro-float: rotating the prop must never turn the figure.
const MICRO_FLOAT = Math.hypot(0.0032, 0.0055, 0.002);
assert.ok(worstBody <= MICRO_FLOAT + 1e-6,
 `the figure does not travel with the object (worst ${worstBody.toFixed(5)}, micro-float budget ${MICRO_FLOAT.toFixed(5)})`);

// The isolated page still crops the plate to its first 520 rows. The build must
// keep working on that input; it simply has no pixels for the lower colours.
const cropped = fixedBust(plate(557, 520), rear);
assert.ok(cropped.points.every(Number.isFinite), 'the legacy 520-row crop still builds finite geometry');
assert.equal(cropped.bodyCount, cropped.bodyOnly + cropped.objectCount, 'the crop keeps the same buffer layout');
assert.ok(cropped.bodyOnly > 20000, `the crop still yields a figure (${cropped.bodyOnly})`);

// ---------------------------------------------------------------------------
// The two shapes the delivered product was rejected on, as observable facts of
// the built cloud. Both are read in plate pixels, the frame the station tables
// are written in, so they say what the drawing says.
// ---------------------------------------------------------------------------
const UNIT = 2.1 / 557, ROW0 = 301.5;
const plateRow = (y: number) => ROW0 - y / UNIT;
const plateColumn = (x: number) => x / UNIT + 557 / 2;
const plateDepth = (z: number) => z / UNIT;

// A wider hair outline must make the hair wider, not deeper.
//
// This is the fault behind the shell the reviewers saw, stated as cause rather
// than as a tuned number: the crown tufts took their depth from the plate's
// frontal width, so a drawing that is broad across the crown because the cut
// sweeps sideways came back as a ball standing as far in front of the face as it
// reaches past the ears. Widen the drawing's hair by half and the built hair has
// to follow it across while its depth stays with the skull it sits on.
{
 const crown = (build: {points: Float32Array; bodyOnly: number}) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < build.bodyOnly; i++) {
   const k = i * STRIDE, row = plateRow(build.points[k + 1]);
   if (row < 30 || row > 120) continue;
   x0 = Math.min(x0, plateColumn(build.points[k])); x1 = Math.max(x1, plateColumn(build.points[k]));
   z0 = Math.min(z0, plateDepth(build.points[k + 2])); z1 = Math.max(z1, plateDepth(build.points[k + 2]));
  }
  return {width: x1 - x0, depth: z1 - z0};
 };
 const drawn = crown(built), broader = crown(fixedBust(plate(557, 941, 1.5), rear));
 const wider = broader.width / drawn.width, deeper = broader.depth / drawn.depth;
 assert.ok(wider > 1.25, `the hair follows the drawing's own outline outwards (${wider.toFixed(2)}x wider)`);
 assert.ok(deeper < 1.12,
  `and does not gain that width in depth as well (${deeper.toFixed(2)}x deeper: ${drawn.depth.toFixed(0)} -> ${broader.depth.toFixed(0)} px)`);
}

// The hand is where the drawing draws it.
//
// At plate row 520 the first pose draws four separate deep-navy runs — columns
// 103-146, 176-209, 220-245 and 249-262 — parted by its own rim light, and they
// run up and to the right out of a knuckle line near row 555. The delivered
// build laid four thin fingers from column 184 to 279 at half that angle and
// gave the ground between columns 96 and 188, where the index and middle fingers
// actually are, to one smooth palm slab. That is the mitten, and it is why no
// spacing or radius applied to those four could fix it.
//
// The index and the middle finger are the two curled towards the camera, so they
// are the mass that stands in front of the palm at the knuckle band, and they
// stand there at the drawing's own columns. Measured on this stand-in plate:
// the delivered build puts 0.04% of the figure in front of z = 0.78 there and
// none of it left of column 135; this one puts 0.72% across columns 100 to 218.
//
// Whether the four then read as four is a judgement about rendered frames, which
// this file does not make — see the note at the top.
{
 let c0 = Infinity, c1 = -Infinity, forward = 0;
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  const row = plateRow(points[k + 1]);
  if (row < 495 || row > 565 || points[k + 2] <= 0.78) continue;
  const column = plateColumn(points[k]);
  c0 = Math.min(c0, column); c1 = Math.max(c1, column);
  forward++;
 }
 assert.ok(forward / bodyOnly > 0.002,
  `the curled fingers carry real volume in front of the palm (${(100 * forward / bodyOnly).toFixed(2)}% of the figure, delivered build 0.04%)`);
 assert.ok(c0 < 120 && c1 > 200,
  `and they stand across the drawing's own knuckle line (columns ${c0.toFixed(0)}..${c1.toFixed(0)}, delivered build 135..266)`);
}

// The fingers still fan across the drawing's span on the outer side, which is
// the one clause of the delivered build's own check that says something the
// drawing says: the little and ring fingers cross rows 460..565 there.
{
 let r0 = Infinity, r1 = -Infinity;
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  if (points[k + 2] <= 0.66) continue;
  const column = plateColumn(points[k]);
  if (column < 200 || column > 290) continue;
  const row = plateRow(points[k + 1]);
  r0 = Math.min(r0, row); r1 = Math.max(r1, row);
 }
 assert.ok(r1 - r0 > 100, `the fingers fan across the drawing's own span (${(r1 - r0).toFixed(0)} rows)`);
}

console.log([
 `fixed portrait: ${bodyOnly} figure points, ${objectCount} held-object points, ${total} total`,
 `world span y ${low.toFixed(2)}..${high.toFixed(2)}; ${deep} points beyond z=0.5`,
 `head front/back ${headFront}/${headBack}; worst sweep normal step ${worst.toFixed(4)}`,
 'Visual fidelity is reviewed from rendered frames, not from this file.',
].join('\n'));
