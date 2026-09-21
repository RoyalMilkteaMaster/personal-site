'use client';

import { Tabs } from '@base-ui/react/tabs';
import { perimeterContact } from '@/lib/ember-ring-contact';
import StarlitContactMilktea from './starlit-contact-milktea';
import { PROJECT_ICONS } from './starlit-project-icons';
import {
  ArrowUpRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  BURN_OVERSHOOT,
  burnContours,
  burnTimeField,
  CHAR_BAND_PX,
  charColour,
  clamp as clampNumber,
  createHeat,
  EMBER_BAND_PX,
  EMBER_BURN_MS,
  EMBER_CLOSE_MS,
  EMBER_FADE_MS,
  EMBER_FIRE_CORE_WARMTH,
  EMBER_FIRE_MS,
  emberDotAlpha,
  emberDotPoint,
  filmClipPath,
  frontBandColour,
  HEAT_COOLING,
  HEAT_STEPS_PER_FRAME,
  heatColour,
  hexToRgb,
  makeEmberDots,
  makeFrontPace,
  makeRng,
  makeSpark,
  paceAt,
  propagateHeat,
  quenchHeat,
  SPARK_MAX,
  SPARK_MIN,
  seedHeat,
  simplifyContour,
  sparkAlpha,
  stepSparks,
  warmRamp,
  type BurnField,
  type EmberDot,
  type EmberRamp,
  type Rgb,
  type Spark,
} from '@/lib/ember-fire';
import {
  EDGE_FLAME_LIFT_PX,
  EDGE_FLAME_MARGIN_PX,
  EDGE_FLAME_REACH_PX,
  EMBER_CARD_RADIUS_PX,
  EMBER_GL_CAPTURE_FLAG,
  EMBER_GL_FRAGMENT_SHADER,
  EMBER_GL_MAX_CONTEXTS,
  EMBER_GL_POINT_FRAGMENT_SHADER,
  EMBER_GL_POINT_VERTEX_SHADER,
  EMBER_GL_VERTEX_SHADER,
  EMBER_RESIZE_THROTTLE_MS,
  EMBER_RING_OUTSET_PX,
  EMBER_RING_PX,
  blendSetup,
  clampGlSize,
  edgeFlameStrength,
  emberGlContextAttributes,
  packBands,
  packBurnField,
  packCard,
  packFlame,
  packFrameUniforms,
  packPoints,
  packRamp,
  packRect,
  type GlPoint,
} from '@/lib/ember-fire-gl';
import {
  cursorGlowSupported,
  glowPoint,
  glowVar,
} from '@/lib/cursor-glow';
import { localizedProjects } from '@/lib/projects';
import { copy, type Language } from '@/lib/site-copy';
import StarlitNebula from './starlit-nebula';
import StarlitNebulaDiagnostic from './starlit-nebula-diagnostic';
import './starlit-shell.css';

export type StarlitSection = {
  value: string;
  label: string;
};

/** Chapter labels of one language; the default keeps the Chinese shell. */
export const starlitSections = (language: Language = 'zh'): StarlitSection[] =>
  copy(language).sections;
export const STARLIT_SECTIONS: StarlitSection[] = starlitSections();

export type StarlitSocial = {
  id: string;
  label: string;
  handle: string;
  href: string;
};

/** Spec R10 fixes these three targets; no redirector or tracking parameters. */
export const STARLIT_SOCIAL: StarlitSocial[] = [
  {
    id: 'github',
    label: 'GitHub',
    handle: 'RoyalMilkteaMaster',
    href: 'https://github.com/RoyalMilkteaMaster',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: 'royal_milktea_master',
    href: 'https://www.instagram.com/royal_milktea_master/',
  },
  {
    id: 'email',
    label: 'Email',
    handle: 'leslie0907@gmail.com',
    href: 'mailto:leslie0907@gmail.com',
  },
  // Ticket 05（使用者 2026-09-19，實作中修訂）：「直接改成把 linkedin 拿掉好了」。
  // 第四個入口（原 Facebook → LinkedIn）整條移除，不換上替代社群。
];

// lucide-react 1.x no longer ships brand glyphs, so the three marks live here.
// GitHub uses the public Octocat outline; the other two are drawn from
// circles and rounded rectangles so every icon fills with `currentColor`.
const SOCIAL_ICON: Record<string, string[]> = {
  github: [
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  ],
  instagram: [
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Z',
    'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    'M17.5 5.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z',
  ],
  email: [
    'M2.5 4.5h19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Zm0 2a.5.5 0 0 0-.5.5v11c0 .28.22.5.5.5h19a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5Z',
    'M3.4 7.6a1 1 0 0 1 1.4-.2L12 12.2l7.2-4.8a1 1 0 1 1 1.1 1.7l-7.7 5.1a1 1 0 0 1-1.1 0L3.6 9a1 1 0 0 1-.2-1.4Z',
  ],
  // Ticket 05：LinkedIn 的標記隨入口一起移除，沒有其他使用者。
};

function SocialIcon({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
    >
      {SOCIAL_ICON[id]?.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * Simplified monochrome cat-ear milk tea cup: ears, lid, body, star mark.
 * public/starlit-brand.svg carries the same outlines for the tab icon; the
 * shell test asserts the two stay in sync.
 */
export const STARLIT_BRAND_PATHS = [
  'M6.2 2.4 9.7 7H4.7Zm11.6 0L19.3 7h-5Z',
  'M3.6 7.2h16.8a1.2 1.2 0 0 1 1.2 1.2v1.4a1.2 1.2 0 0 1-1.2 1.2H3.6a1.2 1.2 0 0 1-1.2-1.2V8.4a1.2 1.2 0 0 1 1.2-1.2Z',
  'M4.6 11.8h14.8l-1.5 7.9a3.1 3.1 0 0 1-3.05 2.5H9.15a3.1 3.1 0 0 1-3.05-2.5Zm7.4 1.9 1.25 2.1 2.1 1.25-2.1 1.25L12 20.4l-1.25-2.1-2.1-1.25 2.1-1.25Z',
];

/**
 * Ticket 36 — which glyph a work link gets, decided from its URL so the data
 * in lib/projects stays untouched: GitHub repos and YouTube demos get their
 * own marks, anything else the plain outward arrow.
 */
/**
 * Ticket 36 — cards per row on the desktop grid. The CSS grid declares the
 * same three columns; the JSX needs the number to place each card and its
 * drawer on explicit rows. Below 850px the CSS resets rows to `auto`, and the
 * DOM order (card, its drawer, next card…) stacks them in one column.
 */
export const SPARK_COLUMNS = 3;

// Ticket 04: the accepted inline icons are keyed by the shared project id.
export const EMBER_ICONS: Record<string, LucideIcon> = PROJECT_ICONS;
export const emberIcon = (id: string): LucideIcon => EMBER_ICONS[id] ?? Sparkles;

/**
 * Ticket 39 v3 — every card burns in its OWN colour. The pool is the star
 * colours the user named (the site's gold and purple first); a project with
 * an entry in EMBER_TINTS gets that, anything else takes the next pool colour
 * by position, so a newly added project is tinted without touching data.
 * Each tint carries four shades: hot core, light, base, deep edge.
 */
export type EmberTint = { name: string; hot: string; light: string; base: string; deep: string };
export const EMBER_TINT_POOL: readonly EmberTint[] = [
  { name: 'gold', hot: '#fff6e0', light: '#f2e2c4', base: '#e0c49d', deep: '#a8804a' },
  { name: 'purple', hot: '#f6efff', light: '#dccbf3', base: '#c0a7e5', deep: '#7f5cb8' },
  { name: 'blue', hot: '#eef4ff', light: '#c2d8ff', base: '#8fb8ff', deep: '#4a78d6' },
  { name: 'pink', hot: '#fff0f9', light: '#f9c9e8', base: '#f3a4d8', deep: '#c85c9e' },
  { name: 'indigo', hot: '#efeeff', light: '#b3b1fa', base: '#7f7cf5', deep: '#4b48b8' },
  { name: 'yellow', hot: '#fffbe8', light: '#fff0bf', base: '#ffe28c', deep: '#c9a640' },
];
export const EMBER_TINTS: Record<string, EmberTint['name']> = {
  'market-council': 'gold',
  cb: 'blue',
  milktea: 'purple',
  'lol-highlights': 'pink',
  'xuerong-clawd': 'indigo',
};
export const emberTint = (id: string, index: number): EmberTint => {
  const named = EMBER_TINTS[id];
  const fromName = named ? EMBER_TINT_POOL.find((t) => t.name === named) : undefined;
  return fromName ?? EMBER_TINT_POOL[index % EMBER_TINT_POOL.length];
};

/**
 * Ticket 41.6 — 燒穿 3.0s、餘燼與火舌再 0.8s 淡出、收回 1.4s. They live in
 * lib/ember-fire.ts with the maths that uses them and are re-exported here
 * because the shell's timers and the tests have always read them off the shell.
 */
export { EMBER_BURN_MS, EMBER_CLOSE_MS, EMBER_FADE_MS, EMBER_FIRE_MS };

/** Half resolution: one cell per 2 CSS px, as Ticket 41.8 requires. */
const EMBER_CELL = 2;
/** Marching squares runs on every 2nd cell (4px nodes) — the tongues survive
 *  and the `d` string stays a few hundred points instead of a few thousand. */
const EMBER_PATH_STEP = 2;
/** The film's own border-radius; the clip path has to carry it or the card
 *  would gain square corners the moment it starts burning. */
const EMBER_FILM_RADIUS = 18;
/** 收回時火舌較小（41.6）：the same fire, cooling faster. */
const EMBER_CLOSE_COOLING = HEAT_COOLING * 1.7;

/** A stable seed per card, so a burn looks the same every time it is filmed. */
export const emberSeed = (id: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100000;
};

export type EmberFireMode = 'burn' | 'close';

/**
 * Ticket 45.5 — the context budget.
 *
 * A WebGL context is a real, scarce resource: browsers drop the oldest one once
 * a page holds too many, and this page already spends one on the 3D opening
 * stage (a `webgl2` context, lib/fantasy/scene.mjs). The fire therefore takes at
 * most three of its own, one per burning card, and a fourth card would quietly
 * draw with the v4 Canvas 2D path instead of costing someone the stage.
 *
 * Every lease is released when the card stops burning — the component unmounts
 * the canvas then, and the cleanup below calls `WEBGL_lose_context.loseContext()`
 * so an idle card really does hold nothing. The counters are published on
 * `window` because that is the only way a harness can prove it: the assertion is
 * that `live` is back to 0 once the fire is gone.
 */
const emberGlBudget = {
  live: 0,
  created: 0,
  released: 0,
  lost: 0,
  max: EMBER_GL_MAX_CONTEXTS,
};

const publishEmberGlBudget = () => {
  if (typeof window === 'undefined') return;
  (window as unknown as { __starlitEmberGl?: typeof emberGlBudget }).__starlitEmberGl = {
    ...emberGlBudget,
  };
};

type EmberGlLease = { gl: WebGLRenderingContext; release: () => void };

/**
 * Ticket 45 Review 3(b) — is anything measuring this page?
 *
 * Off in production, and nothing in the product ever turns it on: a harness
 * sets `window.__starlitEmberCapture = true` with `page.addInitScript`, before
 * any script on the page runs. It buys `preserveDrawingBuffer` (without which
 * a WebGL canvas cannot be screenshotted or copied into a 2D canvas) and the
 * flame-only probe framebuffer. Both are pure measurement and both cost real
 * work on a phone, so they are not there unless someone is looking.
 */
const emberGlCapturing = () =>
  typeof window !== 'undefined' &&
  (window as unknown as Record<string, unknown>)[EMBER_GL_CAPTURE_FLAG] === true;

/**
 * One WebGL1 context for this canvas, or null — null means "use the v4 2D fire",
 * and it is returned for all three reasons that matter: the budget is full, the
 * browser has no WebGL1 at all, or `getContext` threw.
 */
const leaseEmberGl = (canvas: HTMLCanvasElement): EmberGlLease | null => {
  if (emberGlBudget.live >= emberGlBudget.max) return null;
  const options = emberGlContextAttributes(emberGlCapturing());
  let gl: WebGLRenderingContext | null = null;
  try {
    gl =
      (canvas.getContext('webgl', options) as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl', options) as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const context = gl;
  emberGlBudget.live += 1;
  emberGlBudget.created += 1;
  publishEmberGlBudget();
  let done = false;
  return {
    gl: context,
    /**
     * Give the lease back and let the GPU have its memory now rather than
     * whenever the context is collected. This is what makes「靜止時零 context」
     * true, and it is safe here because every caller is abandoning the canvas
     * as well — see the note on the compile-failure path for why abandoning it
     * is not optional.
     */
    release: () => {
      if (done) return;
      done = true;
      emberGlBudget.live -= 1;
      emberGlBudget.released += 1;
      const extension = context.getExtension('WEBGL_lose_context') as
        | { loseContext: () => void }
        | null;
      if (extension) extension.loseContext();
      publishEmberGlBudget();
    },
  };
};

/** Compile and link, or null. A shader that will not build is not an error to
 *  shout about — it is simply a browser that gets the v4 fire. */
const buildEmberGlProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null => {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = vertex ? compile(gl.FRAGMENT_SHADER, fragmentSource) : null;
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

/**
 * Ticket 41 —「像真的在燒」的那一層（方案 B：Canvas 2D）.
 *
 * WHY THE HOLE IS A CLIP PATH AND NOT A BITMAP MASK — the decision the ticket
 * asked to be recorded. The film has to stay real DOM (its icon and its name are
 * a `<button>`'s children, focusable and readable), so the hole has to be cut
 * from OUTSIDE the canvas. The options and what happened to them:
 *
 *   `-webkit-mask-image: -webkit-element(#canvas)` / `element()` — Firefox only;
 *      Blink has never shipped it. Out.
 *   `mask-image: url(canvas.toDataURL())` per frame — a 138×151 PNG encode plus
 *      a CSS parse plus an image decode, three cards over, every frame. Even
 *      throttled to 20fps it is the most expensive thing on the page and the
 *      mask lags the canvas by a frame or two, which shows up as the fire
 *      running ahead of its own hole — v3's worst symptom, back again.
 *   An SVG `<mask>` holding an `<image href={objectURL}>` refreshed at 15–20fps
 *      — same encode, same decode, plus a blob URL to revoke each frame.
 *   Drawing the film itself into the canvas — the ticket forbids it, and rightly:
 *      the name and the icon would stop being text.
 *
 *   ✔ `clip-path: url(#…)` on an SVG `<clipPath clipPathUnits="userSpaceOnUse">`
 *      whose single `<path>`'s `d` is rewritten every frame. The burn front is
 *      already a level set of the burn-time field, so marching squares gives its
 *      outline directly — no bitmap, no encode, no decode, no lag: geometry in,
 *      geometry out, and the film underneath stays exactly the DOM it was. The
 *      path is the card's rounded rectangle with the burned loops punched out of
 *      it under `evenodd`, so unburned islands and undercut tongues come for
 *      free, and `path.isPointInFill()` lets the harness ask the real clip
 *      geometry — not a proxy — whether a given point still has film on it.
 *
 * Everything the canvas paints (char band, ember band, ember dots, the DOOM-fire
 * tongues, the sparks) sits ABOVE the film, and every colour is derived from the
 * card's own `--ember-tint*`, read once with `getComputedStyle` at burn start.
 */
function StarlitEmberFire({
  clipId,
  mode,
  seed,
}: {
  clipId: string;
  mode: EmberFireMode;
  seed: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  /** How much of the film has gone, 0–1. Survives the effect re-running when
   *  `mode` flips mid-burn, which is the whole point — see F2 below. */
  const burnProgress = useRef(1);
  const ringProgress = useRef(0);
  useLayoutEffect(() => {
    ringProgress.current = 0;
    const card = canvasRef.current?.parentElement;
    if (card) { card.dataset.ring = 'false'; card.style.setProperty('--ember-ring-coverage', '0'); }
  }, [mode]);
  const updateRing = useCallback((card: HTMLElement, contours: readonly (readonly number[])[], width: number, height: number) => {
    if (mode !== 'burn' || document.hidden || ringProgress.current === 1) return;
    const contact = perimeterContact(contours, width, height, EMBER_FILM_RADIUS);
    // 取已接觸比例的最大值，避免輪廓簡化／resize 的微小反向跳動。
    ringProgress.current = Math.max(ringProgress.current, contact.fraction);
    if (contact.touched) card.dataset.ring = 'true';
    card.style.setProperty('--ember-ring-coverage', String(ringProgress.current));
  }, [mode]);

  // 41.8 —「prefers-reduced-motion：不掛 canvas，直接切換」. Read once, at mount;
  // this layer only ever exists because of a click, so there is no server render
  // to disagree with.
  const [still] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return true;
    // Review F7 — `clip-path: url(#…)` on an HTML element is the one thing this
    // layer cannot do without, and WebKit's support for it has been partial for
    // years. If the browser will not take the declaration there is no point
    // drawing a fire for a hole that will never appear: fall back to the same
    // instant switch reduced-motion gets. The matching `@supports not (…)` rule
    // in the stylesheet takes the film away so the card still opens.
    // NOT TESTED ON SAFARI — no WebKit available here; this is the safety net,
    // not a verified path.
    return (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      !CSS.supports('clip-path', 'url("#x")') &&
      !CSS.supports('-webkit-clip-path', 'url("#x")')
    );
  });
  /**
   * Ticket 45.3 — which fire is drawing this canvas.
   *
   * The GL effect below runs FIRST and, when it cannot have a context (no
   * WebGL1, the budget is full, the shaders will not compile), sets this so the
   * v4 Canvas 2D effect after it takes the very same canvas over. React runs a
   * component's layout effects in declaration order inside one commit, so the
   * hand-off is synchronous: there is never a painted frame with no fire.
   */
  const glFailed = useRef(false);
  /** A lost context can never be used again and a canvas can never change its
   *  context type, so `webglcontextlost` swaps the canvas ELEMENT (the `key`
   *  below) and the 2D path picks the new one up. */
  const [glBroken, setGlBroken] = useState(false);

  // -------------------------------------------------------------------------
  // Ticket 45 — 方案 C：the flame in a fragment shader.
  //
  // What this effect owns is only「畫火」: the hole, the pace, the clip path, the
  // embers and the sparks are all still v4's (lib/ember-fire.ts, shared with the
  // 2D effect below through `emberFirePlan`). What changes is that the flame is
  // no longer a 2px heat-map lattice scaled up — every pixel evaluates three
  // octaves of FBM against the burn-front distance on its own, and the result is
  // blended additively, so the core adds light instead of being painted on.
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    glFailed.current = true;
    if (still || glBroken) return;
    const canvas = canvasRef.current;
    const path = pathRef.current;
    const card = canvas?.parentElement as HTMLElement | null;
    if (!canvas || !path || !card) return;
    const lease = leaseEmberGl(canvas);
    if (!lease) return;
    const gl = lease.gl;

    const plan = emberFirePlan(card, mode, seed, burnProgress.current);
    const { ramp, char, pace, startNorm, duration } = plan;
    /**
     * Ticket 47 Review F1 — THE CARD'S BOX IS NOT A CONSTANT.
     *
     * Everything below used to be `const`, measured once in this line and never
     * looked at again. Before this ticket that was survivable: the canvas was
     * `inset: 0`, so its box tracked the card whatever the numbers said, and a
     * stale width only stretched the picture a little. Ticket 47 made the
     * shader ask「卡片在哪裡」through `uCard`, and a stale `uCard` is a PHANTOM
     * RECTANGLE: the gate that keeps the rim fire outside the card keeps it
     * outside a card that is not there, and the fire lands on the open face's
     * text.
     *
     * It is not hypothetical. `.starlit-content` animates its width for
     * 1.2–1.7s after the works tab is entered, so a real mouse click 300–800ms
     * in measures a card 99–239px wide instead of 261 (Review F1 measured
     * 141×703 / 221×323 / 281×300 canvases for a 261×260 card, with the whole
     * right-hand band of fire drawn across two lines of the summary). The same
     * root causes the resize-mid-burn case.
     *
     * So the size-dependent half of the plan is `let`, and `applyCardSize`
     * below rebuilds it whenever a ResizeObserver says the card's box moved.
     */
    let { width, height, field, dots, dotReach } = plan;
    let { cols, rows, cell, margin } = field;

    /**
     * Ticket 47 — the canvas reaches `EDGE_FLAME_MARGIN_PX` px past the card on
     * every side, because the flames this ticket adds lick OUTWARD and a canvas
     * that stops at the card's edge has nowhere to put them.
     *
     * ONE canvas, not two: the context budget is three (`EMBER_GL_MAX_CONTEXTS`)
     * and three cards can burn at once, so a second canvas per card for the rim
     * would ask for six. The same fragment shader therefore carries both fires
     * and the card's own rounded rectangle divides them — see `sdCard` in
     * lib/ember-fire-gl.ts.
     *
     * The geometry is written INLINE rather than in the stylesheet on purpose.
     * `.starlit-ember-canvas { inset: 0 }` is pinned by components/starlit-shell
     * .test.ts (Ticket 44-B: the fire must keep the 1px rim the film gives up),
     * and it is also what the v4 2D fire wants — that fire draws a card-sized
     * bitmap and knows nothing about a margin. Writing the inset here means only
     * the path that actually got a WebGL context moves, and the 2D fallback
     * keeps the box it has always had.
     *
     * Review F1 — the numbers are WRITTEN AGAIN every time the card's box moves
     * (`applyCardSize`), because the first version wrote them once from a card
     * that was still growing and left a 141×703 canvas behind.
     *
     * They have to be written, not left to `inset: -20px` alone: a canvas is a
     * REPLACED element, so `width: auto` resolves to its INTRINSIC size (the
     * drawing buffer, 602×600 device px here) and CSS then drops the `right` it
     * cannot honour. Tried it — the element came out 602×600 CSS px, i.e. 321px
     * proud of the card on the right. Explicit width/height with `right`/
     * `bottom: auto` is the only spelling that means "card plus 20 on each side".
     */
    const edgeMargin = EDGE_FLAME_MARGIN_PX;
    // Concentric with the film's 18px: the corner flames need the room.
    canvas.style.borderRadius = `${EMBER_FILM_RADIUS + edgeMargin}px`;

    let glWidth = width + edgeMargin * 2;
    let glHeight = height + edgeMargin * 2;
    // 45.5 — full resolution × DPR, capped at 2× and at 900 device px wide.
    let size = clampGlSize(glWidth, glHeight, window.devicePixelRatio || 1);
    const setCanvasBox = () => {
      canvas.width = size.pixelWidth;
      canvas.height = size.pixelHeight;
      canvas.style.width = `${glWidth}px`;
      canvas.style.height = `${glHeight}px`;
      canvas.style.left = `${-edgeMargin}px`;
      canvas.style.top = `${-edgeMargin}px`;
      canvas.style.right = 'auto';
      canvas.style.bottom = 'auto';
    };
    setCanvasBox();

    const flameProgram = buildEmberGlProgram(gl, EMBER_GL_VERTEX_SHADER, EMBER_GL_FRAGMENT_SHADER);
    const pointProgram = buildEmberGlProgram(
      gl,
      EMBER_GL_POINT_VERTEX_SHADER,
      EMBER_GL_POINT_FRAGMENT_SHADER,
    );
    if (!flameProgram || !pointProgram) {
      /**
       * Review F1 (Major) — the shaders would not build, which is the path an
       * old mobile GPU takes (mediump only, no highp in the fragment shader),
       * and it is the one machine that most needs a fire at all rather than a
       * hole with nothing in it.
       *
       * Handing THIS canvas to the v4 effect does not work, and the reason is
       * wider than the one Review named. It is not only that `loseContext()`
       * poisons the element: a canvas that has successfully given out a WebGL
       * context can NEVER give out a 2D one, lost or not — `getContext('2d')`
       * returns null for the rest of its life. By the time the shaders fail we
       * already hold a live WebGL context on this element, so the only way back
       * to the 2D fire is a NEW element. `glBroken` is exactly that mechanism,
       * already built for `webglcontextlost`: it changes the canvas's `key`, so
       * React mounts a fresh one and the v4 effect draws on it. One commit is
       * lost; the alternative was no fire at all.
       */
      lease.release();
      setGlBroken(true);
      return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(flameProgram, 'aPos');
    const pointBuffer = gl.createBuffer();
    const aPoint = gl.getAttribLocation(pointProgram, 'aPoint');

    // 45.1 — the burn-time field as a texture, so the shader knows the front
    // distance `d = burnTime − threshold` for every pixel it draws.
    //
    // Review F1 — both textures are re-uploaded whenever the card's box moves,
    // so this is a function rather than a straight line of setup. The texture
    // OBJECTS are created once and reused; only their contents and dimensions
    // change, which is what `texImage2D` (rather than `texSubImage2D`) is for.
    let packedField = packBurnField(field);
    let fieldRect = packRect(
      packedField.origin[0],
      packedField.origin[1],
      packedField.span[0],
      packedField.span[1],
    );
    const fieldTexture = gl.createTexture();
    const coarseTexture = gl.createTexture();
    // A flame-ONLY render target on the field's own grid, so whatever is asking
    //「洞上緣之上有沒有火／洞下緣之下有沒有火」reads the shader's own answer at
    // the same cell geometry v4's `flameBuffer` had.
    //
    // Review 3(b): it exists ONLY while something is measuring. In production
    // the flag is off and this texture and framebuffer are never allocated.
    const capturing = emberGlCapturing();
    const probeTexture = capturing ? gl.createTexture() : null;
    const probeTarget = capturing ? gl.createFramebuffer() : null;

    const uploadField = () => {
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE_ALPHA,
        packedField.width,
        packedField.height,
        0,
        gl.LUMINANCE_ALPHA,
        gl.UNSIGNED_BYTE,
        packedField.data,
      );
      // NEAREST, and the shader interpolates for itself. The field is 16-bit
      // across two channels, so the hardware filter cannot be used on it anyway
      // (it would blend a high byte and a low byte separately and fall off a
      // cliff at every high-byte step), and with NEAREST a texel-CENTRE sample
      // returns that texel exactly, whatever the fragment precision is.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // The same field again, one byte per cell and hardware-filtered, for the
      // flame's twenty-tap march downward: it needs smoothness, not precision,
      // and four taps twenty times over is not a bill a phone should pay.
      gl.bindTexture(gl.TEXTURE_2D, coarseTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE,
        packedField.width,
        packedField.height,
        0,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        packedField.coarse,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (probeTexture && probeTarget) {
        gl.bindTexture(gl.TEXTURE_2D, probeTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, probeTarget);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          probeTexture,
          0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    };
    uploadField();

    const rampPack = packRamp(ramp);
    const at3 = (n: number) => rampPack.subarray(n, n + 3);
    const bandsPack = packBands();
    const flamePack = packFlame();
    // Ticket 47 — the quad now covers the card PLUS its margin, in the card's
    // own coordinates: `(-20, -20)` to `(width + 20, height + 20)`. Everything
    // else in this file is already in card coordinates and needs no change,
    // and the burn-time field's own reader clamps, so the extra area reads as
    //「永遠不燒」and the burn paints nothing there.
    let cardRect = packRect(-edgeMargin, -edgeMargin, glWidth, glHeight);
    let cardPack = packCard(width, height);
    const blend = blendSetup();
    const u = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
    const flameUniforms = {
      rect: u(flameProgram, 'uRect'),
      field: u(flameProgram, 'uField'),
      fieldMap: u(flameProgram, 'uFieldMap'),
      fieldCoarse: u(flameProgram, 'uFieldCoarse'),
      fieldScale: u(flameProgram, 'uFieldScale'),
      fieldSize: u(flameProgram, 'uFieldSize'),
      bands: u(flameProgram, 'uBands'),
      flame: u(flameProgram, 'uFlame'),
      hot: u(flameProgram, 'uHot'),
      light: u(flameProgram, 'uLight'),
      base: u(flameProgram, 'uBase'),
      deep: u(flameProgram, 'uDeep'),
      char: u(flameProgram, 'uChar'),
      threshold: u(flameProgram, 'uThreshold'),
      time: u(flameProgram, 'uTime'),
      fade: u(flameProgram, 'uFade'),
      seed: u(flameProgram, 'uSeed'),
      flameOnly: u(flameProgram, 'uFlameOnly'),
      card: u(flameProgram, 'uCard'),
      edge: u(flameProgram, 'uEdge'),
    };
    const pointUniforms = {
      size: u(pointProgram, 'uSize'),
      scale: u(pointProgram, 'uScale'),
      hot: u(pointProgram, 'uHot'),
      fade: u(pointProgram, 'uFade'),
    };

    let sparks: Spark[] = [];
    let livePoints: GlPoint[] = [];
    let dotPoints: { i: number; x: number; y: number; alpha: number }[] = [];
    let contours: number[][] = [];
    let frames = 0;
    let liveFrames = 0;
    let totalWork = 0;
    let worstWork = 0;
    const workLog: number[] = [];
    let threshold = 0;
    let fade = 1;
    /** Ticket 47 — `uEdge`. Declared up here for the same reason `fade` is:
     *  `render` sets it and `drawPass` reads it. */
    let edgeStrength = 0;
    let elapsedAt = 0;
    let raf = 0;
    let paused = false;
    let lost = false;
    const startedAt = performance.now();
    let previous = startedAt;
    // Measurement state. Declared up here because `render` clears the cache and
    // `render` runs before the first frame is even scheduled.
    let probe: {
      top: number;
      bottom: number;
      cells: number;
      canvas: HTMLCanvasElement;
    } | null = null;
    let probeCanvas: HTMLCanvasElement | null = null;
    let readbackCanvas: HTMLCanvasElement | null = null;
    /** Ticket 47 — the whole canvas, margin included. See `readbackFull`. */
    let fullCanvas: HTMLCanvasElement | null = null;

    /**
     * Ticket 47 Review F1 — put every size-dependent number back in step with
     * the card's CURRENT box, and say whether anything moved.
     *
     * What has to follow the card, and why each one:
     *   · the drawing buffer — the element's box is `inset: -20px`, so it is
     *     already right; the buffer is what decides whether the picture is
     *     stretched into it.
     *   · `uCard` — the gate that keeps the rim fire off the open face. This is
     *     the one whose staleness Review F1 photographed.
     *   · `uRect` — the card-space rectangle the quad covers, hence the mapping
     *     from every fragment to card coordinates.
     *   · the burn-time FIELD, both textures and the probe target — the hole
     *     is a level set of that field, and `filmClipPath` scales it by the very
     *     width/height being corrected here, so the DOM clip path follows too.
     *   · the ember dots and their reach, which are placed in card coordinates.
     *
     * What deliberately does NOT follow: `pace`, `startNorm`, `duration` and the
     * ramp. Re-running `emberFirePlan` would recompute those, and on a close
     * that would restart the draw-back's clock against an `elapsed` that keeps
     * running — the card would take 1.4s from wherever it had got to, every
     * time the window moved a pixel.
     */
    const applyCardSize = (): boolean => {
      const rect = card.getBoundingClientRect();
      const nextWidth = Math.max(60, Math.round(rect.width));
      const nextHeight = Math.max(60, Math.round(rect.height));
      if (nextWidth === width && nextHeight === height) return false;
      width = nextWidth;
      height = nextHeight;
      glWidth = width + edgeMargin * 2;
      glHeight = height + edgeMargin * 2;
      size = clampGlSize(glWidth, glHeight, window.devicePixelRatio || 1);
      setCanvasBox();
      cardRect = packRect(-edgeMargin, -edgeMargin, glWidth, glHeight);
      cardPack = packCard(width, height);
      field = burnTimeField(width, height, EMBER_CELL, seed);
      ({ cols, rows, cell, margin } = field);
      packedField = packBurnField(field);
      fieldRect = packRect(
        packedField.origin[0],
        packedField.origin[1],
        packedField.span[0],
        packedField.span[1],
      );
      uploadField();
      dots = makeEmberDots(plan.rng, field);
      dotReach = Math.hypot(width, height) / 2 + EMBER_BAND_PX;
      // The measurement canvases are sized from cols/rows and the card, so they
      // have to be thrown away rather than reused at the wrong size.
      probeCanvas = null;
      readbackCanvas = null;
      fullCanvas = null;
      probe = null;
      resizes += 1;
      return true;
    };

    /**
     * …and the thing that calls it. A `ResizeObserver` on the card fires for
     * every frame of `.starlit-content`'s 1.2–1.7s width animation, and
     * rebuilding the burn field seventy times would cost more than the fire
     * itself, so the work is throttled to `EMBER_RESIZE_THROTTLE_MS` with a
     * trailing call so the LAST size is never the one that gets dropped.
     * The first observation (which the API always delivers) is applied at once.
     */
    let lastResizeAt = 0;
    let resizeTimer = 0;
    let resizes = 0;
    const onCardResize = () => {
      if (lost) return;
      const now = performance.now();
      const since = now - lastResizeAt;
      if (since >= EMBER_RESIZE_THROTTLE_MS) {
        lastResizeAt = now;
        if (applyCardSize() && paused) render(elapsedAt, 0);
        return;
      }
      if (resizeTimer) return;
      resizeTimer = window.setTimeout(() => {
        resizeTimer = 0;
        lastResizeAt = performance.now();
        // `paused` is the harness's frozen frame: nothing is going to redraw on
        // its own, so a resize has to redraw itself or the measurement would be
        // taken from the previous size's pixels.
        if (applyCardSize() && paused) render(elapsedAt, 0);
      }, EMBER_RESIZE_THROTTLE_MS - since);
    };
    const cardObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(onCardResize) : null;

    const drawPass = (flameOnly: boolean) => {
      if (lost) return;
      if (flameOnly && !probeTarget) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, flameOnly ? probeTarget : null);
      gl.viewport(0, 0, flameOnly ? cols : size.pixelWidth, flameOnly ? rows : size.pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // 45.1「加色混合」— the shader writes premultiplied alpha and may push the
      // rgb past it, so this one call is what makes the core read white-hot.
      gl.enable(blend.cap);
      gl.blendFunc(blend.src, blend.dst);

      gl.useProgram(flameProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(flameUniforms.rect, flameOnly ? fieldRect : cardRect);
      gl.uniform4fv(flameUniforms.field, fieldRect);
      gl.uniform1f(flameUniforms.fieldScale, packedField.scale);
      gl.uniform2f(flameUniforms.fieldSize, packedField.width, packedField.height);
      gl.uniform3fv(flameUniforms.bands, bandsPack);
      gl.uniform3fv(flameUniforms.flame, flamePack);
      gl.uniform3fv(flameUniforms.hot, at3(0));
      gl.uniform3fv(flameUniforms.light, at3(3));
      gl.uniform3fv(flameUniforms.base, at3(6));
      gl.uniform3fv(flameUniforms.deep, at3(9));
      gl.uniform3fv(flameUniforms.char, at3(12));
      const frame = packFrameUniforms({
        threshold,
        seconds: elapsedAt / 1000,
        // The probe is a measurement, not a picture: it is never faded, so what
        // it reports is the flame itself and not the 0.8s tail.
        fade: flameOnly ? 1 : fade,
        seed,
        flameOnly,
      });
      gl.uniform1f(flameUniforms.threshold, frame[0]);
      gl.uniform1f(flameUniforms.time, frame[1]);
      gl.uniform1f(flameUniforms.fade, frame[2]);
      gl.uniform1f(flameUniforms.seed, frame[3]);
      gl.uniform1f(flameUniforms.flameOnly, frame[4]);
      gl.uniform4fv(flameUniforms.card, cardPack);
      // Ticket 47 — never on the probe pass. `flameBuffer` is what every
      // measurement of「火舌」reads, and it must stay the BURN's flame alone:
      // the rim flames live outside the card, the probe's grid extends past the
      // card by the field's margin, and counting them there would silently
      // change every number Ticket 45 pinned.
      gl.uniform1f(flameUniforms.edge, flameOnly ? 0 : edgeStrength);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.uniform1i(flameUniforms.fieldMap, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, coarseTexture);
      gl.uniform1i(flameUniforms.fieldCoarse, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 餘燼點與火星 as point sprites, on the same context: one canvas, one
      // context per card. Their motion is still v4's, on the CPU.
      if (!flameOnly && livePoints.length) {
        gl.useProgram(pointProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, packPoints(livePoints), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(aPoint);
        gl.vertexAttribPointer(aPoint, 4, gl.FLOAT, false, 0, 0);
        // Ticket 47 — the point shader maps `x / uSize.x` straight to clip
        // space, so with the canvas now larger than the card it is handed the
        // CANVAS's span; the points themselves were already shifted into the
        // canvas's frame when they were collected in `render`. Doing it on the
        // CPU rather than adding a `uOrigin` keeps both point shaders byte for
        // byte what Ticket 45 shipped.
        gl.uniform2f(pointUniforms.size, glWidth, glHeight);
        gl.uniform1f(pointUniforms.scale, size.dpr);
        gl.uniform3fv(pointUniforms.hot, at3(0));
        gl.uniform1f(pointUniforms.fade, fade);
        gl.drawArrays(gl.POINTS, 0, livePoints.length);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const render = (elapsed: number, dt: number, draw = true) => {
      const began = performance.now();
      elapsedAt = elapsed;
      const progress =
        mode === 'close'
          ? 1 - clampNumber(elapsed / duration, 0, 1)
          : clampNumber(elapsed / duration, 0, 1);
      const norm = startNorm * paceAt(pace, progress);
      threshold = field.max * BURN_OVERSHOOT * norm;
      burnProgress.current = norm;
      fade =
        mode === 'close' ? 1 : clampNumber(1 - (elapsed - EMBER_BURN_MS) / EMBER_FADE_MS, 0, 1);
      // Ticket 48 — 轉場期間不畫外側火焰：這個值現在恆為 0（edgeFlameStrength）。
      edgeStrength = edgeFlameStrength(mode, elapsed);

      // ① the hole — unchanged from v4: the level set of the burn-time field,
      //    straight into the film's clip path. The shader never touches it.
      contours = burnContours(field, threshold, EMBER_PATH_STEP).map((loop) =>
        simplifyContour(loop),
      );
      path.setAttribute('d', filmClipPath(contours, width, height, EMBER_FILM_RADIUS));
      updateRing(card, contours, width, height);

      // ② the embers — the same fixed dots as v4, riding their own ray.
      dotPoints = [];
      livePoints = [];
      for (let n = 0; n < dots.length; n += 1) {
        const dot = dots[n];
        const spot = emberDotPoint(field, threshold, dot, dotReach);
        if (spot.x < 0 || spot.x > width || spot.y < 0 || spot.y > height) continue;
        const alpha = emberDotAlpha(dot, elapsed);
        dotPoints.push({ i: n, x: spot.x, y: spot.y, alpha });
        // Ticket 47 — `dotPoints` stays in CARD coordinates (it is what the
        // snapshot reports and what every existing measurement reads);
        // `livePoints` is the draw list, so it moves into the canvas's frame.
        livePoints.push({ x: spot.x + edgeMargin, y: spot.y + edgeMargin, size: dot.size, alpha });
      }

      // ③ 火星 — thrown from the front. The front is the contour we just built,
      //    which is the same set of points v4 collected cell by cell.
      sparks = stepSparks(sparks, dt);
      if (contours.length && progress > 0 && progress < 1) {
        const want = SPARK_MIN + Math.floor(plan.rng() * (SPARK_MAX - SPARK_MIN + 1));
        let guard = 0;
        while (sparks.length < want && guard < 40) {
          guard += 1;
          const loop = contours[Math.floor(plan.rng() * contours.length)];
          const k = Math.floor((plan.rng() * loop.length) / 2) * 2;
          const x = loop[k];
          const y = loop[k + 1];
          if (x < 0 || x > width || y < 0 || y > height) continue;
          sparks.push(makeSpark(plan.rng, x, y, Math.atan2(y - height / 2, x - width / 2)));
        }
      }
      for (const s of sparks) {
        // Ticket 47 — a spark that has flown off the card is not drawn.
        //
        // It used to be clipped by the canvas itself (card-sized, and rounded by
        // `border-radius: 18px`), so this is Ticket 45's behaviour restored, not
        // a new rule: now that the canvas reaches 20px further out, an unclipped
        // spark would suddenly appear in a margin that exists for the rim flames
        // alone — and, being a 4-device-pixel sprite, it would be the one thing
        // in that margin that CAN be cut square at the canvas's edge. Same test
        // the ember dots already use, a few lines up.
        if (s.x < 0 || s.x > width || s.y < 0 || s.y > height) continue;
        livePoints.push({
          x: s.x + edgeMargin,
          y: s.y + edgeMargin,
          size: s.size,
          alpha: sparkAlpha(s) * 0.9,
        });
      }

      probe = null;
      if (draw) drawPass(false);
      frames += 1;
      return performance.now() - began;
    };

    const ENDS = mode === 'close' ? duration : EMBER_BURN_MS + EMBER_FADE_MS;

    const tick = (now: number) => {
      if (paused || lost) return;
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const elapsed = now - startedAt;
      const spent = render(elapsed, dt);
      liveFrames += 1;
      totalWork += spent;
      if (spent > worstWork) worstWork = spent;
      if (workLog.length < 600) workLog.push(spent);
      if (elapsed < ENDS) raf = requestAnimationFrame(tick);
    };

    tick(startedAt);
    // Review F1 — from here on the card's box owns the geometry, not the one
    // measurement this effect opened with. The first observation arrives
    // immediately and is applied immediately, which is what corrects a fire lit
    // in the middle of `.starlit-content`'s width animation.
    cardObserver?.observe(card);

    // --- measurement only, below this line ---------------------------------
    /** Render the flame ALONE onto the field's grid and read it back, so a
     *  measurement of「火」cannot accidentally count an ember dot or a spark. */
    const readProbe = () => {
      if (probe) return probe;
      if (!probeTarget) {
        // Nothing is measuring, so there is no probe buffer to read. An empty
        // one keeps every caller's shape the same.
        if (!probeCanvas) {
          probeCanvas = document.createElement('canvas');
          probeCanvas.width = cols;
          probeCanvas.height = rows;
        }
        probe = { top: 0, bottom: 0, cells: 0, canvas: probeCanvas };
        return probe;
      }
      drawPass(true);
      const pixels = new Uint8Array(cols * rows * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, probeTarget);
      gl.readPixels(0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!probeCanvas) {
        probeCanvas = document.createElement('canvas');
        probeCanvas.width = cols;
        probeCanvas.height = rows;
      }
      const ctx = probeCanvas.getContext('2d');
      let top = Number.POSITIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      let cells = 0;
      if (ctx) {
        const image = ctx.createImageData(cols, rows);
        for (let j = 0; j < rows; j += 1) {
          // readPixels hands back the BOTTOM row first; the card's rows run the
          // other way, and every y below is a card y.
          const source = (rows - 1 - j) * cols * 4;
          const target = j * cols * 4;
          const y = j * cell + cell / 2 - margin;
          const inCard = y >= 0 && y <= height;
          for (let i = 0; i < cols; i += 1) {
            const a = pixels[source + i * 4 + 3];
            image.data[target + i * 4] = pixels[source + i * 4];
            image.data[target + i * 4 + 1] = pixels[source + i * 4 + 1];
            image.data[target + i * 4 + 2] = pixels[source + i * 4 + 2];
            image.data[target + i * 4 + 3] = a;
            if (a > 10 && inCard) {
              cells += 1;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }
        ctx.putImageData(image, 0, 0);
      }
      probe = {
        top: cells ? top : 0,
        bottom: cells ? bottom : 0,
        cells,
        canvas: probeCanvas,
      };
      return probe;
    };

    /** The hole's bounds, on the same grid and by the same rule as v4 — scanned
     *  only when something asks, because the GPU no longer needs the loop. */
    const measureHole = () => {
      const time = field.time;
      let left = Number.POSITIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      let cells = 0;
      for (let j = 0; j < rows; j += 1) {
        const y = j * cell + cell / 2 - margin;
        if (y < 0 || y > height) continue;
        for (let i = 0; i < cols; i += 1) {
          const x = i * cell + cell / 2 - margin;
          if (x < 0 || x > width) continue;
          if (time[j * cols + i] >= threshold) continue;
          cells += 1;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      return cells
        ? { left, top, right, bottom, cells }
        : { left: 0, top: 0, right: 0, bottom: 0, cells: 0 };
    };

    const seek = (ms: number) => {
      paused = true;
      cancelAnimationFrame(raf);
      sparks = [];
      plan.reseed();
      const step = 1000 / 60;
      // The shader is a pure function of (time, threshold), so only the CPU side
      // — the sparks — has to be replayed; the single draw at the end is the
      // whole truth about that millisecond.
      for (let t = 0; t <= ms + 1e-6; t += step)
        render(Math.min(t, ms), step / 1000, t + step > ms + 1e-6);
      return ms;
    };

    const debug = {
      snapshot: () => {
        const sorted = [...workLog].sort((a, b) => a - b);
        const hole = measureHole();
        const flame = readProbe();
        return {
          fire: 'gl' as const,
          // Review 3(b) — is the measurement machinery on? A harness that gets
          // `false` here is reading a canvas with no preserved drawing buffer
          // and no probe framebuffer, and every pixel number it takes is a lie.
          capture: capturing,
          mode,
          seed,
          frames,
          paused,
          size: { width, height, cols, rows, cell, margin, dpr: size.dpr },
          /**
           * Ticket 47 — everything the edge flames need, in numbers:
           * `origin` is the card coordinate of the canvas's device pixel (0, 0)
           * (so `deviceX = (cardX − origin[0]) · dpr` on `readbackFull`),
           * `span` is the canvas in CSS px, `strength` is `uEdge` right now,
           * and `ring` carries the 5px the stylesheet is supposed to be drawing.
           */
          edge: {
            marginPx: edgeMargin,
            reachPx: EDGE_FLAME_REACH_PX,
            liftPx: EDGE_FLAME_LIFT_PX,
            radiusPx: EMBER_CARD_RADIUS_PX,
            origin: [-edgeMargin, -edgeMargin] as [number, number],
            span: [glWidth, glHeight] as [number, number],
            strength: edgeStrength,
            ringPx: EMBER_RING_PX,
            ringOutsetPx: EMBER_RING_OUTSET_PX,
            /** Review F1 — how many times the card's box has been put back in
             *  step since this fire was lit, and how often that is allowed. A
             *  harness that lights a card mid-animation should see this > 0. */
            resizes,
            throttleMs: EMBER_RESIZE_THROTTLE_MS,
          },
          elapsed: paused ? elapsedAt : performance.now() - startedAt,
          threshold,
          maxTime: field.max,
          corners: field.corners,
          hole,
          flame: { top: flame.top, bottom: flame.bottom, cells: flame.cells },
          sparks: sparks.length,
          dots: dotPoints.map((d) => ({
            i: d.i,
            x: Math.round(d.x * 10) / 10,
            y: Math.round(d.y * 10) / 10,
            alpha: Math.round(d.alpha * 100) / 100,
          })),
          dotsDeclared: dots.length,
          progress: burnProgress.current,
          startNorm,
          duration,
          warmth: EMBER_FIRE_CORE_WARMTH,
          charBand: CHAR_BAND_PX,
          emberBand: EMBER_BAND_PX,
          gl: { ...emberGlBudget },
          ramp: { hot: ramp.hot, light: ramp.light, base: ramp.base, deep: ramp.deep, char },
          work: {
            frames: liveFrames,
            avgMs: liveFrames ? totalWork / liveFrames : 0,
            maxMs: worstWork,
            p95Ms: sorted.length
              ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
              : 0,
          },
        };
      },
      /** The flame layer alone, on the field's grid: row j is card y =
       *  j*cell + cell/2 − margin, exactly as v4's buffer was. */
      get flameBuffer() {
        return readProbe().canvas;
      },
      /**
       * A 2D context holding a copy of what is on screen. A WebGL canvas has no
       * `getContext('2d')`, so anything that wants the fire's PIXELS has to copy
       * it out; `preserveDrawingBuffer` is what makes the copy valid.
       *
       * Ticket 47 — it stays CARD-ALIGNED: device pixel (0, 0) is card (0, 0)
       * and the copy is the card's size, exactly as it was when the canvas was
       * the card's size. The canvas is now `EDGE_FLAME_MARGIN_PX` px bigger on
       * every side, so the copy is taken at a negative offset. Every pixel
       * measurement Tickets 41/43/44/45/46 take goes through here with
       * `Math.round(cardX * dpr)`, and moving the origin under them would have
       * shifted all of them by 20 px without a single assertion noticing.
       * 舔邊火 is outside the card, so it is read through `readbackFull` below.
       */
      readback: () => {
        if (!readbackCanvas) readbackCanvas = document.createElement('canvas');
        readbackCanvas.width = Math.max(1, Math.round(width * size.dpr));
        readbackCanvas.height = Math.max(1, Math.round(height * size.dpr));
        const ctx = readbackCanvas.getContext('2d');
        if (!ctx) return null;
        ctx.clearRect(0, 0, readbackCanvas.width, readbackCanvas.height);
        ctx.drawImage(canvas, -edgeMargin * size.dpr, -edgeMargin * size.dpr);
        return ctx;
      },
      /**
       * Ticket 47 — the WHOLE canvas, margin and all, for anything measuring
       * the edge flames. Device pixel (0, 0) is card (−EDGE_FLAME_MARGIN_PX,
       * −EDGE_FLAME_MARGIN_PX); `snapshot().edge.origin` says so in numbers so a
       * harness never has to assume it.
       */
      readbackFull: () => {
        if (!fullCanvas) fullCanvas = document.createElement('canvas');
        fullCanvas.width = canvas.width;
        fullCanvas.height = canvas.height;
        const ctx = fullCanvas.getContext('2d');
        if (!ctx) return null;
        ctx.clearRect(0, 0, fullCanvas.width, fullCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        return ctx;
      },
      filmAt: (x: number, y: number) => path.isPointInFill(new DOMPoint(x, y)),
      seek,
    };
    (canvas as unknown as { __starlitEmber?: typeof debug }).__starlitEmber = debug;
    canvas.dataset.fire = 'gl';
    canvas.classList.add('starlit-ember-gl');
    glFailed.current = false;

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      emberGlBudget.lost += 1;
      cancelAnimationFrame(raf);
      lease.release();
      // 45.3 — a lost context falls back to the v4 fire on a fresh canvas.
      setGlBroken(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      // Review F1 — the observer and its trailing timer go with the fire, or a
      // card that resizes after the burn would rebuild a field nobody draws.
      cardObserver?.disconnect();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      canvas.removeEventListener('webglcontextlost', onLost);
      delete (canvas as unknown as { __starlitEmber?: typeof debug }).__starlitEmber;
      canvas.classList.remove('starlit-ember-gl');
      delete canvas.dataset.fire;
      if (!lost) {
        gl.deleteTexture(fieldTexture);
        gl.deleteTexture(coarseTexture);
        if (probeTexture) gl.deleteTexture(probeTexture);
        if (probeTarget) gl.deleteFramebuffer(probeTarget);
        gl.deleteBuffer(quad);
        gl.deleteBuffer(pointBuffer);
        gl.deleteProgram(flameProgram);
        gl.deleteProgram(pointProgram);
      }
      // 45.5「靜止時零 context」— the lease goes back the moment the card stops
      // burning, which is when this component unmounts.
      lease.release();
    };
  }, [mode, seed, still, glBroken, updateRing]);

  useLayoutEffect(() => {
    if (still) return;
    // Ticket 45.3 — the GL effect above owns the canvas unless it said it could
    // not; this is v4, kept whole, as the fallback.
    if (!glFailed.current) return;
    const canvas = canvasRef.current;
    const path = pathRef.current;
    const card = canvas?.parentElement as HTMLElement | null;
    if (!canvas || !path || !card) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Everything that is NOT the drawing — the card's size, its four tints, the
    // burn-time field, the pace, the draw-back's starting point, the embers and
    // the seeded rng — is shared with the GL path (`emberFirePlan`, below), so
    // the two fires cannot drift apart on the hole, the tempo or the colour.
    const plan = emberFirePlan(card, mode, seed, burnProgress.current);
    const {
      width,
      height,
      ramp,
      char,
      field,
      pace,
      cooling,
      startNorm,
      duration,
      dots,
      dotReach,
      rng,
      reseed,
    } = plan;
    const { cols, rows, cell, margin, time } = field;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const heat = createHeat(cols, rows, cell);

    // Half-resolution offscreens: one device pixel per 2px cell, drawn once,
    // scaled up by the GPU. Painting the cells one fillRect at a time was the
    // other way and it is ~8000 draw calls a frame per card.
    // Two of them, because the flames and the bands want opposite scaling —
    // see the note in `render`.
    const makeBuffer = () => {
      const c = document.createElement('canvas');
      c.width = cols;
      c.height = rows;
      return c;
    };
    const flameBuffer = makeBuffer();
    const bandBuffer = makeBuffer();
    const flameCtx = flameBuffer.getContext('2d');
    const bandCtx = bandBuffer.getContext('2d');
    if (!flameCtx || !bandCtx) return;
    const flameImage = flameCtx.createImageData(cols, rows);
    const bandImage = bandCtx.createImageData(cols, rows);
    const flamePixels = flameImage.data;
    const bandPixels = bandImage.data;

    let dotPoints: { i: number; x: number; y: number; alpha: number }[] = [];

    let sparks: Spark[] = [];
    let frames = 0;
    let liveFrames = 0;
    let totalWork = 0;
    let worstWork = 0;
    const workLog: number[] = [];
    let threshold = 0;
    let at = 0;
    let hole = { left: 0, top: 0, right: 0, bottom: 0, cells: 0 };
    let flame = { top: 0, bottom: 0, cells: 0 };
    let raf = 0;
    let paused = false;
    const startedAt = performance.now();
    let previous = startedAt;

    const cellX = (k: number) => (k % cols) * cell + cell / 2 - margin;
    const cellY = (k: number) => Math.floor(k / cols) * cell + cell / 2 - margin;

    const render = (elapsed: number, dt: number) => {
      const began = performance.now();
      at = elapsed;
      const u =
        mode === 'close'
          ? 1 - clampNumber(elapsed / duration, 0, 1)
          : clampNumber(elapsed / duration, 0, 1);
      // `startNorm` is 1 for a burn, so this is the plain `thresholdAt` there;
      // for a draw-back it scales the same irregular pace down to the part of
      // the film that had actually gone (F2).
      const norm = startNorm * paceAt(pace, u);
      threshold = field.max * BURN_OVERSHOOT * norm;
      burnProgress.current = norm;
      // 41.6 — the 0.8s tail: the front has stopped, the embers and the tongues
      // die down rather than being cut off.
      const fade =
        mode === 'close'
          ? 1
          : clampNumber(1 - (elapsed - EMBER_BURN_MS) / EMBER_FADE_MS, 0, 1);

      // ① the hole — the level set of the burn-time field, straight into the
      //    film's clip path.
      const contours = burnContours(field, threshold, EMBER_PATH_STEP).map((loop) => simplifyContour(loop));
      path.setAttribute('d', filmClipPath(contours, width, height, EMBER_FILM_RADIUS));
      updateRing(card, contours, width, height);

      // ③ the tongues — re-light the front, then step the heat upward. Two
      //    steps a frame, not one: the burning front itself climbs at nearly
      //    one cell a frame, so a single step left the flames barely clearing
      //    their own source (8px measured, against the ticket's 16–40).
      seedHeat(heat, field, threshold, rng);
      for (let s = 0; s < HEAT_STEPS_PER_FRAME; s += 1) propagateHeat(heat, rng, cooling);
      quenchHeat(heat, field, threshold);

      // ② + ④ — one pass over the half-res grid, writing into TWO buffers.
      //
      // Review F1 (Major): the flames used to be composited ON TOP of the band
      // colours, and `propagateHeat` spreads heat a cell sideways as it rises,
      // so on the whole upper half of the hole the 6px char line was painted
      // over by its own fire — measured 150–190 luminance on every upward ray
      // against 20–60 on the downward ones. The black line round the hole is the
      // single most recognisable thing about burning paper, so it now goes LAST
      // and nothing is allowed over it.
      //
      // And they are two buffers, not one, because of how they have to be
      // scaled: the flames want `imageSmoothingEnabled = true` (a 2px cell grid
      // upscaled hard looks like Lego), the char and ember bands want it OFF —
      // a burnt edge is a hard edge, and smoothing turned a 6px black line and
      // an 8px glowing line into one grey smudge.
      flamePixels.fill(0);
      bandPixels.fill(0);
      const phase = elapsed * 0.019;
      const front: number[] = [];
      let holeLeft = Number.POSITIVE_INFINITY;
      let holeTop = Number.POSITIVE_INFINITY;
      let holeRight = Number.NEGATIVE_INFINITY;
      let holeBottom = Number.NEGATIVE_INFINITY;
      let holeCells = 0;
      let flameTop = Number.POSITIVE_INFINITY;
      let flameBottom = Number.NEGATIVE_INFINITY;
      let flameCells = 0;
      for (let j = 0; j < rows; j += 1) {
        const y = j * cell + cell / 2 - margin;
        const inRowsOfCard = y >= 0 && y <= height;
        for (let i = 0; i < cols; i += 1) {
          const k = j * cols + i;
          const ahead = time[k] - threshold;
          const p = k * 4;
          if (ahead < 0) {
            if (inRowsOfCard) {
              const x = i * cell + cell / 2 - margin;
              if (x >= 0 && x <= width) {
                holeCells += 1;
                if (x < holeLeft) holeLeft = x;
                if (x > holeRight) holeRight = x;
                if (y < holeTop) holeTop = y;
                if (y > holeBottom) holeBottom = y;
              }
            }
            if (ahead > -1.6) front.push(k);
          } else if (ahead < EMBER_BAND_PX) {
            // 高頻閃爍 ±40%: two beating sine hashes, cheap and per-cell.
            const flicker =
              Math.sin(i * 1.71 + j * 2.33 + phase) * Math.sin(i * 0.93 - j * 1.29 + phase * 1.7);
            const colour = frontBandColour(ahead, ramp, flicker);
            if (colour[3] > 0) {
              bandPixels[p] = colour[0];
              bandPixels[p + 1] = colour[1];
              bandPixels[p + 2] = colour[2];
              bandPixels[p + 3] = colour[3] * 255;
            }
            if (ahead < 1.6) front.push(k);
          }
          const hot = heat.heat[k];
          if (hot > 0.02) {
            const colour = heatColour(hot, ramp);
            if (colour[3] > 0) {
              flamePixels[p] = colour[0];
              flamePixels[p + 1] = colour[1];
              flamePixels[p + 2] = colour[2];
              flamePixels[p + 3] = colour[3] * 255;
            }
            if (inRowsOfCard) {
              flameCells += 1;
              if (y < flameTop) flameTop = y;
              if (y > flameBottom) flameBottom = y;
            }
          }
        }
      }
      hole = {
        left: holeCells ? holeLeft : 0,
        top: holeCells ? holeTop : 0,
        right: holeCells ? holeRight : 0,
        bottom: holeCells ? holeBottom : 0,
        cells: holeCells,
      };
      flame = {
        top: flameCells ? flameTop : 0,
        bottom: flameCells ? flameBottom : 0,
        cells: flameCells,
      };

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = fade;
      // Flames first, soft.
      flameCtx.putImageData(flameImage, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(flameBuffer, -margin, -margin, cols * cell, rows * cell);
      // Char and ember last, hard-edged — nothing gets painted over the black
      // line (F1) and the burnt edge keeps an edge.
      bandCtx.putImageData(bandImage, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bandBuffer, -margin, -margin, cols * cell, rows * cell);
      ctx.imageSmoothingEnabled = true;

      // 餘燼帶內散佈 10–20 個更亮的餘燼點（41.3）。Review F5: the same dots every
      // frame, each on its own ray of the front, moving only because the front
      // moves. Re-rolling their positions at 60fps was television snow, not
      // embers — an ember sits still and breathes.
      dotPoints = [];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let n = 0; n < dots.length; n += 1) {
        const dot = dots[n];
        const at = emberDotPoint(field, threshold, dot, dotReach);
        if (at.x < 0 || at.x > width || at.y < 0 || at.y > height) continue;
        const alpha = emberDotAlpha(dot, elapsed);
        // The index travels with the point: a dot that walks off the card and
        // back must not be mistaken for a different dot by whatever is watching.
        dotPoints.push({ i: n, x: at.x, y: at.y, alpha });
        ctx.fillStyle = `rgba(${ramp.hot[0]},${ramp.hot[1]},${ramp.hot[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(at.x, at.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ⑤ 火星（41.5）— thrown from the front, up and outward, bending over.
      sparks = stepSparks(sparks, dt);
      if (front.length && u > 0 && u < 1) {
        const want = SPARK_MIN + Math.floor(rng() * (SPARK_MAX - SPARK_MIN + 1));
        while (sparks.length < want) {
          const k = front[Math.floor(rng() * front.length)];
          const x = cellX(k);
          const y = cellY(k);
          sparks.push(makeSpark(rng, x, y, Math.atan2(y - height / 2, x - width / 2)));
        }
      }
      if (sparks.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of sparks) {
          ctx.fillStyle = `rgba(${ramp.hot[0]},${ramp.hot[1]},${ramp.hot[2]},${sparkAlpha(s) * 0.9})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      frames += 1;
      return performance.now() - began;
    };

    const ENDS = mode === 'close' ? duration : EMBER_BURN_MS + EMBER_FADE_MS;

    const tick = (now: number) => {
      if (paused) return;
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const elapsed = now - startedAt;
      const spent = render(elapsed, dt);
      // Only frames the browser really asked for count towards the honest
      // per-frame number; a harness seek would otherwise flatter it.
      liveFrames += 1;
      totalWork += spent;
      if (spent > worstWork) worstWork = spent;
      if (workLog.length < 600) workLog.push(spent);
      if (elapsed < ENDS) raf = requestAnimationFrame(tick);
    };

    // The first frame is drawn synchronously, before the browser paints: the
    // film is already wearing `clip-path: url(#…)` by the time this runs, and an
    // empty `d` for one frame would flash the whole card away.
    tick(startedAt);

    /**
     * Replay the burn from zero at a fixed 60fps up to `ms` and stop there.
     * The fire is stateful (the heat map is built a frame at a time and the rng
     * is consumed as it goes), so a frozen frame has to be SIMULATED, not jumped
     * to — and because everything is seeded, the same `ms` always gives the same
     * picture. This is what lets the harness measure "at 1.0s" and mean it.
     */
    const seek = (ms: number) => {
      paused = true;
      cancelAnimationFrame(raf);
      heat.heat.fill(0);
      heat.scratch.fill(0);
      sparks = [];
      reseed();
      const step = 1000 / 60;
      for (let t = 0; t <= ms + 1e-6; t += step) render(Math.min(t, ms), step / 1000);
      return ms;
    };

    const debug = {
      snapshot: () => {
        const sorted = [...workLog].sort((a, b) => a - b);
        return {
          // Ticket 45 — which fire drew this. `gl` is the shader path; `2d` is
          // this one, reached when the browser has no WebGL1, when the context
          // budget is full or after a context loss.
          fire: '2d' as const,
          // The 2D fire is always readable — its canvas IS a 2D canvas.
          capture: true,
          mode,
          seed,
          frames,
          paused,
          size: { width, height, cols, rows, cell, margin, dpr },
          elapsed: paused ? at : performance.now() - startedAt,
          threshold,
          maxTime: field.max,
          corners: field.corners,
          hole,
          flame,
          sparks: sparks.length,
          // Review F5: the harness can now see the embers, count them and check
          // that they stay where they were put.
          dots: dotPoints.map((d) => ({
            i: d.i,
            x: Math.round(d.x * 10) / 10,
            y: Math.round(d.y * 10) / 10,
            alpha: Math.round(d.alpha * 100) / 100,
          })),
          dotsDeclared: dots.length,
          progress: burnProgress.current,
          startNorm,
          duration,
          warmth: EMBER_FIRE_CORE_WARMTH,
          charBand: CHAR_BAND_PX,
          emberBand: EMBER_BAND_PX,
          gl: { ...emberGlBudget },
          ramp: {
            hot: ramp.hot,
            light: ramp.light,
            base: ramp.base,
            deep: ramp.deep,
            char,
          },
          work: {
            frames: liveFrames,
            avgMs: liveFrames ? totalWork / liveFrames : 0,
            maxMs: worstWork,
            p95Ms: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0,
          },
        };
      },
      /** Review F3 — the flame layer itself, so the harness can measure FLAME
       *  pixels rather than "anything painted" (the sparks and the ember dots
       *  are drawn straight onto the visible canvas and were being counted as
       *  flames below the hole). Buffer row j is card y = j*cell + cell/2 - margin. */
      flameBuffer,
      /** Ticket 45 — the same name the GL path answers to, so one measurement
       *  works on both fires. Here the canvas IS a 2D canvas, so this is simply
       *  its own context. */
      readback: () => ctx,
      /** Does this point (card coordinates) still have film on it? Asked of the
       *  real clip geometry the browser is using, not of a copy of the field. */
      filmAt: (x: number, y: number) => path.isPointInFill(new DOMPoint(x, y)),
      seek,
    };
    (canvas as unknown as { __starlitEmber?: typeof debug }).__starlitEmber = debug;
    canvas.dataset.fire = '2d';

    return () => {
      cancelAnimationFrame(raf);
      delete (canvas as unknown as { __starlitEmber?: typeof debug }).__starlitEmber;
      delete canvas.dataset.fire;
    };
  }, [mode, seed, still, glBroken, updateRing]);

  if (still) return null;
  return (
    <>
      {/* Ticket 45.3 — the key. A canvas element can never change its context
          type, and a WebGL context that has been given back with
          `loseContext()` can never be revived: `getContext('webgl')` keeps
          returning the same dead object, and `getContext('2d')` on that canvas
          returns null, so the card would burn with no fire at all. Both of the
          moments that matter therefore get a FRESH element —

            · `mode` — open, then close: the first fire released its context on
              the way out, so the draw-back needs a canvas that has never had
              one (this is exactly what the F2 re-click assertion caught);
            · `glBroken` — a context lost by the browser, after which the v4 2D
              fire takes over.

          `data-fire` is written by whichever effect actually got to draw, so it
          always names the fire on screen rather than the intent. */}
      <canvas
        key={`ember-fire-${glBroken ? '2d' : 'gl'}-${mode}`}
        className="starlit-ember-canvas"
        ref={canvasRef}
        aria-hidden="true"
      />
      <svg className="starlit-ember-clip" width="0" height="0" aria-hidden="true" focusable="false">
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path ref={pathRef} d="" fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </svg>
    </>
  );
}

type EmberFirePlan = {
  width: number;
  height: number;
  ramp: EmberRamp;
  char: Rgb;
  field: BurnField;
  pace: number[];
  cooling: number;
  startNorm: number;
  duration: number;
  dots: EmberDot[];
  dotReach: number;
  /** The one seeded stream both fires draw from. */
  rng: () => number;
  /** Rewind that stream, so a frozen frame is the same picture every run. */
  reseed: () => void;
};

/**
 * Everything a burn needs that is NOT the drawing.
 *
 * Ticket 45 gave the flame a second renderer, and the one thing that must never
 * happen is the two of them disagreeing about the HOLE: the fire is a shader
 * now, but the burn-time field, the uneven pace, the 3.0s/1.4s, the draw-back's
 * starting point, the ember dots and the seeded rng are the same objects for
 * both. Written as a function declaration on purpose — it is hoisted, so it can
 * live here, beside the component that uses it, instead of above it.
 *
 * `progress` is `burnProgress.current`: how much of the film had gone when the
 * mode last changed, which is what makes a mid-burn second click reverse from
 * where the fire actually is (Ticket 41 Review F2).
 */
function emberFirePlan(
  card: HTMLElement,
  mode: EmberFireMode,
  seed: number,
  progress: number,
): EmberFirePlan {
  const rect = card.getBoundingClientRect();
  const width = Math.max(60, Math.round(rect.width));
  const height = Math.max(60, Math.round(rect.height));

  // 41.7 — the only place a colour enters. Four shades, the card's own, read
  // once; nothing that draws ever names a hue.
  const styles = getComputedStyle(card);
  const shade = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
  };
  const cardRamp: EmberRamp = {
    hot: hexToRgb(shade('--ember-tint-hot', '#fff6e0')),
    light: hexToRgb(shade('--ember-tint-light', '#f2e2c4')),
    base: hexToRgb(shade('--ember-tint', '#e0c49d')),
    deep: hexToRgb(shade('--ember-tint-deep', '#a8804a')),
  };
  // The user chose the amber core on 2026-09-19, so `EMBER_FIRE_CORE_WARMTH` is
  // 0.35: the two brightest steps carry some ember amber and the base, the deep,
  // the char and the turning ring are still the card's own colour. See the long
  // note on the constant in lib/ember-fire.ts.
  const ramp = warmRamp(cardRamp, EMBER_FIRE_CORE_WARMTH);
  const char = charColour(ramp.deep);

  const field = burnTimeField(width, height, EMBER_CELL, seed);
  // The draw-back gets its own pace, so closing is not the burn played
  // backwards frame for frame — it hesitates in different places.
  const pace = makeFrontPace(mode === 'close' ? seed + 977 : seed);
  const cooling = mode === 'close' ? EMBER_CLOSE_COOLING : HEAT_COOLING;
  /**
   * Review F2 — the draw-back starts from WHERE THE FIRE IS, not from
   * "everything is burned". Clicking a card 0.9s into its burn used to swap
   * `mode` to 'close' with a fresh clock, so the first close frame was `u = 1`
   * — the whole film vanished in one frame and only then grew back. The
   * duration is scaled with it: half a hole takes half the 1.4s, or the film
   * would crawl back at an obviously different speed from the burn.
   */
  const startNorm = mode === 'close' ? clampNumber(progress, 0, 1) : 1;
  const duration =
    mode === 'close' ? Math.max(320, Math.round(EMBER_CLOSE_MS * startNorm)) : EMBER_BURN_MS;

  // Held behind a wrapper so a `seek` can rewind every random draw to exactly
  // where it started.
  let draw = makeRng(seed * 31 + 7);
  const reseed = () => {
    draw = makeRng(seed * 31 + 7);
  };
  const rng = () => draw();
  // Review F5 — 10–20 embers, decided once, riding their own ray of the front.
  const dots = makeEmberDots(rng, field);
  const dotReach = Math.hypot(width, height) / 2 + EMBER_BAND_PX;

  return {
    width,
    height,
    ramp,
    char,
    field,
    pace,
    cooling,
    startNorm,
    duration,
    dots,
    dotReach,
    rng,
    reseed,
  };
}

/**
 * The lit set after clicking card `id`: in if it was out, out if it was in,
 * and every other card left exactly as it was — the user dropped v1's
 * one-at-a-time rule, so lighting one card never puts another out.
 */
export const emberToggle = (lit: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(lit);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/**
 * Ticket 38 — a reveal block that sits wholly above the scroll root's top edge
 * has been scrolled past, whether or not it was ever seen on the way. Such a
 * block counts as revealed; hiding it until the visitor scrolls back up is a
 * hole, not a reveal.
 */
export const passedAbove = (bottom: number, rootTop: number) => bottom <= rootTop;

export const linkKind = (url: string): 'github' | 'youtube' | 'link' => {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
  if (host === 'github.com') return 'github';
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  return 'link';
};

/**
 * 2026-09-20 使用者修訂：聯絡標題只有「奶茶」／"milk tea" 那個詞是奶茶色。
 * 文案仍然只有 site-copy 那一份（`titleEm`），這裡只是在那一句裡找到 `accent`
 * 這個詞、把它包起來上色——沒有第二份標題字串，句子的文字與順序也沒有被拆散，
 * 複製、朗讀與搜尋拿到的還是完整的一句。找不到就原樣輸出，寧可不上色也不斷句。
 */
export const accentedLine = (line: string, accent: string) => {
  const at = accent ? line.indexOf(accent) : -1;
  if (at < 0) return line;
  return (
    <>
      {line.slice(0, at)}
      <em className="starlit-title-accent">{accent}</em>
      {line.slice(at + accent.length)}
    </>
  );
};

/**
 * The two brand marks lucide no longer ships, drawn inline so no dependency is
 * added. Both are decorative: the visible label next to them names the link.
 */
export function LinkGlyph({ kind }: { kind: ReturnType<typeof linkKind> }) {
  if (kind === 'github')
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  if (kind === 'youtube')
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
      </svg>
    );
  return null;
}

export function StarlitBrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
    >
      {STARLIT_BRAND_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The whole row by default; `ids` picks a subset in the given order, which is
 * how the closing beat shows only mail, GitHub and Instagram.
 */
export function StarlitSocialRow({
  ids,
  label,
}: {
  ids?: string[];
  label?: string;
} = {}) {
  const entries = ids
    ? ids.flatMap((id) => STARLIT_SOCIAL.filter((s) => s.id === id))
    : STARLIT_SOCIAL;
  return (
    <div className="starlit-social-row" aria-label={label}>
      {entries.map((s) => (
        <a
          key={s.id}
          className="starlit-social-icon"
          href={s.href}
          aria-label={s.label}
          {...(s.id === 'email' ? {} : { target: '_blank', rel: 'noreferrer' })}
        >
          <SocialIcon id={s.id} />
        </a>
      ))}
    </div>
  );
}

// Ticket 05：LinkedIn 走了以後每一筆都用自己的 `handle`，這裡不再需要語言。
export function StarlitSocialList() {
  return (
    <div className="starlit-social-list">
      {STARLIT_SOCIAL.map((s) => (
        <a
          key={s.id}
          className="starlit-social-line"
          href={s.href}
          {...(s.id === 'email' ? {} : { target: '_blank', rel: 'noreferrer' })}
        >
          <SocialIcon id={s.id} size={24} />
          <span>
            {s.label}
            <small>{s.handle}</small>
          </span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

/** The six reading beats of the opening, in scroll order. */
export const READING_BEATS = 6;
/**
 * Where each beat puts its words, so nothing sits on the eyes, the nose or the
 * bright points across the chest. The opening brand and the two milk-tea beats
 * are centred — the brand is the title card, and those two beats show only the
 * turning sky, with no figure and no cup to keep clear of. The introduction
 * went to the sky at the bottom right (2026-09-15): beside the head it pressed
 * on the hair. The closing beat uses the whole width — the brand and the ways
 * in down the left, and the poem in the sky at the bottom right, which the CSS
 * pins there rather than leaving it in a column over the chest.
 */
const BEAT_PLACE = [
  'center',
  'right-bottom',
  'left',
  'center',
  'center',
  'full',
];
/** The closing beat offers mail first, then the two accounts. */
export const ENDING_SOCIAL = ['email', 'github', 'instagram'];
/**
 * The two ways in, in the order they are read. Ticket 35 (2026-09-18) swaps
 * them at the user's request: 關於我 on the left opens about (pose 0), 我的專案
 * on the right opens the work chapter (pose 1). The pose is the chapter the
 * shooting star flies to, so the pair must stay together with the labels
 * rather than being spelled out twice — swapping is reordering these two
 * rows, never editing a pose.
 */
export const ENDING_ENTRIES = [
  { pose: 0, label: 'entryAbout', aria: 'about' },
  { pose: 1, label: 'entryWorks', aria: 'works' },
] as const;
/** Length of the shooting-star wipe into a chapter; the CSS uses the same. */
export const METEOR_MS = 700;

/** A shooting star on its way to a chapter, and the run that launched it. */
export type StarlitLaunch = { pose: number; run: number } | null;

/**
 * Which chapter, if any, a star still in flight is allowed to open.
 *
 * The star belongs to the run of the opening that started it. Replaying starts
 * a new run, which makes anything still in flight stale — without this, hitting
 * the brand right after an entry is overtaken by the old timer and a chapter
 * opens about a second after the visitor asked for the opening back.
 */
export const launchInFlight = (launch: StarlitLaunch, run: number) =>
  launch && launch.run === run ? launch.pose : null;

/**
 * Arms one star and returns the teardown. The reader keys this on
 * `launchInFlight`, so when a replay turns that value to null React tears the
 * timer down and nothing re-arms it.
 */
export function armEntry(
  inFlight: number | null,
  enter: (pose: number) => void,
  clear: () => void,
) {
  if (inFlight === null) return undefined;
  const id = setTimeout(() => {
    clear();
    enter(inFlight);
  }, METEOR_MS);
  return () => clearTimeout(id);
}

/**
 * Native scroll position → the beat being read. That is all the scroll decides
 * (user request, 2026-09-15, after https://elvismao.com/zh-Hant/): one screen
 * of scroll per beat, and the words of the beat it lands on then read
 * themselves at their own pace. Scrolling back goes to the scene before.
 *
 * Nearest, not `floor`: beat `i` rests at `i * viewport`, so rounding puts
 * every boundary half a screen away from where the scroller actually stops and
 * no fractional pixel can report the beat next door. Nothing snaps — the
 * resting places are `beatScrollTop`'s alone (CSS `scroll-snap` locks the
 * reader, measured; `starlit-shell.test.ts` forbids it).
 */
export function readingStepAt(scrollTop: number, viewport: number) {
  if (!(viewport > 0)) return 0;
  const raw = Math.max(0, scrollTop) / viewport;
  return Math.max(0, Math.min(READING_BEATS - 1, Math.round(raw)));
}

/**
 * Where a beat rests, and the only thing that decides it: asking for a beat and
 * scrolling to it by hand land on exactly the same pixel. The two buttons, the
 * keyboard and the opening all go here.
 */
export const beatScrollTop = (index: number, viewport: number) =>
  Math.max(0, Math.min(READING_BEATS - 1, index)) * viewport;

/**
 * The wheel rule, in the two numbers it takes: how much wheel makes a beat, and
 * how long the wheel has to be quiet before the next push counts as a new
 * gesture. The threshold alone is not enough — a trackpad flick keeps delivering
 * momentum deltas long after the fingers have left, and serving all of them is
 * how the reader used to run past beats it never showed.
 *
 * The window is an *idle* gap, not a fixed expiry: every event that arrives
 * inside it pushes it out again. A fixed expiry only covers a tail shorter than
 * itself — a tail still firing at 100ms intervals at 500ms would have started a
 * second beat mid-gesture, which is the same skipping in slower clothes.
 */
export const WHEEL_STEP = 60;
export const WHEEL_GAP_MS = 150;
/**
 * …but one gesture can never hold the reader longer than this. Without a cap,
 * a wheel held down (or any unbroken stream) would be one endless gesture and
 * the reader could never leave the beat. With it, an unbroken stream still
 * advances, at one beat per cap.
 */
export const WHEEL_GESTURE_MAX_MS = 1200;
/** A wheel delta in lines is this many pixels; pages are a whole screen. */
export const WHEEL_LINE = 30;

/**
 * What the wheel is carrying between events: a part-gesture, the moment the
 * current gesture stops owning the reader, and the latest that moment can be.
 */
export type WheelCarry = { carry: number; until: number; cap: number };
export const NO_WHEEL: WheelCarry = { carry: 0, until: 0, cap: 0 };

/**
 * A wheel event, what the wheel was already carrying, and the beat being read →
 * the beat to ask for (or `null` to stay) and what to carry on with.
 *
 * One beat per crossing, never `carry / WHEEL_STEP` beats, and the leftover is
 * dropped: that is what lets the visitor stop and read. Scrolling the other way
 * goes back the same way, a beat at a time.
 */
export function wheelStep(
  delta: number,
  now: number,
  was: WheelCarry,
  step: number,
): { to: number | null } & WheelCarry {
  // Still inside the gesture already served: this is its momentum, not a new
  // push. It is swallowed, and it puts the quiet window out by another gap — up
  // to the cap, so a stream that never stops still moves on eventually.
  if (now < was.until)
    return {
      to: null,
      carry: 0,
      until: Math.min(now + WHEEL_GAP_MS, was.cap),
      cap: was.cap,
    };
  const carry = was.carry + delta;
  if (Math.abs(carry) < WHEEL_STEP)
    return { to: null, carry, until: was.until, cap: was.cap };
  const to = step + Math.sign(carry);
  // At either end there is nowhere to go; the visitor is not made to push again.
  if (to < 0 || to > READING_BEATS - 1)
    return { to: null, carry: 0, until: was.until, cap: was.cap };
  return {
    to,
    carry: 0,
    until: now + WHEEL_GAP_MS,
    cap: now + WHEEL_GESTURE_MAX_MS,
  };
}

/** Wheel deltas in lines or pages, in the pixels the rest of this reasons in. */
export const wheelPixels = (delta: number, mode: number, viewport: number) =>
  delta * (mode === 1 ? WHEEL_LINE : mode === 2 ? viewport : 1);

/**
 * How long a beat takes to read itself out, and how often that is repainted.
 * Ticket 25 lengthens the ordinary reveal by 20%; pursuit gives the lead
 * 0.8 s and shares the remaining 3.2 s between its words. An 80ms tick is
 * far cheaper than a frame loop beside the WebGL scene.
 * Ticket 34-B (2026-09-17): 5000 → 4000. The user found the 技藝／自由／極限
 * run "a bit too slow against the other beats"; 20% off keeps the equal
 * share per word (~1.07 s each) and only tightens the tempo.
 */
export const REVEAL_MS = 2400;
export const PURSUIT_REVEAL_MS = 4000;
/**
 * Ticket 26 adds the 你好 greeting and a second group to the introduction, so
 * that beat reads out over a little longer; every other beat keeps the 25 pace.
 */
export const INTRO_REVEAL_MS = 2800;
export const REVEAL_TICK_MS = 80;

/**
 * Time since the camera settled → how much of the beat is painted. Quantised to
 * a hundredth so the value is a clean, testable step rather than a raw
 * millisecond ratio; the tick redraws once every `REVEAL_TICK_MS` either way.
 */
export const revealAt = (elapsed: number, duration = REVEAL_MS) =>
  elapsed >= duration
    ? 1
    : Math.floor((Math.max(0, elapsed) / duration) * 100) / 100;

/**
 * One unit of the reveal: a Han character at a time, a latin word whole. The
 * whole passage stays in the markup and only the paint advances, so a line
 * wraps exactly where it always would and no word is ever cut in half.
 */
const TOKEN = /[A-Za-z][A-Za-z'’-]*|\d+|[\s\S]/gu;
export const revealTokens = (text: string) => text.match(TOKEN) ?? [];

/**
 * The curve one line is wiped on. The reference site wipes its copy with
 * `transition: background-size 2s ease-in` (measured: its own public
 * `work/starlit-implementation/visual-revision/reference-home.css`, `.type`),
 * so a line starts slowly and finishes quickly rather than crawling out at a
 * constant rate. Squaring is that shape without a bezier solver; the reference
 * runs the curve over one paragraph, and the approved copy reads sentence by
 * sentence, so each line gets the curve over its own share.
 */
export const easeIn = (t: number) => Math.max(0, Math.min(1, t)) ** 2;

/**
 * Spreads one beat's reveal over its blocks in reading order: a block fills
 * before the next one starts, so the beat reads top to bottom instead of every
 * line lightening at once, and each block is wiped on `easeIn`.
 */
export function revealShare(counts: number[], reveal: number) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  // Fractional, not rounded: the rounding belongs after the curve, or a block's
  // own progress would be quantised twice and the curve read as a stutter.
  let left = Math.max(0, Math.min(1, reveal)) * total;
  return counts.map((n) => {
    const taken = Math.max(0, Math.min(n, left));
    left -= taken;
    return n ? Math.round(easeIn(taken / n) * n) : 0;
  });
}

/** The lines of a beat, with the blank separators of the source copy dropped. */
export const readingLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** 手機／窄螢幕，與 `starlit-shell.css` 的版面斷點同一條。 */
const PHONE_QUERY = '(max-width: 850px)';

/** 初值 false（＝桌面），伺服器端與 hydration 的第一次繪製才會一致。 */
export function usePhoneLayout() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mql = matchMedia(PHONE_QUERY);
    const read = () => setPhone(mql.matches);
    read();
    mql.addEventListener('change', read);
    return () => mql.removeEventListener('change', read);
  }, []);
  return phone;
}

/**
 * 2026-09-21 核准：奶茶那一拍的中文在手機斷成三行，逐字照抄使用者給的文字。
 * 桌面維持原本兩行。
 */
export const CUP_PHONE_LINES = [
  '說不定我們暢談著，歡笑著，',
  '就一起幹了件——',
  '值得讓星空記下的事呢~',
];

/**
 * 手機版的奶茶拍行序。認的是中文原文案的尾句而不是拍號或語言旗標：英文不改，
 * 來源文案哪天改了也會安靜退回原文。尾句沒變，`data-shimmer` 仍落在同一句上。
 */
export const cupLines = (lines: string[], phone: boolean) =>
  phone && lines.at(-1) === CUP_PHONE_LINES.at(-1) ? CUP_PHONE_LINES : lines;

/**
 * Controls that own their own click or key: starting the opening from one of
 * these would steal the brand replay, the language switch or a link.
 */
const INTERACTIVE =
  'a,button,input,select,textarea,summary,label,[role="button"],[role="link"],[contenteditable="true"]';

/** Whether an event came from one of those controls. */
export function fromInteractive(target: unknown) {
  const node = target as { closest?: (selector: string) => unknown } | null;
  return Boolean(node?.closest && node.closest(INTERACTIVE));
}

/**
 * Keys that belong to the browser or to navigation, not to the opening. Tab
 * has to keep moving focus, Escape has to keep closing things, and a bare
 * modifier is somebody halfway through a shortcut.
 */
const RESERVED_KEYS = new Set([
  'Tab',
  'Escape',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'AltGraph',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'ContextMenu',
  'Dead',
  'Unidentified',
]);

/**
 * The keys a focused button or link activates on. These stay with the control
 * wherever they are pressed; nothing else in the reader is an activation key,
 * so the arrows, Page keys, Home and End keep working whatever holds focus.
 */
const OWNED_KEYS = new Set(['Enter', ' ']);

/**
 * Whether a keydown should start the opening. Any ordinary key does — letters,
 * space, Enter, the arrows — but never a browser shortcut, so Ctrl+R, ⌘L and
 * friends keep working.
 */
export function isOpeningKey(event: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}) {
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  return !RESERVED_KEYS.has(event.key);
}

/**
 * The keydown that starts the opening, shared by the reader's own handler and
 * the document one. Returns whether it took the keystroke.
 *
 * Taking it means calling `preventDefault`: Space, the arrows and Page Down
 * scroll the reader natively, and that native scroll interrupts the smooth
 * scroll to beat one — an arrow press would nudge the scroller ~40px and leave
 * the visitor on beat zero. Anything this refuses is left entirely alone, so
 * Tab still moves focus and browser shortcuts still reach the browser.
 */
export function openingKeydown(
  event: {
    key: string;
    repeat?: boolean;
    defaultPrevented?: boolean;
    target?: unknown;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    preventDefault: () => void;
  },
  begin: () => void,
) {
  // Already handled (the reader's own handler runs before the document one),
  // or a key being held: either way the opening is on its way and starting it
  // again would only restart the smooth scroll.
  if (event.defaultPrevented || event.repeat) return false;
  if (!isOpeningKey(event)) return false;
  // Only the keys a focused control genuinely owns are handed back. Refusing
  // every key whenever anything was focused made the opening unreachable from
  // the keyboard after a single click on the language switch — focus stays on
  // that button, and Enter, Space and the arrows all did nothing at all
  // (Coordinator, reproduced: `ticket-09/findings-rev2-red.txt` F4). Spec says
  // any ordinary key enters the introduction; an arrow is not an activation key.
  if (OWNED_KEYS.has(event.key) && fromInteractive(event.target)) return false;
  event.preventDefault();
  begin();
  return true;
}

/**
 * 閱讀門檻（Spec A01）：一段的字還沒播完以前，向下推進不生效。顯字中向下滾、
 * 按鍵或點下一段都只是被拒絕——不加速、不跳段，也不累積成待處理的推進，讀完
 * 了要再推一次。向上返回不受限制，而開場那一段是品牌標題、沒有逐句揭字，所以
 * 隨時可以進介紹（不必等貓娘演完）。
 *
 * `reveal` 是這一段實際畫到哪裡的同一個值，不是另開的計時：閱讀進度只有一份。
 */
export const canLeaveBeat = (step: number, reveal: number) =>
  step === 0 || reveal >= 1;

/**
 * Where a push actually lands: the whole gate, as one decision. Returns the beat
 * to go to, which is `from` when the push may not be served at all.
 *
 * - Going back, or staying, is served as asked.
 * - Going on is *clamped*, not refused outright, so a key that asks for more
 *   than it may have still does the most it may. `End` asked for the last beat
 *   and used to be handed it, crossing four unread beats in one press — the
 *   reveal, the gate and the 技藝／自由／極限 run of every beat in between never
 *   happened (Reviewers A and B, both reproduced: `ticket-09/findings-rev2-red.txt`).
 * - Every visit must finish its own reveal, including previously read beats.
 * - One new beat at a time, and only when `from` is the beat the last render
 *   measured as finished (`leavable`). The scroller is written synchronously and
 *   the render follows, so without this a second push inside that window is
 *   judged against the beat before it and steps twice.
 * - …and the push must have been made after the gate opened (`readyAt`), not
 *   merely handled after. On the real preview a WebGL frame blocks the main
 *   thread long enough that a handler runs seconds after its own event (0.8–3.3s
 *   measured per event, `ticket-09/probe-burst.json`), so a notch pushed during
 *   the reveal can arrive to find the gate already open. The visitor pushed
 *   while the words were still coming; that is what counts.
 */
export function leaveTarget(
  from: number,
  to: number,
  leavable: number | null,
  when: number,
  readyAt: number,
) {
  if (to <= from) return to;
  // Only this visit can open the gate, and only for one forward beat.
  const open = from === leavable && when >= readyAt;
  return Math.min(to, open ? from + 1 : from);
}

/**
 * Which beat a reading key asks for, or `null` when the key is not one of them
 * and the browser keeps it. Home and End are the first and last beat; the rest
 * move one beat, exactly as the two hint buttons do.
 */
export function readingKeyStep(key: string, step: number) {
  const to =
    key === 'ArrowDown' || key === 'PageDown' || key === ' '
      ? step + 1
      : key === 'ArrowUp' || key === 'PageUp'
        ? step - 1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? READING_BEATS - 1
            : null;
  if (to === null || to < 0 || to > READING_BEATS - 1 || to === step)
    return null;
  return to;
}

/**
 * The reading keydown, once the opening has started. Returns whether it took
 * the keystroke.
 *
 * On the document, exactly like `openingKeydown` and the wheel, and for the
 * same reason: during the opening the whole window is the reading surface. It
 * used to be the reader element's own `onKeyDown`, which meant the keys only
 * worked if that element happened to hold focus — and nothing ever gave it
 * focus. Starting the opening from the keyboard (the document handler) left the
 * focus on `<body>`, so the arrows were dead from that point on and the visitor
 * had to reach for the mouse (measured on the real preview:
 * `work/starlit-implementation/approved-09-18/ticket-09/keyboard-flow-red.txt`,
 * checks 5–7). Clicking a hint button left focus off the reader too.
 *
 * Space is the one key a focused button or link genuinely owns, so that one is
 * handed back; the arrows, Page keys, Home and End are not activation keys and
 * work wherever the focus happens to be.
 */
export function readingKeydown(
  event: {
    key: string;
    repeat?: boolean;
    defaultPrevented?: boolean;
    target?: unknown;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    preventDefault: () => void;
  },
  step: number,
  go: (to: number) => void,
) {
  if (event.defaultPrevented) return false;
  // A key held down, exactly as `openingKeydown` treats it. The reader must be
  // asked for each beat: held down, the auto-repeat was served the instant every
  // beat's gate opened, so the opening walked itself 1→2→3→4 with no second
  // action from the visitor (Reviewer B, reproduced: `ticket-09/
  // findings-rev2-red.txt` F2 — ten seconds ran all the way to the ending).
  // `readyAt` cannot see this: a repeat carries a fresh timestamp every time.
  if (event.repeat) return false;
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  if (OWNED_KEYS.has(event.key) && fromInteractive(event.target)) return false;
  const to = readingKeyStep(event.key, step);
  if (to === null) return false;
  event.preventDefault();
  go(to);
  return true;
}

/**
 * How far a finger has to travel for one beat. A touch swipe is the phone's
 * only way through the opening, and the reader no longer scrolls natively, so
 * the swipe is read here the same way a wheel gesture is: one beat per
 * crossing, the leftover dropped, either direction.
 */
export const TOUCH_STEP = 72;

/**
 * A finger's travel so far and the beat being read → the beat to ask for (or
 * `null` to stay) and what is left to carry.
 */
export function touchStep(moved: number, step: number) {
  if (Math.abs(moved) < TOUCH_STEP) return { to: null, carry: moved };
  const to = step + Math.sign(moved);
  if (to < 0 || to > READING_BEATS - 1) return { to: null, carry: 0 };
  return { to, carry: 0 };
}

export type StarlitReaderProps = {
  language?: Language;
  /** The beat the visitor is on; the page owns it because the scene reads it. */
  step: number;
  /** The whole copy of that beat, as the scene reports it. */
  text: string;
  /** The camera has arrived. Until then the beat shows no words at all. */
  settled: boolean;
  /**
   * The page is in the background, or the scene is paused. The reveal holds
   * where it is rather than running out unseen, and picks up again on return.
   */
  paused?: boolean;
  onStepChange: (step: number) => void;
  /** The closing beat: 0 為關於我，1 為我的專案。 */
  onEnter: (pose: number) => void;
  /** A new number sends the reader back to the first beat. */
  replay?: number;
  /**
   * The wiring slot for the brand opening. The scene owns the orthographic 3D
   * word above the figure; until it is connected this stays false and the
   * opening beat shows the same brand string as a readable heading. Setting it
   * true hides that heading from sight only — it stays in the document, so the
   * word is announced once and never painted twice.
   */
  brandIn3D?: boolean;
};

/**
 * The opening reading surface. The words sit on a stage fixed over the scene
 * and never move with the scroll: the native scroller under them carries no
 * text at all, only scroll length. The scroll position says which beat is being
 * read and nothing else; once the camera has arrived there, the beat reads
 * itself out over about two seconds whether the visitor keeps scrolling or not,
 * and stops. It never moves the scene on by itself — that is still the scroll,
 * with no wheel handler and no body lock, so keyboard, touch and assistive
 * scrolling all work the same way.
 */
export function StarlitReader({
  language = 'zh',
  step,
  text,
  settled,
  paused = false,
  onStepChange,
  onEnter,
  replay = 0,
  brandIn3D = false,
}: StarlitReaderProps) {
  const t = copy(language);
  // Only the milk-tea beat's Chinese reads differently here; see `cupLines`.
  const phone = usePhoneLayout();
  const view = useRef<HTMLElement>(null);
  const requestedStep = useRef(step);
  useEffect(() => { requestedStep.current = step; }, [step]);
  const [launch, setLaunch] = useState<StarlitLaunch>(null);
  // A visit owns its paint. Switching language keeps its elapsed progress;
  // leaving the beat or replaying replaces it, so returning starts from zero.
  const pass = `${step}|${replay}`;
  const [paint, setPaint] = useState({ pass, value: 0 });
  // Reset even while travelling: a quick return before the next timer tick
  // must not recover the previous visit's finished paint.
  if (paint.pass !== pass) setPaint({ pass, value: 0 });
  const reveal = paint.pass === pass ? paint.value : 0;
  const duration =
    step === 2 ? PURSUIT_REVEAL_MS : step === 1 ? INTRO_REVEAL_MS : REVEAL_MS;
  // Milliseconds this passage has spent revealing, and the passage that spent
  // them. Refs, not state: the pause holds the count without a render, and the
  // tick below is the only thing that draws.
  const spent = useRef(0);
  const spentOn = useRef(pass);
  // The entry callback is read through a ref so a re-render during the wipe
  // cannot restart its 0.7s clock.
  const enter = useRef(onEnter);
  useEffect(() => {
    enter.current = onEnter;
  });
  // Null as soon as a replay starts a new run, which is what tears the timer
  // down: a star from the previous run never lands.
  const inFlight = launchInFlight(launch, replay);
  useEffect(
    () =>
      armEntry(
        inFlight,
        (pose) => enter.current(pose),
        () => setLaunch(null),
      ),
    [inFlight],
  );
  // Replaying the opening returns the scroller itself, not just the number.
  useEffect(() => {
    requestedStep.current = 0;
    view.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [replay]);
  // A resize changes the pixel length of every beat, not the beat being read.
  useEffect(() => {
    const align = () => {
      const el = view.current;
      if (el) el.scrollTop = beatScrollTop(requestedStep.current, el.clientHeight);
    };
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, []);
  // The reveal itself: once the camera has arrived, the passage reads itself out
  // over REVEAL_MS and stops. It has no say in which beat is on, so the words
  // carry on to the end after the scroll has stopped and the scene still waits
  // for the visitor to ask for the next one. Every dependency here is something
  // that has to take the clock away: changing passage, the camera leaving, the
  // page going into the background, and the passage being finished.
  useEffect(() => {
    if (spentOn.current !== pass) {
      spentOn.current = pass;
      spent.current = 0;
    }
    if (!settled || paused || spent.current >= duration) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      spent.current += now - last;
      last = now;
      setPaint({ pass, value: revealAt(spent.current, duration) });
      if (spent.current >= duration) clearInterval(id);
    }, REVEAL_TICK_MS);
    return () => clearInterval(id);
  }, [pass, settled, paused, duration]);

  // 可以往下離開的是「哪一段」，`null` 表示現在哪一段都不能往下。
  //
  // 存段號而不是布林，是因為捲軸比 render 早一步：`goTo` 同步寫 scrollTop，而
  // 新的段要等 React commit 才回到這裡。只記布林的話，推進之後、re-render 之前
  // 還留著上一段「已讀完」的答案，緊接著的第二次推進就會被放行——實測連按三次
  // ArrowDown 會跳兩段（keyboard-flow-red2.txt 檢查 5）。比對段號就關掉這個窗
  // 口：捲軸已經在一個還沒量過的段上，那一段當然還沒讀完。
  //
  // 用 ref 讀，因為滾輪與鍵盤監聽都只掛一次，閉包裡的值會停在第一次 render。
  //
  // `readyAt` is the moment that answer became true, on the same clock as an
  // event's `timeStamp`, and every push is judged by when the visitor made it
  // rather than by when the handler finally got to run.
  //
  // On the real preview a WebGL frame blocks the main thread long enough that a
  // wheel handler runs 0.8–3.3s after its own event (measured per event:
  // `ticket-09/probe-burst.json`). A notch pushed during the reveal therefore
  // arrives after the beat has honestly finished, the gate is open by then, and
  // it is served — the reader steps on a beat the visitor never asked to leave.
  // Measured both ways on the real preview: with this comparison a burst during
  // the reveal moves the scroller not at all; without it the same burst steps
  // one beat the moment the reveal completes.
  const open = step === 0 || (settled && !paused && canLeaveBeat(step, reveal));
  const leavable = useRef<number | null>(null);
  const readyAt = useRef(Infinity);
  useEffect(() => {
    if (!open) {
      leavable.current = null;
      readyAt.current = Infinity;
    } else {
      if (leavable.current !== step) readyAt.current = performance.now();
      leavable.current = step;
    }
  });
  const follow = () => {
    const el = view.current;
    if (!el) return;
    const at = readingStepAt(el.scrollTop, el.clientHeight);
    // 原生捲動（手機滑動、拉捲軸，以及主執行緒卡住時瀏覽器自己補的捲動）不經過
    // `goTo`，所以門檻也要在這裡守：字還沒播完就把捲軸放回這一段自己的停點，不
    // 回報新的段。比的是停點而不是段號，因為卡頓後瀏覽器會把捲軸留在兩個停點
    // 之間（實測 2884 而不是 2700，`ticket-09/probe-burst.json`），那也不該留著。
    // 只往回拉，向上返回仍然隨時可用。放回之後再觸發的 scroll 事件已經在停點上，
    // 不會再寫一次，也就不會來回震盪。
    const rest = beatScrollTop(step, el.clientHeight);
    if (!open && el.scrollTop > rest) {
      el.scrollTop = rest;
      return;
    }
    if (at !== step) onStepChange(at);
  };
  // Asking for a beat puts the scroller on that beat's own resting place; the
  // beat then reads itself out, exactly as it does when the visitor scrolls
  // there by hand.
  //
  // Not `behavior: 'smooth'`. The scroller carries nothing anybody can see —
  // six empty lengths — so animating it buys no movement at all, while the beat
  // it reports, and therefore the camera, waits for that animation to finish.
  // Beside a WebGL scene whose frames are hundreds of milliseconds apart that
  // wait was seconds: a click on the opening left the screen untouched for four
  // (progress.md §1.3). Landing at once hands the scene the new beat on the
  // spot, and the movement the visitor actually sees is the camera's own.
  //
  // 所有推進——滾輪、鍵盤、觸控與閱讀面的點擊——都走這裡，所以閱讀門檻
  // 只要守這一個路口。往回永遠放行。出發點取自捲軸而不是 `step` prop：prop 要
  // 晚一個 render 才追上，同一個 frame 裡的第二次推進會用到舊值。
  const goTo = (index: number, when = performance.now()) => {
    const el = view.current;
    if (!el) return;
    const from = readingStepAt(el.scrollTop, el.clientHeight);
    const to = leaveTarget(
      from, index, leavable.current, when, readyAt.current,
    );
    if (to === from) return;
    leavable.current = null;
    readyAt.current = Infinity;
    // Preserve this destination if resize arrives before the scroll callback.
    requestedStep.current = to;
    el.scrollTop = beatScrollTop(to, el.clientHeight);
  };
  // One wheel gesture, one beat. Without this a beat is a whole screen of
  // scroll, so an ordinary mouse needed seven to ten notches to change anything
  // at all while the opening promised the wheel would start it, and a fast one
  // ran past beats without ever showing them (both measured:
  // work/starlit-implementation/visual-revision/reading-layout-20260916/ui/
  // progress.md §1). Native `scroll-snap` cannot do this job — a single notch is
  // a fraction of the screen between two snap points, so the scroller pulls it
  // straight back and the beat can never be left (§3.1). Touch and the keys have
  // handlers of their own beside this one — the scroller is no longer natively
  // scrollable at all — so every way through the opening meets the same gate,
  // and no beat is ever advanced by anything but a deliberate gesture.
  useEffect(() => {
    let held: WheelCarry = NO_WHEEL;
    const onWheel = (event: WheelEvent) => {
      // Pinch zoom belongs to the browser.
      if (event.ctrlKey) return;
      const el = view.current;
      if (!el) return;
      event.preventDefault();
      const moved = wheelStep(
        wheelPixels(event.deltaY, event.deltaMode, el.clientHeight),
        event.timeStamp,
        held,
        // The scroller, never the `step` prop: `goTo` writes `scrollTop`
        // synchronously, but the beat that comes back from it only arrives a
        // render later (scroll event → `follow` → `onStepChange` → parent
        // state). Two deliberate pushes inside one frame therefore both counted
        // from the beat before the first one, and the second wrote the
        // scrollTop it was already on — no movement, gesture spent
        // (`evidence/wheel-lag-red.json`). `readingStepAt` of the live
        // `scrollTop` is the same definition `follow` uses, one frame earlier.
        readingStepAt(el.scrollTop, el.clientHeight),
      );
      held = { carry: moved.carry, until: moved.until, cap: moved.cap };
      if (moved.to !== null) goTo(moved.to, event.timeStamp);
    };
    // On the document, the same way the opening keydown is, and for the same
    // reason: during the opening the whole window is the reading surface, and
    // the wheel has to mean the same thing everywhere on it. Listening on the
    // scroller alone left the progress line and the header out — they are its
    // siblings, not its children — so a wheel over that strip fell through to
    // the browser and nudged the scroller off a beat's resting place by the raw
    // delta (measured: `evidence/after-input.log`, phase E, `scrollTop` 1290).
    // Nothing else scrolls while the reader is mounted, and it unmounts the
    // moment a chapter opens, so this takes nothing the chapters need.
    //
    // Not React's `onWheel` either: React attaches wheel listeners passively at
    // the root, where `preventDefault` does nothing.
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => document.removeEventListener('wheel', onWheel);
    // `goTo` and `view` only read refs, so this never needs to re-subscribe.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The first beat also opens to a click, a tap or any ordinary key, not just
  // the wheel. It always scrolls to beat one — never `step + 1` — so holding a
  // key down cannot run through the opening, and it goes through the same
  // scroller as every other move, so the scene sees the usual reading step.
  const atStart = step === 0;
  const begin = () => goTo(1);
  // Touch, for the same reason and in the same place as the wheel: the reader
  // is no longer natively scrollable, so a swipe has to be read here or the
  // phone has no way through the opening at all. Deliberately not
  // `preventDefault`ed — there is nothing left to prevent, and taking the
  // gesture would also take pinch zoom and the browser's own edge gestures.
  useEffect(() => {
    let last: number | null = null;
    let carry = 0;
    const onStart = (event: TouchEvent) => {
      last = event.touches[0]?.clientY ?? null;
      carry = 0;
    };
    const onMove = (event: TouchEvent) => {
      const el = view.current;
      const y = event.touches[0]?.clientY;
      if (el === null || last === null || y === undefined) return;
      // Swiping up (finger travelling up the screen) reads on, as it does in
      // any scroller.
      carry += last - y;
      last = y;
      const moved = touchStep(
        carry,
        readingStepAt(el.scrollTop, el.clientHeight),
      );
      carry = moved.carry;
      if (moved.to !== null) goTo(moved.to, event.timeStamp);
    };
    const onEnd = () => {
      last = null;
      carry = 0;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
    // `goTo` and `view` only read refs, so this never needs to re-subscribe.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Background and text clicks share the same timestamped gate as every other
  // input. The reading surface spans the viewport; controls own their clicks.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = view.current;
      if (!el || event.defaultPrevented || event.button !== 0 || fromInteractive(event.target)) return;
      const at = readingStepAt(el.scrollTop, el.clientHeight);
      if (at < READING_BEATS - 1) goTo(at + 1, event.timeStamp);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // `goTo` only reads refs, just like the wheel and keyboard handlers.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The keyboard, on the document, for the whole of the opening: starting it
  // and then reading it are the same surface and must not depend on what holds
  // focus. The beat comes out of the scroller, the same way the wheel takes it
  // and for the same reason, so this subscribes once and never goes stale.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = view.current;
      if (!el) return;
      const at = readingStepAt(el.scrollTop, el.clientHeight);
      if (at === 0) openingKeydown(event, begin);
      else readingKeydown(event, at, (to) => goTo(to, event.timeStamp));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // `begin` and `goTo` only read refs, so this never needs to re-subscribe.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lines = cupLines(readingLines(text), phone);

  return (
    <div className="starlit-reader-frame">
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section
        className="starlit-reader"
        ref={view}
        onScroll={follow}
        // Opening keyboard activation marks its event handled. The document
        // listeners handle pointer input and the remaining reading keys.
        onKeyDown={
          atStart ? (event) => openingKeydown(event, begin) : undefined
        }
        // No `tabIndex`: this element is not natively scrollable any more, and
        // its six lengths are `aria-hidden`, so a tab stop here would land the
        // visitor on something with nothing to offer. The reading keys are on
        // the document and work wherever focus happens to be, which is what
        // used to be this element's only reason to take focus.
        aria-label={t.preview.reading}
      >
        {/* Scroll length only. Nothing readable lives inside the scroller,
            which is what keeps the copy from riding up and down with it. */}
        {Array.from({ length: READING_BEATS }, (_, index) => (
          <div key={index} className="starlit-scroll-step" aria-hidden="true" />
        ))}
      </section>
      {/* The words: one stage fixed over the scene, every beat in its own place
          on it, only the one being read painted. */}
      <div className="starlit-text-stage">
        {BEAT_PLACE.map((place, index) => (
          <section
            key={index}
            className="starlit-beat"
            data-beat={index}
            data-visible={index === step && settled}
            aria-label={t.preview.beats[index]}
          >
            <div className="starlit-copy" data-place={place}>
              <div className="starlit-copy-inner">
                {index === step
                  ? beatCopy(
                      index,
                      lines,
                      t,
                      (pose) => setLaunch({ pose, run: replay }),
                      settled ? reveal : 0,
                      brandIn3D,
                    )
                  : null}
              </div>
            </div>
          </section>
        ))}
      </div>
      {inFlight === null ? null : (
        <div className="starlit-meteor" data-to={inFlight} aria-hidden="true" />
      )}
    </div>
  );
}

type Copy = ReturnType<typeof copy>;

/**
 * One line of the front introduction with its keyword set large and heavy.
 * The keyword comes from the copy and is a contiguous substring of the line,
 * so the whole sentence stays one readable run of text — nothing is rebuilt
 * from fragments and nothing is dropped when a keyword does not match.
 */
export function splitKeyword(line: string, keyword?: string) {
  const at = keyword ? line.indexOf(keyword) : -1;
  if (at < 0) return [line, '', ''];
  return [line.slice(0, at), keyword as string, line.slice(at + keyword!.length)];
}

/**
 * The painted tokens of one block. Every token is in the markup from the first
 * frame and only its paint changes, so a line sits exactly where it sat before
 * the reveal reached it and the whole passage is always there to be read aloud.
 */
function Ink({ text, shown }: { text: string; shown: number }) {
  return (
    <>
      {revealTokens(text).map((token, i) => (
        // The list is fixed by the text, so the position is a stable key.
        // oxlint-disable-next-line react/no-array-index-key
        <span key={i} className="starlit-ink" data-on={i < shown}>
          {token}
        </span>
      ))}
    </>
  );
}

function IntroLine({
  line,
  keyword,
  star,
  shown,
  group,
}: {
  line: string;
  keyword?: string;
  star: boolean;
  shown: number;
  /** First line of the second group: the gap above it is layout, not copy. */
  group?: boolean;
}) {
  const [before, word, after] = splitKeyword(line, keyword);
  const lead = revealTokens(before).length;
  const whole = lead + revealTokens(word).length;
  return (
    <p className="starlit-beat-line" data-group={group ? 'start' : undefined}>
      <Ink text={before} shown={shown} />
      {word ? (
        // The star crosses 夢想家 once, and only once the word is all there.
        <b className="starlit-keyword" data-star={star && shown >= whole}>
          <Ink text={word} shown={shown - lead} />
        </b>
      ) : null}
      <Ink text={after} shown={shown - whole} />
    </p>
  );
}

/**
 * One beat of copy at the reveal its own clock has reached. The whole beat is in
 * the markup, never a typed prefix; `reveal` (0–1) only decides how much of it
 * is painted, and the blocks fill in reading order.
 */
export function beatCopy(
  index: number,
  lines: string[],
  t: Copy,
  launch: (pose: number) => void,
  reveal: number,
  brandIn3D: boolean,
) {
  // The opening beat is the brand itself. The scene draws it as the
  // orthographic 3D word; this heading is the same string in the document, so
  // it is the readable fallback before that lands and the accessible name
  // afterwards — `brandIn3D` hides it from sight only, never from the reader,
  // so the two never show the word twice.
  if (index === 0)
    return (
      <h1 className="starlit-open-brand" data-in-3d={brandIn3D}>
        {t.preview.brand}
      </h1>
    );
  if (index === 2) {
    // The scene reports no text at all while the camera is travelling, so this
    // beat can be asked to render with no lines: the lead has to stand that.
    const [lead = '', ...words] = lines;
    return (
      <>
        <p className="starlit-pursue-lead">
          <Ink
            text={lead}
            shown={revealShare([revealTokens(lead).length], reveal / KEYWORD_LEAD)[0]}
          />
        </p>
        <StarlitKeywords
          words={words}
          shown={keywordFromReveal(reveal, words.length)}
        />
      </>
    );
  }
  if (index === 5) {
    // The brand and the role read first, then the poem. The two entries and the
    // three direct links are controls rather than copy, so they are there from
    // the start and a visitor never has to paint the words to reach a chapter.
    const share = revealShare(
      [t.preview.brand, t.preview.role, ...lines].map(
        (text) => revealTokens(text).length,
      ),
      reveal,
    );
    return (
      <div className="starlit-ending">
        <div className="starlit-ending-brand">
          <p className="starlit-ending-name">
            <Ink text={t.preview.brand} shown={share[0]} />
          </p>
          <p className="starlit-ending-role">
            <Ink text={t.preview.role} shown={share[1]} />
          </p>
          <span className="starlit-entries">
            {ENDING_ENTRIES.map((entry) => (
              <button
                key={entry.pose}
                type="button"
                data-pose={entry.pose}
                onClick={() => launch(entry.pose)}
                aria-label={t.preview[entry.aria]}
              >
                {t.preview[entry.label]}
              </button>
            ))}
          </span>
          <StarlitSocialRow ids={ENDING_SOCIAL} label={t.preview.contact} />
        </div>
        <div className="starlit-ending-poem" aria-label={t.preview.poem}>
          {lines.map((line, i) => (
            <p className="starlit-poem-line" key={line}>
              <Ink text={line} shown={share[i + 2]} />
            </p>
          ))}
        </div>
      </div>
    );
  }
  const shares = revealShare(
    lines.map((line) => revealTokens(line).length),
    reveal,
  );
  if (index === 1) {
    // Ticket 26: the greeting and the name read as one group, the three
    // self-introduction lines as another. The space between them is the layout's
    // own gap — no blank passage is inserted, so a screen reader reads the beat
    // as one continuous run of lines and the reveal keeps its single clock.
    const [greeting = '', ...rest] = lines;
    return (
      <>
        <p className="starlit-greeting">
          <Ink text={greeting} shown={shares[0]} />
        </p>
        {rest.map((line, i) => (
          <IntroLine
            key={line}
            line={line}
            keyword={t.preview.keywords[i]}
            star={i === rest.length - 1}
            group={i === 1}
            shown={shares[i + 1]}
          />
        ))}
      </>
    );
  }
  return lines.map((line, i) => (
    <p
      className={index === 3 ? 'starlit-beat-head' : 'starlit-beat-line'}
      key={line}
      // Ticket 27: the closing line of the milk-tea beat carries the same kind
      // of light the 夢想家 keyword already carries — one soft sweep across the
      // words once they are all there, never a page-wide flash and never a
      // loop the visitor has to wait out before going on.
      data-shimmer={
        index === 4 && i === lines.length - 1
          ? String(shares[i] >= revealTokens(line).length)
          : undefined
      }
    >
      <Ink text={line} shown={shares[i]} />
    </p>
  ));
}

/**
 * How much of the 我追求 beat the lead reads over; 技藝／自由／極限 share what
 * is left of it equally, one after another.
 */
export const KEYWORD_LEAD = 0.2;

/**
 * Which of the three words the reveal has reached, or `-1` before the run
 * starts. An equal share each is what keeps a word from flashing past unseen:
 * measuring the words against the lead's own length made 自由 a sliver in
 * Chinese and a different sliver in English.
 */
export const keywordFromReveal = (reveal: number, count: number) => {
  if (count < 1) return -1;
  const past =
    (Math.max(0, Math.min(1, reveal)) - KEYWORD_LEAD) / (1 - KEYWORD_LEAD);
  return past < 0 ? -1 : Math.min(count - 1, Math.floor(past * count));
};

/**
 * Which word of 技藝／自由／極限 is in place at `shown`. `-1` is before the run
 * starts, when all three still wait below. The run plays once and stops on the
 * last word. Each visit starts the run again, then holds on 極限.
 */
export const keywordSlot = (index: number, shown: number, count: number) => {
  const on = Math.min(shown, Math.max(0, count - 1));
  if (index === on) return 0;
  // The word that just left rides up out of the frame; the rest wait below.
  return index === on - 1 ? -1 : index - on;
};

/**
 * 技藝／自由／極限 take turns in one place: every word is in the markup and read
 * in order, and only the painting moves, the way the reference site cycles its
 * own big words. Unlike the reference the run is finite: it rides the same
 * `reveal` as the rest of the beat, so the three words are paced by the beat's
 * own four seconds (Ticket 34-B) and stop on 極限 rather than cycling for ever.
 */
function StarlitKeywords({ words, shown }: { words: string[]; shown: number }) {
  return (
    <span className="starlit-keywords">
      {words.map((word, i) => {
        const slot = keywordSlot(i, shown, words.length);
        return (
          <span
            key={word}
            data-on={shown >= 0 && slot === 0}
            // `transform`, not `top`: the three words share one grid cell so the
            // box is as wide as the widest of them, and a grid item cannot be
            // moved with `top`.
            style={{ transform: `translateY(${slot * 100}%)` }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

export type StarlitShellProps = {
  /** False during the opening: no chapter buttons, copy slot only. */
  introComplete: boolean;
  active: string;
  onActiveChange: (value: string) => void;
  onReplay: () => void;
  /** Whole shell language; the default keeps the Chinese site unchanged. */
  language?: Language;
  /** Scene column; the 3D stage is plugged in at integration time. */
  stage?: ReactNode;
  /** Top-right controls: language now, sound alongside it later. */
  controls?: ReactNode;
  /** Extra footer entry (the audio credits); absent keeps the footer as it was. */
  footerExtra?: ReactNode;
  /** Opening copy, rendered only while `introComplete` is false. */
  children?: ReactNode;
  /** Ticket 09: opt-in nebula diagnostic ('full' comparison or 'simple' pause); absent keeps the shell unchanged. */
  diagnostic?: 'full' | 'simple';
};

/**
 * Ticket 30-C — the /關於我 blocks fade up as they scroll into view, once.
 *
 * Two things this has to get right:
 *
 * 1. **The root.** On desktop the chapter does not scroll the viewport: the
 *    header floats and `.starlit-content` is its own `overflow-y: auto` box
 *    (see starlit-shell.css, `@media (min-width: 851px)`). An observer left on
 *    the default root would therefore see every block as "already visible" the
 *    moment the chapter opens and would never fire again. Below 851px the same
 *    element is `overflow: visible` and the page itself scrolls, so the root
 *    has to go back to the viewport. Rather than duplicating the breakpoint in
 *    JavaScript — which would drift the first time the CSS moves — the nearest
 *    ancestor that is *actually* scrolling is looked up at run time, and `null`
 *    (the viewport) is the answer when there is none.
 * 2. **Once.** Each target is unobserved as soon as it lands, and its key is
 *    remembered for the lifetime of the shell, so a block that has been seen
 *    comes back already shown if the panel is ever remounted — no second fade.
 *
 * `prefers-reduced-motion: reduce` skips the observer entirely and paints the
 * final state; the stylesheet states the same thing so nothing depends on the
 * order the two land in.
 */
function useStarlitReveal(
  ref: { current: HTMLElement | null },
  introComplete: boolean,
  active: string,
) {
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const host = ref.current;
    if (!host || !introComplete) return;
    const targets = [
      ...host.querySelectorAll<HTMLElement>('.starlit-reveal'),
    ];
    if (targets.length === 0) return;
    const show = (el: HTMLElement) => {
      el.dataset.reveal = 'in';
      if (el.dataset.revealKey) seen.current.add(el.dataset.revealKey);
    };
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver !== 'function') {
      for (const el of targets) show(el);
      return;
    }
    const pending: HTMLElement[] = [];
    for (const el of targets) {
      if (el.dataset.revealKey && seen.current.has(el.dataset.revealKey)) {
        // Already shown earlier in this visit: land on the final state without
        // running the transition again.
        el.style.transition = 'none';
        show(el);
        requestAnimationFrame(() => {
          el.style.transition = '';
        });
      } else pending.push(el);
    }
    if (pending.length === 0) return;
    // The nearest ancestor that really scrolls — see the note above.
    let root: Element | null = null;
    for (let n = pending[0].parentElement; n; n = n.parentElement) {
      const flow = getComputedStyle(n).overflowY;
      if (
        (flow === 'auto' || flow === 'scroll') &&
        n.scrollHeight > n.clientHeight
      ) {
        root = n;
        break;
      }
    }
    const live = new Set<HTMLElement>(pending);
    const reveal = (el: HTMLElement) => {
      show(el);
      io.unobserve(el);
      live.delete(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        const rootTop = entries[0]?.rootBounds?.top ?? 0;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (
            entry.isIntersecting ||
            passedAbove(entry.boundingClientRect.bottom, rootTop)
          )
            reveal(el);
        }
      },
      { root, rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    for (const el of pending) io.observe(el);
    // Ticket 38: a jump — End key, a scrollbar drag, a test's scrollTo — can
    // carry a block from below the viewport to above it without it ever
    // intersecting. The observer only fires when a threshold is crossed, and
    // 0 → 0 crosses none, so such a block stayed at opacity 0 until the
    // visitor scrolled back up. On scroll, anything already wholly above the
    // top edge counts as seen.
    // Review J F1: listen on the document in the capture phase rather than on
    // the resolved root — element scroll events do not bubble to window, so if
    // the root was resolved before the panel became scrollable the listener
    // would sit on the wrong target. Capture on document sees every scroll.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rootTop = root ? root.getBoundingClientRect().top : 0;
        for (const el of [...live])
          if (passedAbove(el.getBoundingClientRect().bottom, rootTop)) reveal(el);
      });
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      io.disconnect();
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, introComplete, active]);
}

/* ---------------------------------------------------------------------------
   Ticket 44 — 鼠標漸亮（毛哥 elvismao.com/zh-Hant/code 的做法）。

   一個容器、一個 pointermove、rAF 節流，回呼裡只做兩件事：讀 rect、寫
   `--mouse-x/--mouse-y`。沒有 canvas、沒有 state、不會觸發 React re-render，
   畫的事情全部交給 CSS 的 radial-gradient（見 components/starlit-shell.css 的
   Ticket 44-A／44-B 兩段），亮不亮則交給 CSS 的 `:hover`——所以沒有「JS 忘了
   關」這種狀態，也不必聽 pointerleave。

   `targets` 是「這個容器要餵哪些盒子」：內容欄是它自己一個；作品格子是**每一張
   卡各一次**——毛哥讓相鄰卡片的邊也會亮，靠的就是每張卡都拿到鼠標相對自己的位置
   （左邊那張是正的大數、右邊那張是負數）。座標換算住在 lib/cursor-glow.ts，有
   自己的單元測試。

   `(hover: none)` 的裝置整個不掛：不加監聽、不寫變數（CSS 那邊的 `:hover` 規則
   也關在 `@media (hover: hover)` 裡）。觸控的 :hover 會黏住，會留下一團不動的光。
   --------------------------------------------------------------------------- */
const glowCards = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLElement>('.starlit-ember'),
];

function useCursorGlow(
  ref: { current: HTMLElement | null },
  enabled: boolean,
  targets: (host: HTMLElement) => HTMLElement[],
) {
  useEffect(() => {
    const host = ref.current;
    if (!host || !enabled) return;
    if (!cursorGlowSupported(typeof matchMedia === 'function' ? matchMedia : null))
      return;
    let raf = 0;
    let last: { x: number; y: number } | null = null;
    const paint = () => {
      raf = 0;
      const at = last;
      if (!at) return;
      for (const el of targets(host)) {
        // The rect is the layer's own positioned ancestor, so it has already
        // moved with the scroll — no scrollTop term belongs here.
        const point = glowPoint(at.x, at.y, el.getBoundingClientRect());
        el.style.setProperty('--mouse-x', glowVar(point.x));
        el.style.setProperty('--mouse-y', glowVar(point.y));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onMove = (event: PointerEvent) => {
      last = { x: event.clientX, y: event.clientY };
      schedule();
    };
    // Review R F2 — 捲動也要重算。`last` 存的是 client（視窗）座標，而 `paint()`
    // 每次都重讀 rect，所以捲動之後同一個 client 座標會換算出不同的欄內座標：
    // 公式一個字都不用改，只要在捲動時再跑一次 paint。不補這條的話，滾輪捲了
    // 300px 而指標沒動時，聚光會跟著內容一起跑掉 300px（Reviewer 實測 1440 畫面
    // y 400 → 100、390 是 700 → 400），直到指標動 1px 才彈回去。
    // 監聽掛在 document 的捕獲階段：桌機捲的是 `.starlit-content` 這個元素，而
    // 元素的 scroll 事件不會冒泡到 window（≤850px 捲的才是 window），捕獲階段
    // 兩種都收得到，也就不必去解析「現在到底誰是 scroller」。
    // 它跟 pointermove 在同一個 effect 裡，所以 `(hover: none)` 的擋板一樣擋著它。
    const onScroll = () => {
      if (last) schedule();
    };
    host.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      host.removeEventListener('pointermove', onMove);
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (raf) cancelAnimationFrame(raf);
      for (const el of targets(host)) {
        el.style.removeProperty('--mouse-x');
        el.style.removeProperty('--mouse-y');
      }
    };
  }, [ref, enabled, targets]);
}

export default function StarlitShell({
  introComplete,
  active,
  onActiveChange,
  onReplay,
  language = 'zh',
  stage,
  controls,
  footerExtra,
  children,
  diagnostic,
}: StarlitShellProps) {
  const t = copy(language);
  // Ticket 09: the diagnostic pauses the nebula through its existing `visible`
  // seam, which unmounts the layer and detaches attachNebula's listeners.
  const [nebulaPaused, setNebulaPaused] = useState(false);
  const works = localizedProjects(language);
  // Ticket 39: which cards are burned open. Any number at once (the user
  // dropped v1's one-at-a-time rule). A card that is being put out stays
  // mounted in `closing` for EMBER_CLOSE_MS so the fire can draw back before
  // the open face is hidden.
  const [litWorks, setLitWorks] = useState<ReadonlySet<string>>(() => new Set());
  const [closingWorks, setClosingWorks] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // `burning` is the window in which the fire is on the card — the burn plus
  // its dying tail on the way open (Ticket 41: 3.0s + 0.8s), the whole draw-back
  // on the way closed (1.4s). Kept separate from `lit` because it is also what
  // mounts and unmounts the canvas layer and the film's clip path.
  // 落定即釋放轉場 context，只保留既有 CSS 流動框。
  const [burningWorks, setBurningWorks] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const closeTimers = useRef(new Map<string, number>());
  const burnTimers = useRef(new Map<string, number>());
  const toggleWork = (id: string) => {
    const without = (set: ReadonlySet<string>) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    };
    for (const timers of [closeTimers.current, burnTimers.current]) {
      const pending = timers.get(id);
      if (pending) {
        clearTimeout(pending);
        timers.delete(id);
      }
    }
    const wasLit = litWorks.has(id);
    setLitWorks((set) => emberToggle(set, id));
    setBurningWorks((set) => new Set(set).add(id));
    burnTimers.current.set(
      id,
      window.setTimeout(
        () => {
          burnTimers.current.delete(id);
          setBurningWorks(without);
        },
        wasLit ? EMBER_CLOSE_MS : EMBER_FIRE_MS,
      ),
    );
    if (wasLit) {
      setClosingWorks((set) => new Set(set).add(id));
      closeTimers.current.set(
        id,
        window.setTimeout(() => {
          closeTimers.current.delete(id);
          setClosingWorks(without);
        }, EMBER_CLOSE_MS),
      );
    } else {
      setClosingWorks(without);
    }
  };
  // Reset before rendering another chapter; language changes and selecting
  // the current tab keep the same Works session.
  const [previousChapter, setPreviousChapter] = useState(active);
  if (previousChapter !== active) {
    setPreviousChapter(active);
    if (active !== '1') {
      setLitWorks(new Set());
      setClosingWorks(new Set());
      setBurningWorks(new Set());
    }
  }
  useLayoutEffect(() => {
    const timers = [closeTimers.current, burnTimers.current];
    return () => {
      for (const map of timers) {
        for (const timer of map.values()) clearTimeout(timer);
        map.clear();
      }
    };
  }, [active]);
  const contentRef = useRef<HTMLDivElement>(null);
  useStarlitReveal(contentRef, introComplete, active);
  // Ticket 44 — the cursor spotlight. The content column's host exists only
  // once the chapters do; the works grid only while its panel is mounted, so
  // the second effect is keyed on the active chapter as well.
  const glowHostRef = useRef<HTMLDivElement>(null);
  const emberGridRef = useRef<HTMLDivElement>(null);
  useCursorGlow(emberGridRef, introComplete && active === '1', glowCards);
  useEffect(() => {
    const grid = emberGridRef.current;
    if (!grid || !introComplete || active !== '1') return;
    const visibility = () => { grid.dataset.emberPaused = String(document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      delete grid.dataset.emberPaused;
    };
  }, [introComplete, active]);
  return (
    // Ticket 28: one Tabs context for the whole shell. The tab list now sits in
    // the header and the panels stay in the content column, so the root has to
    // wrap both — it renders the same plain `div` the shell always had.
    <Tabs.Root
      className="starlit"
      data-intro-complete={introComplete}
      data-language={language}
      value={active}
      onValueChange={(value) => onActiveChange(String(value))}
    >
      <header className="starlit-header">
        <button
          type="button"
          className="starlit-brand"
          onClick={() => {
            // 重播保留 Shell 掛載；取消卡片待辦，避免回到作品時延續上一輪。
            for (const timers of [closeTimers.current, burnTimers.current]) {
              for (const timer of timers.values()) clearTimeout(timer);
              timers.clear();
            }
            setLitWorks(new Set());
            setClosingWorks(new Set());
            setBurningWorks(new Set());
            onReplay();
          }}
          aria-label={t.brandAria}
        >
          <StarlitBrandMark />
          <span>
            <span className="starlit-brand-name">{t.brandName}</span>
            <span className="starlit-brand-sub">{t.brandSub}</span>
          </span>
        </button>
        {/* Chapters live to the left of Language, and only once they exist. */}
        {introComplete ? (
          <Tabs.List className="starlit-nav" aria-label={t.navAria}>
            {t.sections.map((s) => (
              <Tabs.Tab key={s.value} value={s.value} className="starlit-tab">
                {s.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        ) : null}
        {controls ? (
          <div className="starlit-controls" aria-label={t.controlsAria}>
            {controls}
          </div>
        ) : null}
      </header>
      <main className="starlit-main" data-stage={Boolean(stage)}>
        {stage ? <aside className="starlit-stage">{stage}</aside> : null}
        <div className="starlit-content" id="starlit-content" ref={contentRef}>
          {introComplete ? (
            // Ticket 44-A: the spotlight's positioned ancestor. It has to be a
            // real element in the column's flow — an absolutely positioned
            // layer inside the scroller would only be as tall as the visible
            // box and would scroll away with the content.
            <div className="starlit-glow-host" ref={glowHostRef}>
              <StarlitNebula
                key={active}
                hostRef={glowHostRef}
                active={introComplete && ['0', '1', '2'].includes(active)}
                visible={!nebulaPaused}
              />
              <Tabs.Panel value="0" className="starlit-chapter">
                {/* Ticket 29-A: the name card. One grid row; 29-B fills the
                    second column with the portrait that bleeds off the right
                    edge, so the identity text keeps its place in the reading
                    order and the photo follows it.
                    A plain `div`, deliberately not a `<header>`: app/globals.css
                    styles the bare `header` element as `position: absolute;
                    top: 0; z-index: 5` for the current homepage, which lifted
                    this block out of the content column and onto the figure
                    (seen at 1440×900 before this was changed). */}
                <div
                  className="starlit-about-head starlit-reveal"
                  data-reveal-key="head"
                >
                  <div className="starlit-about-identity">
                    <h1 className="starlit-about-name">{t.about.name}</h1>
                    <p className="starlit-about-name-sub">{t.about.nameSub}</p>
                    <p className="starlit-about-tagline">{t.about.tagline}</p>
                  </div>
                  {/* The moon composite preserves the original portrait asset;
                      a feathered image mask removes its black exterior. */}
                  <div className="starlit-about-portrait">
                    <img
                      src="/portrait-milktea-moon-v3.webp"
                      alt={t.about.portraitAlt}
                      width={768}
                      height={768}
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>
                {/* 2026-09-17 決定：技能 → 教育 → 得獎。 */}
                <section className="starlit-block starlit-reveal" data-reveal-key="skills">
                  <h2>
                    {t.about.skills}{' '}
                    {t.about.skillsSmall ? (
                      <small>{t.about.skillsSmall}</small>
                    ) : null}
                  </h2>
                  {/* Plain lines, not pills. `.starlit-skills` keeps the pill
                      look, and only the works chapter uses it now.
                      `role="list"` because `list-style: none` drops the list
                      semantics in Safari + VoiceOver.
                      Ticket 30-A.4: a long group (the 13 languages & tools)
                      says so itself, and the stylesheet gives it a double-width
                      track split into two text columns — so the three stacks
                      come out 7 / 7 / 6 and the right-hand whitespace is used
                      instead of one column running twice as long as the other. */}
                  <div className="starlit-skill-columns">
                    {t.about.skillGroups.map((group) => (
                      <div
                        className="starlit-skill-column"
                        data-wide={group.items.length > 8 ? 'true' : undefined}
                        key={group.heading}
                      >
                        <h3>{group.heading}</h3>
                        <ul className="starlit-plain-list" role="list">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
                <section
                  className="starlit-block starlit-reveal"
                  data-reveal-key="education"
                >
                  <h2>
                    {t.about.education}{' '}
                    {t.about.educationSmall ? (
                      <small>{t.about.educationSmall}</small>
                    ) : null}
                  </h2>
                  {/* School names only — no years were given, so none are
                      invented, and none may be added later (both test files
                      assert the names carry no digits).
                      Ticket 31 replaced 30-A.3's two columns with the
                      reference site's alternating timeline: the list is one
                      full-width row per school, oldest first, and the
                      stylesheet alternates them left / right / left around a
                      centre spine whose height is the whole block. The order
                      here IS the left/right order (`:nth-child(odd)` goes
                      left), so reordering this array moves the cards. No extra
                      element and no image file — the spine, the moving head and
                      each row's 24px connector are all pseudo-elements. */}
                  <ul
                    className="starlit-plain-list starlit-education"
                    role="list"
                  >
                    {t.about.schools.map((school) => (
                      <li key={school}>{school}</li>
                    ))}
                  </ul>
                </section>
                <section
                  className="starlit-block starlit-reveal"
                  data-reveal-key="recognition"
                >
                  <h2>
                    {t.about.recognition}{' '}
                    {t.about.recognitionSmall ? (
                      <small>{t.about.recognitionSmall}</small>
                    ) : null}
                  </h2>
                  {/* Ticket 30-A.5: one award is one block — year on the left,
                      event name, then each placing on its own line. No rule
                      under the row (30-A.1) and no `·` joining two placings. */}
                  {t.about.awards.map((award) => (
                    <div className="starlit-award" key={award.title}>
                      <span>{award.year}</span>
                      <div>
                        <h3>{award.title}</h3>
                        {award.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
                {/* Ticket 33-B: the closing block. Placeholder copy only — the
                    visitor will say what goes here; nothing is invented. Same
                    heading / rule / reveal treatment as the blocks above. */}
                <section
                  className="starlit-block starlit-reveal starlit-now"
                  data-reveal-key="now"
                >
                  <h2>
                    {t.about.now}{' '}
                    {t.about.nowSmall ? <small>{t.about.nowSmall}</small> : null}
                  </h2>
                  {t.about.nowLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </section>
              </Tabs.Panel>
              <Tabs.Panel value="1" className="starlit-chapter">
                {/* Ticket 40.5 — the chapter opens on the title alone: the
                    SELECTED & ONGOING kicker and the lead sentence are gone and
                    the two lines are the same words in both languages (the site
                    is 皇家奶茶大師 = Royal Milktea Master either way).
                    Ticket 40 Review F2: the `<br />` is not decoration — `<em>`
                    is a block here, so the two lines already LOOKED right, but
                    without a break the accessible name and every textContent
                    read of this heading ran the lines together as
                    「Royal Milktea Master'sProject Base」. Contact's h1 has had
                    the break all along. */}
                <h1>
                  {t.works.title}
                  <br />
                  <em>{t.works.titleEm}</em>
                </h1>
                {/* Ticket 39 — ember cards. Closed: an icon and the name. Click:
                    a ring of star-coloured fire spreads from the centre and the
                    card's open face (a small icon + the name, the summary, then
                    the links) shows in the same card; while lit the card's edge
                    is a slowly turning ring of the same colours. Any number may
                    be open. The face is a button underneath; the open face lets
                    clicks fall through to it except on its links, so a click
                    anywhere on an open card puts it out. Ticket 40.3 took the
                    "01 / category" label off the film, so the "01 02 03" pin
                    from Ticket 28 is void; `.starlit-work` still marks the project
                    entries. */}
                {/* Ticket 41 replaced v3's fire wholesale: the `#starlit-flame`
                    turbulence filter, the two CSS fire rings and the twelve
                    `<i>` sparks are gone, and every card that is burning mounts
                    one `<canvas class="starlit-ember-canvas">` instead (see
                    StarlitEmberFire above for why the hole is a clip path). The
                    film underneath is untouched DOM — the icon and the name are
                    still the button's children. */}
                <div className="starlit-ember-grid" ref={emberGridRef}>
                  {works.map((p, i) => {
                    const lit = litWorks.has(p.id);
                    const closing = closingWorks.has(p.id);
                    const burning = burningWorks.has(p.id);
                    const Icon = emberIcon(p.id);
                    const tint = emberTint(p.id, i);
                    const clipId = `starlit-ember-clip-${p.id}`;
                    return (
                      <div
                        key={p.id}
                        className="starlit-ember"
                        data-lit={lit}
                        data-closing={closing}
                        data-burning={burning}
                        data-ring="false"
                        data-tint={tint.name}
                        style={
                          {
                            '--ember-tint': tint.base,
                            '--ember-tint-light': tint.light,
                            '--ember-tint-deep': tint.deep,
                            '--ember-tint-hot': tint.hot,
                            // The film wears this only while data-burning is on,
                            // which is exactly while the <clipPath> below exists.
                            '--ember-clip': `url(#${clipId})`,
                          } as CSSProperties
                        }
                      >
                        {/* Underneath, never moving: the summary and links.
                            A click on its empty space puts the card out; the
                            links keep their own clicks. */}
                        <div
                          id={`starlit-work-${p.id}`}
                          className="starlit-ember-open"
                          role="region"
                          aria-label={p.title}
                          data-open={lit || closing}
                          onClick={(event) => {
                            if ((event.target as Element).closest('a')) return;
                            toggleWork(p.id);
                          }}
                        >
                          {/* Ticket 40.1 — the open face keeps the card's
                              identity: the same project icon at 24px beside the
                              project's name, then the summary, then the links.
                              A different class from the film's icon on purpose
                              — the film's is 68px with a glow, and anything
                              reading `.starlit-ember-icon` (CSS and harness
                              alike) must keep meaning that one. */}
                          <div className="starlit-ember-head">
                            <Icon
                              className="starlit-ember-head-icon"
                              size={24}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            <span className="starlit-ember-head-name">
                              {p.title}
                            </span>
                          </div>
                          <p>{p.summary}</p>
                          <div className="starlit-work-links">
                            {p.links.map((l) => (
                              <a
                                key={l.url}
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                data-kind={linkKind(l.url)}
                                aria-label={l.label}
                                title={l.label}
                              >
                                <LinkGlyph kind={linkKind(l.url)} />
                                {linkKind(l.url) === 'link' ? (
                                  <ArrowUpRight size={16} aria-hidden="true" />
                                ) : null}
                              </a>
                            ))}
                          </div>
                        </div>
                        {/* On top: the film — the closed face. Ticket 41 burns
                            the hole through it with the clip path the canvas
                            layer rewrites each frame, so the icon and the name
                            stay ordinary DOM the whole way. Once burned away it
                            stops taking the pointer so the links underneath
                            do. */}
                        <button
                          type="button"
                          className="starlit-work starlit-ember-face"
                          aria-expanded={lit}
                          aria-controls={`starlit-work-${p.id}`}
                          onClick={() => toggleWork(p.id)}
                        >
                          <Icon
                            className="starlit-ember-icon"
                            size={68}
                            strokeWidth={1.25}
                            aria-hidden="true"
                          />
                          <span className="starlit-ember-name">{p.title}</span>
                          <span className="starlit-sr">
                            {lit ? t.works.collapse : t.works.detail}
                          </span>
                        </button>
                        {/* Ticket 44-B — the faint spotlight inside the card
                            the pointer is actually on. Over the film, under the
                            fire canvas, never taking the pointer. */}
                        <div
                          className="starlit-ember-spot"
                          aria-hidden="true"
                        />
                        {/* Ticket 41.1 — the fire. One canvas over the film,
                            mounted only while the card is burning and unmounted
                            the moment it is not, releasing the transition
                            context. It carries the film's clip path with
                            it: both appear and disappear in the same commit. */}
                        {burning ? (
                          <StarlitEmberFire
                            clipId={clipId}
                            mode={closing ? 'close' : 'burn'}
                            seed={emberSeed(p.id)}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {/* Ticket 40.4 — the bottom「探索我的 GitHub」text link is gone;
                    each card already carries its own GitHub / YouTube icon. */}
              </Tabs.Panel>
              <Tabs.Panel value="2" className="starlit-chapter">
                {/* Ticket 03（starlit-moon-contact）— 標題／介紹右側放既有 3D
                    貓貓奶茶；自己的畫布與相機，與左側人物無關。 */}
                <div className="starlit-contact-head">
                  <div className="starlit-contact-intro">
                    <p className="starlit-kicker">{t.contact.kicker}</p>
                    <h1>
                      {t.contact.title}
                      <br />
                      {accentedLine(t.contact.titleEm, t.contact.titleAccent)}
                    </h1>
                    <p className="starlit-lead">{t.contact.lead}</p>
                  </div>
                  <StarlitContactMilktea />
                </div>
                <div className="starlit-contact-mail">
                  <p>{t.contact.mailLabel}</p>
                  <a href="mailto:leslie0907@gmail.com">
                    leslie0907@gmail.com
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </a>
                </div>
                <StarlitSocialList />
              </Tabs.Panel>
              {/* Like the current homepage, the opening keeps the page furniture
                  out of the way until the chapters appear — which is exactly the
                  condition this branch already is, so Ticket 44-A folded the
                  separate `introComplete ?` guard into the glow host and the
                  footer now scrolls (and lights up) with the chapters. */}
              <ShellFooter language={language} extra={footerExtra} />
            </div>
          ) : (
            <div className="starlit-intro">{children}</div>
          )}
        </div>
      </main>
      {diagnostic ? (
        <StarlitNebulaDiagnostic
          mode={diagnostic}
          introComplete={introComplete}
          chapter={active}
          contentRef={contentRef}
          onPausedChange={setNebulaPaused}
        />
      ) : null}
    </Tabs.Root>
  );
}

function ShellFooter({
  language,
  extra,
}: {
  language: Language;
  extra?: ReactNode;
}) {
  const t = copy(language);
  return (
    <footer className="starlit-footer">
      <span>
        © {new Date().getFullYear()} {t.footer}
      </span>
      {extra}
      <StarlitSocialRow />
    </footer>
  );
}
