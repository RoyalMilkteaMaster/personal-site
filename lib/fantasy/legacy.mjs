import { portraitPoints } from '../portrait-points.ts';
import { heldObjectPoints } from '../held-object-points.ts';
import {
  backgroundStars,
  rotateHeldObjects,
  assignParticleIds,
  STRIDE,
} from '../particle-morph.ts';
import { scenePool, markDetail } from '../scene-pool.ts';
import { portraitCamera, PORTRAIT_SCALE } from '../fixed-bust.ts';
import { stageShot, WIDE_RADIUS } from '../camera-sequence.ts';
import { program, snapshotShader, capture } from '../fantasy-particles.mjs';
const vertex = `#version 300 es

in vec3 aPosition;
in vec3 aColor;
in vec3 aNormal;
in float aHeld;
in float aSeed;
in float aEdgeFade;
uniform vec3 uEye;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uBack;
uniform float uAspect;
uniform float uDpr;
uniform float uSurface;
uniform float uTime;
uniform float uTwinkle;
uniform float uPropReveal;
uniform float uPointScale;
uniform float uOpening;
out vec3 vColor;
out float vOpacity;
uniform bool backgroundOnly;
void main(){
 vec3 p=aPosition;
 vec3 n=aNormal;
 vec3 rel=p-uEye;
 float depth=-dot(rel,uBack);
 float fit=min(1.0,uAspect/.62);
 gl_Position=vec4(dot(rel,uRight)*3.8*fit/uAspect,dot(rel,uUp)*3.8*fit,depth*.998-.2,depth);
 if(backgroundOnly)gl_Position.z=gl_Position.w*.9999;
 float bright=max(aColor.r,max(aColor.g,aColor.b));
 // Normalised on the wide stop, so the chapters keep the star size the site
 // has always drawn and only the close-ups grow.
 float scale=clamp(uPointScale/depth,.6,1.7);
 gl_PointSize=uDpr*mix(1.2,1.05+bright*.78,uSurface)*scale;
 if(aHeld<-.5)gl_PointSize=uDpr*(1.05+bright*1.2)*scale;
 vec3 normal=normalize(n+vec3(0.0,0.0,-.0001));
 // aEdgeFade is the body's own opacity: the garment's edge wisps, and the slots
 // a pose does not draw. Unchanged from the original scene.
 vOpacity=aHeld>-.5&&aHeld<.5?1.0-clamp(aEdgeFade,0.0,1.0):1.0;
 if(aHeld>.5)vOpacity=uPropReveal;
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
 // Only the starlit opening remaps the existing orbit into a blue full-window sky.
 if(backgroundOnly){vColor=mix(vColor,vec3(.30,.48,1.)*(.55+.45*bright),uOpening);gl_PointSize*=1.+.35*uOpening;}
}`;
const fragment = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vOpacity;
out vec4 frag;void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5||vOpacity<.01)discard;float bright=max(vColor.r,max(vColor.g,vColor.b));float alpha=(1.0-smoothstep(.32,.5,r))*min(1.0,bright*2.8)*vOpacity;frag=vec4(vColor*alpha,alpha);}`;

export async function createLegacy(gl, canvas) {
  const bounds = canvas.getBoundingClientRect(),
    height = Math.min(bounds.height, bounds.width / 0.62),
    rest =
      Math.round(
        Math.max(10000, Math.min(45000, (height * height * 0.52 * 0.76) / 6.3)),
      ) + 1600,
    pool = scenePool(rest);
  const load = (src) =>
    new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(Error('Chapter artwork unavailable'));
      im.src = src;
    });
  const [img, hands] = await Promise.all([
    load('/astral-clean-plate.png'),
    load('/astral-hands-v20.png'),
  ]);
  const sample = document.createElement('canvas');
  sample.width = Math.floor(img.width / 3);
  sample.height = img.height;
  const c = sample.getContext('2d', { willReadFrequently: true });
  if (!c) throw Error('Chapter sampling unavailable');
  const targets = [null];
  for (const pose of [1, 2]) {
    c.clearRect(0, 0, sample.width, sample.height);
    c.drawImage(
      img,
      (pose * img.width) / 3,
      0,
      img.width / 3,
      img.height,
      0,
      0,
      sample.width,
      sample.height,
    );
    const [u, v, pw, ph] =
      pose === 1 ? [0.015, 0.36, 0.34, 0.155] : [0.79, 0.265, 0.195, 0.16];
    c.drawImage(
      hands,
      ((pose + u) * hands.width) / 3,
      v * hands.height,
      (pw * hands.width) / 3,
      ph * hands.height,
      u * sample.width,
      v * sample.height,
      pw * sample.width,
      ph * sample.height,
    );
    const body = portraitPoints(
        c.getImageData(0, 0, sample.width, sample.height).data,
        sample.width,
        sample.height,
        pool.body(pose),
        pose,
      ),
      target = new Float32Array(pool.count * STRIDE);
    target.set(body);
    target.set(heldObjectPoints(pool.object(pose), pose), body.length);
    target.set(
      backgroundStars(pool.sky(pose), pose),
      body.length + pool.object(pose) * STRIDE,
    );
    markDetail(target, pool.body(pose), pool.shown(pose));
    targets.push(assignParticleIds(target, pose));
  }
  const sky = backgroundStars(pool.sky(0), 0),
    p = program(gl, vertex, fragment),
    saved = program(
      gl,
      snapshotShader(
        vertex,
        'vColor',
        'vOpacity*min(1.,max(vColor.r,max(vColor.g,vColor.b))*2.8)',
        '.32',
        true,
      ),
      fragment,
      true,
    );
  const vao = gl.createVertexArray(),
    buffer = gl.createBuffer(),
    seeds = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, size, offset] of [
    ['aPosition', 3, 0],
    ['aColor', 3, 12],
    ['aNormal', 3, 24],
    ['aEdgeFade', 1, 36],
    ['aHeld', 1, 48],
  ]) {
    const a = gl.getAttribLocation(p, name);
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, size, gl.FLOAT, false, 52, offset);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, seeds);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    Float32Array.from(
      { length: pool.count },
      (_, i) => (i * 0.61803398875) % 1,
    ),
    gl.STATIC_DRAW,
  );
  const attr = gl.getAttribLocation(p, 'aSeed');
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 1, gl.FLOAT, false, 4, 0);
  // Explicit attribute locations keep the snapshot program on the same layout.
  for (const name of [
    'aPosition',
    'aColor',
    'aNormal',
    'aEdgeFade',
    'aHeld',
    'aSeed',
  ]) {
    if (gl.getAttribLocation(saved, name) !== gl.getAttribLocation(p, name))
      throw Error('Chapter snapshot attribute mismatch');
  }
  const drawData = new Float32Array(pool.count * STRIDE),
    skyData = new Float32Array(sky.length),
    shot = stageShot('done', 1),
    camera = portraitCamera(shot.angle, shot.radius, shot.target);
  function bind(pr, pose, seconds, reduced, skyOnly = false, opening = 0) {
    const data = skyOnly ? skyData : drawData,
      source = skyOnly ? sky : targets[pose];
    if (reduced) data.set(source);
    else rotateHeldObjects(source, seconds, data);
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== pr) gl.useProgram(pr);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    for (const name of ['eye', 'right', 'up', 'back'])
      gl.uniform3fv(
        gl.getUniformLocation(pr, 'u' + name[0].toUpperCase() + name.slice(1)),
        camera[name],
      );
    for (const [name, value] of Object.entries({
      uAspect: skyOnly
        ? (canvas.width / canvas.height) * (1 - opening) + opening
        : canvas.width / canvas.height,
      uOpening: skyOnly ? opening : 0,
      uDpr: Math.min(devicePixelRatio, 2),
      uSurface: 1,
      uTime: seconds,
      uTwinkle: reduced ? 0 : 1,
      uPropReveal: 1,
      uPointScale: WIDE_RADIUS / PORTRAIT_SCALE,
    }))
      gl.uniform1f(gl.getUniformLocation(pr, name), value);
    gl.uniform1i(gl.getUniformLocation(pr, 'backgroundOnly'), skyOnly ? 1 : 0);
  }
  return {
    pool,
    targets,
    skyCount: pool.sky(0),
    draw(pose, seconds, reduced, skyOnly = false, opening = 0) {
      bind(p, pose, seconds, reduced, skyOnly, opening);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(!skyOnly);
      gl.drawArrays(gl.POINTS, 0, skyOnly ? pool.sky(0) : pool.count);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
    snapshot(pose, seconds, reduced, skyOnly = false, depthTexture = null) {
      return capture(gl, saved, skyOnly ? pool.sky(0) : pool.count, (pr) => {
        bind(pr, pose, seconds, reduced, skyOnly);
        gl.uniform1i(
          gl.getUniformLocation(pr, 'useSnapshotDepth'),
          depthTexture ? 1 : 0,
        );
        gl.uniform1i(gl.getUniformLocation(pr, 'snapshotDepth'), 3);
        if (depthTexture) {
          gl.activeTexture(gl.TEXTURE3);
          gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        }
        gl.drawArrays(gl.POINTS, 0, skyOnly ? pool.sky(0) : pool.count);
      });
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(seeds);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(p);
      gl.deleteProgram(saved);
    },
  };
}
