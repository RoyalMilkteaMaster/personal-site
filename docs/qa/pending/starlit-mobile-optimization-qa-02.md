# starlit-mobile-optimization-qa-02 — 同一章節的入口與分頁名稱不同

- 處理狀態：待決定
- 來源工作：starlit-mobile-optimization 收尾使用情境 QA，2026-09-21。
- 燈號：🟡 輕微改善。目的地正確、任務可完成，但訪客需多一次確認。
- 測試版本：最終 03-r5 / 06 source review-r1、文件 review-r2；CSS SHA256 `23b1cdeaaf917aaee2db6aedff25b4828fd2ec0aca2d74d0a0d36bdb1a061596`，正式樣式 `starlit-shell.BSAu9hMM.css`。
- 環境：WSL Ubuntu、Playwright 1.62.1、Chromium 151.0.7922.34 / SwiftShader，手機尺寸模擬；非 iPhone。

## 情境、步驟與結果

訪客在結尾幕選擇「我的專案」，進入後對應分頁卻叫「我的作品」；英文同樣由「My projects」變為「My work」。目的地確實是同一章節，內容正常。

## 證據

- [英文結尾入口](../../../work/starlit-mobile-optimization/closing-qa/s1/05-ending-en.png)
- [英文章節分頁](../../../work/starlit-mobile-optimization/closing-qa/s1/06-about-en.png)
- [中文結尾入口](../../../work/starlit-mobile-optimization/closing-qa/s3/320x568-zh-ending.png)
- [重新進入作品後的狀態](../../../work/starlit-mobile-optimization/closing-qa/s2b/result.json)
- [獨立 QA 完整紀錄 F2](../../../work/starlit-mobile-optimization/closing-qa/result.md)

## 判斷與改善方向

名稱不一致已觀察到；是否統一成「作品」或「專案」屬產品文案決定，需要開發者決定。歷史因果未比對，不標示既有或新增。期望同一目的地使用一致名稱，或清楚說明刻意差異。留待後續 Grill-me，本輪未改文案、未重開 Ticket。