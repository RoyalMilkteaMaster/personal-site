'use client';
import {useEffect,useRef} from 'react';
import {projectStar} from '../lib/space';

export default function InteractiveSpace({light}:{light:boolean}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current, host=canvas?.parentElement;
  if(!canvas||!host)return;
  const ctx=canvas.getContext('2d'); if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(pointer: fine)');
  let width=1,height=1,frame=0,last=0,time=0,visible=true;
  let targetX=0,targetY=0,px=0,py=0,scroll=0;
  let cursorX=-1000,cursorY=-1000;
  const stars=Array.from({length:220},(_,i)=>({
   x:Math.sin(i*127.1+1)*1.5,y:Math.sin(i*311.7+4)*1.5,
   depth:.3+((i*0.61803398875)%1)*2.7,phase:i*2.4
  }));
  const resize=()=>{
   width=host.clientWidth;height=host.clientHeight;
   const dpr=Math.min(devicePixelRatio||1,1.5);
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);
   if(reduced.matches)draw();
  };
  const move=(e:PointerEvent)=>{
   if(!fine.matches||reduced.matches||e.pointerType==='touch')return;
   const r=host.getBoundingClientRect();
   cursorX=e.clientX-r.left;cursorY=e.clientY-r.top;
   targetX=(cursorX/width-.5)*2;targetY=(cursorY/height-.5)*2;
  };
  const leave=()=>{targetX=targetY=0;cursorX=cursorY=-1000;};
  const onScroll=()=>{scroll=Math.max(0,Math.min(1,-host.getBoundingClientRect().top/height));};
  const glow=(x:number,y:number,r:number,color:string)=>{
   const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
   ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  };
  function draw(){
   if(!ctx)return;
   ctx.clearRect(0,0,width,height);
   const t=reduced.matches?0:time;
   const sx=reduced.matches?0:px,sy=reduced.matches?0:py;
   const progress=reduced.matches?0:scroll;
   glow(width*(.68+Math.sin(t*.13)*.1)+sx*70,height*.48+sy*45,width*.48,light?'#668eff26':'#6257be55');
   glow(width*(.46+Math.cos(t*.17)*.15)-sx*30,height*(.62+Math.sin(t*.19)*.12),width*.38,light?'#60bca521':'#23768c35');
   glow(width*.84-sx*60,height*(.26+Math.sin(t*.22)*.07),width*.32,light?'#edb15c22':'#a5799730');
   const count=width<760?100:220;
   for(let i=0;i<count;i++){
    const star=stars[i];
    const z=.3+((star.depth-t*.045-progress*.6+30)%2.7);
    const p=projectStar(star.x,star.y,z,sx,sy,width,height);
    if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
    const distance=Math.hypot(p.x-cursorX,p.y-cursorY);
    const alpha=(.3+(Math.sin(t*.8+star.phase)+1)*.16)*Math.min(1,z/.5);
    ctx.globalAlpha=alpha*(light?.65:1);
    ctx.fillStyle=i%5===0?(light?'#916632':'#edcf9d'):(light?'#536bbc':'#d8dbff');
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius*(distance<140?1.35:1),0,Math.PI*2);ctx.fill();
    if(distance<140&&fine.matches&&!reduced.matches){
     ctx.globalAlpha=(1-distance/140)*.2;
     ctx.strokeStyle=light?'#536bbc':'#d1b6ef';ctx.lineWidth=.6;
     ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(cursorX,cursorY);ctx.stroke();
    }
    if(i%19===0){ctx.globalAlpha=alpha*.28;ctx.fillRect(p.x-5,p.y-.4,10,.8);ctx.fillRect(p.x-.4,p.y-5,.8,10);}
   }
   // Abstract orbital paths: time, pointer and scroll share one continuous scene.
   const cx=width*(width<760?.74:.76)+sx*30,cy=height*.49+sy*24-progress*100;
   const radius=Math.min(width*.29,height*.36);
   ctx.lineWidth=.7;
   for(let ring=0;ring<3;ring++){
    const tilt=ring*.85+t*.025+sx*.15+progress*.9;
    const point=(a:number)=>{
     const x=Math.cos(a)*radius,y=Math.sin(a)*radius*(.28+ring*.15);
     return {x:cx+x*Math.cos(tilt)-y*Math.sin(tilt),y:cy+x*Math.sin(tilt)+y*Math.cos(tilt)};
    };
    ctx.globalAlpha=light?.2:.24;ctx.strokeStyle=ring===1?(light?'#755ab4':'#bfa8e6'):(light?'#926328':'#e0c49d');
    ctx.beginPath();for(let j=0;j<=160;j++){const p=point(j/160*Math.PI*2);if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
    for(let n=0;n<3;n++){const p=point(t*(.07+ring*.015)+n*Math.PI*2/3+ring);ctx.globalAlpha=.85;ctx.fillStyle=light?'#8270b0':'#e6d0b2';ctx.beginPath();ctx.arc(p.x,p.y,n===0?3:1.8,0,Math.PI*2);ctx.fill();if(!light){ctx.globalAlpha=.5;glow(p.x,p.y,12,'#d7bff580');}}
   }
   ctx.globalAlpha=1;
   host?.style.setProperty('--space-x',`${sx*20}px`);
   host?.style.setProperty('--space-y',`${sy*14}px`);
  }
  function tick(now:number){
   frame=0;
   if(!visible||document.hidden||reduced.matches)return;
   const elapsed=now-last;
   if(elapsed>=1000/30){const dt=Math.min(elapsed/1000,.05);time+=dt;last=now;const blend=1-Math.exp(-dt*5);px+=(targetX-px)*blend;py+=(targetY-py)*blend;draw();}
   frame=requestAnimationFrame(tick);
  }
  const sync=()=>{cancelAnimationFrame(frame);frame=0;last=performance.now();if(reduced.matches){leave();px=py=0;draw();}else if(visible&&!document.hidden)frame=requestAnimationFrame(tick);};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(host);
  const ro=new ResizeObserver(resize);ro.observe(host);
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
  window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  resize();onScroll();sync();
  return ()=>{cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);host.style.removeProperty('--space-x');host.style.removeProperty('--space-y');};
 },[light]);
 return <canvas ref={ref} className="interactive-space" aria-hidden="true"/>;
}
