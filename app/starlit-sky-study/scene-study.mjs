import { introReportKey } from './scene-report.mjs';
import {createBrandCeiling} from './brand-ceiling.mjs';
import { brandSkyCamera,isPureSky,isBrandOpening } from './brand-sky.mjs';
import {endingCupOpacity,cupMotion} from './cup-layout.mjs';
import { createStudyCup } from './cup-renderer.mjs';
import { cupStudyCamera,CUP_CENTER,CUP_SCALE } from './cup-placement.mjs';
import { openingStudyCamera } from './opening-camera.mjs';
import { createVolumeSky } from './volume-sky.mjs';
import { createIntro, introCamera, SCENE_ERROR } from '../../lib/fantasy/starlit-intro.mjs';
import { createConstellation } from '../../lib/fantasy/starlit-constellation.mjs';
import { cameraFrame } from '../../lib/fantasy/camera.mjs';
import { identity, inverse, multiply } from '../../lib/fantasy/matrix.mjs';
import { createFantasy } from './renderer-study.mjs';
import { createLegacy } from './legacy-study.mjs';
import {
  createPath,
  siteCamera as fitSiteCamera,
  advanceTarget,
  ease,
} from '../../lib/fantasy/orbit.mjs';
import { createChapterMorph, expandSnapshot } from '../../lib/fantasy/../fantasy-particles.mjs';
// Limit stalls without slowing ordinary low-FPS playback; keep legacy defaults.
export const frameDelta = (seconds, starlit = false) =>
  Math.min(Math.max(0, seconds), starlit ? 0.5 : 0.05);

export function mountFantasyScene(
  canvas,
  commands,
  onError,
  { starlit = false, brandRevision = false } = {},
) {
  const intro = starlit ? createIntro() : null;
  const sharedSky = brandRevision && canvas.dataset.variant === 'E';
  // The opening reads the current language from the same command object as
  // pose/replay/advance; there is no separate language timeline.
  const starlitError = () => SCENE_ERROR[commands().language] ?? SCENE_ERROR.zh;
  intro?.setLanguage(commands().language);
  let constellation, volumeSky, sparseSky, midpointSky, studyCup, brandCeiling;
  let cupOpacity = 0, cupDrawn = false;
  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
  });
  if (!gl) {
    onError(
      starlit ? starlitError() : '此裝置無法顯示星塵，右側內容仍可正常閱讀。',
    );
    return () => {};
  }
  let disposed = false,
    failed = false,
    frame = 0,
    ready = false,
    visible = true,
    last = 0,
    clock = 0,
    volumeClock = 0,
    skySpeed = 1,
    time = 0,
    propPhase = 0,
    holdAt = 0,
    skyAt = 0,
    active = 0,
    phase = 'loading',
    paused = false;
  let native,
    legacy,
    morph,
    path,
    count = 0,
    currentCamera,
    transition = null,
    resize = true,
    introKey = '',
    seenReadingStep,
    seenReplay = commands().replay,
    seenAdvance = commands().advance;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = starlit ? false : media.matches;
  const report = (state) => {
    if(brandRevision)state={...state,brandIn3D:true};
    // Rendering consumes continuous time; React receives only visible changes.
    const key = starlit ? introReportKey(state,brandRevision) : JSON.stringify(state);
    if (key !== introKey) {
      introKey = key;
      commands().onIntroState(state);
    }
    canvas.dataset.introStage = state.stage;
  };
  const done = () =>
    report(
      intro
        ? intro.state()
        : { stage: 'done', visibleChars: 0, canAdvance: false },
    );
  const fail = (e) => {
    if (failed || disposed) return;
    failed = true;
    cancelAnimationFrame(frame);
    canvas.dataset.phase = 'failed';
    if (intro) {
      intro.fail();
      report(intro.state());
    } else done();
    onError(
      starlit ? starlitError() : '星塵顯示暫時無法啟動，右側內容仍可正常閱讀。',
    );
    console.error(e);
  };
  function advance() {
    if (intro) {
      if (ready && !failed) {
        intro.advance();
        paused = intro.state().paused;
      }
      return;
    }
    if (!ready || phase !== 'intro' || reduced) return;
    const next = advanceTarget(time, path.timing);
    if (next !== null) {
      time = next;
      paused = false;
    }
  }
  function replay() {
    if (!ready) return;
    intro?.replay();
    seenReadingStep = undefined;
    time = reduced ? path.timing.end : 0;
    active = 0;
    propPhase = 0;
    skySpeed = 1;
    phase = reduced ? 'hold' : 'intro';
    holdAt = clock;
    skyAt = clock;
    transition = null;
    paused = false;
  }
  function siteCamera(c, u) {
    return fitSiteCamera(path, c, u, canvas.width / canvas.height);
  }
  function camera() {
    if ((canvas.dataset.variant === 'B' || canvas.dataset.variant === 'D' || canvas.dataset.variant === 'E') && canvas.dataset.external === 'true')
      return { target: [0,.77,.02], dist: canvas.dataset.variant === 'D' ? 10 : canvas.dataset.variant === 'E' ? 8.5 : 7, az: 25, el: 12, roll: 0, fov: 45, frameScaleY: 1 };
    if (intro && phase === 'intro')
      return openingStudyCamera((brandRevision ? brandSkyCamera : cupStudyCamera)(path, intro.state(), canvas.width / canvas.height), brandRevision || canvas.dataset.openingStudy === 'false' ? 0 : intro.state().cameraWeights[0], clock);
    const shot = path.at(time),
      u = shot.u;
    const c = siteCamera(shot.camera, u);
    // A coherent hold transform keeps the true mesh, palm and prop together.
    if (phase === 'hold' && !reduced) {
      const s = clock - holdAt,
        r = ease(s / 0.8);
      c.target[0] -= 0.0016 * Math.sin(s * 0.95) * r;
      c.target[1] -= 0.00275 * Math.sin(s * 0.8) * r;
      c.target[2] -= 0.001 * Math.sin(s * 0.6) * r;
    }
    return c;
  }
  // 內容三姿態共用圖一落點的星空取景；不把背景放進人物morph。
  // 人物仍由各自原renderer與相機繪製，只有背景不隨holdAt重置。
  function skyCamera() {
    return phase === 'intro' ? currentCamera : siteCamera(path.wide, 1);
  }
  function drawSharedSky() {
    midpointSky.draw(skyCamera(), volumeClock);
  }
  function nativeOptions() {
    return {
      time: clock,
      phase: propPhase,
      reveal:
        intro && phase === 'intro'
          ? intro.state().propReveal
          : phase === 'intro'
            ? path.at(time).propReveal
            : 1,
      twinkle: intro
        ? 1
        : phase === 'intro' || reduced
          ? 0
          : ease((clock - holdAt) / 0.8),
      fireTime: intro ? clock : undefined,
      opening: brandRevision ? 0 : (canvas.dataset.variant === 'B' || canvas.dataset.variant === 'D' || canvas.dataset.variant === 'E') && canvas.dataset.external === 'true' ? 0 : intro && phase === 'intro' ? intro.state().cameraWeights[0] : 0,
    };
  }
  function snapshot(pose, atHold = clock - holdAt, target = false) {
    if (pose !== 0)
      return expandSnapshot(legacy.snapshot(pose, atHold, reduced), count);
    const body = native.snapshot(
        target ? siteCamera(path.wide, 1) : currentCamera || camera(),
        target
          ? { time: clock, phase: propPhase, reveal: 1, twinkle: 0 }
          : nativeOptions(),
      ),
      sky = legacy.snapshot(0, target ? 0 : clock - skyAt, reduced, true),
      out = new Float32Array(count * 10);
    // Match native alpha compositing at both chapter-transition endpoints.
    out.set(sky);
    out.set(body, sky.length);
    return out;
  }
  function startMorph(pose) {
    // A remount can receive an already-open chapter before the first draw.
    currentCamera ??= camera();
    const from =
      phase === 'morph'
        ? morph.snapshot(
            (clock - transition.at) / path.timing.chapterMorph,
            canvas.width / canvas.height,
          )
        : snapshot(active);
    const fromNative = active === 0 && phase !== 'morph',
      fromU = path.at(time).u;
    const oldCamera = currentCamera;
    time = path.timing.end;
    currentCamera = camera();
    const to = snapshot(pose, 0, true);
    currentCamera = oldCamera;
    morph.set(from, to, canvas.width / canvas.height);
    transition = {
      at: clock,
      fromU,
      sourceInverse: fromNative
        ? inverse(cameraFrame(oldCamera, canvas).screenM)
        : null,
    };
    phase = 'morph';
    active = pose;
    done();
  }
  const key = (e) => {
    // Starlit scroll/touch/keyboard mapping belongs to the shell (one owner).
    if (starlit) return;
    if (
      e.defaultPrevented ||
      e.repeat ||
      e.target.closest(
        'input,select,button,a,[role="button"],[role="tab"],textarea',
      )
    )
      return;
    if (phase !== 'intro') return;
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      advance();
    } else if (e.key === ' ') {
      e.preventDefault();
      paused = !paused;
      intro?.pause(paused);
    }
  };
  window.addEventListener('keydown', key);
  const lost = (e) => {
    e.preventDefault();
    fail(Error('WebGL context lost'));
  };
  canvas.addEventListener('webglcontextlost', lost);
  const visibilityChanged = () => {
    last = 0;
    intro?.pause(document.hidden || paused);
    if (intro && ready) report(intro.state());
  };
  if (starlit) document.addEventListener('visibilitychange', visibilityChanged);
  const ro = new ResizeObserver(() => {
    resize = true;
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  });
  io.observe(canvas);
  const preference = () => {
    reduced = starlit ? false : media.matches;
    if (reduced && ready) {
      time = path.timing.end;
      phase = 'hold';
      active = commands().pose;
      holdAt = clock;
      transition = null;
      done();
    }
  };
  media.addEventListener('change', preference);
  function render(now) {
    try {
      renderFrame(now);
    } catch (e) {
      fail(e);
    }
  }
  function renderFrame(now) {
    if (disposed || failed) return;
    frame = requestAnimationFrame(render);
    const dt = last ? frameDelta((now - last) / 1000, starlit) : 0;
    last = now;
    if ((!visible && !intro) || document.hidden) return;
    if (resize) {
      resize = false;
      const b = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(b.width * dpr));
      canvas.height = Math.max(1, Math.round(b.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    if (!ready) return;
    if (!intro || !paused) clock += dt;
    const cmd = commands();
    intro?.setLanguage(cmd.language);
    if (seenReplay !== cmd.replay) {
      seenReplay = cmd.replay;
      replay();
    }
    if (intro && seenReadingStep !== cmd.readingStep) {
      seenReadingStep = cmd.readingStep;
      intro.selectStep(cmd.readingStep);
    }
    if (intro && cmd.contentOpen && intro.state().stage !== 'done') {
      intro.openContent();
      time = path.timing.end;
      phase = 'hold';
      holdAt = clock;
      paused = false;
    }
    if (seenAdvance !== cmd.advance) {
      seenAdvance = cmd.advance;
      advance();
    }
    if (reduced) {
      time = path.timing.end;
      phase = 'hold';
      active = cmd.pose;
      transition = null;
      holdAt = clock;
    } else if (
      cmd.pose !== active &&
      (!intro || intro.state().stage === 'done')
    ) {
      startMorph(cmd.pose);
    }
    if (intro && phase === 'intro') {
      intro.tick(dt);
      if (intro.state().stage === 'done') {
        time = path.timing.end;
        phase = 'hold';
        holdAt = clock;
      }
    }
    if (!intro && phase === 'intro' && !paused) {
      time = Math.min(path.timing.end, time + dt);
      if (time >= path.timing.end) {
        phase = 'hold';
        holdAt = clock;
      }
    }
    if (!reduced && !paused && phase !== 'morph') propPhase += dt * 0.55;
    if (
      phase === 'morph' &&
      clock - transition.at >= path.timing.chapterMorph
    ) {
      phase = 'hold';
      holdAt = clock;
      if (active === 0) skyAt = clock;
      transition = null;
    }
    // Integrate speed, never multiply the accumulated angle by a new rate.
    // Follow the body shader's frontloaded smoothstep derivative (98.5% by
    // progress .56), without a second lag filter. Keep the existing peak budget
    // and .025 rad/s axis: this matches timing, not the shader's full orbit.
    if ((canvas.dataset.variant === 'B' || canvas.dataset.variant === 'D' || canvas.dataset.variant === 'E') && canvas.dataset.playing !== 'false') {
      const progress = phase === 'morph' ? (clock - transition.at) / path.timing.chapterMorph : 0;
      const early = progress < 0.56;
      const part = early ? progress / 0.56 : (progress - 0.56) / 0.44;
      const weight = early ? 1 : (0.015 / 0.44) / (0.985 / 0.56);
      const targetSpeed = sharedSky && phase === 'morph'
        ? 1 + 56 * weight * 4 * part * (1 - part) : 1;
      const previousSpeed = skySpeed;
      // Limit only accelerated travel after a stall; ambient time and the
      // camera retain their original dt. Never bank boost time to catch up.
      const boostDt = sharedSky ? Math.min(dt, 0.05) : dt;
      // A retarget snapshots the moving body; retain its sky rate on that
      // same zero-progress frame, then follow the new body progress.
      if (!(sharedSky && phase === 'morph' && progress === 0)) skySpeed = targetSpeed;
      volumeClock += (dt + boostDt * ((previousSpeed + skySpeed) / 2 - 1)) * (canvas.dataset.speed === '3' ? 3 : 1);
    }
    cupOpacity = 0; cupDrawn = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (phase === 'morph') {
      const t = (clock - transition.at) / path.timing.chapterMorph;
      let transform = identity();
      if (transition.sourceInverse) {
        const u = transition.fromU + (1 - transition.fromU) * ease(t);
        currentCamera = siteCamera(path.path(u), u);
        transform = multiply(
          cameraFrame(currentCamera, canvas).screenM,
          transition.sourceInverse,
        );
      }
      if (sharedSky) drawSharedSky();
      morph.draw(t, canvas.width / canvas.height, transform);
      done();
    } else if (active === 0) {
      currentCamera = camera();
      const options = nativeOptions();
      const pureSky = brandRevision && phase === 'intro' && isPureSky(intro.state());
      if (pureSky) midpointSky.draw(currentCamera, volumeClock);
      else native.draw(currentCamera, {
        ...options,
        // Keep the same close-up face; the original legacy sky orbits behind it.
        background: () => {
          if (sharedSky) { drawSharedSky(); return; }
          if ((canvas.dataset.variant === 'B' || canvas.dataset.variant === 'D' || canvas.dataset.variant === 'E')) {
            (canvas.dataset.variant === 'D' ? sparseSky : canvas.dataset.variant === 'E' ? midpointSky : volumeSky).draw(currentCamera, volumeClock);
            return;
          }
          legacy.draw(
            0,
            reduced ? 0 : clock - skyAt,
            reduced,
            true,
            options.opening,
          );
        },
      });
      // The ceiling belongs only to the opening and its transition into the face.
      if (brandRevision && phase === 'intro' && isBrandOpening(intro.state())) brandCeiling.draw(currentCamera, clock, media.matches);
      cupOpacity = studyCup ? (brandRevision && phase === 'intro' ? endingCupOpacity(intro.state()) : 1) : 0;
      if (studyCup && !pureSky && cupOpacity > 0) cupDrawn = studyCup.draw(currentCamera, clock, cupOpacity, media.matches);
      // Cup visibility belongs to the shot, independently of its geometry/model.
      if (constellation) {
        const weights = intro.state().cameraWeights;
        constellation.draw(
          currentCamera,
          clock,
          phase === 'intro' ? weights[3] + weights[4] : 0,
          1,
        );
      }
      if (intro && phase === 'intro') report(intro.state());
      else if (phase === 'intro') {
        const o = path.at(time);
        report({
          stage: o.stage,
          visibleChars: o.visibleChars,
          canAdvance: o.canAdvance,
        });
      } else done();
    } else {
      if (sharedSky) drawSharedSky();
      legacy.draw(active, reduced ? 0 : clock - holdAt, reduced);
      done();
    }
    Object.assign(canvas.dataset, {
      phase,
      particleCount: String(count),
      sharedPool: 'true',
      restingCount: String(legacy.pool.rest),
      backgroundCount: String(sharedSky ? 42500 : legacy.pool.sky(active)),
      timeline: time.toFixed(3),
      pose: String(active),
      propReveal: (active === 0 ? nativeOptions().reveal : 1).toFixed(3),
      cameraAngle: currentCamera?.az.toFixed(4) || '',
      geometryBuilds: '1',
    });
  }
  const cleanup = () => {
    volumeSky?.dispose();
    sparseSky?.dispose();
    midpointSky?.dispose();
    studyCup?.dispose();
    brandCeiling?.dispose();
    native?.dispose();
    legacy?.dispose();
    morph?.dispose();
    constellation?.dispose();
  };
  (async () => {
    volumeSky = createVolumeSky(gl, canvas);
    sparseSky = createVolumeSky(gl, canvas, true);
    midpointSky = createVolumeSky(gl, canvas, 'midpoint');
    if(brandRevision)brandCeiling=await createBrandCeiling(gl,canvas,{cupEnabled:false,catgirlEnabled:false});
    if (!brandRevision) studyCup = await createStudyCup(gl, canvas);
    if (disposed) { cleanup(); return; }
    legacy = await createLegacy(gl, canvas, { separateSky: sharedSky });
    if (disposed) {
      cleanup();
      return;
    }
    native = await createFantasy(gl, canvas);
    if (disposed) {
      cleanup();
      return;
    }
    const r = await fetch('/fantasy/camera-alignment.json');
    if (!r.ok) throw Error('Camera unavailable');
    path = createPath(await r.json());
    if (disposed) {
      cleanup();
      return;
    }
    count = native.count + legacy.skyCount;
    morph = createChapterMorph(gl, count);
    // Opening-only study: no constellation allocated.
    ready = true;
    replay();
    canvas.dataset.modelSHA256 = native.manifest.sha256;
  })().catch(fail);
  // Local regression controls exercise the actual product renderer, without UI.
  const inspect = {
    snapshot: () => ({
      ready,
      brandRevision,
      pureSky: brandRevision && phase === 'intro' && isPureSky(intro.state()),
      intro: intro?.state(),
      failed,
      phase,
      time,
      active,
      reduced,
      clock,
      timing: path?.timing,
      travel: path?.travel,
      skySeconds: reduced ? 0 : clock - skyAt,
      volumeSeconds: volumeClock,
      skySpeed,
      sharedSky: sharedSky && ready ? { kind: 'midpoint', camera: skyCamera(), legacySkyHidden: true } : null,
      studyCup: { ready: Boolean(studyCup), count: studyCup?.count, center: CUP_CENTER, scale: CUP_SCALE, angle: cupMotion(clock,media.matches).angle, opacity: cupOpacity, drawn: cupDrawn, submittedPoints: cupDrawn ? studyCup.count : 0 },
      openingStudy: { enabled: canvas.dataset.openingStudy !== 'false', blueMixFraction: canvas.dataset.openingStudy === 'false' ? 1 : .22, motion: 'target x .00010/y .00014; distance .00015; weighted by opening' },
      holdSeconds: reduced ? 0 : clock - holdAt,
      propPhase,
      camera: currentCamera,
      cameraViewport: currentCamera
        ? cameraFrame(currentCamera, canvas).viewport
        : null,
      count,
      placement: native?.placement,
      glError: gl.getError(),
    }),
    seekStage(stage, seconds = 0) {
      if (!intro || !ready) return;
      intro.seek(stage, seconds);
      active = 0;
      phase = 'intro';
      paused = true;
    },
    resume() {
      paused = false;
      intro?.pause(false);
    },
    seek(t) {
      if (!ready) return;
      time = Math.max(0, Math.min(path.timing.end, t));
      active = 0;
      phase = time === path.timing.end ? 'hold' : 'intro';
      paused = true;
      holdAt = clock;
    },
    advance,
    replay,
  };
  canvas.__fantasy = inspect;
  frame = requestAnimationFrame(render);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    ro.disconnect();
    io.disconnect();
    media.removeEventListener('change', preference);
    window.removeEventListener('keydown', key);
    canvas.removeEventListener('webglcontextlost', lost);
    if (starlit)
      document.removeEventListener('visibilitychange', visibilityChanged);
    cleanup();
    delete canvas.__fantasy;
  };
}

// A stable callback for the full preview; old study and preview mounts opt out.
export function mountBrandScene(canvas,commands,onError,options={}) {
  return mountFantasyScene(canvas,commands,onError,{...options,brandRevision:true});
}
