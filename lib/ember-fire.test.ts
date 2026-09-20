import assert from 'node:assert/strict';
import {
  BURN_NOISE_AMPLITUDE,
  BURN_OVERSHOOT,
  CHAR_BAND_PX,
  EMBER_BAND_PX,
  EMBER_DOT_MAX,
  EMBER_DOT_MIN,
  EMBER_FIRE_CORE_WARMTH,
  EMBER_BURN_MS,
  EMBER_CLOSE_MS,
  EMBER_FADE_MS,
  EMBER_FIRE_MS,
  FRONT_SPEED_MAX,
  FRONT_SPEED_MIN,
  HEAT_COOLING,
  HEAT_REACH_PX,
  HEAT_STEPS_PER_FRAME,
  SPARK_GRAVITY,
  SPARK_MAX,
  SPARK_MIN,
  TONGUE_MAX_PX,
  TONGUE_MIN_PX,
  aheadOfFront,
  burnContours,
  burnTimeAt,
  burnTimeField,
  burnTimeSmooth,
  charColour,
  emberDotAlpha,
  emberDotPoint,
  createHeat,
  filmClipPath,
  frontBandColour,
  frontOnRay,
  heatColour,
  hexToRgb,
  isBurned,
  makeEmberDots,
  makeFractalNoise,
  makeFrontPace,
  makeRng,
  makeSpark,
  makeValueNoise,
  paceAt,
  propagateHeat,
  quenchHeat,
  seedHeat,
  simplifyContour,
  sparkAlpha,
  stepSparks,
  thresholdAt,
  warmRamp,
  type EmberRamp,
  type Spark,
} from './ember-fire.ts';

/** The real card, near enough: three across a ~860px column, 260px tall. */
const W = 276;
const H = 262;
const SEED = 41;

// ---------------------------------------------------------------------------
// 0. The tempo the ticket asks for (41.6), pinned where the component reads it.
// ---------------------------------------------------------------------------
assert.equal(EMBER_BURN_MS, 3000, '燒穿總長 ≈ 3.0s（v3 的 2.2s 太快）');
assert.equal(EMBER_FADE_MS, 800, '燒完餘燼與火舌再 0.8s 淡出');
assert.equal(EMBER_FIRE_MS, 3800, 'canvas 掛載窗＝燒穿 + 淡出');
assert.equal(EMBER_CLOSE_MS, 1400, '收回約 1.4s');

// ---------------------------------------------------------------------------
// 1. Seeded and reproducible — everything below depends on it.
// ---------------------------------------------------------------------------
{
  const a = makeRng(7);
  const b = makeRng(7);
  const c = makeRng(8);
  const runA = Array.from({ length: 8 }, a);
  assert.deepEqual(runA, Array.from({ length: 8 }, b), '同一顆種子給同一串亂數');
  assert.notDeepEqual(runA, Array.from({ length: 8 }, c), '不同種子不一樣');
  for (const v of runA) assert.ok(v >= 0 && v < 1, `亂數落在 [0,1)，實得 ${v}`);

  const noise = makeValueNoise(3);
  assert.equal(noise(1.25, 4.5), makeValueNoise(3)(1.25, 4.5), '噪音是純函式');
  for (let i = 0; i < 200; i += 1) {
    const v = noise(i * 0.37, i * 0.11);
    assert.ok(v >= 0 && v <= 1, `value noise 落在 [0,1]，實得 ${v}`);
  }
  // Continuous, or the front would have jagged pixel-level teeth instead of tongues.
  let worst = 0;
  for (let i = 0; i < 400; i += 1) {
    const x = i * 0.013;
    worst = Math.max(worst, Math.abs(noise(x + 0.01, 2.2) - noise(x, 2.2)));
  }
  assert.ok(worst < 0.06, `噪音必須連續（0.01 步進的最大跳動 ${worst.toFixed(3)}）`);
}

// ---------------------------------------------------------------------------
// 2. 燒掉時間場（41.2）—— 隨距離單調，但同距離不同角度不同。
// ---------------------------------------------------------------------------
const field = burnTimeField(W, H, 2, SEED);
{
  assert.equal(field.width, W);
  assert.equal(field.height, H);
  assert.ok(field.cols > W / 2 && field.rows > H / 2, '格網含四周留白');

  const cx = W / 2;
  const cy = H / 2;
  const ring = (radius: number, count = 72) =>
    Array.from({ length: count }, (_, n) => {
      const a = (n / count) * Math.PI * 2;
      return burnTimeAt(field, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    });

  // (a) 中心最早。
  assert.ok(burnTimeAt(field, cx, cy) < 3, `中心的燒掉時間 ≈ 0，實得 ${burnTimeAt(field, cx, cy)}`);

  // (b) 隨距離單調：同一個半徑上的平均時間，半徑越大一定越晚。
  let previous = -1;
  for (let r = 10; r <= 120; r += 10) {
    const mean = ring(r).reduce((s, v) => s + v, 0) / 72;
    assert.ok(mean > previous, `半徑 ${r} 的平均燒掉時間要比前一圈晚，${previous} → ${mean}`);
    assert.ok(
      mean > r * (1 - BURN_NOISE_AMPLITUDE) && mean < r * (1 + BURN_NOISE_AMPLITUDE),
      `半徑 ${r} 的平均值要貼著半徑本身（±${BURN_NOISE_AMPLITUDE}），實得 ${mean.toFixed(1)}`,
    );
    previous = mean;
  }

  // (c) 角度相關：同一個半徑上，最早與最晚差很多——這就是 v3 的圈與 v4 的舌
  //     之間的全部差別。
  for (const r of [40, 70, 100]) {
    const values = ring(r);
    const spread = Math.max(...values) - Math.min(...values);
    assert.ok(
      spread > r * 0.3,
      `半徑 ${r}：同半徑不同角度的燒掉時間要差很多（>${(r * 0.3).toFixed(1)}），實得 ${spread.toFixed(1)}`,
    );
  }

  // (d) 幅度 0 就退回 v3 的圓 —— 這條同時是紅測 R1 的靶。
  const round = burnTimeField(W, H, 2, SEED, 0);
  for (const r of [40, 70, 100]) {
    const values = Array.from({ length: 72 }, (_, n) => {
      const a = (n / 72) * Math.PI * 2;
      return burnTimeAt(round, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    const spread = Math.max(...values) - Math.min(...values);
    assert.ok(spread < 3, `噪音幅度 0 時前緣就是正圓（同半徑差 ${spread.toFixed(2)}）`);
  }
}

// ---------------------------------------------------------------------------
// 3. 閾值 0 全膜、閾值滿四角皆燒掉（41.2）。
// ---------------------------------------------------------------------------
{
  let burnedAtZero = 0;
  for (let y = 0; y <= H; y += 4) {
    for (let x = 0; x <= W; x += 4) if (isBurned(field, x, y, 0)) burnedAtZero += 1;
  }
  assert.equal(burnedAtZero, 0, '閾值 0：膜完整，一個像素都沒燒掉');

  const full = field.max * BURN_OVERSHOOT;
  for (const [i, corner] of field.corners.entries())
    assert.ok(corner < full, `第 ${i + 1} 個角在終點前燒掉（${corner.toFixed(1)} < ${full.toFixed(1)}）`);
  let unburned = 0;
  for (let y = 0; y <= H; y += 2) {
    for (let x = 0; x <= W; x += 2) if (!isBurned(field, x, y, full)) unburned += 1;
  }
  assert.equal(unburned, 0, '閾值到頂：整張膜（含四角）都燒掉了');

  // 半路上一定是「有的燒了有的沒有」，而且不是照半徑分的：閾值就取那一圈的
  // 半徑，正圓的話 16 個角度會整齊地全燒或全不燒。
  const half = 62;
  const states = Array.from({ length: 16 }, (_, n) => {
    const a = (n / 16) * Math.PI * 2;
    return isBurned(field, W / 2 + Math.cos(a) * half, H / 2 + Math.sin(a) * half, half);
  });
  assert.ok(
    states.includes(true) && states.includes(false),
    '半路上同一個半徑的 16 個角度，燒掉與沒燒掉都要有（不規則的證據）',
  );
  assert.equal(
    aheadOfFront(field, W / 2, H / 2, half) < 0,
    true,
    '中心早就在前緣後面',
  );
}

// ---------------------------------------------------------------------------
// 4. 節奏（41.6）：速度是 0.7–1.3 的低頻噪音，總長不變。
// ---------------------------------------------------------------------------
{
  const pace = makeFrontPace(SEED);
  assert.equal(paceAt(pace, 0), 0, 'u=0 時閾值 0');
  assert.equal(Math.round(paceAt(pace, 1) * 1e9) / 1e9, 1, 'u=1 時閾值到頂');
  let last = -1;
  const slopes: number[] = [];
  for (let u = 0; u <= 1.0001; u += 0.01) {
    const v = paceAt(pace, u);
    assert.ok(v >= last, `前緣不得倒退：${last} → ${v}`);
    if (last >= 0) slopes.push((v - last) / 0.01);
    last = v;
  }
  const fastest = Math.max(...slopes);
  const slowest = Math.min(...slopes);
  assert.ok(
    fastest / slowest > 1.4,
    `要有停頓與突進（最快/最慢 = ${(fastest / slowest).toFixed(2)}）`,
  );
  assert.ok(
    slowest > FRONT_SPEED_MIN * 0.9 && fastest < FRONT_SPEED_MAX * 1.1,
    `速度落在 ${FRONT_SPEED_MIN}–${FRONT_SPEED_MAX} 倍（實得 ${slowest.toFixed(2)}–${fastest.toFixed(2)}）`,
  );
  assert.ok(thresholdAt(field, pace, 1) > field.max, '終點的閾值蓋過整張膜');
  assert.equal(thresholdAt(field, pace, 0), 0, '起點的閾值是 0');
}

// ---------------------------------------------------------------------------
// 5. 熱圖只往上傳播且冷卻（41.4）。
// ---------------------------------------------------------------------------
{
  const cols = 40;
  const rows = 40;
  const map = createHeat(cols, rows, 2);
  const start = 30;
  for (let x = 10; x < 30; x += 1) map.heat[start * cols + x] = 1;
  const rng = makeRng(5);
  const before = Math.max(...map.heat);
  propagateHeat(map, rng);

  for (let y = start; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1)
      assert.equal(map.heat[y * cols + x], 0, `熱不得留在原處或往下：(${x},${y})`);
  }
  const moved = map.heat.slice((start - 1) * cols, start * cols);
  assert.ok(Math.max(...moved) > 0, '熱往上移了一列');
  assert.ok(Math.max(...moved) < before, `往上一定伴隨冷卻（${before} → ${Math.max(...moved)}）`);

  // 再走幾步，整張圖只會越來越冷，而且永遠不會出現在起點那一列以下。
  let peak = Math.max(...moved);
  for (let step = 0; step < 6; step += 1) {
    propagateHeat(map, rng);
    const now = Math.max(...map.heat);
    assert.ok(now < peak + 1e-9, `熱只會下降，${peak} → ${now}`);
    peak = now;
    for (let y = start; y < rows; y += 1)
      for (let x = 0; x < cols; x += 1) assert.equal(map.heat[y * cols + x], 0, '下方永遠是冷的');
  }

  // 火舌高度 16–40px（41.4）。量的是「真的那一張卡」：前緣是一圈會自己往外
  // 跑的等值線，不是一條不動的直線——直線源會量到兩倍高，因為火舌不必追著自己
  // 的火源跑（followup-41/tongue-probe.mjs 有兩者的對照）。
  {
    const pace = makeFrontPace(SEED);
    const live = createHeat(field.cols, field.rows, field.cell);
    const rng2 = makeRng(SEED * 31 + 7);
    const heights: number[] = [];
    for (let f = 0; f <= 48; f += 1) {
      const threshold = thresholdAt(field, pace, ((f * 1000) / 60) / EMBER_BURN_MS);
      seedHeat(live, field, threshold, rng2);
      for (let s = 0; s < HEAT_STEPS_PER_FRAME; s += 1) propagateHeat(live, rng2, HEAT_COOLING);
      quenchHeat(live, field, threshold);
      // 洞的深處不得還在燒：燒完的紙沒有東西可以燒，火也就不會把洞填滿、
      // 蓋住剛剛露出來的簡介。
      for (let k = 0; k < live.heat.length; k += 1)
        if (live.heat[k] > 0)
          assert.ok(
            field.time[k] - threshold >= -HEAT_REACH_PX,
            `前緣後方 ${HEAT_REACH_PX}px 以外不得有火`,
          );
      if (f !== 18 && f !== 30 && f !== 45) continue;
      let frontTop = Number.POSITIVE_INFINITY;
      let flameTop = Number.POSITIVE_INFINITY;
      for (let j = 0; j < field.rows; j += 1) {
        const y = j * field.cell + field.cell / 2 - field.margin;
        for (let i = 0; i < field.cols; i += 1) {
          const k = j * field.cols + i;
          const ahead = field.time[k] - threshold;
          if (ahead >= -4 && ahead <= 0 && y < frontTop) frontTop = y;
          if (live.heat[k] > 0.02 && y < flameTop) flameTop = y;
        }
      }
      heights.push(frontTop - flameTop);
    }
    for (const tongue of heights)
      assert.ok(
        tongue >= TONGUE_MIN_PX && tongue <= TONGUE_MAX_PX,
        `火舌高度要落在 ${TONGUE_MIN_PX}–${TONGUE_MAX_PX}px，實得 ${heights.join('/')}px（冷卻 ${HEAT_COOLING}、每幀 ${HEAT_STEPS_PER_FRAME} 步）`,
      );
  }

  // seedHeat 只點亮前緣附近的格子。
  const seeded = createHeat(field.cols, field.rows, field.cell);
  seedHeat(seeded, field, field.max * 0.45, makeRng(11));
  let lit = 0;
  let strays = 0;
  for (let k = 0; k < seeded.heat.length; k += 1) {
    if (seeded.heat[k] <= 0) continue;
    lit += 1;
    const d = field.time[k] - field.max * 0.45;
    if (d < -4.001 || d > 0) strays += 1;
  }
  assert.ok(lit > 50, `前緣要點亮一圈格子，實得 ${lit}`);
  assert.equal(strays, 0, '只有前緣「已燒的那一側」會被點亮（焦邊不得被火蓋掉）');
}

// ---------------------------------------------------------------------------
// 6. 火星漸暗（41.5）。
// ---------------------------------------------------------------------------
{
  assert.ok(SPARK_MIN === 5 && SPARK_MAX === 10, '5–10 顆（票面 41.5）');
  const rng = makeRng(2);
  let sparks: Spark[] = Array.from({ length: 8 }, (_, n) =>
    makeSpark(rng, 100 + n, 100, (n / 8) * Math.PI * 2),
  );
  for (const s of sparks) {
    assert.ok(s.vy < 0, '火星起步是往上飛的');
    assert.equal(sparkAlpha(s), 1, '剛飛出來最亮');
  }
  const first = sparks[0];
  let alpha = 1;
  let vy = first.vy;
  let frames = 0;
  while (sparks.length && frames < 400) {
    sparks = stepSparks(sparks, 1 / 60);
    frames += 1;
    const alive = sparks.find((s) => s.size === first.size && s.life === first.life);
    if (!alive) break;
    const now = sparkAlpha(alive);
    assert.ok(now < alpha, `火星必須一路變暗，${alpha} → ${now}`);
    assert.ok(alive.vy > vy, `微重力：垂直速度一路被拉回來，${vy} → ${alive.vy}`);
    alpha = now;
    vy = alive.vy;
  }
  assert.ok(frames > 30, '火星至少活了半秒');
  // 重力方向：飛上去的火星最後會往下掉。
  const up = makeSpark(makeRng(3), 0, 0, 0);
  let s = up;
  for (let i = 0; i < 120; i += 1) s = stepSparks([s], 1 / 60)[0] ?? s;
  assert.ok(s.vy > up.vy + SPARK_GRAVITY * 0.5, '重力確實在作用');
  assert.equal(stepSparks(sparks, 99).length, 0, '燒完的火星會被丟掉');
}

// ---------------------------------------------------------------------------
// 7. 顏色全部由專屬色推導（41.7）。
// ---------------------------------------------------------------------------
{
  assert.deepEqual(hexToRgb('#e0c49d'), [224, 196, 157], 'hex → rgb');
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255], '三碼也讀得懂');

  const gold = {
    hot: hexToRgb('#fff6e0'),
    light: hexToRgb('#f2e2c4'),
    base: hexToRgb('#e0c49d'),
    deep: hexToRgb('#a8804a'),
  };
  const pink = {
    hot: hexToRgb('#fff0f9'),
    light: hexToRgb('#f9c9e8'),
    base: hexToRgb('#f3a4d8'),
    deep: hexToRgb('#c85c9e'),
  };

  // 焦邊：由 deep 壓到近黑帶褐，而且不同卡片的焦色不同（不是固定黑）。
  const charGold = charColour(gold.deep);
  const charPink = charColour(pink.deep);
  assert.ok(Math.max(...charGold) < 50, `焦邊要近黑，實得 ${charGold.join(',')}`);
  assert.ok(charGold[0] >= charGold[1] && charGold[1] >= charGold[2], '焦邊帶褐（R ≥ G ≥ B）');
  assert.notDeepEqual(charGold, charPink, '焦邊是各卡自己的 deep 壓暗的，不是同一個黑');

  // 熱度階：越熱越亮、越冷越透明，最冷完全透明。
  const lum = (c: [number, number, number, number]) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  let previousLum = -1;
  for (const v of [0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
    const c = heatColour(v, gold);
    assert.ok(lum(c) > previousLum, `熱度 ${v} 要比上一階亮`);
    previousLum = lum(c);
  }
  assert.equal(heatColour(0, gold)[3], 0, '沒有熱就完全透明');
  assert.ok(heatColour(0.05, gold)[3] < heatColour(0.5, gold)[3], '越冷越透明（往上淡出）');
  assert.deepEqual(heatColour(1, gold).slice(0, 3), gold.hot.slice(0), '最熱就是專屬色的 hot');
  assert.notDeepEqual(heatColour(0.5, gold), heatColour(0.5, pink), '兩張卡的火不同色');

  // 前緣帶：0–6px 焦、6–14px 餘燼、之後什麼都沒有。
  assert.equal(frontBandColour(-1, gold, 0)[3], 0, '前緣後面（洞裡）不畫焦邊');
  assert.equal(frontBandColour(EMBER_BAND_PX, gold, 0)[3], 0, '14px 之外是乾淨的膜');
  const char = frontBandColour(1, gold, 0);
  const ember = frontBandColour(CHAR_BAND_PX + 0.5, gold, 0);
  assert.ok(lum(char) < 40, `閾值前 0–6px 是深焦色，實得亮度 ${lum(char).toFixed(1)}`);
  assert.ok(lum(ember) > 200, `6–14px 是發亮的餘燼帶，實得亮度 ${lum(ember).toFixed(1)}`);
  assert.ok(
    frontBandColour(7, gold, 0)[3] > frontBandColour(13, gold, 0)[3],
    '餘燼帶靠近焦邊處最亮，往外淡掉',
  );
  // ±40% 高頻閃爍。
  const dim = frontBandColour(10, gold, -1)[3];
  const bright = frontBandColour(10, gold, 1)[3];
  const flat = frontBandColour(10, gold, 0)[3];
  assert.ok(dim < flat && flat < bright, `餘燼要忽明忽暗，實得 ${dim} < ${flat} < ${bright}`);
  assert.ok(Math.abs(dim / flat - 0.6) < 0.02, `暗的那一半是 −40%，實得 ${(dim / flat).toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// 8. 洞的形狀：等值線是封閉的、不是圓，而且終點蓋過整張膜。
// ---------------------------------------------------------------------------
{
  assert.deepEqual(burnContours(field, 0), [], '閾值 0 沒有洞');

  const loops = burnContours(field, field.max * 0.3);
  assert.ok(loops.length >= 1, '半路上有洞');
  const main = loops.reduce((a, b) => (b.length > a.length ? b : a));
  assert.ok(main.length >= 40, `洞的輪廓要有足夠的點，實得 ${main.length / 2}`);

  // 不是圓：到中心的距離在角度上變化很大。
  const cx = W / 2;
  const cy = H / 2;
  const radii: number[] = [];
  for (let i = 0; i < main.length; i += 2) radii.push(Math.hypot(main[i] - cx, main[i + 1] - cy));
  const spread = (Math.max(...radii) - Math.min(...radii)) / (Math.max(...radii) || 1);
  assert.ok(spread > 0.35, `洞緣必須是舌狀而不是圓（半徑起伏 ${(spread * 100).toFixed(0)}%）`);

  // 同一條輪廓上相鄰的點要接得起來（封閉迴圈，不是散落的線段）。
  let longestGap = 0;
  for (let i = 2; i < main.length; i += 2)
    longestGap = Math.max(longestGap, Math.hypot(main[i] - main[i - 2], main[i + 1] - main[i - 1]));
  assert.ok(longestGap < 10, `輪廓必須連續，最長的一段 ${longestGap.toFixed(1)}px`);

  const simple = simplifyContour(main);
  assert.ok(simple.length <= main.length, '簡化只會減少點');
  assert.ok(simple.length >= 12, '簡化不得把輪廓砍光');

  const d = filmClipPath(loops.map((l) => simplifyContour(l)), W, H, 18);
  assert.ok(d.startsWith('M'), 'clip path 從外框開始');
  assert.equal((d.match(/Z/g) ?? []).length, 1 + loops.length, '外框加每個洞各一個封閉子路徑');
  assert.ok(d.includes('A18,18'), '外框保留卡片的圓角');
  assert.equal(filmClipPath([], W, H, 18).includes('L'), false, '沒有洞時就是一個乾淨的圓角矩形');
}

console.log(
  'Ember fire v4: irregular burn-time field, uneven pace, upward-only heat, fading sparks, tint-derived colours and the tongue-shaped hole all pass',
);

// ---------------------------------------------------------------------------
// 9. Round 2 — 餘燼點（Review F5）：位置固定，只有亮度會動。
// ---------------------------------------------------------------------------
{
  const dots = makeEmberDots(makeRng(SEED), field);
  assert.ok(
    dots.length >= EMBER_DOT_MIN && dots.length <= EMBER_DOT_MAX,
    `餘燼點 ${EMBER_DOT_MIN}–${EMBER_DOT_MAX} 顆，實得 ${dots.length}`,
  );
  assert.deepEqual(dots, makeEmberDots(makeRng(SEED), field), '同一顆種子給同一組餘燼點');
  for (const d of dots) {
    assert.ok(
      d.offset > CHAR_BAND_PX && d.offset < EMBER_BAND_PX,
      `餘燼點要落在餘燼帶裡（${CHAR_BAND_PX}–${EMBER_BAND_PX}px），實得 ${d.offset}`,
    );
  }
  // 角度分散，不是擠在一邊。
  const angles = dots.map((d) => d.angle).sort((a, b) => a - b);
  const widest = Math.max(...angles.map((a, i) => (i ? a - angles[i - 1] : a)));
  assert.ok(widest < Math.PI, `餘燼點要繞著前緣分散，最大的空隙 ${widest.toFixed(2)} rad`);

  // 位置只跟著前緣走：閾值不動，位置就一個像素都不動（這就是 F5 的反面）。
  const reach = Math.hypot(W, H) / 2 + EMBER_BAND_PX;
  const at = (t: number) => dots.map((d) => emberDotPoint(field, t, d, reach));
  const a1 = at(70);
  const a2 = at(70);
  assert.deepEqual(a1, a2, '同一個閾值下，餘燼點不得換位置');
  // 閾值往前一點，它們只移動一點點——不是重抽。
  const a3 = at(74);
  let moved = 0;
  for (let i = 0; i < a1.length; i += 1) {
    if (!a1[i] || !a3[i]) continue;
    moved = Math.max(moved, Math.hypot(a3[i].x - a1[i].x, a3[i].y - a1[i].y));
  }
  assert.ok(moved > 0, '前緣往前，餘燼點要跟著走');
  assert.ok(moved < 10, `前緣走 4 個單位，餘燼點只能跟著走一點點（重抽位置會是 100px 以上）（實得最大位移 ${moved.toFixed(1)}px）`);

  // 亮度會動，而且落在 0.35–1。
  const alphas = [0, 120, 260, 400, 800].map((ms) => emberDotAlpha(dots[0], ms));
  assert.ok(new Set(alphas.map((a) => a.toFixed(3))).size > 1, '餘燼點要忽明忽暗');
  for (const a of alphas) assert.ok(a >= 0.35 && a <= 1, `餘燼點亮度 0.35–1，實得 ${a}`);

  // frontOnRay 本身：同一條射線上找到的半徑要隨閾值單調往外。
  let previousR = 0;
  for (const t of [30, 50, 80, 110]) {
    const r = frontOnRay(field, t, 0.7, reach);
    assert.ok(r !== null, `閾值 ${t} 時這條射線要找得到前緣`);
    assert.ok(r! >= previousR, `前緣只會往外走，${previousR} → ${r}`);
    previousR = r!;
  }
  assert.equal(frontOnRay(field, 0, 0.7, reach), 2, '閾值 0 時前緣就在中心');
}

// ---------------------------------------------------------------------------
// 10. Round 2 —「專屬色 vs 像火」的那個旋鈕：預設 0 時什麼都不能變。
// ---------------------------------------------------------------------------
{
  const gold: EmberRamp = {
    hot: hexToRgb('#fff6e0'),
    light: hexToRgb('#f2e2c4'),
    base: hexToRgb('#e0c49d'),
    deep: hexToRgb('#a8804a'),
  };
  assert.equal(EMBER_FIRE_CORE_WARMTH, 0.35, '使用者 2026-09-19 選了琥珀核心（Ticket 41 二選一的 B）：旋鈕 0.35');
  assert.equal(warmRamp(gold, 0), gold, '暖度 0：連物件都原封不動地還回來');
  assert.deepEqual(warmRamp(gold, 0), gold, '暖度 0：四個明度一個數字都沒變');
  const warm = warmRamp(gold, 0.5);
  assert.notDeepEqual(warm.hot, gold.hot, '暖度 > 0 時核心才會變');
  assert.deepEqual(warm.base, gold.base, '本色永遠是卡片自己的');
  assert.deepEqual(warm.deep, gold.deep, '深色（焦邊的來源）永遠是卡片自己的');
  // 往琥珀色靠：紅不變或更紅，藍一定更少。
  assert.ok(warm.hot[2] < gold.hot[2], `暖度 0.5 的核心要少一點藍，${gold.hot[2]} → ${warm.hot[2]}`);
  assert.ok(warmRamp(gold, 1).hot[2] < warm.hot[2], '暖度 1 更暖');
  assert.deepEqual(warmRamp(gold, -1), gold, '負的暖度當作 0');
  // 焦色是從 deep 來的，所以暖度不會讓焦邊變色。
  assert.deepEqual(charColour(warmRamp(gold, 1).deep), charColour(gold.deep), '暖度不動焦邊');
}



// ---------------------------------------------------------------------------
// 11. Round 2 — burnTimeSmooth：格子之間要連續（餘燼點的抖動就是從這裡來的）。
// ---------------------------------------------------------------------------
{
  // 走一條線，看最大的單步跳動：最近格取樣是 2px 一階的樓梯，內插不是。
  const step = 0.2;
  let worstSmooth = 0;
  let worstNearest = 0;
  let prevS = burnTimeSmooth(field, 40, 60);
  let prevN = burnTimeAt(field, 40, 60);
  for (let x = 40 + step; x < 140; x += step) {
    const s = burnTimeSmooth(field, x, 60);
    const n = burnTimeAt(field, x, 60);
    worstSmooth = Math.max(worstSmooth, Math.abs(s - prevS));
    worstNearest = Math.max(worstNearest, Math.abs(n - prevN));
    prevS = s;
    prevN = n;
  }
  assert.ok(
    worstSmooth < worstNearest / 2,
    `內插要比最近格平滑得多，實得 ${worstSmooth.toFixed(3)} vs ${worstNearest.toFixed(3)}`,
  );
  assert.ok(worstSmooth < 0.35, `內插的單步跳動要小，實得 ${worstSmooth.toFixed(3)}`);
  // 在格心上，兩種取樣要同意（內插沒有改變場本身）。
  for (const [x, y] of [[41, 61], [81, 101], [121, 41]]) {
    assert.ok(
      Math.abs(burnTimeSmooth(field, x, y) - burnTimeAt(field, x, y)) < 1e-4,
      `格心上兩種取樣要一致（${x},${y}）`,
    );
  }
}

console.log('Ember fire round 2: stable ember dots, a continuous field sampler, front-on-ray and the (default-off) warm core all pass');
