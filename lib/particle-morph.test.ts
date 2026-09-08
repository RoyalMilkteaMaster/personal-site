import assert from 'node:assert/strict';
import {ParticleMorph,galaxy,matchSpatially,rotateHeldObjects,STRIDE} from './particle-morph.ts';
const start=galaxy(100),target=start.map((v,i)=>i%STRIDE<3?v*.4:v*.8),third=galaxy(100,1);
const m=new ParticleMorph(start);m.retarget(target,0,1000);
assert.deepEqual(m.update(0),start);
const middle=m.update(450).slice();m.retarget(third,450,1000);
assert.deepEqual(m.update(450),middle,'Interrupting a transition must not jump');
assert.deepEqual(m.update(1450),third,'Every particle must reach the new target');
assert.deepEqual(m.update(10000),third,'The completed portrait must persist');
assert.throws(()=>m.retarget(new Float32Array(6),0));
assert.ok([...m.current].every(Number.isFinite));
console.log('Particle continuity, interrupted transitions, endpoints and persistent hold passed.');

const slots=new Float32Array(4*STRIDE),reversed=new Float32Array(slots.length);
for(let i=0;i<4;i++){
 slots[i*STRIDE]=i%2-.5;slots[i*STRIDE+1]=Math.floor(i/2)-.5;slots[i*STRIDE+9]=i;
}
for(let i=0;i<4;i++)reversed.set(slots.subarray(i*STRIDE,(i+1)*STRIDE),(3-i)*STRIDE);
assert.deepEqual(matchSpatially(slots,reversed),slots,'Spatial matching is a bijection without arbitrary crossings');
assert.throws(()=>matchSpatially(slots,new Float32Array(STRIDE)));
const reused=galaxy(100);assert.equal(galaxy(100,.5,reused),reused,'Galaxy updates the same pool');
assert.ok(Array.from({length:100},(_,i)=>Math.max(...reused.slice(i*STRIDE+3,i*STRIDE+6))).every(b=>b>=.6),'No invisible reservoir of stars');

const pose=slots.slice();pose.set([.1,.2,.1,1,.8,.5,0,0,-1,0,0,0,1],STRIDE*3);
const rotated=rotateHeldObjects(pose,2,new Float32Array(pose.length));
assert.deepEqual(rotated.slice(0,STRIDE*3),pose.slice(0,STRIDE*3),'The person is completely stationary');
assert.notDeepEqual(rotated.slice(STRIDE*3,STRIDE*3+3),pose.slice(STRIDE*3,STRIDE*3+3),'Only the held object rotates');
const next=new ParticleMorph(pose);next.retarget(slots,2000,1250,rotated);
assert.deepEqual(next.update(2000),rotated,'Transition starts at the actually displayed rotated positions');
assert.deepEqual(next.update(3250),slots);
assert.deepEqual(rotateHeldObjects(slots,0,new Float32Array(slots.length)),slots,'No position jump when idle rotation starts');
console.log('Fixed pool, bijective correspondence, visible source stars, stationary body and rendered-position continuity passed.');
