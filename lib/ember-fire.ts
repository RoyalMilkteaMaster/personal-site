/**
 * Ticket 41 — the maths behind /我的作品's fire v4（方案 B：Canvas 2D 火層）.
 *
 * v3 burned a perfect circle outwards and tore its edge with an SVG filter; the
 * user's verdict was that it still「感覺就像一個圈往外而已」. The analysis the
 * user signed off on says real burning paper does five things, and this file is
 * the pure half of all five so `lib/ember-fire.test.ts` can run them in plain
 * node with no canvas and no DOM:
 *
 *   ① 燃燒前緣不規則 — every point of the film has a BURN TIME, not a radius:
 *      `distance from the centre × (1 + 0.35 × value noise)`. A threshold sweeps
 *      that field from 0 upwards, so the front is a tongue-shaped level set that
 *      bites deep where the noise is low and lags where it is high. Two points
 *      the same distance from the centre burn at different moments — that is the
 *      whole difference from v3.
 *   ② 焦邊帶＋餘燼 — the colours are read off the DISTANCE AHEAD OF THE FRONT
 *      (`burn time − threshold`), which is why the char ring and the glowing
 *      line follow the tongues instead of a circle: 0–6px ahead is char (the
 *      card's own deep tint crushed to near-black brown), 6–14px is the ember
 *      band (base → hot, flickering ±40%).
 *   ③ 火焰往上竄 — a DOOM-fire heat map seeded on the front and propagated
 *      UPWARD only, cooling randomly. Never sideways-only, never down.
 *   ④ 顏色由熱度決定 — one ramp, hot → light → base → deep → transparent, fed
 *      from the card's own `--ember-tint*`; nothing here knows a colour.
 *   ⑤ 節奏不均勻 — the front's speed is a low-frequency noise in 0.7–1.3,
 *      integrated into a monotone pace so the burn pauses and surges but still
 *      finishes in exactly the ticket's 3.0s.
 *
 * The component (components/starlit-shell.tsx) does the drawing and nothing
 * else: it owns the canvas, the clip path and the frame loop, and every number
 * it paints comes from here.
 */

// ---------------------------------------------------------------------------
// Timing — Ticket 41.6. Exported from the shell too, so the tests that pin the
// tempo and the JS timers that unmount the canvas read the same numbers.
// ---------------------------------------------------------------------------

/** 燒穿總長 ≈ 3.0s（v3 是 2.2s，使用者說還要再慢一點點）。 */
export const EMBER_BURN_MS = 3000;
/** 燒完餘燼與火舌再淡出 0.8s。 */
export const EMBER_FADE_MS = 800;
/** The whole window the canvas is mounted for on the way open. */
export const EMBER_FIRE_MS = EMBER_BURN_MS + EMBER_FADE_MS;
/** 收回（膜長回來）約 1.4s。 */
export const EMBER_CLOSE_MS = 1400;

// ---------------------------------------------------------------------------
// Seeded randomness and value noise. Everything below is a pure function of its
// seed, so a test can fix one and get the same field every run.
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, good enough for embers, and reproducible. */
export const makeRng = (seed: number): (() => number) => {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashLattice = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

export type Noise2D = (x: number, y: number) => number;

/** One octave of value noise on the integer lattice, smoothstep-interpolated. */
export const makeValueNoise = (seed: number): Noise2D => (x, y) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const a = hashLattice(xi, yi, seed);
  const b = hashLattice(xi + 1, yi, seed);
  const c = hashLattice(xi, yi + 1, seed);
  const d = hashLattice(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};

/**
 * Two octaves. The first gives the broad lobes that make one side of the film
 * run ahead of the other; the second puts the bite into each tongue. Returns
 * 0..1 with the mean near 0.5.
 */
export const makeFractalNoise = (seed: number, octaves = 2): Noise2D => {
  const layers = Array.from({ length: octaves }, (_, n) => makeValueNoise(seed + n * 8191));
  return (x, y) => {
    let sum = 0;
    let amp = 1;
    let total = 0;
    for (let n = 0; n < layers.length; n += 1) {
      const f = 2 ** n;
      sum += layers[n](x * f, y * f) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
};

export const clamp = (value: number, low: number, high: number) =>
  value < low ? low : value > high ? high : value;

/**
 * Value noise piles up around 0.5, so a raw ±0.35 factor only ever realises
 * about ±0.07 and the front comes out looking like a slightly wobbly circle —
 * exactly the thing the user rejected in v3. Stretching about the middle makes
 * the amplitude the ticket names the amplitude you actually see.
 */
export const contrast = (n: number, amount: number) => clamp((n - 0.5) * amount + 0.5, 0, 1);
/** How hard the burn field's noise is stretched. */
export const BURN_NOISE_CONTRAST = 1.9;

// ---------------------------------------------------------------------------
// ① The burn-time field.
// ---------------------------------------------------------------------------

/** 噪音幅度 ≈ 0.35（票面 41.2）：±35% on the distance, which is what turns a
 *  circle into tongues. 0 would give v3's circle back. */
export const BURN_NOISE_AMPLITUDE = 0.35;
/** Lattice units per CSS px. 1/45 ≈ one lobe every ~45px across a ~270px card,
 *  so a card carries five or six tongues, not one blob and not static. */
export const BURN_NOISE_SCALE = 1 / 45;
/**
 * The field is computed over the card PLUS this margin, and the outermost cells
 * are forced never to burn. That keeps every level set a closed loop (the clip
 * path needs closed loops) while the ring that never burns lies outside the
 * film, where nothing can see it.
 */
export const FIELD_MARGIN_PX = 20;
/** Cells in the never-burning frame at the edge of the padded grid. */
const FRAME_CELLS = 3;
/** A time no threshold reaches. */
const NEVER = 1e9;

export type BurnField = {
  /** Card size in CSS px — the film's box, not the padded grid's. */
  width: number;
  height: number;
  /** Padded grid. Cell (i, j) is centred at `i * cell + cell / 2 - margin`. */
  cols: number;
  rows: number;
  cell: number;
  margin: number;
  /** Burn time per cell, in px-equivalent units (distance × noise factor). */
  time: Float32Array;
  /** The threshold at which every cell of the CARD has burned. */
  max: number;
  /** The four corners' burn times, in reading order (TL, TR, BR, BL). */
  corners: [number, number, number, number];
};

/**
 * 41.2 —「每像素的『燒掉時間』= 到中心距離 ×（1 + 噪音幅度約 0.35）」.
 * The mean over a circle of radius r is r, so the front still advances outward;
 * what the noise does is decide WHERE it is early and where it is late.
 */
export const burnTimeField = (
  width: number,
  height: number,
  cell = 2,
  seed = 1,
  amplitude = BURN_NOISE_AMPLITUDE,
  scale = BURN_NOISE_SCALE,
  margin = FIELD_MARGIN_PX,
): BurnField => {
  const cols = Math.ceil((width + margin * 2) / cell);
  const rows = Math.ceil((height + margin * 2) / cell);
  const noise = makeFractalNoise(seed);
  const time = new Float32Array(cols * rows);
  const cx = width / 2;
  const cy = height / 2;
  let max = 0;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x = i * cell + cell / 2 - margin;
      const y = j * cell + cell / 2 - margin;
      const frame =
        i < FRAME_CELLS || j < FRAME_CELLS || i >= cols - FRAME_CELLS || j >= rows - FRAME_CELLS;
      if (frame) {
        time[j * cols + i] = NEVER;
        continue;
      }
      const n = contrast(noise(x * scale, y * scale), BURN_NOISE_CONTRAST);
      const t = Math.hypot(x - cx, y - cy) * (1 + amplitude * (n * 2 - 1));
      time[j * cols + i] = t;
      // Only the film's own box decides when the burn is over; the padding is
      // scaffolding for the contour, not part of the card.
      if (x >= -cell && x <= width + cell && y >= -cell && y <= height + cell && t > max) max = t;
    }
  }
  const field: BurnField = {
    width,
    height,
    cols,
    rows,
    cell,
    margin,
    time,
    max,
    corners: [0, 0, 0, 0],
  };
  field.corners = [
    burnTimeAt(field, 0, 0),
    burnTimeAt(field, width, 0),
    burnTimeAt(field, width, height),
    burnTimeAt(field, 0, height),
  ];
  return field;
};

/** Burn time at a point in CARD coordinates (0,0 = the film's top-left). */
export const burnTimeAt = (field: BurnField, x: number, y: number): number => {
  const i = clamp(Math.round((x + field.margin - field.cell / 2) / field.cell), 0, field.cols - 1);
  const j = clamp(Math.round((y + field.margin - field.cell / 2) / field.cell), 0, field.rows - 1);
  return field.time[j * field.cols + i];
};

/**
 * Burn time, interpolated between the four cells around the point instead of
 * snapped to the nearest one. `burnTimeAt` is a staircase with 2px treads, and
 * anything that SOLVES for a radius against it inherits the treads as a twitch —
 * an ember dot jumped 18px in 50ms on the 390 card for no reason but that
 * (Review F5). Rendering still uses the cheap nearest-cell read; this is for the
 * handful of places that need the field to be continuous.
 */
export const burnTimeSmooth = (field: BurnField, x: number, y: number): number => {
  const fx = (x + field.margin - field.cell / 2) / field.cell;
  const fy = (y + field.margin - field.cell / 2) / field.cell;
  const i = clamp(Math.floor(fx), 0, field.cols - 2);
  const j = clamp(Math.floor(fy), 0, field.rows - 2);
  const tx = clamp(fx - i, 0, 1);
  const ty = clamp(fy - j, 0, 1);
  const k = j * field.cols + i;
  const a = field.time[k];
  const b = field.time[k + 1];
  const c = field.time[k + field.cols];
  const d = field.time[k + field.cols + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
};

/** Has the film at this point gone? Strict, so threshold 0 leaves the film whole. */
export const isBurned = (field: BurnField, x: number, y: number, threshold: number) =>
  burnTimeAt(field, x, y) < threshold;

/** How far ahead of the front this point is, in px. Negative = already burned. */
export const aheadOfFront = (field: BurnField, x: number, y: number, threshold: number) =>
  burnTimeAt(field, x, y) - threshold;

// ---------------------------------------------------------------------------
// ⑤ The pace: the front's speed is noise, the total time is not.
// ---------------------------------------------------------------------------

export const FRONT_SPEED_MIN = 0.7;
export const FRONT_SPEED_MAX = 1.3;
const PACE_STEPS = 48;
/** Lattice units per pace step: ~6 surges across the whole burn. */
const PACE_FREQUENCY = 0.12;

/**
 * A monotone map from normalised time (0..1) to normalised threshold (0..1),
 * built by integrating a low-frequency speed noise in [0.7, 1.3] and dividing
 * by the total. Slow stretches read as the paper hesitating, fast ones as a
 * surge — and because it is normalised, 41.6's 3.0s stays 3.0s.
 */
export const makeFrontPace = (seed: number, steps = PACE_STEPS): number[] => {
  const noise = makeValueNoise(seed ^ 0x5bf03635);
  const cumulative = [0];
  let sum = 0;
  for (let i = 0; i < steps; i += 1) {
    // Value noise clusters around 0.5; stretched about the middle it actually
    // reaches the ticket's 0.7 and 1.3 instead of hovering near 1.0, which is
    // the difference between「有停頓、有突進」and a slight ripple.
    const n = clamp((noise(i * PACE_FREQUENCY, 11.7) - 0.5) * 1.9 + 0.5, 0, 1);
    sum += FRONT_SPEED_MIN + n * (FRONT_SPEED_MAX - FRONT_SPEED_MIN);
    cumulative.push(sum);
  }
  return cumulative.map((c) => c / sum);
};

/** Read the pace at normalised time `u`, linearly between its steps. */
export const paceAt = (pace: readonly number[], u: number): number => {
  const x = clamp(u, 0, 1) * (pace.length - 1);
  const i = Math.min(pace.length - 2, Math.floor(x));
  return pace[i] + (pace[i + 1] - pace[i]) * (x - i);
};

/**
 * A few percent past `field.max`, so the last corner is comfortably gone before
 * the 3.0s is up rather than exactly on the last frame.
 */
export const BURN_OVERSHOOT = 1.06;

/** The threshold at normalised time `u` of a burn. */
export const thresholdAt = (field: BurnField, pace: readonly number[], u: number) =>
  field.max * BURN_OVERSHOOT * paceAt(pace, u);

// ---------------------------------------------------------------------------
// ② Colours. Every one is derived from the card's own four tints.
// ---------------------------------------------------------------------------

export type Rgb = readonly [number, number, number];
export type EmberRamp = { hot: Rgb; light: Rgb; base: Rgb; deep: Rgb };

/**
 * 「專屬色」vs「像火」—— the one question this ticket cannot answer on its own.
 *
 * Ticket 41.7 says every colour comes from the card's own `--ember-tint*`, and
 * that is what ships. The consequence, measured by Reviewer P: the gold card has
 * 52–56% of its lit pixels in the amber hues, and the pink and purple cards have
 * **zero** — so those two can read as「粉紅色的光」and「紫色的光」but never as
 * fire, whatever else is done to them.
 *
 * This dial is the cheap way to ask the user instead of guessing. At 0 (the
 * default, and what ships) nothing changes at all — `warmRamp` returns the ramp
 * it was given, untouched. Above 0 it mixes an ember amber into the HOT and
 * LIGHT steps only: the core of a flame goes warm while the outer tongues, the
 * char, the ember band and the card's turning ring all stay in the card's own
 * colour. 0.35 is a good first thing to show someone.
 */
export const EMBER_FIRE_CORE_WARMTH = 0.35;
/** The amber a real ember core sits at. Only ever reached at warmth 1. */
export const EMBER_CORE_AMBER: Rgb = [255, 173, 74];
export const EMBER_CORE_AMBER_LIGHT: Rgb = [255, 208, 130];

export const hexToRgb = (hex: string): Rgb => {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 焦邊：專屬色 deep 再壓暗至近黑帶褐（41.3）。 */
export const CHAR_MIX = 0.86;
export const charColour = (deep: Rgb): Rgb => [
  Math.round(deep[0] * (1 - CHAR_MIX) + 14 * CHAR_MIX),
  Math.round(deep[1] * (1 - CHAR_MIX) + 9 * CHAR_MIX),
  Math.round(deep[2] * (1 - CHAR_MIX) + 6 * CHAR_MIX),
];

/** 41.3 — 0–6px 焦色，6–14px 餘燼帶。 */
export const CHAR_BAND_PX = 6;
export const EMBER_BAND_PX = 14;
/** 餘燼帶亮度以高頻噪音閃爍 ±40%。 */
export const EMBER_FLICKER = 0.4;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * The card's ramp with an amber core mixed into its two brightest steps.
 * `warmth` 0 returns the very same numbers it was handed — that is the contract
 * the unit test pins, because 0 is what ships until the user says otherwise.
 */
export const warmRamp = (ramp: EmberRamp, warmth = EMBER_FIRE_CORE_WARMTH): EmberRamp => {
  const w = clamp(warmth, 0, 1);
  if (w <= 0) return ramp;
  return {
    hot: mix(ramp.hot, EMBER_CORE_AMBER, w),
    light: mix(ramp.light, EMBER_CORE_AMBER_LIGHT, w * 0.7),
    base: ramp.base,
    deep: ramp.deep,
  };
};

/**
 * ④ 顏色階：hot（近白）→ light → base → deep → 透明. `v` is heat in 0..1 and
 * the alpha dies with it, which is what makes a tongue thin out as it rises.
 */
export const heatColour = (v: number, ramp: EmberRamp): [number, number, number, number] => {
  const h = clamp(v, 0, 1);
  if (h <= 0) return [0, 0, 0, 0];
  // Weighted towards the darker end on purpose: with the stops evenly spread,
  // almost every live cell landed in `light`/`hot` and a gold card burned cream.
  // The白熱 core has to be the exception it is in a real flame.
  const alpha = clamp(h / 0.3, 0, 0.94);
  let rgb: Rgb;
  if (h < 0.55) rgb = mix(ramp.deep, ramp.base, h / 0.55);
  else if (h < 0.82) rgb = mix(ramp.base, ramp.light, (h - 0.55) / 0.27);
  else rgb = mix(ramp.light, ramp.hot, clamp((h - 0.82) / 0.18, 0, 1));
  return [rgb[0], rgb[1], rgb[2], alpha];
};

/**
 * The colour of a point `ahead` px in front of the burning edge: char first,
 * then the glowing ember line, then nothing. `flicker` is −1..1.
 */
export const frontBandColour = (
  ahead: number,
  ramp: EmberRamp,
  flicker: number,
): [number, number, number, number] => {
  if (ahead < 0 || ahead >= EMBER_BAND_PX) return [0, 0, 0, 0];
  if (ahead < CHAR_BAND_PX) {
    const c = charColour(ramp.deep);
    // The char is solid at the hole's lip and thins where it meets the embers.
    return [c[0], c[1], c[2], 0.97 - 0.18 * (ahead / CHAR_BAND_PX)];
  }
  // 6px → hot, 14px → base and gone: the glowing line sits against the char.
  const t = (ahead - CHAR_BAND_PX) / (EMBER_BAND_PX - CHAR_BAND_PX);
  const rgb = mix(ramp.hot, ramp.base, t);
  const glow = clamp((1 - t) * (1 + EMBER_FLICKER * flicker), 0, 1.4);
  return [rgb[0], rgb[1], rgb[2], clamp(glow, 0, 1)];
};

/** 餘燼帶內散佈 10–20 個更亮的餘燼點（41.3）。 */
export const EMBER_DOT_MIN = 10;
export const EMBER_DOT_MAX = 20;

/**
 * Review F5 — an ember sits still and breathes; it does not teleport. A dot is
 * therefore a fixed ANGLE and a fixed depth into the ember band, decided once
 * per burn: it rides the front outward as the front moves, and the only thing
 * that changes frame to frame is how bright it is.
 */
export type EmberDot = {
  angle: number;
  offset: number;
  phase: number;
  size: number;
  /** 1 / (the field's local time-per-px on this ray), fixed when the dot is
   *  made. It is what keeps the dot near the front while its radius stays a
   *  straight line in the threshold — see `emberDotPoint`. */
  scale: number;
};

export const makeEmberDots = (rng: () => number, field: BurnField): EmberDot[] => {
  const count = EMBER_DOT_MIN + Math.floor(rng() * (EMBER_DOT_MAX - EMBER_DOT_MIN + 1));
  const cx = field.width / 2;
  const cy = field.height / 2;
  const probe = Math.min(field.width, field.height) * 0.3;
  const dots: EmberDot[] = [];
  for (let i = 0; i < count; i += 1) {
    // Spread over the circle with a jitter, so they are not a regular ring.
    const angle = ((i + rng() * 0.85) / count) * Math.PI * 2;
    const factor = burnTimeSmooth(field, cx + Math.cos(angle) * probe, cy + Math.sin(angle) * probe) / probe;
    dots.push({
      angle,
      offset: CHAR_BAND_PX + 1 + rng() * (EMBER_BAND_PX - CHAR_BAND_PX - 2),
      phase: rng() * Math.PI * 2,
      size: 0.8 + rng() * 1.2,
      scale: 1 / (factor > 0.2 ? factor : 1),
    });
  }
  return dots;
};

/**
 * How far from the centre the front is along `angle`, in px. Marches outward
 * because the field is not invertible — the noise means the crossing is not at
 * `threshold` px. Returns null when the ray never crosses inside `maxRadius`.
 */
export const frontOnRay = (
  field: BurnField,
  threshold: number,
  angle: number,
  maxRadius: number,
  step = 2,
): number | null => {
  const cx = field.width / 2;
  const cy = field.height / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let r = step; r <= maxRadius; r += step) {
    if (burnTimeAt(field, cx + dx * r, cy + dy * r) >= threshold) return r;
  }
  return null;
};

/**
 * Where an ember dot is this frame: on its own ray, at the radius whose burn
 * time is `threshold + offset` — that is, `offset` px ahead of the front.
 *
 * The radius is a STRAIGHT LINE in the threshold — `(threshold + offset) ×
 * scale`, with `scale` fixed when the dot was made. Two things that look more
 * correct were tried and thrown away, both because they make the dot jump:
 * marching outward to the first crossing skips whole tens of pixels the moment
 * an island of late-burning film ahead of it is eaten (22px for 4 units of
 * threshold, measured), and solving `r · factor(r) = threshold + offset` by
 * iteration oscillates where the noise is steep (46px). An ember that teleports
 * 20px is the exact defect Review F5 raised; an ember that sits a couple of
 * pixels off the front is not.
 */
export const emberDotPoint = (
  field: BurnField,
  threshold: number,
  dot: EmberDot,
  maxRadius: number,
): { x: number; y: number } => {
  const cx = field.width / 2;
  const cy = field.height / 2;
  const dx = Math.cos(dot.angle);
  const dy = Math.sin(dot.angle);
  const target = threshold + dot.offset;
  // A STRAIGHT LINE in the threshold, and deliberately nothing more. Two
  // cleverer placements were measured and thrown away: marching outward to the
  // first crossing skips 22px when an island ahead is eaten, and correcting
  // against the local factor amplifies its own gradient into an 18px twitch on
  // the 390 card. A dot a few px off the band reads as an ember; a dot that
  // moves 18px in 50ms reads as noise, which is the whole of Review F5.
  const r = clamp(target * dot.scale, 1, maxRadius);
  return { x: cx + dx * r, y: cy + dy * r };
};

/** Only the brightness moves: a slow breath plus a fast flicker, 0.35–1. */
export const emberDotAlpha = (dot: EmberDot, elapsedMs: number) => {
  const slow = Math.sin(elapsedMs * 0.006 + dot.phase);
  const fast = Math.sin(elapsedMs * 0.021 + dot.phase * 2.3);
  return clamp(0.68 + 0.22 * slow + 0.12 * fast, 0.35, 1);
};

// ---------------------------------------------------------------------------
// ③ The DOOM-fire heat map. Upward only.
// ---------------------------------------------------------------------------

/** Random cooling per step, in heat units; the tongue height falls out of it. */
export const HEAT_COOLING = 0.1;
/**
 * Propagation steps per frame. One step is one cell, so one step per frame is
 * 120px/s of rise — and the burning front itself climbs at nearly that speed
 * early on, which left the tongues 8px tall (measured:
 * work/starlit-implementation/followup-41/tongue-probe.mjs). Two steps put the
 * flame at 240px/s, comfortably ahead of its own source, and the tongues land in
 * the ticket's 16–40px.
 */
export const HEAT_STEPS_PER_FRAME = 3;
/** How much of its heat a cell also gives the two cells beside its target. */
export const HEAT_SPREAD = 0.62;
/** Cells within this of the front are re-lit to full heat every frame. */
export const HEAT_SEED_BAND_PX = 4;
/** 火舌高度 16–40px（41.4）—— asserted against the real propagation in the test. */
export const TONGUE_MIN_PX = 16;
export const TONGUE_MAX_PX = 40;
/**
 * How far behind the front a flame may still be burning. Paper that has been
 * gone for 28px has nothing left to burn, and without this the tongues rising
 * off the far rim fill the whole hole and hide the very thing the burn is
 * uncovering.
 */
export const HEAT_REACH_PX = 28;

export type HeatMap = {
  cols: number;
  rows: number;
  cell: number;
  heat: Float32Array;
  scratch: Float32Array;
};

export const createHeat = (cols: number, rows: number, cell: number): HeatMap => ({
  cols,
  rows,
  cell,
  heat: new Float32Array(cols * rows),
  scratch: new Float32Array(cols * rows),
});

/**
 * One DOOM-fire step. Row 0 is the TOP of the card, so heat moves from row y to
 * row y − 1 and nowhere else: a cell may drift one cell sideways on the way up
 * (that is what makes a tongue lean and wobble) but it can never stay put and
 * can never go down, and it always loses a random slice of its heat.
 *
 * Double-buffered on purpose. Writing in place is the classic trick, but it
 * leaves cells that nothing wrote holding last frame's heat, and then "the heat
 * only ever moved up" is no longer something a test can state.
 */
export const propagateHeat = (map: HeatMap, rng: () => number, cooling = HEAT_COOLING): void => {
  const { cols, rows, heat, scratch } = map;
  scratch.fill(0);
  for (let y = rows - 1; y >= 1; y -= 1) {
    const row = y * cols;
    const up = (y - 1) * cols;
    for (let x = 0; x < cols; x += 1) {
      const hot = heat[row + x];
      if (hot <= 0) continue;
      const v = hot - rng() * cooling;
      if (v <= 0) continue;
      const drift = (rng() * 3) | 0; // 0, 1, 2 → −1, 0, +1
      const nx = clamp(x + drift - 1, 0, cols - 1);
      if (v > scratch[up + nx]) scratch[up + nx] = v;
      // Each cell also warms the two beside its target, at HEAT_SPREAD. Without
      // it every source cell feeds exactly one cell above and the tongues come
      // out as loose speckle rather than flame — the same dither DOOM lived with
      // at 8px cells looks like noise at 2px.
      const side = v * HEAT_SPREAD;
      if (side > 0.01) {
        const left = nx > 0 ? up + nx - 1 : -1;
        const right = nx < cols - 1 ? up + nx + 1 : -1;
        if (left >= 0 && side > scratch[left]) scratch[left] = side;
        if (right >= 0 && side > scratch[right]) scratch[right] = side;
      }
    }
  }
  heat.set(scratch);
};

/**
 * Re-light the cells sitting on the burning front — on the BURNED side of it.
 * Seeding ahead of the front too would put flame on top of the char ring and
 * wash it out; paper burns with a black rim and the flame inside it.
 */
export const seedHeat = (
  map: HeatMap,
  field: BurnField,
  threshold: number,
  rng: () => number,
  band = HEAT_SEED_BAND_PX,
): void => {
  const { cols, rows, heat } = map;
  const time = field.time;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const k = j * cols + i;
      const d = time[k] - threshold;
      if (d < -band || d > 0) continue;
      const v = 0.78 + rng() * 0.22;
      if (v > heat[k]) heat[k] = v;
    }
  }
};

/** Put out whatever is burning more than `reach` px behind the front. */
export const quenchHeat = (
  map: HeatMap,
  field: BurnField,
  threshold: number,
  reach = HEAT_REACH_PX,
): void => {
  const { heat } = map;
  const time = field.time;
  for (let k = 0; k < heat.length; k += 1) {
    if (heat[k] > 0 && time[k] - threshold < -reach) heat[k] = 0;
  }
};

// ---------------------------------------------------------------------------
// 火星 (41.5).
// ---------------------------------------------------------------------------

export const SPARK_MIN = 5;
export const SPARK_MAX = 10;
/** 微重力：a spark thrown up bends over instead of flying straight. px/s². */
export const SPARK_GRAVITY = 90;

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
};

/** One spark leaving the front at (x, y), heading up and outward. */
export const makeSpark = (rng: () => number, x: number, y: number, outward: number): Spark => ({
  x,
  y,
  vx: Math.cos(outward) * (18 + rng() * 46),
  vy: -(46 + rng() * 96),
  age: 0,
  life: 0.65 + rng() * 0.75,
  size: 0.9 + rng() * 1.3,
});

export const sparkAlpha = (s: Spark) => clamp(1 - s.age / s.life, 0, 1);

/** Step every spark by `dt` seconds and drop the ones that have gone out. */
export const stepSparks = (list: readonly Spark[], dt: number, gravity = SPARK_GRAVITY): Spark[] => {
  const out: Spark[] = [];
  for (const s of list) {
    const next: Spark = {
      ...s,
      x: s.x + s.vx * dt,
      y: s.y + s.vy * dt,
      vy: s.vy + gravity * dt,
      age: s.age + dt,
    };
    if (next.age < next.life) out.push(next);
  }
  return out;
};

// ---------------------------------------------------------------------------
// The hole itself: marching squares over the burn-time field.
// ---------------------------------------------------------------------------

/** A closed loop, flat [x0, y0, x1, y1, …] in CARD coordinates. */
export type Contour = number[];

type Side = 'T' | 'R' | 'B' | 'L';
const CASES: Record<number, [Side, Side][]> = {
  1: [['L', 'T']],
  2: [['T', 'R']],
  3: [['L', 'R']],
  4: [['R', 'B']],
  6: [['T', 'B']],
  7: [['L', 'B']],
  8: [['L', 'B']],
  9: [['T', 'B']],
  11: [['R', 'B']],
  12: [['L', 'R']],
  13: [['T', 'R']],
  14: [['L', 'T']],
};

/**
 * The level set `time = threshold`, as closed loops. Runs on every `step`-th
 * cell of the field (4px nodes by default): fine enough that the tongues
 * survive, coarse enough that the path stays a few hundred points.
 *
 * Endpoints are keyed by the GRID EDGE they cross, not by their coordinates, so
 * two cells that share an edge always agree on the point and the loops link up
 * exactly. Saddles are resolved by the average of the four corners.
 */
export const burnContours = (field: BurnField, threshold: number, step = 2): Contour[] => {
  const { cols, rows, cell, margin, time } = field;
  const nodesX = Math.floor((cols - 1) / step) + 1;
  const nodesY = Math.floor((rows - 1) / step) + 1;
  const at = (a: number, b: number) => time[b * step * cols + a * step];
  const px = (a: number) => a * step * cell + cell / 2 - margin;
  const py = (b: number) => b * step * cell + cell / 2 - margin;

  const points = new Map<string, [number, number]>();
  const links = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const la = links.get(a);
    if (la) la.push(b);
    else links.set(a, [b]);
  };

  const edgeId = (side: Side, a: number, b: number) =>
    side === 'T'
      ? `h${a}_${b}`
      : side === 'B'
        ? `h${a}_${b + 1}`
        : side === 'L'
          ? `v${a}_${b}`
          : `v${a + 1}_${b}`;

  const cross = (v0: number, v1: number) => {
    const d = v1 - v0;
    return Math.abs(d) < 1e-9 ? 0.5 : clamp((threshold - v0) / d, 0, 1);
  };

  const record = (side: Side, a: number, b: number) => {
    const id = edgeId(side, a, b);
    if (!points.has(id)) {
      if (side === 'T' || side === 'B') {
        const bb = side === 'T' ? b : b + 1;
        const t = cross(at(a, bb), at(a + 1, bb));
        points.set(id, [px(a) + t * (px(a + 1) - px(a)), py(bb)]);
      } else {
        const aa = side === 'L' ? a : a + 1;
        const t = cross(at(aa, b), at(aa, b + 1));
        points.set(id, [px(aa), py(b) + t * (py(b + 1) - py(b))]);
      }
    }
    return id;
  };

  for (let b = 0; b < nodesY - 1; b += 1) {
    for (let a = 0; a < nodesX - 1; a += 1) {
      const v00 = at(a, b);
      const v10 = at(a + 1, b);
      const v11 = at(a + 1, b + 1);
      const v01 = at(a, b + 1);
      const code =
        (v00 < threshold ? 1 : 0) |
        (v10 < threshold ? 2 : 0) |
        (v11 < threshold ? 4 : 0) |
        (v01 < threshold ? 8 : 0);
      if (code === 0 || code === 15) continue;
      let pairs = CASES[code];
      if (!pairs) {
        const middle = (v00 + v10 + v11 + v01) / 4 < threshold;
        const joined: [Side, Side][] = [
          ['L', 'B'],
          ['T', 'R'],
        ];
        const split: [Side, Side][] = [
          ['L', 'T'],
          ['R', 'B'],
        ];
        pairs = code === 5 ? (middle ? joined : split) : middle ? split : joined;
      }
      for (const [s0, s1] of pairs) {
        const id0 = record(s0, a, b);
        const id1 = record(s1, a, b);
        if (id0 === id1) continue;
        link(id0, id1);
        link(id1, id0);
      }
    }
  }

  const seen = new Set<string>();
  const out: Contour[] = [];
  for (const startId of links.keys()) {
    if (seen.has(startId)) continue;
    const loop: Contour = [];
    let current = startId;
    let previous = '';
    while (current && !seen.has(current)) {
      seen.add(current);
      const p = points.get(current);
      if (p) loop.push(p[0], p[1]);
      const next = (links.get(current) ?? []).find((n) => n !== previous && !seen.has(n));
      previous = current;
      current = next ?? '';
    }
    if (loop.length >= 6) out.push(loop);
  }
  return out;
};

/** Drop points that add nothing: keeps the `d` string a few KB, not tens. */
export const simplifyContour = (loop: Contour, tolerance = 0.45): Contour => {
  if (loop.length <= 8) return loop;
  const out: Contour = [loop[0], loop[1]];
  for (let i = 2; i < loop.length - 2; i += 2) {
    const ax = out[out.length - 2];
    const ay = out[out.length - 1];
    const bx = loop[i];
    const by = loop[i + 1];
    const cx = loop[i + 2];
    const cy = loop[i + 3];
    const dx = cx - ax;
    const dy = cy - ay;
    const len = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx * (ay - by) - dy * (ax - bx)) / len > tolerance) out.push(bx, by);
  }
  out.push(loop[loop.length - 2], loop[loop.length - 1]);
  return out;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The film's clip path: the card's rounded rectangle with every contour punched
 * out of it under `evenodd`. Feeding this to an SVG `<clipPath>` is what leaves
 * the film's icon and name as real DOM while the hole they sit in is the
 * tongue-shaped level set above — see components/starlit-shell.tsx for why that
 * beat a per-frame bitmap mask.
 */
export const filmClipPath = (
  contours: readonly Contour[],
  width: number,
  height: number,
  radius: number,
): string => {
  const r = Math.min(radius, width / 2, height / 2);
  let d =
    `M${r1(r)},0 H${r1(width - r)} A${r1(r)},${r1(r)} 0 0 1 ${r1(width)},${r1(r)} ` +
    `V${r1(height - r)} A${r1(r)},${r1(r)} 0 0 1 ${r1(width - r)},${r1(height)} ` +
    `H${r1(r)} A${r1(r)},${r1(r)} 0 0 1 0,${r1(height - r)} ` +
    `V${r1(r)} A${r1(r)},${r1(r)} 0 0 1 ${r1(r)},0 Z`;
  for (const loop of contours) {
    if (loop.length < 6) continue;
    d += ` M${r1(loop[0])},${r1(loop[1])}`;
    for (let i = 2; i < loop.length; i += 2) d += ` L${r1(loop[i])},${r1(loop[i + 1])}`;
    d += ' Z';
  }
  return d;
};
