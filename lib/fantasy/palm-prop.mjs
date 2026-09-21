import {
  program as makeProgram,
  snapshotShader,
  capture,
} from '../fantasy-particles.mjs';
// Portable prop-only module. Input mesh is the pinned, unchanged fantasy world mesh.
const add = (a, b) => a.map((v, i) => v + b[i]),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const unit = (a) => {
  const d = Math.hypot(...a);
  if (d < 1e-9) throw Error('Degenerate palm frame');
  return a.map((v) => v / d);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const mv = (m, v) => m.map((row) => dot(row, v));
export function resolvePalmPlacement(mesh, cfg) {
  const point = (w) => {
    const indices = Array.from(mesh.index.slice(w.face * 3, w.face * 3 + 3));
    if (indices.some((v, i) => v !== w.vertices[i]))
      throw Error('Palm face namespace changed');
    if (
      Math.abs(w.bary.reduce((a, b) => a + b, 0) - 1) > 1e-8 ||
      w.bary.some((x) => x < 0 || x > 1)
    )
      throw Error('Invalid palm barycentric');
    return [0, 1, 2].map((axis) =>
      indices.reduce(
        (s, id, i) => s + mesh.position[id * 3 + axis] * w.bary[i],
        0,
      ),
    );
  };
  const anchor = point(cfg.witnesses.center),
    across = point(cfg.witnesses.across),
    distal = point(cfg.witnesses.distal);
  const u = unit(sub(across, anchor)),
    d = sub(distal, anchor),
    v = unit(
      sub(
        d,
        u.map((x) => x * dot(d, u)),
      ),
    ),
    n = cross(v, u);
  const basis = [0, 1, 2].map((i) => [u[i], n[i], v[i]]),
    pivot = add(anchor, mv(basis, cfg.offsetLocal));
  const orientation = basis.map((row) =>
    [0, 1, 2].map((col) =>
      row.reduce((s, x, k) => s + x * cfg.orientationLocal[k][col], 0),
    ),
  );
  return { anchor, basis, pivot, orientation };
}
const PROP_FILES = [
  'prop-candidate-manifest.json',
  'prop-placement.json',
  'original-prop.f32',
  'prop-seeds.f32',
  'prop-draw-order.u32',
];
/** Starts every prop download at once; createPalmProp verifies them in order. */
export function fetchPalmProp() {
  return Promise.all(
    PROP_FILES.map(async (name) => {
      const r = await fetch('/fantasy/' + name);
      if (!r.ok) throw Error('Missing ' + name);
      return r.arrayBuffer();
    }),
  );
}
export async function createPalmProp(
  gl,
  mesh,
  meshSHA256,
  fetched = fetchPalmProp(),
) {
  const hash = async (b) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
  const [manifestBytes, cfgBytes, raw, seeds, order] = await fetched;
  if (
    (await hash(manifestBytes)) !==
    '02527b2ab3c9a42c4ca5ae6c787347ce0e9b1a7a1f455a4ca6a3e956eb02c184'
  )
    throw Error('Approved prop manifest drift');
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  if ((await hash(cfgBytes)) !== manifest.propPlacementSHA256)
    throw Error('Approved R3 prop placement drift');
  const cfg = JSON.parse(new TextDecoder().decode(cfgBytes));
  if (cfg.meshSHA256 !== meshSHA256)
    throw Error('Prop requires exact fantasy mesh hash');
  for (const [name, b] of Object.entries({
    'original-prop.f32': raw,
    'prop-seeds.f32': seeds,
    'prop-draw-order.u32': order,
  }))
    if ((await hash(b)) !== cfg.assetHashes[name])
      throw Error('Prop identity hash mismatch: ' + name);
  const source = new Float32Array(raw);
  if (source.length !== cfg.propCount * 13)
    throw Error('Prop record count mismatch');
  const placement = resolvePalmPlacement(mesh, cfg);
  const vs = `#version 300 es
 precision highp float;layout(location=0)in vec3 pos;layout(location=1)in vec3 rgb;layout(location=2)in vec3 normal;layout(location=3)in vec3 oldAssetPivot;layout(location=4)in float emission;layout(location=5)in float seed;
 uniform mat4 vp;uniform mat3 orientation;uniform vec3 pivot,eye;uniform float phase,scale,focal,reveal,fireTime;out vec3 color;out float opacity;
 void main(){vec3 q=pos-oldAssetPivot;float c=cos(phase),s=sin(phase);q=vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);vec3 world=pivot+orientation*(q*scale);gl_Position=vp*vec4(world,1.);float bright=max(rgb.r,max(rgb.g,rgb.b));
 // Original emission2 material and original radial fragment, with perspective world-scaled point diameter.
 gl_PointSize=clamp((1.05+bright*.78)*(.0025*scale)*focal/length(eye-world),.7,8.);color=rgb*1.15;if(fireTime>=0.){float pulse=pow(max(0.,sin(fireTime*1.7+pos.y*61.)*sin(fireTime*.73+pos.x*87.)),7.);color*=1.+pulse*.65;}opacity=reveal;}`;
  const fs = `#version 300 es
 precision mediump float;in vec3 color;in float opacity;out vec4 frag;
 void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5||opacity<.01)discard;float bright=max(color.r,max(color.g,color.b));float alpha=(1.-smoothstep(.32,.5,r))*min(1.,bright*2.8)*opacity;frag=vec4(color*alpha,alpha);}`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program));
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, source, gl.STATIC_DRAW);
  for (const [i, size, offset] of [
    [0, 3, 0],
    [1, 3, 12],
    [2, 3, 24],
    [3, 3, 36],
    [4, 1, 48],
  ]) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, 52, offset);
  }
  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seeds), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(5);
  gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 4, 0);
  const orderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, orderBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(order),
    gl.STATIC_DRAW,
  );
  gl.bindVertexArray(null);
  const saved = makeProgram(
    gl,
    snapshotShader(
      vs,
      'color',
      'opacity*min(1.,max(color.r,max(color.g,color.b))*2.8)',
      '.32',
      true,
    ),
    fs,
    true,
  );
  return {
    cfg,
    placement,
    source,
    buffer,
    snapshot({
      M,
      eye,
      focalPx,
      phase,
      reveal = 1,
      depthTexture,
      fireTime = -1,
    }) {
      return capture(gl, saved, cfg.propCount, (p) => {
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'vp'), false, M);
        gl.uniformMatrix3fv(
          gl.getUniformLocation(p, 'orientation'),
          false,
          Float32Array.from(
            [0, 1, 2].flatMap((c) =>
              placement.orientation.map((row) => row[c]),
            ),
          ),
        );
        gl.uniform3fv(gl.getUniformLocation(p, 'pivot'), placement.pivot);
        gl.uniform3fv(gl.getUniformLocation(p, 'eye'), eye);
        for (const [n, v] of Object.entries({
          fireTime,
          phase,
          scale: cfg.scale,
          focal: focalPx,
          reveal,
        }))
          gl.uniform1f(gl.getUniformLocation(p, n), v);
        gl.uniform1i(gl.getUniformLocation(p, 'useSnapshotDepth'), 1);
        gl.uniform1i(gl.getUniformLocation(p, 'snapshotDepth'), 3);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, cfg.propCount);
      });
    },
    dispose() {
      [buffer, seedBuffer, orderBuffer].forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteProgram(saved);
    },
    draw({ M, eye, focalPx, phase, reveal = 1, fireTime = -1 }) {
      if (reveal <= 0) return;
      gl.useProgram(program);
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'vp'), false, M);
      gl.uniformMatrix3fv(
        gl.getUniformLocation(program, 'orientation'),
        false,
        Float32Array.from(
          [0, 1, 2].flatMap((c) => placement.orientation.map((row) => row[c])),
        ),
      );
      gl.uniform3fv(gl.getUniformLocation(program, 'pivot'), placement.pivot);
      gl.uniform3fv(gl.getUniformLocation(program, 'eye'), eye);
      for (const [name, value] of Object.entries({
        fireTime,
        phase,
        scale: cfg.scale,
        focal: focalPx,
        reveal,
      }))
        gl.uniform1f(gl.getUniformLocation(program, name), value);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.POINTS, cfg.propCount, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    },
    async hash() {
      const copy = new Float32Array(source.length);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, copy);
      return hash(copy.buffer);
    },
  };
}
