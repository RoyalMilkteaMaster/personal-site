// CPU integration test: real scene/controller, mocked GPU/assets and DOM clock.
// Run: node --experimental-test-module-mocks lib/starlit-scene.test.mjs
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import fs from 'node:fs';
import { cameraEye } from './fantasy/orbit.mjs';
import { setImmediate } from 'node:timers/promises';

const alignment = JSON.parse(
  fs.readFileSync(
    new URL('../public/fantasy/camera-alignment.json', import.meta.url),
    'utf8',
  ),
);
const nativeDraws = [],
  legacyDraws = [],
  cupTimes = [],
  cupOpacity = [],
  skyOpacity = [];
let failNextDraw = false;
let morphs = 0,
  loadCount = 0;
mock.module('./fantasy/renderer.mjs', {
  namedExports: {
    createFantasy: async () => {
      loadCount++;
      return {
        count: 1,
        manifest: { sha256: 'same-model' },
        placement: {},
        draw: (camera, options) => {
          if (failNextDraw) {
            failNextDraw = false;
            throw Error('test renderer failure');
          }
          nativeDraws.push({ camera, options });
          options.background();
        },
        snapshot: () => new Float32Array(10),
        dispose() {},
      };
    },
  },
});
mock.module('./fantasy/legacy.mjs', {
  namedExports: {
    createLegacy: async () => ({
      skyCount: 1,
      pool: { rest: 1, sky: () => 1 },
      draw: (...args) => legacyDraws.push(args),
      snapshot: () => new Float32Array(10),
      dispose() {},
    }),
  },
});
mock.module('./fantasy/starlit-constellation.mjs', {
  namedExports: {
    createConstellation: () => ({
      draw: (_camera, time, opacity, sky) => {
        skyOpacity.push(sky);
        cupTimes.push(time);
        cupOpacity.push(Number(opacity));
      },
      dispose() {},
    }),
  },
});
mock.module('./fantasy-particles.mjs', {
  namedExports: {
    expandSnapshot: () => new Float32Array(20),
    createChapterMorph: () => ({
      set: () => morphs++,
      draw() {},
      snapshot: () => new Float32Array(20),
      dispose() {},
    }),
  },
});

const listeners = new Map();
let frame;
const globals = {
  window: {
    addEventListener: (k, f) => listeners.set(k, f),
    removeEventListener() {},
  },
  document: {
    hidden: false,
    addEventListener: (k, f) => listeners.set(k, f),
    removeEventListener() {},
  },
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }),
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
  IntersectionObserver: class {
    observe() {}
    disconnect() {}
  },
  requestAnimationFrame: (f) => {
    frame = f;
    return 1;
  },
  cancelAnimationFrame() {},
  devicePixelRatio: 1,
  fetch: async () => ({ ok: true, json: async () => alignment }),
};
for (const [key, value] of Object.entries(globals))
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
const gl = new Proxy(
  {},
  { get: (_, key) => (key === 'getError' ? () => 0 : () => {}) },
);
const canvas = {
  width: 1280,
  height: 720,
  dataset: {},
  getContext: () => gl,
  getBoundingClientRect: () => ({ width: 1280, height: 720 }),
  addEventListener() {},
  removeEventListener() {},
};
const states = [],
  errors = [];
const cmd = {
  readingStep: 0,
  contentOpen: false,
  pose: 0,
  replay: 0,
  advance: 0,
  language: 'zh',
  onIntroState: (s) => states.push(s),
};
const { mountFantasyScene } = await import('./fantasy/scene.mjs');
let now = 1000;
const tick = (seconds = 0.1) => {
  now += seconds * 1000;
  frame(now);
};
const dispose = mountFantasyScene(
  canvas,
  () => cmd,
  (e) => errors.push(e),
  { starlit: true },
);
await setImmediate();
tick();
assert(canvas.__fantasy.snapshot().ready);
assert.equal(states.at(-1).stage, 'waiting');
assert(
  nativeDraws.length > 0,
  'waiting draws the actual native character, not only legacy sky',
);
const first = nativeDraws.at(-1).camera;
assert.equal(nativeDraws.at(-1).options.opening, 1);
assert.equal(
  legacyDraws.at(-1)[3],
  true,
  'waiting restores the original sky-only path',
);
assert.equal(
  legacyDraws.at(-1)[4],
  1,
  'waiting maps the legacy orbit across the full viewport',
);
assert.equal(skyOpacity.at(-1), 1, 'waiting restores the constellation sky');
const skyTime = legacyDraws.at(-1)[1];
tick(0.5);
assert.deepEqual(
  nativeDraws.at(-1).camera,
  first,
  'the native face does not roll with the orbit',
);
assert(
  legacyDraws.at(-1)[1] > skyTime,
  'the original orbit clock runs while waiting',
);
for (const step of [1, 2, 5, 0]) {
  cmd.readingStep = step;
  for (let i = 0; i < 30; i++) tick();
  assert.equal(
    cupOpacity.at(-1),
    0,
    `stable step ${step} must not display the independent cup`,
  );
}
cmd.readingStep = 3;
tick(0);
tick(0.4);
assert(
  cupOpacity.at(-1) > 0 && cupOpacity.at(-1) < 1,
  'entering cup view fades it in',
);
for (let i = 0; i < 10; i++) tick();
assert.equal(cupOpacity.at(-1), 1, 'invitation displays the cup');
cmd.readingStep = 4;
tick();
assert.equal(cupOpacity.at(-1), 1, 'cup passage retains the same object');
assert(
  states.at(-1).settled && states.at(-1).text,
  'same-view passage change has no blank travel',
);
cmd.readingStep = 1;
tick(0);
tick(0.3);
const interruptedOpacity = cupOpacity.at(-1);
assert(
  interruptedOpacity > 0 && interruptedOpacity < 1,
  'leaving cup view fades it out',
);
cmd.readingStep = 3;
tick(0);
assert.equal(
  cupOpacity.at(-1),
  interruptedOpacity,
  'retarget preserves the current cup visibility',
);
cmd.readingStep = 0;
for (let i = 0; i < 30; i++) tick();
assert.equal(cupOpacity.at(-1), 0);

const waitingBeforeReveal = nativeDraws.at(-1).camera;
cmd.readingStep = 1;
tick(0);
assert.equal(states.at(-1).settled, false);
assert.deepEqual(nativeDraws.at(-1).camera, waitingBeforeReveal);
tick(0.3);
const normalEye = cameraEye(nativeDraws.at(-1).camera);
tick(1 / 60);
const moving = nativeDraws.at(-1).camera;
const movingEye = cameraEye(moving);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const normalMotion = distance(normalEye, movingEye);
cmd.readingStep = 2;
tick(0);
assert.deepEqual(
  nativeDraws.at(-1).camera,
  moving,
  'scene retarget starts at the drawn camera',
);
assert.equal(states.at(-1).text, '');
tick(1 / 60);
const redirectMotion = distance(
  movingEye,
  cameraEye(nativeDraws.at(-1).camera),
);
assert(
  redirectMotion <= 2 * normalMotion,
  'rendered first positive-dt frame cannot jump to an old endpoint',
);
console.log(JSON.stringify({ normalMotion, redirectMotion }));
tick(0.2);
cmd.language = 'en';
tick(0);
assert.equal(states.at(-1).language, 'en');
const frozen = canvas.__fantasy.snapshot();
globals.document.hidden = true;
listeners.get('visibilitychange')();
assert.equal(states.at(-1).paused, true);
tick(120);
assert.equal(canvas.__fantasy.snapshot().clock, frozen.clock);
assert.deepEqual(canvas.__fantasy.snapshot().camera, frozen.camera);
globals.document.hidden = false;
listeners.get('visibilitychange')();
tick(0);
assert.equal(states.at(-1).paused, false);
assert.deepEqual(canvas.__fantasy.snapshot().camera, frozen.camera);
for (let i = 0; i < 30; i++) tick();
assert.equal(states.at(-1).stage, 'back');
assert(states.at(-1).settled);
const keyState = canvas.__fantasy.snapshot().intro;
listeners.get('keydown')({
  key: 'ArrowRight',
  target: { closest: () => null },
  preventDefault() {},
});
tick(1 / 60);
assert.equal(
  canvas.__fantasy.snapshot().intro.readingStep,
  keyState.readingStep,
  'starlit keyboard has a single shell owner',
);
assert.equal(
  loadCount,
  1,
  'the face reveal never rebuilds or replaces the character',
);
cmd.readingStep = 5;
for (let i = 0; i < 300; i++) tick();
assert.equal(states.at(-1).stage, 'ending');
assert.equal(canvas.__fantasy.snapshot().phase, 'intro');
assert(
  cupTimes.at(-1) > cupTimes[0],
  'cup rotation clock continues while the reader holds',
);
cmd.contentOpen = true;
cmd.pose = 1;
tick();
assert.equal(states.at(-1).stage, 'done');
assert.equal(morphs, 1, 'explicit Works entry reaches existing chapter morph');
for (let i = 0; i < 20; i++) tick();
assert.equal(canvas.__fantasy.snapshot().active, 1);
cmd.pose = 0;
tick();
assert.equal(morphs, 2);
for (let i = 0; i < 20; i++) tick();
assert.equal(canvas.__fantasy.snapshot().phase, 'hold');
cmd.contentOpen = false;
cmd.readingStep = 0;
cmd.replay++;
tick(0);
assert.equal(states.at(-1).stage, 'waiting');
assert.deepEqual(nativeDraws.at(-1).camera, first);
cmd.readingStep = 5;
for (let i = 0; i < 30; i++) tick();
cmd.contentOpen = true;
tick();
assert.equal(states.at(-1).stage, 'done');
assert.equal(canvas.__fantasy.snapshot().phase, 'hold');
assert.equal(morphs, 2, 'About opens the existing native chapter directly');
assert.equal(errors.length, 0);
dispose();

// The official home keeps its old start and automatic orbit, ignoring new commands.
const official = { ...canvas, dataset: {} };
const home = mountFantasyScene(
  official,
  () => cmd,
  (e) => errors.push(e),
);
await setImmediate();
tick();
assert.equal(official.dataset.introStage, 'front');
const homeCamera = nativeDraws.at(-1).camera;
cmd.readingStep = 5;
tick(0);
assert.deepEqual(nativeDraws.at(-1).camera, homeCamera);
assert.equal(official.dataset.introStage, 'front');
home();
assert.equal(errors.length, 0);
// A latched renderer failure reports error; retry is a new mount, as the shell does.
const consoleError = mock.method(console, 'error', () => {});
const retryCanvas = { ...canvas, dataset: {} };
cmd.contentOpen = false;
cmd.readingStep = 0;
const broken = mountFantasyScene(
  retryCanvas,
  () => cmd,
  (e) => errors.push(e),
  { starlit: true },
);
await setImmediate();
failNextDraw = true;
tick();
assert.equal(states.at(-1).stage, 'error');
assert.equal(errors.length, 1);
cmd.replay++;
tick();
assert.equal(
  retryCanvas.__fantasy.snapshot().failed,
  true,
  'failed context is latched until remount',
);
broken();
const retry = mountFantasyScene(
  retryCanvas,
  () => cmd,
  (e) => errors.push(e),
  { starlit: true },
);
await setImmediate();
tick();
assert.equal(states.at(-1).stage, 'waiting');
assert.equal(retryCanvas.__fantasy.snapshot().failed, false);
assert.equal(errors.length, 1);
retry();
consoleError.mock.restore();
console.log(
  'scene waiting renders native model / six-step commands / redirect / visibility / language / chapter morph / replay / official home isolation: PASS',
);
