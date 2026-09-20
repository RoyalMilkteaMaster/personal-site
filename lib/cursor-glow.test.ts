import assert from 'node:assert/strict';
import {
  CARD_GLOW_PX,
  CARD_SPOT_PX,
  CONTENT_GLOW_PX,
  cursorGlowSupported,
  glowPoint,
  glowPoints,
  glowVar,
  type GlowRect,
} from './cursor-glow.ts';

// ---------------------------------------------------------------------------
// 1. 基本減法：鼠標相對盒子左上角。
// ---------------------------------------------------------------------------
{
  const rect: GlowRect = { left: 100, top: 50 };
  assert.deepEqual(glowPoint(180, 90, rect), { x: 80, y: 40 });
  // 盒子左上角本身 = 原點。
  assert.deepEqual(glowPoint(100, 50, rect), { x: 0, y: 0 });
  // 鼠標在盒子左上方 → 負數（毛哥的第三張卡就是負的，邊框亮在卡片外側那一半，
  // 所以那張卡靠近鼠標的那條邊才會亮）。
  assert.deepEqual(glowPoint(20, 10, rect), { x: -80, y: -40 });
}

// ---------------------------------------------------------------------------
// 2. 小數的 rect（定位祖先的 left 幾乎一定是小數：1440 寬時內容欄左緣 705.6）。
// ---------------------------------------------------------------------------
{
  const rect: GlowRect = { left: 705.6, top: 90.5 };
  const p = glowPoint(1000, 300, rect);
  assert.equal(Math.round(p.x * 10) / 10, 294.4);
  assert.equal(Math.round(p.y * 10) / 10, 209.5);
}

// ---------------------------------------------------------------------------
// 3. 捲動。主要路徑（量的是圖層自己的定位祖先）不必補捲動，因為那個 rect 會跟著
//    捲；量捲動容器的 rect 時才要補。兩種都釘住。
// ---------------------------------------------------------------------------
{
  // (a) 桌機：內容欄自己是 scroller。捲了 600px 之後，欄內那個「跟著內容一起捲」
  //     的聚光宿主，它的 rect.top 就是 90 − 600 = −510；同一個 clientY 因此換算
  //     成比較大的欄內 y。不必再加 scrollTop。
  const hostWhileScrolled: GlowRect = { left: 705.6, top: 90 - 600 };
  assert.deepEqual(glowPoint(800, 300, hostWhileScrolled), {
    x: 800 - 705.6,
    y: 810,
  });

  // (b) 呼叫端手上只有捲動容器的 rect（它不跟著捲，永遠是 top: 90）時，必須自己
  //     把 scrollTop 補回去，才會得到跟 (a) 一樣的答案。
  const scrollerRect: GlowRect = { left: 705.6, top: 90 };
  assert.deepEqual(glowPoint(800, 300, scrollerRect, 0, 600), {
    x: 800 - 705.6,
    y: 810,
  });

  // (c) 沒捲的時候兩種算法本來就一樣。
  assert.deepEqual(
    glowPoint(800, 300, scrollerRect, 0, 0),
    glowPoint(800, 300, scrollerRect),
  );

  // (d) 橫向捲動一樣補得回去（≤850px 時窗口捲的是縱向，但公式不該只對一軸）。
  assert.deepEqual(glowPoint(800, 300, scrollerRect, 120, 600), {
    x: 800 - 705.6 + 120,
    y: 810,
  });

  // (e) Review R F2 的不變量：指標**沒動**（client 座標不變）時，不管捲到哪裡，
  //     換算出來的圓心加回定位祖先的左上角都會落在**同一個視窗座標**上。
  //     這就是修法的全部理由 —— 捲動時不必換公式、不必記捲動量，只要拿同一組
  //     client 座標再跑一次 paint（rect 會自己反映新的捲動位置）就對了。
  //     三個 top 分別是：沒捲、捲了 300（Reviewer 實測 1440 的情形）、捲很多。
  for (const top of [90, -210, -1234.5]) {
    const p = glowPoint(800, 400, { left: 705.6, top });
    assert.equal(Math.round((p.y + top) * 100) / 100, 400, `top=${top} 時視窗 y 要不變`);
    assert.equal(Math.round((p.x + 705.6) * 100) / 100, 800, `top=${top} 時視窗 x 要不變`);
  }
  // 反過來講：只聽 pointermove 而不在捲動時重算，欄內座標就會停在舊值，
  // 畫出來的圓心因此跟著內容一起跑掉 —— 差值正好是捲動量。
  const beforeScroll = glowPoint(800, 400, { left: 705.6, top: 90 });
  const afterScroll = glowPoint(800, 400, { left: 705.6, top: 90 - 300 });
  assert.equal(afterScroll.y - beforeScroll.y, 300);
  assert.equal(beforeScroll.y + (90 - 300), 400 - 300);
}

// ---------------------------------------------------------------------------
// 4. 一次算三張卡：三個圓心必須落在三個不同的地方。
//    這一條就是毛哥「相鄰卡的邊也會亮」的數學：實測他站上鼠標在第二張卡 x=80 時，
//    第一張是 387px、第三張是 −228px。
// ---------------------------------------------------------------------------
{
  // 三張等寬 (307px) 卡，gap 18px：left = 0 / 325 / 650。
  const cards: GlowRect[] = [
    { left: 0, top: 0 },
    { left: 325, top: 0 },
    { left: 650, top: 0 },
  ];
  // 鼠標落在第二張卡內 x=80 的地方 → clientX = 405。
  const pts = glowPoints(405, 120, cards);
  assert.equal(pts.length, 3);
  assert.deepEqual(
    pts.map((p) => p.x),
    [405, 80, -245],
  );
  // 三個 x 互不相同（harness 會在真瀏覽器上量同一件事）。
  assert.equal(new Set(pts.map((p) => p.x)).size, 3);
  // 中間那張是唯一一個落在自己盒子裡的。
  assert.equal(pts[1].x >= 0 && pts[1].x <= 307, true);
  assert.equal(pts[0].x > 307, true);
  assert.equal(pts[2].x < 0, true);
  // y 對三張同一列的卡來說是一樣的。
  assert.deepEqual(
    pts.map((p) => p.y),
    [120, 120, 120],
  );
  // 空陣列不炸（換分頁時格子可能還沒掛上）。
  assert.deepEqual(glowPoints(405, 120, []), []);
}

// ---------------------------------------------------------------------------
// 5. 寫進 style 的字串必須是長度，而且不要吐出 17 位小數。
// ---------------------------------------------------------------------------
{
  assert.equal(glowVar(0), '0px');
  assert.equal(glowVar(80), '80px');
  assert.equal(glowVar(-245), '-245px');
  assert.equal(glowVar(294.4), '294.4px');
  // 705.6 這種 left 減出來的結果。
  assert.equal(glowVar(1000 - 705.6), '294.4px');
  // 四捨五入到 0.1px。
  assert.equal(glowVar(12.34), '12.3px');
  assert.equal(glowVar(12.36), '12.4px');
  assert.match(glowVar(12.345678), /^\d+(\.\d)?px$/);
}

// ---------------------------------------------------------------------------
// 6. `(hover: none)` 的判斷。
// ---------------------------------------------------------------------------
{
  const asked: string[] = [];
  const mouse = (q: string) => {
    asked.push(q);
    return { matches: false };
  };
  const touch = (q: string) => {
    asked.push(q);
    return { matches: q === '(hover: none)' };
  };
  assert.equal(cursorGlowSupported(mouse), true);
  assert.equal(cursorGlowSupported(touch), false);
  assert.deepEqual(asked, ['(hover: none)', '(hover: none)']);
  // 問的必須就是 `(hover: none)` —— 不是 `pointer: coarse`，也不是寬度。
  assert.equal(
    asked.every((q) => q === '(hover: none)'),
    true,
  );
  // 沒有 matchMedia（SSR／古老宿主）→ 不掛。
  assert.equal(cursorGlowSupported(undefined), false);
  assert.equal(cursorGlowSupported(null), false);
  assert.equal(cursorGlowSupported(), false);
}

// ---------------------------------------------------------------------------
// 7. 圓的大小是共用常數，CSS 與這裡要對得上（票面：內容欄 800–1000px、
//    卡片邊框 600px、卡片內部 800px）。
// ---------------------------------------------------------------------------
{
  assert.equal(CONTENT_GLOW_PX, 900);
  assert.equal(CONTENT_GLOW_PX >= 800 && CONTENT_GLOW_PX <= 1000, true);
  assert.equal(CARD_GLOW_PX, 600);
  assert.equal(CARD_SPOT_PX, 800);
}

console.log(
  'Ticket 44 cursor glow: per-box coordinates (three distinct card centres), scroll-compensated form, px formatting and the (hover: none) guard all pass',
);
