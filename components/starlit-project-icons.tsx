'use client';

import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { PROJECT_ICON_ART } from './starlit-project-icon-art';

// 造型直接隨元件渲染，避免外部 SVG 載入失敗後仍持有空白文件。
function projectIcon(id: keyof typeof PROJECT_ICON_ART): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function ProjectIcon(
    { size = 24, color = 'currentColor', strokeWidth = 1.5, absoluteStrokeWidth, children, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        color={color}
        strokeWidth={absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {PROJECT_ICON_ART[id]}
        {children}
      </svg>
    );
  });
  Icon.displayName = `ProjectIcon(${id})`;
  return Icon;
}

export const MarketCouncilIcon = projectIcon('market-council');
export const CbIcon = projectIcon('cb');
export const MilkteaIcon = projectIcon('milktea');
export const LolHighlightsIcon = projectIcon('lol-highlights');
export const XuerongIcon = projectIcon('xuerong');

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  'market-council': MarketCouncilIcon,
  cb: CbIcon,
  milktea: MilkteaIcon,
  'lol-highlights': LolHighlightsIcon,
  'xuerong-clawd': XuerongIcon,
};
