'use client';
import {useEffect,useRef} from 'react';

export default function AstralScene({pose, replay, skip}:{pose:number; replay:number; skip:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 const pointer=useRef({x:0,y:0});
 useEffect(()=>{
  const canvas=ref.current; if(!canvas)return;
  const ctx=canvas.getContext('2d'); if(!ctx)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=media.matches, frame=0, disposed=false, start=0, last=0, w=1,h=1, visible=true;
  const img=new Image(); let ready=false;
  const points:{x:number;y:number;color:string;a:number;r:number}[]=[];
  const resize=()=>{const b=canvas.getBoundingClientRect(); w=b.width;h=b.height;const d=Math.min(devicePixelRatio,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);};
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});io.observe(canvas);
  const move=(e:PointerEvent)=>{const b=canvas.getBoundingClientRect();pointer.current={x:(e.clientX-b.left)/w-.5,y:(e.clientY-b.top)/h-.5};};
  const leave=()=>{pointer.current={x:0,y:0};};
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);
  const change=()=>{reduced=media.matches;};media.addEventListener('change',change);
  img.onload=()=>{if(disposed)return;const sample=document.createElement('canvas');sample.width=100;sample.height=170;const s=sample.getContext('2d');if(!s)return;
   s.drawImage(img,pose*img.width/3,0,img.width/3,img.height,0,0,100,170);
   const data=s.getImageData(0,0,100,170).data;
   for(let y=0;y<170;y+=2)for(let x=0;x<100;x+=2){const k=(y*100+x)*4;const brightness=(data[k]+data[k+1]+data[k+2])/765;if(brightness>.16)points.push({x:x/100,y:y/170,color:`rgb(${data[k]},${data[k+1]},${data[k+2]})`,a:Math.random()*Math.PI*2,r:Math.random()});}
   ready=true;start=performance.now();
  };img.src='/astral-poses.png';
  let px=0,py=0;
  const draw=(now:number)=>{if(disposed)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden||now-last<33)return;last=now;ctx.clearRect(0,0,w,h);
   const elapsed=ready?(now-start)/1000:0;const intro=pose===0&&!skip;
   const progress=reduced||skip?1:Math.min(1,Math.max(0,(elapsed-(intro?1.4:0))/(intro?3.2:.85)));
   const p=progress*progress*(3-2*progress);const fade=reduced||skip?1:Math.min(1,Math.max(0,(elapsed-(intro?4:0.65))/.8));
   px+=(pointer.current.x-px)*.055;py+=(pointer.current.y-py)*.055;
   const dx=reduced?0:px*16,dy=reduced?0:py*12;
   const ih=h,iw=ih*(img.width?img.width/3/img.height:.59),ix=(w-iw)/2+dx;
   for(let i=0;i<100;i++){const a=i*2.399+(reduced?0:now*.000015),r=Math.sqrt((i+.5)/100)*w*.65;ctx.globalAlpha=.2+(i%7)/12;ctx.fillStyle='#c9c6ef';ctx.beginPath();ctx.arc(w/2+Math.cos(a)*r,h/2+Math.sin(a)*r*.65, i%9===0?1.5:.7,0,Math.PI*2);ctx.fill();}
   if(ready&&fade>0){ctx.globalAlpha=fade;ctx.save();const mask=ctx.createLinearGradient(0,0,w,0);mask.addColorStop(0,'transparent');mask.addColorStop(.13,'black');mask.addColorStop(.87,'black');mask.addColorStop(1,'transparent');ctx.drawImage(img,pose*img.width/3+2,0,img.width/3-4,img.height,ix,dy,iw,ih);ctx.globalCompositeOperation='destination-in';ctx.fillStyle=mask;ctx.fillRect(0,0,w,h);ctx.restore();}
   ctx.globalAlpha=1;
   if(ready&&fade<1)for(const dot of points){const angle=dot.a+elapsed*.65*(1-p);const radius=(.08+dot.r*.65)*Math.max(w,h);const gx=w/2+Math.cos(angle)*radius,gy=h*.48+Math.sin(angle)*radius*.42;const x=gx*(1-p)+(ix+dot.x*iw)*p,y=gy*(1-p)+(dot.y*ih+dy)*p;ctx.globalAlpha=(1-fade)*.85;ctx.fillStyle=p>.5?dot.color:'#c6b5ed';ctx.fillRect(x,y,1.5,1.5);}
   ctx.globalAlpha=1;
  };frame=requestAnimationFrame(draw);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();media.removeEventListener('change',change);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);};
 },[pose,replay,skip]);
 return <canvas ref={ref} className="astral-canvas" aria-label="星點匯聚為手托發光星體的星空角色" role="img"/>;
}

