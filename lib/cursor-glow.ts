/* ---------------------------------------------------------------------------
   Ticket 44 — 鼠標漸亮（毛哥 elvismao.com/zh-Hant/code 的做法）的座標換算。

   毛哥的整個效果是「純 CSS ＋幾行 JS」：JS 在容器上聽一次 pointermove，對每一個
   要發亮的盒子算出「鼠標相對這個盒子左上角的位置」，寫進該盒子的 `--mouse-x`／
   `--mouse-y`，CSS 再用 `radial-gradient(… circle at var(--mouse-x) var(--mouse-y) …)`
   畫。會算錯的只有這一步減法，所以這一步住在這裡、有自己的單元測試，元件那邊
   只剩「讀 rect、寫變數」。

   為什麼要收在純函式裡而不是寫在元件內：
   - 捲動。內容欄在桌機是自己的 scroller、在 ≤850px 是視窗在捲。兩種情況下
     `getBoundingClientRect()` 回的都是「聚光圖層自己的定位祖先」在視窗裡的位置，
     已經把捲動算進去了，所以主要路徑不需要再加 scrollTop。但如果呼叫端量的是
     「捲動容器」而不是「圖層的定位祖先」的 rect，就要自己把捲動補回來 ——
     `glowPoint()` 收兩個可選的捲動位移就是為了這一種呼叫方式，並且兩種都有測試
     釘住，免得以後有人改了 DOM 結構才發現公式只對一半。
   - 單位。CSS 的 `circle at X Y` 要的是長度，不是裸數字；`glowVar()` 是唯一產生
     那個字串的地方（四捨五入到 0.1px —— 定位祖先的 left 常常是 705.6 這種小數，
     直接丟原始浮點數進 style 會寫出 17 位數的字串）。
   - `(hover: none)` 的判斷。沒有鼠標的裝置不掛監聽也不寫變數，判斷式在這裡就能
     單獨測，不必開瀏覽器。

   沒有依賴、沒有 DOM API：只吃數字與一個 `matchMedia` 形狀的函式。
   --------------------------------------------------------------------------- */

/** 聚光圖層（或卡片）的方框，只用得到左上角。DOMRect 可直接傳進來。 */
export type GlowRect = { left: number; top: number };

/** 換算後的點，單位是 CSS px，原點在該盒子的左上角。 */
export type GlowPoint = { x: number; y: number };

/** 內容欄聚光的圓直徑。CSS 的 `.starlit-glow` 寫同一個數字，改一邊要改兩邊。 */
export const CONTENT_GLOW_PX = 900;

/** 作品卡邊框聚光的圓直徑（`.starlit-ember::after`）。 */
export const CARD_GLOW_PX = 600;

/** 作品卡內部聚光的圓直徑（`.starlit-ember-spot`）。 */
export const CARD_SPOT_PX = 800;

/**
 * 鼠標相對某個盒子左上角的位置。
 *
 * `clientX`／`clientY` 是 PointerEvent 給的視窗座標；`rect` 是**聚光圖層自己的
 * 定位祖先**的 `getBoundingClientRect()`（不是捲動容器的）。那個 rect 會隨著捲動
 * 一起往上跑，所以捲動已經被算進去，`scrollLeft`／`scrollTop` 預設 0。
 *
 * 只有在呼叫端量的是捲動容器的 rect（也就是 rect 不會跟著內容捲）時，才要把該
 * 容器的捲動位移傳進來把差補回去。
 */
export function glowPoint(
  clientX: number,
  clientY: number,
  rect: GlowRect,
  scrollLeft = 0,
  scrollTop = 0,
): GlowPoint {
  return {
    x: clientX - rect.left + scrollLeft,
    y: clientY - rect.top + scrollTop,
  };
}

/**
 * 同一個鼠標位置對一串盒子各算一次 —— 毛哥讓「相鄰卡片的邊也會亮」的關鍵：
 * 每張卡都知道鼠標相對自己的位置，鼠標在中間那張時，左邊那張拿到的是正的大數、
 * 右邊那張拿到的是負數，三張的漸層圓心因此落在三個不同的地方。
 */
export function glowPoints(
  clientX: number,
  clientY: number,
  rects: readonly GlowRect[],
): GlowPoint[] {
  return rects.map((rect) => glowPoint(clientX, clientY, rect));
}

/**
 * 寫進 CSS 自訂屬性的字串。四捨五入到 0.1px：harness 用 ±1px 對答案，而定位
 * 祖先的 left/top 常常是小數，原始浮點數會寫出一長串沒有意義的位數。
 */
export function glowVar(value: number): string {
  return `${Math.round(value * 10) / 10}px`;
}

/**
 * 這個裝置該不該掛鼠標聚光。沒有 `matchMedia`（SSR、或古老的宿主）就當作不該掛
 * —— 效果是純裝飾，寧可不掛也不要在觸控裝置上留下一團卡住不動的光。
 */
export function cursorGlowSupported(
  matchMediaFn?: ((query: string) => { matches: boolean }) | null,
): boolean {
  if (typeof matchMediaFn !== 'function') return false;
  return !matchMediaFn('(hover: none)').matches;
}
