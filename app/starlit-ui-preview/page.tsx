import type { Metadata } from 'next';
import StarlitUiPreview from './preview-client';

// Route-level only: the production favicon and layout stay untouched until the
// final integration ticket.
export const metadata: Metadata = {
  title: '星空介面檢查 · 品牌／導覽／社群',
  icons: { icon: '/starlit-brand.svg' },
};

export default function StarlitUiPreviewPage() {
  return <StarlitUiPreview />;
}
