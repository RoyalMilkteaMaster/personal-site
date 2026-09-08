import {ease,STRIDE} from './particle-morph.ts';
export const INTRO_DURATION=6200;
// Camera moves over the existing relief. It never exposes an invented back side.
const frames=[
 {time:0,zoom:6.4,x:.07,y:.70,z:-.14,pitch:.85,yaw:-.28},
 {time:1800,zoom:2.9,x:.07,y:.51,z:-.14,pitch:.13,yaw:.18},
 {time:3500,zoom:2.7,x:.07,y:.50,z:-.14,pitch:-.03,yaw:-.10},
 {time:INTRO_DURATION,zoom:1,x:0,y:0,z:0,pitch:0,yaw:0}
];
export function portraitIntro(source:Float32Array,ms:number,out:Float32Array){
 if(source.length!==out.length)throw new Error('Particle counts must remain equal');
 out.set(source);if(ms>=INTRO_DURATION)return out;
 let index=0;while(index<frames.length-2&&ms>frames[index+1].time)index++;
 const a=frames[index],b=frames[index+1],t=ease((ms-a.time)/(b.time-a.time));
 const mix=(key:'zoom'|'x'|'y'|'z'|'pitch'|'yaw')=>a[key]+(b[key]-a[key])*t;
 const zoom=mix('zoom'),cx=mix('x'),cy=mix('y'),cz=mix('z');
 const cp=Math.cos(mix('pitch')),sp=Math.sin(mix('pitch')),cr=Math.cos(mix('yaw')),sr=Math.sin(mix('yaw'));
 for(let k=0;k<out.length;k+=STRIDE){
  const x=source[k]-cx,y=source[k+1]-cy,z=source[k+2]-cz;
  const rx=x*cr+z*sr,rz=-x*sr+z*cr;
  out[k]=rx*zoom;out[k+1]=(y*cp-rz*sp)*zoom;
  // Keep the camera outside the cloud while preserving depth parallax.
  out[k+2]=(y*sp+rz*cp)*Math.sqrt(zoom);
  const nx=source[k+6]*cr+source[k+8]*sr,nz=-source[k+6]*sr+source[k+8]*cr;
  out[k+6]=nx;out[k+7]=source[k+7]*cp-nz*sp;out[k+8]=source[k+7]*sp+nz*cp;
 }
 return out;
}
