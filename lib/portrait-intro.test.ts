import assert from 'node:assert/strict';
import {portraitView,rearPortrait,introPropReveal,IntroSequence,INTRO_MOVE_MS,INTRO_TURN_MS,INTRO_RETURN_MS,introWideProgress,INTRO_TYPE_MS,INTRO_WAIT_MS,INTRO_COPY} from './portrait-intro.ts';
import {STRIDE} from './particle-morph.ts';
const sequence=new IntroSequence(0);
assert.equal(sequence.update(500,true).stage,'approach','Clicks during movement do not skip a stop');
assert.equal(sequence.update(INTRO_MOVE_MS).stage,'front');
assert.equal(sequence.update(1300,true).stage,'front','Typing must finish before advancing');
assert.equal(sequence.update(INTRO_MOVE_MS+INTRO_TYPE_MS).visibleChars,INTRO_COPY.front.title.length+INTRO_COPY.front.body.length);
assert.equal(sequence.update(INTRO_MOVE_MS+INTRO_TYPE_MS+INTRO_WAIT_MS-1).stage,'front','Wait three seconds after typing, not after arriving');
assert.equal(sequence.update(INTRO_MOVE_MS+INTRO_TYPE_MS+INTRO_WAIT_MS).stage,'turn-back');
const backAt=INTRO_MOVE_MS+INTRO_TURN_MS+INTRO_TYPE_MS+INTRO_WAIT_MS;
assert.equal(sequence.update(backAt).stage,'back');
assert.equal(sequence.update(backAt+INTRO_TYPE_MS,true).stage,'return','Click advances a finished text without waiting three seconds');
assert.equal(sequence.update(backAt+INTRO_TYPE_MS+INTRO_RETURN_MS).stage,'done');
assert.equal(sequence.update(99999,true).stage,'done');
const replay=new IntroSequence(10000);assert.equal(replay.update(10000).stage,'approach','Brand replay begins a fresh sequence');
const source=new Float32Array(100*STRIDE);
for(let i=0;i<100;i++)source.set([Math.sin(i)*.3,.4+i*.004,-.2,1,.8,.6,0,0,-1,0,0,0,0],i*STRIDE);
const out=source.slice();
for(const view of ['approach','front','back','wide'] as const)for(const progress of [0,.5,1]){
 portraitView(source,view,progress,out);assert.ok(out.every(Number.isFinite));assert.equal(out.length,source.length);
 for(let k=0;k<source.length;k+=STRIDE)assert.deepEqual(out.slice(k+3,k+6),source.slice(k+3,k+6),'Camera retains each star colour and identity');
}
assert.deepEqual(portraitView(source,'approach',1,out).slice(),portraitView(source,'front',0,out),'Camera stops exactly at front close-up');
assert.deepEqual(portraitView(source,'wide',1,out),source,'Wide shot retains the approved first-pose samples exactly');
for(const stage of ['approach','front','turn-back','back'] as const)assert.equal(introPropReveal(stage,1),0,'Props never enter either close-up');
// The mid-turn frame the isolated page seeks to: 260 degrees, radius 5.5, with
// the pose's worst point still at |NDC| 1.91. Nothing of the object may show.
assert.equal(introPropReveal('return',.5),0,'The prop stays hidden while the second leg still crops the figure');
assert.equal(introPropReveal('return',.8),0,'The prop waits for the whole pose to be in frame, not for the leg to start');
assert.ok(introPropReveal('return',.92)>0&&introPropReveal('return',.92)<1,'A short fade, once the figure is framed');
assert.equal(introPropReveal('return',1),1);
assert.equal(introPropReveal('done',0),1);
const mixed=source.slice();mixed[12]=-1;mixed[25]=2;
const rearBody=source.slice(2*STRIDE);
for(let i=0;i<rearBody.length;i+=STRIDE)rearBody[i]*=-1;
const rear=rearPortrait(mixed,rearBody);
assert.equal(rear.length,mixed.length);
assert.deepEqual(rear.slice(0,2*STRIDE),mixed.slice(0,2*STRIDE),'Sky and hidden prop IDs remain untouched');
assert.ok(rear.every(Number.isFinite));
assert.throws(()=>rearPortrait(mixed,new Float32Array(STRIDE)));
assert.throws(()=>portraitView(source,'front',1,new Float32Array(2)));
console.log('Intro: moving/typing click guards, post-text timer, manual advance, replay and view continuity passed.');

const timing=new IntroSequence(0);timing.stage='turn-back';assert.equal(timing.duration(),900);
// Ticket 03 calibration: the second leg now carries 200 degrees and a pull from
// radius 3.2 out to 7.8, so it takes 2600ms. The 900ms first turn, the 900ms
// typing and the 3000ms wait are the approved fixed values and are unchanged.
timing.stage='return';assert.equal(timing.duration(),2600);

assert.equal(introWideProgress(400/INTRO_RETURN_MS),0,'Reverse orbit ends at 400ms');
assert.ok(Math.abs(introWideProgress(1500/INTRO_RETURN_MS)-.5)<1e-12,'Pullback runs the remaining 2200ms');
assert.equal(introWideProgress(1),1);
