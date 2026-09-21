// Ticket 09：手機自助的星雲開／暫停對照。只讀單一 rAF 串流與輸入計數，
// 資料留在頁面，由使用者自行複製；不是 GPU 時間，也不是精確顯示 FPS。
export const TRIAL_MS = 10000;
/** 每段開始先丟掉的 rAF 時間：模式切換的 display 變更／重新光柵化落在這裡，兩模式相同。 */
export const SETTLE_MS = 500;
export const DIAG_VERSION = '09-r2';
export const PLAN = ['on', 'off', 'off', 'on'] as const; // ABBA
export type Mode = (typeof PLAN)[number];

export type Stats = { mean: number; p50: number; p95: number; p99: number; max: number; over50: number; over100: number };
export type Blank = 'yes' | 'no' | 'unsure';
export type TrialResult = {
  step: number; mode: Mode; chapter: string; cardsOpen: number;
  /** 使用者主觀回答：這段滑動時是否看到內容空白數秒才出現。 */
  blank?: Blank;
  valid: boolean; reason: string | null; note: string | null;
  elapsedMs: number; frames: number; scrolls: number; touchStarts: number; touchMoves: number;
  viewport: { width: number; height: number; heightMin: number; heightMax: number };
  intervals: Stats | null;
};
export type TrialEnv = { win: Window; doc: Document; cardsOpen: () => number };

export function percentiles(intervals: number[]): Stats {
  const sorted = [...intervals].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? 0;
  return {
    mean: sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1),
    p50: rank(0.5), p95: rank(0.95), p99: rank(0.99), max: sorted[sorted.length - 1] ?? 0,
    over50: sorted.filter(v => v > 50).length, over100: sorted.filter(v => v > 100).length,
  };
}

/** 回傳 stop(reason?)：無 reason 為手動停止；有 reason 為外部無效化（切章、3D 進入畫面）。 */
export function startTrial(env: TrialEnv, ctx: { mode: Mode; step: number; chapter: string }, done: (result: TrialResult) => void): (reason?: string) => void {
  const { win, doc } = env;
  const vv = win.visualViewport;
  const width = vv?.width ?? win.innerWidth, height = vv?.height ?? win.innerHeight;
  const viewport = { width, height, heightMin: height, heightMax: height };
  const cardsOpen = env.cardsOpen();
  const intervals: number[] = [];
  let t0: number | null = null, first: number | null = null, last = 0, frames = 0, raf = 0;
  let scrolls = 0, touchStarts = 0, touchMoves = 0;
  let finished = false;
  const finish = (reason: string | null) => {
    if (finished) return;
    finished = true;
    if (raf) win.cancelAnimationFrame(raf);
    doc.removeEventListener('scroll', onScroll, { capture: true });
    doc.removeEventListener('touchstart', onTouchStart);
    doc.removeEventListener('touchmove', onTouchMove);
    doc.removeEventListener('visibilitychange', onVisibility);
    vv?.removeEventListener('resize', onResize);
    if (!reason && scrolls === 0) reason = '沒有實際捲動';
    // 手機協定：星雲由 touchstart/touchmove 喚醒，沒有手指滑動的視窗不算對照（桌面滑鼠測試因此為無效，屬預期）。
    if (!reason && touchMoves === 0) reason = '沒有實際手指滑動';
    if (!reason && env.cardsOpen() !== cardsOpen) reason = '卡片開合改變';
    const note = viewport.heightMin !== viewport.heightMax
      ? `可視高度 ${viewport.height}→${viewport.heightMin}–${viewport.heightMax}（工具列變動）` : null;
    done({
      step: ctx.step, mode: ctx.mode, chapter: ctx.chapter, cardsOpen,
      valid: reason === null, reason, note,
      elapsedMs: first === null ? 0 : last - first, frames, scrolls, touchStarts, touchMoves,
      viewport, intervals: intervals.length ? percentiles(intervals) : null,
    });
  };
  const onFrame = (now: number) => {
    raf = 0;
    if (t0 === null) t0 = now;
    if (now - t0 < SETTLE_MS) { raf = win.requestAnimationFrame(onFrame); return; }
    frames++;
    if (first === null) { first = now; scrolls = touchStarts = touchMoves = 0; } else intervals.push(now - last);
    last = now;
    if (now - first >= TRIAL_MS) return finish(null);
    raf = win.requestAnimationFrame(onFrame);
  };
  const onScroll = () => { scrolls++; };
  const onTouchStart = () => { touchStarts++; };
  const onTouchMove = () => { touchMoves++; };
  const onVisibility = () => { if (doc.hidden) finish('頁面切到背景'); };
  const onResize = () => {
    if (!vv) return;
    if (vv.width !== width) return finish('視窗寬度或方向改變');
    viewport.heightMin = Math.min(viewport.heightMin, vv.height);
    viewport.heightMax = Math.max(viewport.heightMax, vv.height);
  };
  doc.addEventListener('scroll', onScroll, { passive: true, capture: true });
  doc.addEventListener('touchstart', onTouchStart, { passive: true });
  doc.addEventListener('touchmove', onTouchMove, { passive: true });
  doc.addEventListener('visibilitychange', onVisibility);
  vv?.addEventListener('resize', onResize);
  raf = win.requestAnimationFrame(onFrame);
  return (reason?: string) => finish(reason ?? '手動停止');
}

export type DeviceInfo = { time: string; ua: string; dpr: number; screen: string; inner: string; visual: string; lang: string; reducedMotion: boolean; touchPoints: number };
const MODE_LABEL: Record<Mode, string> = { on: '開啟', off: '暫停' };
const BLANK_LABEL: Record<Blank, string> = { yes: '有', no: '無', unsure: '不確定' };
const CHAPTER_LABEL: Record<string, string> = { '0': '關於我', '1': '我的作品', '2': '聯絡資訊' };
const ms = (v: number) => `${v.toFixed(1)}ms`;

export function formatSummary(results: TrialResult[], info: DeviceInfo): string {
  const lines = [
    `星雲診斷結果（iPhone 自助對照）｜診斷版本 ${DIAG_VERSION}｜${info.time}`,
    `UA: ${info.ua}`,
    `DPR ${info.dpr}｜screen ${info.screen}｜inner ${info.inner}｜visualViewport ${info.visual}｜lang ${info.lang}｜reduced-motion ${info.reducedMotion ? '是' : '否'}｜touch ${info.touchPoints}`,
    `每段先靜置 ${SETTLE_MS / 1000}s 再量 ${TRIAL_MS / 1000}s；rAF 間隔不是 GPU 耗時，也不是精確顯示 FPS。`,
  ];
  for (const r of results) {
    const head = `第${r.step}段 ${MODE_LABEL[r.mode]} ${r.valid ? '有效' : `無效（${r.reason}）`}｜${CHAPTER_LABEL[r.chapter] ?? r.chapter}｜已開卡片 ${r.cardsOpen}｜內容空白 ${r.blank ? BLANK_LABEL[r.blank] : '未回答'}`;
    const body = r.intervals
      ? `實際 ${(r.elapsedMs / 1000).toFixed(2)}s｜幀 ${r.frames}｜平均 ${ms(r.intervals.mean)}｜p50 ${ms(r.intervals.p50)}｜p95 ${ms(r.intervals.p95)}｜p99 ${ms(r.intervals.p99)}｜最長 ${ms(r.intervals.max)}｜>50ms ${r.intervals.over50}｜>100ms ${r.intervals.over100}｜scroll ${r.scrolls}｜touchstart ${r.touchStarts}｜touchmove ${r.touchMoves}`
      : `幀 ${r.frames}｜scroll ${r.scrolls}`;
    lines.push(head, '  ' + body + (r.note ? `｜${r.note}` : ''));
  }
  lines.push('請補上：iOS 版本／是否低電量模式／機身是否發熱／是否開了卡片');
  return lines.join('\n');
}
