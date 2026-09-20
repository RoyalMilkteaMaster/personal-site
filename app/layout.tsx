import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'皇家奶茶大師 · 星空工房',description:'Pin Hung Lin 的 AI 工具、自動化與遊戲創作。'};
// Ticket 30-D.6 added preconnects for fonts.googleapis.com / fonts.gstatic.com.
// Ticket 30-B was withdrawn by the user on 2026-09-17, so nothing is fetched
// from either origin any more and the preconnects are gone with it — a
// preconnect to a host the page never contacts is a wasted connection, not a
// harmless leftover. The one font origin left, font.emtech.cc, is reached from
// the first `@import` in globals.css and was never preconnected.
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-Hant"><body>{children}</body></html>}
