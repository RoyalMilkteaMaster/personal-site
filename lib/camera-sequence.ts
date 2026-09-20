import {ease} from './particle-morph.ts';
import {INTRO_MOVE_MS,INTRO_RETURN_MS,INTRO_TURN_MS,INTRO_TYPE_MS,INTRO_WAIT_MS,IntroSequence} from './portrait-intro.ts';
import type {IntroStage} from './portrait-intro.ts';

// One unwrapped orbit around the fixed portrait: the angle only increases and
// the radius never comes back in, so `return` is the second half of the same
// move rather than a trip back to the opening close-up. Holds keep both values
// frozen, leaving the text on a still composition.
export const BACK_ANGLE=160*Math.PI/180,WIDE_ANGLE=2*Math.PI;
// Framing, measured against ticket 01's finished figure with
// evidence/tools/03-frame-fit.mjs, which projects every real point through the
// page's own vertex expression at the layout aspects the page actually uses.
//
// A single look-at point cannot hold both ends of this move. Held at head
// height the whole pose sits 2.74 below the target and only 0.70 above it, so
// the wide stop had to retreat until that 2.74 fitted — 7.2 still cut the robe
// and even 13, the static inspection distance, only frames it by giving up the
// composition. The target travels with the shot instead: the head for the two
// close stops, the middle of the pose for the wide one. The orbit axis itself
// never moves (x and z are constant), so the turn stays one unwrapped circle.
//
// The wide stop is chosen to reproduce chapter one's own composition. The main
// scene draws the plate at x=(u-.5)*1.04, y=(.5-v)*1.76 and divides by
// 3/(3+z), which puts plate row 0 at NDC y +0.88 and row 941 at -0.88. Radius
// 7.8 about the pose's middle projects the real cloud to -0.881..0.841 — the
// same figure at the same size, so the intro can end where chapter one begins.
const MACRO_RADIUS=1.75,FRONT_RADIUS=2.4,BACK_RADIUS=3.2;
export const WIDE_RADIUS=7.8;
// Look-at heights: the head's own middle (plate row ~163), a touch lower for
// the rear head-and-shoulders, then the middle of the whole pose.
const HEAD_LEVEL=.52,BACK_LEVEL=.34,WIDE_LEVEL=-.72;
const AXIS_X=.04;
// Static inspection keeps bustCamera's original head-height point, so ticket
// 01's projected full-figure fit check at INSPECT_FULL_RADIUS still describes
// what the inspection controls show.
export const INSPECT_TARGET=[AXIS_X,.30,0];
// Inspection only. The whole first pose reaches y=-2.442 (ticket 01 maps plate
// row 941 through SPAN 2.1 / 557 columns, origin row 301.5).
//
// The earlier 10.5 came from reading the renderer as "shows |y-target| <=
// radius/3.8". It does not: the shader divides clip space by each point's own
// depth, -(point-eye).back, and only a point sitting exactly on the target plane
// has depth == radius. The hem swings towards the camera on the near side of the
// orbit, so it divides by less and lands further out — measured, 10.5 puts the
// worst point at |NDC y| 1.09 near 264 degrees and clips the robe's lower edge.
// 13 keeps the whole figure inside the frame at every angle with room to spare
// (|NDC y| 0.86, |NDC x| 0.59 even on the narrow 0.66 aspect layout); see
// evidence/tools/inspect-fit-r2.mjs and the projected fit check in
// camera-sequence.test.ts, which now projects rather than assumes.
//
// The played timeline never uses it. It holds every angle at once from a fixed
// head-height point, which is a different job from the wide stop: that one only
// has to frame the pose from the front, and does it from 7.8 by moving the
// look-at point instead of retreating.
export const INSPECT_FULL_RADIUS=13;
export const SEQUENCE_HOLD_MS=INTRO_TYPE_MS+INTRO_WAIT_MS;
export const SEQUENCE_STEPS:{stage:IntroStage;duration:number}[]=[
 {stage:'approach',duration:INTRO_MOVE_MS},
 {stage:'front',duration:SEQUENCE_HOLD_MS},
 {stage:'turn-back',duration:INTRO_TURN_MS},
 {stage:'back',duration:SEQUENCE_HOLD_MS},
 {stage:'return',duration:INTRO_RETURN_MS}
];
export const SEQUENCE_TOTAL_MS=SEQUENCE_STEPS.reduce((total,step)=>total+step.duration,0);
export type Shot={angle:number;radius:number;target:number[]};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const level=(y:number)=>[AXIS_X,y,0];

// The orbit radius and the look-at height both belong to the angle, so scrubbing
// the angle slider frames the portrait exactly as the played sequence does at
// that angle.
export function orbitShot(angle:number):Shot{
 const a=Math.max(0,Math.min(WIDE_ANGLE,angle));
 const t=a<=BACK_ANGLE?a/BACK_ANGLE:(a-BACK_ANGLE)/(WIDE_ANGLE-BACK_ANGLE);
 return a<=BACK_ANGLE
  ?{angle:a,radius:lerp(FRONT_RADIUS,BACK_RADIUS,t),target:level(lerp(HEAD_LEVEL,BACK_LEVEL,t))}
  :{angle:a,radius:lerp(BACK_RADIUS,WIDE_RADIUS,t),target:level(lerp(BACK_LEVEL,WIDE_LEVEL,t))};
}
export function stageShot(stage:IntroStage,progress:number):Shot{
 const t=ease(progress);
 switch(stage){
  // The opening pulls out of a hair-level macro shot; it never dollies in.
  case 'approach':return {angle:0,radius:lerp(MACRO_RADIUS,FRONT_RADIUS,t),target:level(HEAD_LEVEL)};
  case 'front':return orbitShot(0);
  case 'turn-back':return orbitShot(BACK_ANGLE*t);
  case 'back':return orbitShot(BACK_ANGLE);
  case 'return':return orbitShot(lerp(BACK_ANGLE,WIDE_ANGLE,t));
  default:return orbitShot(WIDE_ANGLE);
 }
}
// Leaving the opening early, when a chapter is chosen before it has finished.
//
// The camera keeps going the way it was already turning and completes the orbit
// while the particles rebuild. It blends the whole shot, not just the angle:
// during `approach` the radius is somewhere between the macro and the front
// stop at angle 0, and deriving the shot from the angle alone put it straight
// back to orbitShot(0), which is radius 2.4 — a visible jump on the first frame
// of the sweep. At progress 0 this returns exactly the frame that was on
// screen, and from the back stop onwards it is the orbit's own path anyway,
// because radius and look-at are already linear in the angle there.
export function sweepShot(from:Shot,progress:number):Shot{
 const t=ease(progress),to=stageShot('done',1);
 return {
  angle:from.angle+(to.angle-from.angle)*t,
  radius:from.radius+(to.radius-from.radius)*t,
  target:from.target.map((v,i)=>v+(to.target[i]-v)*t)
 };
}
export function sequenceElapsed(stage:IntroStage,stageElapsed:number){
 let start=0;
 for(const step of SEQUENCE_STEPS){
  if(step.stage===stage)return start+Math.max(0,Math.min(step.duration,stageElapsed));
  start+=step.duration;
 }
 return SEQUENCE_TOTAL_MS;
}
// The exact frame at a timeline position, run through the same IntroSequence
// the live playback uses, with nobody clicking through a hold early.
export function sequenceAt(elapsed:number){
 const at=Math.max(0,Math.min(SEQUENCE_TOTAL_MS,elapsed)),sequence=new IntroSequence(0);
 let start=0,state=sequence.update(0);
 for(const step of SEQUENCE_STEPS){
  if(at<start+step.duration)break;
  start+=step.duration;state=sequence.update(start);
 }
 state=sequence.update(at);
 const progress=sequence.progress(at);
 return {stage:sequence.stage,progress,state,shot:stageShot(sequence.stage,progress)};
}
