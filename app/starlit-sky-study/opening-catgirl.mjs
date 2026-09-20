import {cameraFrame} from "../../lib/fantasy/camera.mjs";
import assetUrl from "../../work/starlit-implementation/visual-revision/reading-layout-20260916/catgirl/catgirl-v2.bin?url";

// The same ceiling basis as the brand; source +Z faces the viewer below it.
const angle=-35*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
export const OPENING_CATGIRL_CENTER=[co*-.8+si*.03,2.18,-si*-.8+co*.03];
export const OPENING_CATGIRL_SCALE=.70;
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
export async function createOpeningCatgirl(gl,canvas){
  const response=await fetch(assetUrl);if(!response.ok)throw Error("Opening catgirl asset unavailable");
  const binary=await response.arrayBuffer();if(binary.byteLength<20)throw Error("Truncated catgirl asset");
  const [magic,count,vertices,indices,lineVertices]=new Uint32Array(binary,0,5);
  if(magic!==0x43415432||count!==90000||indices%3||lineVertices%2||binary.byteLength!==20+count*36+vertices*12+indices*4+lineVertices*12)throw Error("Invalid catgirl asset");
  let offset=20;const points=new Float32Array(binary,offset,count*9);offset+=points.byteLength;
  const positions=new Float32Array(binary,offset,vertices*3);offset+=positions.byteLength;
  const index=new Uint32Array(binary,offset,indices);offset+=index.byteLength;
  const lines=new Float32Array(binary,offset,lineVertices*3);
  if(!points.every(Number.isFinite)||!positions.every(Number.isFinite)||!lines.every(Number.isFinite)||index.some(i=>i>=vertices))throw Error("Invalid catgirl geometry");
  const buffers=[],vaos=[],programs=[];
  function dispose(){for(const b of buffers)gl.deleteBuffer(b);for(const v of vaos)gl.deleteVertexArray(v);for(const p of programs)gl.deleteProgram(p);buffers.length=vaos.length=programs.length=0;}
  function program(gl,vertex,fragment){
    const p=gl.createProgram();if(!p)throw Error("Catgirl program allocation failed");programs.push(p);
    for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);if(!shader)throw Error("Catgirl shader allocation failed");
      try{gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(p,shader)}finally{gl.deleteShader(shader)}
    }
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  try{
  const pointProgram=program(gl,"#version 300 es\nprecision highp float;\nlayout(location=0)in vec3 position;layout(location=1)in vec3 color;layout(location=2)in vec3 normal;\nuniform mat4 mvp;uniform vec3 eye;uniform float size;uniform float opacity;uniform float density;out vec4 tint;\nvoid main(){float facing=abs(dot(normalize(normal),eye));vec3 rgb=color*mix(2.2,1.,smoothstep(.05,.55,facing));tint=vec4(pow(max(rgb,vec3(0.)),vec3(1./2.2)),opacity);gl_Position=mvp*vec4(position,1.);gl_PointSize=size;float sampleKey=fract(sin(dot(position,vec3(17.3,81.7,37.1)))*43758.5);bool face=position.y>.31&&position.y<.41&&abs(position.x)<.115&&position.z>.04;if(sampleKey>(face?1.:density)){gl_Position=vec4(2.,2.,2.,1.);tint.a=0.;}}","#version 300 es\nprecision mediump float;in vec4 tint;out vec4 frag;\nvoid main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;frag=vec4(tint.rgb,tint.a*(1.-smoothstep(.3,1.,r)));}");
  const flatProgram=program(gl,"#version 300 es\nlayout(location=0)in vec3 position;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(position,1.);}","#version 300 es\nprecision mediump float;uniform vec4 color;out vec4 frag;void main(){frag=color;}");
  function vao(data,stride,attributes,element){
    const result=gl.createVertexArray();if(!result)throw Error("Catgirl VAO allocation failed");vaos.push(result);gl.bindVertexArray(result);
    const buffer=gl.createBuffer();if(!buffer)throw Error("Catgirl buffer allocation failed");buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    for(const [location,n,offset]of attributes){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,n,gl.FLOAT,false,stride,offset)}
    if(element){const e=gl.createBuffer();if(!e)throw Error("Catgirl index allocation failed");buffers.push(e);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,e);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,element,gl.STATIC_DRAW)}
    gl.bindVertexArray(null);return result;
  }
  const pointVao=vao(points,36,[[0,3,0],[1,3,12],[2,3,24]]),meshVao=vao(positions,12,[[0,3,0]],index),lineVao=vao(lines,12,[[0,3,0]]);
  const uniforms=Object.fromEntries(["mvp","eye","size","opacity","density"].map(k=>[k,gl.getUniformLocation(pointProgram,k)]));
  const flatMvp=gl.getUniformLocation(flatProgram,"mvp"),flatColor=gl.getUniformLocation(flatProgram,"color");
  return {count,mouthSegments:lineVertices/2,
    draw(camera,seconds,{center=OPENING_CATGIRL_CENTER,scale=OPENING_CATGIRL_SCALE,opacity=1}={}){
      if(opacity<=0)return;
      const frame=cameraFrame(camera,canvas),yaw=Math.sin(seconds*.36)*.07,c=Math.cos(yaw),s=Math.sin(yaw),bob=Math.sin(seconds*.7)*.004;
      const model=new Float32Array([co*c*scale,s*scale,-si*c*scale,0,si*scale,0,co*scale,0,co*s*scale,-c*scale,-si*s*scale,0,center[0]+si*bob,center[1],center[2]+co*bob,1]);
      const mvp=multiply(frame.screenM,model),d=frame.eye.map((v,i)=>v-model[12+i]),distance=Math.hypot(...d),eye=[0,1,2].map(c=>(model[c*4]*d[0]+model[c*4+1]*d[1]+model[c*4+2]*d[2])/(scale*distance));
      gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      gl.useProgram(flatProgram);gl.uniformMatrix4fv(flatMvp,false,mvp);gl.bindVertexArray(meshVao);
      gl.depthMask(true);gl.colorMask(false,false,false,false);gl.disable(gl.BLEND);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,4);
      gl.drawElements(gl.TRIANGLES,indices,gl.UNSIGNED_INT,0);gl.disable(gl.POLYGON_OFFSET_FILL);gl.colorMask(true,true,true,true);
      gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pointProgram);gl.uniformMatrix4fv(uniforms.mvp,false,mvp);gl.uniform3fv(uniforms.eye,eye);gl.uniform1f(uniforms.opacity,opacity);
      const dpr=Math.min(globalThis.devicePixelRatio||1,2),projectedHeight=frame.focalPx*scale/distance;
      gl.uniform1f(uniforms.size,Math.max(1.25*dpr,Math.min(4.2*dpr,projectedHeight/170)));
      gl.uniform1f(uniforms.density,Math.max(.30,Math.min(1,(projectedHeight/(400*dpr))**2)));
      gl.bindVertexArray(pointVao);gl.drawArrays(gl.POINTS,0,count);
      gl.useProgram(flatProgram);gl.uniformMatrix4fv(flatMvp,false,mvp);gl.uniform4f(flatColor,.957,.706,.784,opacity);gl.bindVertexArray(lineVao);gl.drawArrays(gl.LINES,0,lineVertices);
      gl.bindVertexArray(null);gl.depthMask(true);
    },
    dispose
  };
  }catch(error){gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);dispose();throw error;}
}
