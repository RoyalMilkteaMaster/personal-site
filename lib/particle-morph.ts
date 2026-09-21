export const STRIDE = 13; // xyz, rgb, normal, pivot, role (-1 sky, 0 body, 1 solid prop, 2 emissive prop).
export function ease(t:number){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
// A fast pose change followed by a small settling movement (HSR reference).
export function chapterProgress(t:number){return t<.56?.985*ease(t/.56):.985+.015*ease((t-.56)/.44);}
export class ParticleMorph {
 current:Float32Array;
 private from:Float32Array;
 private target:Float32Array;
 private start=0;
 private duration=1;
 private direct=false;
 private closeup=false;
 constructor(initial:Float32Array){this.current=initial.slice();this.from=initial.slice();this.target=initial.slice();}
 update(now:number){
  const raw=Math.max(0,Math.min(1,(now-this.start)/this.duration));
  if(raw===1){this.current.set(this.target);return this.current;}
  for(let k=0;k<this.current.length;k+=STRIDE){
   const id=k/STRIDE,delay=(id*.61803398875)%1*(this.direct?.025:.12);
   const t=Math.max(0,Math.min(1,(raw-delay)/(1-delay))),p=this.direct&&!this.closeup?chapterProgress(t):ease(t),appearance=p;
   if(t===0){this.current.set(this.from.subarray(k,k+STRIDE),k);continue;}
   const arc=Math.sin(Math.PI*p);
   const phase=id*2.399963,spin=arc*1.45,c=Math.cos(spin),s=Math.sin(spin);
   const x=this.from[k]+(this.target[k]-this.from[k])*p;
   const y=this.from[k+1]+(this.target[k+1]-this.from[k+1])*p;
   const z=this.from[k+2]+(this.target[k+2]-this.from[k+2])*p;
   this.current[k]=x*c+z*s+Math.cos(phase+t*2)*arc*.19;
   this.current[k+1]=y+Math.sin(phase+t*2)*arc*.16;
   this.current[k+2]=-x*s+z*c+Math.sin(phase)*arc*.22;
   for(let axis=3;axis<STRIDE;axis++)this.current[k+axis]=this.from[k+axis]+(this.target[k+axis]-this.from[k+axis])*appearance;
   if(this.direct){
    // One continuous orbit to the destination, never a third target shape.
    // Work in a tilted plane. Interpolating each star's radius preserves the
    // cloud's spread; differential winding lets stars flow rather than rotate
    // the whole portrait as a rigid card. Every orbit travels the same way.
    const tilt=.55,u=Math.sqrt(1-tilt*tilt);
    const sx=this.from[k],sq=u*this.from[k+1]-tilt*this.from[k+2];
    const tx=this.target[k],tq=u*this.target[k+1]-tilt*this.target[k+2];
    const sr=Math.hypot(sx,sq),tr=Math.hypot(tx,tq);
    const a=Math.atan2(sq,sx),end=Math.atan2(tq,tx);
    const delta=Math.atan2(Math.sin(end-a),Math.cos(end-a));
    const winding=this.closeup?.55*arc:2*Math.PI*p+.8*arc*Math.sin(sr*13+phase*.04);
    const angle=a+delta*p+winding,r=sr+(tr-sr)*p;
    const height=tilt*y+u*z,q=Math.sin(angle)*r;
    this.current[k]=Math.cos(angle)*r;
    this.current[k+1]=u*q+tilt*height;
    this.current[k+2]=-tilt*q+u*height;
    const nx=this.current[k+6],nq=u*this.current[k+7]-tilt*this.current[k+8];
    const nh=tilt*this.current[k+7]+u*this.current[k+8];
    const nc=Math.cos(winding),ns=Math.sin(winding),rotatedQ=nx*ns+nq*nc;
    this.current[k+6]=nx*nc-nq*ns;
    this.current[k+7]=u*rotatedQ+tilt*nh;
    this.current[k+8]=-tilt*rotatedQ+u*nh;
   }
   for(let channel=0;!this.direct&&channel<3;channel++){
    const star=channel===0?.55:channel===1?.66:.92;
    this.current[k+3+channel]=this.current[k+3+channel]*(1-arc*.65)+star*arc*.65;
   }
  }
  return this.current;
 }
 complete(now:number){return now>=this.start+this.duration;}
 retarget(target:Float32Array,now:number,duration=1050,displayed?:Float32Array,direct=false,closeup=false){
  if(target.length!==this.current.length)throw new Error('Particle counts must remain equal');
  if(displayed&&displayed.length!==this.current.length)throw new Error('Displayed particle counts must remain equal');
  if(displayed)this.current.set(displayed);else this.update(now);
  this.from.set(this.current);this.target.set(target);this.start=now;this.duration=Math.max(1,duration);this.direct=direct;this.closeup=closeup;
 }
}
export function galaxy(count:number,angle=0,out=new Float32Array(count*STRIDE)){
 if(out.length!==count*STRIDE)throw new Error('Galaxy particle counts must remain equal');
 const colors=[[.62,.69,1],[.83,.65,1],[1,.82,.56],[.72,.87,1]];
 for(let i=0;i<count;i++){
  const f=((i*0.61803398875)%1),r=.015+Math.pow(f,.8)*.59;
  const a=i%5===0?i*2.399963+angle:i%3*Math.PI*2/3+r*8+angle+Math.sin(i*13.1)*(.45+r*.8);
  const k=i*STRIDE;out[k]=Math.cos(a)*r;out[k+1]=Math.sin(a)*r*.60;out[k+2]=Math.sin(a)*r*.48+Math.sin(i)*.04;
  // These are background positions in the SAME pool, not extra particles.
  // Their identities also receive portrait/object destinations below.
  if(i>=count-Math.min(500,Math.floor(count*.06))){
   const h=Math.sin(i*61.7)*43758.5453,j=Math.sin(i*31.1)*37812.12;
   const orbit=(h-Math.floor(h))*Math.PI*2+angle,radius=.4+(j-Math.floor(j))*.45;
   out[k]=Math.cos(orbit)*radius;out[k+1]=Math.sin(orbit)*radius;out[k+2]=Math.sin(i)*.10;
  }
  // Every identity stays visibly present; avoid an almost-invisible reservoir
  // of stars suddenly appearing during formation. Size, not opacity, gives air.
  const random=Math.sin(i*127.1+311.7)*43758.5453;
  const intensity=.62+(random-Math.floor(random))*.38;
  const color=colors[(i+Math.floor(i/7))%4];
  for(let c=0;c<3;c++)out[k+3+c]=color[c]*intensity;
  out[k+8]=-1;
 }
 return out;
}

// Apply ambient movement in the morph's coordinate space, so chapter changes
// start at the displayed positions, including gently drifting body particles.
export function rotateHeldObjects(source:Float32Array,seconds:number,out:Float32Array){
 if(out.length!==source.length)throw new Error('Particle counts must remain equal');
 out.set(source);const angle=seconds*.48,c=Math.cos(angle),s=Math.sin(angle),skyC=Math.cos(seconds*.025),skyS=Math.sin(seconds*.025);
 for(let k=0;k<source.length;k+=STRIDE){
  if(source[k+12]<-.5){
   out[k]=source[k]*skyC-source[k+1]*skyS;out[k+1]=source[k]*skyS+source[k+1]*skyC;
   const shimmer=.85+.15*Math.cos(seconds*.9+k);
   for(let j=3;j<6;j++)out[k+j]=source[k+j]*shimmer;
   continue;
  }
  if(source[k+12]<.5){
   const phase=k/STRIDE*2.399963,ramp=ease(seconds/.8);
   out[k]+=.0032*Math.sin(seconds*.95+phase)*ramp;
   out[k+1]+=.0055*Math.sin(seconds*.8+phase*1.4)*ramp;
   out[k+2]+=.002*Math.sin(seconds*.6+phase*.7)*ramp;
   continue;
  }
  const x=source[k]-source[k+9],z=source[k+2]-source[k+11];
  out[k]=x*c+z*s+source[k+9];out[k+2]=-x*s+z*c+source[k+11];
  out[k+6]=source[k+6]*c+source[k+8]*s;out[k+8]=-source[k+6]*s+source[k+8]*c;
 }
 return out;
}

// GPU form of rotateHeldObjects (legacy-study vertex shader). Every time term
// is reduced to [0,2π) here in double precision and each buffer index carries
// its own pre-reduced phases, so float32 trig stays exact enough at the last
// index of the pool and after a long hold. Keep both functions in step.
export const MOTION_STRIDE=5; // twinkle seed, sky shimmer phase, body drift phases x/y/z.
export function motionPhases(count:number){
 const out=new Float32Array(count*MOTION_STRIDE),tau=Math.PI*2;
 for(let i=0;i<count;i++){
  const k=i*MOTION_STRIDE,phase=i*2.399963;
  out[k]=(i*0.61803398875)%1;out[k+1]=(i*STRIDE)%tau;out[k+2]=phase%tau;out[k+3]=(phase*1.4)%tau;out[k+4]=(phase*.7)%tau;
 }
 return out;
}
export function motionUniforms(seconds:number,reduced:boolean){
 if(reduced)return {held:[1,0],sky:[1,0],drift:[0,0,0,0],shimmer:[0,0]};
 const tau=Math.PI*2,angle=seconds*.48,sky=seconds*.025;
 return {held:[Math.cos(angle),Math.sin(angle)],sky:[Math.cos(sky),Math.sin(sky)],drift:[(seconds*.95)%tau,(seconds*.8)%tau,(seconds*.6)%tau,ease(seconds/.8)],shimmer:[(seconds*.9)%tau,.15]};
}

export function backgroundStars(count:number,pose:number){
 const out=new Float32Array(count*STRIDE);
 const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
 for(let i=0;i<count;i++){
  const angle=noise(i+pose*57)*Math.PI*2,r=.36+noise(i+371)*.62;
  const light=.36+noise(i+18)*.55,palette=i%3===0?[1,.81,.53]:i%3===1?[.67,.75,1]:[.85,.64,1];
  out.set([Math.cos(angle)*r,Math.sin(angle)*r,noise(i+124)*.65+.16,...palette.map(c=>c*light),0,0,0,0,0,0,-1],i*STRIDE);
 }
 return out;
}

// Stable identities: seed the first pose, then pair nearby regions. Background
// destinations share the array and can exchange particles with the silhouette.
export function assignParticleIds(target:Float32Array,pose:number,reference?:Float32Array){
 const count=target.length/STRIDE,order=Array.from({length:count},(_,i)=>i),out=new Float32Array(target.length);
 if(reference){
  if(reference.length!==target.length)throw new Error('Particle counts must remain equal');
  // Match nearby regions recursively. Random source/destination pairs all
  // cross the centre even on straight paths; local pairs retain the figure.
  const pair=(from:number[],to:number[])=>{
   if(from.length===1){out.set(target.subarray(to[0]*STRIDE,(to[0]+1)*STRIDE),from[0]*STRIDE);return;}
   let axis=0,largest=-1;
   for(let a=0;a<3;a++){
    let min=Infinity,max=-Infinity;
    for(const i of from){const v=reference[i*STRIDE+a];min=Math.min(min,v);max=Math.max(max,v);}
    for(const i of to){const v=target[i*STRIDE+a];min=Math.min(min,v);max=Math.max(max,v);}
    if(max-min>largest){largest=max-min;axis=a;}
   }
   from.sort((a,b)=>reference[a*STRIDE+axis]-reference[b*STRIDE+axis]||a-b);
   to.sort((a,b)=>target[a*STRIDE+axis]-target[b*STRIDE+axis]||a-b);
   const middle=from.length>>1;
   pair(from.slice(0,middle),to.slice(0,middle));pair(from.slice(middle),to.slice(middle));
  };
  if(count)pair(order.slice(),order);return out;
 }
 let seed=19381+pose*7919;
 for(let i=count-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 for(let i=0;i<count;i++)out.set(target.subarray(order[i]*STRIDE,(order[i]+1)*STRIDE),i*STRIDE);
 return out;
}

