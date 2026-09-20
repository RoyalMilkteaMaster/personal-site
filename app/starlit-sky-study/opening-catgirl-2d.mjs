import {cameraFrame} from "../../lib/fantasy/camera.mjs";
import atlasUrl from "../../output/imagegen/catgirl-2d-fullbody-cute-v2.png?url";

// Image atlas + gently deformed grid, not a skeleton or a 3D character.
export function createOpeningCatgirl2D(gl,canvas){
 const image=new Image(),motion=matchMedia("(prefers-reduced-motion: reduce)");
 let disposed=false,ready=false,p=null,vao=null,buffer=null,texture=null,uniforms=null;
 const shaders=[];
 function release(){if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(texture)gl.deleteTexture(texture);if(p)gl.deleteProgram(p);for(const s of shaders)gl.deleteShader(s);buffer=vao=texture=p=null;shaders.length=0;ready=false;}
 image.onerror=()=>console.warn("Opening illustration unavailable; keeping brand and milktea.");
 image.onload=()=>{
  if(disposed)return;
  try{
   p=gl.createProgram();if(!p)throw Error("Illustration program unavailable");
   for(const [type,source]of [[gl.VERTEX_SHADER,"#version 300 es\nprecision highp float;\nlayout(location=0)in vec2 uv;\nuniform mat4 vp;uniform vec3 center;uniform float scale;uniform float seconds;\nout vec2 tex;\nvoid main(){\n tex=uv;vec2 q=vec2((uv.x-.5)*(2./3.),.5-uv.y);\n float head=1.-smoothstep(.23,.29,uv.y);float tilt=sin(seconds*.72)*.013*head;\n vec2 pivot=vec2(0.,.255),r=q-pivot;\n q=pivot+mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*r;\n float ears=(1.-smoothstep(.055,.12,uv.y))*smoothstep(.035,.09,abs(uv.x-.5));\n q.x+=sin(seconds*1.9+uv.x*12.)*.0025*ears;\n q.y+=sin(seconds*1.9+uv.x*12.)*.002*ears;\n q.y+=sin(seconds*1.15)*.002*smoothstep(.25,.35,uv.y)*(1.-smoothstep(.42,.54,uv.y));\n float a=radians(-35.);vec3 world=center+vec3(cos(a)*q.x+sin(a)*q.y,0.,-sin(a)*q.x+cos(a)*q.y)*scale;\n gl_Position=vp*vec4(world,1.);\n}"],[gl.FRAGMENT_SHADER,"#version 300 es\nprecision highp float;\nin vec2 tex;uniform sampler2D atlas;uniform float blink;out vec4 frag;\nfloat eyeMask(vec2 p,vec2 c){vec2 q=(p-c)/vec2(.044,.027);return 1.-smoothstep(.78,1.,length(q));}\nvoid main(){\n vec4 base=texture(atlas,vec2(tex.x*.5,tex.y));\n // Cute atlas: align each closed eye locally; keep the base face and hair fixed. Sample only the eye patches.\n vec2 closedUV=tex+vec2(tex.x<.52?-.0511:-.0428,.0055);\n vec4 closed=texture(atlas,vec2(.5+closedUV.x*.5,closedUV.y));\n float eyes=max(eyeMask(tex,vec2(.474,.164)),eyeMask(tex,vec2(.572,.164)));\n vec3 rgb=mix(base.rgb,closed.rgb,eyes*blink);\n float green=rgb.g-max(rgb.r,rgb.b);\n float alpha=(1.-smoothstep(.12,.48,green));\n // Despill only chroma edges; retain blue eyes and white hair.\n rgb.g=min(rgb.g,max(rgb.r,rgb.b)+.08);\n if(alpha<.01)discard;frag=vec4(rgb,alpha);\n}"]]){
    const shader=gl.createShader(type);if(!shader)throw Error("Illustration shader unavailable");shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(p,shader);
   }
   gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));for(const s of shaders)gl.deleteShader(s);shaders.length=0;
   vao=gl.createVertexArray();buffer=gl.createBuffer();texture=gl.createTexture();if(!vao||!buffer||!texture)throw Error("Illustration GPU allocation unavailable");
   const vertices=[],n=24;for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const [dx,dy]of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]])vertices.push((x+dx)/n,(y+dy)/n);
   gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.bindVertexArray(null);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
   for(const [name,value]of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,name,value);
   uniforms=Object.fromEntries(["vp","center","scale","seconds","blink","atlas"].map(k=>[k,gl.getUniformLocation(p,k)]));ready=true;
  }catch(error){gl.bindVertexArray(null);release();console.warn("Opening illustration unavailable; keeping brand and milktea.",error);}
 };
 image.src=atlasUrl;
 return {
  get ready(){return ready},
  draw(camera,time){
   if(!ready||disposed)return;
   const seconds=motion.matches?0:time,phase=seconds%5.1;
   const blink=motion.matches?0:Math.max(0,1.-Math.abs(phase-4.8)/.075);
   const portrait=Math.max(0,Math.min(1,(.8-canvas.width/canvas.height)/.34)),scale=.36+.56*portrait,z=.30+.29*portrait,a=-35*Math.PI/180,x=-.31;
   const frame=cameraFrame(camera,canvas);
   gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.useProgram(p);gl.uniformMatrix4fv(uniforms.vp,false,frame.screenM);gl.uniform3fv(uniforms.center,[Math.cos(a)*x+Math.sin(a)*z,2.21,-Math.sin(a)*x+Math.cos(a)*z]);gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.seconds,seconds);gl.uniform1f(uniforms.blink,blink);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.atlas,0);gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,24*24*6);gl.bindVertexArray(null);gl.depthMask(true);
  },
  dispose(){if(disposed)return;disposed=true;image.onload=image.onerror=null;image.src="";release();}
 };
}
