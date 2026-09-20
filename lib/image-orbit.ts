import {ease,STRIDE} from './particle-morph.ts';
import {portraitPoints} from './portrait-points.ts';

// Preserve neighbouring stars in narrow image rows. Independent optical-flow
// matches changed their ordering and made the surface churn between views.
export function imageOrbitFrames(front:Float32Array,views:ImageData[]){
 if(views.length!==5)throw Error('Orbit views mismatch');
 const bandCount=32,bands=Array.from({length:bandCount},()=>[] as number[]);
 for(let k=0;k<front.length;k+=STRIDE){
  const u=(front[k]+.938)/1.815,v=(.925-front[k+1])/1.818;
  if(front[k+12]===0&&u>=0&&u<=1&&v>=0&&v<1)bands[Math.floor(v*bandCount)].push(k);
 }
 bands.forEach(ids=>ids.sort((a,b)=>front[a]-front[b]||a-b));
 const slots=bands.flat(),selected=new Set(slots),frames=[front.slice()];
 for(const [index,view] of views.entries()){
  const body=portraitPoints(view.data,view.width,view.height,slots.length*2),pools=Array.from({length:bandCount},()=>[] as number[]);
  for(let k=0;k<body.length;k+=STRIDE){
   const u=body[k]/1.04+.5,v=.5-body[k+1]/1.76;
   body[k]=-.938+u*1.815;body[k+1]=.925-v*1.818;body[k+9]=ease((v-.86)/.14);
   pools[Math.min(bandCount-1,Math.max(0,Math.floor(v*bandCount)))].push(k);
  }
  const frame=front.slice();
  for(let band=0;band<bandCount;band++){
   const ids=bands[band],pool=pools[band];if(!ids.length||!pool.length)continue;
   pool.sort((a,b)=>body[a]-body[b]||a-b);
   ids.forEach((k,n)=>{
    const p=pool[Math.floor((n+.5)*pool.length/ids.length)];
    // Yaw keeps the camera height fixed; do not jitter stars vertically between samples.
    for(const axis of [0,3,4,5,9])frame[k+axis]=body[p+axis];
   });
  }
  for(let k=0;k<frame.length;k+=STRIDE){
   if(frame[k+12]===0&&!selected.has(k))frame[k+9]=1;
   if(frame[k+12]<-.5){const x=front[k],z=front[k+2],a=angles[index+1]*.55;frame[k]=x*Math.cos(a)+z*Math.sin(a);frame[k+2]=-x*Math.sin(a)+z*Math.cos(a);}
  }
  frames.push(frame);
 }
 return frames;
}
const angles=[0,.15,.32,.54,.76,1];
// Monotone tangents give continuous velocity at every view boundary without
// overshooting the illustrated contour or snapping direction at a keyframe.
function tangent(frames:Float32Array[],i:number,k:number){
 if(i===0)return (frames[1][k]-frames[0][k])/(angles[1]-angles[0]);
 if(i===frames.length-1)return (frames[i][k]-frames[i-1][k])/(angles[i]-angles[i-1]);
 const h0=angles[i]-angles[i-1],h1=angles[i+1]-angles[i];
 const d0=(frames[i][k]-frames[i-1][k])/h0,d1=(frames[i+1][k]-frames[i][k])/h1;
 if(d0*d1<=0)return 0;
 const w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d0+w1/d1);
}
export function imageOrbit(frames:Float32Array[],progress:number,out:Float32Array){
 if(frames.length!==angles.length||frames.some(f=>f.length!==out.length))throw Error('Invalid orbit frames');
 const t=ease(progress);
 if(t<=0){out.set(frames[0]);return out;}
 if(t>=1){out.set(frames.at(-1)!);return out;}
 let i=0;while(i<angles.length-2&&t>angles[i+1])i++;
 const h=angles[i+1]-angles[i],u=(t-angles[i])/h,a=frames[i],b=frames[i+1],u2=u*u,u3=u2*u;
 for(let k=0;k<out.length;k++)out[k]=k%STRIDE<3
  ?(2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*h*tangent(frames,i,k)+(-2*u3+3*u2)*b[k]+(u3-u2)*h*tangent(frames,i+1,k)
  :a[k]+(b[k]-a[k])*u;
 for(let k=0;k<out.length;k+=STRIDE)if(out[k+12]<-.5){
  const x=frames[0][k],z=frames[0][k+2],angle=t*.55;
  out[k]=x*Math.cos(angle)+z*Math.sin(angle);out[k+2]=-x*Math.sin(angle)+z*Math.cos(angle);
 }
 return out;
}
