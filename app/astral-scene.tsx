'use client';
import {useEffect,useRef,useState} from 'react';
import {galaxy,ParticleMorph,STRIDE} from '@/lib/particle-morph';

const vertex=`
attribute vec3 aPosition;
attribute vec3 aColor;
uniform float uAspect;
uniform float uTime;
uniform float uDpr;
uniform float uMotion;
uniform vec2 uPointer;
varying vec3 vColor;
void main(){
 vec3 p=aPosition;
 float id=dot(aPosition,vec3(12.9898,78.233,32.4));
 p.x+=sin(uTime*.6+id)*.0025*uMotion;
 p.y+=cos(uTime*.5+id)*.0025*uMotion;
 float a=uPointer.x*.18;
 p=vec3(p.x*cos(a)+p.z*sin(a),p.y+uPointer.y*p.z*.12,-p.x*sin(a)+p.z*cos(a));
 float depth=3.0/(3.0+p.z);
 gl_Position=vec4(p.x*depth/uAspect,p.y*depth,0.0,1.0);
 float bright=max(aColor.r,max(aColor.g,aColor.b));
 gl_PointSize=uDpr*(1.25+bright*.75)*depth;
 vColor=aColor*(.91+.09*sin(uTime*.7+id)*uMotion);
}`;
const fragment=`precision mediump float;
varying vec3 vColor;
void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;float alpha=(1.0-smoothstep(.2,.5,r))*.9;gl_FragColor=vec4(vColor,alpha);}`;

export default function AstralScene({pose,replay,skip}:{pose:number;replay:number;skip:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const command=useRef({pose,replay,skip});
 const [error,setError]=useState('');
 useEffect(()=>{command.current={pose,replay,skip};},[pose,replay,skip]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
  if(!gl){setError('此裝置無法顯示星塵，右側內容仍可正常閱讀。');return;}
  let disposed=false,frame=0,w=1,h=1,dpr=1,visible=true,last=0,clock=0,readyAt=0;
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let wanted={x:0,y:0},pointer={x:0,y:0};
  const count=window.innerWidth<850?6500:11000,backCount=500;
  const seed=galaxy(count);let morph=new ParticleMorph(seed),targets:Float32Array[]=[];
  let active=-1,seenReplay=replay,seenSkip=skip,phase:'galaxy'|'morph'='galaxy';
  function compile(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw new Error('Shader compilation failed');return s;}
  let program:WebGLProgram,vs:WebGLShader,fs:WebGLShader;
  try{vs=compile(gl.VERTEX_SHADER,vertex);fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Link failed');}
  catch{setError('星塵顯示暫時無法啟動，右側內容仍可正常閱讀。');return;}
  gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset] of [['aPosition',0],['aColor',12]] as const){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,offset);}
  const uniforms={aspect:gl.getUniformLocation(program,'uAspect'),time:gl.getUniformLocation(program,'uTime'),dpr:gl.getUniformLocation(program,'uDpr'),motion:gl.getUniformLocation(program,'uMotion'),pointer:gl.getUniformLocation(program,'uPointer')};
  const drawData=new Float32Array((count+backCount)*STRIDE);
  const resize=()=>{const b=canvas.getBoundingClientRect();w=Math.max(1,b.width);h=Math.max(1,b.height);dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;gl.viewport(0,0,canvas.width,canvas.height);};
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});io.observe(canvas);
  const media=matchMedia('(prefers-reduced-motion: reduce)');const preference=()=>{reduced=media.matches;};media.addEventListener('change',preference);
  const move=(e:PointerEvent)=>{if(e.pointerType==='touch')return;const b=canvas.getBoundingClientRect();wanted={x:(e.clientX-b.left)/w-.5,y:(e.clientY-b.top)/h-.5};};
  const leave=()=>{wanted={x:0,y:0};};canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);
  const lost=(e:Event)=>{e.preventDefault();setError('星塵顯示已中斷，請重新整理；右側內容仍可使用。');};canvas.addEventListener('webglcontextlost',lost);
  const img=new Image();
  img.onload=()=>{
   if(disposed)return;
   const sample=document.createElement('canvas');sample.width=240;sample.height=400;const c=sample.getContext('2d');if(!c)return;
   targets=[0,1,2].map(poseIndex=>{
    c.clearRect(0,0,240,400);c.drawImage(img,poseIndex*img.width/3,0,img.width/3,img.height,0,0,240,400);
    const pixels=c.getImageData(0,0,240,400).data;
    const candidates:number[][]=[];
    for(let y=0;y<400;y++)for(let x=0;x<240;x++){
     const i=(y*240+x)*4,a=pixels[i+3]/255,bright=Math.max(pixels[i],pixels[i+1],pixels[i+2])/255;
     const chroma=Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2]);
     // Reference export has a neutral checker background; exclude it from geometry.
     if(a<.6||bright<.07||(bright>.45&&chroma<18))continue;
     // Sparse shadow points preserve a star-built silhouette without filling it like paint.
     if(((x*73+y*151)%101)/101>.2+bright*.8)continue;
     candidates.push([(x/240-.5)*1.12,(.5-y/400)*1.87,(.3-bright)*.12+Math.sin(x*.04)*.025,...[pixels[i],pixels[i+1],pixels[i+2]].map(v=>Math.min(1,Math.pow(v/255,.8)*1.15))]);
    }
    if(!candidates.length)throw new Error('No portrait points');
    const out=new Float32Array(count*STRIDE);
    // Equal counts and a consistent vertical order retain the identity of every star across poses.
    for(let i=0;i<count;i++)out.set(candidates[Math.floor(i*candidates.length/count)],i*STRIDE);
    return out;
   });readyAt=clock;active=command.current.pose;
  };
  img.onerror=()=>setError('人物星塵素材未載入，請重新整理；右側內容仍可使用。');img.src='/astral-reference.png';
  const render=(now:number)=>{
   if(disposed)return;frame=requestAnimationFrame(render);
   const dt=last?Math.min(now-last,50):0;last=now;if(!visible||document.hidden)return;clock+=dt;
   const cmd=command.current;
   if(cmd.replay!==seenReplay){seenReplay=cmd.replay;phase='galaxy';readyAt=clock;active=0;morph=new ParticleMorph(galaxy(count));}
   const skipNow=cmd.skip&&!seenSkip;seenSkip=cmd.skip;
   if(targets.length){
    if(phase==='galaxy'){
     const rotation=(clock-readyAt)*.0007;
     morph=new ParticleMorph(galaxy(count,rotation));
     if(reduced||skipNow||cmd.skip||cmd.pose!==0||clock-readyAt>1500){morph.retarget(targets[cmd.pose],clock,reduced||cmd.skip?1:cmd.pose===0?2400:1050);phase='morph';active=cmd.pose;}
    }else if(cmd.pose!==active||skipNow||reduced){morph.retarget(targets[cmd.pose],clock,reduced||skipNow?1:1050);active=cmd.pose;}
   }
   if(reduced&&targets.length)drawData.set(targets[cmd.pose]);else drawData.set(morph.update(clock));
   for(let i=0;i<backCount;i++){const k=(count+i)*STRIDE,a=i*2.399+(reduced?0:clock*.000008),r=.2+Math.sqrt((i+.5)/backCount)*1.7;drawData[k]=Math.cos(a)*r;drawData[k+1]=Math.sin(a)*r;drawData[k+2]=.25+(i%11)*.06;drawData[k+3]=.23+(i%3)*.07;drawData[k+4]=.25;drawData[k+5]=.4;}
   pointer.x+=(wanted.x-pointer.x)*.07;pointer.y+=(wanted.y-pointer.y)*.07;
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,drawData,gl.DYNAMIC_DRAW);
   gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.time,clock/1000);gl.uniform1f(uniforms.dpr,dpr);gl.uniform1f(uniforms.motion,reduced?0:1);gl.uniform2f(uniforms.pointer,reduced?0:pointer.x,reduced?0:pointer.y);gl.drawArrays(gl.POINTS,0,count+backCount);
  };frame=requestAnimationFrame(render);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();media.removeEventListener('change',preference);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
 },[]);
 return <><canvas ref={canvasRef} className="astral-canvas" aria-label="持續由彩色星點構成的角色，切換主題時粒子重構" role="img"/>{error&&<p className="scene-error" role="status">{error}</p>}</>;
}
