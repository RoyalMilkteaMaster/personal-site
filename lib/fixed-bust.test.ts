import assert from 'node:assert/strict';
import {fixedBust, bustCamera} from './fixed-bust.ts';
import {STRIDE} from './particle-morph.ts';

// ---------------------------------------------------------------------------
// Input contract
//
// fixedBust builds one fixed figure from the first pose of astral-clean-plate
// (557 x 941) plus a rear head-and-shoulders reference. Its station tables are
// calibrated to that drawing in plate pixels, so a stand-in plate exercises the
// same code paths but is not a second character.
//
// The stand-in below is therefore shaped like a head and a robed body, with the
// outline numbers measured off the real plate. The previous stand-in was a solid
// rectangle spanning columns 140..455, and on that input the head-width search
// window simply returned its own width: the depth/width assertion at the bottom
// of this file was reading the search window, not a head. Measured on this plate
// the same expression gives 0.92, and on the real plate 0.92 as well, so the
// assertion is kept and the input is what changed.
// ---------------------------------------------------------------------------
const CLOTH = [150, 140, 205], SKIN = [30, 34, 80], HAIR = [120, 96, 170];
// Half width of the hair outline by plate row, read off the real first pose.
const HEAD = [[36, 12], [60, 69], [90, 102], [130, 119], [160, 114], [200, 88], [240, 74], [270, 56], [296, 30]];

function plate(width: number, height: number) {
 const data = new Uint8ClampedArray(width * height * 4).fill(255);
 const put = (x: number, y: number, rgb: number[]) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  data.set([...rgb, 255], (y * width + x) * 4);
 };
 const lerp = (row: number) => {
  let i = 0;
  while (i < HEAD.length - 2 && row > HEAD[i + 1][0]) i++;
  const a = HEAD[i], b = HEAD[i + 1];
  return a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, (row - a[0]) / (b[0] - a[0])));
 };
 for (let y = 0; y < height; y++) {
  if (y >= HEAD[0][0] && y <= 296) {
   const half = lerp(y);
   for (let x = Math.round(316 - half); x <= Math.round(316 + half); x++) put(x, y, y < 175 ? HAIR : SKIN);
  }
  if (y >= 292) {
   const half = 60 + 130 * Math.min(1, (y - 292) / 90) + 60 * Math.min(1, Math.max(0, (y - 500) / 441));
   for (let x = Math.round(310 - half); x <= Math.round(310 + half); x++) put(x, y, CLOTH);
   // The wide sleeve on the reaching side. It tapers at both ends: a hard
   // rectangular wing puts a right-angled notch where it meets the body, and the
   // garment pass then builds a concave corner there that exists in no drawing.
   if (y >= 300 && y <= 660) {
    const wing = 200 * Math.sin(Math.PI * (y - 300) / 360);
    for (let x = Math.max(0, Math.round(310 - half - wing)); x < 310 - half; x++) put(x, y, CLOTH);
   }
  }
 }
 // The reaching hand: deep navy skin drawn over that bright sleeve. The rear
 // reference has no arm in it at all, so this is the region where borrowing a
 // colour from it is always wrong.
 for (let y = 380; y <= 610; y++) for (let x = 10; x <= 290; x++) {
  if (Math.hypot((x - 150) / 140, (y - 498) / 118) <= 1) put(x, y, SKIN);
 }
 return {width, height, data} as ImageData;
}
const rearPlate = (width: number, height: number) => {
 const data = new Uint8ClampedArray(width * height * 4).fill(255);
 for (let y = 10; y < height; y++) for (let x = 120; x < width - 120; x++) data.set([205, 195, 235, 255], (y * width + x) * 4);
 return {width, height, data} as ImageData;
};

const rear = rearPlate(612, 512);
const source = fixedBust(plate(557, 941), rear);
const snapshot = source.points.slice();
const points = source.points, bodyOnly = source.bodyOnly;

assert.ok(source.bodyCount > 10000);
assert.equal(points.length, (source.bodyCount + 1200) * STRIDE);
assert.equal(source.bodyCount, bodyOnly + source.objectCount, 'bodyCount covers the figure plus the held object');
assert.ok(points.every(Number.isFinite));

let front = 0, rear_ = 0, neck = 0;
const headX: number[] = [], headZ: number[] = [];
for (let i = 0; i < source.bodyCount; i++) {
 const k = i * STRIDE, p = points;
 assert.ok(Math.abs(Math.hypot(p[k + 6], p[k + 7], p[k + 8]) - 1) < 1e-5);
 if (p[k + 1] > .2 && p[k + 1] < .8) {
  headX.push(p[k]); headZ.push(p[k + 2]);
  if (p[k + 2] > .2) front++;
  if (p[k + 2] < -.2) rear_++;
 }
 if (p[k + 1] > -.13 && p[k + 1] < .08) neck++;
}
assert.ok(front > 100 && rear_ > 100, 'The head must contain distinct front and back surfaces');
assert.ok(neck > 100, 'The head/shoulder connection must have actual points');
const depth = Math.max(...headZ) - Math.min(...headZ), width = Math.max(...headX) - Math.min(...headX);
assert.ok(depth / width > .65 && depth / width < 1.6, 'Side depth is bounded relative to head width');

// ---------------------------------------------------------------------------
// Regression: no interior hole in what the camera can actually see
//
// A sweep is a tube. The shoulder yoke used to run across the body as its own
// sweep with both ends left open, so from 90 degrees the camera looked straight
// down the bore: the far wall faces away, the shader fades back faces out, and
// the result was a large oval void under the collar. Counting points is no help
// there — the points exist, they just face the wrong way — so this projects the
// front-facing surface the way the page does and looks for enclosed gaps.
// On the frozen review01 snapshot this reports 8 cells at 60 degrees, 25 at 90,
// 49 at 120 and 9 at 270.
// ---------------------------------------------------------------------------
function biggestGap(angle: number, cells = 46) {
 const toCamera = [Math.sin(angle), 0, Math.cos(angle)];
 const across = [Math.cos(angle), 0, -Math.sin(angle)];
 const us: number[] = [], vs: number[] = [];
 let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  // Head, neck, shoulders and upper chest. Lower down the reaching arm stands
  // clear of the body and the gap between them is real background, not a fault.
  if (points[k + 1] < -0.5 || points[k + 1] > 1.2) continue;
  // The same threshold the page's shader fades back faces out with.
  if (points[k + 6] * toCamera[0] + points[k + 7] * toCamera[1] + points[k + 8] * toCamera[2] <= 0.15) continue;
  const u = points[k] * across[0] + points[k + 2] * across[2];
  us.push(u); vs.push(points[k + 1]);
  u0 = Math.min(u0, u); u1 = Math.max(u1, u);
  v0 = Math.min(v0, points[k + 1]); v1 = Math.max(v1, points[k + 1]);
 }
 assert.ok(us.length > 1000, `angle ${angle} has a visible surface`);
 const W = cells, H = Math.max(2, Math.round(cells * (v1 - v0) / (u1 - u0)));
 const hits = new Int32Array(W * H);
 for (let i = 0; i < us.length; i++) {
  const x = Math.min(W - 1, Math.floor((us[i] - u0) / (u1 - u0) * W));
  const y = Math.min(H - 1, Math.floor((vs[i] - v0) / (v1 - v0) * H));
  hits[y * W + x]++;
 }
 // One stray star is not a surface; two or more is.
 const filled = Array.from(hits, (v) => v >= 2);
 const seen = new Uint8Array(W * H), stack: number[] = [];
 const open = (q: number) => {if (!filled[q] && !seen[q]) {seen[q] = 1; stack.push(q);}};
 for (let x = 0; x < W; x++) {open(x); open((H - 1) * W + x);}
 for (let y = 0; y < H; y++) {open(y * W); open(y * W + W - 1);}
 while (stack.length) {
  const q = stack.pop()!, x = q % W, y = (q - x) / W;
  if (x > 0) open(q - 1);
  if (x < W - 1) open(q + 1);
  if (y > 0) open(q - W);
  if (y < H - 1) open(q + W);
 }
 let worst = 0;
 for (let start = 0; start < W * H; start++) {
  if (filled[start] || seen[start]) continue;
  let size = 0;
  seen[start] = 1;
  const island = [start];
  while (island.length) {
   const q = island.pop()!, x = q % W, y = (q - x) / W;
   size++;
   for (const r of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]) {
    if (r < 0 || filled[r] || seen[r]) continue;
    seen[r] = 1; island.push(r);
   }
  }
  worst = Math.max(worst, size);
 }
 return worst;
}
const gaps = [0, 60, 90, 120, 180, 240, 270, 300].map((deg) => [deg, biggestGap(deg * Math.PI / 180)] as const);
// A handful of cells is the ragged edge between hair locks and the collar. The
// fault this guards against is an order of magnitude bigger than that.
for (const [deg, gap] of gaps) {
 assert.ok(gap <= 6, `no enclosed void in the head and shoulders at ${deg} degrees (largest ${gap} cells)`);
}

// ---------------------------------------------------------------------------
// Regression: the hand takes skin colour, not the rear garment reference
//
// The rear reference covers the head and shoulders only, but the old build chose
// it for any surface above plate row 620, which includes the whole reaching arm.
// A rear-facing finger therefore came out in pale sleeve fabric. On the frozen
// review01 snapshot the back of the hand measures 0.96 of the garment's own
// brightness; the drawing has it as deep navy skin.
// ---------------------------------------------------------------------------
const unit = 2.1 / 557, toColumn = (x: number) => x / unit + 557 / 2, toRow = (y: number) => 301.5 - y / unit;
const brightness = (k: number) => 0.3 * points[k + 3] + 0.5 * points[k + 4] + 0.2 * points[k + 5];
const meanOver = (accept: (column: number, row: number, normalZ: number) => boolean) => {
 let n = 0, sum = 0;
 for (let i = 0; i < bodyOnly; i++) {
  const k = i * STRIDE;
  if (!accept(toColumn(points[k]), toRow(points[k + 1]), points[k + 8])) continue;
  n++; sum += brightness(k);
 }
 assert.ok(n > 200, 'the sampled region has enough points to mean');
 return sum / n;
};
const inHand = (column: number, row: number) => Math.hypot((column - 150) / 140, (row - 498) / 118) <= 0.82;
const handTone = meanOver((column, row) => inHand(column, row));
const handBackTone = meanOver((column, row, normalZ) => normalZ < -0.1 && inHand(column, row));
const clothTone = meanOver((column, row) => column > 330 && column < 470 && row > 620 && row < 900);
assert.ok(handTone / clothTone < 0.6,
 `the hand keeps its own skin tone (hand ${handTone.toFixed(3)} vs cloth ${clothTone.toFixed(3)})`);
assert.ok(handBackTone / clothTone < 0.7,
 `the back of the hand is skin too, not rear garment (${handBackTone.toFixed(3)} vs ${clothTone.toFixed(3)})`);

// ---------------------------------------------------------------------------
// The camera is a pure function of the angle and never touches the figure.
// ---------------------------------------------------------------------------
const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
let previousRadius = 0;
for (let degrees = 0; degrees <= 360; degrees++) {
 const camera = bustCamera(degrees * Math.PI / 180);
 assert.ok(camera.radius > previousRadius); previousRadius = camera.radius;
 for (const basis of [camera.right, camera.up, camera.back]) assert.ok(Math.abs(Math.hypot(...basis) - 1) < 1e-10);
 assert.ok(Math.abs(dot(camera.right, camera.up)) < 1e-10);
 assert.ok(Math.abs(dot(camera.right, camera.back)) < 1e-10);
 assert.ok(Math.abs(dot(camera.up, camera.back)) < 1e-10);
 // Optical axis always points at the same fixed target, with perspective depth > 0.
 const targetRelative = [.04 - camera.eye[0], .30 - camera.eye[1], -camera.eye[2]];
 assert.ok(Math.abs(dot(targetRelative, camera.right)) < 1e-10);
 assert.ok(Math.abs(dot(targetRelative, camera.up)) < 1e-10);
 assert.ok(-dot(targetRelative, camera.back) > 4);
}
assert.deepEqual(points, snapshot, 'Camera evaluation never changes a particle position, colour or identity');

// A degenerate plate is not a figure, so nothing anatomical is asserted on it;
// the build simply has to stay finite and keep its buffer layout.
const solid = (() => {
 const data = new Uint8ClampedArray(557 * 520 * 4).fill(255);
 for (let y = 25; y < 520; y++) for (let x = 140; x < 455; x++) data.set([60, 40, 130, 255], (y * 557 + x) * 4);
 return fixedBust({width: 557, height: 520, data} as ImageData, rear);
})();
assert.ok(solid.points.every(Number.isFinite), 'a degenerate plate still builds finite geometry');
assert.equal(solid.bodyCount, solid.bodyOnly + solid.objectCount, 'and keeps the same buffer layout');

console.log([
 `Fixed camera: ${source.bodyCount} body points; ${neck} joining points; head depth/width ${(depth / width).toFixed(2)}`,
 `largest enclosed head/shoulder gap by angle: ${gaps.map(([d, g]) => `${d}deg:${g}`).join(' ')} cells (review01: 60deg:8 90deg:25 120deg:49 270deg:9)`,
 `hand/cloth tone ${(handTone / clothTone).toFixed(2)}, hand back/cloth ${(handBackTone / clothTone).toFixed(2)} (review01: 0.71 / 0.96)`,
 '361 camera poses checked. Visual fidelity remains a separate review.',
].join('\n'));
