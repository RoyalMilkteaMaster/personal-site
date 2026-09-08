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
  const raw=Math.max(0,Math.min(1,(now-this.start)/this.duration)),p=ease(raw),arc=raw===0||raw===1?0:Math.sin(Math.PI*raw);
  if(raw===1){this.current.set(this.target);return this.current;}
  for(let i=0;i<this.current.length;i++){
   const axis=i%STRIDE,id=Math.floor(i/STRIDE);
   const swirl=axis===0?Math.sin(id*2.399)*.15:axis===1?Math.cos(id*2.399)*.1:axis===2?.24:0;
   this.current[i]=this.from[i]+(this.target[i]-this.from[i])*p+swirl*arc;
  }
  return this.current;
 }
 retarget(target:Float32Array,now:number,duration=1050){
  if(target.length!==this.current.length)throw new Error('Particle counts must remain equal');
  this.update(now);this.from.set(this.current);this.target.set(target);this.start=now;this.duration=Math.max(1,duration);
 }
}
export function galaxy(count:number,angle=0){
 const out=new Float32Array(count*STRIDE);
 const colors=[[.62,.69,1],[.83,.65,1],[1,.82,.56],[.72,.87,1]];
 for(let i=0;i<count;i++){
  const f=((i*0.61803398875)%1),r=.12+Math.sqrt(f)*1.05;
  const a=i%4*Math.PI/2+r*4+angle+Math.sin(i*13.1)*.3;
  const k=i*STRIDE;out[k]=Math.cos(a)*r;out[k+1]=Math.sin(a)*r*.43;out[k+2]=Math.sin(a)*r*.6+Math.sin(i)*.07;
  // High portrait counts should not turn the opening galaxy into solid ribbons.
  const random=Math.sin(i*127.1+311.7)*43758.5453;
  const intensity=random-Math.floor(random)>.875?1:.14+(i%13)/13*.16;
  const color=colors[(i+Math.floor(i/7))%4];
  for(let c=0;c<3;c++)out[k+3+c]=color[c]*intensity;
  out[k+8]=-1;
 }
 return out;
}

