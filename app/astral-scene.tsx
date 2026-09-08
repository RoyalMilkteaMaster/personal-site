'use client';
import {useEffect,useRef,useState} from 'react';
import {assignParticleIds,backgroundStars,rotateHeldObjects,ParticleMorph,STRIDE} from '@/lib/particle-morph';
import {portraitIntro,INTRO_DURATION} from '@/lib/portrait-intro';
import {portraitPoints} from '@/lib/portrait-points';
import {heldObjectPoints} from '@/lib/held-object-points';

const vertex=`
attribute vec3 aPosition;
attribute vec3 aColor;
attribute vec3 aNormal;
attribute float aHeld;
attribute float aSeed;
uniform float uAspect;
uniform float uDpr;
uniform float uSurface;
uniform float uTime;
uniform float uTwinkle;
varying vec3 vColor;
void main(){
 vec3 p=aPosition;
 vec3 n=aNormal;
 float depth=3.0/max(.8,3.0+p.z);
 float fit=min(1.0,uAspect/.62);
 gl_Position=vec4(p.x*depth*fit/uAspect,p.y*depth*fit,p.z*.15,1.0);
 float bright=max(aColor.r,max(aColor.g,aColor.b));
 gl_PointSize=uDpr*mix(1.2,1.05+bright*.78,uSurface)*depth;
 if(aHeld<-.5)gl_PointSize=uDpr*(1.05+bright*1.2)*depth;
 vec3 normal=normalize(n+vec3(0.0,0.0,-.0001));
 vec3 key=normalize(vec3(.8,1.1,-1.6)-p);
 vec3 fill=normalize(vec3(-1.4,.1,-.8)-p);
 float diffuse=max(dot(normal,key),0.0);
 float cool=max(dot(normal,fill),0.0);
 vec3 light=vec3(.60)+vec3(1.0,.89,.75)*diffuse*.56+vec3(.46,.57,1.0)*cool*.19;
 light=mix(light,vec3(.38)+vec3(1.0,.94,.85)*diffuse*1.12+vec3(.46,.57,1.0)*cool*.22,clamp(aHeld,0.0,1.0));
 light=mix(light,vec3(1.15),step(1.5,aHeld));
 float surface=uSurface*step(.1,length(aNormal));
 vColor=aColor*mix(vec3(1.0),light,surface);
 float phase=fract(uTime/(14.0+aSeed*26.0)+fract(aSeed*73.13));
 float pulse=pow(max(0.0,1.0-abs(phase-.5)/.0225),2.0)*uTwinkle;
 vColor=mix(vColor,min(vec3(1.25),aColor*.45+vec3(.8)),pulse*.9);
 gl_PointSize*=1.0+pulse*.8;
}`;
const fragment=`precision mediump float;
varying vec3 vColor;
void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;float bright=max(vColor.r,max(vColor.g,vColor.b));float alpha=(1.0-smoothstep(.32,.5,r))*min(1.0,bright*2.8);gl_FragColor=vec4(vColor*alpha,alpha);}`;

export default function AstralScene({pose,replay,skip,onIntroStep}:{pose:number;replay:number;skip:boolean;onIntroStep:(step:string)=>void}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const command=useRef({pose,replay,skip,onIntroStep});
 const [error,setError]=useState('');
 useEffect(()=>{if(error)onIntroStep('done');},[error,onIntroStep]);
 useEffect(()=>{command.current={pose,replay,skip,onIntroStep};},[pose,replay,skip,onIntroStep]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});
  if(!gl){setError('此裝置無法顯示星塵，右側內容仍可正常閱讀。');return;}
  let disposed=false,frame=0,w=1,h=1,dpr=1,visible=true,last=0,clock=0,readyAt=0,surfaceAt=0,holdAt=0,transitionDuration=1250,introStep='';
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bounds=canvas.getBoundingClientRect();
  const portraitHeight=Math.min(bounds.height,bounds.width/.62);
  const count=Math.round(Math.max(10000,Math.min(45000,portraitHeight*portraitHeight*.52*.76/6.3)))+1600;
  const seed=new Float32Array(count*STRIDE);const morph=new ParticleMorph(seed);let targets:Float32Array[]=[];
  let active=-1,seenReplay=replay,seenSkip=skip,phase:'loading'|'intro'|'morph'|'hold'='loading';
  canvas.dataset.particleCount=String(count);canvas.dataset.sharedPool='true';
  function compile(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw new Error('Shader compilation failed');return s;}
  let program:WebGLProgram,vs:WebGLShader,fs:WebGLShader;
  try{vs=compile(gl.VERTEX_SHADER,vertex);fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Link failed');}
  catch{setError('星塵顯示暫時無法啟動，右側內容仍可正常閱讀。');return;}
  // Premultiplied colour must match both GPU blending and browser compositing.
  // The old non-premultiplied canvas attenuated soft stars a second time.
  gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset] of [['aPosition',0],['aColor',12],['aNormal',24]] as const){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,STRIDE*4,offset);}
  const heldAttribute=gl.getAttribLocation(program,'aHeld');gl.enableVertexAttribArray(heldAttribute);gl.vertexAttribPointer(heldAttribute,1,gl.FLOAT,false,STRIDE*4,48);
  const seedBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,Float32Array.from({length:count},(_,i)=>(i*.61803398875)%1),gl.STATIC_DRAW);
  const seedAttribute=gl.getAttribLocation(program,'aSeed');gl.enableVertexAttribArray(seedAttribute);gl.vertexAttribPointer(seedAttribute,1,gl.FLOAT,false,4,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const uniforms={aspect:gl.getUniformLocation(program,'uAspect'),dpr:gl.getUniformLocation(program,'uDpr'),surface:gl.getUniformLocation(program,'uSurface'),time:gl.getUniformLocation(program,'uTime'),twinkle:gl.getUniformLocation(program,'uTwinkle')};
  const drawData=new Float32Array(count*STRIDE);
  const foreground=drawData;foreground.set(seed);
  const resize=()=>{const b=canvas.getBoundingClientRect();w=Math.max(1,b.width);h=Math.max(1,b.height);dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;gl.viewport(0,0,canvas.width,canvas.height);};
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});io.observe(canvas);
  const media=matchMedia('(prefers-reduced-motion: reduce)');const preference=()=>{reduced=media.matches;};media.addEventListener('change',preference);
  const lost=(e:Event)=>{e.preventDefault();setError('星塵顯示已中斷，請重新整理；右側內容仍可使用。');};canvas.addEventListener('webglcontextlost',lost);
  const img=new Image();
  img.onload=()=>{
   if(disposed)return;
   try{
    const sample=document.createElement('canvas');sample.width=Math.floor(img.width/3);sample.height=img.height;
    const c=sample.getContext('2d');if(!c)throw new Error('No sampling canvas');
    let correspondence:Float32Array|undefined;
    targets=[0,1,2].map(poseIndex=>{
     c.clearRect(0,0,sample.width,sample.height);
     c.drawImage(img,poseIndex*img.width/3,0,img.width/3,img.height,0,0,sample.width,sample.height);
     const skyCount=Math.round(count*[.065,.085,.075][poseIndex]);
     const objectCount=Math.round(count*[.09,.07,.055][poseIndex]);
     const body=portraitPoints(c.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,count-skyCount-objectCount,poseIndex);
     const target=new Float32Array(count*STRIDE);target.set(body);
     target.set(heldObjectPoints(objectCount,poseIndex),body.length);
     target.set(backgroundStars(skyCount,poseIndex),body.length+objectCount*STRIDE);
     const points=assignParticleIds(target,poseIndex,correspondence);correspondence??=points;return points;
    });readyAt=clock;active=0;phase='intro';portraitIntro(targets[0],0,foreground);
   }catch{setError('人物星塵暫時無法載入，請重新整理；右側內容仍可使用。');}
  };
  img.onerror=()=>setError('人物星塵素材未載入，請重新整理；右側內容仍可使用。');img.src='/astral-clean-plate.png';
  const render=(now:number)=>{
   if(disposed)return;frame=requestAnimationFrame(render);
   const dt=last?Math.min(now-last,50):0;last=now;if(!visible||document.hidden)return;clock+=dt;
   const cmd=command.current;
   if(cmd.replay!==seenReplay&&targets.length){seenReplay=cmd.replay;phase='intro';readyAt=clock;active=0;}
   const skipNow=cmd.skip&&!seenSkip;seenSkip=cmd.skip;
   if(targets.length){
    if(phase==='intro'){
     portraitIntro(targets[0],clock-readyAt,foreground);
     if(reduced||skipNow||cmd.skip){foreground.set(targets[cmd.pose]);phase='hold';holdAt=clock;active=cmd.pose;}
     else if(cmd.pose!==0){transitionDuration=1250;morph.retarget(targets[cmd.pose],clock,transitionDuration,foreground,true);phase='morph';surfaceAt=clock;active=cmd.pose;}
     else if(clock-readyAt>=INTRO_DURATION){phase='hold';holdAt=clock;}
    }else if(cmd.pose!==active||skipNow){transitionDuration=reduced||skipNow?1:1250;morph.retarget(targets[cmd.pose],clock,transitionDuration,foreground,true);phase='morph';surfaceAt=clock;active=cmd.pose;}
   }
   if(reduced&&targets.length){foreground.set(targets[cmd.pose]);phase='hold';holdAt=clock;}
   else if(phase==='morph'){
    foreground.set(morph.update(clock));
    if(morph.complete(clock)){phase='hold';holdAt=clock;}
   }else if(phase==='hold')rotateHeldObjects(targets[active],(clock-holdAt)/1000,foreground);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,drawData,gl.DYNAMIC_DRAW);
   const step=phase==='loading'?'loading':phase==='intro'?(clock-readyAt<1800?'hair':clock-readyAt<3500?'face':'wide'):'done';
   if(step!==introStep){introStep=step;cmd.onIntroStep(step);}
   canvas.dataset.phase=phase;
   canvas.dataset.backgroundCount=targets.length?String(Math.round(count*[.065,.085,.075][active])):'0';
   canvas.dataset.morphStage=phase==='morph'?((clock-surfaceAt)/transitionDuration<.65?'travel':'arrive'):'none';
   gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.dpr,dpr);gl.uniform1f(uniforms.surface,1);gl.uniform1f(uniforms.time,clock/1000);gl.uniform1f(uniforms.twinkle,reduced?0:1);if(targets.length)gl.drawArrays(gl.POINTS,0,count);
  };frame=requestAnimationFrame(render);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();media.removeEventListener('change',preference);canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);gl.deleteBuffer(seedBuffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
 },[]);
 return <><canvas ref={canvasRef} className="astral-canvas" aria-label="持續由彩色星點構成的角色，切換主題時粒子重構" role="img"/>{error&&<p className="scene-error" role="status">{error}</p>}</>;
}
