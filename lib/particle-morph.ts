export const STRIDE = 13; // xyz, rgb, normal, pivot, role (-1 sky, 0 body, 1 solid prop, 2 emissive prop).
export function ease(t:number){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
export class ParticleMorph {
 current:Float32Array;
 private from:Float32Array;
 private target:Float32Array;
 private start=0;
 private duration=1;
 constructor(initial:Float32Array){this.current=initial.slice();this.from=initial.slice();this.target=initial.slice();}
 update(now:number){
  const raw=Math.max(0,Math.min(1,(now-this.start)/this.duration));
  if(raw===1){this.current.set(this.target);return this.current;}
  for(let k=0;k<this.current.length;k+=STRIDE){
   const id=k/STRIDE,delay=(id*.61803398875)%1*.12;
   const t=Math.max(0,Math.min(1,(raw-delay)/(1-delay))),p=ease(t),appearance=ease(t);
   const arc=Math.sin(Math.PI*p);
   const phase=id*2.399963,spin=arc*1.45,c=Math.cos(spin),s=Math.sin(spin);
   const x=this.from[k]+(this.target[k]-this.from[k])*p;
   const y=this.from[k+1]+(this.target[k+1]-this.from[k+1])*p;
   const z=this.from[k+2]+(this.target[k+2]-this.from[k+2])*p;
   // Every identity travels through depth and its own curved orbit. Endpoints
   // are exact; the middle is a moving star field, not stretched image tiles.
   this.current[k]=x*c+z*s+Math.cos(phase+t*2)*arc*.19;
   this.current[k+1]=y+Math.sin(phase+t*2)*arc*.16;
   this.current[k+2]=-x*s+z*c+Math.sin(phase)*arc*.22;
   for(let axis=3;axis<STRIDE;axis++)this.current[k+axis]=this.from[k+axis]+(this.target[k+axis]-this.from[k+axis])*appearance;
   for(let channel=0;channel<3;channel++){
    const star=channel===0?.55:channel===1?.66:.92;
    this.current[k+3+channel]=this.current[k+3+channel]*(1-arc*.65)+star*arc*.65;
   }
  }
  return this.current;
 }
 complete(now:number){return now>=this.start+this.duration;}
 retarget(target:Float32Array,now:number,duration=1050,displayed?:Float32Array){
  if(target.length!==this.current.length)throw new Error('Particle counts must remain equal');
  if(displayed&&displayed.length!==this.current.length)throw new Error('Displayed particle counts must remain equal');
  if(displayed)this.current.set(displayed);else this.update(now);
  this.from.set(this.current);this.target.set(target);this.start=now;this.duration=Math.max(1,duration);
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

// Apply object rotation in the same coordinate space used by the morph. The
// next transition can then start from the actual displayed positions/normals.
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
  if(source[k+12]<.5)continue;
  const x=source[k]-source[k+9],z=source[k+2]-source[k+11];
  out[k]=x*c+z*s+source[k+9];out[k+2]=-x*s+z*c+source[k+11];
  out[k+6]=source[k+6]*c+source[k+8]*s;out[k+8]=-source[k+6]*s+source[k+8]*c;
 }
 return out;
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

// Stable permutation per pose. Background destinations are in the same array:
// some stars leave the silhouette and others enter it on every chapter change.
export function assignParticleIds(target:Float32Array,pose:number){
 const count=target.length/STRIDE,order=Array.from({length:count},(_,i)=>i),out=new Float32Array(target.length);
 let seed=19381+pose*7919;
 for(let i=count-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 for(let i=0;i<count;i++)out.set(target.subarray(order[i]*STRIDE,(order[i]+1)*STRIDE),i*STRIDE);
 return out;
}

