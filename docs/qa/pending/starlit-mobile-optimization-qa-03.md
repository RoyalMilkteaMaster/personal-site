# starlit-mobile-optimization-qa-03 — 切章節時曾出現淺色橫帶，尚未重現

- 處理狀態：待決定
- 來源工作：starlit-mobile-optimization 收尾使用情境 QA，2026-09-21。
- 燈號：待確認；尚不能判斷實際頻率與影響，不硬分嚴重度。
- 測試版本：最終 03-r5 / 06 source review-r1、文件 review-r2；CSS SHA256 `23b1cdeaaf917aaee2db6aedff25b4828fd2ec0aca2d74d0a0d36bdb1a061596`，正式樣式 `starlit-shell.BSAu9hMM.css`。
- 環境：WSL Ubuntu、Playwright 1.62.1、Chromium 151.0.7922.34 / SwiftShader，390×664 模擬；非 iPhone。

## 情境與觀察

進入「關於我」後改點「我的作品」，S2 在切換後約 500ms 的截圖曾出現畫面頂部淺色橫帶。這是單次畫面觀察，還不能確定為可重現的產品問題。

## 定向複驗與證據

S2c 於同一操作後 200/400/700/1200/2500/4000ms，以及返回時 400/3000ms 補看，未重現橫帶。文件高度、捲動位置曾改變，但是否成因未證實。依規則停止沒有新資訊的重跑。

- [單次觀察截圖](../../../work/starlit-mobile-optimization/closing-qa/s2/B2-mid-morph.png)
- [定向複驗後 4000ms 畫面](../../../work/starlit-mobile-optimization/closing-qa/s2c/t4000.png)
- [複驗取樣紀錄](../../../work/starlit-mobile-optimization/closing-qa/s2c/result.json)
- [獨立 QA 完整紀錄 F3](../../../work/starlit-mobile-optimization/closing-qa/result.md)

## 影響、判斷與改善方向

如果會偶發，深色站可能有一次明顯亮色閃動；目前不能推定真機也發生，SwiftShader 截圖時序亦須考慮。先找可重現條件，再決定是否需處理；期望章節轉場沒有非預期亮色區塊。留待後續 Grill-me，本輪只記錄，未修正、未重開 Ticket。