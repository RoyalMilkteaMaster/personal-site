// Seconds. User R6 overrides the retired .9-second turn / 2.6-second return.
export const TIMING = Object.freeze({
  type: 0.9,
  wait: 3,
  turn: 0.7,
  propFade: 0.7,
  chapterMorph: 1.25,
});
export const COPY = Object.freeze({
  front: { title: '嗨，我是林品宏。', body: '探索 AI、自動化與系統開發。' },
  back: {
    title: '從好奇，到實作。',
    body: '讓想法走出腦海，成為能被使用的作品。',
  },
});
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
export function blend(a, b, t) {
  return {
    az: mix(a.az, b.az, t),
    el: mix(a.el, b.el, t),
    dist: mix(a.dist, b.dist, t),
    target: a.target.map((x, i) => mix(x, b.target[i], t)),
    roll: mix(a.roll || 0, b.roll || 0, t),
    fov: mix(a.fov || 28, b.fov || 28, t),
  };
}
export function cameraEye(c) {
  const a = (c.az * Math.PI) / 180,
    e = (c.el * Math.PI) / 180;
  return [
    c.target[0] + c.dist * Math.cos(e) * Math.sin(a),
    c.target[1] + c.dist * Math.sin(e),
    c.target[2] + c.dist * Math.cos(e) * Math.cos(a),
  ];
}
// Integrate the eye's actual curved trajectory, including moving focus, changing
// elevation and dolly radius. The small table also removes parameter-speed bias.
function arc(a, b) {
  const steps = 1024,
    lengths = [0];
  let previous = cameraEye(a);
  for (let i = 1; i <= steps; i++) {
    const p = cameraEye(blend(a, b, i / steps));
    lengths.push(
      lengths[i - 1] + Math.hypot(...p.map((x, j) => x - previous[j])),
    );
    previous = p;
  }
  const length = lengths[steps];
  return {
    length,
    parameter(fraction) {
      const d = clamp(fraction) * length;
      let lo = 0,
        hi = steps;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lengths[mid] < d) lo = mid;
        else hi = mid;
      }
      return (lo + (d - lengths[lo]) / (lengths[hi] - lengths[lo])) / steps;
    },
  };
}
export function createPath(alignment) {
  const near = structuredClone(alignment.near),
    wide = { ...structuredClone(alignment.wide), az: alignment.wide.az + 360 };
  const rear = {
    az: 183,
    el: 0,
    dist: 1.18,
    target: [0.035, 0.62, -0.04],
    roll: 0,
    fov: 28,
  };
  const outward = arc(near, rear),
    returning = arc(rear, wide),
    split = (rear.az - near.az) / (wide.az - near.az);
  const frontEnd = TIMING.type + TIMING.wait,
    backStart = frontEnd + TIMING.turn,
    backEnd = backStart + TIMING.type + TIMING.wait;
  const returnDuration = (TIMING.turn * returning.length) / outward.length,
    wideStart = backEnd + returnDuration;
  const timing = Object.freeze({
    ...TIMING,
    frontEnd,
    backStart,
    backEnd,
    return: returnDuration,
    wideStart,
    end: wideStart + TIMING.propFade,
  });
  function path(u) {
    u = clamp(u);
    return u <= split
      ? blend(near, rear, u / split)
      : blend(rear, wide, (u - split) / (1 - split));
  }
  function at(t) {
    t = clamp(t, 0, timing.end);
    let stage, u;
    if (t < timing.frontEnd) {
      stage = 'front';
      u = 0;
    } else if (t < timing.backStart) {
      stage = 'turn-back';
      u = outward.parameter(ease((t - timing.frontEnd) / timing.turn)) * split;
    } else if (t < timing.backEnd) {
      stage = 'back';
      u = split;
    } else if (t < timing.wideStart) {
      stage = 'return';
      u =
        split +
        (1 - split) *
          returning.parameter(ease((t - timing.backEnd) / timing.return));
    } else {
      stage = 'done';
      u = 1;
    }
    const copy = COPY[stage] || null,
      start = stage === 'back' ? timing.backStart : 0;
    return {
      camera: path(u),
      u,
      stage,
      copy,
      visibleChars: copy
        ? Math.ceil(
            (copy.title.length + copy.body.length) *
              clamp((t - start) / timing.type),
          )
        : 0,
      canAdvance: !!copy && t - start >= timing.type,
      propReveal: ease((t - timing.wideStart) / timing.propFade),
    };
  }
  return {
    near,
    rear,
    wide,
    path,
    at,
    split,
    timing,
    travel: {
      frontEyeArc: outward.length,
      backEyeArc: returning.length,
      meanSpeed: outward.length / TIMING.turn,
      metric: 'actual world-space eye arc length',
      easing: 'smoothstep of normalized arc length',
    },
  };
}
export function advanceTarget(t, timing) {
  if (t >= timing.type && t < timing.frontEnd) return timing.frontEnd;
  if (t >= timing.backStart + timing.type && t < timing.backEnd)
    return timing.backEnd;
  return null;
}
export function responsiveCamera(
  c,
  aspect,
  backDistance = 1.14,
  wideDistance = 2.221400400649241,
) {
  const referenceAspect =
    1 +
    (16 / 9 - 1) *
      ease((c.dist - backDistance) / (wideDistance - backDistance));
  const k = Math.max(1, referenceAspect / aspect);
  return {
    ...c,
    target: [...c.target],
    fov: (Math.atan(Math.tan((c.fov * Math.PI) / 360) * k) * 360) / Math.PI,
  };
}
export function siteCamera(path, c, u, aspect) {
  const result = responsiveCamera(c, aspect, path.rear.dist, path.wide.dist);
  const settle = ease((u - path.split) / (1 - path.split)),
    fit = Math.max(1, 0.62 / aspect);
  const wideFov =
    (Math.atan(Math.tan((c.fov * Math.PI) / 360) * fit) * 360) / Math.PI;
  result.fov += (wideFov - result.fov) * settle;
  // Keep the accepted near/wide endpoints and use the entire canvas throughout.
  result.frameScaleY = 1;
  return result;
}
