# R7：人物暗部透出移動星空

使用者希望第1章的臉部陰影、褲襠等暗部能看見背景星點移動，接近第2、3章的交互感。3D不限制這項效果；目前阻擋源自完整模型深度表面先於背景星空繪製，而非人物暗處沒有背景星點。

沿用既有背景星群、漂移與閃爍。星空先繪製，人物再建立自身遮擋並繪製表面星點，使背景從點間與半透明暗點透出；人物背面不因此穿到正面。切章快照同步保留星空。保留R6鏡頭、0.7秒／約0.94秒同速運鏡、新模型、星火及第2、3章。

驗收：實際主站不同時間的臉部／褲襠暗部星空差分、人物層不變、切章快照連續、重播和減少動態模式。已完成實際驗證與獨立審查，沒有阻擋或重要問題。

- 主站：http://localhost:3000/
- 開發證據：work/model-trial/fantasy-sky-through-r7/
- 執行：沿用Astra6 HIGH；唯一獨立Reviewer沿用Opus5 MEDIUM，backend effort未知。

## 結果與審查補充

固定候選 aeac6646ed36784262f5b3dd791fd419b0686cfdba14bcf81c7d98cdb1144a31，僅 renderer.mjs／scene.mjs 兩檔；Reviewer 核對 84/84 證據雜湊、其餘 42/42 基底檔案不變。Astra6 HIGH 執行與同一位 Opus5 MEDIUM 審查皆完成。

實際 wide 全貌的 face ROI [288,160,377,240] 可見星空像素 14→141、crotch ROI [329,560,410,648] 0→67；這兩個 ROI 僅指 wide 影像，不能套用 rear 的畫幅。固定人物時間、只推進星空四秒後確有位移差分；人物與星火隔離層前後逐像素相同。

interactions.json uploads 的 [0]／[3] 是第一章端點：2159 顆背景星、2157 顆畫內可見。[1]／[2] 是 legacy 第2章端點均勻展開的資料，其前段並非獨立 sky 區塊，不能用相同區塊指標解讀為星空遺失。以上兩項為審查文件建議，保留固定快照原檔並在此澄清。

播放636幀、8項操作檢查、reduced靜態、相關測試、TypeScript和建置全部通過。Root重載主站確認回到第1章，檢視實際全貌截圖及臉部前後／移動對照。原生渲染與GPU快照原有微小像素差仍存在，本次沒有增加。

[前後與移動對照](http://127.0.0.1:3004/fantasy-sky-through-r7/comparison.html)。Reviewer 完整紀錄：work/model-trial/claude-opus-fantasy-sky-r7-review-result.md。未公開部署。

