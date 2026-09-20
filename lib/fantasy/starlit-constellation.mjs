import { program } from '../fantasy-particles.mjs';
import { cameraFrame } from './camera.mjs';
import { CUP_CENTER } from './starlit-intro.mjs';
// Sparse closed contours; all parts rotate together in object space.
export function cupGeometry() {
  const lines = [];
  const segment = (a, b) => lines.push(...a, ...b);
  const loop = (vertices) =>
    vertices.forEach((p, i) => segment(p, vertices[(i + 1) % vertices.length]));
  const ring = (y, radius) =>
    loop(
      Array.from({ length: 20 }, (_, i) => {
        const a = (i * Math.PI) / 10;
        return [Math.cos(a) * radius, y, Math.sin(a) * radius];
      }),
    );
  ring(-0.36, 0.34);
  ring(0.22, 0.43);
  ring(0.28, 0.46);
  // Four gently tapered sides leave the interior open instead of making a cage.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const at = (r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    segment(at(0.34, -0.36), at(0.39, -0.1));
    segment(at(0.39, -0.1), at(0.43, 0.22));
  }
  // Triangular ears have front/back faces and a broad base on the lid.
  for (const sign of [-1, 1]) {
    const front = [
      [sign * 0.17, 0.28, 0.11],
      [sign * 0.4, 0.56, 0.025],
      [sign * 0.43, 0.28, 0.11],
    ];
    const back = front.map(([x, y, z]) => [x, y, z - 0.18]);
    loop(front);
    loop(back);
    front.forEach((p, i) => segment(p, back[i]));
  }
  // Tilted hollow straw, with perpendicular end rings and only two long edges.
  const straw = (t, a) => [
    0.08 + t * 0.15 + Math.cos(a) * 0.035,
    0.25 + t * 0.46 - (Math.cos(a) * 0.035 * 0.15) / 0.46,
    -0.04 + Math.sin(a) * 0.035,
  ];
  for (const t of [0, 1])
    loop(Array.from({ length: 8 }, (_, i) => straw(t, (i * Math.PI) / 4)));
  for (const a of [0, Math.PI]) segment(straw(0, a), straw(1, a));
  // Two small star charms at different depths, each with physical thickness.
  for (const [x, y, z, turn] of [
    [-0.14, -0.04, 0.2, 0.25],
    [0.16, 0.02, -0.16, -0.5],
  ]) {
    const face = (depth) =>
      Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 0.032 : 0.07;
        return [
          x + Math.cos(a) * r * Math.cos(turn) + depth * Math.sin(turn),
          y + Math.sin(a) * r,
          z - Math.cos(a) * r * Math.sin(turn) + depth * Math.cos(turn),
        ];
      });
    const front = face(0.018),
      back = face(-0.018);
    loop(front);
    loop(back);
    for (let i = 0; i < 10; i += 2) segment(front[i], back[i]);
  }
  return new Float32Array(lines);
}

export function cupStarGeometry(lines = cupGeometry()) {
  // Shared contour joints are drawn once, regardless of their edge degree.
  const unique = new Map();
  for (let i = 0; i < lines.length; i += 3) {
    const p = Array.from(lines.slice(i, i + 3));
    unique.set(p.map((v) => v.toFixed(6)).join(','), p);
  }
  const points = [...unique.values()].flat();
  // Round pearls are sampled spheres, not flat rings or additional wire cages.
  for (const [x, y, z, radius] of [
    [-0.21, -0.24, 0.09, 0.048],
    [0, -0.285, 0.21, 0.053],
    [0.2, -0.235, 0.07, 0.05],
    [-0.1, -0.25, -0.16, 0.047],
    [0.12, -0.28, -0.17, 0.045],
  ]) {
    for (let i = 0; i < 40; i++) {
      const v = 1 - (2 * (i + 0.5)) / 40;
      const a = i * Math.PI * (3 - Math.sqrt(5));
      const r = radius * Math.sqrt(1 - v * v);
      points.push(x + Math.cos(a) * r, y + radius * v, z + Math.sin(a) * r);
    }
  }
  return new Float32Array(points);
}
export function createConstellation(gl, canvas) {
  const vs = `#version 300 es
precision highp float;precision highp int;layout(location=0)in vec3 p;uniform mat4 vp;uniform vec3 center;uniform float time;uniform int sky;out float light;
void main(){vec3 q=p;float a=time*(sky==1?.012:.24);q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz;if(sky==0)q+=center;gl_Position=vp*vec4(q,1);light=.5+.5*sin(time*(.3+fract(p.x*73.1)) + dot(p,vec3(37,71,19)));gl_PointSize=sky==1?1.2+light*1.3:(p.y<-.17&&length(p.xz)<.3?1.8+light:3.2+light*2.2);}`;
  const fs = `#version 300 es
precision highp float;precision highp int;in float light;uniform float alpha;uniform int points,sky;out vec4 outColor;
void main(){float a=alpha*(.45+.55*light);if(points==1){float r=length(gl_PointCoord-.5);if(r>.5)discard;a*=1.-smoothstep(.15,.5,r);}vec3 color=sky==1?vec3(.65,.69,.88):(points==1?vec3(.85,.93,1.):vec3(.55,.73,1.));outColor=vec4(color,a);}`;
  const p = program(gl, vs, fs),
    vaos = [],
    buffers = [];
  function upload(data) {
    const vao = gl.createVertexArray(),
      buffer = gl.createBuffer();
    vaos.push(vao);
    buffers.push(buffer);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    return { vao, count: data.length / 3 };
  }
  const geometry = cupGeometry();
  const cup = upload(geometry),
    cupStars = upload(cupStarGeometry(geometry));
  let seed = 47;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const stars = [];
  for (let i = 0; i < 1500; i++) {
    const y = random() * 2 - 1,
      a = random() * Math.PI * 2,
      r = 12 + random() * 5;
    stars.push(
      r * Math.sqrt(1 - y * y) * Math.cos(a),
      r * y,
      r * Math.sqrt(1 - y * y) * Math.sin(a),
    );
  }
  const sky = upload(new Float32Array(stars));
  return {
    draw(camera, time, cupOpacity = 1, skyOpacity = 1) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(p);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(p, 'vp'),
        false,
        cameraFrame(camera, canvas).M,
      );
      gl.uniform1f(gl.getUniformLocation(p, 'time'), time);
      gl.uniform3fv(gl.getUniformLocation(p, 'center'), CUP_CENTER);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const [obj, isSky] of [
        [sky, 1],
        ...(cupOpacity > 0 ? [[cup, 0]] : []),
      ]) {
        if (isSky) gl.disable(gl.DEPTH_TEST);
        else gl.enable(gl.DEPTH_TEST);
        gl.bindVertexArray(isSky ? obj.vao : cupStars.vao);
        gl.uniform1i(gl.getUniformLocation(p, 'sky'), isSky);
        gl.uniform1i(gl.getUniformLocation(p, 'points'), 1);
        gl.uniform1f(
          gl.getUniformLocation(p, 'alpha'),
          0.8 * (isSky ? skyOpacity : cupOpacity),
        );
        gl.drawArrays(gl.POINTS, 0, isSky ? obj.count : cupStars.count);
        if (!isSky) {
          gl.bindVertexArray(cup.vao);
          gl.uniform1i(gl.getUniformLocation(p, 'points'), 0);
          gl.uniform1f(gl.getUniformLocation(p, 'alpha'), 0.22 * cupOpacity);
          gl.drawArrays(gl.LINES, 0, obj.count);
        }
      }
      gl.bindVertexArray(null);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    },
    dispose() {
      vaos.forEach((v) => gl.deleteVertexArray(v));
      buffers.forEach((b) => gl.deleteBuffer(b));
      gl.deleteProgram(p);
    },
  };
}
