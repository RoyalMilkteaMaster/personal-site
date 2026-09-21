import assert from 'node:assert/strict';
import {ParticleMorph,galaxy,assignParticleIds,backgroundStars,rotateHeldObjects,motionPhases,motionUniforms,MOTION_STRIDE,STRIDE,chapterProgress} from './particle-morph.ts';
assert.equal(chapterProgress(0),0);assert.equal(chapterProgress(1),1);
assert.ok(chapterProgress(.60)>.98,'New pose is readable before the short settling tail');
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
assert.notDeepEqual(rotated.slice(0,STRIDE*3),pose.slice(0,STRIDE*3),'Body stars drift gently');
for(let k=0;k<STRIDE*3;k+=STRIDE){
 assert.ok(Math.hypot(rotated[k]-pose[k],rotated[k+1]-pose[k+1],rotated[k+2]-pose[k+2])<.0067,'Drift stays inside the silhouette detail budget');
 assert.deepEqual(rotated.slice(k+3,k+STRIDE),pose.slice(k+3,k+STRIDE),'Drift does not change colour or surface data');
}
assert.notDeepEqual(rotated.slice(STRIDE*3,STRIDE*3+3),pose.slice(STRIDE*3,STRIDE*3+3),'Only the held object rotates');
const next=new ParticleMorph(pose);next.retarget(slots,2000,1250,rotated);
assert.deepEqual(next.update(2000),rotated,'Transition starts at the actually displayed rotated positions');
assert.deepEqual(next.update(3250),slots);
assert.deepEqual(rotateHeldObjects(slots,0,new Float32Array(slots.length)),slots,'No position jump when idle rotation starts');
console.log('Fixed pool, bijective correspondence, visible source stars, gentle body drift and rendered-position continuity passed.');

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

const aligned=assignParticleIds(second,1,first),direct=new ParticleMorph(first);
direct.retarget(aligned,0,1800,first,true);
for(const time of [300,900,1500]){
 const frame=direct.update(time);
 for(let k=0;k<frame.length;k+=STRIDE){
  const radius=(points:Float32Array)=>Math.hypot(points[k],Math.sqrt(1-.55**2)*points[k+1]-.55*points[k+2]);
  assert.ok(radius(frame)>=Math.min(radius(first),radius(aligned))-1e-6,'Stars never collapse toward a shared intermediate hub');
  assert.ok(radius(frame)<=Math.max(radius(first),radius(aligned))+1e-6,'Stars keep bounded personal orbits');
  for(let a=3;a<6;a++)assert.ok(frame[k+a]>=Math.min(first[k+a],aligned[k+a])-1e-6&&frame[k+a]<=Math.max(first[k+a],aligned[k+a])+1e-6,'Colours travel directly to their destination palette');
 }
}
const interrupted=direct.update(700).slice();direct.retarget(first,700,1000,interrupted,true);
assert.deepEqual(direct.update(700),interrupted);assert.deepEqual(direct.update(1700),first);
const local=assignParticleIds(reversed,1,slots);
assert.deepEqual(local,slots,'Local pairing must not collapse an unchanged shape into the centre');
// An unchanged ring must still turn, with no backwards turn or radial collapse.
const ring=slots.slice(),orbit=new ParticleMorph(ring);
orbit.retarget(ring,0,2200,ring,true);
let previous=ring.slice(),turn=0;
for(let time=20;time<=2200;time+=20){
 const frame=orbit.update(time).slice(),u=Math.sqrt(1-.55**2);
 const angle=(p:Float32Array)=>Math.atan2(u*p[1]-.55*p[2],p[0]);
 const delta=Math.atan2(Math.sin(angle(frame)-angle(previous)),Math.cos(angle(frame)-angle(previous)));
 assert.ok(delta>=-1e-6,'Orbital transport must not rewind midway');turn+=delta;previous=frame;
}
assert.ok(Math.abs(turn-2*Math.PI)<1e-5,'The stars complete a continuous orbit');
assert.deepEqual(orbit.current,ring);
const driftLater=rotateHeldObjects(pose,3,new Float32Array(pose.length));
assert.ok([0,STRIDE,STRIDE*2].some(k=>Math.hypot(driftLater[k]-rotated[k],driftLater[k+1]-rotated[k+1])>.003),'Idle movement is visibly larger than the old subpixel drift');
console.log('Continuous orbital paths, no hub collapse, local pairing, endpoint colours and interruption continuity passed.');
// GPU ambient motion (Ticket 08): the shader receives per-index phases and
// time terms pre-reduced to [0,2π) in double precision. Emulate the shader's
// float32 arithmetic here and check it against rotateHeldObjects at the last
// buffer index of the Works pool (68155) and after a long hold.
{
 const f=Math.fround,count=68155,tau=Math.PI*2,phases=motionPhases(count);
 assert.equal(MOTION_STRIDE,5);assert.equal(phases.length,count*MOTION_STRIDE);
 for(const i of [0,1,7,68154]){
  const k=i*MOTION_STRIDE;
  assert.equal(phases[k],f((i*0.61803398875)%1),'Twinkle seed unchanged');
  for(let j=1;j<MOTION_STRIDE;j++)assert.ok(phases[k+j]>=0&&phases[k+j]<tau,'Phases are range reduced');
  assert.ok(Math.abs(Math.sin(phases[k+1])-Math.sin(i*STRIDE))<3e-6,'Sky shimmer phase keeps sin(k)');
  assert.ok(Math.abs(Math.sin(phases[k+2])-Math.sin(i*2.399963))<3e-6,'Body phase keeps sin(id*2.399963)');
  assert.ok(Math.abs(Math.sin(phases[k+3])-Math.sin(i*2.399963*1.4))<3e-6,'Body y phase keeps the 1.4 multiple');
  assert.ok(Math.abs(Math.sin(phases[k+4])-Math.sin(i*2.399963*.7))<3e-6,'Body z phase keeps the .7 multiple');
 }
 const source=new Float32Array(count*STRIDE);
 for(let i=0;i<count;i++){
  const k=i*STRIDE,role=i%3===0?-1:i%3===1?0:1+(i%2);
  source.set([Math.sin(i*.37)*.6,Math.cos(i*.53)*.5,Math.sin(i*.11)*.3,.3+(i%7)/10,.4+(i%5)/10,.5+(i%3)/10,Math.sin(i*.7),Math.cos(i*.9),Math.sin(i*.2)+.1,role>.5?.2:.4,role>.5?.5:0,role>.5?-.1:0,role],k);
 }
 const gpu=(i:number,u:ReturnType<typeof motionUniforms>)=>{
  const k=i*STRIDE,m=i*MOTION_STRIDE,role=source[k+12];
  const [x,y,z,r,g,b,nx,ny,nz]=Array.from(source.subarray(k,k+9)).map(f);
  const [px,,pz]=Array.from(source.subarray(k+9,k+12)).map(f);
  const held=u.held.map(f),sky=u.sky.map(f),drift=u.drift.map(f),shimmer=u.shimmer.map(f);
  if(role<-.5){
   const X=f(f(x*sky[0])-f(y*sky[1])),Y=f(f(x*sky[1])+f(y*sky[0]));
   const sh=f(f(1-shimmer[1])+f(shimmer[1]*f(Math.cos(f(shimmer[0]+phases[m+1])))));
   return [X,Y,z,f(r*sh),f(g*sh),f(b*sh),nx,ny,nz];
  }
  if(role<.5)return [f(x+f(f(f(.0032)*f(Math.sin(f(drift[0]+phases[m+2]))))*drift[3])),f(y+f(f(f(.0055)*f(Math.sin(f(drift[1]+phases[m+3]))))*drift[3])),f(z+f(f(f(.002)*f(Math.sin(f(drift[2]+phases[m+4]))))*drift[3])),r,g,b,nx,ny,nz];
  const dx=f(x-px),dz=f(z-pz);
  return [f(f(f(dx*held[0])+f(dz*held[1]))+px),y,f(f(f(-dx*held[1])+f(dz*held[0]))+pz),r,g,b,f(f(nx*held[0])+f(nz*held[1])),ny,f(f(-nx*held[1])+f(nz*held[0]))];
 };
 const out=new Float32Array(source.length);
 let worst={value:0,seconds:0,i:0,axis:0};
 for(const seconds of [0,.4,.8,1,7.3,61.7,600,3600]){
  rotateHeldObjects(source,seconds,out);
  const u=motionUniforms(seconds,false);
  for(const i of [0,1,2,3,4,5,300,301,302,68152,68153,68154]){
   const k=i*STRIDE,got=gpu(i,u);
   for(let axis=0;axis<9;axis++){
    const d=Math.abs(got[axis]-out[k+axis]);
    if(d>worst.value)worst={value:d,seconds,i,axis};
   }
  }
 }
 assert.ok(worst.value<4e-6,`GPU motion matches the CPU reference: ${JSON.stringify(worst)}`);
 rotateHeldObjects(source,5,out);
 const still=motionUniforms(5,true);
 for(const i of [0,1,2,68152,68153,68154]){
  const k=i*STRIDE;assert.deepEqual(gpu(i,still),Array.from(source.subarray(k,k+9)),'Reduced motion leaves the source untouched');
 }
 assert.deepEqual(motionUniforms(5,true).drift,[0,0,0,0]);
 console.log('GPU motion phases and uniforms match rotateHeldObjects at index 68154 and after a one-hour hold; worst',JSON.stringify(worst));
}
