// A generalised cylinder: a superelliptic cross-section swept along a 3D path
// with parallel-transported frames. Every anatomical volume in the fixed
// portrait is one of these, so a taper, a bend or a flattened face produces the
// matching surface normal instead of a sphere's radial normal.
//
// This is a hand-calibrated volume, not a reconstruction of the drawing. The
// silhouette and colour still come from the original plate; the sweep only
// decides where the surface sits in depth and which way it faces.

export type Station = {
 c: number[]; // axis centre
 rx: number; // half width along the local u axis
 rz: number; // half depth in front of the axis (+v)
 rzBack?: number; // half depth behind the axis; defaults to rz
 power?: number; // superellipse exponent; 2 = ellipse, >2 = squarer, <2 = leaner
};

export type Warp = (t: number, theta: number) => number; // radial offset, world units

// A sweep is an open tube. Where an end is left open the camera can look
// straight down the bore: the far wall of the tube faces away, so the back-face
// fade drops it and the mouth reads as a hole cut into the body. That is exactly
// what produced the oval void under the collar at 90 degrees. `caps` closes an
// end with a dome, and `inside` then counts that dome as solid so neighbouring
// volumes are still culled correctly underneath it.
export type Caps = [boolean, boolean];

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: number[], k: number) => [a[0] * k, a[1] * k, a[2] * k];
export const norm = (a: number[]) => {
 const l = Math.hypot(a[0], a[1], a[2]) || 1;
 return [a[0] / l, a[1] / l, a[2] / l];
};
const smooth = (e0: number, e1: number, v: number) => {
 const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
 return t * t * (3 - 2 * t);
};
const power = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

export class Sweep {
 readonly stations: Station[];
 readonly warp?: Warp;
 readonly caps: Caps;
 private u: number[][] = [];
 private v: number[][] = [];
 private tangent: number[][] = [];
 private cdf: number[] = [];
 readonly min = [Infinity, Infinity, Infinity];
 readonly max = [-Infinity, -Infinity, -Infinity];

 constructor(stations: Station[], warp?: Warp, caps: Caps = [false, false], seedFrame = [1, 0, 0]) {
  if (stations.length < 2) throw new Error('A sweep needs at least two stations');
  this.stations = stations;
  this.warp = warp;
  this.caps = caps;
  const n = stations.length;
  for (let i = 0; i < n; i++) {
   const a = stations[Math.max(0, i - 1)].c, b = stations[Math.min(n - 1, i + 1)].c;
   this.tangent.push(norm(sub(b, a)));
  }
  // Parallel transport keeps the cross-section from spinning along the path;
  // a per-station cross product would flip the frame wherever the axis passes
  // the reference direction and tear the surface open there.
  let u = seedFrame;
  for (let i = 0; i < n; i++) {
   const t = this.tangent[i];
   let candidate = sub(u, scale(t, dot(u, t)));
   if (Math.hypot(candidate[0], candidate[1], candidate[2]) < 1e-6) {
    const alt = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
    candidate = sub(alt, scale(t, dot(alt, t)));
   }
   u = norm(candidate);
   this.u.push(u);
   this.v.push(norm(cross(t, u)));
  }
  // Sample t by surface area so a wide section does not end up sparser than a
  // narrow one, which reads as a brightness band rather than as a shape. The
  // length that matters is along the surface, not along the axis: a section that
  // flares — the trapezius, the collar, the hem — covers far more surface than
  // its axis is long, and measuring the axis left those exactly the places where
  // the figure went dark and patchy.
  let total = 0;
  this.cdf.push(0);
  for (let i = 0; i < n - 1; i++) {
   const a = stations[i], b = stations[i + 1];
   const ra = (a.rx + (a.rzBack ?? a.rz)) / 2, rb = (b.rx + (b.rzBack ?? b.rz)) / 2;
   const slant = Math.hypot(Math.hypot(...sub(b.c, a.c)), rb - ra);
   total += Math.max(1e-6, slant * (ra + rb));
   this.cdf.push(total);
  }
  for (let i = 0; i < this.cdf.length; i++) this.cdf[i] /= total;
  for (let i = 0; i < n; i++) {
   const s = stations[i], cap = (i === 0 && caps[0]) || (i === n - 1 && caps[1]) ? this.capHeight(i ? 1 : 0) : 0;
   const reach = Math.max(s.rx, s.rz, s.rzBack ?? s.rz) + cap + 0.06;
   for (let a = 0; a < 3; a++) {
    this.min[a] = Math.min(this.min[a], s.c[a] - reach);
    this.max[a] = Math.max(this.max[a], s.c[a] + reach);
   }
  }
 }

 // How far the closing dome bulges past the end cross-section. Roughly the mean
 // half-size, so a fingertip closes as a hemisphere and a flattened palm end
 // closes as a matching flattened dome.
 capHeight(end: 0 | 1) {
  const s = this.stations[end ? this.stations.length - 1 : 0];
  return 0.92 * (s.rx + ((s.rz + (s.rzBack ?? s.rz)) / 2)) / 2;
 }

 // The swept axis at t, so a caller can attribute a surface point to the middle
 // of its own volume (used to look colour up inside the right part of the plate
 // instead of in the middle of the whole silhouette row).
 axis(t: number) {return this.at(t).c;}

 // Typical cross-section radius at t, used to judge how far a surface point has
 // strayed from the middle of its own volume in the picture.
 girth(t: number) {const s = this.at(t); return (s.rx + (s.rz + s.rzBack) / 2) / 2;}

 // Lateral surface area, plus any closing domes. Star counts are allocated from
 // this so every volume ends up with the same surface density: allocating them
 // per part instead leaves a visible tonal step wherever two parts meet, which
 // the monochrome shape check reads as a brightness break.
 surface() {
  let total = 0;
  for (let i = 0; i < this.stations.length - 1; i++) {
   const a = this.stations[i], b = this.stations[i + 1];
   const ra = (a.rx + (a.rz + (a.rzBack ?? a.rz)) / 2) / 2, rb = (b.rx + (b.rz + (b.rzBack ?? b.rz)) / 2) / 2;
   const slant = Math.hypot(Math.hypot(...sub(b.c, a.c)), rb - ra);
   total += slant * Math.PI * (ra + rb);
  }
  for (const end of [0, 1] as const) if (this.caps[end]) {
   const r = this.girth(end);
   total += 2 * Math.PI * r * this.capHeight(end);
  }
  return total;
 }

 // Map an area-uniform parameter to the path parameter.
 area(q: number) {
  const n = this.cdf.length;
  let i = 0;
  while (i < n - 2 && q > this.cdf[i + 1]) i++;
  const span = this.cdf[i + 1] - this.cdf[i] || 1;
  return (i + (q - this.cdf[i]) / span) / (n - 1);
 }

 // Catmull-Rom, not linear. Linear station blending makes the sweep a stack of
 // truncated cones: the radius slope is constant inside a segment and jumps at
 // every station, so the normals come out in flat horizontal bands and the head
 // shades like a set of stacked rings. A C1 spline removes the bands.
 private at(t: number) {
  const n = this.stations.length, s = Math.max(0, Math.min(n - 1.000001, t * (n - 1)));
  const i = Math.floor(s), f = s - i;
  const pick = (k: number) => this.stations[Math.max(0, Math.min(n - 1, k))];
  const spline = (get: (st: Station) => number) => {
   const p0 = get(pick(i - 1)), p1 = get(pick(i)), p2 = get(pick(i + 1)), p3 = get(pick(i + 2));
   return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
  };
  const mix = (x: number, y: number) => x + (y - x) * f;
  return {
   c: [0, 1, 2].map((k) => spline((st) => st.c[k])),
   u: [0, 1, 2].map((k) => mix(this.u[i][k], this.u[i + 1][k])),
   v: [0, 1, 2].map((k) => mix(this.v[i][k], this.v[i + 1][k])),
   rx: Math.max(1e-4, spline((st) => st.rx)),
   rz: Math.max(1e-4, spline((st) => st.rz)),
   rzBack: Math.max(1e-4, spline((st) => st.rzBack ?? st.rz)),
   power: Math.max(1.2, spline((st) => st.power ?? 2)),
  };
 }

 point(t: number, theta: number) {
  const s = this.at(t), e = 2 / s.power;
  const cs = power(Math.cos(theta), e), sn = power(Math.sin(theta), e);
  // Front and back depth differ (a face is flatter than an occiput); blend them
  // across the ear line so the join stays smooth instead of creasing.
  const w = smooth(-0.3, 0.3, Math.sin(theta));
  const r = s.rzBack + (s.rz - s.rzBack) * w;
  const offset = this.warp ? this.warp(t, theta) : 0;
  const radial = norm([s.u[0] * cs * s.rx + s.v[0] * sn * r, s.u[1] * cs * s.rx + s.v[1] * sn * r, s.u[2] * cs * s.rx + s.v[2] * sn * r]);
  return [0, 1, 2].map((k) => s.c[k] + s.u[k] * cs * s.rx + s.v[k] * sn * r + radial[k] * offset);
 }

 // The closing dome on an end. `phi` runs from the pole (0) to the rim (pi/2),
 // where it meets `point(0|1, theta)` exactly, so the join carries no seam.
 capPoint(end: 0 | 1, phi: number, theta: number) {
  const t = end, s = this.at(t), e = 2 / s.power;
  const index = end ? this.stations.length - 1 : 0;
  const dir = scale(this.tangent[index], end ? 1 : -1);
  const a = Math.sin(phi), b = Math.cos(phi);
  const cs = power(Math.cos(theta), e) * a, sn = power(Math.sin(theta), e) * a;
  const w = smooth(-0.3, 0.3, sn);
  const r = s.rzBack + (s.rz - s.rzBack) * w;
  const offset = (this.warp ? this.warp(t, theta) : 0) * a;
  const radial = norm([s.u[0] * cs * s.rx + s.v[0] * sn * r, s.u[1] * cs * s.rx + s.v[1] * sn * r, s.u[2] * cs * s.rx + s.v[2] * sn * r]);
  const h = this.capHeight(end);
  return [0, 1, 2].map((k) => s.c[k] + s.u[k] * cs * s.rx + s.v[k] * sn * r + radial[k] * offset + dir[k] * b * h);
 }

 capNormal(end: 0 | 1, phi: number, theta: number) {
  const h = 1.5e-3;
  const dP = sub(this.capPoint(end, Math.min(Math.PI / 2, phi + h), theta), this.capPoint(end, Math.max(1e-3, phi - h), theta));
  const dA = sub(this.capPoint(end, phi, theta + h), this.capPoint(end, phi, theta - h));
  let n = norm(cross(dA, dP));
  const outward = sub(this.capPoint(end, phi, theta), this.at(end).c);
  if (dot(n, outward) < 0) n = scale(n, -1);
  return n;
 }

 // Normals come from the actual parameterisation, so warps, tapers and bends
 // are all reflected without a separate analytic formula per shape.
 normal(t: number, theta: number) {
  const h = 1.5e-3;
  const t0 = Math.max(0, t - h), t1 = Math.min(1, t + h);
  const dT = sub(this.point(t1, theta), this.point(t0, theta));
  const dA = sub(this.point(t, theta + h), this.point(t, theta - h));
  let n = norm(cross(dA, dT));
  const outward = sub(this.point(t, theta), this.at(t).c);
  if (dot(n, outward) < 0) n = scale(n, -1);
  return n;
 }

 // Closest approach to the swept axis, used to drop surfaces that end up buried
 // inside a neighbouring volume at a join.
 inside(p: number[], margin = 1) {
  for (let a = 0; a < 3; a++) if (p[a] < this.min[a] || p[a] > this.max[a]) return false;
  const n = this.stations.length;
  let best = -1, bestDistance = Infinity, past: -1 | 0 | 1 = -1;
  for (let i = 0; i < n - 1; i++) {
   const a = this.stations[i].c, b = this.stations[i + 1].c, ab = sub(b, a);
   const len = dot(ab, ab) || 1;
   const raw = dot(sub(p, a), ab) / len, f = Math.max(0, Math.min(1, raw));
   const q = [0, 1, 2].map((k) => a[k] + ab[k] * f);
   const d = Math.hypot(...sub(p, q));
   if (d < bestDistance) {
    bestDistance = d;
    best = (i + f) / (n - 1);
    // A sweep is an open tube unless an end is capped. Without this the first
    // and last cross-sections would extend forever along the axis, so a torso
    // would swallow the collar above it and a skull the crown of hair above.
    past = i === 0 && raw < 0 ? 0 : i === n - 2 && raw > 1 ? 1 : -1;
   }
  }
  if (past >= 0) {
   const end = past as 0 | 1;
   if (!this.caps[end]) return false;
   // Inside the closing dome: the same superellipse, plus how far the point sits
   // out along the axis measured against the dome's own height.
   const s = this.at(end), d = sub(p, s.c);
   const dir = scale(this.tangent[end ? n - 1 : 0], end ? 1 : -1);
   const axial = Math.max(0, dot(d, dir)) / Math.max(1e-4, this.capHeight(end));
   const x = dot(d, s.u), z = dot(d, s.v);
   const w = smooth(-0.3, 0.3, z);
   const r = s.rzBack + (s.rz - s.rzBack) * w;
   const around = Math.pow(Math.pow(Math.abs(x) / Math.max(1e-4, s.rx), s.power) +
    Math.pow(Math.abs(z) / Math.max(1e-4, r), s.power), 1 / s.power);
   return Math.hypot(around, axial) < margin;
  }
  const s = this.at(best), d = sub(p, s.c);
  const x = dot(d, s.u), z = dot(d, s.v);
  const w = smooth(-0.3, 0.3, z);
  const r = s.rzBack + (s.rz - s.rzBack) * w;
  const value = Math.pow(Math.abs(x) / Math.max(1e-4, s.rx), s.power) + Math.pow(Math.abs(z) / Math.max(1e-4, r), s.power);
  return Math.pow(value, 1 / s.power) < margin;
 }
}
