// CPU integration test: real scene/controller, mocked GPU/assets and DOM clock.
// Run: node --experimental-test-module-mocks app/starlit-sky-study/scene-initialization.test.mjs
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
const volumeDraws=[], legacyOptions=[];
const nativeDraws = [],
  legacyDraws = [],
  cupTimes = [],
  cupOpacity = [],
  skyOpacity = [];
let failNextDraw = false;
let morphs = 0,
  loadCount = 0;
mock.module('./renderer-study.mjs', {
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
mock.module('./legacy-study.mjs', {
  namedExports: {
    createLegacy: async (_gl,_canvas,options) => {legacyOptions.push(options);return ({
      skyCount: 1,
      pool: { rest: 1, sky: () => 1 },
      draw: (...args) => legacyDraws.push(args),
      snapshot: () => new Float32Array(10),
      dispose() {},
    });},
  },
});
mock.module('../../lib/fantasy/starlit-constellation.mjs', {
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
mock.module('../../lib/fantasy-particles.mjs', {
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

mock.module('./volume-sky.mjs',{namedExports:{createVolumeSky:(_gl,_canvas,kind)=>({draw(camera,seconds){volumeDraws.push({kind,camera,seconds})},dispose(){}})}});
const cupCreates=[],ceilingOptions=[];
mock.module('./cup-renderer.mjs',{namedExports:{createStudyCup:async()=>{cupCreates.push(1);return{draw(_camera,time){cupTimes.push(time)},dispose(){}}}}});
mock.module('./brand-ceiling.mjs',{namedExports:{createBrandCeiling:async(_gl,_canvas,options)=>{ceilingOptions.push(options);return{draw(){},dispose(){}}}}});
const {mountBrandScene,mountFantasyScene}=await import('./scene-study.mjs');
let now=1000;const tick=(seconds=.1)=>{now+=seconds*1000;frame(now)};
for(const pose of[1,2]){
 Object.assign(cmd,{readingStep:5,contentOpen:true,pose,replay:0});errors.length=0;states.length=0;
 const dispose=mountBrandScene(canvas,()=>cmd,e=>errors.push(e),{starlit:true});await setImmediate();
 assert(canvas.__fantasy.snapshot().ready);
 tick();
 assert.deepEqual(errors.map(e=>e.message),[],`initial selected chapter ${pose} must not fail before its first camera frame`);
 assert.equal(canvas.__fantasy.snapshot().active,pose);
 assert.equal(canvas.__fantasy.snapshot().phase,'morph');
 assert(canvas.__fantasy.snapshot().camera,'morph has a source camera');
 for(let i=0;i<40;i++)tick();assert.equal(canvas.__fantasy.snapshot().phase,'hold');
 // Another chapter and then replay must still use the normal transition flow.
 cmd.pose=pose===1?2:1;tick();assert.equal(canvas.__fantasy.snapshot().phase,'morph');
 for(let i=0;i<40;i++)tick();assert.equal(canvas.__fantasy.snapshot().active,cmd.pose);
 Object.assign(cmd,{pose:0,contentOpen:false,readingStep:0,replay:1});tick();
 assert.equal(canvas.__fantasy.snapshot().intro.readingStep,0);assert.equal(canvas.__fantasy.snapshot().active,0);assert.equal(errors.length,0);
 dispose();
}
console.log('PASS: selected project/about initialization, chapter transition and replay without undefined camera');

canvas.dataset.variant='E';canvas.dataset.playing='true';
const tickSky=(seconds=.1)=>{const n=volumeDraws.length;tick(seconds);return volumeDraws.length-n};
Object.assign(cmd,{readingStep:5,contentOpen:true,pose:0,replay:0});
const disposeShared=mountBrandScene(canvas,()=>cmd,e=>errors.push(e),{starlit:true});await setImmediate();
assert(canvas.__fantasy.snapshot().ready);
assert.equal(legacyOptions.at(-1)?.separateSky,true,'主預覽舊背景須同時退出draw與snapshot');
tickSky();const camera=volumeDraws.at(-1).camera;let seconds=volumeDraws.at(-1).seconds;
for(const pose of [1,2,0,2,1,0]){
 cmd.pose=pose;
 const rates=[];
 for(let i=0;i<25;i++){
  assert.equal(tickSky(),1,'每個hold／morph frame只能畫一次midpoint');
  const sky=volumeDraws.at(-1);rates.push((sky.seconds-seconds)/.1);assert.equal(sky.kind,'midpoint');assert(sky.seconds>=seconds,'切姿態不重置星空時間');assert.deepEqual(sky.camera,camera,'星空不隨切姿態跳取景');seconds=sky.seconds;
 }
 assert(Math.max(...rates)>10,'pose switches visibly accelerate the same sky');
 assert(Math.abs(rates.at(-1)-1)<.01,'sky returns to unchanged ambient speed');
 assert(rates.every(rate=>rate>=1-1e-8&&rate<60),'continuous forward rotation without angle resets');
 assert.equal(canvas.__fantasy.snapshot().phase,'hold');assert.equal(canvas.__fantasy.snapshot().active,pose);
}
// Ordinary 60 FPS playback retains the intended six-way speed pulse.
for(const pose of [1,2,0,2,1,0]) {
 cmd.pose=pose;let peak=1, peakFrame=0, early=0, main=0, total=0;
 for(let i=0;i<150;i++) {
  const before=canvas.__fantasy.snapshot().volumeSeconds;
  tickSky(1/60);const state=canvas.__fantasy.snapshot();
  const travel=state.volumeSeconds-before-1/60;total+=travel;
  if(i<=8) early+=travel;
  if(i<=43) main+=travel;
  if(state.skySpeed>peak){peak=state.skySpeed;peakFrame=i;}
 }
 assert(early/total>.035,'sky already travels with the body in the first tenth');
 assert(main/total>.95,'main sky travel follows the body within the first 56 percent');
 assert(peakFrame<30,'sky peaks with the frontloaded body, not halfway or later');
 assert(peak>50,'ordinary frames retain the visible six-way acceleration');
 assert(Math.abs(canvas.__fantasy.snapshot().skySpeed-1)<.01,'ordinary frames settle back to ambient');
 console.log('60fps-pulse',JSON.stringify({pose,peak,peakFrame,earlyShare:early/total,mainShare:main/total}));
}
// A stall must not spend half a second at amplified rotation speed in one frame.
// Allow the existing .5-second ambient step plus at most one 20 FPS boost step.
cmd.pose=1;tickSky();
for(const dt of [.5,.1,.5,1.2]) {
 const before=canvas.__fantasy.snapshot();tickSky(dt);const after=canvas.__fantasy.snapshot();
 const delta=after.volumeSeconds-before.volumeSeconds;
 console.log('stall-step',JSON.stringify({dt,delta,angleDegrees:delta*.025*180/Math.PI,speed:after.skySpeed}));
 assert(Math.abs(after.clock-before.clock-Math.min(dt,.5))<1e-9,'camera keeps its original elapsed-time policy');
 assert(delta>0&&delta<=3.3+1e-9,'stall cannot amplify one sky frame beyond ambient plus a 20 FPS boost step');
}
for(let i=0;i<40;i++)tickSky();
const ambient=canvas.__fantasy.snapshot();tickSky(.5);
assert(Math.abs(canvas.__fantasy.snapshot().volumeSeconds-ambient.volumeSeconds-.5)<1e-8,'ambient sky still consumes original dt');
cmd.pose=0;for(let i=0;i<30;i++)tickSky();
// Pausing in the accelerated part freezes both phase and accumulated angle.
cmd.pose=1;for(let i=0;i<6;i++)tickSky();
const moving=canvas.__fantasy.snapshot();assert(moving.skySpeed>10);
document.hidden=true;listeners.get('visibilitychange')();for(let i=0;i<20;i++)tickSky();
assert.equal(canvas.__fantasy.snapshot().volumeSeconds,moving.volumeSeconds);
assert.equal(canvas.__fantasy.snapshot().skySpeed,moving.skySpeed);
document.hidden=false;listeners.get('visibilitychange')();tickSky();
assert.equal(canvas.__fantasy.snapshot().volumeSeconds,moving.volumeSeconds);
// The existing 2D retarget behavior remains; a new request must not reset speed.
cmd.pose=2;const retargetClock=canvas.__fantasy.snapshot().volumeSeconds;tickSky();
assert(canvas.__fantasy.snapshot().volumeSeconds>retargetClock);
assert(canvas.__fantasy.snapshot().skySpeed>1);
for(let i=0;i<30;i++)tickSky();
const stopped=canvas.__fantasy.snapshot().volumeSeconds;
document.hidden=true;listeners.get('visibilitychange')();assert.equal(tickSky(),0);assert.equal(canvas.__fantasy.snapshot().volumeSeconds,stopped);
document.hidden=false;listeners.get('visibilitychange')();tickSky();assert.equal(canvas.__fantasy.snapshot().volumeSeconds,stopped,'返回分頁不補跳時間');
canvas.dataset.playing='false';tickSky();assert.equal(canvas.__fantasy.snapshot().volumeSeconds,stopped);canvas.dataset.playing='true';tickSky();
Object.assign(cmd,{pose:0,contentOpen:false,readingStep:0,replay:1});tickSky();assert.equal(canvas.__fantasy.snapshot().intro.readingStep,0);assert.equal(canvas.__fantasy.snapshot().active,0);
assert.equal(errors.length,0);
// Inspection pause freezes the intro timeline, not the original volume-sky clock.
const normalBefore=canvas.__fantasy.snapshot();tickSky();
assert.equal(canvas.__fantasy.snapshot().intro.paused,false);
assert(canvas.__fantasy.snapshot().volumeSeconds>normalBefore.volumeSeconds);
canvas.__fantasy.seekStage('waiting',0);tickSky();
const pausedBefore=canvas.__fantasy.snapshot();
for(let i=0;i<10;i++)tickSky();
const pausedAfter=canvas.__fantasy.snapshot();
console.log('intro-paused probe',JSON.stringify({paused:pausedAfter.intro.paused,clockDelta:pausedAfter.clock-pausedBefore.clock,volumeDelta:pausedAfter.volumeSeconds-pausedBefore.volumeSeconds}));
assert.equal(pausedAfter.intro.paused,true);assert.equal(pausedAfter.clock,pausedBefore.clock);
assert(Math.abs(pausedAfter.volumeSeconds-pausedBefore.volumeSeconds-1)<1e-9,'inspection pause must preserve original sky rotation');
canvas.__fantasy.resume();
cmd.language='en';cmd.readingStep=3;for(let i=0;i<10;i++)tickSky();
assert.equal(canvas.__fantasy.snapshot().intro.language,'en');assert(canvas.__fantasy.snapshot().pureSky);
const bodies=nativeDraws.length,cups=cupTimes.length;assert.equal(tickSky(),1);assert.equal(nativeDraws.length,bodies);assert.equal(cupTimes.length,cups);
cmd.readingStep=4;for(let i=0;i<10;i++)tickSky();assert(canvas.__fantasy.snapshot().pureSky);
cmd.readingStep=0;cmd.replay++;failNextDraw=true;
const oldError=console.error;console.error=()=>{};tickSky();console.error=oldError;
assert(canvas.__fantasy.snapshot().failed);assert.equal(errors.length,1);disposeShared();
errors.length=0;const retry=mountBrandScene(canvas,()=>cmd,e=>errors.push(e),{starlit:true});await setImmediate();tickSky();assert(canvas.__fantasy.snapshot().ready);assert(!canvas.__fantasy.snapshot().failed);assert.equal(errors.length,0);retry();
console.log('PASS: pureSky／語言／錯誤後重新mount');
console.log('PASS: variant E三姿態／六向現行morph每幀單一midpoint，連續取景與時鐘、背景暫停與replay');

// Hidden-by-request: the brand preview must not build or draw the independent 3D cup or the opening catgirl.
assert.equal(cupCreates.length,0,'主預覽不得呼叫createStudyCup');
assert(ceilingOptions.length>0,'主預覽必須建立brandCeiling');
for(const options of ceilingOptions){assert.equal(options?.cupEnabled,false,'主預覽brandCeiling須cupEnabled:false');assert.equal(options?.catgirlEnabled,false,'主預覽brandCeiling須catgirlEnabled:false');}
// The old study page keeps its defaults: its own cup, no brand ceiling.
const ceilingsBefore=ceilingOptions.length;
const disposeStudy=mountFantasyScene(canvas,()=>cmd,e=>errors.push(e),{starlit:true});await setImmediate();
assert.equal(cupCreates.length,1,'研究頁預設仍建立自己的杯');
assert.equal(ceilingOptions.length,ceilingsBefore,'研究頁不建立brandCeiling');
disposeStudy();
console.log('PASS: 主預覽無杯／無開頭貓娘接線，研究頁預設不變');
