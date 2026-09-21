# starlit-mobile-optimization-qa-01 — 結尾標題被 Language 按鈕遮住

- 處理狀態：待決定
- 來源工作：starlit-mobile-optimization 收尾使用情境 QA，2026-09-21。
- 燈號：🟠 明顯影響。章節任務仍可完成，但品牌識別文字持續被遮住，使用者不能自行讓它完整顯示。
- 測試版本：最終 03-r5 / 06 source review-r1、文件 review-r2；CSS SHA256 `23b1cdeaaf917aaee2db6aedff25b4828fd2ec0aca2d74d0a0d36bdb1a061596`，正式樣式 `starlit-shell.BSAu9hMM.css`。
- 環境：WSL Ubuntu、Playwright 1.62.1、Chromium 151.0.7922.34 / SwiftShader，手機尺寸模擬；非 iPhone 實機。
- 入口：本機 `http://127.0.0.1:5173/starlit-full-preview`。原公開預覽為同一建置，QA 本身未走公網。

## 情境與步驟

訪客讀完開場，辨識作者名稱並選擇章節。開啟預覽，從 Language 選 English（中文案例保留中文），點閱讀區依序走到結尾幕，等文字動畫完成，再於 6 秒後補拍。

## 觀察與證據

320×568 的中英文、360×640 中文、375×667 英文均可見品牌名尾端被不透明 Language 膠囊遮住。390×664 中英文可完整顯示，但量測淨空約 1px。約 389px 以下的推估邊界來自矩形量測，不是每個尺寸都已實拍。

- [320×568 英文完整動畫後截圖](../../../work/starlit-mobile-optimization/closing-qa/s3/320x568-en-ending-plus6s.png)
- [375×667 英文截圖](../../../work/starlit-mobile-optimization/closing-qa/s3b/375x667-en-ending.png)
- [360×640 中文截圖](../../../work/starlit-mobile-optimization/closing-qa/s3b/360x640-zh-ending.png)
- [原始量測](../../../work/starlit-mobile-optimization/closing-qa/s3/result.json)與[補充量測](../../../work/starlit-mobile-optimization/closing-qa/s3b/result.json)
- [獨立 QA 完整紀錄 F1](../../../work/starlit-mobile-optimization/closing-qa/result.md)

## 影響與判斷

已觀察的可見問題；章節入口、Language 及頁首仍可操作，並非流程卡死。未作基線因果比對，不能斷言既有問題或本輪退步。Coordinator 已查看 320×568 英文穩定畫面，確認遮擋。

## 改善方向

讓結尾品牌名完整可讀，與語言控制互不遮擋；具體字級、換行或位置由後續 Grill-me 決定。本輪只記錄，未修正、未重開 Ticket。