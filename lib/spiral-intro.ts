import {assignParticleIds,ease,STRIDE} from './particle-morph.ts';
import {portraitPoints} from './portrait-points.ts';

// The supplied rear illustration is the destination, including both shoulders
// and the back ornament. Do not substitute the generated head-only views.
export function rearShoulderShot(front:Float32Array,view:ImageData){
 const slots:number[]=[];
 for(let k=0;k<front.length;k+=STRIDE)if(front[k+12]===0&&front[k+1]>-1.2&&front[k+1]<1.2&&Math.abs(front[k])<1.3)slots.push(k);
 const body=portraitPoints(view.data,view.width,view.height,slots.length);
 const reference=new Float32Array(body.length),width=1.85,height=width*view.height/view.width;
 for(let k=0;k<body.length;k+=STRIDE){
  const v=.5-body[k+1]/1.76;
  body[k]*=width/1.04;body[k+1]=body[k+1]*height/1.76+.12;
  body[k+9]=ease((v-.89)/.11);
 }
 slots.forEach((k,i)=>reference.set(front.subarray(k,k+STRIDE),i*STRIDE));
 const paired=assignParticleIds(body,0,reference),out=front.slice(),selected=new Set(slots);
 for(let k=0;k<out.length;k+=STRIDE){
  if(out[k+12]===0&&!selected.has(k))out[k+9]=1;
  if(out[k+12]<-.5){out[k]=-front[k];out[k+2]=-front[k+2];}
 }
 slots.forEach((k,i)=>out.set(paired.subarray(i*STRIDE,(i+1)*STRIDE),k));
 return out;
}

// A clockwise expanding spiral, shared across BOTH transitions. Subtracting
// its chord lets each shot land at its composed anchor while retaining the arc.
export function spiralCameraPoint(turn:number){
 const radius=.24*Math.pow((1+Math.sqrt(5))/2,turn),angle=Math.PI/4-turn*Math.PI/2;
 return {x:radius*Math.cos(angle),y:radius*Math.sin(angle),radius,angle};
}
export function spiralCameraOffset(leg:0|1,progress:number){
 const a=spiralCameraPoint(leg),b=spiralCameraPoint(leg+1),p=spiralCameraPoint(leg+progress);
 return {x:(p.x-a.x-(b.x-a.x)*progress)*3,y:(p.y-a.y-(b.y-a.y)*progress)*3};
}
export function spiralTransition(from:Float32Array,to:Float32Array,progress:number,leg:0|1,out:Float32Array){
 if(from.length!==to.length||out.length!==from.length)throw Error('Particle count mismatch');
 if(progress<=0){out.set(from);return out;}
 if(progress>=1){out.set(to);return out;}
 const p=ease(progress),camera=spiralCameraOffset(leg,p),scale=1-.10*Math.sin(Math.PI*p);
 for(let k=0;k<out.length;k+=STRIDE){
  for(let a=0;a<STRIDE;a++)out[k+a]=from[k+a]+(to[k+a]-from[k+a])*p;
  const sky=from[k+12]<-.5;
  if(sky){
   // Two positive half-turns complete a revolution; leg 2 never reverses leg 1.
   const angle=Math.PI*p,x=from[k],z=from[k+2];
   out[k]=x*Math.cos(angle)+z*Math.sin(angle);out[k+2]=-x*Math.sin(angle)+z*Math.cos(angle);
  }
  const parallax=sky?.45:1;
  out[k]=(out[k]-camera.x*parallax)*(sky?1:scale);
  out[k+1]=(out[k+1]-camera.y*parallax)*(sky?1:scale);
 }
 return out;
}
