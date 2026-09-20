'use client';
import { useEffect, useRef, useState } from 'react';
import { mountFantasyScene } from './scene-study.mjs';
const button = { color: 'white', background: '#10182d', border: '1px solid #65769b', padding: '8px 12px', cursor: 'pointer' };
const views = [{ step: 0, label: '臉部極近景' }, { step: 1, label: '正面' }, { step: 2, label: '背面' }, { step: 4, label: '奶茶' }, { step: 5, label: '全身' }];
export default function SkyStudy() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [variant, setVariant] = useState('B');
  const [openingStudy, setOpeningStudy] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [external, setExternal] = useState(false);
  const [view, setView] = useState(0);
  const [demoSteps, setDemoSteps] = useState([0,1,2,5]);
  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState({ readingStep: -1, settled: false });
  const [error, setError] = useState('');
  const commands = useRef({ pose: 0, replay: 0, language: 'zh', readingStep: 0, contentOpen: false, onIntroState: setProgress });
  useEffect(() => {
    if (!canvas.current) return;
    return mountFantasyScene(canvas.current, () => commands.current, setError, { starlit: true });
  }, []);
  useEffect(() => {
    if (demoIndex === null || !progress.settled || progress.readingStep !== demoSteps[demoIndex]) return;
    const timer = window.setTimeout(() => {
      if (demoIndex === demoSteps.length - 1) { setDemoIndex(null); return; }
      const next = demoIndex + 1;
      commands.current.readingStep = demoSteps[next];
      setView(demoSteps[next]);
      setDemoIndex(next);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [demoIndex, demoSteps, progress.settled, progress.readingStep]);
  const selectView = (step: number) => {
    setDemoIndex(null);
    setExternal(false);
    setView(step);
    commands.current.readingStep = step;
  };
  return <main style={{ position: 'fixed', inset: 0, background: '#030611' }}>
    <canvas ref={canvas} data-variant={variant} data-opening-study={openingStudy} data-playing={playing} data-speed={speed} data-external={external} aria-label="開場星空 A/B 即時對照" style={{ width: '100%', height: '100%', display: 'block' }} />
    <nav aria-label="診斷版本與視角" style={{ position: 'absolute', left: 16, right: 16, top: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {['A', 'B', 'C', 'D', 'E'].map(v => <button key={v} aria-pressed={variant === v} onClick={() => setVariant(v)} style={{ ...button, background: variant === v ? '#304478' : '#10182d' }}>{v === 'A' ? 'A · 現有 v2' : v === 'B' ? 'B · 立體厚星群' : v === 'C' ? 'C · 舊尺度試驗' : v === 'D' ? 'D · 較疏較大星群' : 'E · 中間密度星群'}</button>)}
      <button aria-pressed={openingStudy} onClick={() => setOpeningStudy(v => !v)} style={button}>{openingStudy ? '多色微漂移 · 比較原開場' : '原藍色開場 · 看多色微漂移'}</button>
      {views.map(v => <button key={v.step} aria-pressed={!external && view === v.step} onClick={() => selectView(v.step)} style={{ ...button, background: !external && view === v.step ? '#304478' : '#10182d' }}>{v.label}</button>)}
      <button onClick={() => {
        if (demoIndex !== null) { setDemoIndex(null); return; }
        setExternal(false); setDemoSteps([0,1,2,5]); setView(0); commands.current.readingStep = 0; setDemoIndex(0);
      }} style={button}>{demoIndex === null ? '播放轉場 · 近景→正面→背面→全身' : '停止轉場示範'}</button>
      <button onClick={() => { setExternal(false); setDemoSteps([2,4,5]); setView(2); commands.current.readingStep = 2; setDemoIndex(0); }} style={button}>背面→奶茶→全身</button>
      {(variant === 'B' || variant === 'D' || variant === 'E') && <>
        <button onClick={() => setPlaying(v => !v)} style={button}>{playing ? '暫停星群' : '播放星群'}</button>
        <button onClick={() => setSpeed(v => v === 1 ? 3 : 1)} style={button}>{speed === 1 ? '星群1× 原速 · 切換3×' : '星群3× 僅檢視加速 · 切回原速'}</button>
        <button aria-pressed={external} onClick={() => { setDemoIndex(null); setExternal(v => !v); }} style={button}>{external ? '返回人物視角' : '外部視角'}</button>
      </>}
    </nav>
    {error && <p role="alert" style={{ position: 'absolute', top: 150, left: 16, color: 'white' }}>{error}</p>}
  </main>;
}
