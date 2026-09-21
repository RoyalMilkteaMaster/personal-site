// Ticket 07: a fully offscreen main canvas must stop steady GPU work while the
// clock, commands, morph completion and React reports keep going.
// CPU integration test: real scene loop, mocked GPU/assets, fake rAF and IO.
// Run: node --experimental-test-module-mocks app/starlit-sky-study/scene-offscreen.test.mjs
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import fs from 'node:fs';
import { setImmediate } from 'node:timers/promises';

const alignment = JSON.parse(
  fs.readFileSync(
    new URL('../../public/fantasy/camera-alignment.json', import.meta.url),
    'utf8',
  ),
);
// Steady per-frame GPU work (draws) and one-time command work (snapshots) are
// counted separately: the ticket allows the latter while the canvas is hidden.
const n = {
  clear: 0, nativeDraw: 0, legacyDraw: 0, morphDraw: 0, skyDraw: 0, ceilingDraw: 0, cupDraw: 0,
  nativeSnapshot: 0, legacySnapshot: 0, morphSet: 0,
};
const legacyDraws = [], morphDraws = [];
mock.module('./renderer-study.mjs', {
  namedExports: {
    createFantasy: async () => ({
      count: 1,
      manifest: { sha256: 'same-model' },
      placement: {},
      draw: (_camera, options) => { n.nativeDraw++; options.background(); },
      snapshot: () => { n.nativeSnapshot++; return new Float32Array(10); },
      dispose() {},
    }),
  },
});
mock.module('./legacy-study.mjs', {
  namedExports: {
    createLegacy: async () => ({
      skyCount: 1,
      pool: { rest: 1, sky: () => 1 },
      draw: (...args) => { n.legacyDraw++; legacyDraws.push(args); },
      snapshot: () => { n.legacySnapshot++; return new Float32Array(10); },
      dispose() {},
    }),
  },
});
mock.module('../../lib/fantasy/starlit-constellation.mjs', {
  namedExports: { createConstellation: () => ({ draw() {}, dispose() {} }) },
});
mock.module('../../lib/fantasy-particles.mjs', {
  namedExports: {
    expandSnapshot: () => new Float32Array(20),
    createChapterMorph: () => ({
      set: () => n.morphSet++,
      draw: (t) => { n.morphDraw++; morphDraws.push(t); },
      snapshot: () => new Float32Array(20),
      dispose() {},
    }),
  },
});
mock.module('./volume-sky.mjs', { namedExports: { createVolumeSky: () => ({ draw() { n.skyDraw++; }, dispose() {} }) } });
mock.module('./cup-renderer.mjs', { namedExports: { createStudyCup: async () => ({ draw() { n.cupDraw++; return true; }, dispose() {} }) } });
mock.module('./brand-ceiling.mjs', { namedExports: { createBrandCeiling: async () => ({ draw() { n.ceilingDraw++; }, dispose() {} }) } });

const listeners = new Map();
let frame, intersect;
const globals = {
  window: { addEventListener: (k, f) => listeners.set(k, f), removeEventListener() {} },
  document: { hidden: false, addEventListener: (k, f) => listeners.set(k, f), removeEventListener() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  ResizeObserver: class { observe() {} disconnect() {} },
  IntersectionObserver: class {
    constructor(cb) { intersect = cb; }
    observe() {}
    disconnect() {}
  },
  requestAnimationFrame: (f) => { frame = f; return 1; },
  cancelAnimationFrame() {},
  devicePixelRatio: 1,
  fetch: async () => ({ ok: true, json: async () => alignment }),
};
for (const [key, value] of Object.entries(globals))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const gl = new Proxy({}, {
  get: (_, key) => key === 'getError' ? () => 0 : key === 'clear' ? () => { n.clear++; } : () => {},
});
const canvas = {
  width: 1280, height: 720, dataset: { variant: 'E', playing: 'true' },
  getContext: () => gl,
  getBoundingClientRect: () => ({ width: 1280, height: 720 }),
  addEventListener() {}, removeEventListener() {},
};
const states = [], errors = [];
const cmd = { readingStep: 5, contentOpen: true, pose: 0, replay: 0, advance: 0, language: 'zh', onIntroState: (s) => states.push(s) };
const { mountBrandScene, mountFantasyScene } = await import('./scene-study.mjs');
let now = 1000;
const tick = (seconds = .1) => { now += seconds * 1000; frame(now); };
const snap = () => canvas.__fantasy.snapshot();
const gpu = () => ({ ...n });
const delta = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, b[k] - a[k]]));
const steady = (d) => d.clear + d.nativeDraw + d.legacyDraw + d.morphDraw + d.skyDraw + d.ceilingDraw + d.cupDraw;
const offscreen = () => intersect([{ isIntersecting: false, intersectionRatio: 0 }]);
const onscreen = (ratio = 1) => intersect([{ isIntersecting: true, intersectionRatio: ratio }]);
const during = (frames, seconds) => { const a = gpu(); for (let i = 0; i < frames; i++) tick(seconds); return delta(a, gpu()); };

const dispose = mountBrandScene(canvas, () => cmd, (e) => errors.push(e), { starlit: true });
await setImmediate();
assert(snap().ready);
assert(intersect, 'the scene observes canvas intersection');
// Visible About hold: every frame clears and draws the true body once.
tick(); tick();
let d = during(10);
assert.equal(d.clear, 10); assert.equal(d.nativeDraw, 10); assert.equal(d.skyDraw, 10);
assert.equal(snap().phase, 'hold'); assert.equal(snap().active, 0);
console.log('visible-about', JSON.stringify(d));

// 1. Fully offscreen: zero steady GPU work, clock and dataset keep advancing.
offscreen();
const clock0 = snap().clock, phase0 = snap().propPhase;
d = during(20);
assert.equal(steady(d), 0, `offscreen About must not draw: ${JSON.stringify(d)}`);
assert.equal(d.nativeSnapshot + d.legacySnapshot + d.morphSet, 0, 'no command, no snapshot');
assert(Math.abs(snap().clock - clock0 - 2) < 1e-9, 'clock keeps running offscreen');
assert(snap().propPhase > phase0, 'held-object phase keeps running offscreen');
assert.equal(canvas.dataset.phase, 'hold');
console.log('offscreen-about-idle', JSON.stringify(d));

// 2. Chapter switch while offscreen: one-time snapshot work allowed, no draw;
//    the morph completes on time and the scene lands on the requested pose.
cmd.pose = 1;
d = during(1);
assert.equal(d.morphSet, 1, 'offscreen chapter command still builds the morph');
assert.equal(d.nativeSnapshot, 1); assert(d.legacySnapshot >= 1);
assert.equal(steady(d), 0, `snapshot frame must not draw: ${JSON.stringify(d)}`);
assert.equal(snap().phase, 'morph'); assert.equal(snap().active, 1);
console.log('offscreen-switch-command', JSON.stringify(d));
d = during(40);
assert.equal(steady(d), 0, `offscreen morph must not draw: ${JSON.stringify(d)}`);
assert.equal(snap().phase, 'hold', 'morph completes while offscreen');
assert.equal(canvas.dataset.pose, '1'); assert.equal(canvas.dataset.phase, 'hold');
assert(snap().camera, 'camera stays coherent for the next snapshot');
console.log('offscreen-morph', JSON.stringify(d));

// 3. Back on screen (partially): the first frame paints the completed pose,
//    not a stale morph frame and not the opening.
onscreen(.05);
d = during(1);
assert.equal(d.clear, 1); assert.equal(d.legacyDraw, 1); assert.equal(d.morphDraw, 0);
assert.equal(legacyDraws.at(-1)[0], 1, 'first visible frame is the current chapter');
assert.equal(snap().phase, 'hold');
console.log('return-after-offscreen-morph', JSON.stringify(d));

// 4. Leaving mid-morph does not interrupt it; returning resumes the same morph.
cmd.pose = 2; tick(); tick();
assert.equal(snap().phase, 'morph');
const tBefore = morphDraws.at(-1);
offscreen();
d = during(5);
assert.equal(steady(d), 0);
assert.equal(snap().phase, 'morph');
onscreen();
d = during(1);
assert.equal(d.morphDraw, 1); assert(morphDraws.at(-1) > tBefore, 'morph progressed offscreen');
during(40);
assert.equal(snap().phase, 'hold'); assert.equal(snap().active, 2);

// 5. Offscreen language switch and replay reach React through the same report seam.
offscreen();
cmd.language = 'en';
const reports = states.length;
d = during(3);
assert.equal(steady(d), 0);
assert.equal(snap().intro.language, 'en');
assert(states.length > reports && states.at(-1).language === 'en', 'language report while offscreen');
Object.assign(cmd, { pose: 0, contentOpen: false, readingStep: 0, replay: 1 });
d = during(3);
assert.equal(steady(d), 0, `offscreen replay must not draw: ${JSON.stringify(d)}`);
assert.equal(snap().active, 0); assert.equal(snap().phase, 'intro');
assert.equal(states.at(-1).readingStep, 0); assert.equal(states.at(-1).stage, 'waiting');
console.log('offscreen-language-replay', JSON.stringify(d), states.at(-1).stage);

// 6. Hidden document keeps its existing meaning: everything pauses, including the clock.
document.hidden = true; listeners.get('visibilitychange')();
const frozen = snap().clock;
d = during(5);
assert.equal(steady(d), 0); assert.equal(snap().clock, frozen);
document.hidden = false; listeners.get('visibilitychange')();
d = during(5);
assert.equal(steady(d), 0, 'still offscreen after the tab returns');
assert(snap().clock > frozen);

// 7. Returning during the replayed opening paints the opening from where it is.
onscreen();
d = during(1);
assert.equal(d.clear, 1); assert.equal(d.nativeDraw + d.skyDraw > 0, true);
assert.equal(snap().phase, 'intro'); assert.equal(snap().intro.readingStep, 0);
assert.deepEqual(errors, []);
dispose();
console.log('PASS: offscreen main canvas stops steady draws; clock, commands, morph, reports continue; hidden unchanged');

// The non-starlit study mount keeps its old semantics: offscreen freezes everything.
Object.assign(cmd, { readingStep: 0, contentOpen: false, pose: 0, replay: 0 });
const disposeStudy = mountFantasyScene(canvas, () => cmd, (e) => errors.push(e));
await setImmediate();
assert(snap().ready);
tick(); tick();
offscreen();
const studyClock = snap().clock;
d = during(5);
assert.equal(steady(d), 0); assert.equal(snap().clock, studyClock, 'non-starlit offscreen still freezes');
onscreen(); d = during(1); assert.equal(d.clear, 1);
disposeStudy();
assert.deepEqual(errors, []);
console.log('PASS: non-starlit mount unchanged');
