import assert from 'node:assert/strict';
import { formatSummary, percentiles, startTrial, TRIAL_MS, SETTLE_MS, PLAN, type TrialResult } from './nebula-diagnostic.ts';

// 分位數：最近名次法，長間隔門檻 50／100 ms。
const stats = percentiles([16, 17, 16, 120, 16, 55, 16, 16, 16, 16]);
assert.equal(stats.p50, 16);
assert.equal(stats.p95, 120);
assert.equal(stats.max, 120);
assert.equal(stats.over50, 2);
assert.equal(stats.over100, 1);
assert.equal(Math.round(stats.mean * 10) / 10, 30.4);
assert.deepEqual(PLAN, ['on', 'off', 'off', 'on'], 'ABBA：開、暫停、暫停、開');
console.log('PASS: percentiles');

// 瀏覽器是外部邊界：假 RAF／時鐘／事件目標，驗證公開 startTrial 行為與清理。
let now = 0;
let sequence = 0;
const frames = new Map<number, FrameRequestCallback>();
// 監聽計數：finish 後存活監聽必須為 0（Reviewer B：只看 result 快照的斷言抓不到外洩）。
const live = { size: 0 };
const counting = <T extends object>(extra: T) => {
  const target = new EventTarget();
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  return Object.assign(target, extra, {
    addEventListener(type: string, fn: EventListenerOrEventListenerObject | null, opts?: unknown) { live.size++; add(type, fn, opts as AddEventListenerOptions); },
    removeEventListener(type: string, fn: EventListenerOrEventListenerObject | null, opts?: unknown) { live.size--; remove(type, fn, opts as EventListenerOptions); },
  });
};
const viewport = counting({ width: 402, height: 681 });
const win = Object.assign(new EventTarget(), {
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++sequence, fn); return sequence; },
  cancelAnimationFrame: (id: number) => { frames.delete(id); },
  visualViewport: viewport,
  innerWidth: 402,
  innerHeight: 681,
});
const doc = counting({ hidden: false });
let cards = 0;
const env = { win: win as unknown as Window, doc: doc as unknown as Document, cardsOpen: () => cards };
const tick = (dt: number) => {
  now += dt;
  const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
};
const send = (target: EventTarget, type: string) => {
  const event = new Event(type, { cancelable: true });
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, `${type} 不攔截預設操作`);
};
const run = (mode: 'on' | 'off', chapter = '0') => {
  let result: TrialResult | null = null;
  const stop = startTrial(env, { mode, step: 1, chapter }, r => { result = r; });
  return { stop, result: () => result as TrialResult | null };
};

// 正常：實際手指捲動、單一 RAF 串流、先靜置 SETTLE_MS 再以 RAF 時間戳量 TRIAL_MS，不靠 setTimeout。
let t = run('on');
assert.equal(frames.size, 1, '只掛一個 RAF 串流');
assert.ok(live.size >= 5, '試驗中掛有監聽');
let t0 = now; tick(16);
send(doc, 'scroll'); send(doc, 'touchmove'); // 靜置期的輸入不計
while (now < t0 + 16 + SETTLE_MS) tick(16);
tick(16); // 第一個量測幀
for (let i = 0; i < 20; i++) { send(doc, 'touchmove'); send(doc, 'scroll'); tick(16); }
send(doc, 'touchstart');
tick(90); // 一次長間隔
viewport.height = 734; send(viewport, 'resize'); // Safari 工具列收合：記錄，不判無效
while (!t.result()) tick(16);
let r = t.result()!;
assert.equal(r.valid, true);
assert.equal(r.reason, null);
assert.equal(r.mode, 'on');
assert.equal(r.scrolls, 20, '靜置期的捲動不計');
assert.equal(r.touchMoves, 20);
assert.equal(r.touchStarts, 1);
assert.ok(r.elapsedMs >= TRIAL_MS && r.elapsedMs < TRIAL_MS + 16, `首末 RAF 差 ${r.elapsedMs}`);
assert.ok(Math.abs(r.frames - (Math.round((r.elapsedMs - 90) / 16) + 2)) <= 1, `量測幀數 ${r.frames} 不含靜置幀`);
assert.equal(r.intervals!.max, 90);
assert.equal(r.intervals!.over50, 1);
assert.equal(r.intervals!.p50, 16);
assert.deepEqual(r.viewport, { width: 402, height: 681, heightMin: 681, heightMax: 734 });
assert.match(r.note!, /681/);
assert.equal(frames.size, 0, '結束後不再排程');
assert.equal(live.size, 0, '結束後 document／visualViewport 監聽全部卸除');
console.log('PASS: valid trial with real touch scroll, settle, toolbar height noted');

// 只有 scroll 沒有手指滑動（滑鼠滾輪、程式 scrollTo）：無效。
viewport.height = 681;
t = run('on');
t0 = now; tick(16); while (now < t0 + 16 + SETTLE_MS) tick(16); tick(16);
for (let i = 0; i < 5; i++) { send(doc, 'scroll'); tick(16); }
while (!t.result()) tick(16);
assert.equal(t.result()!.reason, '沒有實際手指滑動');
assert.equal(t.result()!.scrolls, 5);
assert.equal(live.size, 0);

// 無實際捲動：跑完但無效。
viewport.height = 681;
t = run('off', '1');
while (!t.result()) tick(16);
const noScroll = t.result()!;
r = noScroll;
assert.equal(r.valid, false);
assert.equal(r.reason, '沒有實際捲動');
assert.equal(r.mode, 'off');
assert.equal(r.chapter, '1');
assert.equal(r.note, null);
console.log('PASS: no scroll invalidates');

// 頁面切到背景：立刻結束並無效。
t = run('on');
tick(16); send(doc, 'scroll'); tick(16);
doc.hidden = true; send(doc, 'visibilitychange');
r = t.result()!;
assert.equal(r.valid, false);
assert.equal(r.reason, '頁面切到背景');
assert.equal(frames.size, 0);
doc.hidden = false;

// 手動停止／外部無效化（切章、3D 進入畫面）。
t = run('on');
tick(16); send(doc, 'scroll');
t.stop();
assert.equal(t.result()!.reason, '手動停止');
assert.equal(live.size, 0, '手動停止亦卸除監聽');
t = run('on');
tick(16); send(doc, 'scroll');
t.stop('3D 進入畫面');
assert.equal(t.result()!.reason, '3D 進入畫面');
assert.equal(frames.size, 0);

// 寬度／方向改變無效；卡片開合改變無效。
t = run('on');
tick(16); send(doc, 'scroll'); tick(16);
viewport.width = 874; send(viewport, 'resize');
assert.equal(t.result()!.reason, '視窗寬度或方向改變');
viewport.width = 402;
t = run('on');
t0 = now; tick(16); while (now < t0 + 16 + SETTLE_MS) tick(16); tick(16);
send(doc, 'scroll'); send(doc, 'touchmove');
cards = 1;
while (!t.result()) tick(16);
assert.equal(t.result()!.reason, '卡片開合改變');
assert.equal(t.result()!.cardsOpen, 0, '記錄開始時的卡片數');
cards = 0;
console.log('PASS: hidden, stop, external invalidation, width, cards');

// 摘要文字：純文字、含限制聲明、每段一行、可貼回聊天。
const text = formatSummary([noScroll], { time: '2026-09-21 14:00:00', ua: 'TestUA', dpr: 3, screen: '402×874', inner: '402×681', visual: '402×681', lang: 'zh-TW', reducedMotion: false, touchPoints: 5 });
assert.match(text, /星雲診斷/);
assert.match(text, /TestUA/);
assert.match(text, /rAF 間隔不是 GPU 耗時/);
assert.match(text, /診斷版本 09-r2｜2026-09-21 14:00:00/);
assert.match(text, /請補上：iOS 版本／是否低電量模式／機身是否發熱/);
assert.match(text, /第1段 暫停 無效/);
assert.match(text, /沒有實際捲動/);
assert.match(text, /內容空白 未回答/);
assert.match(formatSummary([{ ...noScroll, blank: 'yes' }], { time: '', ua: '', dpr: 3, screen: '', inner: '', visual: '', lang: '', reducedMotion: false, touchPoints: 5 }), /內容空白 有/);
console.log('PASS: summary text');
