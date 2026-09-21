'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { attachNebula, NEBULA_STARS } from '@/lib/starlit-nebula';
import './starlit-nebula.css';

/** active 由 shell 決定是否位於內容頁；visible 可承接外部可見性。 */
export default function StarlitNebula({ hostRef, active, visible = true }: {
  hostRef: RefObject<HTMLElement | null>;
  active: boolean;
  visible?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cloudId = useId().replace(/:/g, "");
  useEffect(() => {
    if (!active || !visible || !hostRef.current || !layerRef.current) return;
    return attachNebula(hostRef.current, layerRef.current);
  }, [hostRef, active, visible]);
  return (
    <div className="starlit-nebula" ref={layerRef} aria-hidden="true" hidden={!active || !visible}>
      <svg className="starlit-nebula-field starlit-nebula-dark" viewBox="0 0 800 1000" preserveAspectRatio="none" focusable="false">
        <defs>
          {/* 方向性雲帶、細絲與遮蔽共用同一幾何；噪聲只打散密度及邊緣。 */}
          <filter id={`${cloudId}-wisps`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.035" numOctaves="3" seed="17" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 2.4 0 -0.55" result="density" />
            <feComposite in="SourceGraphic" in2="density" operator="in" result="cloud" />
            <feDisplacementMap in="cloud" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
          <filter id={`${cloudId}-soft`}><feGaussianBlur stdDeviation="12" /></filter>
          <linearGradient id={`${cloudId}-taper`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.3" stopColor="white" stopOpacity="0.65" />
            <stop offset="0.65" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${cloudId}-dust`} maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="1000">
            <rect width="800" height="1000" fill={`url(#${cloudId}-taper)`} />
            <g fill="none" stroke="black" filter={`url(#${cloudId}-soft)`}>
              <path d="M80 780 C340 560 320 520 480 490 S650 320 790 290" strokeWidth="38" />
              <path d="M240 40 C340 180 500 150 640 90" strokeWidth="70" />
            </g>
          </mask>
          <g id={`${cloudId}-field`} fill="none" stroke="currentColor" mask={`url(#${cloudId}-dust)`}>
            <g filter={`url(#${cloudId}-soft)`} opacity="0.3">
              <path d="M-100 920 C180 850 160 650 380 580 S500 310 860 240" strokeWidth="110" />
              <path d="M60 330 C240 320 250 190 430 220 S660 100 850 40" strokeWidth="65" />
            </g>
            <g filter={`url(#${cloudId}-wisps)`}>
              <path d="M-70 940 C160 840 190 630 382 590 S580 320 850 250" strokeWidth="40" opacity="0.45" />
              <path d="M-30 880 C170 805 186 640 395 565 S578 312 850 225" strokeWidth="9" opacity="0.65" />
              <path d="M80 820 C210 760 230 598 418 550 S605 295 800 205" strokeWidth="3" opacity="0.85" />
              <path d="M180 850 C380 700 332 660 450 610 S590 400 780 372" strokeWidth="15" opacity="0.28" />
              <path d="M10 335 C230 370 258 195 444 238 S650 132 820 55" strokeWidth="28" opacity="0.35" />
              <path d="M50 340 C234 344 266 182 452 216 S650 105 820 35" strokeWidth="4" opacity="0.65" />
              <path d="M130 368 C285 316 280 240 474 262 S670 158 830 116" strokeWidth="2" opacity="0.45" />
            </g>
          </g>
        </defs>
        <use href={`#${cloudId}-field`} />
      </svg>
      {/* Ticket 10：≤850px 改顯示由同一幾何預先算好的 alpha 貼圖（scripts/render-nebula-cloud.mjs），
          不再即時跑 SVG 濾鏡；桌面由 CSS 保持原 svg。同樣的 field 類別讓漂移／暫停／reduced-motion 一致。 */}
      <div className="starlit-nebula-field starlit-nebula-texture starlit-nebula-dark" />
      <div className="starlit-nebula-reactive">
      <div className="starlit-nebula-light">
        <svg className="starlit-nebula-field" viewBox="0 0 800 1000" preserveAspectRatio="none" focusable="false">
          <use href={`#${cloudId}-field`} />
        </svg>
        <div className="starlit-nebula-field starlit-nebula-texture" />
      </div>
      <div className="starlit-nebula-stars">
      {NEBULA_STARS.map((star, i) => (
        <i key={i} className="starlit-nebula-star" style={{ left: `${star.x}%`, top: `${star.y}%`, backgroundColor: star.color, width: star.size, height: star.size * 1.6 }} />
      ))}
      </div>
      </div>
      <div className="starlit-nebula-far" />
    </div>
  );
}
