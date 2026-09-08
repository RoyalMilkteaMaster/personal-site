'use client';
import {useEffect,useRef,useState} from 'react';
import {galaxy,ParticleMorph,STRIDE} from '@/lib/particle-morph';
import {portraitPoints} from '@/lib/portrait-points';

const vertex=`
attribute vec3 aPosition;
attribute vec3 aColor;
attribute vec3 aNormal;
attribute vec3 aPivot;
attribute float aSpin;
uniform float uAspect;
uniform float uTime;
uniform float uDpr;
uniform float uMotion;
uniform float uSurface;
uniform vec2 uPointer;
varying vec3 vColor;
vec3 turnY(vec3 p,float a){return vec3(p.x*cos(a)+p.z*sin(a),p.y,-p.x*sin(a)+p.z*cos(a));}
vec3 turnX(vec3 p,float a){return vec3(p.x,p.y*cos(a)-p.z*sin(a),p.y*sin(a)+p.z*cos(a));}
void main(){
 vec3 p=aPosition;
 vec3 n=aNormal;
 float time=uTime*uMotion;
 float spin=time*.48*aSpin;
 p=mix(p,turnY(p-aPivot,spin)+aPivot,aSpin);
 n=mix(n,turnY(n,spin),aSpin);
 p.y+=sin(time*.9)*.012*aSpin*uMotion;
 float id=dot(aPosition,vec3(12.9898,78.233,32.4));
 p.x+=sin(uTime*.6+id)*.00065*uMotion;
 p.y+=cos(uTime*.5+id)*.00065*uMotion;
 float a=uPointer.x*.18+sin(time*.35)*.17*uSurface*uMotion;
 float tilt=sin(time*.24)*.045*uSurface*uMotion;
 p=turnX(turnY(p,a),tilt);n=turnX(turnY(n,a),tilt);
 p.y+=uPointer.y*p.z*.12+sin(time*.7)*.009*uSurface*uMotion;
 float depth=3.0/(3.0+p.z);
 float fit=min(1.0,uAspect/.62);
 gl_Position=vec4(p.x*depth*fit/uAspect,p.y*depth*fit,p.z*.15,1.0);
 float bright=max(aColor.r,max(aColor.g,aColor.b));
 gl_PointSize=uDpr*(1.15+bright*.85)*depth;
 vec3 normal=normalize(n+vec3(0.0,0.0,-.0001));
 vec3 key=normalize(vec3(sin(time*.31)*1.7,.8+cos(time*.23)*.3,-1.6)-p);
 vec3 fill=normalize(vec3(-1.4,.1,-.8)-p);
 float diffuse=max(dot(normal,key),0.0);
 float cool=max(dot(normal,fill),0.0);
 vec3 light=vec3(.60)+vec3(1.0,.89,.75)*diffuse*.56+vec3(.46,.57,1.0)*cool*.19;
 float surface=uSurface*step(.1,length(aNormal));
 vColor=aColor*mix(vec3(1.0),light,surface)*(.98+.02*sin(uTime*.7+id)*uMotion);
}`;
const fragment=`precision mediump float;
varying vec3 vColor;
void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;float bright=max(vColor.r,max(vColor.g,vColor.b));float alpha=(1.0-smoothstep(.32,.5,r))*min(1.0,bright*2.8);gl_FragColor=vec4(vColor*alpha,alpha);}`;

export default function AstralScene({pose,replay,skip}:{pose:number;replay:number;skip:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const command=useRef({pose,replay,skip});
 const [error,setError]=useState('');
 useEffect(()=>{command.current={pose,replay,skip};},[pose,replay,skip]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});
  if(!gl){setError('此裝置無法顯示星塵，右側內容仍可正常閱讀。');return;}
  let disposed=false,frame=0,w=1,h=1,dpr=1,visible=true,last=0,clock=0,readyAt=0,surfaceAt=0;
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let wanted={x:0,y:0},pointer={x:0,y:0};
  const bounds=canvas.getBoundingClientRect();
  const portraitHeight=Math.min(bounds.height,bounds.width/.62);
  const count=Math.round(Math.max(9000,Math.min(54400,portraitHeight*portraitHeight*.52*.88/6.3))),backCount=500;
  const seed=galaxy(count);let morph=new ParticleMorph(seed),targets:Float32Array[]=[];
  let active=-1,seenReplay=replay,seenSkip=skip,phase:'galaxy'|'morph'='galaxy';
  function compile(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw new Error('Shader compilation failed');return s;}
  let program:WebGLProgram,vs:WebGLShader,fs:WebGLShader;
  try{vs=compile(gl.VERTEX_SHADER,vertex);fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Link failed');}
  catch{setError('星塵顯示暫時無法啟動，右側內容仍可正常閱讀。');return;}
  // Premultiplied colour must match both GPU blending and browser compositing.
  // The old non-premultiplied canvas attenuated soft stars a second time.
  gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset,size] of [['aPosition',0,3],['aColor',12,3],['aNormal',24,3],['aPivot',36,3],['aSpin',48,1]] as const){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,STRIDE*4,offset);}
  const uniforms={aspect:gl.getUniformLocation(program,'uAspect'),time:gl.getUniformLocation(program,'uTime'),dpr:gl.getUniformLocation(program,'uDpr'),motion:gl.getUniformLocation(program,'uMotion'),pointer:gl.getUniformLocation(program,'uPointer'),surface:gl.getUniformLocation(program,'uSurface')};
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
   try{
    const sample=document.createElement('canvas');sample.width=Math.floor(img.width/3);sample.height=img.height;
    const c=sample.getContext('2d');if(!c)throw new Error('No sampling canvas');
    targets=[0,1,2].map(poseIndex=>{
     c.clearRect(0,0,sample.width,sample.height);
     c.drawImage(img,poseIndex*img.width/3,0,img.width/3,img.height,0,0,sample.width,sample.height);
     return portraitPoints(c.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,count,poseIndex);
    });readyAt=clock;active=command.current.pose;
   }catch{setError('人物星塵暫時無法載入，請重新整理；右側內容仍可使用。');}
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
     if(reduced||skipNow||cmd.skip||cmd.pose!==0||clock-readyAt>1500){morph.retarget(targets[cmd.pose],clock,reduced||cmd.skip?1:cmd.pose===0?2400:1050);phase='morph';surfaceAt=clock;active=cmd.pose;}
    }else if(cmd.pose!==active||skipNow||reduced){morph.retarget(targets[cmd.pose],clock,reduced||skipNow?1:1050);active=cmd.pose;}
   }
   if(reduced&&targets.length)drawData.set(targets[cmd.pose]);else drawData.set(morph.update(clock));
   for(let i=0;i<backCount;i++){const k=(count+i)*STRIDE,a=i*2.399+(reduced?0:clock*.000008),r=.2+Math.sqrt((i+.5)/backCount)*1.7;drawData[k]=Math.cos(a)*r;drawData[k+1]=Math.sin(a)*r;drawData[k+2]=.25+(i%11)*.06;drawData[k+3]=.23+(i%3)*.07;drawData[k+4]=.25;drawData[k+5]=.4;}
   pointer.x+=(wanted.x-pointer.x)*.07;pointer.y+=(wanted.y-pointer.y)*.07;
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,drawData,gl.DYNAMIC_DRAW);
   gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.time,clock/1000);gl.uniform1f(uniforms.dpr,dpr);gl.uniform1f(uniforms.motion,reduced?0:1);gl.uniform1f(uniforms.surface,phase==='galaxy'?0:reduced||cmd.skip?1:Math.min(1,(clock-surfaceAt)/2400));gl.uniform2f(uniforms.pointer,reduced?0:pointer.x,reduced?0:pointer.y);gl.drawArrays(gl.POINTS,0,count+backCount);
  };frame=requestAnimationFrame(render);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();media.removeEventListener('change',preference);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
 },[]);
 return <><canvas ref={canvasRef} className="astral-canvas" aria-label="持續由彩色星點構成的角色，切換主題時粒子重構" role="img"/>{error&&<p className="scene-error" role="status">{error}</p>}</>;
}
