# 38 — 捲動顯現：被跳過的區塊要視為已顯現

2026-09-18 在 Ticket 36 的 harness 連續三次於 390×844 逾時後，用診斷版抓到根因。小票：Coordinator 實作，Reviewer 併入 Ticket 36 的複驗。

## 根因（harness DIAG 原文）
```
scrollY 2279 / innerH 844
skills:      reveal null, opacity 0, top -1073, bottom -213   ← 整塊在視窗上方
education:   in, top -233, bottom 178
recognition: in / now: in
```
harness 一次 `scrollTo` 到底，`skills` 從視窗下方直接跳到上方、**從未與視窗交集**。`IntersectionObserver` 只在交集比例
跨過門檻時回呼，0 → 0 不觸發，所以它永遠停在 opacity 0。真實使用者按 End、拖捲軸、或從結尾點入口後快速捲動，
都會遇到同一件事：被跳過的區塊要捲回去才會出現。

## 核准需求
1. 任何 `.starlit-reveal` 區塊一旦**整塊落在捲動視窗上方**（`rect.bottom <= rootTop`），視為已顯現。
2. 兩條路徑都要補：IO 回呼裡對非交集但已在上方的 entry 直接顯現；另外監聽捲動容器（桌面 `.starlit-content`、窄螢幕 `window`）
   的 `scroll`（passive、rAF 節流），對還沒顯現的區塊做同一檢查——因為 IO 在 0→0 不會回呼。
3. 純函式 `passedAbove(bottom, rootTop)` 抽出並匯出，供單元測試。
4. `prefers-reduced-motion` 的「全部直接顯現」路徑不變；一次性語意不變（顯現後不再隱藏）。
5. 清理：unmount 時移除 scroll 監聽與取消 rAF。

## 驗證
tsc、測試綠；`passedAbove` 單元測試 + 紅測；**Ticket 36 harness 在 390 必須不再逾時**（這就是重現案例）。

## 交付狀態
2026-09-18：實作完成。重現案例（Ticket 36 harness 390「捲到底五塊全部顯現」）由連續三次逾時轉為 ALL PASSED；
紅測 4/4。Reviewer J（Opus 5 medium）**PASS，無 Major**：390 實機重現 `skills` 進場 top 1205 → 跳完 bottom −231，
全程未交集仍正確顯現；桌面可捲距離不足以製造「從未交集」，屬同一判斷式的間接驗證。
F1（Low，root 解析時序）已採納：改成 `document` 捕獲階段監聽，元素捲動不冒泡也看得到。F2／F3／F4 資訊級，不處理。
