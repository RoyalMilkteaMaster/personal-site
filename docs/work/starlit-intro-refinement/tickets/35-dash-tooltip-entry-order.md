# 35 — 詩的破折號對齊、拿掉「往上還原」提示、結尾入口左右對調

使用者於 2026-09-18 提出。小票：Coordinator 直接實作，一位 Opus 5 medium Reviewer 覆核。

## 核准需求
1. **破折號**：四行詩第四行開頭的「-- 」目前是兩個半形連字號，垂直位置比字低。使用者說「他是破折號」，
   改成真正的中文破折號「——」，與字對齊。文案字面值改，測試期望值同步。英文不動。
2. **拿掉「往上還原」**：畫面上滑鼠停留會出現「往上還原」的原生 tooltip（`title` 屬性）。整個移除，
   不要換成別的字。若它同時是無障礙名稱（`aria-label`），保留 aria、只拿掉 `title`；報告說明。
3. **結尾入口左右對調**：目前左「/我的專案」右「/關於我」，改成**左「/關於我」右「/我的專案」**。
   只換順序，鍵盤順序、點擊行為、進入後的章節不變。

## 範圍
可動：`lib/fantasy/starlit-intro.mjs`、`lib/site-copy.ts`、`components/starlit-shell.tsx`、
`components/starlit-experience.tsx`、對應測試。不動 /關於我 內容、字體、延期項目。不 commit／push／部署。

## 驗證
tsc、四支測試綠；紅測：破折號退回「--」、tooltip 回來、入口順序退回 → 各紅；實機看結尾。

## 交付狀態
2026-09-18：完成。第 1、3 項由 Coordinator 直接實作；tsc 與四支測試綠、紅測 3/3 全紅（含「順序不動但 pose 被改」）。
Reviewer H（Opus 5 medium）**PASS，無 Findings**：破折號 U+2014×2、ink 中心 6.0px vs 漢字 5.5px（對齊；舊 ASCII 4.0px 偏低）；
左「/關於我」→ 關於我章節、右「/我的專案」→ 作品章節，目的地正確。
**第 2 項「往上還原」不是本站的東西**：程式碼零命中，且使用者截圖在 elvismao.com 與 sitcon.org 上也出現同一提示，
屬瀏覽器端擴充套件／輸入法，未改任何程式碼。證據：`work/starlit-implementation/followup-35/`。未 commit／push／部署。
