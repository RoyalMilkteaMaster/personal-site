'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { formatSummary, PLAN, SETTLE_MS, startTrial, TRIAL_MS, type Blank, type TrialResult } from '@/lib/nebula-diagnostic';
import './starlit-nebula-diagnostic.css';

const MODE = { on: '開啟', off: '暫停' } as const;
const BLANK: [Blank, string][] = [['yes', '有'], ['no', '無'], ['unsure', '不確定']];
const CHAPTER: Record<string, string> = { '0': '關於我', '1': '我的作品', '2': '聯絡資訊' };

/**
 * Ticket 09：只在 `?nebula-diag=1` 掛載的手機自助對照面板（元件與樣式隨 shell
 * 打包，無 query 時不掛載）。「暫停」經 shell 的 `visible` 接縫：整層 display:none
 * 不再繪製、attachNebula 監聽卸除，DOM 節點保留；資料留在頁面。
 */
export default function StarlitNebulaDiagnostic({ mode, introComplete, chapter, contentRef, onPausedChange }: {
  /** 'simple'（?nebula-diag=off）：掛載後自動暫停星雲，只有狀態與恢復鈕；'full'：四段對照。 */
  mode: 'full' | 'simple';
  introComplete: boolean;
  chapter: string;
  contentRef: RefObject<HTMLElement | null>;
  onPausedChange: (paused: boolean) => void;
}) {
  const [results, setResults] = useState<TrialResult[]>([]);
  const [running, setRunning] = useState<{ step: number; mode: 'on' | 'off' } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(mode === 'simple');
  const [threeVisible, setThreeVisible] = useState(true);
  const [hint, setHint] = useState('');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'manual'>('idle');
  const [closed, setClosed] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const stopRef = useRef<((reason?: string) => void) | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const valids = results.filter(r => r.valid);
  const done = valids.length;
  const next = { step: done + 1, mode: PLAN[done % PLAN.length] };
  // 本輪（4 段）綁定第一段的章節；跨章不可比。
  const roundStart = valids[done - (done % PLAN.length)];
  const round = Math.floor(done / PLAN.length) + 1;

  // 3D 可見性沿用場景本身的判準：canvas 與視窗有任何交集即為可見。場景重試會以
  // 新 canvas 取代舊節點（key=attempt），所以由 stage 的子節點變動改觀察新 canvas。
  // 簡單模式：進頁後就暫停（同一個 visible 接縫），使用者照常走開場、進章、捲動。
  useEffect(() => { if (mode === 'simple') onPausedChange(true); }, [mode, onPausedChange]);
  useEffect(() => {
    if (!introComplete || closed || mode === 'simple') return;
    const stage = document.querySelector('.starlit-stage');
    if (!stage || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(([e]) => {
      setThreeVisible(e.isIntersecting);
      if (e.isIntersecting) stopRef.current?.('3D 進入畫面');
    });
    let current: Element | null = null;
    const follow = () => {
      const canvas = stage.querySelector('canvas');
      if (canvas === current) return;
      if (current) io.unobserve(current);
      current = canvas;
      if (canvas) io.observe(canvas); else setThreeVisible(true);
    };
    const mo = new MutationObserver(follow);
    mo.observe(stage, { childList: true });
    follow();
    return () => { mo.disconnect(); io.disconnect(); };
  }, [introComplete, closed, mode]);
  useEffect(() => { stopRef.current?.('切換章節'); }, [chapter]);
  useEffect(() => () => { stopRef.current?.(); onPausedChange(false); }, [onPausedChange]);
  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now();
    const id = setInterval(() => setRemaining(Math.max(0, Math.ceil((SETTLE_MS + TRIAL_MS - (performance.now() - startedAt)) / 1000))), 1000);
    return () => clearInterval(id);
  }, [running]);

  const setMode = (mode: 'on' | 'off') => { setPaused(mode === 'off'); onPausedChange(mode === 'off'); };
  const start = () => {
    if (threeVisible) { setHint('請先把上方 3D 完全捲出畫面再開始。'); return; }
    if (roundStart && roundStart.chapter !== chapter) { setHint(`本輪已在「${CHAPTER[roundStart.chapter] ?? roundStart.chapter}」開始，請回到同一章再繼續。`); return; }
    setHint('');
    setCopied('idle');
    setConfirmExit(false);
    setMode(next.mode);
    setRunning(next);
    setRemaining((SETTLE_MS + TRIAL_MS) / 1000);
    const cardsOpen = () => contentRef.current?.querySelectorAll('[aria-expanded="true"]').length ?? 0;
    stopRef.current = startTrial({ win: window, doc: document, cardsOpen }, { ...next, chapter }, result => {
      stopRef.current = null;
      setRunning(null);
      setResults(list => [...list, result]);
      setHint(result.valid
        ? (result.note ? '此段有效，但可視高度曾變動；若差異大，先滑到工具列穩定再重試。' : '')
        : `此段無效：${result.reason}。請重試同一段。`);
    });
  };
  // 最近一段尚未回答的空白題；較早的段落可在之後補答。
  let asking = -1;
  for (let i = results.length - 1; i >= 0; i--) if (!results[i].blank) { asking = i; break; }
  const answerBlank = (blank: Blank) => setResults(list => list.map((r, i) => i === asking ? { ...r, blank } : r));
  const exit = () => {
    if (results.length && copied !== 'ok' && !confirmExit) { setConfirmExit(true); return; }
    stopRef.current?.(); setMode('on'); setClosed(true);
  };
  const summary = results.length ? formatSummary(results, {
    time: new Date().toLocaleString('zh-TW', { hour12: false }),
    ua: navigator.userAgent, dpr: devicePixelRatio,
    screen: `${screen.width}×${screen.height}`, inner: `${innerWidth}×${innerHeight}`,
    visual: `${visualViewport?.width ?? '-'}×${visualViewport?.height ?? '-'}`,
    lang: navigator.language, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    touchPoints: navigator.maxTouchPoints,
  }) : '';
  const copy = () => {
    const manual = () => { setCopied('manual'); textRef.current?.select(); };
    if (!navigator.clipboard) return manual();
    navigator.clipboard.writeText(summary).then(() => setCopied('ok'), manual);
  };

  if (closed) return null;
  if (mode === 'simple') return (
    <aside className="starlit-diag" aria-label="星雲測試">
      <p className="starlit-diag-row">
        <b>{paused ? '星雲已暫停（測試）' : '星雲已恢復（正常效果）'}</b>　照常捲動關於我／我的作品即可
        <button type="button" onClick={() => setMode(paused ? 'on' : 'off')}>{paused ? '恢復星雲' : '再次暫停'}</button>
      </p>
    </aside>
  );
  return (
    <aside className="starlit-diag" data-running={Boolean(running)} aria-label="星雲診斷">
      {running ? (
        <p className="starlit-diag-row">
          <b>第{running.step}段 星雲{MODE[running.mode]}</b>　剩 {remaining}s　請在同一區域來回滑動
          <button type="button" onClick={() => stopRef.current?.()}>停止</button>
        </p>
      ) : (
        <>
          <p className="starlit-diag-row">
            <b>星雲診斷</b>　星雲：{paused ? '暫停' : '開啟'}　3D：{threeVisible ? '畫面內' : '畫面外'}
            <button type="button" onClick={exit}>{confirmExit ? '再按一次結束' : '結束並恢復'}</button>
          </p>
          {confirmExit ? <output className="starlit-diag-hint">結果尚未複製，結束後會清掉；再按一次才結束。</output> : null}
          {introComplete ? (
            <>
              <p className="starlit-diag-note">先進關於我或我的作品，把 3D 完全捲出畫面；每段先靜置 {SETTLE_MS / 1000} 秒再量 {TRIAL_MS / 1000} 秒，全程只用手指在同一段文字／卡片區來回滑動，不切章、不開合卡片、不離開 App。順序：開→暫停→暫停→開，同章 4 段為一輪。</p>
              <p className="starlit-diag-row">
                本輪 {done % PLAN.length}/{PLAN.length}（第 {round} 輪）　下一段：第{next.step}段 星雲{MODE[next.mode]}
                <button type="button" onClick={start}>開始</button>
                {summary ? <button type="button" onClick={copy}>{copied === 'ok' ? '已複製' : '複製結果'}</button> : null}
              </p>
              {hint ? <output className="starlit-diag-hint">{hint}</output> : null}
              {asking >= 0 ? (
                <fieldset className="starlit-diag-row" data-blank-question="">
                  <legend>第{results[asking].step}段滑動時，新露出的內容有沒有空白數秒才出現？</legend>
                  {BLANK.map(([value, label]) => <button key={value} type="button" onClick={() => answerBlank(value)}>{label}</button>)}
                </fieldset>
              ) : null}
              {copied === 'manual' ? <output className="starlit-diag-hint">無法自動複製，請長按下方文字全選複製。</output> : null}
              {summary ? <textarea ref={textRef} className="starlit-diag-text" readOnly value={summary} aria-label="診斷結果" /> : null}
            </>
          ) : <p className="starlit-diag-note">診斷模式已開啟：請先進入任一章節。</p>}
        </>
      )}
    </aside>
  );
}
