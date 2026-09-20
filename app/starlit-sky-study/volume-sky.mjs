import { program } from '../../lib/fantasy-particles.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
export function volumeStars(count = 50000, sparse = false) {
  const midpoint = sparse === 'midpoint';
  const out = new Float32Array(count * 5);
  const noise = i => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  for (let i = 0; i < count; i++) {
    const az = noise(i + 10) * Math.PI * 2, z = noise(i + 913) * 2 - 1;
    // D widens the volume and shifts probability outwards, not a uniform scale.
    const r = midpoint
      ? ((.06 + 2.4 * Math.pow(noise(i + 371), .55)) + (.25 + 3.44 * Math.pow(noise(i + 371), .45))) / 2
      : sparse ? .25 + 3.44 * Math.pow(noise(i + 371), .45) : .06 + 2.4 * Math.pow(noise(i + 371), .55);
    const xy = Math.sqrt(1 - z * z) * r;
    out.set([Math.cos(az) * xy, Math.sin(az) * xy, z * r, (.36 + noise(i + 18) * .55) * (sparse && noise(i + 715) < .90 ? (midpoint ? .87 : .74) : 1), (i * .61803398875) % 1], i * 5);
  }
  return out;
}
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in float bright;
layout(location=2) in float seed;
uniform mat4 vp;
uniform float time,dpr;
out vec3 vColor;
out float vOpacity;
void main() {
  vec3 axis=normalize(vec3(.16,.10,1.));
  float a=time*.025,c=cos(a),s=sin(a);
  vec3 p=position*c+cross(axis,position)*s+axis*dot(axis,position)*(1.-c);
  p+=vec3(0.,.77,.02);
  gl_Position=vp*vec4(p,1.);
  float depth=gl_Position.w;
  gl_PointSize=dpr*(1.05+bright*1.2)*1.35*clamp(.9/max(depth,.02),.6,1.7);
  int palette=gl_VertexID%3;
  vColor=(palette==0?vec3(1.,.81,.53):palette==1?vec3(.67,.75,1.):vec3(.85,.64,1.))*bright;
  float phase=fract(time/(14.+seed*26.)+fract(seed*73.13));
  float pulse=pow(max(0.,1.-abs(phase-.5)/.0225),2.);
  vColor=mix(vColor,min(vec3(1.25),vColor*.45+vec3(.8)),pulse*.9);
  gl_PointSize*=1.+pulse*.8;
  vOpacity=1.;
}`;
const fragment = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vOpacity;
out vec4 frag;void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5||vOpacity<.01)discard;float bright=max(vColor.r,max(vColor.g,vColor.b));float alpha=(1.0-smoothstep(.32,.5,r))*min(1.0,bright*2.8)*vOpacity;frag=vec4(vColor*alpha,alpha);}`;
export function createVolumeSky(gl, canvas, sparse = false) {
  const midpoint = sparse === 'midpoint';
  const data = volumeStars(midpoint ? 42500 : sparse ? 35000 : 50000, sparse), p = program(gl, vertex, fragment);
  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  for (const [index, size, offset] of [[0,3,0],[1,1,12],[2,1,16]]) {
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,gl.FLOAT,false,20,offset);
  }
  gl.bindVertexArray(null);
  return {
    draw(cam, seconds) {
      const c = cameraFrame(cam, canvas);
      gl.useProgram(p);
      gl.uniformMatrix4fv(gl.getUniformLocation(p,'vp'),false,c.screenM);
      gl.uniform1f(gl.getUniformLocation(p,'time'),seconds);
      gl.uniform1f(gl.getUniformLocation(p,'dpr'),Math.min(devicePixelRatio,2));
      gl.bindVertexArray(vao);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.drawArrays(gl.POINTS,0,data.length/5);
      gl.depthMask(true);
      gl.bindVertexArray(null);
      canvas.dataset.skyVolume=midpoint ? '42500 / radius .155-3.075 / 90% brightness .87 / axis .16,.10,1 / .025 rad/s' : sparse ? '35000 / radius .25-3.69 / 90% brightness .74 / axis .16,.10,1 / .025 rad/s' : '50000 / radius .06-2.46 / axis .16,.10,1 / .025 rad/s';
    },
    dispose() { gl.deleteBuffer(buffer); gl.deleteVertexArray(vao); gl.deleteProgram(p); }
  };
}
