/**
 * Ticket 45 — the pure half of the WebGL fire (方案 C).
 *
 * Run with plain node: `node lib/ember-fire-gl.test.ts`. Nothing here touches a
 * canvas or a GPU; what it pins is every number the component hands the shader
 * and every property of the shader SOURCE that「像真的火」depends on:
 * the FBM octaves, the premultiplied/additive blend, the band widths, the size
 * budget and the field-to-texture pack.
 */
import assert from 'node:assert/strict';
import {
  CHAR_BAND_PX,
  EMBER_BAND_PX,
  EMBER_FIRE_CORE_WARMTH,
  burnTimeField,
  charColour,
  hexToRgb,
  warmRamp,
  type EmberRamp,
} from './ember-fire.ts';
import {
  EMBER_GL_CAPTURE_FLAG,
  EMBER_GL_EDGE_SOFT_PX,
  EMBER_GL_FRAGMENT_SHADER,
  EMBER_GL_MAX_CONTEXTS,
  EMBER_GL_MAX_DPR,
  EMBER_GL_MAX_PIXEL_WIDTH,
  EMBER_GL_POINT_FRAGMENT_SHADER,
  EMBER_GL_POINT_VERTEX_SHADER,
  EMBER_GL_VERTEX_SHADER,
  FLAME_BIAS,
  FLAME_HEIGHT_PX,
  FLAME_SAMPLES,
  FLAME_SEED_BAND_PX,
  GL_BLEND,
  GL_ONE,
  GL_ONE_MINUS_SRC_ALPHA,
  blendSetup,
  clampGlSize,
  emberGlContextAttributes,
  packBands,
  packBurnField,
  packFlame,
  packFrameUniforms,
  packPoints,
  packRamp,
  packRect,
  unpackBurnValue,
  // Ticket 47 — 加粗的流光框與舔邊火.
  EDGE_FLAME_CARVE,
  EDGE_FLAME_FALLOFF,
  EDGE_FLAME_LIFT_PX,
  EDGE_FLAME_MARGIN_PX,
  EDGE_FLAME_NOISE_SCALE,
  EDGE_FLAME_REACH_PX,
  EDGE_FLAME_RISE_MS,
  EMBER_CARD_RADIUS_PX,
  EMBER_RING_INNER_PX,
  EMBER_RING_OUTSET_PX,
  EMBER_RING_PX,
  edgeFlameHeat,
  edgeFlameSource,
  edgeFlameStrength,
  packCard,
  roundRectDistance,
} from './ember-fire-gl.ts';
import { EMBER_BURN_MS, EMBER_FADE_MS } from './ember-fire.ts';

/** The gold card, near enough. */
const CARD: EmberRamp = {
  hot: hexToRgb('#fff6e0'),
  light: hexToRgb('#f2e2c4'),
  base: hexToRgb('#e0c49d'),
  deep: hexToRgb('#a8804a'),
};

// ---------------------------------------------------------------------------
// 1. 解析度上限（45.5）：2× DPR、寬 ≤ 900 device px.
// ---------------------------------------------------------------------------
{
  assert.equal(EMBER_GL_MAX_DPR, 2, '票面 45.5：DPR 上限 2');
  assert.equal(EMBER_GL_MAX_PIXEL_WIDTH, 900, '票面 45.5：寬度上限 900px');
  assert.equal(EMBER_GL_MAX_CONTEXTS, 3, '票面 45.5：同時最多 3 個 fire context');

  const one = clampGlSize(276, 262, 1);
  assert.deepEqual(
    [one.dpr, one.pixelWidth, one.pixelHeight],
    [1, 276, 262],
    'DPR 1 的卡片就是它自己的大小',
  );

  const two = clampGlSize(276, 262, 2);
  assert.deepEqual([two.dpr, two.pixelWidth, two.pixelHeight], [2, 552, 524], 'DPR 2 全解析度');

  const three = clampGlSize(276, 262, 3);
  assert.equal(three.dpr, 2, 'DPR 3 被壓回 2');
  assert.equal(three.pixelWidth, 552, 'DPR 3 的畫布不得比 DPR 2 大');

  // 一張很寬的卡（單欄手機把卡拉到 820px 寬）在 DPR 2 會要到 1640px —— 不給。
  const wide = clampGlSize(820, 300, 2);
  assert.equal(wide.pixelWidth, EMBER_GL_MAX_PIXEL_WIDTH, '超寬的卡被壓到 900 device px');
  assert.ok(wide.dpr < 2 && wide.dpr > 1, `DPR 被降到 ${wide.dpr}（1 與 2 之間）`);
  assert.equal(wide.pixelHeight, Math.round(300 * wide.dpr), '高度跟著同一個比例縮');

  assert.ok(clampGlSize(0, 0, 0).pixelWidth >= 1, '退化的大小也要給得出 ≥1 的畫布');
}

// ---------------------------------------------------------------------------
// 1b. Context 屬性（Review 3(b)）：preserveDrawingBuffer 預設必須是關的。
// ---------------------------------------------------------------------------
{
  const shipped = emberGlContextAttributes();
  assert.equal(
    shipped.preserveDrawingBuffer,
    false,
    'Review 3(b)：正式版不得保留 drawing buffer —— 在 tile-based 的手機 GPU 上等於每張 canvas 每幀多一次全畫面複製',
  );
  assert.equal(emberGlContextAttributes(false).preserveDrawingBuffer, false, '明寫 false 也是 false');
  assert.equal(
    emberGlContextAttributes(true).preserveDrawingBuffer,
    true,
    '只有量測的時候（harness 用 addInitScript 打開旗標）才保留',
  );
  // 其餘屬性與 capture 無關。
  for (const capture of [false, true]) {
    const a = emberGlContextAttributes(capture);
    assert.equal(a.alpha, true, 'canvas 要有 alpha（火疊在卡片上）');
    assert.equal(a.premultipliedAlpha, true, '輸出是預乘 alpha（加色的前提）');
    assert.equal(a.antialias, false, '全螢幕四邊形不需要 MSAA');
    assert.equal(a.depth, false, '沒有深度');
    assert.equal(a.stencil, false, '沒有模板');
    assert.equal(a.powerPreference, 'low-power', '這是裝飾，不該把手機的高效能 GPU 叫醒');
  }
  assert.equal(EMBER_GL_CAPTURE_FLAG, '__starlitEmberCapture', '旗標名字是 harness 與元件的約定');
}

// ---------------------------------------------------------------------------
// 2. 加色混合（45.1）—— 這是「白熱核心」的全部理由。
// ---------------------------------------------------------------------------
{
  const blend = blendSetup();
  assert.equal(blend.cap, GL_BLEND, 'blendSetup 回報要打開的是 GL_BLEND');
  assert.equal(blend.src, GL_ONE, '來源係數必須是 gl.ONE（預乘 alpha）');
  assert.equal(blend.dst, GL_ONE_MINUS_SRC_ALPHA, '目的係數必須是 gl.ONE_MINUS_SRC_ALPHA');
  assert.equal(blend.premultiplied, true, '著色器輸出的是預乘 alpha');
  // 這三個常數就是 WebGL 的列舉值，不是隨便編的號碼。
  assert.equal(GL_BLEND, 0x0be2, 'GL_BLEND = 0x0BE2');
  assert.equal(GL_ONE, 1, 'GL_ONE = 1');
  assert.equal(GL_ONE_MINUS_SRC_ALPHA, 0x0303, 'GL_ONE_MINUS_SRC_ALPHA = 0x0303');
  assert.notEqual(blend.src, 0x0302, '不得退回一般 alpha 混合（SRC_ALPHA）');
}

// ---------------------------------------------------------------------------
// 3. 著色器原始碼：三層 FBM、往上捲、距離場、預乘輸出。
// ---------------------------------------------------------------------------
{
  const f = EMBER_GL_FRAGMENT_SHADER;
  assert.ok(f.includes('float fbm('), '片段著色器要有 FBM');
  assert.ok(f.includes('float vnoise('), 'FBM 建在 value noise 上');
  assert.ok(f.includes('float hash21('), 'value noise 建在一個雜湊上');
  // 三層，各自的尺度與速度（票面 45.1「2–3 層 FBM…不同速度與尺度」）。
  const octaves = f.slice(f.indexOf('float fbm('), f.indexOf('// --- the burn-time field'));
  const calls = octaves.match(/vnoise\(/g) ?? [];
  assert.ok(calls.length >= 2 && calls.length <= 3, `FBM 要 2–3 層，實得 ${calls.length}`);
  const speeds = [...octaves.matchAll(/t \* ([0-9.]+)/g)].map((m) => Number(m[1]));
  assert.equal(speeds.length, calls.length, '每一層都要有自己的捲動速度');
  assert.equal(new Set(speeds).size, speeds.length, `每一層的速度都不一樣，實得 ${speeds.join('/')}`);
  const scales = [...octaves.matchAll(/\* (0\.0[0-9]+|0\.1[0-9]+)/g)].map((m) => Number(m[1]));
  assert.ok(new Set(scales).size >= 2, `每一層的尺度也不一樣，實得 ${scales.join('/')}`);
  // 往「上」捲：卡片座標的 y 往下長，所以取樣點要 + t（見著色器裡的註解）。
  for (const s of speeds) assert.ok(s > 0, `捲動速度要是正的（往上），實得 ${s}`);
  // v5.1 — 噪音座標要沿 y 壓扁（各向異性），火舌才會是「一根一根」而不是泡沫。
  const squash = /vec2 q = vec2\(p\.x \* ([0-9.]+), p\.y \* ([0-9.]+)\);/.exec(octaves);
  assert.ok(squash, 'v5.1：FBM 的座標要先沿 y 壓扁');
  const ratio = Number(squash[2]) / Number(squash[1]);
  assert.ok(
    ratio > 0.2 && ratio < 0.75,
    `v5.1：y 要比 x 壓得多（比例 0.2–0.75，特徵才會是一根一根），實得 ${ratio.toFixed(3)}`,
  );
  // 但也不能細到只剩一個像素寬：那樣火舌的尖端會被當成孤立亮點（Review F4）。
  assert.ok(
    Number(squash[1]) < 0.9,
    `v5.1：x 也要放大一點，火舌才有寬度，實得 ${squash?.[1]}`,
  );
  // 捲動速度要跟著同一個 y 比例走，否則往上捲的速度會被悄悄改掉。
  const scrolls = [...octaves.matchAll(/t \* [0-9.]+ \* ([0-9.]+)\)/g)].map((m) => m[1]);
  assert.equal(scrolls.length, speeds.length, '每一層的捲動都要乘上 y 的壓縮比');
  for (const scroll of scrolls)
    assert.equal(
      scroll,
      squash[2],
      `v5.1：捲動要乘上同一個 y 壓縮比 ${squash[2]}（否則往上捲的速度被悄悄改掉），實得 ${scroll}`,
    );

  // v5.1 — march 的起點要用平滑噪音抖動（逐像素 hash 會變成椒鹽顆粒）。
  assert.ok(f.includes('float startJitter ='), 'v5.1：march 的起點要抖動');
  assert.ok(
    /float startJitter =[\s\S]{0,40}vnoise\(/.test(f),
    'v5.1：起點的抖動要用 vnoise（平滑、低頻），不是逐像素 hash',
  );
  assert.equal(
    /float startJitter =[\s\S]{0,40}hash21\(/.test(f),
    false,
    'v5.1：起點的抖動不得用逐像素 hash（那就是 Review F4 量到的椒鹽顆粒）',
  );
  assert.ok(
    f.includes('float off = float(k) * stepPx + startJitter;'),
    'v5.1：抖動要加在每一步的位移上（整根柱子一起移動）',
  );
  // 粗取樣的抖動還在（單一取樣裡的量化階梯還是要打散），但**不得**是逐像素的
  // hash —— 平滑的噪音在構造上就做不出「比四個鄰居都亮」的孤立像素。
  const coarse = f.slice(f.indexOf('float burnCoarse('), f.indexOf('float burnPrecise('));
  assert.ok(coarse.includes('vnoise('), 'v5.1：粗取樣的抖動要用平滑噪音');
  assert.equal(
    coarse.includes('hash21('),
    false,
    'v5.1：粗取樣不得用逐像素 hash 抖動（Review F4 量到孤立亮點 9.72／千）',
  );

  // 熱源沿前緣取樣、距離場當 uniform texture。
  assert.ok(f.includes('uniform sampler2D uFieldMap;'), '燒掉時間場是一張 uniform texture');
  assert.ok(f.includes('uThreshold'), '著色器知道當前的閾值');
  assert.ok(f.includes('burnPrecise(p) - uThreshold'), 'd = burnTime − threshold 就是前緣距離');
  assert.ok(f.includes('float burnPrecise('), '精確取樣自己做雙線性（16 位元不能交給硬體濾波）');

  assert.ok(f.includes(`const int FLAME_SAMPLES = ${FLAME_SAMPLES};`), '向下找熱源的取樣數寫死在原始碼裡');

  // v5.1 — 色階的第一個轉折從 0.55 拉到 0.45：火的主體要落在 base→light，
  // 否則粉紅卡與紫卡整片都是自己的本色，讀起來像「發光的裂縫」不像燒紙。
  const knee = /if \(h < ([0-9.]+)\) return mix\(uDeep, uBase/.exec(f);
  assert.ok(knee, '色階要有第一個轉折');
  assert.ok(
    Number(knee[1]) <= 0.47,
    `v5.1：第一個轉折要 ≤ 0.47（v5 是 0.55），實得 ${knee?.[1]}`,
  );
  // 三段要接得起來，不能留縫也不能重疊。
  const stops = [...f.matchAll(/if \(h < ([0-9.]+)\)/g)].map((m) => Number(m[1]));
  assert.equal(stops.length, 2, '色階就是三段');
  assert.ok(stops[0] < stops[1], `轉折要遞增，實得 ${stops.join('/')}`);
  assert.ok(
    f.includes(`(h - ${stops[0]}) / ${(Math.round((stops[1] - stops[0]) * 100) / 100).toFixed(2)}`),
    `第二段的分母要等於兩個轉折的差（${stops[0]}→${stops[1]}）`,
  );

  // 焦邊在最上面（Ticket 41 Review F1 不得回歸）。
  assert.ok(
    f.indexOf('vec4 charPre') > f.indexOf('vec4 emberPre'),
    'F1：焦邊算在餘燼帶之後',
  );
  assert.ok(f.includes('over(charPre, over(emberPre, flamePre))'), 'F1：合成順序是火 → 餘燼 → 焦邊');

  // 預乘輸出（加色）。
  assert.match(
    f,
    /vec4 flamePre = vec4\(flameCol \* flameA \* \(1\.0 \+ [0-9.]+ \* over1\), flameA\);/,
    '核心的 rgb 允許超過 alpha（加色）',
  );
  assert.match(f, /mix\(rampColour\(heat\), vec3\(1\.0\), over1 \* [0-9.]+\)/, '最熱的地方往白色推');

  // 純色階：著色器裡不得出現任何寫死的顏色（白熱的 vec3(1.0) 是亮度不是色相）。
  const colours = f.match(/vec3\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/g) ?? [];
  assert.deepEqual(colours, [], `著色器不得寫死顏色，實得 ${colours.join(' ')}`);

  const v = EMBER_GL_VERTEX_SHADER;
  assert.ok(v.includes('0.5 - aPos.y * 0.5'), 'vUv.y = 0 對應畫面上緣（卡片座標往下長）');
  assert.ok(!f.includes('#version 300'), 'WebGL1 / GLSL ES 1.0，不得是 300 es');
  assert.ok(!v.includes(' in ') && !v.includes('out '), 'WebGL1 用 attribute／varying，不是 in／out');

  // 火星與餘燼點的點精靈也是同一套色與同一種預乘輸出。
  assert.ok(EMBER_GL_POINT_VERTEX_SHADER.includes('gl_PointSize'), '點精靈要設大小');
  assert.ok(EMBER_GL_POINT_FRAGMENT_SHADER.includes('uHot * a'), '點精靈用卡片自己的 hot 色，預乘');
}

// ---------------------------------------------------------------------------
// 4. 色階打包：就是 warmRamp(0.35) 之後的那四階，外加由 deep 推出來的焦色。
// ---------------------------------------------------------------------------
{
  const warm = warmRamp(CARD, EMBER_FIRE_CORE_WARMTH);
  const packed = packRamp(warm);
  assert.equal(packed.length, 15, '五組 vec3：hot／light／base／deep／char');
  const at = (n: number) => [packed[n], packed[n + 1], packed[n + 2]];
  /** Float32 round-trips a byte/255 to within a thousandth of a byte, no more. */
  const sameRgb = (got: number[], want: readonly number[], label: string) => {
    for (let i = 0; i < 3; i += 1)
      assert.ok(
        Math.abs(got[i] * 255 - want[i]) < 0.01,
        `${label}：第 ${i} 個分量實得 ${(got[i] * 255).toFixed(3)}，應為 ${want[i]}`,
      );
  };
  sameRgb(at(0), warm.hot, 'hot 就是 warmRamp 的 hot');
  sameRgb(at(3), warm.light, 'light 就是 warmRamp 的 light');
  sameRgb(at(6), warm.base, 'base 沒有被暖核心動到');
  sameRgb(at(9), warm.deep, 'deep 沒有被暖核心動到');
  sameRgb(at(12), charColour(warm.deep), '焦色由 deep 壓暗而來');
  for (const v of packed) assert.ok(v >= 0 && v <= 1, `打包後都在 0..1，實得 ${v}`);
  assert.ok(Math.max(...charColour(warm.deep)) < 60, '焦色是近黑帶褐');

  // 暖核心 0.35 真的把琥珀混進 hot／light，base／deep 原封不動。
  assert.notDeepEqual(warm.hot.map(Math.round), CARD.hot.map(Math.round), '0.35 有動到 hot');
  assert.deepEqual(warm.base, CARD.base, '0.35 不動 base（專屬色政策）');
  assert.deepEqual(warm.deep, CARD.deep, '0.35 不動 deep');

  // 粉紅卡打包出來一定跟金卡不一樣（每張卡的火是自己的顏色）。
  const pink = warmRamp(
    {
      hot: hexToRgb('#fff0f9'),
      light: hexToRgb('#f9c9e8'),
      base: hexToRgb('#f3a4d8'),
      deep: hexToRgb('#c85c9e'),
    },
    EMBER_FIRE_CORE_WARMTH,
  );
  assert.notDeepEqual([...packRamp(pink)], [...packed], '兩張卡的 uniform 不得一樣');
}

// ---------------------------------------------------------------------------
// 5. 其他 uniform 的長度與內容。
// ---------------------------------------------------------------------------
{
  const bands = packBands();
  assert.deepEqual([...bands], [CHAR_BAND_PX, EMBER_BAND_PX, EMBER_GL_EDGE_SOFT_PX], '帶寬與 v4 同一份');
  assert.equal(CHAR_BAND_PX, 6, '焦邊 0–6px');
  assert.equal(EMBER_BAND_PX, 14, '餘燼帶到 14px');
  assert.equal(EMBER_GL_EDGE_SOFT_PX, 1, '邊緣柔化 1px（票面 45.1）');

  const flame = packFlame();
  assert.equal(flame.length, 3, '火舌三個參數');
  assert.equal(flame[0], FLAME_HEIGHT_PX, '火舌高度');
  assert.equal(flame[1], FLAME_SEED_BAND_PX, '熱源帶寬');
  assert.ok(Math.abs(flame[2] - FLAME_BIAS) < 1e-6, '尖端截斷（Float32 存的 0.12）');
  // 這個數字是「往下找熱源的距離」與「熱度衰減的尺度」，不是火舌高度本身：噪音
  // 還會把火舌削回去，實量大約是它的三分之二。要讓票面的 16–40px 兩端都搆得到，
  // 它必須比 40 大一些、又不能大到火舌衝出卡片。
  assert.ok(
    FLAME_HEIGHT_PX >= 36 && FLAME_HEIGHT_PX <= 64,
    `搜尋高度要落在票面火舌上限附近（噪音會再削回去），實得 ${FLAME_HEIGHT_PX}`,
  );
  assert.ok(FLAME_SAMPLES >= 12, `取樣數要夠密，否則加總會出現週期性的梳狀條紋，實得 ${FLAME_SAMPLES}`);
  assert.ok(
    FLAME_HEIGHT_PX / (FLAME_SAMPLES - 1) < FLAME_SEED_BAND_PX * 0.5,
    `取樣間距要遠小於熱源帶寬，實得 ${(FLAME_HEIGHT_PX / (FLAME_SAMPLES - 1)).toFixed(2)}px vs ${FLAME_SEED_BAND_PX}px`,
  );
  assert.ok(FLAME_BIAS > 0, '要有一個截斷，火舌才有尖端而不是無限淡出');

  assert.deepEqual([...packRect(-20, -20, 316, 302)], [-20, -20, 316, 302], 'rect 就是 origin+span');

  const u = packFrameUniforms({ threshold: 123.5, seconds: 1.25, fade: 1, seed: 41007, flameOnly: false });
  assert.equal(u.length, 5, '每幀五個純量');
  assert.equal(u[0], 123.5, '閾值原樣送進去');
  assert.equal(u[1], 1.25, '時間以秒為單位');
  assert.equal(u[2], 1, 'fade 1 = 還沒開始淡出');
  assert.ok(u[3] >= 0 && u[3] < 1, `種子要被摺進 0..1（mediump 撐不住 10^5），實得 ${u[3]}`);
  assert.equal(u[4], 0, 'flameOnly 只有量測用的那一趟才是 1');
  assert.equal(packFrameUniforms({ threshold: 0, seconds: 0, fade: 2, seed: 1, flameOnly: true })[2], 1, 'fade 夾在 0..1');
  assert.equal(packFrameUniforms({ threshold: 0, seconds: 0, fade: -1, seed: 1, flameOnly: true })[2], 0, 'fade 夾在 0..1');
  assert.equal(packFrameUniforms({ threshold: 0, seconds: 0, fade: 1, seed: 1, flameOnly: true })[4], 1, 'flameOnly 送 1');

  const pts = packPoints([
    { x: 10, y: 20, size: 1.5, alpha: 0.5 },
    { x: 30, y: 40, size: 2, alpha: 3 },
  ]);
  assert.equal(pts.length, 8, '每顆點四個 float');
  assert.deepEqual([...pts.slice(0, 4)], [10, 20, 1.5, 0.5], '第一顆點原樣');
  assert.equal(pts[7], 1, 'alpha 夾在 0..1');
  assert.equal(packPoints([]).length, 0, '沒有點就是空的');
}

// ---------------------------------------------------------------------------
// 6. 距離場 → 貼圖：打包／解包來回，而且「永不燒」的框要留在每個閾值之外。
// ---------------------------------------------------------------------------
{
  const field = burnTimeField(276, 262, 2, 41);
  const packed = packBurnField(field);
  assert.equal(packed.width, field.cols, '貼圖的寬就是場的格數');
  assert.equal(packed.height, field.rows, '貼圖的高就是場的列數');
  assert.equal(packed.data.length, field.cols * field.rows * 2, '一格兩個位元組（LUMINANCE_ALPHA，高位在 L、低位在 A）');
  assert.deepEqual(packed.origin, [-field.margin, -field.margin], '貼圖蓋的是「有外框的」那個格網');
  assert.deepEqual(packed.span, [field.cols * field.cell, field.rows * field.cell], 'span = 格數 × 格寬');

  // 閾值掃到底的時候（field.max × 1.06）仍然小於 scale，所以不會有東西被截頂。
  assert.ok(packed.scale > field.max * 1.06, `打包的尺度要留餘裕，實得 ${packed.scale} vs ${field.max * 1.06}`);

  // 來回誤差 ≤ 1 LSB。
  let worst = 0;
  for (let k = 0; k < field.time.length; k += 7) {
    const t = field.time[k];
    if (t > 1e8) continue;
    worst = Math.max(
      worst,
      Math.abs(unpackBurnValue(packed.data[k * 2], packed.data[k * 2 + 1], packed.scale) - t),
    );
  }
  const lsb = packed.scale / (255 * 255);
  assert.ok(worst <= lsb * 0.55, `來回誤差要在半個 LSB 內（LSB ${lsb.toFixed(4)}px），實得 ${worst.toFixed(5)}px`);
  // 這個門檻就是「電子感」的量化版：一個 LSB 只要接近 1px，量化誤差沿著等值線
  // 就會畫出一圈一圈的等高線（八位元版本實測如此，evidence/look 有圖）。
  assert.ok(lsb < 0.02, `一個 LSB 要遠小於 1px（否則會出現等高線），實得 ${lsb.toFixed(4)}px`);

  // 「永不燒」的那一圈就是滿格，而且解出來比任何閾值都大。
  assert.equal(packed.data[0], 255, '格網最外圈永不燒（高位滿格）');
  assert.equal(packed.data[1], 255, '格網最外圈永不燒（低位滿格）');
  assert.ok(
    unpackBurnValue(255, 255, packed.scale) > field.max * 1.06,
    '永不燒的那一圈解出來要大過最後一個閾值',
  );

  // 同一個半徑、不同角度的燒掉時間不一樣 —— 打包之後仍然看得出來（不規則沒有被
  // 量化掉）。這一條是「洞不是正圓」在 GPU 這一側的保證。
  const cx = 276 / 2;
  const cy = 262 / 2;
  const at = (angle: number) => {
    const x = cx + Math.cos(angle) * 70;
    const y = cy + Math.sin(angle) * 70;
    const i = Math.round((x + field.margin - field.cell / 2) / field.cell);
    const j = Math.round((y + field.margin - field.cell / 2) / field.cell);
    const k = j * field.cols + i;
    return unpackBurnValue(packed.data[k * 2], packed.data[k * 2 + 1], packed.scale);
  };
  const ring = Array.from({ length: 12 }, (_, n) => at((n / 12) * Math.PI * 2));
  assert.ok(
    Math.max(...ring) - Math.min(...ring) > 20,
    `同半徑不同角度的燒掉時間要差很多，實得 ${ring.map((v) => v.toFixed(0)).join('/')}`,
  );

  // 一張很小的卡也要打得出來（不得除以零）。
  const tiny = packBurnField(burnTimeField(60, 60, 2, 3));
  assert.ok(tiny.scale > 0 && tiny.data.length > 0, '小卡片也打包得出來');
}

// ---------------------------------------------------------------------------
// Ticket 47 — 流光框的粗度.
// ---------------------------------------------------------------------------
{
  assert.equal(EMBER_RING_PX, 3.5, '48：流光框 5px → 3.5px（使用者 2026-09-19 覆蓋 47）');
  assert.equal(EMBER_RING_INNER_PX, 1, '47：內側那 1px 是 Ticket 44-B 的內縮');
  assert.equal(
    EMBER_RING_OUTSET_PX,
    EMBER_RING_PX - EMBER_RING_INNER_PX,
    '47：往外凸的部分就是總粗度減掉內縮的那 1px',
  );
  assert.equal(EMBER_RING_OUTSET_PX, 2.5, '48：所以 ::before 要 inset: -2.5px');
}

// ---------------------------------------------------------------------------
// Ticket 47 — 到圓角矩形邊的距離場（著色器 sdCard 的 JS 雙胞胎）.
// ---------------------------------------------------------------------------
{
  const W = 200;
  const H = 260;
  const R = EMBER_CARD_RADIUS_PX;
  const d = (x: number, y: number) => roundRectDistance(x, y, W, H, R);

  // 正中央：離最近的邊就是短邊的一半，負的。
  assert.ok(
    Math.abs(d(W / 2, H / 2) + W / 2) < 1e-9,
    `中央到邊 = −半寬（${-W / 2}），實得 ${d(W / 2, H / 2)}`,
  );
  // 四條邊的中點都正好是 0，往外 7px 就是 7。
  for (const [x, y] of [
    [W / 2, 0],
    [W / 2, H],
    [0, H / 2],
    [W, H / 2],
  ])
    assert.ok(Math.abs(d(x, y)) < 1e-9, `邊上一點距離 0，實得 ${d(x, y)}`);
  assert.ok(Math.abs(d(W / 2, -7) - 7) < 1e-9, `上緣外 7px 的距離是 7，實得 ${d(W / 2, -7)}`);
  assert.ok(Math.abs(d(-7, H / 2) - 7) < 1e-9, `左緣外 7px 的距離是 7，實得 ${d(-7, H / 2)}`);
  assert.ok(Math.abs(d(W + 7, H / 2) - 7) < 1e-9, `右緣外 7px 的距離是 7，實得 ${d(W + 7, H / 2)}`);
  assert.ok(Math.abs(d(W / 2, H + 7) - 7) < 1e-9, `下緣外 7px 的距離是 7，實得 ${d(W / 2, H + 7)}`);
  // 角落是圓的，不是方的：(0,0) 在圓角之外，距離 = R·(√2 − 1)。
  const corner = R * (Math.SQRT2 - 1);
  assert.ok(
    Math.abs(d(0, 0) - corner) < 1e-9,
    `方角的頂點落在圓角外 ${corner.toFixed(3)}px，實得 ${d(0, 0).toFixed(3)}`,
  );
  // 對稱：四個角一樣。
  for (const [x, y] of [
    [W, 0],
    [0, H],
    [W, H],
  ])
    assert.ok(Math.abs(d(x, y) - corner) < 1e-9, `四個角對稱，(${x},${y}) 實得 ${d(x, y)}`);
  // 半徑比半寬大的時候要收斂到膠囊，不得長出 NaN 或正的中心距離。
  assert.ok(roundRectDistance(30, 30, 60, 60, 999) < 0, '半徑大於半邊時中心仍在裡面');
}

// ---------------------------------------------------------------------------
// Ticket 47 — 舔邊火：只在卡片外面、只有向上長、厚度落在 10–16px.
//
// Ticket 48（使用者 2026-09-19）之後 `uEdge` 永遠是 0，畫面上沒有這個效果，這一整
// 段守的是死碼 —— 所以它現在的條件就是那個開關本身：47 一旦被叫回來（把
// `edgeFlameStrength` 改回會回傳正值的版本），這些門檻立刻重新生效。
//
// 為什麼是「跳過」而不是「把門檻調到符合現況」：本票開工後（2026-09-19 17:40 左右）
// 樹上的 lib/ember-fire-gl.ts 被本票以外的來源改過一次（EDGE_FLAME_REACH_PX 16 → 20、
// EDGE_FLAME_LIFT_PX 14 → 10，Ticket 47 第二輪的修正），而這些門檻是 47 第一輪寫的，
// 兩邊互相矛盾。Ticket 47 Review 的 F2 就是「門檻被放寬蓋掉真紅」，本票不重蹈：
// 不替 47 決定哪一組數字對，也不調門檻。詳見 followup-48/developer.md。
// ---------------------------------------------------------------------------
if (edgeFlameStrength('burn', 1000) > 0) {
  const W = 200;
  const H = 260;

  // ① 卡面上一點都不畫 —— 不論噪音取什麼值。這就是票面「不得遮鄰卡文字、開啟面
  //    要讀得到」的硬保證，也是紅測要打的那一下。
  let insideSamples = 0;
  for (let x = 0; x <= W; x += 2)
    for (let y = 0; y <= H; y += 2) {
      if (roundRectDistance(x, y, W, H, EMBER_CARD_RADIUS_PX) > 0) continue;
      insideSamples += 1;
      for (const turb of [0, 0.25, 0.5, 0.75, 1])
        assert.equal(
          edgeFlameHeat(x, y, W, H, turb),
          0,
          `47：卡面上 (${x},${y}) turb=${turb} 不得有舔邊火，實得 ${edgeFlameHeat(x, y, W, H, turb)}`,
        );
    }
  assert.ok(insideSamples > 10000, `卡面取樣點要夠多，實得 ${insideSamples}`);
  // 邊上那一點本身也是 0（gate 從距離 0 才開始升）。
  assert.equal(edgeFlameHeat(W / 2, 0, W, H, 1), 0, '47：邊線上還是 0');

  // ② 卡片外面有火，而且四邊都有。
  for (const [x, y, side] of [
    [W / 2, -4, '上'],
    [W / 2, H + 4, '下'],
    [-4, H / 2, '左'],
    [W + 4, H / 2, '右'],
  ] as const)
    assert.ok(
      edgeFlameHeat(x, y, W, H, 0.6) > 0,
      `47：${side}緣外 4px 要有火，實得 ${edgeFlameHeat(x, y, W, H, 0.6)}`,
    );

  // ③ 厚度：熱源在 reach 之內都還在，超過 reach 的側邊完全沒有。
  assert.ok(edgeFlameSource(-EDGE_FLAME_REACH_PX + 1, H / 2, W, H) > 0, '47：側邊 reach 之內有熱源');
  assert.equal(
    edgeFlameSource(-EDGE_FLAME_REACH_PX - 0.5, H / 2, W, H),
    0,
    '47：側邊 reach 之外沒有熱源（火舌是往上長的，不是往旁邊長的）',
  );
  // 側邊在同一個高度往下找也只找得到一樣遠的邊，所以「往下探」不會把側邊撐寬。
  assert.ok(
    edgeFlameSource(-EDGE_FLAME_REACH_PX - 2, H / 2, W, H) === 0 &&
      edgeFlameSource(-EDGE_FLAME_MARGIN_PX + 1, H / 2, W, H) === 0,
    '47：側邊不會被往下探撐到畫布邊緣',
  );

  // ④ 重力方向固定：同樣離邊 10px，上緣外的熱源必須大過下緣外的（火舌向上）。
  const above = edgeFlameSource(W / 2, -10, W, H);
  const below = edgeFlameSource(W / 2, H + 10, W, H);
  assert.ok(
    above > below * 1.3,
    `47：上緣外 10px 的熱源要明顯大過下緣外 10px（實得 ${above.toFixed(3)} vs ${below.toFixed(3)}）`,
  );
  // 上緣的火舌構得到 reach 之外（那是 lift 給的），但一定在畫布裡面就熄掉。
  assert.ok(
    edgeFlameSource(W / 2, -(EDGE_FLAME_REACH_PX + 1), W, H) > 0,
    '47：上緣的火舌可以長過熱源帶本身',
  );
  assert.equal(
    edgeFlameSource(W / 2, -(EDGE_FLAME_MARGIN_PX - 1), W, H),
    0,
    '47：到畫布邊緣之前一定歸零（不得被切成一條直線）',
  );
  assert.ok(
    EDGE_FLAME_LIFT_PX < EDGE_FLAME_MARGIN_PX && EDGE_FLAME_REACH_PX < EDGE_FLAME_MARGIN_PX,
    '47：往下探的距離與熱源帶都要小於畫布的邊界',
  );
  assert.ok(
    EDGE_FLAME_REACH_PX >= 10 && EDGE_FLAME_REACH_PX <= 16,
    `47：舔邊火厚 10–16px，實得 ${EDGE_FLAME_REACH_PX}`,
  );

  // ⑤ 形狀的兩顆旋鈕就是 developer.md 裡記的那兩個。
  assert.ok(EDGE_FLAME_FALLOFF > 0 && EDGE_FLAME_FALLOFF < 1, '47：衰減指數小於 1（貼著燃料那一側更飽）');
  assert.ok(EDGE_FLAME_CARVE > 0 && EDGE_FLAME_CARVE < 1.4, '47：噪音仍然會把火舌雕開，但比主火溫和');
} else {
  // Review B F1／Review A：跳過必須看得見，否則「GREEN」會讓人以為整支都跑過了。
  console.log(
    'SKIP legacy47 thickness: uEdge is 0 (Ticket 48), so the edge-flame geometry block did not run. ' +
      `Known unresolved Ticket 47 conflict: EDGE_FLAME_REACH_PX=${EDGE_FLAME_REACH_PX} vs ` +
      `EDGE_FLAME_MARGIN_PX=${EDGE_FLAME_MARGIN_PX} and the 10–16px window — these assertions FAIL as they stand. ` +
      'Ticket 48 does not decide those values; see followup-48/developer-revision2.md.',
  );
}

// ---------------------------------------------------------------------------
// Ticket 48 — 什麼時候畫舔邊火：永遠不畫.
//
// Ticket 47 的答案是「燒穿 3.0s ＋ 淡出 0.8s 期間舔邊，收回不畫」。使用者
// 2026-09-19 直接覆蓋掉：「轉場期間不畫外側火焰。完全展開、轉場結束後，最外圍持續
// 微微燃燒」。後半段不可能從這支著色器來 —— 它掛在 `data-burning` 上，卡片開完
// 它就卸載了 —— 最新修訂已撤回外凸火舌，只保留既有 CSS 流動框，
// 框的行為測試在 components/starlit-card-ring.test.cjs，
// 這裡只剩下「一個像素都不准畫」這一條。
// ---------------------------------------------------------------------------
{
  for (const mode of ['burn', 'close'] as const)
    for (const t of [
      0,
      100,
      EDGE_FLAME_RISE_MS / 2,
      EDGE_FLAME_RISE_MS,
      600,
      1500,
      2500,
      EMBER_BURN_MS,
      EMBER_BURN_MS + EMBER_FADE_MS / 2,
      EMBER_BURN_MS + EMBER_FADE_MS,
      3801,
      9000,
    ])
      assert.equal(edgeFlameStrength(mode, t), 0, `48：${mode} t=${t} 不得有舔邊火`);
}

// ---------------------------------------------------------------------------
// Ticket 47 — uniform 打包與著色器原始碼.
// ---------------------------------------------------------------------------
{
  assert.deepEqual(
    [...packCard(200, 260)],
    [200, 260, EMBER_CARD_RADIUS_PX, EDGE_FLAME_REACH_PX],
    '47：uCard = 卡片寬、高、圓角、舔邊火厚度',
  );
  const shader = EMBER_GL_FRAGMENT_SHADER;
  assert.ok(shader.includes('float sdCard('), '47：著色器有卡片的距離場');
  assert.ok(shader.includes('uniform vec4 uCard;'), '47：uCard 是 uniform（幾何不寫死在著色器裡）');
  assert.ok(shader.includes('uniform float uEdge;'), '47：舔邊火的強度也是 uniform');
  // 主火被裁在卡片裡（canvas 變大之後，瀏覽器的 border-radius 不再是那把刀）。
  assert.ok(
    /float inside = 1\.0 - smoothstep\(-soft, 0\.0, sdCard\(p\)\);/.test(shader),
    '47：主火（焦邊／餘燼／火舌）裁在卡片之內',
  );
  // 舔邊火被關在卡片外面。
  assert.ok(
    /float outside = smoothstep\(0\.0, soft, ed\);/.test(shader),
    '47：舔邊火只在卡片之外',
  );
  // 探測用的那一趟不得含舔邊火，否則 Ticket 45 每一個火舌數字都會被汙染。
  assert.ok(
    shader.indexOf('if (uFlameOnly > 0.5)') < shader.indexOf('vec4 edgePre'),
    '47：flameOnly 那一趟在舔邊火之前就 return 了',
  );
  // 45.4 的規矩沒有被破：顏色仍然只從 uniform 來。
  assert.equal(
    /vec3\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/.test(shader),
    false,
    '47：新加的那一段也不得寫死任何顏色',
  );
  assert.ok(shader.includes('rampColour(eheat)'), '47：舔邊火用的是同一條 ramp（專屬色 ＋ 0.35 琥珀核心）');
  // 同一套 FBM，換個相位、看細一點（票面：火舌，不是一圈光暈）。
  // Ticket 47 Review F3(e) 之後時間也跟著放大（`uTime * EDGE_TIME`），釘子跟著改。
  // 這一段現在是死碼（uEdge 永遠是 0，見上面），留著是因為使用者一句話就會把它叫
  // 回來；留著就要繼續守它的形狀。
  assert.ok(
    shader.includes('fbm(p * EDGE_NOISE + vec2(0.0, 37.0), uTime * EDGE_TIME, uSeed + 0.37)'),
    '47：舔邊火用的是同一個 fbm()，只是相位與取樣頻率不同',
  );
  assert.ok(
    shader.includes(`const float EDGE_NOISE = ${EDGE_FLAME_NOISE_SCALE.toFixed(2)};`),
    '47：取樣頻率是常數，不是寫死在式子裡的數字',
  );
  assert.ok(
    EDGE_FLAME_NOISE_SCALE > 1.5,
    `47：舔邊火的噪音要比主火細（16px 的帶配上主火 55px 的特徵只會變成一圈光暈），實得 ${EDGE_FLAME_NOISE_SCALE}`,
  );
}

console.log(
  'PASS current48: size budget, premultiplied additive blend, three FBM octaves, ramp/uniform packing, ' +
    'the 16-bit burn-field texture, the 3.5px ring and uEdge===0 at every time in both modes. ' +
    'NOT full coverage — see the SKIP line above for the legacy47 thickness block.',
);
