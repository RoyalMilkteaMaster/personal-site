> 最新補充：頸柱應像原圖自然直立，粗細與角度接近原圖；把頭放到頸柱能自然支撐的位置。固定後移量不等於達標，原圖頭部本身的自然微傾也不應被硬轉正。新增頸部特寫已保存，現有頭頸候選須依此重新檢查。

> 最新使用者修正：目前預覽的托星火手部外觀仍不接受；頭頸也仍有前伸感，必須以原圖的頭、衣領、肩胸相對關係修正，檢查整個頭是否需要往身體後方移。先前局部技術審查不構成這些部位的外觀批准。Reviewer 已依最新指示改成 Opus5 Medium，正在檢查此問題與待採用的頭肩／合成候選。
>
> 原圖來源的 GPU／Canvas 取樣差異已經獨立審查確認。固定 RGBA 像素後，兩張原始星點圖與 28830 個身體來源列可精確重播；正在建立有明確命名空間與不確定度的特徵對照表。人物模型尚未因此重建或重置。
# 人物繞拍目前進度（2026-09-12）

本文件是人可讀摘要；實際代理、版本雜湊與接續步驟以 ACTIVE-HANDOFF.md 最上方更新為準。

## 驗收目標不變

以原始星點圖為主要依據，首尾幾乎重現原畫，過程是同一個完整立體人物。延續使用者喜歡的修正版，不回到素模重做。新手部線條保留、舊重複線條退除；腰側手心朝身體；頭頸自然；衣服側背連續。完成隔離頁視覺驗證後，才整合主站及驗收章節、操作、降級、效能。

## 現在可看的版本

http://127.0.0.1:3004/raw-waist-cuff-stars-astra-r1/index.html

這是完整 FS1 加袖口星點修正，包含先前已審查的手、頸部及袖子修改。Fable Medium 獨立審查無阻擋或重要問題；Coordinator 已實際播放、檢查背面頭肩及全景掌心星火。頁面的 pending review 標題是凍結時舊文字，審查結果另存，不修改凍結版本只為換標題。

本輪袖口修正只重排實際局部衣料上的 4073 個一般 STAR 樣本及 801 個 uniform 診斷樣本。角色點數、來源 ID／顏色、原始特徵及所有模型幾何保持一致，135 度的扇骨狀亮線消除，90 度衣料覆蓋改善。近景不變；全景差異限制在腰側袖口。仍保留來源色近似配對的限制；不宣稱原畫布紋完全重建。

## 正在處理

1. 頭部、肩摺與相機聯合修正：修復近景肩領下降及頭頸接合偏移，檢查所有原始身體特徵正深度、真正表面綁定及法線。已找回肩摺高度，但原畫髮流、細髮絲、部分臉部特徵與衣領線條仍須細修。候選尚未凍結／獨立審查。
2. 前方衣襟與下方接合：先前直接拉形造成穿插，現追查並修復實際布面連接，再修原畫輪廓。局部修復仍有摺面需要處理，未採用失敗候選。
3. 原始星點線條唯讀稽核：逐一對照來源特徵、池中角色、表面遮擋、點大小與渲染分支，找出髮流與衣領變成散點填色的原因，供下一輪最小修正。

實作使用者指定 Astra6 Medium，唯一獨立 reviewer 使用 Fable5 Medium。曾出現模型滿載，保留現有檔案後使用相同模型重試；不能據此宣稱帳號用量已耗盡。

## 還沒完成的驗收

- 原畫首尾外觀 A13 仍未通過；局部 reviewer 通過不等於整體完成。
- 完整最終人物與相機組合尚待通過全部角度、播放與來源對照。
- Ticket03 主站整合尚未開始；正式版仍須操作、章節、重播、減少動態、素材失敗、WebGL 降級、效能比較及建置驗證。
- 主站修改前 tsc 與 10 個 lib 測試已通過，僅是基線，不能當作最後驗收。
- 最終 HTML 報告與使用者最終視覺確認尚未完成。

## 保留與回復

目前預覽、各候選與既有未提交檔案都保留。失敗的 head1／r14／cloth／hem 候選没有取代已審查預覽。來源點修復、模型稀疏差異、相機及審查雜湊均有契約，後續合成必須逐項核對，不能整份較舊模型蓋掉其他已通過修正。
最新：頭頸原圖線條與側面手勢仍在修正，未驗收。原226頂點頸介面不能代表頸根，改以真正皮膚/衣領接合與原圖兩側輪廓查證。Developer Astra6 medium：head 72337、palm 9507；Opus5 medium reviewer 57452 審查已凍結 canonical source 與失敗衣片拓樸證據。Cloth 76494 已結束但沒有可採用修正，不能當完成。當前 WC1 預覽未替換。

手部候選已固定：raw-front-palm-astra-r1，manifest b9dc3989141d95f88b0fa69eb7974361db251de2256e419f72ed4991a04840b4。Opus5 Medium 審查 exec67218 正在進行；504原圖樣本未綁定、5組新增大折角與側面線條仍須判定，尚未採用。頭頸72337持續修正原圖接合，衣片53960正在新局部前後片構造。原圖取樣已獨立驗證，舊光照殘差算式已更正。預覽仍WC1，主站未整合。

### 2026-09-12 — latest original-neck criterion retained
User explicitly reaffirms original STAR reference neck/head contour should be as identical as possible. Root inspected current r2 native near/wide four-panel comparisons: angular collar gain visible, but narrow neck/left-lapel occlusion remain provisional visual concerns. Saved these at TOP ACTIVE-HANDOFF for developer before freeze; do not use point count/fold passes as B1 completion. Neck developer5298 reports continuous left lapel shape opens lower neck while retaining side thickness; final source bindings and folds still in progress. Palm24479 reports final local quality pass removed newly>90 pairs, refreshing changed captures/bindings/playback; not yet frozen or reviewed. Cloth53960 still working local panel/seams. Same ONE Opus5Medium remains idle until a fixed final candidate is ready. Prepared targeted palm-r2 and neck-r2 review DRAFTS, neither dispatched. User WC1 preview unchanged; all Tickets/main/A13 still OPEN. Root rechecked processes alive; no quota/reset/model switch performed.

### 2026-09-12：頭頸與手部仍在修正，尚未進入主站整合

- 驗收始終以原始星點圖為準。頸部要保留自然支撐感、下巴轉折、兩側輪廓及衣領開口；不能只通過幾何檢查就算完成。
- 頸部 r2 已完成固定版本、Opus 複驗與 Coordinator 實際操作。改善有確認，但較低的暗部與左側轉折仍需修；目前 r3 正在處理獨立的藍色內襟，避免誤把衣料當皮膚移除。
- 手部 r3 已固定，原圖覆蓋與指根折痕有改善，外側體積仍不自然。額外的唯讀診斷確認部分指根佔住原圖可見的衣料空隙，已交同一位 Opus 複核後續局部修形方向。
- 衣服下降前片已有實際表面，正在檢查星點轉移與內層輪廓。仍有未解決的原圖差距，尚未驗收。
- 執行者維持 Astra 6 Medium；只有一位 Opus 5 Medium reviewer。現有預覽、主站、使用者檔案及歷史版本均保留。原本三張票及最終整合驗證仍未完成。

詳細證據：`root-neck-fidelity-r2-ui-check.md`、`root-palm-r2-ui-check.md`、`root-palm-r2-axis-adjudication.md`；最新執行狀態與恢復資訊在 `ACTIVE-HANDOFF.md`。

2026-09-12 coordinator update: palm R4 historical-mask cutoff was diagnosed as raw-source Z boundary rather than garment seam. Developer is verifying a small continuous wrist-skin extension, keeping actual cuff rim fixed and exporting added support. This is within the authorized local hand repair; no whole-mask expansion assumed. Final review must verify evidence for actual skin ownership, exact additional rows, garment/cuff/other-hand protection and both positive and negative source constraints. Root UI on frozen palm R3 confirms existing oval-root/tube defects: root-palm-r3-ui-check.md. QA20 currently palm R3 STAR wide12 propON inspectorOFF; user WC1 preview unchanged. Neck R3 and cloth foreground continue; drafts prepared for targeted same Opus review after final freeze. No completed Ticket/art gate yet.

Neck R4 latest source trace: reviewer near-y560 first-lit x595 is LEFT inner diagonal, not right-inner-lapel (right ~637 at same height). Lower continuation darkens; y575 first bright x657 is not yet proven same edge, so do NOT prescribe37pxsheetmove. Upper actualmissingbright-edge PRIMARY5424/5480 found; inspectactualcollarcorrespondence/missinglinecause. This supports Root's connected-edge qualification; include exactsourceevidence in next Opus recheck and withdraw unsupported first-threshold-chain inference as appropriate. Currentr4stillmutable, no artpass.
