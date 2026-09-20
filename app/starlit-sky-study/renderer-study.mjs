import { parseGlb, worldMesh, bufferViewBytes } from '../../lib/fantasy/glb.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
import { createPalmProp } from '../../lib/fantasy/palm-prop.mjs';
import {
  program as makeProgram,
  snapshotShader,
  capture,
} from '../../lib/fantasy/../fantasy-particles.mjs';
const sha = async (b) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
async function bytes(name) {
  const r = await fetch('/fantasy/' + name);
  if (!r.ok) throw Error('Missing ' + name);
  return r.arrayBuffer();
}
const vs = `#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;layout(location=2)in vec2 aUV;
uniform mat4 vp;out vec3 P;out vec3 N;out vec2 uv;
void main(){P=aPos;N=aNormal;uv=aUV;gl_Position=vp*vec4(P,1);}`;
const fs = `#version 300 es
precision highp float;in vec3 P;in vec3 N;in vec2 uv;uniform sampler2D colorMap,normalMap,rmMap;uniform vec3 eye;uniform int mode;out vec4 frag;
vec3 linear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 mappedNormal(vec3 n){vec3 q0=dFdx(P),q1=dFdy(P);vec2 t0=dFdx(uv),t1=dFdy(uv);vec3 p1=cross(q1,n),p0=cross(n,q0);vec3 T=p1*t0.x+p0*t1.x,B=p1*t0.y+p0*t1.y;float scale=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-20));return normalize(mat3(T*scale,B*scale,n)*(texture(normalMap,uv).xyz*2.-1.));}
vec3 light(vec3 n,vec3 v,vec3 l,vec3 radiance,vec3 base,float rough,float metal){vec3 h=normalize(v+l);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);float a=rough*rough,a2=a*a,d=nh*nh*(a2-1.)+1.;float D=a2/(3.14159265*d*d);float k=(rough+1.)*(rough+1.)/8.;float G=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);vec3 F=mix(vec3(.04),base,metal)+(1.-mix(vec3(.04),base,metal))*pow(1.-vh,5.);return ((1.-F)*(1.-metal)*base/3.14159265+D*G*F/max(4.*nl*nv,.001))*radiance*nl;}
void main(){vec3 base=linear(texture(colorMap,uv).rgb),n=normalize(N),v=normalize(eye-P);if(mode==1){frag=vec4(srgb(base),1);return;}if(mode==2){base=vec3(.40);vec3 l=normalize(v+vec3(-.6,.8,.1));frag=vec4(srgb(base*(.26+.74*max(dot(n,l),0.))),1);return;}n=mappedNormal(n);vec3 rm=texture(rmMap,uv).rgb;float rough=max(rm.g,.08),metal=rm.b;vec3 c=base*(.24+.14*max(n.y,0.));c+=light(n,v,normalize(v+vec3(-.7,1.,.3)),vec3(2.6),base,rough,metal);c+=light(n,v,normalize(vec3(.8,.3,-1.)),vec3(.55,.63,.8),base,rough,metal);frag=vec4(srgb(c),1);}`;
let starVS = `#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;layout(location=2)in vec2 aUV;layout(location=3)in vec4 sourceRGB;layout(location=4)in vec4 sourceSize;layout(location=5)in vec3 sourceNear;layout(location=6)in float support;layout(location=7)in vec4 paletteWide;layout(location=8)in vec3 paletteNear;uniform mat4 vp;uniform vec3 eye;uniform sampler2D colorMap;uniform float focal,closeup,heightScale;uniform int sky,isReference,sourceOn,diagnostic;out vec3 col;out float fade;flat out int ref;
void main(){ref=isReference;vec3 v=eye-aPos;float dist=length(v);gl_Position=vp*vec4(aPos,1);if(sky==1){col=vec3(.53,.58,.83);fade=.65;gl_PointSize=1.25;return;}float facing=dot(normalize(aNormal),v/dist);if(isReference==1){col=mix(sourceRGB.rgb,sourceNear,closeup);fade=sourceSize.z*smoothstep(-.03,.015,facing);gl_PointSize=mix(sourceSize.x,sourceSize.y,closeup)*heightScale;return;}vec3 rgb=textureLod(colorMap,aUV,0.).rgb;vec3 l=normalize(vec3(-.35,.85,1.));float diffuse=.65+.85*max(dot(normalize(aNormal),l),0.);float spec=pow(max(dot(normalize(aNormal),normalize(l+v/dist)),0.),28.);float edge=pow(1.-max(facing,0.),2.8);vec3 tint=normalize(rgb+vec3(.30,.27,.34));col=rgb*diffuse+vec3(.38)*spec+1.15*edge*tint;if(sourceOn==1)col=mix(col,mix(paletteWide.rgb,paletteNear,closeup),paletteWide.a);if(diagnostic==1)col=vec3(.28);fade=smoothstep(-.03,.08,facing)*(sourceOn==1?support:1.);float bright=max(col.r,max(col.g,col.b));float head=smoothstep(.71,.76,aPos.y)*(1.-smoothstep(.15,.18,abs(aPos.x)))*(1.-smoothstep(.20,.25,abs(aPos.z)));float optical=sourceOn==1?head*closeup:0.;gl_PointSize=clamp((.00075+.0010*bright)*focal/dist,1.20+.80*optical,2.3);}`;
const starFS = `#version 300 es
precision highp float;in vec3 col;in float fade;flat in int ref;out vec4 frag;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float a=(1.-smoothstep(ref==1?.32:.34,.5,r))*fade;if(ref==1)a*=min(1.,max(col.r,max(col.g,col.b))*2.8);frag=vec4(col,a);}`;
starVS =
  starVS
    .replace(
      'out vec3 col;',
      'uniform float time,twinkle,opening,studyOpening;out vec3 col;',
    )
    .replace('void main()', 'void baseMain()') +
  `
void main(){baseMain();if(isReference==0&&sky==0){float seed=fract(float(gl_VertexID)*.61803398875);float phase=fract(time/(14.+seed*26.)+fract(seed*73.13));float pulse=pow(max(0.,1.-abs(phase-.5)/.0225),2.)*twinkle;col=mix(col,min(vec3(1.25),col*.45+vec3(.8)),pulse*.9);gl_PointSize*=1.+pulse*.8;}if(opening>0.&&sky==0){float seed=fract(float(gl_VertexID)*.61803398875);float facing=dot(normalize(aNormal),normalize(eye-aPos));vec3 blue=mix(vec3(.16,.29,.68),vec3(.55,.78,1.),pow(seed,4.));col=mix(col,blue,opening*mix(1.,.22,studyOpening));fade=mix(fade,smoothstep(-.03,.08,facing)*(.6+.4*seed),opening);gl_PointSize=mix(gl_PointSize,(2.5+2.5*seed)*heightScale,opening);}}`;
export async function createFantasy(gl, canvas) {
  const manifest = JSON.parse(
      new TextDecoder().decode(await bytes('model-manifest.json')),
    ),
    b = await bytes('source.glb');
  if (
    manifest.sha256 !==
      'db1842943d71f1814bddfd03b6fc38b4a340bf63a4272bb5f24e2f949cf2a72a' ||
    (await sha(b)) !== manifest.sha256
  )
    throw Error('Fantasy GLB hash mismatch');
  const g = parseGlb(b),
    mesh = worldMesh(g);
  const buffers = [],
    vaos = [],
    textures = [],
    programs = [];
  const prog = (v, f, tf = false) => {
    const p = makeProgram(gl, v, f, tf);
    programs.push(p);
    return p;
  };
  const upload = (a, i, size, stride = 0, offset = 0) => {
    const b = gl.createBuffer();
    buffers.push(b);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, stride, offset);
    return b;
  };
  const va = () => {
    const a = gl.createVertexArray();
    vaos.push(a);
    gl.bindVertexArray(a);
    return a;
  };
  const depthProgram = prog(
      vs,
      '#version 300 es\nprecision highp float;out vec4 frag;void main(){frag=vec4(0);}',
    ),
    starProgram = prog(starVS, starFS),
    saveProgram = prog(
      snapshotShader(
        starVS,
        'col',
        'fade*(isReference==1?min(1.,max(col.r,max(col.g,col.b))*2.8):1.)',
        'isReference==1?.32:.34',
        true,
      ),
      starFS,
      true,
    );
  const vao = va();
  upload(mesh.position, 0, 3);
  upload(mesh.normal, 1, 3);
  upload(mesh.uv, 2, 2);
  const ib = gl.createBuffer();
  buffers.push(ib);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW);
  const mat = mesh.material,
    pbr = mat.pbrMetallicRoughness;
  for (const ti of [
    pbr.baseColorTexture.index,
    mat.normalTexture.index,
    pbr.metallicRoughnessTexture.index,
  ]) {
    const td = g.json.textures[ti],
      im = g.json.images[td.source];
    const bitmap = await createImageBitmap(
      new Blob([bufferViewBytes(g, im.bufferView)], { type: im.mimeType }),
      { colorSpaceConversion: 'none', premultiplyAlpha: 'none' },
    );
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    const sampler = g.json.samplers?.[td.sampler] || {};
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      sampler.wrapS || gl.REPEAT,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      sampler.wrapT || gl.REPEAT,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      sampler.minFilter || gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      sampler.magFilter || gl.LINEAR,
    );
    textures.push(tex);
    bitmap.close();
  }
  const starManifest = JSON.parse(
      new TextDecoder().decode(await bytes('star-manifest.json')),
    ),
    sourceManifest = JSON.parse(
      new TextDecoder().decode(await bytes('source-manifest.json')),
    );
  if (
    starManifest.meshSHA256 !== manifest.sha256 ||
    sourceManifest.meshSHA256 !== manifest.sha256
  )
    throw Error('Fantasy source namespace mismatch');
  const load = async (name, hashes = sourceManifest.hashes) => {
    const b = await bytes(name);
    if ((await sha(b)) !== hashes[name])
      throw Error('Fantasy source hash: ' + name);
    return new Float32Array(b);
  };
  const stars = await load('surface-stars.f32', starManifest.hashes),
    starCount = starManifest.count;
  const starVao = va();
  upload(stars, 0, 3, 32, 0);
  for (const [i, size, offset] of [
    [1, 3, 12],
    [2, 2, 24],
  ]) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, 32, offset);
  }
  upload(await load('ordinary-support.f32'), 6, 1);
  upload(await load('ordinary-palette.f32'), 7, 4, 28, 0);
  gl.enableVertexAttribArray(8);
  gl.vertexAttribPointer(8, 3, gl.FLOAT, false, 28, 16);
  const refVao = va();
  upload(await load('reference-stars.f32'), 0, 3, 32, 0);
  for (const [i, size, offset] of [
    [1, 3, 12],
    [2, 2, 24],
  ]) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, 32, offset);
  }
  upload(await load('reference-render.f32'), 3, 4);
  upload(await load('reference-size-opacity-id.f32'), 4, 4);
  upload(await load('reference-near-rgb.f32'), 5, 3);
  gl.bindVertexArray(null);
  const prop = await createPalmProp(gl, mesh, manifest.sha256);
  let depthTexture = gl.createTexture(),
    depthTarget = gl.createFramebuffer(),
    depthW = 0,
    depthH = 0;
  function depthBuffer() {
    if (depthW === canvas.width && depthH === canvas.height) return;
    depthW = canvas.width;
    depthH = canvas.height;
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      depthW,
      depthH,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthTarget);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      depthTexture,
      0,
    );
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error('Snapshot depth framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function depth(c) {
    gl.viewport(...c.viewport);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(depthProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram, 'vp'), false, c.M);
    gl.bindVertexArray(vao);
    gl.colorMask(false, false, false, false);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 4);
    gl.drawElements(gl.TRIANGLES, mesh.index.length, gl.UNSIGNED_INT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
  }
  function bind(
    p,
    c,
    cam,
    time,
    twinkle,
    reference,
    snapshot = false,
    opening = 0,
  ) {
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== p) gl.useProgram(p);
    for (const [name, value] of Object.entries({
      focal: c.focalPx,
      closeup: Math.max(
        0,
        Math.min(
          1,
          (1 / cam.dist - 1 / 2.221400400649241) /
            (1 / 0.8476238677322853 - 1 / 2.221400400649241),
        ),
      ),
      heightScale: c.height / 720,
      time,
      twinkle,
      opening,
      studyOpening: canvas.dataset.openingStudy === 'false' ? 0 : 1,
    }))
      gl.uniform1f(gl.getUniformLocation(p, name), value);
    gl.uniformMatrix4fv(gl.getUniformLocation(p, 'vp'), false, c.M);
    gl.uniform3fv(gl.getUniformLocation(p, 'eye'), c.eye);
    gl.uniform1i(gl.getUniformLocation(p, 'colorMap'), 0);
    gl.uniform1i(gl.getUniformLocation(p, 'sourceOn'), 1);
    gl.uniform1i(gl.getUniformLocation(p, 'isReference'), reference ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(p, 'sky'), 0);
    gl.uniform1i(
      gl.getUniformLocation(p, 'useSnapshotDepth'),
      snapshot ? 1 : 0,
    );
    gl.uniform1i(gl.getUniformLocation(p, 'snapshotDepth'), 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    if (snapshot) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    }
    gl.bindVertexArray(reference ? refVao : starVao);
  }
  function draw(
    cam,
    {
      time = 0,
      phase = 0,
      reveal = 1,
      twinkle = 0,
      fireTime = -1,
      opening = 0,
      background = () => {},
    } = {},
  ) {
    const c = cameraFrame(cam, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    background();
    // Sparse surface points reveal the sky; mesh depth only occludes body/prop.
    depth(c);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.depthMask(false);
    for (const ref of [false, true]) {
      bind(starProgram, c, cam, time, twinkle, ref, false, opening);
      gl.drawArrays(gl.POINTS, 0, ref ? sourceManifest.count : starCount);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    prop.draw({ ...c, phase, reveal, fireTime });
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function snapshot(cam, opts = {}) {
    depthBuffer();
    const c = cameraFrame(cam, canvas);
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthTarget);
    depth(c);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const records = [];
    for (const ref of [false, true])
      records.push(
        capture(
          gl,
          saveProgram,
          ref ? sourceManifest.count : starCount,
          (p) => {
            bind(p, c, cam, opts.time || 0, opts.twinkle || 0, ref, true);
            gl.drawArrays(gl.POINTS, 0, ref ? sourceManifest.count : starCount);
          },
        ),
      );
    records.push(
      prop.snapshot({
        ...c,
        phase: opts.phase || 0,
        reveal: opts.reveal ?? 1,
        fireTime: opts.fireTime ?? -1,
        depthTexture,
      }),
    );
    const out = new Float32Array(records.reduce((s, a) => s + a.length, 0));
    let offset = 0;
    for (const a of records) {
      out.set(a, offset);
      offset += a.length;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return out;
  }
  return {
    draw,
    snapshot,
    get depthTexture() {
      return depthTexture;
    },
    count: starCount + sourceManifest.count + prop.cfg.propCount,
    manifest,
    sourceManifest,
    placement: prop.placement,
    dispose() {
      buffers.forEach((b) => gl.deleteBuffer(b));
      textures.forEach((t) => gl.deleteTexture(t));
      vaos.forEach((v) => gl.deleteVertexArray(v));
      programs.forEach((p) => gl.deleteProgram(p));
      gl.deleteTexture(depthTexture);
      gl.deleteFramebuffer(depthTarget);
      prop.dispose();
    },
  };
}
