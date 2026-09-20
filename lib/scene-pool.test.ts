import assert from 'node:assert/strict';
import {INTRO_DETAIL,OBJECT_SHARE,SKY_SHARE,markDetail,scenePool,spread} from './scene-pool.ts';
import {PORTRAIT_ORIGIN_Y,PORTRAIT_SCALE,bustCamera,portraitCamera,toPortraitDirection,toPortraitPoint,toPortraitSpace} from './fixed-bust.ts';
import {stageShot} from './camera-sequence.ts';
import {STRIDE,rotateHeldObjects} from './particle-morph.ts';

// The window the A10 baseline was measured in: 1280x720, canvas 627x630, which
// the scene's own sizing turns into 26,498 slots. Everything the site drew
// before came out of that number, so it is the yardstick for "unchanged".
const REST=26498,pool=scenePool(REST);

// ---------------------------------------------------------------------------
// The shared pool: bigger, but only where the opening needs it
// ---------------------------------------------------------------------------
// The sky and the held object keep the budgets they always had. This is the
// A08 hazard in one assertion: had they stayed a share of the pool, a pool
// grown for the close-up would have put 4,200 stars in the background of every
// chapter instead of 1,722, which is a starfield, not a few stars.
for(const pose of [0,1,2]){
 assert.equal(pool.sky(pose),Math.round(REST*SKY_SHARE[pose]),'the background keeps its original budget');
 assert.equal(pool.object(pose),Math.round(REST*OBJECT_SHARE[pose]),'the held object keeps its original budget');
 assert.ok(pool.sky(pose)/pool.count<SKY_SHARE[pose],'the background is a smaller share of the bigger pool, never a bigger one');
}
// The other two poses draw exactly the figure they drew before.
for(const pose of [1,2])assert.equal(pool.shown(pose),REST-pool.sky(pose)-pool.object(pose),'poses two and three keep their original star count');
assert.equal(pool.restFigure,REST-pool.sky(0)-pool.object(0));
// The first pose draws all of its stars, at every distance.
//
// It is a closed surface: most of its stars face away, graze the silhouette or
// sit behind something, where the flat sampling the other two poses use puts
// every star on the surface facing the camera. Cutting it back to their count
// is what made the first chapter see-through — rasterised through the scene's
// own maths at the wide stop, the same 22,391 stars carried 0.63 of the light
// the old flat pose did, and the hand and collar stopped reading; drawing the
// whole figure gives 1.24. A star count is not a visible density, and this
// assertion is what stops the two being equated again.
assert.equal(pool.shown(0),pool.body(0),'the first pose never hides part of itself');
// Every pose fills the pool exactly, or ParticleMorph cannot pair them.
for(const pose of [0,1,2])assert.equal(pool.body(pose)+pool.sky(pose)+pool.object(pose),pool.count,'every pose fills the same pool');
assert.ok(pool.count>REST&&pool.count===Math.round(pool.restFigure*INTRO_DETAIL)+pool.sky(0)+pool.object(0));
for(const pose of [1,2])assert.ok(pool.body(pose)>pool.shown(pose),'the extra slots are all figure, never background');
// A window a quarter of the size still divides the same way round.
const small=scenePool(11600);
assert.ok(small.count<pool.count&&small.shown(1)===11600-small.sky(1)-small.object(1),'the pool still follows the canvas');

// ---------------------------------------------------------------------------
// Which stars are the close-up's, and where they sit in the array
// ---------------------------------------------------------------------------
{
 // Pose two, the one that does hold slots back.
 const bodyCount=pool.body(1),shown=pool.shown(1);
 const target=new Float32Array(pool.count*STRIDE);
 markDetail(target,bodyCount,shown);
 let drawn=0;
 for(let i=0;i<bodyCount;i++)if(target[i*STRIDE+9]===0)drawn++;
 assert.equal(drawn,shown,'exactly the original figure is left drawn');
 // And the first pose keeps every star it has.
 const first=new Float32Array(pool.count*STRIDE);
 markDetail(first,pool.body(0),pool.shown(0));
 assert.ok(first.every(v=>v===0),'nothing of the first pose is marked away');
 // Spread through the array, not a block at the end: the resting figure has to
 // be the whole silhouette thinned out, and the pairing that builds a chapter
 // change works on neighbourhoods of the array.
 for(let tenth=0;tenth<10;tenth++){
  let kept=0;
  const from=Math.floor(tenth*bodyCount/10),to=Math.floor((tenth+1)*bodyCount/10);
  for(let i=from;i<to;i++)if(target[i*STRIDE+9]===0)kept++;
  const share=kept/(to-from);
  assert.ok(Math.abs(share-shown/bodyCount)<.02,`the resting figure is spread evenly (tenth ${tenth}: ${share.toFixed(3)})`);
 }
 // Nothing outside the figure is touched: the object and the sky read fields
 // 9..11 as a pivot, and marking them would move the flame to the origin.
 for(let i=bodyCount;i<pool.count;i++)assert.equal(target[i*STRIDE+9],0,'only body slots carry the detail mark');
}
// An even stride covers the source and repeats only if it is asked for more
// than exists, which is what keeps a short build from leaving empty slots.
{
 const seen=new Set<number>();
 for(let i=0;i<1000;i++)seen.add(spread(i,1000,4000));
 assert.equal(seen.size,1000);
 assert.equal(spread(0,1000,4000),0);
 assert.equal(spread(999,1000,4000),3996);
 assert.ok(spread(999,1000,300)===299&&spread(500,1000,300)===150,'a short source repeats rather than running past its end');
}

// ---------------------------------------------------------------------------
// The one bridge between the camera's units and the site's particle space
// ---------------------------------------------------------------------------
assert.ok(Math.abs(PORTRAIT_SCALE-2.1/1.04)<1e-12);
assert.ok(Math.abs(PORTRAIT_ORIGIN_Y-169*2.1/557)<1e-12);
// Ticket 01's measured figure lands exactly on the box the site's own poses
// occupy: x=(u-.5)*1.04 over the plate's 557 columns, y=(.5-v)*1.76 over its
// 941 rows. If this drifts, every constant in ParticleMorph, the drift
// amplitudes and the light positions are quietly wrong.
{
 const top=toPortraitPoint([0,0.999,0]),bottom=toPortraitPoint([0,-2.442,0]);
 const side=toPortraitPoint([1.048,0,0]);
 assert.ok(Math.abs(top[1]-0.810)<.002,`the figure's top lands where the old poses' does (${top[1].toFixed(3)})`);
 assert.ok(Math.abs(bottom[1]+0.894)<.002,`and its hem too (${bottom[1].toFixed(3)})`);
 assert.ok(Math.abs(side[0]-0.519)<.002,`and its width (${side[0].toFixed(3)})`);
 assert.ok(Math.abs(toPortraitPoint([0,0,0])[1]-PORTRAIT_ORIGIN_Y/PORTRAIT_SCALE)<1e-12);
 // The relief flips: the old projection, 3/(3+z), looks from -z, and this
 // figure is built with +z towards the camera.
 assert.ok(toPortraitPoint([0,0,1])[2]<0&&toPortraitDirection([0,0,1])[2]===-1);
}
// The projection has to survive the conversion exactly, or the framing accepted
// in world units is not the framing the site draws. Same points, same camera,
// two spaces, identical clip coordinates.
for(const stage of ['approach','front','turn-back','back','return','done'] as const)for(const progress of [0,.37,1]){
 const shot=stageShot(stage,progress);
 const world=bustCamera(shot.angle,shot.radius,shot.target),site=portraitCamera(shot.angle,shot.radius,shot.target);
 for(const basis of [site.right,site.up,site.back])assert.ok(Math.abs(Math.hypot(...basis)-1)<1e-12,'the converted basis stays a basis');
 for(const point of [[0,.999,0],[-1.052,-2.442,.89],[.6,-.3,-.585],[0,0,0]]){
  const converted=toPortraitPoint(point);
  const relW=point.map((v,i)=>v-world.eye[i]),relS=converted.map((v,i)=>v-site.eye[i]);
  const dot=(a:number[],b:number[])=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const depthW=-dot(relW,world.back),depthS=-dot(relS,site.back);
  assert.ok(Math.abs(depthS*PORTRAIT_SCALE-depthW)<1e-9,'depth scales by exactly the unit ratio');
  for(const [axisW,axisS] of [[world.right,site.right],[world.up,site.up]]){
   const ndcW=dot(relW,axisW)*3.8/depthW,ndcS=dot(relS,axisS)*3.8/depthS;
   assert.ok(Math.abs(ndcW-ndcS)<1e-9,`${stage} projects the same in both spaces (${ndcW.toFixed(6)} vs ${ndcS.toFixed(6)})`);
  }
 }
}

// ---------------------------------------------------------------------------
// Converting a built pose: positions, normals and pivots, by role
// ---------------------------------------------------------------------------
{
 const points=new Float32Array(3*STRIDE);
 // body: field 9 is an edge fade, not a pivot, and must survive untouched.
 points.set([.2,.5,.3, .4,.5,.6, 0,0,1, .7,0,0, 0],0);
 // held object: fields 9..11 are its pivot and have to make the same journey.
 points.set([.25,.55,.35, .4,.5,.6, 0,0,1, .2,.5,.3, 2],STRIDE);
 // sky
 points.set([3,4,5, .4,.5,.6, 0,0,0, 0,0,0, -1],2*STRIDE);
 const converted=toPortraitSpace(points.slice());
 // The pool is a Float32Array, so compare at its own precision.
 const close=(actual:Float32Array,expected:number[],message:string)=>
  assert.ok([...actual].every((v,i)=>Math.abs(v-expected[i])<1e-6),`${message} (${[...actual]} vs ${expected})`);
 close(converted.subarray(0,3),toPortraitPoint([.2,.5,.3]),'body positions convert');
 assert.equal(converted[9],points[9],'the body edge fade is not a pivot and is left alone');
 close(converted.subarray(STRIDE+9,STRIDE+12),toPortraitPoint([.2,.5,.3]),'the object pivot makes the same journey as the object');
 assert.equal(converted[8],-1,'normals flip with the depth axis');
 close(converted.subarray(2*STRIDE,2*STRIDE+3),toPortraitPoint([3,4,5]),'the sky converts with everything else');
 for(const k of [12,STRIDE+12,2*STRIDE+12])assert.equal(converted[k],points[k],'roles are untouched');
 for(let i=3;i<6;i++)assert.equal(converted[i],points[i],'colours are untouched');

 // The object still turns on the spot, in the palm, after conversion: the
 // shared helper spins it about the stored pivot, and the body must not follow.
 const spun=rotateHeldObjects(converted,1.7,converted.slice());
 const offset=[0,1,2].map(a=>spun[STRIDE+a]-spun[STRIDE+9+a]);
 const before=[0,1,2].map(a=>converted[STRIDE+a]-converted[STRIDE+9+a]);
 assert.ok(Math.abs(Math.hypot(...offset)-Math.hypot(...before))<1e-6,'the object keeps its distance from the palm');
 assert.deepEqual([...spun.subarray(STRIDE+9,STRIDE+12)],[...converted.subarray(STRIDE+9,STRIDE+12)],'the pivot itself stays in the hand');
 const bodyMoved=Math.hypot(...[0,1,2].map(a=>spun[a]-converted[a]));
 assert.ok(bodyMoved<.01,'the figure drifts gently and does not rotate with the object');
}

// Nothing in the pool depends on where the camera is: the figure that arrives
// at the wide stop is the figure the close-up showed, so there is no distance
// at which part of it can vanish.
assert.equal(pool.shown(0),pool.body(0));
assert.deepEqual(stageShot('done',1).target,stageShot('return',1).target,'the opening ends on the shot the first chapter holds');

console.log(`Scene pool at the A10 window: ${pool.count} slots = ${pool.body(0)} figure (all drawn, at every distance) + ${pool.object(0)} object + ${pool.sky(0)} sky.
Poses two and three draw ${pool.shown(1)} and ${pool.shown(2)} figure stars, their original counts, with the background at its original ${pool.sky(1)}/${pool.sky(2)}.
Camera converts into the site's particle space with identical clip coordinates; figure spans y -0.894..0.810 there, the box the existing poses occupy.
Rendered density, framing and motion remain a visual review.`);
