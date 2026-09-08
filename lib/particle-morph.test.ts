import assert from 'node:assert/strict';
import {ParticleMorph,galaxy,assignParticleIds,backgroundStars,rotateHeldObjects,STRIDE} from './particle-morph.ts';
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
const assigned=assignParticleIds(reversed,0);
assert.deepEqual(Array.from({length:4},(_,i)=>assigned[i*STRIDE+9]).sort(),[0,1,2,3],'Assignment retains every point exactly once');
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

const total=1000,a=new Float32Array(total*STRIDE),b=new Float32Array(total*STRIDE);
a.set(galaxy(920));a.set(backgroundStars(80,0),920*STRIDE);
b.set(galaxy(880,1));b.set(backgroundStars(120,1),880*STRIDE);
const first=assignParticleIds(a,0),second=assignParticleIds(b,1),cloud=new ParticleMorph(first);
const sky=(p:Float32Array)=>Array.from({length:total},(_,i)=>p[i*STRIDE+12]<-.5);
assert.equal(sky(first).filter(Boolean).length,80);assert.equal(sky(second).filter(Boolean).length,120);
assert.ok(sky(first).some((isSky,i)=>isSky&&!sky(second)[i]),'Background identities enter the next figure');
assert.ok(sky(first).some((isSky,i)=>!isSky&&sky(second)[i]),'Figure identities return to the background');
cloud.retarget(second,0,1800);const flight=cloud.update(900).slice();
for(let i=0;i<total;i++){
 const k=i*STRIDE;
 assert.ok(Math.hypot(flight[k]-first[k],flight[k+1]-first[k+1],flight[k+2]-first[k+2])>.001,'Every star moves during reconstruction');
}
assert.deepEqual(cloud.update(1800),second,'No births or deaths at the end of the morph');
const drifting=rotateHeldObjects(second,3,new Float32Array(second.length));
assert.ok(sky(second).some((isSky,i)=>isSky&&drifting[i*STRIDE]!==second[i*STRIDE]),'Background keeps moving after formation');
console.log('Background/figure exchange, all-particle travel, constant totals and ambient star drift passed.');
