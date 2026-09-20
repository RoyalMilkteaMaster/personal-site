'use client';

import { useState } from 'react';
import StarlitShell from '@/components/starlit-shell';

const POEM = [
  '將星空斟入玉觴，',
  '將靈感釀成嚮往。',
  '當散落的星願，漸漸勾勒出同一片遠方，',
  '我願摘下星火，執炬先行，為世界添上第一抹燦光。',
];

const panel: React.CSSProperties = {
  position: 'fixed',
  right: 12,
  bottom: 12,
  zIndex: 20,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  maxWidth: 'calc(100vw - 24px)',
  padding: '10px 14px',
  border: '1px solid #ffffff33',
  borderRadius: 14,
  background: '#111727ee',
  color: '#f0ede8',
  font: '13px/1.6 Arial, sans-serif',
};

const control: React.CSSProperties = {
  padding: '7px 12px',
  border: '1px solid #ffffff33',
  borderRadius: 999,
  background: '#ffffff12',
  color: '#f0ede8',
  font: 'inherit',
  cursor: 'pointer',
};

export default function StarlitUiPreview() {
  const [introComplete, setIntroComplete] = useState(false);
  const [active, setActive] = useState('0');
  const [replays, setReplays] = useState(0);

  return (
    <>
      <StarlitShell
        introComplete={introComplete}
        active={active}
        onActiveChange={setActive}
        onReplay={() => {
          setReplays((n) => n + 1);
          setActive('0');
          setIntroComplete(false);
        }}
        stage={
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background:
                'radial-gradient(1.5px 1.5px at 20% 30%, #fff8, transparent),' +
                'radial-gradient(1.5px 1.5px at 70% 20%, #e0c49daa, transparent),' +
                'radial-gradient(2px 2px at 45% 65%, #c0a7e5aa, transparent),' +
                'radial-gradient(1.5px 1.5px at 82% 72%, #fff6, transparent),' +
                'radial-gradient(ellipse at 50% 50%, #25213f, #080c19 75%)',
              color: '#b9b2d1',
              font: '12px/1.8 Arial, sans-serif',
              letterSpacing: 2,
              textAlign: 'center',
            }}
          >
            STAGE PLACEHOLDER
            <br />
            （3D 開場由 01／05 接上）
          </div>
        }
      >
        <p style={{ color: '#c0a7e5', letterSpacing: 2, font: '12px Arial' }}>
          ROYAL MILKTEA MASTER
        </p>
        {POEM.map((line) => (
          <p key={line} style={{ fontSize: 19, lineHeight: 2, margin: 0 }}>
            {line}
          </p>
        ))}
      </StarlitShell>
      <div style={panel}>
        <strong>UI 檢查（預覽工具，不屬於產品）</strong>
        <button
          type="button"
          style={control}
          onClick={() => setIntroComplete((v) => !v)}
        >
          {introComplete ? '切回開場中' : '切到開場完成'}
        </button>
        <span>
          introComplete={String(introComplete)} · active={active} · replays=
          {replays}
        </span>
      </div>
    </>
  );
}
