export const STRIDE = 13; // xyz, rgb, surface normal, rotation pivot, spin weight.
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
   const t=Math.max(0,Math.min(1,(raw-delay)/(1-delay))),p=ease(t),appearance=ease((t-.65)/.35);
   const arc=Math.sin(Math.PI*p);
   const bendX=(this.from[k+1]-this.target[k+1])*.12,bendY=(this.target[k]-this.from[k])*.12;
   for(let axis=0;axis<STRIDE;axis++){
    const progress=axis<3?p:appearance;
    const bend=axis===0?bendX:axis===1?bendY:axis===2?.045:0;
    this.current[k+axis]=this.from[k+axis]+(this.target[k+axis]-this.from[k+axis])*progress+bend*arc;
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
  const f=((i*0.61803398875)%1),r=.04+Math.sqrt(f)*.49;
  const a=i%4*Math.PI/2+r*4+angle+Math.sin(i*13.1)*.5;
  const k=i*STRIDE;out[k]=Math.cos(a)*r;out[k+1]=Math.sin(a)*r*.80;out[k+2]=Math.sin(a)*r*.42+Math.sin(i)*.07;
  // These are background positions in the SAME pool, not extra particles.
  // Their identities also receive portrait/object destinations below.
  if(i>=count-Math.min(500,Math.floor(count*.06))){
   const orbit=i*2.399+angle,radius=.30+f*.24;
   out[k]=Math.cos(orbit)*radius;out[k+1]=Math.sin(orbit)*radius*1.35;out[k+2]=Math.sin(i)*.10;
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

// A bijection: pair the spatial ranks, then keep those identities for the whole
// session. This avoids arbitrary spiral-index -> image-row crossings.
export function matchSpatially(reference:Float32Array,target:Float32Array){
 if(reference.length!==target.length||target.length%STRIDE)throw new Error('Particle counts must remain equal');
 const spread=(v:number)=>{let n=Math.max(0,Math.min(1023,Math.round((v+1.2)/2.4*1023)));n=(n|(n<<8))&0x00ff00ff;n=(n|(n<<4))&0x0f0f0f0f;n=(n|(n<<2))&0x33333333;return (n|(n<<1))&0x55555555;};
 const order=(points:Float32Array)=>Array.from({length:points.length/STRIDE},(_,i)=>({i,rank:spread(points[i*STRIDE])|(spread(points[i*STRIDE+1])<<1)})).sort((a,b)=>a.rank-b.rank||a.i-b.i);
 const from=order(reference),to=order(target),out=new Float32Array(target.length);
 for(let i=0;i<from.length;i++)out.set(target.subarray(to[i].i*STRIDE,(to[i].i+1)*STRIDE),from[i].i*STRIDE);
 return out;
}

// Apply object rotation in the same coordinate space used by the morph. The
// next transition can then start from the actual displayed positions/normals.
export function rotateHeldObjects(source:Float32Array,seconds:number,out:Float32Array){
 if(out.length!==source.length)throw new Error('Particle counts must remain equal');
 out.set(source);const angle=seconds*.48,c=Math.cos(angle),s=Math.sin(angle);
 for(let k=0;k<source.length;k+=STRIDE){
  if(source[k+12]<.5)continue;
  const x=source[k]-source[k+9],z=source[k+2]-source[k+11];
  out[k]=x*c+z*s+source[k+9];out[k+2]=-x*s+z*c+source[k+11];
  out[k+6]=source[k+6]*c+source[k+8]*s;out[k+8]=-source[k+6]*s+source[k+8]*c;
 }
 return out;
}

