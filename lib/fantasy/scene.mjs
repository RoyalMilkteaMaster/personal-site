import { createIntro, introCamera, SCENE_ERROR } from './starlit-intro.mjs';
import { createConstellation } from './starlit-constellation.mjs';
import { cameraFrame } from './camera.mjs';
import { identity, inverse, multiply } from './matrix.mjs';
import { createFantasy } from './renderer.mjs';
import { createLegacy } from './legacy.mjs';
import {
  createPath,
  siteCamera as fitSiteCamera,
  advanceTarget,
  ease,
} from './orbit.mjs';
import { createChapterMorph, expandSnapshot } from '../fantasy-particles.mjs';
// Limit stalls without slowing ordinary low-FPS playback; keep legacy defaults.
export const frameDelta = (seconds, starlit = false) =>
  Math.min(Math.max(0, seconds), starlit ? 0.5 : 0.05);

export function mountFantasyScene(
  canvas,
  commands,
  onError,
  { starlit = false } = {},
) {
  const intro = starlit ? createIntro() : null;
  // The opening reads the current language from the same command object as
  // pose/replay/advance; there is no separate language timeline.
  const starlitError = () => SCENE_ERROR[commands().language] ?? SCENE_ERROR.zh;
  intro?.setLanguage(commands().language);
  let constellation;
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
    // Rendering consumes continuous time; React receives only visible changes.
    const key = JSON.stringify(
      starlit
        ? {
            stage: state.stage,
            readingStep: state.readingStep,
            settled: state.settled,
            language: state.language,
            visibleChars: state.visibleChars,
            canAdvance: state.canAdvance,
            paused: state.paused,
            propReveal: Math.round((state.propReveal ?? 0) * 50),
          }
        : state,
    );
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
    if (intro && phase === 'intro')
      return introCamera(path, intro.state(), canvas.width / canvas.height);
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
      opening: intro && phase === 'intro' ? intro.state().cameraWeights[0] : 0,
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
      morph.draw(t, canvas.width / canvas.height, transform);
      done();
    } else if (active === 0) {
      currentCamera = camera();
      const options = nativeOptions();
      native.draw(currentCamera, {
        ...options,
        // Keep the same close-up face; the original legacy sky orbits behind it.
        background: () => {
          legacy.draw(
            0,
            reduced ? 0 : clock - skyAt,
            reduced,
            true,
            options.opening,
          );
        },
      });
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
      legacy.draw(active, reduced ? 0 : clock - holdAt, reduced);
      done();
    }
    Object.assign(canvas.dataset, {
      phase,
      particleCount: String(count),
      sharedPool: 'true',
      restingCount: String(legacy.pool.rest),
      backgroundCount: String(legacy.pool.sky(active)),
      timeline: time.toFixed(3),
      pose: String(active),
      propReveal: (active === 0 ? nativeOptions().reveal : 1).toFixed(3),
      cameraAngle: currentCamera?.az.toFixed(4) || '',
      geometryBuilds: '1',
    });
  }
  const cleanup = () => {
    native?.dispose();
    legacy?.dispose();
    morph?.dispose();
    constellation?.dispose();
  };
  (async () => {
    legacy = await createLegacy(gl, canvas);
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
    if (starlit) constellation = createConstellation(gl, canvas);
    ready = true;
    replay();
    canvas.dataset.modelSHA256 = native.manifest.sha256;
  })().catch(fail);
  // Local regression controls exercise the actual product renderer, without UI.
  const inspect = {
    snapshot: () => ({
      ready,
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
