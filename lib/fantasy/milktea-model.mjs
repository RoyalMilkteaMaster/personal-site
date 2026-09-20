// Original GLB-derived surface points. Layout: xyz, rgb, normal xyz, alpha.
export function parseMilkteaPoints(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0 || buffer.byteLength % 40) throw new Error('Invalid milktea point asset');
  const data = new Float32Array(buffer);
  if (!data.every(Number.isFinite)) throw new Error('Non-finite milktea point asset');
  for (let i = 0; i < data.length; i += 10) {
    if (Math.max(Math.abs(data[i]), Math.abs(data[i+1]), Math.abs(data[i+2])) > 2 || data[i+9] < 0 || data[i+9] > 1) throw new Error('Invalid milktea point values');
  }
  return data;
}
export function createMilkteaModel(gl, data) {
  const vertex = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 p; layout(location=1) in vec3 color;
  layout(location=2) in vec3 normal; layout(location=3) in float alpha;
  uniform mat4 vp; uniform float angle; uniform float time; uniform float size;
  uniform vec2 viewport; uniform float opacity;
  uniform vec3 center; uniform float scale; uniform vec3 eyeDirection;
  out vec4 tint;
  void main(){
    mat3 rotation=mat3(cos(angle),0.,-sin(angle),0.,1.,0.,sin(angle),0.,cos(angle));
    vec3 n=rotation*normal; float facing=dot(n,eyeDirection);
    float visibility=alpha<.3?1.:smoothstep(.025,.30,facing);
    float phase=fract(sin(dot(p,vec3(17.3,81.7,37.1)))*43758.5);
    float twinkle=pow(max(0.,sin(time*(.18+phase*.2)+phase*60.)),18.);
    gl_Position=vp*vec4(center+rotation*p*scale,1.);
    // 依杯高縮放取樣點；小於一像素時以覆蓋率保留亮度，避免主場景疊成白塊。
    vec4 base=vp*vec4(center,1.);
    vec4 top=vp*vec4(center+vec3(0.,scale,0.),1.);
    float height=length((top.xy/top.w-base.xy/base.w)*viewport*.5);
    float diameter=size*min(1.,height/360.)*(1.+twinkle*.8);
    gl_PointSize=max(1.,diameter);
    float coverage=min(1.,diameter*diameter);
    tint=vec4(color*(1.+twinkle*.5),alpha*visibility*coverage*opacity);
  }`;
  const fragment=`#version 300 es
  precision highp float;in vec4 tint;out vec4 outColor;
  void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;outColor=vec4(tint.rgb,tint.a*(1.-smoothstep(.15,1.,r)));}`;
  const shaders=[]; const program=gl.createProgram();
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  } catch(error){gl.deleteProgram(program);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
  const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  for(const [location,count,offset] of [[0,3,0],[1,3,12],[2,3,24],[3,1,36]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,40,offset);}
  gl.bindVertexArray(null);
  const u=Object.fromEntries(['vp','angle','time','size','center','scale','eyeDirection','viewport','opacity'].map(k=>[k,gl.getUniformLocation(program,k)]));
  return {
    count:data.length/10,
    // Caller owns framebuffer, viewport, depth and blend state.
    draw(vp,{angle=0,time=0,size=2,center=[0,0,0],scale=1,opacity=1,eyeDirection=[0,0,1]}={}){
      gl.useProgram(program);gl.bindVertexArray(vao);gl.uniformMatrix4fv(u.vp,false,vp);
      gl.uniform2f(u.viewport,gl.drawingBufferWidth,gl.drawingBufferHeight);
      for(const [k,v] of Object.entries({angle,time,size,scale,opacity}))gl.uniform1f(u[k],v);
      gl.uniform3fv(u.center,center);gl.uniform3fv(u.eyeDirection,eyeDirection);gl.drawArrays(gl.POINTS,0,data.length/10);gl.bindVertexArray(null);
    },
    dispose(){gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(program);}
  };
}
