import { identity } from './fantasy/matrix.mjs';
// GPU snapshots keep the actual material, point diameter and depth of every
// particle. They are used only at chapter changes; the opening draws its native
// surface buffers without resampling. A record is clip4, RGB/opacity4, size/rim2.
export function program(gl, vertex, fragment, capture = false) {
  const p = gl.createProgram();
  for (const [type, text] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, text);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  if (capture)
    gl.transformFeedbackVaryings(
      p,
      ['savedClip', 'savedColor', 'savedStyle'],
      gl.INTERLEAVED_ATTRIBS,
    );
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(p));
  return p;
}
export function snapshotShader(
  vertex,
  color,
  opacity,
  rim = '.32',
  depth = false,
) {
  return (
    vertex.replace('void main()', 'void originalMain()') +
    `
 out vec4 savedClip;out vec4 savedColor;out vec2 savedStyle;
 uniform sampler2D snapshotDepth;uniform bool useSnapshotDepth;uniform vec4 snapshotFrame;
 void main(){originalMain();float a=${opacity};savedClip=gl_Position;savedClip.xy=gl_Position.xy*snapshotFrame.xy+snapshotFrame.zw*gl_Position.w;
 ${depth ? 'if(useSnapshotDepth){vec3 q=savedClip.xyz/savedClip.w*.5+.5;if(q.z>texture(snapshotDepth,q.xy).r+.000008)a=0.;}' : ''}
 if(gl_Position.w<=0.||abs(gl_Position.z)>gl_Position.w||any(greaterThan(abs(gl_Position.xy),vec2(gl_Position.w))))a=0.;
 savedColor=vec4(${color},a);savedStyle=vec2(gl_PointSize,${rim});}`
  );
}
export function capture(gl, p, count, draw) {
  const buffer = gl.createBuffer(),
    feedback = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer);
  gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, count * 40, gl.STREAM_READ);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
  if (gl.getParameter(gl.CURRENT_PROGRAM) !== p) gl.useProgram(p);
  const v = gl.getParameter(gl.VIEWPORT),
    w = gl.drawingBufferWidth,
    h = gl.drawingBufferHeight;
  gl.uniform4f(
    gl.getUniformLocation(p, 'snapshotFrame'),
    v[2] / w,
    v[3] / h,
    (2 * v[0] + v[2]) / w - 1,
    (2 * v[1] + v[3]) / h - 1,
  );
  gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);
  draw(p);
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);
  const out = new Float32Array(count * 10);
  gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, out);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.deleteTransformFeedback(feedback);
  gl.deleteBuffer(buffer);
  return out;
}
const vertex = `#version 300 es
precision highp float;
layout(location=0)in vec4 fromClip;layout(location=1)in vec4 fromColor;layout(location=2)in vec2 fromStyle;
layout(location=3)in vec4 toClip;layout(location=4)in vec4 toColor;layout(location=5)in vec2 toStyle;
uniform float progress;uniform vec2 resizeScale;uniform mat4 sourceCamera;out vec4 color;out float rim;
void main(){float seed=fract(float(gl_VertexID)*.61803398875),t=clamp((progress-seed*.025)/(1.-seed*.025),0.,1.);
 float u=t<.56?.985*smoothstep(0.,.56,t):.985+.015*smoothstep(.56,1.,t);
 vec4 movingFrom=sourceCamera*fromClip;vec2 a=movingFrom.xy/max(abs(movingFrom.w),.01),b=toClip.xy/max(abs(toClip.w),.01);
 float start=atan(a.y,a.x),end=atan(b.y,b.x),delta=atan(sin(end-start),cos(end-start));
 float arc=sin(3.14159265*u),angle=start+delta*u+6.2831853*u+.8*arc*sin(length(a)*13.+float(gl_VertexID)*.096);
 vec2 q=vec2(cos(angle),sin(angle))*mix(length(a),length(b),u);
 if(u<=0.)q=a;if(u>=1.)q=b;
 float depth=mix(max(abs(fromClip.w),.02),max(abs(toClip.w),.02),u);
 gl_Position=vec4(q*resizeScale*depth,0.,depth);
 color=mix(fromColor,toColor,u);gl_PointSize=mix(fromStyle.x,toStyle.x,u);rim=mix(fromStyle.y,toStyle.y,u);
}`;
const fragment = `#version 300 es
precision highp float;in vec4 color;in float rim;out vec4 frag;
void main(){float r=length(gl_PointCoord-.5);if(r>.5||color.a<.001)discard;float a=(1.-smoothstep(rim,.5,r))*color.a;frag=vec4(color.rgb*a,a);}`;
export function createChapterMorph(gl, count) {
  const p = program(gl, vertex, fragment),
    saved = program(
      gl,
      snapshotShader(vertex, 'color.rgb', 'color.a', 'rim'),
      fragment,
      true,
    );
  const vao = gl.createVertexArray(),
    buffers = [gl.createBuffer(), gl.createBuffer()];
  gl.bindVertexArray(vao);
  for (let j = 0; j < 2; j++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[j]);
    for (const [i, size, offset] of [
      [0, 4, 0],
      [1, 4, 16],
      [2, 2, 32],
    ]) {
      gl.enableVertexAttribArray(j * 3 + i);
      gl.vertexAttribPointer(j * 3 + i, size, gl.FLOAT, false, 40, offset);
    }
  }
  let ratio = 1,
    sourceCamera = identity();
  function bind(pr, t, aspect) {
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== pr) gl.useProgram(pr);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(pr, 'sourceCamera'),
      false,
      sourceCamera,
    );
    gl.uniform1f(gl.getUniformLocation(pr, 'progress'), t);
    gl.uniform2f(gl.getUniformLocation(pr, 'resizeScale'), ratio / aspect, 1);
    gl.bindVertexArray(vao);
  }
  return {
    set(from, to, aspect) {
      if (from.length !== count * 10 || to.length !== count * 10)
        throw Error('Shared particle count changed');
      ratio = aspect;
      sourceCamera = identity();
      for (let j = 0; j < 2; j++) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[j]);
        gl.bufferData(gl.ARRAY_BUFFER, j ? to : from, gl.STATIC_DRAW);
      }
    },
    draw(t, aspect, transform = sourceCamera) {
      sourceCamera = transform;
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      bind(p, t, aspect);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.bindVertexArray(null);
    },
    snapshot(t, aspect) {
      return capture(gl, saved, count, (pr) => {
        bind(pr, t, aspect);
        gl.drawArrays(gl.POINTS, 0, count);
      });
    },
    dispose() {
      buffers.forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(vao);
      gl.deleteProgram(p);
      gl.deleteProgram(saved);
    },
  };
}
// Preserve every old chapter sample and its opacity. Extra native slots have
// destinations but remain inactive at the old chapter endpoint.
export function expandSnapshot(source, count) {
  const n = source.length / 10;
  if (!Number.isInteger(n) || !Number.isInteger(count) || n < 1 || count < n)
    throw Error('Cannot discard chapter particles');
  if (n === count) return source;
  const out = new Float32Array(count * 10);
  for (let i = 0; i < count; i++) {
    const j = Math.floor((i * n) / count);
    out.set(source.subarray(j * 10, j * 10 + 10), i * 10);
    if (Math.floor(((i + 1) * n) / count) === j) out[i * 10 + 7] = 0;
  }
  return out;
}
