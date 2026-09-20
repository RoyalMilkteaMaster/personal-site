# 46 — 作品頁中文標題「皇家奶茶大師的／作品集」＋ 開啟面字級稍大、置中

使用者於 2026-09-19：「改成 皇家奶茶大師的作品集好了 我忘記中英文有分了」「這個卡片（開啟面）我想要字體稍微放大一點點 然後有置中的感覺」。

## 核准需求
1. `works.title`／`titleEm`：**zh**「皇家奶茶大師的」＋金色「作品集」；**en** 維持 "Royal Milktea Master's" / "Project Base"。（Coordinator 假設兩行拆法為「皇家奶茶大師的／作品集」，已向使用者標明。）
2. 開啟面：頭列（小圖示＋名稱）置中、名稱 16→17px；簡介 14→15px、置中；連結列維持一左一右（Ticket 40.2 使用者明定）。

## 範圍
`lib/site-copy.ts`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`、harness `followup-46/`（從 followup-43 派生，h1 釘子改中英分開、頭列置中與字級釘子）。小票：Coordinator 直接改，一位 Opus 5 high Reviewer 與 44 一併看。

## 交付狀態
- 2026-09-19 Coordinator 實作。
- 2026-09-19 Coordinator：copy／CSS／SSR 測試改好，tsc 與五支測試綠。harness `followup-46/` 派生自 43（h1 釘子維持英文——harness 驗作品頁前已切英文；中文由 SSR 測試釘）＋ face46 探針。單獨重跑時被 Ticket 45 同時改寫中的火層擋在 41.2（洞成正圓），非本票；46 的斷言已被 44／45 的派生 harness 涵蓋，等 45 落地後一併驗。
- 合併 harness（followup-44/merged）ALL PASSED 47 條，face46 探針兩寬度通過。**結票。**
