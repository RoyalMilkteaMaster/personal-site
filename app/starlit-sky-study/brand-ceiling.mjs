import {createOpeningCatgirl2D} from "./opening-catgirl-2d.mjs";
import {program} from '../../lib/fantasy-particles.mjs';
import {cameraFrame} from '../../lib/fantasy/camera.mjs';
import {parseMilkteaPoints,createMilkteaModel} from '../../lib/fantasy/milktea-model.mjs';
import {openingCupPlacement,cupMotion} from './cup-layout.mjs';
const assetUrl = '/fantasy/milktea-12/points.bin';
export const BRAND_CENTER=[0,2.2,0];
export async function createBrandCeiling(gl,canvas,{cupEnabled=true,catgirlEnabled=true}={}){
 const sheet=document.createElement('canvas');sheet.width=1536;sheet.height=1024;
 const ctx=sheet.getContext('2d');if(!ctx)throw Error('Brand canvas unavailable');
 ctx.clearRect(0,0,1536,1024);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 190px Arial,sans-serif';const ink=ctx.createLinearGradient(80,0,1456,0);ink.addColorStop(0,'#fffbea');ink.addColorStop(.48,'#fff8ec');ink.addColorStop(1,'#f3fcff');ctx.fillStyle=ink;ctx.fillText('Royal Milktea',768,510,1400);ctx.font='900 230px Arial,sans-serif';ctx.fillText('Master',768,790,1400);
 const vs=`#version 300 es
 layout(location=0)in vec3 position;layout(location=1)in vec2 uv;uniform mat4 vp;out vec2 tex;void main(){gl_Position=vp*vec4(position,1.);tex=uv;}`;
 const fs=`#version 300 es
 precision mediump float;in vec2 tex;uniform sampler2D label;out vec4 frag;void main(){frag=texture(label,tex);if(frag.a<.01)discard;}`;
 const p=program(gl,vs,fs),vao=gl.createVertexArray(),buffer=gl.createBuffer(),texture=gl.createTexture();
 // From below, world +Z is the top of the label. Texture remains world-fixed.
 const left=-.64,right=.64,top=.46,bottom=-.3933,y=2.2;
 const verts=new Float32Array([left,y,top,0,0,right,y,top,1,0,left,y,bottom,0,1,left,y,bottom,0,1,right,y,top,1,0,right,y,bottom,1,1]);
 const a=-35*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
 for(let k=0;k<verts.length;k+=5){const x=verts[k],z=verts[k+2];verts[k]=co*x+si*z;verts[k+2]=-si*x+co*z;}
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
 for(const [i,n,o]of[[0,3,0],[1,2,12]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,20,o);}gl.bindVertexArray(null);
 gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sheet);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 let cup;
 if(cupEnabled){
  const response=await fetch(assetUrl);if(!response.ok)throw Error('Brand milktea unavailable');
  cup=createMilkteaModel(gl,parseMilkteaPoints(await response.arrayBuffer()));
 }
 const catgirl=catgirlEnabled?createOpeningCatgirl2D(gl,canvas):null;
 return {draw(camera,time,reducedMotion=false){
  catgirl?.draw(camera,time);
  const frame=cameraFrame(camera,canvas);gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(p);gl.uniformMatrix4fv(gl.getUniformLocation(p,'vp'),false,frame.screenM);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(gl.getUniformLocation(p,'label'),0);gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindVertexArray(null);
  if(cup){
  // Rotate the complete cup coordinate frame onto the underside of the ceiling.
  // Local +Z faces down; local Y (self-spin axis) lies along world +Z.
  const {center:cupCenter,scale:cupScale,matrix:localToWorld}=openingCupPlacement(canvas.width/canvas.height);
  const vp=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)vp[col*4+row]+=frame.screenM[k*4+row]*localToWorld[col*4+k];
  const d=frame.eye.map((v,i)=>v-cupCenter[i]),len=Math.hypot(...d);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  cup.draw(vp,{center:[0,0,0],scale:cupScale,...cupMotion(time,reducedMotion),size:1.7*Math.min(devicePixelRatio,1.5),eyeDirection:[0,4,8].map(k=>(localToWorld[k]*d[0]+localToWorld[k+1]*d[1]+localToWorld[k+2]*d[2])/len)});
  }
  gl.depthMask(true);
 },dispose(){catgirl?.dispose();cup?.dispose();gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteTexture(texture);gl.deleteProgram(p);}};
}
