import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'皇家奶茶大師 · 星空工房',description:'Pin Hung Lin 的 AI 工具、自動化與遊戲創作。'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-Hant"><body>{children}</body></html>}
