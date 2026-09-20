/**
 * Ticket 45 — /我的作品's fire v5（方案 C：WebGL 片段著色器）.
 *
 * WHY THIS FILE EXISTS. v4 (lib/ember-fire.ts) draws the flame on the CPU as a
 * DOOM-fire heat map on a HALF-RESOLUTION grid — one cell per 2 CSS px — and
 * then scales that grid up. The user's verdict after seeing it:
 *
 *   「我一直覺得有一種電子感，不像真的火的感覺，我想看看 C 能不能做得更像一點」
 *
 * and the Coordinator's analysis names the cause: a 2px cell grid with a random
 * per-cell cooling step IS pixel art. Every neighbouring pair of cells differs
 * by a visible amount, so however it is upscaled the eye reads a lattice. Real
 * flame has no lattice: it is continuous, it is soft at the edge, and it GLOWS
 * (light adds) rather than being painted on.
 *
 * So v5 moves the flame to the fragment shader, where every pixel is evaluated
 * on its own:
 *
 *   ① 連續 — the flame's shape comes from three octaves of value noise (FBM)
 *      evaluated at the fragment's own card coordinate, each octave scrolling
 *      UPWARD at its own speed and scale. There is no grid to alias.
 *   ② 熱源沿前緣 — the burn-time field (the same field v4 uses, the same hole,
 *      the same pace) is uploaded as a texture, so the shader can ask, for any
 *      pixel, `d = burnTime − threshold`: how far ahead of the burning front it
 *      is. A pixel lights up when it can find burning paper BELOW it, and the
 *      heat falls off with how far above that paper it is.
 *   ③ 加色 — the shader writes PREMULTIPLIED alpha and the canvas is blended
 *      with `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`. Where the heat runs
 *      past 1 the colour is pushed towards white and the rgb is allowed to
 *      exceed the alpha, so the core adds light to what is underneath and reads
 *      白熱 instead of「一塊亮色的貼圖」.
 *   ④ 焦邊與餘燼 — same bands as v4 (0–6px char, 6–14px ember) off the same
 *      distance field, but with a ~1px soft edge and the char composited LAST
 *      so nothing is ever painted over the black rim (Ticket 41 Review F1).
 *
 * Everything in here is a pure function or a string, so lib/ember-fire-gl.test.ts
 * can run it under plain node with no canvas, no DOM and no GPU. The component
 * (components/starlit-shell.tsx) owns the context, the textures and the loop.
 *
 * 專屬色 policy is unchanged: the only colours that enter are the card's own
 * `--ember-tint*`, run through `warmRamp` with `EMBER_FIRE_CORE_WARMTH` (0.35,
 * the amber core the user picked). Nothing here names a hue.
 */

import {
  CHAR_BAND_PX,
  EMBER_BAND_PX,
  charColour,
  clamp,
  type BurnField,
  type EmberRamp,
  type Rgb,
} from './ember-fire.ts';

// ---------------------------------------------------------------------------
// Ticket 47 — 卡片外框：更粗的流光框 ＋ 沿四邊往外舔的火.
// ---------------------------------------------------------------------------

/**
 * 流光框的粗度 — Ticket 48：5px → 3.5px（使用者 2026-09-19，同一次授權裡把 47 的
 * 5px 收掉：「開啟框總厚度 3.5px，保持各卡配色」）。47 的 3px → 5px 是上一步。
 *
 * It is stated here, in the file the shader constants live in, for one reason:
 * the number exists in exactly two places that must agree — this constant (which
 * the unit test pins) and components/starlit-shell.css (which actually draws it,
 * as `.starlit-ember::before { inset: -2.5px }` plus the 1px the card's content
 * is held in by Ticket 44-B). The test reads the stylesheet and checks the two
 * add up, so a hand-edit of either one is a RED.
 */
export const EMBER_RING_PX = 3.5;
/** Ticket 44-B 把膜與開啟面往內縮的 1px — 流光框內側露出來的那一段. */
export const EMBER_RING_INNER_PX = 1;
/** …so the ring has to stick THIS far out of the card's border box. */
export const EMBER_RING_OUTSET_PX = EMBER_RING_PX - EMBER_RING_INNER_PX;
/**
 * The card's own corner radius, and the radius every rounded-rect below uses.
 *
 * 18 and not 20 on purpose: 18 is what `.starlit-ember-canvas` carried as its
 * `border-radius`, which is to say it is the exact shape the fire was clipped to
 * before this ticket widened the canvas. Keeping it means the main fire looks
 * the same to the pixel; the visible card edge (20px, on `.starlit-ember`) is at
 * most 0.83px further out at 45°, and the edge flames start from a band 10–16px
 * wide, so nothing can see the difference.
 */
export const EMBER_CARD_RADIUS_PX = 18;

/**
 * How far outside the card the fire canvas reaches, CSS px.
 *
 * 20 is not a taste decision, it is the narrowest thing on the page: at 390 the
 * content column's padding is a flat 20px (components/starlit-shell.css, the
 * ≤850 block), so a canvas that reaches 20px past the outermost card stops
 * EXACTLY at the column's padding edge. One px more and `.starlit-content`
 * (whose `overflow-y: auto` makes `overflow-x` compute to `auto` as well) grows
 * a horizontal scrollbar — the same trap Ticket 44-A's glow host documents.
 */
export const EDGE_FLAME_MARGIN_PX = 20;
/**
 * 熱源帶的射程。注意這不是畫出來的厚度：噪音會把帶子雕回去，實測的厚度中位數
 * 大約是它的 0.57 倍（見 `EDGE_FLAME_FALLOFF` 與 `EDGE_FLAME_CARVE` 的推導）。
 * 票面要的是**畫出來的**厚度 10–16px（Review F4：上一輪右緣與下緣只有 8–10px），
 * 所以射程開到 20，四條邊的中位數才一起落進 10–16。20 也正好是畫布的邊界，
 * 而收尾窗（下面）從 15 開始把它收乾淨，所以帶子不會被畫布切到。
 */
export const EDGE_FLAME_REACH_PX = 20;
/**
 * 熱源沿距離衰減的形狀。A straight `1 − smoothstep(0, reach, d)` is linear-ish
 * through the middle, and with the carve on top of it the band that actually
 * survived measured 8–10px against a reach of 15 — under the 10–16 the ticket
 * asks for, and widening `reach` alone would have grown the top tongues past the
 * canvas instead. Raising the source to a power below 1 fattens it near the
 * fuel and leaves the zero exactly where it was, which is also what a flame
 * does: brightness does not fall off linearly with distance from what is
 * burning. At 0.7 the licking band measures ~10–13px, inside the window.
 */
export const EDGE_FLAME_FALLOFF = 0.7;
/**
 * 重力固定 → 火舌向上。A fragment is also fed by the edge band up to this far
 * BELOW it, so the top edge grows real tongues, the left and right edges lick
 * upward along themselves, and the bottom edge stays the shortest of the four.
 * It is kept under `EDGE_FLAME_MARGIN_PX` so a tongue dies of its own accord
 * before it reaches the canvas's edge and gets cut off square.
 *
 * 10, not 14: the reach went 16 → 20 to bring the side and bottom thicknesses up
 * into the ticket's 10–16 (Review F4), and the top edge gets the band AND this
 * on top of it. Trimming the lift by the same 4px keeps the top inside the same
 * window instead of letting it run into the canvas's boundary.
 */
export const EDGE_FLAME_LIFT_PX = 10;
/** How many times the edge flame probes downward. */
export const EDGE_FLAME_SAMPLES = 8;
/**
 * 噪音把火舌雕掉的力道。The burn's own flame uses 1.4 and it is right there: that
 * flame is 44px tall and needs its tips torn off hard or it reads as a sheet.
 * The rim's band is a fifth of that, so the same 1.4 ate most of it and the
 * licking band measured 8–12px, under the 10–16 the ticket asks for.
 */
export const EDGE_FLAME_CARVE = 1.25;

// ---------------------------------------------------------------------------
// Ticket 47 Review F3 — 讓那一圈看起來是火，不是一條發光的蠟框.
//
// Review 量到的三件事，每一件在這裡都有一個常數對應：
//   ① 82–87% 的帶子像素 alpha 就是上限 0.95（拐點 0.28 太低，turb ≥ 0.10 就飽和），
//      所以噪音在帶子的內半部等於沒有作用，畫出來是一塊不透明的實心物。
//   ② 熱源的根部是一條完美的圓角矩形距離線，而真火的根部是參差的。
//   ③ 白熱推白 0.55 把粉卡與紫卡推成糖果色霓虹管，看不到琥珀核心。
// 外加動態：帶子只有輪廓在晃，主火 200ms 就換一次形狀。
// ---------------------------------------------------------------------------

/**
 * 舔邊火的 alpha 拐點：heat 要到這裡才是全不透明.
 *
 * 0.28 是主火的數字，在那裡是對的 —— 主火 44px 高、大半是低熱，0.28 才看得到它
 * 微弱的外緣。舔邊火只有十幾 px、整條貼著自己的燃料，heat 中位數約 0.93，除以
 * 0.28 之後每一個像素都撞在 0.95 的天花板上。
 *
 * 第一輪試過 0.55「看起來沒差」——當然沒差，0.93 / 0.55 還是飽和；那不是「這條
 * 旋鈕沒用」，是沒轉夠。1.0 配上下面壓低的 heat，飽和的比例才降到可以接受。
 */
export const EDGE_FLAME_ALPHA_KNEE = 1.0;
/** heat 的常數項（主火是 0.42）。壓低是為了讓 `EDGE_FLAME_ALPHA_KNEE` 有意義。 */
export const EDGE_FLAME_BASE = 0.32;
/** heat 隨噪音變化的幅度（主火是 1.42）。這一項才是「噪音有沒有在作用」。 */
export const EDGE_FLAME_GAIN = 1.05;
/**
 * 核心推向白色的力道（主火是 0.55）。
 * Review：粉卡與紫卡的帶子現在是糖果色霓虹管，票面要的「專屬色 ＋ 琥珀核心 0.35」
 * 在畫面上只看得到一條白芯。0.20 讓 ramp 的顏色回到畫面上。
 */
export const EDGE_FLAME_WHITE_PUSH = 0.2;
/**
 * 根部沿著邊「咬進咬出」的幅度，px.
 *
 * 熱源的根是 `sdCard` —— 一條幾何完美的圓角矩形線。真火的根在燃料線上是參差的
 * （主火的參差來自燒穿前緣，舔邊火沒有那個來源）。把距離沿著邊用一個低頻噪音
 * 推進推出 ±3px，根部就不再是一條刀切的線。
 *
 * 閘（`outside`）用的仍然是**沒有被推過的** `sdCard`，所以不論噪音怎麼取值，
 * 卡面上永遠是 0 —— 票面那條「不得遮開啟面」的保證沒有被這個效果鬆動。
 */
export const EDGE_FLAME_ROOT_WIGGLE_PX = 3;
/** 根部噪音的頻率：每 ~18 卡片 px 一個起伏。 */
export const EDGE_FLAME_ROOT_FREQ = 0.055;
/**
 * 舔邊火的時間倍率.
 *
 * `fbm` 的捲動速度是定在它自己的座標裡的，所以把 `p` 放大 `EDGE_FLAME_NOISE_SCALE`
 * 倍之後，火舌在**螢幕上**的移動速度反而變成主火的 1/2.6。Review 看到的就是這個：
 *「主火在 200ms 內整個換了形狀，外面那條帶子只是輪廓輕輕晃了一下」。把時間乘回
 * 同一個倍率，兩支火就以同一個 px/s 在動，看起來才是同一團火。
 */
export const EDGE_FLAME_TIME_SCALE = 2.6;
/**
 * 舔邊火看的是同一組 FBM，但要看得細一點.
 *
 * The burn's flame is 44px tall and its shape also comes from the front it
 * stands on, which is already ragged; the rim's source is a perfectly smooth
 * band 16px deep, so the NOISE is the only thing that can give it a shape. At
 * the burn's own frequency one feature spans about 55 card px, which is three
 * of them along the top of a 191px card — and three slow bumps in a 16px band
 * is not a row of tongues, it is a glowing border with wavy edges. That is
 * exactly what the first frozen frames showed (followup-47/evidence, the 300ms
 * and 2000ms shots of the first pass). Sampling the same FBM 2.6× finer puts a
 * feature every ~21px, which is eight or nine tongues along that edge.
 */
export const EDGE_FLAME_NOISE_SCALE = 2.6;
/**
 * 舔邊火淡入的時間. Without it the whole rim ignites in the first frame, before
 * the burn front has gone anywhere, and the card reads as「一開始就有一圈火」
 * rather than as paper catching.
 */
export const EDGE_FLAME_RISE_MS = 500;

/**
 * Review F1 — 卡片的盒子多久才重量一次，毫秒.
 *
 * The card's box is NOT a constant: `.starlit-content` animates its width for
 * 1.2–1.7s after the works tab is entered, and a click inside that window used
 * to leave the shader's `uCard` describing a card 160px narrower than the real
 * one — with the whole right-hand band of rim fire drawn across the summary.
 * A `ResizeObserver` fixes that, but it fires once per animation frame, and
 * putting the box back in step means rebuilding the burn-time field (a flood
 * over ~22k cells). 100ms is the ≤10Hz the Review asked for: seventy rebuilds
 * over that animation become twelve, and the geometry is never more than one
 * tenth of a second behind. The trailing call matters as much as the throttle —
 * without it the LAST size, the one that stays on screen, is the one dropped.
 */
export const EMBER_RESIZE_THROTTLE_MS = 100;

/**
 * Signed distance from `(x, y)` to a rounded rectangle whose top-left is the
 * origin — negative inside, positive outside, in CSS px. This is the JS twin of
 * `sdCard` in the fragment shader below and the two are kept line for line, so
 * lib/ember-fire-gl.test.ts can pin the field the GPU actually evaluates.
 */
export const roundRectDistance = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = EMBER_CARD_RADIUS_PX,
): number => {
  const hx = width / 2;
  const hy = height / 2;
  const r = Math.min(radius, Math.min(hx, hy));
  const qx = Math.abs(x - hx) - (hx - r);
  const qy = Math.abs(y - hy) - (hy - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

/** `smoothstep`, GLSL's, so the two implementations cannot drift. */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * 舔邊火的旋鈕，全部可以從外面換掉 —— 單元測試就是靠這個把噪音固定住。
 *
 * Review F8 — `wiggle` 與 `lean` 是這一輪補上的：著色器裡它們是噪音，JS 這一側
 * 是參數，預設 0。這樣「JS 是著色器的雙胞胎」才是真的（上一輪的註解寫「兩邊逐行
 * 對齊」，但著色器多一個側傾噪音，JS 沒有，說得太滿）。噪音本身仍然只有著色器
 * 有：把 `fbm` 在 JS 重寫一份，兩邊就會慢慢漂走，而測試要釘的正是不含噪音的骨架。
 */
export type EdgeFlameOptions = {
  radius?: number;
  reach?: number;
  lift?: number;
  samples?: number;
  margin?: number;
  carve?: number;
  /** 根部沿邊「咬進咬出」的位移，px。著色器用低頻噪音給，範圍 ±ROOT_WIGGLE。 */
  wiggle?: number;
  /** 往下探時每一步的側傾，px。著色器用另一個低頻噪音給。 */
  lean?: number;
  base?: number;
  gain?: number;
  bias?: number;
  knee?: number;
};

/** 熱源帶：1 貼著卡片邊，0 在 `reach` px 之外。卡面上（距離 ≤ 0）一律算 1，
 *  因為卡面是「還在燒的紙」——只有取樣點會落在那裡，畫出來的片段不會。
 *  `wiggle` 把那條距離線沿著邊推進推出（Review F3(b)），正值＝根部往外咬出去。 */
const edgeBand = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  reach: number,
  wiggle = 0,
): number =>
  Math.pow(
    1 -
      smoothstep(
        0,
        reach,
        Math.max(roundRectDistance(x, y, width, height, radius) - wiggle, 0),
      ),
    EDGE_FLAME_FALLOFF,
  );

/**
 * The edge flame's heat SOURCE at a point, 0..1 — the band itself, or whatever
 * the fragment can find of it below itself, whichever is stronger.
 *
 * Looking downward is the whole of「重力方向固定、火舌向上」: above the top edge
 * the probe walks into the card and comes back with a full reading, beside the
 * left and right edges it keeps finding the same band it is already in, and
 * below the bottom edge it only ever finds weaker readings.
 */
export const edgeFlameSource = (
  x: number,
  y: number,
  width: number,
  height: number,
  options: EdgeFlameOptions = {},
): number => {
  const radius = options.radius ?? EMBER_CARD_RADIUS_PX;
  const reach = options.reach ?? EDGE_FLAME_REACH_PX;
  const lift = options.lift ?? EDGE_FLAME_LIFT_PX;
  const samples = options.samples ?? EDGE_FLAME_SAMPLES;
  const margin = options.margin ?? EDGE_FLAME_MARGIN_PX;
  const wiggle = options.wiggle ?? 0;
  const lean = options.lean ?? 0;
  let sum = 0;
  let norm = 0;
  for (let k = 1; k <= samples; k += 1) {
    const t = k / samples;
    const weight = Math.pow(1 - t * 0.9, 1.4);
    sum += edgeBand(x + lean * t, y + t * lift, width, height, radius, reach, wiggle) * weight;
    norm += weight;
  }
  const below = norm ? sum / norm : 0;
  const src = clamp(
    Math.max(edgeBand(x, y, width, height, radius, reach, wiggle), below),
    0,
    1,
  );
  // …and the same window the shader closes the canvas's own boundary with, so
  // no tongue is ever cut square at the edge of the drawing buffer.
  const ed = roundRectDistance(x, y, width, height, radius);
  return src * (1 - smoothstep(margin - 5, margin - 1, ed));
};

/**
 * The edge flame's HEAT at a point — the source, carved by the turbulence, and
 * then held to zero on the card's own face.
 *
 * `turb` is the shader's `fbm` reading, passed in rather than recomputed: the
 * noise is the one thing here that is not worth reproducing in JS, and holding
 * it still is exactly what a unit test wants. The arithmetic around it is the
 * same as the main flame's, so the two read as one fire.
 *
 * 票面「不得蓋到卡面」的保證就是最後那一個 gate：`ed ≤ 0` 的每一點都回 0，
 * 不論噪音取什麼值。
 */
export const edgeFlameHeat = (
  x: number,
  y: number,
  width: number,
  height: number,
  turb = 0.5,
  options: EdgeFlameOptions & { soft?: number } = {},
): number => {
  const radius = options.radius ?? EMBER_CARD_RADIUS_PX;
  const soft = options.soft ?? EMBER_GL_EDGE_SOFT_PX;
  // 閘用的是**沒有被 wiggle 推過的**距離：不論根部的噪音怎麼取值，卡面上永遠是 0。
  const outside = smoothstep(0, soft, roundRectDistance(x, y, width, height, radius));
  if (outside <= 0) return 0;
  const carve = options.carve ?? EDGE_FLAME_CARVE;
  const base = options.base ?? EDGE_FLAME_BASE;
  const gain = options.gain ?? EDGE_FLAME_GAIN;
  const bias = options.bias ?? FLAME_BIAS;
  const src = edgeFlameSource(x, y, width, height, options);
  const heat = clamp(src * (base + gain * turb) - bias - (1 - turb) * (1 - src) * carve, 0, 1.4);
  return heat * outside;
};

/**
 * 舔邊火畫出來的 alpha，0..0.95。
 *
 * Review F3(a) 量的就是這個數字的分佈：上一輪四條邊有 82–87% 的取樣點直接貼在
 * 0.95 的上限，也就是說帶子幾乎整條都是不透明的，噪音在內半部完全沒有作用。
 * `lib/ember-fire-gl.test.ts` 現在把「飽和比例」釘成一條斷言，把拐點調回 0.28
 * 就會紅。
 */
export const edgeFlameAlpha = (
  x: number,
  y: number,
  width: number,
  height: number,
  turb = 0.5,
  options: EdgeFlameOptions & { soft?: number } = {},
): number =>
  clamp(edgeFlameHeat(x, y, width, height, turb, options) / (options.knee ?? EDGE_FLAME_ALPHA_KNEE), 0, 0.95);

/**
 * `uEdge` — how strongly the edge flames are drawn at `elapsed` ms.
 *
 * **Ticket 48 — 0, always.** 使用者 2026-09-19：「卡片膜燒穿轉場保持；轉場期間
 * 不畫外側火焰。完全展開、轉場結束後，最外圍持續微微燃燒」. That reverses both
 * halves of Ticket 47's answer: the burn must NOT grow flames outside the card,
 * and the outside fire the user does want belongs to a card that has finished
 * opening — a state this canvas does not exist in. StarlitEmberFire mounts on
 * `data-burning` and unmounts when the burn ends (it has to: the context budget
 * is three and an open card must cost nothing), so「開完之後」cannot be drawn
 * from here without holding a WebGL context and a rAF loop open for the rest of
 * the session, per open card. 2026-09-19 最新修訂已撤回外凸火舌，
 * 落定後只保留 components/starlit-shell.css 的明暗流動框。
 *
 * This is the whole seam. The shader keeps the rim branch behind
 * `if (uEdge > 0.001)` — a uniform, so every fragment takes the same side of it
 * and a rim that is never asked for costs nothing per pixel — and the branch
 * stays in the file because 47's answer is one user sentence away from coming
 * back. Flipping this function is how it comes back.
 *
 * `mode` and `elapsedMs` are still taken so the call site in
 * components/starlit-shell.tsx does not have to change shape for that.
 */
export const edgeFlameStrength = (_mode: 'burn' | 'close', _elapsedMs: number): number => 0;

/** `uCard`: the card's size, its corner radius and the edge flames' reach. */
export const packCard = (
  width: number,
  height: number,
  radius: number = EMBER_CARD_RADIUS_PX,
  reach: number = EDGE_FLAME_REACH_PX,
): Float32Array => new Float32Array([width, height, radius, reach]);

// ---------------------------------------------------------------------------
// Size budget — Ticket 45.5.
// ---------------------------------------------------------------------------

/** 解析度上限：2× DPR. */
export const EMBER_GL_MAX_DPR = 2;
/** …and never more than this many DEVICE pixels across, whatever the DPR. */
export const EMBER_GL_MAX_PIXEL_WIDTH = 900;
/** 同時最多 3 個 fire context（3D 舞台自己另有一個 webgl2）. */
export const EMBER_GL_MAX_CONTEXTS = 3;

export type GlSize = {
  /** The DPR actually used after both caps. */
  dpr: number;
  /** Drawing-buffer size in device px. */
  pixelWidth: number;
  pixelHeight: number;
};

/**
 * The drawing-buffer size for a card `width × height` CSS px on a screen with
 * `dpr`. Two caps, in order: the DPR itself never goes past 2, and the buffer
 * never goes past 900 device px wide — a 4K phone held sideways would otherwise
 * ask for a 2160px-wide flame nobody can see.
 */
export const clampGlSize = (width: number, height: number, dpr: number): GlSize => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  let ratio = Math.min(EMBER_GL_MAX_DPR, dpr > 0 ? dpr : 1);
  if (safeWidth * ratio > EMBER_GL_MAX_PIXEL_WIDTH) ratio = EMBER_GL_MAX_PIXEL_WIDTH / safeWidth;
  return {
    dpr: ratio,
    pixelWidth: Math.max(1, Math.round(safeWidth * ratio)),
    pixelHeight: Math.max(1, Math.round(safeHeight * ratio)),
  };
};

// ---------------------------------------------------------------------------
// Context attributes — Ticket 45 Review 3(b).
// ---------------------------------------------------------------------------

/**
 * The flag that turns the measurement machinery on. It is a window global so a
 * harness can set it with `page.addInitScript` before anything on the page
 * runs; nothing in the product ever sets it.
 */
export const EMBER_GL_CAPTURE_FLAG = '__starlitEmberCapture';

/**
 * The WebGL context attributes for a fire canvas.
 *
 * `preserveDrawingBuffer` is the whole reason this is a function. It is what
 * lets a harness screenshot a WebGL canvas and `drawImage` it into a 2D one,
 * and both of those are how every pixel measurement in this ticket is taken —
 * but it also forces the browser to keep the drawing buffer after compositing,
 * which on a tile-based mobile GPU means an extra full-canvas copy per frame
 * per card. Three cards at up to 900 device px wide is not a bill a phone
 * should pay so that a test can see something. So it defaults to FALSE and the
 * harness opts in.
 */
export const emberGlContextAttributes = (capture = false): WebGLContextAttributes => ({
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: capture,
  powerPreference: 'low-power',
});

// ---------------------------------------------------------------------------
// Blend setup — Ticket 45.1「加色混合」.
// ---------------------------------------------------------------------------

/** `WebGLRenderingContext.BLEND`. */
export const GL_BLEND = 0x0be2;
/** `WebGLRenderingContext.ONE`. */
export const GL_ONE = 1;
/** `WebGLRenderingContext.ONE_MINUS_SRC_ALPHA`. */
export const GL_ONE_MINUS_SRC_ALPHA = 0x0303;

/**
 * The one blend mode this layer is allowed to use.
 *
 * The shader emits PREMULTIPLIED alpha, so `ONE, ONE_MINUS_SRC_ALPHA` is the
 * correct "over" — and because a premultiplied colour may carry rgb LARGER than
 * its alpha, the same equation doubles as additive where the flame is hottest:
 * the destination gets `src.rgb + dst × (1 − src.a)`, and an rgb of 1.8 with an
 * alpha of 0.9 adds light. That is what makes the core read white-hot.
 *
 * Switching this to the ordinary `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` multiplies an
 * already-premultiplied colour by its alpha a second time: the fire goes dull,
 * the core stops being white, and the harness's white-hot assertion fails. That
 * is the red test.
 */
export const blendSetup = () => ({
  cap: GL_BLEND,
  src: GL_ONE,
  dst: GL_ONE_MINUS_SRC_ALPHA,
  premultiplied: true as const,
});

// ---------------------------------------------------------------------------
// Uniform packing. Pure, so the test can pin every number the GPU is handed.
// ---------------------------------------------------------------------------

/** 邊緣柔化 1px（票面 45.1）. */
export const EMBER_GL_EDGE_SOFT_PX = 1;
/** `uBands`: char width, ember width, soft edge — all CSS px. */
export const packBands = (): Float32Array =>
  new Float32Array([CHAR_BAND_PX, EMBER_BAND_PX, EMBER_GL_EDGE_SOFT_PX]);

/**
 * How far below itself a fragment looks for burning paper, and the scale the
 * heat falls off over. It is NOT the tongue height: the noise then carves the
 * flame back, harder the higher it goes, so the tongues that actually get
 * measured come out around two thirds of this. 46 puts them in the middle of
 * Ticket 41.4's 16–40px, and the harness reports the real figure every run at
 * both widths.
 */
export const FLAME_HEIGHT_PX = 44;
/**
 * 熱源只取燃燒前緣「已燒掉」那一側的這幾 px（v4 的 HEAT_SEED_BAND_PX 是 4）.
 *
 * It is 8 here and not 4 for a reason that cost a screenshot to find: the
 * shader looks for its source by taking `FLAME_SAMPLES` steps straight down,
 * and if the step is not comfortably SMALLER than the band, a fragment finds
 * the band only when one of its samples happens to land inside it. The result
 * is a topographic map — a dozen thin concentric rings spaced exactly one step
 * apart, which is the most electronic-looking thing imaginable. With the band
 * at 8px and the step at ~2px every fragment near the front sees it.
 */
export const FLAME_SEED_BAND_PX = 8;
/** Heat below this is nothing at all — the tongue's tip. */
export const FLAME_BIAS = 0.12;
/** How many times the shader probes downward for a source. The step it implies
 *  (`FLAME_HEIGHT_PX / (FLAME_SAMPLES - 1)`) must stay well under
 *  `FLAME_SEED_BAND_PX`, or the search aliases into rings — see that constant. */
export const FLAME_SAMPLES = 20;

export const packFlame = (): Float32Array =>
  new Float32Array([FLAME_HEIGHT_PX, FLAME_SEED_BAND_PX, FLAME_BIAS]);

/**
 * The card's four tints plus the char colour derived from `deep`, as 0..1
 * floats in shader order: hot, light, base, deep, char. The caller passes the
 * ramp it has ALREADY run through `warmRamp` — this file never decides how warm
 * the core is, it only carries the numbers across.
 */
export const packRamp = (ramp: EmberRamp): Float32Array => {
  const char = charColour(ramp.deep);
  const out = new Float32Array(15);
  const put = (at: number, rgb: Rgb) => {
    out[at] = rgb[0] / 255;
    out[at + 1] = rgb[1] / 255;
    out[at + 2] = rgb[2] / 255;
  };
  put(0, ramp.hot);
  put(3, ramp.light);
  put(6, ramp.base);
  put(9, ramp.deep);
  put(12, char);
  return out;
};

/** `uRect` / `uField`: the card-space rectangle a quad (or the field) covers. */
export const packRect = (
  originX: number,
  originY: number,
  spanX: number,
  spanY: number,
): Float32Array => new Float32Array([originX, originY, spanX, spanY]);

export type FrameUniforms = {
  /** The burn threshold this frame, in the field's px-equivalent units. */
  threshold: number;
  /** Elapsed time in SECONDS — the shader scrolls its noise with it. */
  seconds: number;
  /** 0.8s tail, 1 → 0. */
  fade: number;
  /** The card's stable seed, so two cards never flicker in step. */
  seed: number;
  /** 1 while rendering the flame-only probe the harness reads back. */
  flameOnly: boolean;
};

/** `[threshold, seconds, fade, seed, flameOnly]` — the whole per-frame state. */
export const packFrameUniforms = (u: FrameUniforms): Float32Array =>
  new Float32Array([
    u.threshold,
    u.seconds,
    clamp(u.fade, 0, 1),
    // Wrapped, because a raw card seed is ~10^5 and `sin(10^5)` in mediump is
    // noise of the wrong kind.
    (u.seed % 1000) / 1000,
    u.flameOnly ? 1 : 0,
  ]);

// ---------------------------------------------------------------------------
// The burn-time field as a texture.
// ---------------------------------------------------------------------------

/**
 * A value no threshold ever reaches lives in the field as 1e9 (the frame of
 * cells that must never burn, so every level set stays a closed loop). Packed,
 * it becomes 255 — still past every threshold, because the scale below always
 * leaves headroom over the largest threshold the burn will ever use.
 */
const NEVER_AT = 1e8;

export type PackedField = {
  /** Two bytes per cell — high, low — row 0 = the TOP of the padded grid.
   *  Uploaded as LUMINANCE_ALPHA with NEAREST filtering. */
  data: Uint8Array;
  /** The same field, one byte per cell, uploaded as LUMINANCE with LINEAR.
   *  See the note on the shader's two readers for why both exist. */
  coarse: Uint8Array;
  width: number;
  height: number;
  /** Multiply an unpacked 0..1 sample by this to get the burn time in px. */
  scale: number;
  /** Card-space top-left of the texture's rectangle. */
  origin: [number, number];
  /** Card-space size of the texture's rectangle. */
  span: [number, number];
};

/**
 * 16-bit, as LUMINANCE_ALPHA: the high byte in L, the low byte in A.
 *
 * One byte was tried first and it is the reason this comment exists. A single
 * byte puts the field on a ladder about 1.3px apart, and the error that ladder
 * introduces is a FUNCTION OF THE VALUE — so it is constant along every
 * iso-contour of the field, and the fire draws itself as a topographic map:
 * a dozen concentric rings following the burn front, one per quantisation step.
 * (followup-45/evidence/look has the screenshots; a per-pixel dither big enough
 * to hide them was ±3px, which turns the flame to sand.)
 *
 * Two bytes bring the step to 0.005px, which nothing can see. The price is that
 * the hardware's LINEAR filter cannot be used on the pair — it would interpolate
 * the high byte and the low byte separately, and every place the high byte steps
 * the reconstruction falls off a cliff. So the shader does its own bilinear from
 * four texel-CENTRE samples, where a LINEAR filter returns the texel exactly;
 * see `burnPrecise` in the fragment shader. The coarse, single-tap read of the
 * high byte alone stays for the flame's downward march, where the value only
 * feeds a saturating mask and 1px of error cannot be seen.
 */
export const packBurnField = (field: BurnField, headroom = 1.15): PackedField => {
  const { cols, rows, cell, margin, time } = field;
  let maxFinite = 0;
  for (let k = 0; k < time.length; k += 1) {
    const t = time[k];
    if (t < NEVER_AT && t > maxFinite) maxFinite = t;
  }
  const scale = Math.max(maxFinite, field.max * headroom, 1);
  const data = new Uint8Array(cols * rows * 2);
  const coarse = new Uint8Array(cols * rows);
  for (let k = 0; k < time.length; k += 1) {
    const t = time[k];
    if (t >= NEVER_AT) {
      data[k * 2] = 255;
      data[k * 2 + 1] = 255;
      coarse[k] = 255;
      continue;
    }
    // The split is `high / 255 + low / 255²`, not `(high · 256 + low) / 65535`,
    // because that is the arithmetic a sampler hands the shader for free: a
    // LUMINANCE_ALPHA texel arrives as two floats already divided by 255.
    const n = Math.min(1, Math.max(0, t / scale));
    const high = Math.min(255, Math.floor(n * 255));
    const low = Math.min(255, Math.round((n * 255 - high) * 255));
    data[k * 2] = high;
    data[k * 2 + 1] = low;
    coarse[k] = Math.min(255, Math.round(n * 255));
  }
  return {
    data,
    coarse,
    width: cols,
    height: rows,
    scale,
    origin: [-margin, -margin],
    span: [cols * cell, rows * cell],
  };
};

/** The inverse of what `packBurnField` writes into one cell, and the exact
 *  arithmetic `burnPrecise` does in the shader. */
export const unpackBurnValue = (high: number, low: number, scale: number): number =>
  (high / 255 + low / (255 * 255)) * scale;

// ---------------------------------------------------------------------------
// Ember dots and sparks, as GL point sprites.
// ---------------------------------------------------------------------------

export type GlPoint = { x: number; y: number; size: number; alpha: number };

/** `[x, y, size, alpha]` per point, in card px. */
export const packPoints = (points: readonly GlPoint[]): Float32Array => {
  const out = new Float32Array(points.length * 4);
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    out[i * 4] = p.x;
    out[i * 4 + 1] = p.y;
    out[i * 4 + 2] = p.size;
    out[i * 4 + 3] = clamp(p.alpha, 0, 1);
  }
  return out;
};

// ---------------------------------------------------------------------------
// The shaders. WebGL1 / GLSL ES 1.0 — no `in`/`out`, no dynamic loop bounds.
// ---------------------------------------------------------------------------

/**
 * A fullscreen quad. `vUv.y = 0` is the TOP of what is drawn, which is the
 * opposite of `gl_FragCoord.y`: the card's own coordinates run downward and
 * every number in the field, the bands and the flame is in those coordinates.
 */
export const EMBER_GL_VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const EMBER_GL_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;

uniform vec4 uRect;        // card-space rect this quad covers: origin.xy, span.xy
uniform vec4 uField;       // card-space rect the field texture covers
uniform sampler2D uFieldMap;
uniform sampler2D uFieldCoarse;
uniform float uFieldScale; // packed 0..1 -> burn time in px
uniform vec2 uFieldSize;   // the field texture's size in texels
uniform vec3 uBands;       // char px, ember px, soft px
uniform vec3 uFlame;       // tongue height px, seed band px, bias
uniform vec3 uHot;
uniform vec3 uLight;
uniform vec3 uBase;
uniform vec3 uDeep;
uniform vec3 uChar;
uniform float uThreshold;
uniform float uTime;
uniform float uFade;
uniform float uSeed;
uniform float uFlameOnly;
uniform vec4 uCard;        // Ticket 47: card width, height, corner radius, edge reach
uniform float uEdge;       // Ticket 47: the edge flames' strength this frame, 0..1

const int FLAME_SAMPLES = ${FLAME_SAMPLES};
const int EDGE_SAMPLES = ${EDGE_FLAME_SAMPLES};
const float EDGE_LIFT_PX = ${EDGE_FLAME_LIFT_PX.toFixed(1)};
const float EDGE_MARGIN_PX = ${EDGE_FLAME_MARGIN_PX.toFixed(1)};
const float EDGE_CARVE = ${EDGE_FLAME_CARVE.toFixed(2)};
const float EDGE_FALLOFF = ${EDGE_FLAME_FALLOFF.toFixed(2)};
const float EDGE_NOISE = ${EDGE_FLAME_NOISE_SCALE.toFixed(2)};
const float EDGE_TIME = ${EDGE_FLAME_TIME_SCALE.toFixed(2)};
const float EDGE_KNEE = ${EDGE_FLAME_ALPHA_KNEE.toFixed(2)};
const float EDGE_BASE = ${EDGE_FLAME_BASE.toFixed(2)};
const float EDGE_GAIN = ${EDGE_FLAME_GAIN.toFixed(2)};
const float EDGE_WHITE = ${EDGE_FLAME_WHITE_PUSH.toFixed(2)};
const float EDGE_WIGGLE = ${EDGE_FLAME_ROOT_WIGGLE_PX.toFixed(1)};
const float EDGE_ROOT_FREQ = ${EDGE_FLAME_ROOT_FREQ.toFixed(3)};

// --- noise -----------------------------------------------------------------
// One hash, one smoothstep-interpolated value noise, and an FBM of three
// octaves. The octaves are the whole point of this ticket: each one scrolls
// upward at its OWN speed and its OWN scale, which is what turns a smooth
// gradient into tongues that curl, split and die. Take the octaves away and the
// flame becomes a featureless band — that is what the red test does.
// Hoskins' hash, not the usual sin(dot(...)) one. The lattice points this is
// asked about are INTEGERS, and a hash built on small multipliers repeats
// itself every few dozen of them — which the flame shows as a comb of thin
// lines fanning out of the burn front.
float hash21(vec2 p) {
  vec3 q = fract(vec3(p.x, p.y, p.x) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 2-3 octaves of FBM scrolling upward at different speeds and scales.
// p is in CARD PIXELS; the scroll is in px/s, so the tongues rise at a speed
// that means something on screen instead of a speed that means something in
// lattice units.
float fbm(vec2 p, float t, float seed) {
  // v5.1 — ANISOTROPIC. The y coordinate is squashed before the noise is
  // sampled, so every feature the noise makes is a bit over twice as tall as it
  // is wide. Review's aesthetic verdict on v5 was that the fire had stopped
  // being pixel art but had become foam: three isotropic octaves make round
  // blobs, and round blobs stacked along a burning edge read as cloud, not as
  // flame. Stretching the noise vertically is the whole of the fix — one
  // multiply — and it is what makes a tongue a tongue.
  // The x factor also widens everything. Squashing y alone made the tongues
  // TALL AND ONE PIXEL WIDE — which is what「一根一根」asked for, taken far
  // enough that their tips came back as isolated bright pixels on Review F4's
  // grain metric (5.4 per thousand on the 390 gold card at 800ms, against a
  // limit of 3). Scaling x by 0.62 as well keeps the same 1 : 0.45 anisotropy
  // while making a tongue several pixels across, which is what a tongue is.
  vec2 q = vec2(p.x * 0.62, p.y * 0.279);
  float sum = 0.0;
  // The top octave carries the least weight of the three on purpose: it is the
  // one that decides how FINE the flame's detail is, and at 0.16 the tips of
  // the tongues came out one pixel wide — bright strokes against dark, which is
  // exactly what Review F4's grain metric counts, and what the eye reads as
  // sand. Most of the shape should come from the two coarser octaves.
  sum += 0.60 * vnoise((q + vec2(0.0, t * 150.0 * 0.279)) * 0.0295 + seed);
  sum += 0.30 * vnoise((q + vec2(9.0, t * 245.0 * 0.279)) * 0.0605 + seed * 1.7);
  sum += 0.10 * vnoise((q + vec2(-6.0, t * 390.0 * 0.279)) * 0.1150 + seed * 2.9);
  return sum;
}

// --- the burn-time field ----------------------------------------------------
// Two reads of the same texture, for two jobs with very different tolerances.
//
// burnPrecise is the one everything visible hangs on: the char band, the
// ember band, and how far the fragment is from the burning front. It rebuilds
// the 16-bit value by hand from four texel-CENTRE samples (a LINEAR filter
// returns a texel exactly when you ask for its centre) and interpolates them
// itself, because letting the hardware interpolate a high byte and a low byte
// separately falls off a cliff at every high-byte step. Result: a step of
// 0.005px, which is to say none.
//
// burnCoarse is one tap of the high byte, 1.3px of error, and it is used only
// by the flame's downward march, where the value feeds a saturating mask and
// nothing can see the difference.
// One cheap tap, hardware-filtered, one byte of range — plus a dither of one
// quantisation step. The march below reads the field twenty times per fragment
// and four taps each would be eighty; it does not need the precision, because
// its twenty readings are SUMMED and the dither averages out. What it must not
// have is a quantisation ladder, because that is constant along every contour
// and draws rings.
float burnCoarse(vec2 p, float salt) {
  vec2 uv = clamp((p - uField.xy) / uField.zw, 0.0, 1.0);
  float lsb = uFieldScale * (1.0 / 255.0);
  // v5.1: a SMOOTH dither, not a per-pixel hash.
  //
  // v5 used hash21, a different value at every pixel, and Review F4 measured
  // what that cost: isolated bright pixels — a pixel brighter than all four of
  // its neighbours by more than 25 — at 9.72 per thousand lit pixels against
  // v4's 0.084. A hundredfold, and it reads as salt-and-pepper: dry, sandy, and
  // every bit as electronic as the lattice this ticket set out to remove.
  //
  // What the dither has to break up is a SPATIAL ladder (the one-byte
  // quantisation of this texture), and a smooth noise with features every few
  // pixels does that just as well. Being smooth, it cannot produce an isolated
  // bright pixel at all — its value at any pixel is within a hair of its
  // neighbours' by construction. The march's own aliasing, which is what really
  // needed decorrelating, is handled by the start offset in the loop below.
  return texture2D(uFieldCoarse, uv).r * uFieldScale +
    (vnoise(p * 0.37 + salt) - 0.5) * lsb * 1.1;
}

float burnPrecise(vec2 p) {
  vec2 uv = clamp((p - uField.xy) / uField.zw, 0.0, 1.0);
  vec2 texel = uv * uFieldSize - 0.5;
  vec2 base = floor(texel);
  vec2 f = texel - base;
  vec2 inv = 1.0 / uFieldSize;
  vec4 s00 = texture2D(uFieldMap, (base + vec2(0.5, 0.5)) * inv);
  vec4 s10 = texture2D(uFieldMap, (base + vec2(1.5, 0.5)) * inv);
  vec4 s01 = texture2D(uFieldMap, (base + vec2(0.5, 1.5)) * inv);
  vec4 s11 = texture2D(uFieldMap, (base + vec2(1.5, 1.5)) * inv);
  float lo = 1.0 / 255.0;
  float v00 = s00.r + s00.a * lo;
  float v10 = s10.r + s10.a * lo;
  float v01 = s01.r + s01.a * lo;
  float v11 = s11.r + s11.a * lo;
  return mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y) * uFieldScale;
}

// --- the heat ramp ----------------------------------------------------------
// The same stops as lib/ember-fire.ts's heatColour: weighted towards the dark
// end so the near-white core stays the exception it is in a real flame.
// v5.1 — the first knee moved from 0.55 to 0.45. v4 put more than half the
// range into deep→base because its flame lived mostly at low heat; this one
// does not, and the consequence Review measured was that the pink and the
// purple card spent their whole body in their own base tint and read as a
// glowing crack rather than as burning paper. With the knee at 0.45 the body of
// the flame sits in base→light, where the amber core (EMBER_FIRE_CORE_WARMTH,
// unchanged at 0.35) has already warmed the top two steps. Nothing else moves:
// the char is still the card's own deep crushed to near-black, the outer edge
// is still the card's own colour, and the ramp still knows no hue.
vec3 rampColour(float h) {
  if (h < 0.45) return mix(uDeep, uBase, h / 0.45);
  if (h < 0.80) return mix(uBase, uLight, (h - 0.45) / 0.35);
  return mix(uLight, uHot, clamp((h - 0.80) / 0.20, 0.0, 1.0));
}

// premultiplied "over": src is already multiplied by its own alpha.
vec4 over(vec4 src, vec4 dst) {
  return vec4(src.rgb + dst.rgb * (1.0 - src.a), src.a + dst.a * (1.0 - src.a));
}

// --- Ticket 47: the card's own rounded rectangle ----------------------------
// Signed distance, negative inside. Two jobs, and they are opposite sides of
// the same line: the fire that belongs to the BURN is clipped to the inside of
// it (the canvas used to be "border-radius: 18px" and 47 widened the canvas past
// the card, so that clip has to move into the shader or the burn's char rim
// would suddenly show up outside the card), and the flames this ticket adds are
// drawn only OUTSIDE it, so the open face stays readable.
// "half" is a reserved word in GLSL ES, hence "hs".
float sdCard(vec2 q) {
  vec2 hs = uCard.xy * 0.5;
  float r = min(uCard.z, min(hs.x, hs.y));
  vec2 d = abs(q - hs) - (hs - vec2(r));
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// 1 against the card's edge, 0 at "reach" px away from it. Inside the card it
// saturates at 1 — only the downward PROBE ever reads there, and「卡片裡就是
// 還在燒的紙」is exactly the source a tongue above the top edge is fed by.
// Review F3(b) — the root bites in and out. "wiggle" is a low-frequency noise
// along the edge, in px, and it moves the DISTANCE LINE the band grows from, so
// the root stops being a geometrically perfect rounded rectangle. It is applied
// here and here only: the gate in main() that keeps the rim fire off the card
// face reads sdCard directly, so no value of this noise can put flame on the
// open face.
float edgeBand(vec2 q, float reach, float wiggle) {
  return pow(1.0 - smoothstep(0.0, reach, max(sdCard(q) - wiggle, 0.0)), EDGE_FALLOFF);
}

void main() {
  vec2 p = uRect.xy + vUv * uRect.zw;
  float d = burnPrecise(p) - uThreshold;

  float charPx = uBands.x;
  float emberPx = uBands.y;
  float soft = uBands.z;
  float height = uFlame.x;
  float seedBand = uFlame.y;
  float bias = uFlame.z;

  // --- flames -------------------------------------------------------------
  // Look DOWNWARD for burning paper. A source is a pixel within seedBand px
  // BEHIND the front (the burned side) — seeding ahead of it would put flame on
  // top of the char rim, and a black rim with the fire inside it is the single
  // most recognisable thing about burning paper.
  // The march answers ONE question — "is there burning paper below me?" — and
  // nothing else. It deliberately does not decide HOW FAR below, because the
  // march is discrete: weighting each sample by its own step made the flame a
  // staircase in y, and a staircase in a distance field draws itself as
  // concentric contour rings around the hole, one per step. (That is the second
  // ring artefact this shader had; both screenshots are in
  // followup-45/evidence/look.) The distance comes from d, the fragment's own
  // reading of the field, which is continuous everywhere.
  // The column a fragment looks down is displaced sideways by a slow noise, so
  // a tongue leans and curls instead of standing to attention above its own
  // source. The displacement is decided ONCE, for the whole column: bending it
  // per sample (by the sample's own height) puts the discreteness of the march
  // back into the picture, and near a vertical stretch of the front that draws
  // itself as a comb of horizontal lines.
  float lean = (vnoise(vec2(p.x * 0.02, p.y * 0.014 + uTime * 1.4 + uSeed * 5.0)) - 0.5) * 26.0;
  float acc = 0.0;
  float stepPx = height / float(FLAME_SAMPLES - 1);
  // v5.1 — where the march STARTS, jittered by a smooth noise.
  //
  // The twenty steps of this march alias: neighbouring fragments land their
  // samples on the same ladder, and the sum ripples with the step, which draws
  // itself as a comb of contour lines across the tongues. v5 hid that with a
  // per-pixel hash inside every sample, which worked and cost the grain Review
  // F4 measured. Moving the start of the ladder instead, by up to one full step
  // and with a LOW-FREQUENCY noise, decorrelates neighbouring fragments over a
  // few dozen pixels rather than pixel by pixel: the comb still cannot form,
  // and nothing anywhere is brighter than its neighbours.
  float startJitter =
    vnoise(vec2(p.x * 0.055, p.y * 0.055) + uSeed * 13.0 + uTime * 0.35) * stepPx;
  for (int k = 0; k < FLAME_SAMPLES; k++) {
    float off = float(k) * stepPx + startJitter;
    float t = clamp(off / height, 0.0, 1.0);
    float dd = burnCoarse(p + vec2(lean, off), float(k) * 7.3 + uSeed * 19.0) - uThreshold;
    // A SMOOTH bump on the burned side of the front, weighted by how far down
    // the sample had to look, and the samples are SUMMED. All three halves of
    // that sentence are scars. A hard step at dd = 0 makes each sample a
    // rectangular pulse, so the samples draw one hard-edged ring each, along one
    // iso-contour of the field each; a MAX over the samples keeps those edges
    // however soft the pulse is, because the winner changes discontinuously; and
    // the height has to be inside the sum, not applied to the winner, for the
    // same reason. A sum of smooth, smoothly-weighted bumps has none of it.
    acc +=
      smoothstep(-seedBand, -seedBand * 0.45, dd) *
      (1.0 - smoothstep(-1.0, 1.5, dd)) *
      pow(1.0 - t, 1.3);
  }
  // Normalised by the step, so the number of samples is a quality knob and not
  // a brightness knob: too few and the sum ripples with the step (a comb of
  // lines across the tongues), too many and it is only slower.
  //
  // What comes out is both the mask and the vertical falloff, and — this is why
  // it is measured this way rather than from the field distance — it is bounded
  // by FLAME_HEIGHT_PX VERTICALLY. The field distance is perpendicular to the
  // front, so where the front runs at an angle it under-reports the height, and
  // the tongues measured on a slanted stretch came out past Ticket 41.4's 40px
  // ceiling (42px, measured) while the shader thought they were within it.
  float below = clamp((acc * stepPx) / (seedBand * 0.8), 0.0, 1.0);
  float turb = fbm(p, uTime, uSeed);
  // The noise does two jobs. It modulates the brightness, and — the important
  // one — it CARVES: the higher a fragment sits above its source, the more
  // noise it needs to survive at all. That subtraction is what gives a tongue a
  // torn tip and lets one tongue die while the one beside it runs on.
  float heat = clamp(below * (0.42 + 1.42 * turb) - bias - (1.0 - turb) * (1.0 - below) * 1.4, 0.0, 1.4);
  float flameA = clamp(heat / 0.28, 0.0, 0.95);
  float over1 = smoothstep(1.0, 1.45, heat);
  vec3 flameCol = mix(rampColour(heat), vec3(1.0), over1 * 0.55);
  // rgb allowed past alpha: this is the 加色 part, and it is why the core reads
  // white-hot instead of looking like a sticker of a flame.
  vec4 flamePre = vec4(flameCol * flameA * (1.0 + 1.5 * over1), flameA);

  if (uFlameOnly > 0.5) {
    gl_FragColor = flamePre;
    return;
  }

  // --- ember band (6..14px ahead of the front) -----------------------------
  float et = clamp((d - charPx) / (emberPx - charPx), 0.0, 1.0);
  float emberEdge =
    smoothstep(charPx - soft, charPx + soft, d) * (1.0 - smoothstep(emberPx - soft, emberPx + soft, d));
  float flick = vnoise(vec2(p.x * 0.34, p.y * 0.34) + vec2(uTime * 3.1, uTime * 2.3 + uSeed));
  // Fixed in card space, so the band smoulders unevenly in the SAME places all
  // the way through a burn instead of boiling.
  float seeded = 0.72 + 0.56 * vnoise(p * 0.22 + uSeed * 11.0);
  float glow = clamp((1.0 - et) * (1.0 + 0.4 * (flick * 2.0 - 1.0)) * seeded, 0.0, 1.0);
  float emberA = glow * emberEdge;
  vec4 emberPre = vec4(mix(uHot, uBase, et) * emberA, emberA);

  // --- char band (0..6px ahead), composited LAST (Ticket 41 Review F1) -----
  float charEdge =
    smoothstep(-soft, soft * 0.5, d) * (1.0 - smoothstep(charPx - soft, charPx + soft, d));
  // v4 painted the char at 0.97 and thinned it to 0.79 at its outer edge; here
  // it has to be all but opaque, because what is underneath it is no longer an
  // ordinary alpha layer. The flame is additive and its core runs past 1, so
  // three percent of it leaking through the black rim is enough to lift the rim
  // above the「焦邊在每一個方向都要是深色」threshold on exactly the rays that
  // point upward — measured 60.5 against a limit of 60, on the rays at 225° and
  // 270°, which are the two with the most fire above them.
  float charA = (0.995 - 0.05 * clamp(d / charPx, 0.0, 1.0)) * charEdge;
  vec4 charPre = vec4(uChar * charA, charA);

  // Ticket 47 — the burn's own three layers stop at the card's edge. Until this
  // ticket the canvas was the card's size with "border-radius: 18px", so the
  // browser did this; now the canvas reaches EDGE_FLAME_MARGIN_PX px further out
  // on every side and the same cut has to be made here, or the last moments of
  // the burn (when BURN_OVERSHOOT has pushed the front into the field's margin)
  // would paint char and flame outside the card for the first time ever.
  float inside = 1.0 - smoothstep(-soft, 0.0, sdCard(p));
  vec4 res = over(charPre, over(emberPre, flamePre)) * inside * uFade;

  // --- Ticket 47 — 沿卡片四邊往外舔的火 -------------------------------------
  // Same shader family as the burn: the same anisotropic FBM, the same ramp (so
  // the same 專屬色 and the same amber core), the same additive premultiplied
  // output. What differs is only where the heat comes from — a distance-to-edge
  // band instead of the burn-time field — and that it is gated to the outside.
  //
  // Ticket 48: uEdge is 0 at every time in both modes (see edgeFlameStrength
  // above this string), so nothing below this line is drawn.
  vec4 edgePre = vec4(0.0);
  if (uEdge > 0.001) {
    float reach = uCard.w;
    float ed = sdCard(p);
    float outside = smoothstep(0.0, soft, ed);
    if (outside > 0.0) {
      // The column a fragment looks down leans, exactly as the burn's does, so
      // a tongue curls instead of standing to attention on its own bit of rim.
      // The lean is faster and shorter than the burn's (0.02 / 26px): the rim's
      // tongues are one fifth the height and stand a couple of dozen px apart,
      // so a slow 26px sway moves whole groups of them sideways together — which
      // reads as the band sliding, not as tongues curling.
      float eLean = (vnoise(vec2(p.x * 0.07, p.y * 0.04 + uTime * 1.7 + uSeed * 9.0)) - 0.5) * 9.0;
      // Review F3(b) — the root's own noise, low frequency ALONG the edge (one
      // feature every ~18 card px) and drifting with the same clock as the rest
      // of the rim. Every sample of the band is taken through it, so a tongue
      // and the root it stands on bite in and out together.
      float eWig =
        (vnoise(p * EDGE_ROOT_FREQ + vec2(uSeed * 7.0, uTime * 0.9)) - 0.5) * 2.0 * EDGE_WIGGLE;
      float lift = 0.0;
      float liftNorm = 0.0;
      for (int k = 1; k <= EDGE_SAMPLES; k++) {
        float t = float(k) / float(EDGE_SAMPLES);
        float weight = pow(1.0 - t * 0.9, 1.4);
        lift += edgeBand(p + vec2(eLean * t, t * EDGE_LIFT_PX), reach, eWig) * weight;
        liftNorm += weight;
      }
      lift /= liftNorm;
      float src = clamp(max(edgeBand(p, reach, eWig), lift), 0.0, 1.0);
      // Nothing may be cut square at the canvas's own boundary. The tallest
      // tongues live past the band (they are fed by what is below them), and
      // measured they reach about 19 of the 20px the canvas has — one bad frame
      // away from a straight line across their tips. This window takes the last
      // few px away smoothly instead; what it removes is the faintest 3% of the
      // flame, and what it buys is that the margin can never show a seam.
      src *= 1.0 - smoothstep(EDGE_MARGIN_PX - 5.0, EDGE_MARGIN_PX - 1.0, ed);
      // Offset into the noise so the rim's tongues are not the burn's tongues
      // translated — two fires on one card that move in step read as one sheet.
      // Offset into the noise so the rim's tongues are not the burn's tongues
      // translated — two fires on one card that move in step read as one sheet.
      // Review F3(e): the TIME is scaled by the same factor as the space, so the
      // rim's features travel the same card-px per second as the burn's. Without
      // that the rim reshapes 2.6× slower than the fire it belongs to, which is
      // exactly what「帶子像液體在流，不像火在跳」was.
      float eturb = fbm(p * EDGE_NOISE + vec2(0.0, 37.0), uTime * EDGE_TIME, uSeed + 0.37);
      float eheat =
        clamp(
          src * (EDGE_BASE + EDGE_GAIN * eturb) - bias - (1.0 - eturb) * (1.0 - src) * EDGE_CARVE,
          0.0,
          1.4
        ) * outside;
      // Review F3(a) — the knee is the rim's own, not the burn's 0.28. Through
      // 0.28 every pixel of a band this shallow sat on the 0.95 ceiling (82–87%
      // of them, measured), so the noise did nothing in the inner half and the
      // result was an opaque ribbon. See EDGE_FLAME_ALPHA_KNEE.
      float ea = clamp(eheat / EDGE_KNEE, 0.0, 0.95) * uEdge;
      float eover = smoothstep(1.0, 1.45, eheat);
      // Review F3(c) — 0.55 pushed pink and purple all the way to candy neon and
      // buried the amber core the user picked. 0.20 leaves the ramp visible.
      vec3 ecol = mix(rampColour(eheat), vec3(1.0), eover * EDGE_WHITE);
      edgePre = vec4(ecol * ea * (1.0 + 1.5 * eover), ea);
    }
  }

  // Disjoint by construction (the inside and outside gates never both fire), so
  // the order of these two is a formality — but it is written as a real
  // composite so a change to either gate cannot quietly double-expose the seam.
  gl_FragColor = over(res, edgePre);
}
`;

/**
 * 火星與餘燼點 as point sprites on the same canvas. They stay CPU-simulated —
 * `makeEmberDots` / `stepSparks` in lib/ember-fire.ts are shared with v4, so the
 * embers still sit still and breathe and the sparks still bend over under the
 * same gravity — and only their drawing moves to the GPU, which keeps the whole
 * fire on ONE context per card.
 */
export const EMBER_GL_POINT_VERTEX_SHADER = `
attribute vec4 aPoint;   // x, y (card px), size (css px radius), alpha
uniform vec2 uSize;      // card size in css px
uniform float uScale;    // device px per css px
varying float vAlpha;
void main() {
  vec2 clip = vec2((aPoint.x / uSize.x) * 2.0 - 1.0, 1.0 - (aPoint.y / uSize.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  // v5.1 — a floor of four device pixels, not two. An ember drawn two pixels
  // across IS an isolated bright pixel, which is the very thing Review F4
  // measured; v4 drew the same embers as anti-aliased arcs several pixels wide
  // and scored 0.084 per thousand on that metric.
  gl_PointSize = max(4.0, aPoint.z * 3.2 * uScale);
  vAlpha = aPoint.w;
}
`;

export const EMBER_GL_POINT_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uHot;
uniform float uFade;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
  // A dome, not a disc with a rim: a flat bright core a pixel or two across
  // registers as grain however small the sprite is.
  float a = (1.0 - smoothstep(0.0, 1.0, r)) * vAlpha * uFade;
  gl_FragColor = vec4(uHot * a, a);
}
`;
