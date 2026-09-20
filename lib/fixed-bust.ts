import {backgroundMask} from './portrait-points.ts';
import {STRIDE} from './particle-morph.ts';
import {Sweep, type Station, norm} from './figure-sweep.ts';
import {heldObjectPoints} from './held-object-points.ts';

// ---------------------------------------------------------------------------
// Calibration frame
//
// Everything below is expressed in pixels of the first-pose plate (the left
// third of astral-clean-plate.png, 557 x 941). The plate maps to world space
// isotropically, one scale for both axes.
//
// PLATE_ROWS is the full pose. A caller that only supplies the old 520 row crop
// still gets the whole figure, but every colour below the crop falls back to the
// nearest available row.
// ---------------------------------------------------------------------------
const PLATE_COLUMNS = 557, PLATE_ROWS = 941;
const SPAN = 2.1; // world width of the plate
const ROW0 = 301.5; // plate row that lands on world y = 0

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => {const c = clamp(t); return c * c * (3 - 2 * c);};
const noise = (i: number) => {const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n);};
// A low-discrepancy pair for (along the sweep, around the sweep). Two hashes of
// the same index share the sine's frequency and lay the samples on a lattice,
// which shows up as rings banding across the hair; this does not.
const R2 = [0.7548776662466927, 0.5698402909980532];
const spiral = (i: number, axis: number) => (0.5 + R2[axis] * (i + 1)) % 1;

// `shell` marks a surface that lies over another one — hair over the skull, the
// standing collar around the neck. A shell never buries what it covers: the
// depth test hides that anyway, and culling it is what left a hole where the
// face should be and a black ring inside the collar opening.
// `own` marks a volume that stands in front of the body — the reaching arm and
// the hand. The rear reference is a head-and-shoulders view: it contains no arm
// at all, so a rear-facing surface of the hand samples whatever pale robe
// happens to sit at the same place in that image. That, not the density or the
// light, is why the fingers came out looking like bright cloth. Such a surface
// takes its own front colour instead.
type Piece = {name: string; sweep: Sweep; count: number; skin?: boolean; shell?: boolean; own?: boolean; gain?: number};

// The caller may hand in a mask it already has: the front plate's is needed
// twice, and a flood fill over 557 x 941 is not free on a page load.
function imageSampler(image: ImageData, provided?: Uint8Array) {
 const {data, width: w, height: h} = image, mask = provided ?? backgroundMask(data, w, h);
 return (u: number, v: number) => {
  const x = clamp(Math.round(u * w), 0, w - 1), y = clamp(Math.round(v * h), 0, h - 1);
  let index = y * w + x;
  if (mask[index]) {
   // Walk inwards rather than keeping the antialiased rim: sampling the edge is
   // what smeared dark streaks along the sides of the previous build.
   let found = false;
   for (let r = 2; r <= 54 && !found; r += 3) for (let a = 0; a < 12; a++) {
    const qx = clamp(Math.round(x + r * Math.cos(a * Math.PI / 6)), 0, w - 1);
    const qy = clamp(Math.round(y + r * Math.sin(a * Math.PI / 6)), 0, h - 1);
    if (!mask[qy * w + qx]) {index = qy * w + qx; found = true; break;}
   }
   if (!found) return [0.19, 0.16, 0.34];
  }
  // A gentle lift only. A point cloud never covers the plate completely, so the
  // figure needs a little more than the literal pixel, but the previous 0.86 /
  // 1.2 curve raised a value of 25 to 42 and flattened the plate's own contrast:
  // the deep navy skin came out nearly as pale as the white robe, which is what
  // made the hand read as cloth.
  return [0, 1, 2].map(c => Math.min(1, Math.pow(data[index * 4 + c] / 255, 0.92) * 1.1));
 };
}

// How many stars the figure is drawn with, and how many belong to the sky and
// the held object. The defaults are exactly the build the isolated candidate was
// accepted on; the scene passes its own numbers because the site draws every
// pose from one shared pool, and that pool is sized from the canvas, not from
// this file. `density` scales the figure alone — the same surfaces, the same
// shape, fewer stars on them — so the other two poses keep the star count they
// were designed with. See lib/scene-pool.test.ts.
export type BustDensity = {density?: number; skyCount?: number; objectCount?: number};

export function fixedBust(front: ImageData, rear: ImageData, options: BustDensity = {}) {
 const density = Math.max(0.02, options.density ?? 1);
 const skyStars = Math.max(0, Math.round(options.skyCount ?? 1200));
 const objectCount = Math.max(1, Math.round(options.objectCount ?? 2600));
 const W = front.width, H = front.height;
 const unit = SPAN / W; // world units per plate pixel, both axes
 const X = (column: number) => (column - W / 2) * unit;
 const Y = (row: number) => (ROW0 * (W / PLATE_COLUMNS) - row) * unit;
 const toColumn = (x: number) => x / unit + W / 2;
 const toRow = (y: number) => ROW0 * (W / PLATE_COLUMNS) - y / unit;
 const scale = W / PLATE_COLUMNS; // tolerate a differently sized plate crop
 const px = (column: number) => column * scale;
 const U = (length: number) => px(length) * unit; // plate pixels -> world length
 const P = (column: number, row: number, z: number) => [X(px(column)), Y(px(row)), z];

 const mask = backgroundMask(front.data, W, H);
 const sampleFront = imageSampler(front, mask), sampleRear = imageSampler(rear);

 const rows: number[][] = [];
 for (let y = 0; y < H; y++) {
  let left = W, right = -1;
  for (let x = 0; x < W; x++) if (!mask[y * W + x]) {left = Math.min(left, x); right = Math.max(right, x);}
  rows.push(right < left ? [] : [left, right]);
 }

 // ---------------------------------------------------------------------------
 // Head silhouette, in plate pixels. The hair has its own outline; searching the
 // whole row would fold the shoulder and the sleeve into the skull. The result
 // is smoothed because the raw scanline jitters by a pixel or two and every
 // strand placed on it would inherit that jitter as noise rather than as shape.
 // ---------------------------------------------------------------------------
 const HEAD_TOP = 34, HEAD_BOTTOM = 296;
 const rawHalf: number[] = [], rawMid: number[] = [];
 for (let row = 0; row <= HEAD_BOTTOM; row++) {
  const y = clamp(Math.round(px(row)), 0, H - 1);
  const limit = row < 200 ? [190, 460] : row < 250 ? [215, 400] : row < 285 ? [240, 375] : [255, 350];
  let left = W, right = -1;
  for (let x = Math.round(px(limit[0])); x <= Math.min(W - 1, Math.round(px(limit[1]))); x++) {
   if (!mask[y * W + x]) {left = Math.min(left, x); right = Math.max(right, x);}
  }
  rawHalf.push(right < left ? 0 : (right - left) / 2 / scale);
  rawMid.push(right < left ? 310 : (right + left) / 2 / scale);
 }
 const blur = (source: number[]) => source.map((_, i) => {
  let sum = 0, weight = 0;
  for (let d = -6; d <= 6; d++) {
   const j = i + d;
   if (j < 0 || j >= source.length || !source[j]) continue;
   const k = 1 - Math.abs(d) / 7;
   sum += source[j] * k; weight += k;
  }
  return weight ? sum / weight : source[i];
 });
 const headHalfTable = blur(rawHalf), headMidTable = blur(rawMid);
 const headHalf = (row: number) => headHalfTable[clamp(Math.round(row), 0, HEAD_BOTTOM)] || 22;
 const headMid = (row: number) => headMidTable[clamp(Math.round(row), 0, HEAD_BOTTOM)] || 310;

 // ---------------------------------------------------------------------------
 // Skull and face. Two volumes, not one: this is the core the hair sits on, so
 // it carries the brow, the nose ridge and the chin that identify the profile,
 // and it is as deep as it is wide instead of the flat oval the first build had.
 // ---------------------------------------------------------------------------
 // row, axis column, half width, depth in front of the axis, depth behind it
 const skullTable = [
  [118, 316, 30, 30, 38], [140, 315, 50, 46, 60], [162, 313, 64, 56, 78],
  [185, 311, 72, 61, 88], [208, 309, 76, 62, 92], [232, 306, 73, 60, 86],
  [252, 303, 60, 55, 74], [270, 300, 50, 48, 60], [285, 298, 38, 40, 46],
  [297, 297, 24, 30, 32],
 ];
 const profile = (t: number, theta: number) => {
  const facing = Math.max(0, Math.sin(theta)), narrow = Math.pow(facing, 5);
  const at = (centre: number, width: number) => Math.exp(-Math.pow((t - centre) / width, 2));
  return U(6) * facing * facing * at(0.34, 0.10) // brow
   + U(11) * narrow * at(0.60, 0.075) // nose ridge
   - U(4) * narrow * at(0.71, 0.05) // under the nose
   + U(3) * narrow * at(0.80, 0.06) // lips
   - U(3) * narrow * at(0.88, 0.05)
   + U(3) * narrow * at(0.96, 0.05); // chin
 };
 const skull = new Sweep(skullTable.map(([row, column, half, ahead, behind]) => ({
  c: P(column, row, 0), rx: U(half), rz: U(ahead), rzBack: U(behind), power: row > 240 ? 2.4 : 2.15,
 } as Station)), profile, [true, true]);

 // ---------------------------------------------------------------------------
 // Hair. The first build swept one superellipse per row through the plate's own
 // hair outline: 238 px wide but only ~110 px deep, which is a pancake, and from
 // the side it read as a flat-topped helmet with the station spacing showing as
 // horizontal bands. Here the hair is an inner shell that follows the skull plus
 // a set of individual locks that carry the width, the layering and the ragged
 // edge, and whose depth tracks their own width so the mass stays head-shaped.
 // ---------------------------------------------------------------------------
 const strands = (t: number, theta: number) =>
  Math.sin(theta * 6 + t * 7) * 0.3 + Math.sin(theta * 11 - t * 13) * 0.18 + Math.sin(theta * 3 + t * 4.5) * 0.34;
 // The scalp mass: the skull plus about 22 px of hair all round, so it stays as
 // deep as it is wide. It deliberately does NOT reach the plate's hair outline —
 // that outline is 238 px across at row 130 only because the cut sweeps out
 // sideways, and sweeping one cross-section through it is what produced the flat
 // pancake. Reaching it is the individual locks' job, and only in width.
 // Skull plus about six px, not fifteen. The locks add their own thickness, the
 // tip lift and the alternate course step on top of this, and measured at the
 // profile that stacked up to 155 px behind the axis against the skull's own 92:
 // a head 260 px deep and 209 px wide, which is the ball the review reads at 90
 // degrees whatever the locks do. The drawing's hair lies on the skull; only the
 // sideways sweep is allowed to leave it, and that is the locks' own reach.
 const shellTable = [
  [58, 320, 16, 16, 18], [76, 319, 30, 28, 33], [90, 318, 39, 36, 43], [104, 317, 46, 41, 51],
  [126, 316, 64, 53, 70], [150, 314, 76, 62, 83], [176, 312, 84, 69, 92],
  [200, 310, 83, 70, 95], [226, 307, 75, 65, 89], [248, 304, 62, 57, 78],
 ];
 const hairShell = new Sweep(shellTable.map(([row, column, half, ahead, behind]) => ({
  c: P(column, row, -U(4)), rx: U(half), rz: U(ahead), rzBack: U(behind), power: 2.2,
 } as Station)), (t, theta) => U(5) * strands(t, theta), [true, false]);
 // Where the hair stops, by azimuth: a fringe over the brow, locks past the
 // ears, the nape at the back, ragged so the edge is not the brim of a hat.
 // The hairline itself, and the ragged edge drawn on it. The two are separate
 // because they answer different questions: where hair grows from is smooth, and
 // asking the ragged version whether the nape course may exist cut that course
 // away wherever the noise dipped, leaving a strip of background between the
 // last tip and the collar — the enclosed void the shape check reads at 120.
 const hairLine = (theta: number) => 236 - 62 * Math.sin(theta);
 const hairEdge = (theta: number) => hairLine(theta) +
  15 * (Math.sin(theta * 9 + 1.7) * 0.6 + Math.sin(theta * 17 + 0.4) * 0.4);
 const shellAt = (row: number, field: number) => {
  let i = 0;
  while (i < shellTable.length - 2 && row > shellTable[i + 1][0]) i++;
  const a = shellTable[i], b = shellTable[i + 1];
  const f = clamp((row - a[0]) / (b[0] - a[0]));
  return a[field] + (b[field] - a[field]) * f;
 };

 // A lock of this hair is a flat ribbon, not a tube. That is what the drawing
 // shows — every lock is a broad tapering plane with a bright top edge, a dark
 // under edge and a point — and it is also the only cross-section that can carry
 // the plate's outline honestly. The hair is 238 px across at row 130 over a
 // cranium 100 px wide because the cut sweeps sideways; a ribbon that flares
 // 45 px past the scalp there adds 45 px of width and nothing at all to the
 // depth, whereas the round strands it replaces added both, which is what kept
 // the mass reading as a ball from every angle however tightly it was bounded.
 //
 // The section is oriented by seeding the sweep's frame with the direction
 // around the head, so `rx` is the ribbon's width across its own sweep and `rz`
 // its thickness through the scalp.
 const locks: Sweep[] = [];
 const ribbon = (rootRow: number, tipRow: number, a0: number, sweep: number,
  width: number, thick: number, outer: number, lift: number) => {
  const stations: Station[] = [];
  for (let q = 0; q <= 5; q++) {
   const f = q / 5, ease = Math.pow(f, 0.92);
   const row = rootRow + (tipRow - rootRow) * ease;
   const a = a0 + sweep * f * f;
   // Peel by distance travelled from the root, not by progress along the lock,
   // so a lock rooted at the crown and one rooted at the temple are both out on
   // the drawing's outline by the time their tips reach it.
   const peel = smooth(Math.abs(row - rootRow) / 34);
   const scalpX = shellAt(row, 2);
   const across = scalpX + Math.max(0, headHalf(row) * outer - scalpX) * peel;
   const scalpZ = Math.sin(a) >= 0 ? shellAt(row, 3) : shellAt(row, 4);
   // Only the ribbon's own thickness comes off the scalp, plus the lift that
   // stands its tip proud of the layer underneath. That step is the layer edge:
   // it notches the silhouette, and it turns the covering lock's own edge away
   // from the camera so the back-face fade draws a seam there — which is what
   // the shape check reads as one lock lying over another rather than as a shell.
   // The tip lift fades out over the nape. Hair lies down where it meets the
   // collar rather than flaring off it, and a lock still standing 15 px proud at
   // row 272 leaves a step the collar's own surface cannot reach across — the
   // enclosed void the shape check reads at 120 degrees.
   const along = scalpZ + lift + 15 * peel * peel * (1 - smooth((row - 236) / 44));
   // A lock is a plate that ends in a point, not a spindle. Tapering from the
   // root — 1 - 0.84*f^1.4 — narrowed every lock to a sixth of its width by
   // halfway, so no lock had an edge wide enough to be its own shape and the
   // course averaged back into one mass. This holds the plate near full width
   // through its length and puts the point in the last fifth.
   const taper = 1 - 0.9 * Math.pow(f, 2.4);
   stations.push({
    c: [X(px(headMid(row) + Math.cos(a) * across)), Y(px(row)), Math.sin(a) * U(along) - U(6)],
    // Squarer than an ellipse for the same reason the fingers are: the fade that
    // drops a surface turning away is the only strong contrast this renderer
    // has, so a lock wants a flat face at full opacity and a quick turn at its
    // edge, which is the seam the layering has to read by.
    rx: U(Math.max(2.5, width * taper)), rz: U(Math.max(1.6, thick * taper)), power: 2.9,
   });
  }
  locks.push(new Sweep(stations, undefined, [true, true], [-Math.sin(a0), 0, Math.cos(a0)]));
 };
 // A course of shingles per entry: where it leaves the scalp, where its tips end
 // at the front and at the back, how many locks it carries, half width, half
 // thickness, how far out the tips reach against the plate's own hair outline,
 // and how far the course rides off the scalp. The last entry runs upwards: the
 // drawing's hair reaches row 34 and the scalp only row 58, so the crown needs
 // spikes or it is a swim cap.
 //
 // Every course is about fifty plate rows long, and they start twenty-eight
 // rows apart. That is the whole correction this table carries. The previous
 // five bands ran 118, 130 and 134 rows from root to tip — the height of the
 // whole side of the head — so each one passed straight over the tips of the
 // band above it and only the outermost course's tips were ever exposed. Six
 // rings of hundred-row ribbons is not a layered cut: it is a curtain, and at
 // the coverage where the partings finally showed, a curtain is what the review
 // saw. Short courses put seven lines of tips between the crown and the collar,
 // which is what the drawing has.
 const COURSES = [
  [44, 92, 96, 16, 30, 7, 0.78, 3],
  [72, 122, 132, 18, 32, 8, 0.92, 4],
  [100, 150, 166, 20, 30, 8.5, 0.97, 4],
  [128, 172, 200, 20, 27, 8.5, 0.97, 4],
  [156, 190, 232, 18, 25, 8, 0.97, 4],
  [184, 202, 258, 18, 22, 7.5, 0.96, 4],
  // The nape course ends on the collar's own top row, 272: stopping ten rows
  // short leaves a ragged strip of background between the hair and the collar
  // that the enclosed-void check reads at 270 degrees.
  [212, 216, 272, 16, 20, 7, 0.95, 4],
  [98, 47, 55, 10, 11, 6, 0.60, 5],
 ];
 // The drawing is parted just left of the crown and everything sweeps one way
 // from there. Letting each lock curl whichever way it liked is what made the
 // mass read as a generic mop instead of as this cut.
 const PART = 1.9;
 COURSES.forEach(([rootRow, tipFront, tipBack, count, width, thick, outer, lift], band) => {
  for (let j = 0; j < count; j++) {
   const id = band * 17 + j;
   const jitter = (k: number) => noise(id * 9.13 + k * 3.7) - 0.5;
   // Half a step of offset on alternate courses, so one course's tips fall over
   // the gaps in the course above rather than lining up into one continuous rim.
   // The 4-fold grouping this line used to carry is gone: it was a guess at
   // making partings visible when the locks were too long to show any, and what
   // it actually produced was the few large petals the review then read. With
   // short courses the irregularity is per lock, which is where the drawing puts
   // it.
   const a0 = PART + (j + 0.5 + 0.5 * (band % 2)) / count * Math.PI * 2 + jitter(1) * 0.20;
   // Hair does not grow below the hairline. The lower courses exist round the
   // sides and the nape but must not root on the cheek, and their own tip row
   // cannot answer that — a course rooted at row 212 would start below the brow.
   if (band < COURSES.length - 1 && rootRow > hairLine(a0) - 16) continue;
   // Where the course's tips stop, by azimuth. The exponent keeps the whole front
   // arc short rather than only the one lock that faces the camera: the drawing
   // clears the brow and the cheek from the fringe outwards, and interpolating
   // straight in sin(a) hung hair over most of the face.
   const tip = tipFront + (tipBack - tipFront) * Math.pow(0.5 - 0.5 * Math.sin(a0), 0.72);
   // Every other lock in a band rides a lock's thickness higher than the two
   // beside it, the way hair actually falls. That step is what the renderer can
   // show: relief alone is nearly invisible here — the shading term spans 11% —
   // but a surface that turns away is dropped by the back-face fade, so the
   // raised lock's own edge draws a dark seam down each side of it from every
   // camera angle. Laying a whole band at one radius gives a smooth tube with
   // shallow scallops, which is the shell the review rejected.
   ribbon(rootRow + 9 * jitter(2), tip + 14 * jitter(3), a0, 0.27 + 0.12 * jitter(4),
    width * (1 + 0.3 * jitter(5)), thick, outer, lift + (j % 2 ? 1.6 * thick : 0));
  }
 });

 // ---------------------------------------------------------------------------
 // Neck, collar, torso. The shoulder yoke is part of the torso sweep now. It
 // used to be a separate tube running across the body, and at 90 degrees the
 // camera looked straight into its open end: that bore, with the torso surface
 // culled inside it, is the oval void reported under the collar.
 // ---------------------------------------------------------------------------
 const neck = new Sweep([
  {c: P(305, 254, -U(5)), rx: U(34), rz: U(32), rzBack: U(38), power: 2.1},
  {c: P(303, 280, -U(8)), rx: U(35), rz: U(33), rzBack: U(42), power: 2.1},
  {c: P(301, 306, -U(12)), rx: U(39), rz: U(35), rzBack: U(47), power: 2.2},
  {c: P(299, 332, -U(17)), rx: U(54), rz: U(42), rzBack: U(60), power: 2.4},
 ], undefined, [true, false]);
 const collar = new Sweep([
  {c: P(304, 272, -U(9)), rx: U(46), rz: U(40), rzBack: U(50), power: 2.6},
  {c: P(302, 300, -U(13)), rx: U(58), rz: U(48), rzBack: U(60), power: 2.8},
  {c: P(300, 330, -U(18)), rx: U(76), rz: U(58), rzBack: U(72), power: 3.0},
  {c: P(299, 356, -U(20)), rx: U(92), rz: U(64), rzBack: U(80), power: 3.0},
 ]);

 // The first station sits inside the neck so the tube's open top is never seen,
 // and the widening between it and the shoulder line is the trapezius.
 const torsoTable = [
  [288, 302, 28, 30, 34], [306, 300, 62, 46, 56], [332, 298, 104, 64, 74],
  [366, 302, 121, 74, 84], [420, 308, 123, 79, 89], [500, 314, 127, 81, 91],
  [600, 320, 141, 87, 99], [720, 328, 158, 96, 110], [850, 336, 178, 106, 122],
  [941, 340, 190, 112, 130],
 ];
 const torso = new Sweep(torsoTable.map(([row, column, half, ahead, behind]) => ({
  c: P(column, row, 0), rx: U(half), rz: U(ahead), rzBack: U(behind), power: 2.7,
 } as Station)));

 // ---------------------------------------------------------------------------
 // The outstretched arm. It is foreshortened in the plate, so no depth-from-
 // silhouette rule can recover it: this is a skeleton whose projection matches
 // the drawing and whose depth puts the palm well in front of the chest. It is
 // one sweep from shoulder to wrist, because two abutting sweeps meet mouth to
 // mouth and crack open at the elbow.
 // ---------------------------------------------------------------------------
 const arm = new Sweep([
  {c: P(206, 334, -U(4)), rx: U(50), rz: U(48), power: 2.2},
  {c: P(158, 388, U(18)), rx: U(45), rz: U(43), power: 2.2},
  {c: P(108, 452, U(52)), rx: U(39), rz: U(37), power: 2.2},
  {c: P(94, 516, U(98)), rx: U(32), rz: U(31), power: 2.2},
  {c: P(108, 572, U(138)), rx: U(27), rz: U(26), power: 2.2},
 ], undefined, [true, false]);
 // Palm: a slab, wider than it is thick, tilted so its face looks up and out,
 // with the thenar mound on the thumb side so it is not a flat card. It runs
 // from the heel at the wrist to the knuckle line and no further. The previous
 // one ran from (96,580) diagonally to (188,500), which is the ground the
 // drawing gives to the index and middle fingers: with the four thin fingers
 // then bunched into the ring-and-little corner, the near half of the hand was
 // one smooth mitten and no spacing or radius applied to those four could fix
 // it, because they were not where the hand is.
 // It also reaches up behind the fingers instead of stopping at the knuckles.
 // What the drawing shows between two fingers is the palm, thirty pixels further
 // back; leaving that ground unclaimed hands it to the garment pass, whose sheet
 // has a thirty pixel floor on its own thickness and therefore closes in front
 // of the fingers and flattens the whole hand into one plane.
 const palm = new Sweep([
  {c: P(98, 602, U(126)), rx: U(40), rz: U(15), power: 3.0},
  {c: P(126, 580, U(146)), rx: U(52), rz: U(16), power: 3.2},
  {c: P(156, 556, U(164)), rx: U(58), rz: U(16), power: 3.2},
  {c: P(190, 530, U(176)), rx: U(52), rz: U(14), power: 3.0},
  {c: P(224, 508, U(180)), rx: U(38), rz: U(12), power: 3.0},
 ], (t, theta) => U(5) * Math.max(0, Math.sin(theta)) * Math.exp(-Math.pow((t - 0.4) / 0.4, 2)), [true, true]);
 // Four fingers standing up out of the knuckle line, plus the long thumb
 // sweeping up-left. Each axis is read off the plate: at row 520 the drawing
 // draws four separate deep-navy runs at columns 103-146, 176-209, 220-245 and
 // 249-262, parted by its own rim light, and following them up and down gives
 // these four lines. The index is the fat short one — it points at the camera,
 // so it is foreshortened to about 50 rows while the little finger spans 90.
 // Four stations, not three, so the knuckle keeps some girth and the finger
 // tapers instead of being one straight pipe. Tips are capped.
 const fingerPlan: number[][][] = [
  [[98, 556, 172], [111, 538, 194], [124, 520, 212], [136, 502, 224]],
  [[150, 576, 168], [170, 547, 186], [190, 518, 200], [208, 489, 209]],
  [[210, 564, 164], [224, 534, 180], [238, 503, 192], [251, 473, 199]],
  [[236, 556, 158], [248, 524, 172], [260, 492, 182], [271, 461, 189]],
 ];
 // Half widths measured off those same runs, corrected for how obliquely each
 // row cuts its own finger. They are two to four times the previous ones: the
 // drawing's fingers are 26 to 36 px across with a rounded pad on the end, and
 // four 8-to-20 px sticks cannot carry that however far apart they are put.
 const fingerGirth = [[17, 16.5, 15.5, 13.5], [17, 15.5, 14, 12], [13, 12, 11, 9.5], [9.5, 9, 8, 7]];
 // A squarer section than an ellipse, on purpose. The renderer fades a surface
 // out as it turns away, so on a round finger the brightest thing the drawing
 // has — the rim light down each edge — is exactly where the points disappear,
 // and four round fingers side by side dissolve into one dark band. A flatter
 // face with a quick turn at the corner keeps the whole width of each finger at
 // full opacity and puts the fade in the seam between them, which is where the
 // eye reads the separation. It is also the shape of a finger pad.
 const fingers = fingerPlan.map((plan, i) => new Sweep(plan.map(([column, row, z], j) =>
  ({c: P(column, row, U(z)), rx: U(fingerGirth[i][j]), rz: U(fingerGirth[i][j] * 0.92), power: 3.2} as Station),
 ), undefined, [false, true]));
 // Read off the plate's own tone map: the thumb runs (30,404) to (70,486), and
 // the bright band at x 78..114 below it is the palm's highlight, not the thumb.
 const thumbPlan: number[][] = [[80, 496, 156, 17], [62, 466, 166, 15], [44, 432, 170, 12], [28, 404, 168, 7]];
 const thumb = new Sweep(thumbPlan.map(([column, row, z, r]) => ({
  c: P(column, row, U(z)), rx: U(r), rz: U(r * 0.9), power: 2.4,
 } as Station)), undefined, [false, true]);

 // Stars per unit of surface. One number for every volume, so the density of the
 // finished cloud is a property of the surface and not of a per-part guess: a
 // part that was allocated too few showed up as a darker panel with a hard edge
 // where its neighbour took over.
 const PER_AREA = 14400 * density;
 // The floor keeps a small piece from disappearing entirely; it has to scale
 // with the density too, or ninety hair locks alone would outvote the budget.
 const PIECE_FLOOR = Math.max(24, Math.round(400 * density));
 const solid = (name: string, sweep: Sweep, extra: Partial<Piece> = {}, weight = 1): Piece =>
  ({name, sweep, count: Math.max(PIECE_FLOOR, Math.round(sweep.surface() * PER_AREA * weight)), ...extra});
 const pieces: Piece[] = [
  // Weights carry what surface area alone cannot: the hair is seventy-odd locks
  // lying on top of each other, so its total surface is many times the area it
  // actually shows, and the arm spends most of its length inside a sleeve.
  // Measured with 03-r3-coverage.mjs, the head had ink on 17.8% of its own area
  // at every stop, and at 25.4% — these two weights doubled — the mono head
  // starts to show the lock groups the review is asking for
  // (frames/03-r3-hairtest-front-mono.png against 03-r3-front-mono.png). Doubled
  // costs 8,400 stars, which the figure's budget cannot fund; a quarter more can
  // be funded out of the garment, and under the main scene's own visibility
  // rules that lands the close stops at about the level the test read at. How
  // much of the rest the site's shader supplies is the open question written up
  // in 03-shape-ready-r3.md, not something this file should pay for by quietly
  // inflating the build.
  solid('hairShell', hairShell, {shell: true}, 0.25),
  ...locks.map((sweep, i) => solid('lock' + i, sweep, {shell: true}, 0.30)),
  solid('skull', skull, {skin: true}),
  solid('neck', neck, {skin: true}),
  solid('collar', collar, {shell: true}),
  solid('torso', torso),
  solid('arm', arm, {own: true}, 0.7),
  // The hand carries the finest thing the drawing draws. Its fingers are 26 to
  // 36 plate px across and the gaps between them 4 to 30, which at the first
  // chapter's stop is ten to fifteen screen pixels — while a fold of the robe is
  // a hundred. Stars per unit of surface is the right rule for a smooth sheet
  // and the wrong one here: measured with 03-r3-coverage.mjs, the hand ends up
  // with ink on 12.9% of its own area at that stop, which cannot resolve a
  // finger edge however well the finger is modelled. These weights are the one
  // place the allocation is told about feature size rather than area, and the
  // garment share below is reduced by the same amount so the figure's budget is
  // unchanged — see the note on DRAPE.
  solid('palm', palm, {skin: true, own: true}, 3.4),
  ...fingers.map((sweep, i) => solid('finger' + i, sweep, {skin: true, own: true}, 4.2)),
  solid('thumb', thumb, {skin: true, own: true}, 4.2),
 ];
 const solids = pieces.filter(piece => !piece.shell);

 // Rear reference: astral-rear-shoulders-v22 is this pose seen from behind, head
 // and shoulders only. Below its coverage the back of the robe falls back to the
 // mirrored front fabric, which shares the palette but is not a real rear view.
 const rearAnchors = [[35, 0.02], [200, 0.26], [300, 0.42], [360, 0.53], [470, 0.86], [620, 1]];
 const rearV = (row: number) => {
  let i = 0;
  while (i < rearAnchors.length - 2 && row > rearAnchors[i + 1][0]) i++;
  const a = rearAnchors[i], b = rearAnchors[i + 1];
  return clamp(a[1] + (b[1] - a[1]) * (row - a[0]) / (b[0] - a[0]));
 };
 const rearU = (x: number) => clamp(0.523 - (x - 0.1565) * 0.562, 0.02, 0.98);

 const values: number[] = [];
 const coverage = new Uint8Array(W * H);
 const lastRow = Math.min(H, Math.round(px(PLATE_ROWS))) - 1;
 // Depth occupied by the solid volumes at each plate pixel. The garment reads
 // this back, so a sleeve wraps the arm inside it instead of being a slab
 // centred on z = 0 like the previous double sheet.
 const zHigh = new Float32Array(W * H).fill(-1e9), zLow = new Float32Array(W * H).fill(1e9);

 // `axis` is the middle of the volume the point belongs to. A surface that faces
 // sideways has no pixels of its own in a front/back pair, so its colour has to
 // be borrowed; borrowing from the middle of the whole silhouette row is what
 // painted the fingers and the thumb in bright sleeve fabric, because at those
 // rows the middle of the row is the robe.
 const emit = (p: number[], n: number[], skin: boolean, seed: number, axis: number[] | null, spread = 0, own = false, gain = 1) => {
  const column = clamp(toColumn(p[0]), 0, W - 1), row = toRow(p[1]);
  const sampled = clamp(row, 0, lastRow);
  // A surface point that lies near the rim of its own volume in the picture has
  // no pixels of its own: the plate draws an edge there, and on this art that
  // edge is a bright rim light. Judging that by the normal's z alone missed the
  // half of a finger that is displaced sideways yet still faces the camera, and
  // that is what kept painting the hand in pale cloth tones. Distance from the
  // volume's own axis in the picture is the honest measure.
  const ax = axis ? toColumn(axis[0]) : column, ay = axis ? toRow(axis[1]) : row;
  const off = Math.hypot(column - ax, row - ay);
  // Step inwards by a bounded distance. Pulling a large proportion of the girth
  // moved the torso's flank sampling most of a body width towards the middle of
  // the robe and left a hard vertical brightness seam where the garment took
  // over, so the fraction is small and capped in absolute pixels as well. The
  // fixed three-pixel term that used to sit on top of it is gone: on a volume as
  // narrow as a finger it was a third of the half width, and it took with it the
  // dark-bright-dark run the drawing separates the fingers by — which at the
  // wide stop, where a finger is fifteen screen pixels across, is the only thing
  // that can distinguish them. Measured with 03-r2-hand-profile.mjs.
  const step = spread > 0 ? Math.min(off, Math.min(px(15), 0.34 * spread)) : 0;
  const scaled = off > 1e-6 ? step / off : 0;
  const u = clamp((column + (ax - column) * scaled) / W);
  const v = clamp(row + (ay - row) * scaled, 0, lastRow);
  const cf = sampleFront(u, v / H);
  const plateRow = sampled / scale;
  // How much of the rear reference actually applies here. It covers the head and
  // the upper back only; further down it has run out of picture, and stretching
  // its last rows across the whole width is what put horizontal colour bands
  // across the robe from behind.
  const fit = own ? 0 : 1 - smooth((plateRow - 430) / 150);
  const mirrored = own ? cf.map(c => c * 0.8) : sampleFront(1 - u, v / H).map(c => c * 0.86);
  const cb = fit > 0.002
   ? sampleRear(rearU(p[0]), rearV(plateRow)).map((c, a) => c * fit + mirrored[a] * (1 - fit))
   : mirrored;
  const weight = smooth((n[2] + 0.42) / 0.84);
  const colour = cf.map((c, a) => c * weight + cb[a] * (1 - weight));
  const peak = Math.max(...colour);
  // Density is close to uniform on purpose. The previous build let the plate's
  // tone drive how many stars a surface got, so the deep navy face and the dark
  // inner robe thinned out until they read as holes rather than as dark surfaces
  // — the tone belongs in the colour, not in the coverage.
  if (noise(seed) > (skin ? 0.66 + 0.24 * peak : 0.6 + 0.28 * peak) * gain) return;
  const light = 0.86 + 0.2 * Math.max(0, n[0] * -0.42 + n[1] * 0.55 + n[2] * 0.72);
  values.push(p[0], p[1], p[2], ...colour.map(c => Math.min(1, c * light)), n[0], n[1], n[2], 0, 0, 0, 0);
 };

 // Claiming a pixel is a geometry fact, not a sampling one: it has to happen for
 // every surface point that survived the joins, or the garment pass fills in
 // behind whichever points the density thinned out and two different surfaces
 // end up interleaved at the same place.
 const claim = (p: number[], solid: boolean) => {
  const cx = Math.round(clamp(toColumn(p[0]), 0, W - 1)), cy = Math.round(clamp(toRow(p[1]), 0, H - 1));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
   const qx = cx + dx, qy = cy + dy;
   if (qx < 0 || qx >= W || qy < 0 || qy >= H) continue;
   const q = qy * W + qx;
   coverage[q] = 1;
   if (!solid) continue;
   if (p[2] > zHigh[q]) zHigh[q] = p[2];
   if (p[2] < zLow[q]) zLow[q] = p[2];
  }
 };

 for (const piece of pieces) {
  const others = solids.filter(other => other !== piece);
  const ends: (0 | 1)[] = [];
  if (piece.sweep.caps[0]) ends.push(0);
  if (piece.sweep.caps[1]) ends.push(1);
  const capCount = Math.round(piece.count * 0.075) * ends.length;
  for (let i = 0; i < piece.count; i++) {
   const theta = spiral(i, 1) * Math.PI * 2;
   let p: number[], n: number[], t: number;
   if (i < capCount) {
    const end = ends[i % ends.length];
    // Uniform on the dome: cos(phi) uniform, not phi itself.
    const phi = Math.acos(clamp(1 - spiral(i, 0), 0, 1));
    t = end;
    p = piece.sweep.capPoint(end, Math.max(0.05, phi), theta);
    n = piece.sweep.capNormal(end, Math.max(0.05, phi), theta);
   } else {
    t = piece.sweep.area(spiral(i, 0));
    p = piece.sweep.point(t, theta);
    n = piece.sweep.normal(t, theta);
   }
   if (piece.name === 'hairShell' && toRow(p[1]) / scale > hairEdge(theta)) continue;
   // Nothing in the hair may stand above the drawing's own ink, which starts at
   // row 34. Two stray cap points at row 25 are invisible, but they are what the
   // measured bounding box is made of, and the rear stop's framing check is then
   // reading a phantom instead of the figure.
   if (piece.shell && toRow(p[1]) / scale < HEAD_TOP - 4) continue;
   // Drop only surfaces that end up buried inside a neighbouring volume, which
   // is what closes the seams at the joins. Shells never bury anything: hair and
   // the collar already sit outside what they cover, and letting them cull would
   // delete the face and leave the hole the first build had.
   let buried = false;
   for (const other of others) if (other.sweep.inside(p, 0.94)) {buried = true; break;}
   if (buried) continue;
   claim(p, !piece.shell);
   emit(p, n, !!piece.skin, i * 31 + piece.count, piece.sweep.axis(t), piece.sweep.girth(t) / unit,
    !!piece.own, piece.gain);
  }
 }

 // ---------------------------------------------------------------------------
 // Draped garment. Every silhouette pixel the volumes did not account for is
 // cloth. It closes into a rounded tube whose depth comes from the body part
 // nearest to it, so the flying sleeve keeps the arm's depth and the profile
 // stops being a flat card; the fold relief comes from the plate's own shading
 // rather than from a sine lattice, which is what put a diamond pattern across
 // the robe and made the normals jump.
 // ---------------------------------------------------------------------------
 const mid = new Float32Array(W * H), thick = new Float32Array(W * H);
 const away = new Float32Array(W * H).fill(1e9), edge = new Float32Array(W * H).fill(1e9);
 for (let q = 0; q < W * H; q++) {
  if (zHigh[q] > -1e8) {mid[q] = (zHigh[q] + zLow[q]) / 2; thick[q] = (zHigh[q] - zLow[q]) / 2; away[q] = 0;}
  if (mask[q]) edge[q] = 0;
 }
 // Two-pass chamfer: distance to the nearest solid, carrying that solid's depth,
 // and distance to the silhouette edge, so the two cloth faces meet at the
 // outline instead of ending in a cut.
 const D1 = 1, D2 = Math.SQRT2;
 const relax = (q: number, r: number, d: number) => {
  if (away[r] + d < away[q]) {away[q] = away[r] + d; mid[q] = mid[r]; thick[q] = thick[r];}
  if (edge[r] + d < edge[q]) edge[q] = edge[r] + d;
 };
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const q = y * W + x;
  if (x > 0) relax(q, q - 1, D1);
  if (y > 0) {
   relax(q, q - W, D1);
   if (x > 0) relax(q, q - W - 1, D2);
   if (x < W - 1) relax(q, q - W + 1, D2);
  }
 }
 for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
  const q = y * W + x;
  if (x < W - 1) relax(q, q + 1, D1);
  if (y < H - 1) {
   relax(q, q + W, D1);
   if (x < W - 1) relax(q, q + W + 1, D2);
   if (x > 0) relax(q, q + W - 1, D2);
  }
 }
 // Blurred luminance drives the fold relief: in this plate a fold is drawn as a
 // bright ridge, so lifting the sheet with the tone reproduces the drawing's own
 // folds. The raw channel is far too noisy — it is full of painted stars.
 const lum = new Float32Array(W * H), tmp = new Float32Array(W * H), RADIUS = 5;
 for (let q = 0; q < W * H; q++) {
  const k = q * 4;
  tmp[q] = (0.24 * front.data[k] + 0.62 * front.data[k + 1] + 0.14 * front.data[k + 2]) / 255;
 }
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let sum = 0, n = 0;
  for (let d = -RADIUS; d <= RADIUS; d++) {const j = clamp(x + d, 0, W - 1); sum += tmp[y * W + j]; n++;}
  lum[y * W + x] = sum / n;
 }
 for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
  let sum = 0, n = 0;
  for (let d = -RADIUS; d <= RADIUS; d++) {const j = clamp(y + d, 0, H - 1); sum += lum[j * W + x]; n++;}
  tmp[y * W + x] = sum / n;
 }
 // A cloth region is a rounded tube as thick as the region is wide: the distance
 // to the silhouette edge is exactly that local half width, so the two faces meet
 // at the outline on their own and a wide sleeve keeps a wide profile. Where a
 // solid volume is nearby the body's own depth caps it, so the robe still hugs
 // the torso instead of ballooning off it.
 const REACH = px(90), FLOOR = U(30), CEIL = U(112), FOLD = U(12);
 const sheet = (x: number, y: number, face: number) => {
  const q = clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1);
  const near = thick[q] * (0.55 + 0.45 * Math.exp(-away[q] / REACH));
  // The floor keeps free cloth from collapsing into a sheet, but it has to fade
  // in with distance from the body: cloth touching a volume takes that volume's
  // own thickness. Applying the floor everywhere put a 30 px cap of garment in
  // front of the reaching fingertip, which is the deepest point of the whole
  // figure and belongs to nothing the drawing has.
  const limit = Math.min(CEIL, Math.max(near, FLOOR * smooth(away[q] / px(45))));
  const round = Math.min(edge[q] * unit * 0.95, limit);
  return mid[q] + face * (round + FOLD * (tmp[q] - 0.5) * Math.min(1, edge[q] / px(26)));
 };

 // Every plate pixel the volumes did not claim, listed once. Sampling row by row
 // with a fixed budget per row instead makes a narrow row denser than a wide one,
 // and that difference is plainly visible as a tonal step in the shape check.
 const drapeTop = Math.round(px(258));
 const open: number[] = [];
 for (let y = drapeTop; y < H; y++) for (let x = 0; x < W; x++) {
  const q = y * W + x;
  if (!mask[q] && !coverage[q]) open.push(q);
 }
 // Scaled by the same density as the solids: the garment is most of the figure,
 // and leaving it at a fixed share of the uncovered pixels would make a sparse
 // build read as a cloak with a ghost inside it.
 // 0.40, not 0.55: this is the share the hand's weights were raised out of, so
 // the figure's total is what it was. The garment can afford it — its features
 // are folds a hundred plate pixels across, and measured at the wide stop it is
 // the least ink-starved thing in the picture relative to what it has to show.
 const DRAPE = Math.round(open.length * 0.33 * density);
 for (let i = 0; i < DRAPE; i++) {
  const q = open[Math.min(open.length - 1, Math.floor(spiral(i, 0) * open.length))];
  const y = Math.floor(q / W), x = q - y * W;
  const face = i % 2 ? 1 : -1;
  const z = sheet(x, y, face);
  // The normal is the gradient of the surface actually being drawn, so folds,
  // the wrap around the body and the closing rim all shade consistently.
  const dx = (sheet(x + 1, y, face) - sheet(x - 1, y, face)) / (2 * unit);
  const dy = -(sheet(x, y + 1, face) - sheet(x, y - 1, face)) / (2 * unit);
  const n = norm([-dx, -dy, 1]).map(v => v * face);
  // The depth field is per pixel but the star must not be: a whole garment
  // pinned to integer plate rows shows as horizontal banding once the plate is
  // drawn smaller than 941 rows tall.
  // Cloth that hangs well in front of the body — the wide sleeve around the
  // reaching arm — has no back in the rear reference either; its far face is the
  // inside of the same sleeve.
  const dp = [X(x + noise(i * 2.7) - 0.5), Y(y + noise(i * 5.3) - 0.5), z];
  // A cloth face that ends up inside a limb is never seen from anywhere on the
  // orbit, so a star on it is budget the picture never gets back. Measured on
  // this build: 4,576 of 23,000 garment stars, 7% of the whole figure, all of
  // them on the sheet's far face where it passes through the torso or the arm.
  // The solids already cull each other this way; the garment pass never did.
  let inside = false;
  for (const s of solids) if (s.sweep.inside(dp, 1)) {inside = true; break;}
  if (inside) continue;
  emit(dp, n, false, i * 17 + 5, null, 0, mid[q] > U(52), 0.94);
 }

 const bodyOnly = values.length / STRIDE;

 // Held object: the existing flame geometry, same shape and same size, moved
 // from the main site's palm to this one.
 //
 // `heldObjectPoints` returns absolute positions — its own pivot is already
 // added in — and repeats that pivot in fields 9..11. So a point's shape is
 // position minus pivot, and re-anchoring means scaling that difference and
 // adding the new anchor, on all three axes. Doing it on x and y but leaving z
 // absolute left the flame's body 0.586 behind the pivot stored with it: the
 // shared rotation code then swung the whole flame around a circle of that
 // radius instead of spinning it where it stands, and at rest it sat inside the
 // chest where the hand hid it. One expression for three axes, no exceptions.
 const flame = heldObjectPoints(objectCount, 0);
 // The palm's own front surface measured 0.80..0.89 across plate rows 500..548,
 // and the flame is 0.218 tall below its pivot, so this anchor stands the flame
 // up out of the cupped palm at plate row 519 rather than through it. Size and
 // shape are the approved object's, untouched.
 const anchor = P(154, 462, U(226)), relative = SPAN / 1.04;
 for (let i = 0; i < objectCount; i++) {
  const k = i * STRIDE;
  const shape = [0, 1, 2].map(a => (flame[k + a] - flame[k + 9 + a]) * relative);
  values.push(
   anchor[0] + shape[0], anchor[1] + shape[1], anchor[2] + shape[2],
   flame[k + 3], flame[k + 4], flame[k + 5], flame[k + 6], flame[k + 7], flame[k + 8],
   anchor[0], anchor[1], anchor[2], flame[k + 12],
  );
 }
 const bodyCount = values.length / STRIDE;

 for (let i = 0; i < skyStars; i++) {
  const y = 1 - 2 * (i + 0.5) / skyStars, r = Math.sqrt(1 - y * y), a = i * 2.39996323, d = 7 + (i % 13) * 0.29;
  const c = i % 3 === 0 ? [0.54, 0.45, 0.83] : i % 3 === 1 ? [0.76, 0.63, 0.4] : [0.55, 0.68, 0.93];
  values.push(Math.cos(a) * r * d, y * d, Math.sin(a) * r * d, ...c, 0, 0, 0, 0, 0, 0, -1);
 }
 // bodyCount still covers everything that is not sky, so the existing renderer
 // keeps working unchanged. objectCount lets the camera work hide the flame in
 // the first two shots by drawing only bodyCount - objectCount.
 return {points: new Float32Array(values), bodyCount, bodyOnly, objectCount};
}

// ---------------------------------------------------------------------------
// The site's particle space, and the one bridge between it and this one.
//
// Every existing pose, the shared pool, ParticleMorph, the microfloat, the sky
// drift and the scene's key/fill lights are written in the coordinates
// portraitPoints produces: the same plate, mapped x = (u-.5)*1.04,
// y = (.5-v)*1.76, with the relief bulging towards -z because the old
// projection, 3/(3+z), looks from -z. This file maps the same plate over
// SPAN 2.1 with y = 0 on row 301.5 and +z towards the camera.
//
// So it is one similarity transform plus a depth flip. Rather than restate the
// whole particle pipeline in these units — which would silently invalidate
// every constant in ParticleMorph, the drift amplitudes and the light
// positions — the figure is converted into the site's space once, at build
// time, and the camera is converted with it. Both directions are exact, and a
// uniform scale leaves normals and pivots correct under the same map.
//
// Sanity check that this is the right pair of frames: the accepted wide stop,
// eye (0.04, -0.72, 7.8), lands at (0.02, -0.04, -3.86) here, next to the
// -z=3 viewpoint the old projection implies. Same viewpoint, same composition.
export const PORTRAIT_SCALE = SPAN / 1.04; // 2.019230…, plate width over plate width
export const PORTRAIT_ORIGIN_Y = (470.5 - ROW0) * SPAN / PLATE_COLUMNS; // 0.637162…

// A point or a pivot. Positions scale, translate and flip; a direction only
// flips, because the scale is uniform and cancels once it is normalised.
export const toPortraitPoint = (p: number[]) =>
 [p[0] / PORTRAIT_SCALE, (p[1] + PORTRAIT_ORIGIN_Y) / PORTRAIT_SCALE, -p[2] / PORTRAIT_SCALE];
export const toPortraitDirection = (v: number[]) => [v[0], v[1], -v[2]];

// The same camera, expressed where the particles live. Depth and both clip
// axes come out scaled by exactly PORTRAIT_SCALE, which cancels in the
// projection's own division, so the framing calibrated in world units is the
// framing the site draws.
export function portraitCamera(angle: number, radius: number, target: number[]) {
 const camera = bustCamera(angle, radius, target);
 return {
  eye: toPortraitPoint(camera.eye),
  right: toPortraitDirection(camera.right),
  up: toPortraitDirection(camera.up),
  back: toPortraitDirection(camera.back),
  radius: camera.radius,
 };
}

// Convert a built figure in place, respecting what each field means for each
// role: positions always, the pivot only where fields 9..11 are a pivot (a
// held object) rather than the body's edge fade, and normals as directions.
export function toPortraitSpace(points: Float32Array) {
 for (let k = 0; k < points.length; k += STRIDE) {
  const position = toPortraitPoint([points[k], points[k + 1], points[k + 2]]);
  points[k] = position[0]; points[k + 1] = position[1]; points[k + 2] = position[2];
  points[k + 8] = -points[k + 8];
  if (points[k + 12] > 0.5) {
   const pivot = toPortraitPoint([points[k + 9], points[k + 10], points[k + 11]]);
   points[k + 9] = pivot[0]; points[k + 10] = pivot[1]; points[k + 11] = pivot[2];
  }
 }
 return points;
}

// A single unwrapped camera angle, with continuously increasing orbit radius.
// The caller may supply the radius so one timeline owns angle and distance
// together; the default keeps the original outward spiral.
//
// The look-at point is the caller's too. One fixed point cannot frame both a
// head close-up and the whole reaching pose: holding it at the head's own height
// left the figure 2.74 below the target and 0.70 above it, so the played wide
// stop had to sit twice as far back as the composition wanted and still cut the
// robe. The default is the original head-height point, so every existing caller
// and check is unchanged.
export function bustCamera(angle:number,radius=4.4*Math.pow(1.15,angle/Math.PI),target:number[]=[.04,.30,0]){
 const eye=[target[0]+Math.sin(angle)*radius,target[1]-.28*Math.sin(angle/2),target[2]+Math.cos(angle)*radius];
 const back=eye.map((v,i)=>v-target[i]),length=Math.hypot(...back);for(let i=0;i<3;i++)back[i]/=length;
 const right=[back[2],0,-back[0]],rl=Math.hypot(...right);for(let i=0;i<3;i++)right[i]/=rl;
 const up=[back[1]*right[2],back[2]*right[0]-back[0]*right[2],-back[1]*right[0]];
 return {eye,right,up,back,radius};
}
