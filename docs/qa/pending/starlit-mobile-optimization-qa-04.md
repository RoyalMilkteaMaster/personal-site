# starlit-mobile-optimization-qa-04
- 狀態：待決定／待確認；未分級，單次觀察不能視為已重現缺陷。
- 來源：2026-09-21 iPhone17 實機回報追加收尾 QA，CQA-R2-01。
- 測試版本：followup-layout-r2，TSX 705c1b6b…1baa620d、CSS 6f305215…21c8ae3e、test d547ada5…3d4b70d0；production5173。Chromium+SwiftShader 402×681/DPR3/touch設定，不是Safari真機。
- 情境：開場結尾點「/關於我」，頁首上緣暫時在可視範圍之外。
- 證據：進入後 scrollY21/header.top-21；測試程式scrollTo(0,0)後0.7秒仍scrollY15/header.top-15；稍後回到scrollY0。未使用真實觸控拖曳重現、未第二次重現。可能與進場版面高度變動／捲動錨定有關，根因未確認。
- 影響：短暫裁掉頁首頂部，分頁與Language仍可用；不能宣稱觸控上滑一定回彈。
- 改善方向：先真機重現進章節後第一次上滑是否穩定回頂；若成立再討論修正。此次只記錄，沒有自動修改產品。
- QA全文：[result.md](../../../work/starlit-mobile-optimization/iphone17-followup/closing-qa/result.md)
- 原始結果：[result.json](../../../work/starlit-mobile-optimization/iphone17-followup/closing-qa/evidence/s1/result.json)
- 畫面：[進入](../../../work/starlit-mobile-optimization/iphone17-followup/closing-qa/evidence/s1/04-about-as-entered.png)、[程式回頂後](../../../work/starlit-mobile-optimization/iphone17-followup/closing-qa/evidence/s1/05-about-at-top.png)、[稍後完整頁首](../../../work/starlit-mobile-optimization/iphone17-followup/closing-qa/evidence/s1/06-about-after-return.png)。

