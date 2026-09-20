import assert from 'node:assert/strict';
import {bustCamera} from './fixed-bust.ts';
import {INTRO_COPY,INTRO_MOVE_MS,INTRO_RETURN_MS,INTRO_TURN_MS,INTRO_TYPE_MS,INTRO_WAIT_MS,IntroSequence,introPropReveal} from './portrait-intro.ts';
import {BACK_ANGLE,INSPECT_FULL_RADIUS,SEQUENCE_HOLD_MS,SEQUENCE_STEPS,SEQUENCE_TOTAL_MS,WIDE_ANGLE,orbitShot,sequenceAt,sequenceElapsed,stageShot,sweepShot} from './camera-sequence.ts';

const dot=(a:number[],b:number[])=>a.reduce((sum,v,i)=>sum+v*b[i],0);
// The orbit axis is fixed even though the look-at height travels, so the angle
// and the outward distance can both be read against a point on that axis.
const AXIS=[.04,.30,0];
const azimuth=(eye:number[])=>Math.atan2(eye[0]-AXIS[0],eye[2]-AXIS[2]);
const distance=(eye:number[],from:number[]=AXIS)=>Math.hypot(...eye.map((v,i)=>v-from[i]));
// Two fixed points of the figure itself. "Moving outward" has to mean leaving
// the person behind, not just growing the distance to whatever the camera
// happens to be looking at, so both are checked against every moving frame.
const HEAD=[.04,.52,0],MIDDLE=[.04,-.72,0];

// The approved fixed timings, taken from the requirement rather than the code.
assert.equal(INTRO_TURN_MS,900,'The first turn lasts 0.9 seconds');
assert.equal(INTRO_WAIT_MS,3000,'A finished text waits three seconds');
assert.equal(SEQUENCE_HOLD_MS,INTRO_TYPE_MS+INTRO_WAIT_MS,'A hold is the typing plus the three second wait');
assert.deepEqual(SEQUENCE_STEPS.map(step=>step.stage),['approach','front','turn-back','back','return']);
assert.deepEqual(SEQUENCE_STEPS.map(step=>step.duration),[INTRO_MOVE_MS,3900,900,3900,INTRO_RETURN_MS]);
assert.equal(INTRO_RETURN_MS,2600,'The calibrated second leg, the only duration the spec leaves open');
assert.equal(SEQUENCE_TOTAL_MS,13100);

// Stage boundaries: seeking a time lands on the stage the flow is really in.
const frontAt=INTRO_MOVE_MS,turnAt=frontAt+SEQUENCE_HOLD_MS,backAt=turnAt+INTRO_TURN_MS,returnAt=backAt+SEQUENCE_HOLD_MS;
assert.equal(sequenceAt(0).stage,'approach');
assert.equal(sequenceAt(frontAt-1).stage,'approach');
assert.equal(sequenceAt(frontAt).stage,'front');
assert.equal(sequenceAt(turnAt-1).stage,'front','The front text holds three seconds after typing, not after arriving');
assert.equal(sequenceAt(turnAt).stage,'turn-back');
assert.equal(sequenceAt(backAt-1).stage,'turn-back');
assert.equal(sequenceAt(backAt).stage,'back','The first turn takes exactly 900ms');
assert.equal(sequenceAt(returnAt-1).stage,'back');
assert.equal(sequenceAt(returnAt).stage,'return');
assert.equal(sequenceAt(SEQUENCE_TOTAL_MS-1).stage,'return');
assert.equal(sequenceAt(SEQUENCE_TOTAL_MS).stage,'done');
assert.equal(sequenceAt(-500).stage,'approach','Seeking before the start clamps to the first frame');
assert.deepEqual(sequenceAt(1e6).shot,sequenceAt(SEQUENCE_TOTAL_MS).shot,'Seeking past the end clamps to the final wide shot');

// Text and continue affordance at seeked times.
const frontChars=INTRO_COPY.front.title.length+INTRO_COPY.front.body.length;
assert.equal(sequenceAt(frontAt).state.visibleChars,0);
assert.equal(sequenceAt(frontAt+INTRO_TYPE_MS-1).state.canAdvance,false,'Nothing to continue while the text is still typing');
assert.equal(sequenceAt(frontAt+INTRO_TYPE_MS).state.visibleChars,frontChars);
assert.equal(sequenceAt(frontAt+INTRO_TYPE_MS).state.canAdvance,true);
assert.equal(sequenceAt(backAt+INTRO_TYPE_MS).state.visibleChars,INTRO_COPY.back.title.length+INTRO_COPY.back.body.length);
for(const stage of ['approach','turn-back','return','done'] as const)assert.equal(sequenceAt(sequenceElapsed(stage,10)).state.canAdvance,false,'Moving stages carry no text to continue');

// Whole playback: one direction, always outward, still while the text holds.
const samples:{t:number;stage:string;angle:number;radius:number;target:number[];eye:number[]}[]=[];
for(let t=0;t<=SEQUENCE_TOTAL_MS;t+=10){
 const at=sequenceAt(t),camera=bustCamera(at.shot.angle,at.shot.radius,at.shot.target);
 samples.push({t,stage:at.stage,angle:at.shot.angle,radius:at.shot.radius,target:at.shot.target,eye:camera.eye});
}
for(let i=1;i<samples.length;i++){
 const a=samples[i-1],b=samples[i];
 assert.ok(b.angle>=a.angle-1e-12,`The camera never turns back (${a.t}ms)`);
 assert.ok(b.radius>=a.radius-1e-12,`The orbit never closes back in (${a.t}ms)`);
 assert.ok(b.target[1]<=a.target[1]+1e-12,`The look-at point only ever travels down the figure (${a.t}ms)`);
 for(const point of [HEAD,MIDDLE])assert.ok(distance(b.eye,point)>=distance(a.eye,point)-1e-12,`The camera never approaches the figure again (${a.t}ms)`);
 if(b.stage===a.stage&&(a.stage==='front'||a.stage==='back')){
  assert.deepEqual(b.eye,a.eye,`The composition stands still while the text is read (${a.t}ms)`);
  assert.deepEqual(b.target,a.target,`A hold does not drift its framing (${a.t}ms)`);
 }
 if(b.stage===a.stage&&(a.stage==='turn-back'||a.stage==='return'||a.stage==='approach'))
  for(const point of [HEAD,MIDDLE])assert.ok(distance(b.eye,point)>distance(a.eye,point),`Every moving frame travels outward (${a.t}ms)`);
 if(b.stage===a.stage&&(a.stage==='turn-back'||a.stage==='return'))assert.ok(azimuth(b.eye)!==azimuth(a.eye)&&b.angle>a.angle,`Both turns run the same way round (${a.t}ms)`);
}
const turning=samples.filter(s=>s.stage==='turn-back'||s.stage==='return');
assert.ok(turning.every((s,i)=>i===0||Math.sin(s.angle-turning[i-1].angle)>=0),'The second turn continues the first, it does not unwind it');
const backFrames=samples.filter(s=>s.stage==='back'),returnFrames=samples.filter(s=>s.stage==='return');
assert.ok(Math.min(...returnFrames.map(s=>distance(s.eye)))>=distance(backFrames[0].eye),'The last leg never revisits the earlier close-up before pulling out');
assert.ok(distance(samples[0].eye)<distance(samples[samples.length-1].eye)/3,'The macro opening is far closer than the final wide shot');
assert.equal(sequenceAt(backAt).shot.angle,BACK_ANGLE,'The first turn ends on the requested back angle');
assert.equal(sequenceAt(SEQUENCE_TOTAL_MS).shot.angle,WIDE_ANGLE);

// Stage handovers are continuous, so continuing early never jumps the camera.
const boundaries=[['approach','front'],['front','turn-back'],['turn-back','back'],['back','return'],['return','done']] as const;
for(const [from,to] of boundaries)assert.deepEqual(stageShot(from,1),stageShot(to,0),`${from} hands the camera to ${to} without a cut`);
assert.deepEqual(stageShot('front',0),orbitShot(0));
assert.deepEqual(stageShot('back',.5),orbitShot(BACK_ANGLE),'A hold ignores its own progress');

// Angle scrubbing frames the portrait the same way the played sequence does.
for(const stage of ['turn-back','return'] as const)for(const progress of [0,.25,.5,.75,1]){
 const shot=stageShot(stage,progress);
 assert.deepEqual(orbitShot(shot.angle),shot,'Inspecting an angle reproduces the played frame');
}
assert.deepEqual(orbitShot(-1),orbitShot(0));
assert.deepEqual(orbitShot(99),orbitShot(WIDE_ANGLE));

// The static full-figure inspection distance must actually frame the whole first
// pose. The retired form of this check asserted radius/3.8 >= |target.y-bottom|,
// which silently assumed every point is at depth == radius. The shader divides
// by the point's own depth, so the half of the figure swinging towards the
// camera divides by less and projects further out: 10.5 passed that assertion
// and still cut the robe's lower edge off in the browser.
//
// So project instead. The eight corners of ticket 01's measured bounding box are
// a superset of the figure, run through the same expression the vertex shader
// uses, at every angle, on the narrowest layout the page supports.
// x,y,z world bounds of the body, re-measured after the shingled-course hair and
// the hand recalibration (evidence/tools/03-boxes.mjs, run against this file's
// own lib/fixed-bust.ts): the crown spikes stand 0.024 higher than the radial
// mass they replace, the index and middle fingers — the two the drawing curls
// towards the camera — reach 0.006 further forward, and tightening the scalp on
// to the skull pulled the back of the head in by 0.062. Observations of the
// figure this scene builds, not thresholds chosen to pass.
const FIGURE=[[-1.052,1.048],[-2.442,1.023],[-0.523,0.896]];
const PROJECTION=3.8,NARROW_ASPECT=.66,FRAME_MARGIN=.94;
let worstNdc={x:0,y:0,angle:0,depth:Infinity};
for(let degrees=0;degrees<=360;degrees+=.5){
 const camera=bustCamera(degrees*Math.PI/180,INSPECT_FULL_RADIUS);
 for(const x of FIGURE[0])for(const y of FIGURE[1])for(const z of FIGURE[2]){
  const relative=[x-camera.eye[0],y-camera.eye[1],z-camera.eye[2]];
  const depth=-dot(relative,camera.back);
  assert.ok(depth>0,`the whole figure stays in front of the inspection camera (${degrees} degrees)`);
  const ndcX=Math.abs(dot(relative,camera.right)*PROJECTION/NARROW_ASPECT/depth);
  const ndcY=Math.abs(dot(relative,camera.up)*PROJECTION/depth);
  if(ndcY>worstNdc.y)worstNdc={x:ndcX,y:ndcY,angle:degrees,depth};
  assert.ok(ndcX<=FRAME_MARGIN&&ndcY<=FRAME_MARGIN,
   `the static inspection frames the whole pose with margin (${degrees} degrees: |x| ${ndcX.toFixed(3)}, |y| ${ndcY.toFixed(3)})`);
 }
}
// Corners nearer than the target and corners further away must both be covered,
// or the check is back to assuming a single depth.
assert.ok(worstNdc.depth<INSPECT_FULL_RADIUS,'the worst frame is a corner nearer than the target, as expected');
assert.ok(INSPECT_FULL_RADIUS>Math.max(...samples.map(s=>s.radius)),'Inspection steps further back than any played frame');
assert.ok(samples.every(s=>s.radius!==INSPECT_FULL_RADIUS),'Playback never borrows the inspection distance');

// ---------------------------------------------------------------------------
// What each played stop actually frames.
//
// Boxes measured off the same fixed-bust build the page loads, with
// evidence/tools/03-boxes.mjs; plate rows come from that file's calibration
// frame (SPAN 2.1 over 557 columns, world y = 0 on row 301.5). They are a
// superset of the real cloud, so "inside the frame" is the conservative claim
// and "outside the frame" is checked only where the whole box is out.
//
// Every number below is projected the way the shader does it: divided by the
// point's own depth, and through the width fit the shader applies under a 0.62
// aspect. A stop cannot be judged from its radius; that mistake is what shipped
// a wide shot which cut the robe.
// ---------------------------------------------------------------------------
// Sixty plate rows at a time, not one box for the whole figure. A single box
// around head and shoulders has a corner at the top of the hair carrying the
// depth of the reaching sleeve, which no real point occupies; the bands keep
// the y/z correlation and are still a superset of the cloud.
// topRow, bottomRow, then x, y and z bounds of every body point in that band.
const BANDS=[
 [0,60,-.016,.377,.911,1.023,-.237,.190],[60,120,-.273,.568,.684,.910,-.404,.299],
 [120,180,-.316,.606,.458,.684,-.508,.366],[180,240,-.259,.571,.232,.458,-.523,.354],
 [240,300,-.871,.379,.006,.232,-.459,.260],[300,360,-1.007,.549,-.221,.006,-.376,.758],
 [360,420,-1.014,.649,-.447,-.221,-.345,.759],[420,480,-1.052,.809,-.673,-.447,-.351,.813],
 [480,540,-1.052,.934,-.899,-.673,-.357,.896],[540,600,-1.052,.928,-1.125,-.899,-.383,.804],
 [600,660,-1.051,.961,-1.352,-1.125,-.397,.627],[660,720,-1.047,1.047,-1.578,-1.352,-.419,.551],
 [720,780,-1.052,1.047,-1.804,-1.578,-.443,.522],[780,840,-1.051,1.047,-2.030,-1.804,-.473,.414],
 [840,900,-1.052,1.048,-2.256,-2.030,-.489,.428],[900,960,-1.051,1.048,-2.442,-2.256,-.502,.437],
];
const rows=(from:number,to:number)=>BANDS.filter(band=>band[0]>=from&&band[1]<=to)
 .map(band=>[[band[2],band[3]],[band[4],band[5]],[band[6],band[7]]]);
const HEAD_ROWS=rows(0,300),SHOULDER_ROWS=rows(240,360),WAIST_ROWS=rows(480,600),FULL_ROWS=rows(0,960);
const OBJECT=[[[-.715,-.247],[-.823,.156],[.622,1.089]]];
type Camera={eye:number[];right:number[];up:number[];back:number[]};
// `half` restricts a box to the surface a rear camera can actually see; the far
// side is turned away, so it is back-face faded and hidden behind the body.
const frame=(camera:Camera,boxes:number[][][],aspect:number,half:0|1|-1=0)=>{
 const fit=Math.min(1,aspect/.62);
 let x=0,top=-Infinity,bottom=Infinity;
 for(const box of boxes)for(const px of box[0])for(const py of box[1])for(const pz of half?[box[2][half>0?1:0]]:box[2]){
  const relative=[px-camera.eye[0],py-camera.eye[1],pz-camera.eye[2]];
  const depth=-dot(relative,camera.back);
  assert.ok(depth>0,'every corner of a framed box stays in front of the camera');
  x=Math.max(x,Math.abs(dot(relative,camera.right)*PROJECTION*fit/aspect/depth));
  const ndcY=dot(relative,camera.up)*PROJECTION*fit/depth;
  top=Math.max(top,ndcY);bottom=Math.min(bottom,ndcY);
 }
 return {x,top,bottom,height:top-bottom};
};
// The bands must add up to ticket 01's measured figure, or they are describing
// some other cloud than the one the page draws.
assert.deepEqual([Math.min(...BANDS.map(b=>b[2])),Math.max(...BANDS.map(b=>b[3]))],FIGURE[0]);
assert.deepEqual([Math.min(...BANDS.map(b=>b[4])),Math.max(...BANDS.map(b=>b[5]))],FIGURE[1]);
assert.deepEqual([Math.min(...BANDS.map(b=>b[6])),Math.max(...BANDS.map(b=>b[7]))],FIGURE[2]);
const shotCamera=(shot:{angle:number;radius:number;target:number[]})=>bustCamera(shot.angle,shot.radius,shot.target);
// The isolated page's desktop canvas, the main scene's canvas beside the text
// column, the two boxes a 390x844 phone gives the stage — 375/405 while the
// opening is running and 375/591 once the first chapter has it, measured in
// evidence/03-narrow-continuity-finding.md — and a narrow window where the
// width fit takes over. The stage eases between those two boxes at the end of
// the opening, so the whole pose has to be framed in both of them: a handover
// that changes size is one thing, one that crops the figure is another.
const ASPECTS=[1.21,.995,.9257,.6348,.45];
const frontStop=shotCamera(stageShot('front',0)),backStop=shotCamera(stageShot('back',0)),wideStop=shotCamera(stageShot('done',1));

const frontHead=frame(frontStop,HEAD_ROWS,1.21);
assert.ok(frontHead.top<=.95&&frontHead.bottom>=-.95,`the front stop holds the whole head (${frontHead.bottom.toFixed(3)}..${frontHead.top.toFixed(3)})`);
assert.ok(frontHead.height>=1.2,`the front stop is a close-up: the head fills ${(frontHead.height*50).toFixed(0)}% of the frame height`);
// The waist and everything under it sit below this frame. The held object is
// not covered by framing at all: its box reaches up to the collar, so what
// keeps it out of the close-ups is the reveal checked at the end of this file,
// not the camera.
assert.ok(frame(frontStop,WAIST_ROWS,1.21).top<-1,'the front close-up cannot see the waist');

const backHead=frame(backStop,HEAD_ROWS,1.21),backShoulders=frame(backStop,SHOULDER_ROWS,1.21);
assert.ok(backHead.top<=.95&&backHead.bottom>=-.95,`the rear stop holds the whole head (${backHead.bottom.toFixed(3)}..${backHead.top.toFixed(3)})`);
assert.ok(backShoulders.bottom>=-.95,`the rear stop holds the shoulders (down to ${backShoulders.bottom.toFixed(3)})`);
assert.ok(backHead.top-backShoulders.bottom>=1.2,`the rear stop stays a head-and-shoulders shot (${(backHead.top-backShoulders.bottom).toFixed(2)} of the frame)`);
// "No waist" is a claim about the surface the camera can see. At 160 degrees
// that is the rear half of the body; the front half is turned away, so it is
// back-face faded and depth-hidden by the torso in between.
assert.ok(frame(backStop,WAIST_ROWS,1.21,-1).top<-1,'the rear stop frames above the waist');
assert.ok(backStop.eye[1]<stageShot('back',0).target[1],'the rear stop looks slightly upwards');

for(const aspect of ASPECTS){
 const full=frame(wideStop,FULL_ROWS,aspect);
 assert.ok(full.top<=.95&&full.bottom>=-.95,`the wide stop frames the whole pose at aspect ${aspect} (${full.bottom.toFixed(3)}..${full.top.toFixed(3)})`);
 // Width is only ever tight on a very narrow window, where the shader's own fit
 // rule takes over and pins it: 0.969 of the frame at aspect 0.45 and below,
 // 0.60 on the desktop canvas. Inside, but with little room to spare — the
 // narrow main layout is on the report's risk list for the browser pass.
 assert.ok(full.x<=.98,`the wide stop frames the pose's width at aspect ${aspect} (|x| ${full.x.toFixed(3)})`);
 // Chapter one draws the same plate at y=(.5-v)*1.76 over 3/(3+z), which puts
 // its 941 rows at +-0.88. The intro has to end on that composition, not on a
 // safely distant version of it. Below a 0.62 aspect the shader's fit rule
 // holds the width and letterboxes the height instead, exactly as the main
 // scene does, so the figure shrinks there by design.
 assert.ok(full.height>1.6*Math.min(1,aspect/.62),`the wide stop keeps chapter one's framing, not a retreat (aspect ${aspect}: ${full.height.toFixed(3)})`);
 const held=frame(wideStop,OBJECT,aspect);
 assert.ok(held.x<=.95&&held.top<=.95&&held.bottom>=-.95,'the held object is inside the final frame');
}
// ---------------------------------------------------------------------------
// Leaving the opening early
//
// A chapter chosen mid-opening rebuilds the particles from what is on screen,
// and the camera has to carry on from the frame that is on screen too. Deriving
// the sweep from the angle alone passed every check that only looked at angles
// and still jumped: during `approach` the angle is 0 while the radius is
// somewhere between the macro and the front stop, and orbitShot(0) is 2.4. At
// 100ms into a 1800ms approach that is a 0.6 unit lurch on one frame.
// ---------------------------------------------------------------------------
{
 const escaped=stageShot('approach',100/INTRO_MOVE_MS);
 assert.ok(escaped.radius<orbitShot(0).radius-.5,'the approach really is inside the front stop, so this can jump');
 assert.deepEqual(sweepShot(escaped,0),escaped,'the sweep starts on the frame that was on screen');
 assert.equal(sweepShot(escaped,0).radius,escaped.radius,'no radius jump when the opening is left during the approach');
}
for(const stage of ['approach','front','turn-back','back','return'] as const)for(const at of [0,.2,.5,.9,1]){
 const from=stageShot(stage,at);
 assert.deepEqual(sweepShot(from,0),from,`${stage} at ${at} hands the camera over without a cut`);
 const landed=sweepShot(from,1),wide=stageShot('done',1);
 assert.ok(Math.abs(landed.angle-wide.angle)<1e-9&&Math.abs(landed.radius-wide.radius)<1e-9
  &&landed.target.every((v,i)=>Math.abs(v-wide.target[i])<1e-9),`${stage} at ${at} still finishes on the wide stop`);
 let previous=sweepShot(from,0);
 for(let p=.02;p<=1.0001;p+=.02){
  const now=sweepShot(from,p);
  assert.ok(now.angle>=previous.angle-1e-12,`the sweep never turns back (${stage} ${at} at ${p.toFixed(2)})`);
  assert.ok(now.radius>=previous.radius-1e-12,`the sweep never moves back in (${stage} ${at} at ${p.toFixed(2)})`);
  assert.ok(now.target[1]<=previous.target[1]+1e-12,'the look-at point only travels down the figure');
  for(const point of [HEAD,MIDDLE]){
   const before=distance(shotCamera(previous).eye,point),after=distance(shotCamera(now).eye,point);
   assert.ok(after>=before-1e-12,`the sweep keeps leaving the figure (${stage} ${at} at ${p.toFixed(2)})`);
  }
  previous=now;
 }
}
// A second chapter chosen mid-sweep must not restart or re-time the camera: the
// frame it is on is still the frame it carries on from.
{
 const first=stageShot('turn-back',.4),midway=sweepShot(first,.5);
 assert.deepEqual(sweepShot(midway,0),midway,'a sweep resumed from its own current frame does not jump');
 const wide=stageShot('done',1),landed=sweepShot(midway,1);
 assert.ok(Math.abs(landed.radius-wide.radius)<1e-9&&Math.abs(landed.angle-wide.angle)<1e-9);
}

// The object is hidden for both close stops and only arrives on the wide one.
for(const stage of ['approach','front','turn-back','back'] as const)for(const progress of [0,.5,1])
 assert.equal(introPropReveal(stage,progress),0,`no held object in the ${stage} shot`);
assert.equal(introPropReveal('done',0),1,'the held object is present on the finished wide shot');
assert.equal(introPropReveal('return',0),0,'the second leg starts with the object still hidden');
assert.ok(introPropReveal('return',1)===1,'the object has fully arrived by the end of the pull-out');
// "The prop appears only on the final wide shot" is a claim about the picture,
// not about the stage name. The first frame that shows any of it must already
// hold the whole pose, at every aspect the page lays out — and every earlier
// frame of the leg must show none of it. Keyed to the retired two-part return,
// the reveal opened at 260 degrees with the pose's worst point at |NDC| 1.91.
let arrival=1;
for(let t=0;t<=1;t+=.001)if(introPropReveal('return',t)>0){arrival=t;break;}
const arrivalShot=stageShot('return',arrival),arrivalCamera=shotCamera(arrivalShot);
assert.ok(arrival<1,'the object still fades in rather than popping on at the end');
for(const aspect of ASPECTS){
 const pose=frame(arrivalCamera,FULL_ROWS,aspect);
 assert.ok(pose.top<=1&&pose.bottom>=-1&&pose.x<=1,
  `the whole pose is already framed when the object starts to appear (aspect ${aspect}: ${pose.bottom.toFixed(3)}..${pose.top.toFixed(3)}, |x| ${pose.x.toFixed(3)})`);
}
for(let t=0;t<arrival;t+=.01){
 const cropped=frame(shotCamera(stageShot('return',t)),FULL_ROWS,1.21);
 if(cropped.top>1||cropped.bottom<-1)assert.equal(introPropReveal('return',t),0,`no object while the second leg still crops the pose (${(t*100).toFixed(0)}% of the leg)`);
}
assert.ok(introPropReveal('return',arrival-.01)===0&&stageShot('return',arrival).angle>BACK_ANGLE+Math.PI/3,
 `the object arrives on the settled wide shot (${(arrivalShot.angle*180/Math.PI).toFixed(0)} degrees, radius ${arrivalShot.radius.toFixed(2)})`);

// Every rendered pose stays a valid, portrait-facing camera.
for(const sample of samples){
 const camera=bustCamera(sample.angle,sample.radius,sample.target);
 assert.ok(camera.eye.every(Number.isFinite));
 for(const basis of [camera.right,camera.up,camera.back])assert.ok(Math.abs(Math.hypot(...basis)-1)<1e-10);
 assert.ok(Math.abs(dot(camera.right,camera.up))<1e-10&&Math.abs(dot(camera.right,camera.back))<1e-10&&Math.abs(dot(camera.up,camera.back))<1e-10);
 const relative=sample.target.map((v,i)=>v-camera.eye[i]);
 assert.ok(Math.abs(dot(relative,camera.right))<1e-10&&Math.abs(dot(relative,camera.up))<1e-10,'The portrait stays centred');
 assert.ok(-dot(relative,camera.back)>1,'The portrait stays in front of the camera');
}
assert.deepEqual(bustCamera(1).eye,bustCamera(1,4.4*Math.pow(1.15,1/Math.PI)).eye,'The original single-argument camera is unchanged');
// The default spiral still belongs to fixed-bust.test.ts; keep its contract
// checkable here while that file's geometry assertions are being reworked.
let defaultRadius=0;
for(let degrees=0;degrees<=360;degrees++){
 const camera=bustCamera(degrees*Math.PI/180);
 assert.ok(camera.radius>defaultRadius,'The single-argument camera keeps its increasing radius');
 defaultRadius=camera.radius;
 assert.ok(-dot([.04-camera.eye[0],.30-camera.eye[1],-camera.eye[2]],camera.back)>4);
}

// Live playback: clicks, keyboard advance, rapid clicks and replay.
const live=new IntroSequence(0);
assert.equal(live.update(500,true).stage,'approach','A click during a move never skips a stop');
assert.equal(live.update(frontAt).stage,'front');
assert.equal(live.update(frontAt+400,true).stage,'front','A click before the text finishes is ignored');
assert.equal(live.update(frontAt+INTRO_TYPE_MS,true).stage,'turn-back','A finished text continues on click');
assert.equal(live.update(frontAt+INTRO_TYPE_MS,true).stage,'turn-back','A second click in the same frame cannot skip the turn');
assert.equal(live.update(frontAt+INTRO_TYPE_MS+50,true).stage,'turn-back');
const earlyTurn=stageShot('turn-back',live.progress(frontAt+INTRO_TYPE_MS+INTRO_TURN_MS/2));
assert.ok(earlyTurn.angle>0&&earlyTurn.angle<BACK_ANGLE,'Continuing early keeps the turn on the same path');
assert.equal(live.update(frontAt+INTRO_TYPE_MS+INTRO_TURN_MS).stage,'back','The clicked turn still lasts its full 900ms');
assert.equal(live.update(frontAt+INTRO_TYPE_MS+INTRO_TURN_MS+SEQUENCE_HOLD_MS).stage,'return');
assert.equal(live.update(1e6,true).stage,'done');
assert.equal(live.update(1e6+5000,true).stage,'done','Clicking after the end stays put');
const replay=new IntroSequence(1e6+9000);
assert.equal(replay.update(1e6+9000).stage,'approach','Replay starts a fresh sequence');
assert.deepEqual(stageShot(replay.stage,replay.progress(1e6+9000)),sequenceAt(0).shot,'Replay returns to the opening frame');

assert.equal(sequenceElapsed('approach',-50),0);
assert.equal(sequenceElapsed('back',SEQUENCE_HOLD_MS+9999),returnAt,'A hold cannot report past its own end');
assert.equal(sequenceElapsed('done',0),SEQUENCE_TOTAL_MS);

const wide=frame(wideStop,FULL_ROWS,1.21);
console.log(`Camera sequence: ${samples.length} timeline frames checked; 0.9s turn, 3s wait, one-way outward orbit ${(samples[0].radius).toFixed(2)}→${samples[samples.length-1].radius.toFixed(2)}, continuous stage handovers, click/replay guards.
Stops, projected through the shader's own expression at aspect 1.21:
  front  angle 0   radius ${stageShot('front',0).radius.toFixed(2)} look-at y ${stageShot('front',0).target[1].toFixed(2)} - head ${frontHead.bottom.toFixed(3)}..${frontHead.top.toFixed(3)}, waist below the frame
  back   angle 160 radius ${stageShot('back',0).radius.toFixed(2)} look-at y ${stageShot('back',0).target[1].toFixed(2)} - head+shoulders ${backShoulders.bottom.toFixed(3)}..${backHead.top.toFixed(3)}, rear waist below the frame, eye ${(stageShot('back',0).target[1]-backStop.eye[1]).toFixed(2)} under the look-at
  wide   angle 360 radius ${stageShot('done',1).radius.toFixed(2)} look-at y ${stageShot('done',1).target[1].toFixed(2)} - whole pose ${wide.bottom.toFixed(3)}..${wide.top.toFixed(3)}, |x| ${wide.x.toFixed(3)} (chapter one draws it -0.888..0.845)
  held object hidden until ${(arrival*100).toFixed(0)}% of the second leg (${Math.round(arrival*INTRO_RETURN_MS)}ms, ${(arrivalShot.angle*180/Math.PI).toFixed(0)} degrees), by which point the whole pose is inside the frame.
Static inspection at radius ${INSPECT_FULL_RADIUS}: worst projected corner |y| ${worstNdc.y.toFixed(3)} at ${worstNdc.angle}deg, depth ${worstNdc.depth.toFixed(2)} < radius (margin ${FRAME_MARGIN}). Radius 10.5 reaches 1.14 on the same check.
Rendered shape, framing and full-pose composition remain a separate visual review.`);
