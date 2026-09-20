# 下一個 Implement Task 交接：原畫一致的真實 3D 星點人物

日期：2026-09-10。這份檔案可直接交給下一個 Task。先讀全文，再依末段啟動資料工作。需求已由使用者在原任務明確說明，以下是整理，不是等待重新訪談的提案。不要要求使用者再把同樣的問題講一次。

## 1. 先理解使用者真正要的結果

**第一張臉部近景與最後一張正面全景，必須和原版一模一樣或幾乎一模一樣；中間則是同一個形狀正確、表面完整的 3D 人物，隨視角移動而展現不同面。兩項缺一不可。**

鏡頭順序是臉部近景 → 微微向上看的背面頭肩 → 正面全景，全程同方向旋轉。原本的臉、全景伸手人物與星火保留。取消貓貓星座、彗星白光換圖，不用遮擋或快轉掩蓋模型問題。其他網站姿態與章節不重設。

Tripo 模型是輔助放置星點的空間支架：**調整模型配合原畫，不是把原畫換成現有模型的樣子。** 星點落在角色真正的表面 XYZ，亮處多一些小星點，暗處仍有基本覆蓋。從正面看是輪廓的點，轉到側面應該是該部位表面的點，不能變成浮動光圈、假臉或衣服厚殼。

保留原始圖片檔案不等於保留使用者要的畫面。「來源模型本來如此」「已有五指」「三角形沒刪」「數學測試通過」都不能豁免視覺差異。沒有明顯變形也不等於首尾已幾乎一致。

## 2. 現在做到哪裡，還有什麼錯

工作不是從零開始，也不是完成驗收。**v9 已被使用者否決，Sol 的 Spec Review 也判不通過。** 原本三隻 Astra 已交付停止；本檔案不代表他們會在新 Task 自動繼續。

已建立完整表面取樣方法：520,019 顆人物點，含面積底密度與亮度加密；固定三角形及重心座標、實際掌心錨點、單向鏡頭、八角度對照及播放資料。這些是可保留的技術基礎，不是已接受的人物造型。

### 已確認阻擋，必須修正

1. **首尾外觀不像原版**：頭部傾角、臉髮輪廓、肩領比例、衣帶位置及全景構圖有明顯差異。近景與全景都要修到幾乎一致，不能只把差異寫進限制欄。
2. **右手畸形**：雖然數到五指，掌部過薄、指根／掌蹼不自然、手指過長呈分叉張開。使用者已提供截圖直接否決。左右手都要建好，不能只檢查拿星火的左手。
3. **背面參考不符**：負仰角只證明相機眼位低；目前後腦傾斜、高聳右肩／片帶、頸領肩線仍不同。必須先修模型姿勢與肩領，再校準實際微仰視構圖。

### 所有回歸項目都要重查

| ID | 要修正／避免再出現 |
|---|---|
| U01 | 頭髮前後星點密度差太多；共同取樣規則、暗部底密度、無接縫。 |
| U02 | 正面漂亮的描邊在側面變成假臉、浮線或厚殼；星點須在正確部位表面。 |
| U03 | 假手指其實在衣服上，以及 v9 的畸形右手；雙手腕掌指形與姿勢必須自然正確。 |
| U04 | 90／270 度衣服黑洞、缺面及異常厚層；完整模型與星點相符。 |
| U05 | 星火離掌或側面怪異；真正掌心綁定、自轉穩定，且正面尺度與位置符合原版。 |
| U06 | 側臉、後頸、頭髮崩裂；整圈及連續轉場的真實表面完整。 |
| U07 | 背面像俯瞰，或只有數值仰角成立；實際頭頸肩透視符合微仰視參考。 |
| U08 | 首尾不像原版；近景與全景的形狀、姿勢、構圖、色彩、星點質感須一樣或幾乎一樣。 |

v9 的 U01／U02／U04／U05 與 U06 連續表面有改善證據，但任何新模型修改後仍需重驗。尤其 U05 的掌心綁定通過，不表示星火正面構圖已符合原版。

## 3. 使用者要求的工作方法：先看、再補、再比

### 每隻 Agent 開工前

讀 `agent-brief.md`、最新 Spec、自己的 Ticket、U01–U08 及使用者截圖。向 Coordinator 用自己的話確認：兩項硬目標、自己的責任部位、具體缺陷與證據、修改邊界和驗證方式。不能只回答「已讀」，不能在沒有看模型與原圖前直接堆點數或改參數。

### 每個部位按這個循環做

1. **載入真正的最新模型**。在可自由旋轉的模型頁顯示模型版本／資產；可參照使用者指定的 `http://127.0.0.1:3004/refine.html?v=4` 操作方式。該舊頁載入的是 `tripo-refined-v1.glb`，不是 v9；必須讓檢查頁確實載入當輪模型，不能只換網址的 v 數字。
2. **轉到要修的那一面，先看實體與原材質**。頭、臉、衣領、肩、袖、左右手都要看；手部放大到能辨別掌蹼與指節。先判斷模型形狀錯、星點漏取樣、顏色錯位，還是遮擋錯誤。
3. **修該部位真正的幾何／姿勢或星點**。模型錯就修模型，模型正確但缺點就補真實表面的點；亮處增加密度。不要拿另一層外圈補光，不用衣服深度承載手指，不刪掉側背面去硬貼正面。
4. **同相機直接比**。固定相機、角度、縮放、視口，切換素模／材質模型／均勻點／最終星點，確認點在該面真正的位置。修完一面，檢查相鄰面及原版正面，避免把錯誤推到別面。
5. **整圈檢查**。至少 0、45、90、135、180、225、270、315 度，並實際連續旋轉 360 度。每位部位 Agent 負責自己的整圈；只看正面或縮小拼圖不算完成。
6. **首尾比原版**。同視口並排與疊圖檢查原版近景／全景，逐部位確認幾乎一致。背面也與指定參考比。若頭、手、肩領、衣帶、星火或構圖仍明顯不同，回到第 2 步。
7. **整段驗證**。播放臉→背→全景，檢查背面轉入／停留／轉出、同方向、人物持續可見。星火全顯示時看全部主要角度與完整自轉；正常開場前兩鏡仍按原規格不顯示星火。
8. **確認沒有問題才交付該部位**。附當輪版本、角度、實體／星點近照、原版對照及未解項，然後交由獨立 Reviewer 檢查。數學與檔案雜湊只作輔助。

## 4. 分工、模型與衝突處理

使用者指定實作 `gpt-6-astra / medium`，檢查 `gpt-5.6-sol / high`，不能默默改成其他模型。

- 手部 Agent：左右手的量體、指節、姿勢與掌心星火。
- 臉髮 Agent：頭部方向、臉髮輪廓、頸部接合、全頭密度。
- 衣服 Agent：肩領、袖、衣帶輪廓、厚度與完整性。
- Coordinator 指定單一共同模型整合者，以及單一相機／渲染寫入者。各部位用獨立修正模組／資料交回，禁止同時覆寫共同模型、生成陣列及 runtime。
- 按實際並行槽位分批；並行檢查可以多面分工，但不准各自做一個不同人物。
- 兩位獨立 Reviewer 分別查 Spec 和 Standards，對同一固定版本檢查。每位列 U01–U08 通過／失敗／未檢查及證據，整體不能留下未檢查項。

## 5. 需求已經寫成哪些票

沿用原本三張核准票，已補入最新要求，不增加網站功能或更換既有依賴。

| 票 | 現在要做什麼 | 覆蓋 | 前置 |
|---|---|---|---|
| 01-fixed-portrait | 修正模型與真實表面星點；自然雙手、原版首尾外觀；可旋轉逐面檢查 | R02／R03，A01–A03／A13，U01–U06／U08 | 無 |
| 02-camera-sequence | 鏡頭／文字控制、真實微仰視、最新模型檢查工具、同角度及完整播放證據 | R01／R04，A04／A05／A07，U07／U08 構圖，共同複驗 U05／U06 | 無；最終視覺證據需套用 01 最終模型 |
| 03-site-integration | 先複驗最終隔離形體與動畫；全部成立後才整合既有主站及回歸 | R01–R06、A01–A13、U01–U08 | 01＋02 |

Spec 新增 A13：首尾必須與原版一樣或幾乎一樣，且來自同一完整人物。不得只把 U08 留在說明檔而不作票的驗收。

## 6. 必讀資料與實際位置

專案根目錄：`C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site`

需求確認：
- `docs/planning/requirements.md`
- `docs/planning/architecture.md`
- `docs/work/portrait-orbit/spec.md`
- `docs/work/portrait-orbit/agent-brief.md`
- `docs/work/portrait-orbit/user-regression-checklist.md`
- `docs/work/portrait-orbit/model-alignment-amendment.md`（需求沿革，最新 Spec 優先）

素材與失敗證據（以下相對專案根目錄）：
- 原下載來源：`F:/Downloads/cosmic+character+3d+model.glb`；不可覆寫。
- `work/model-trial/tripo-original.glb`、`front-input.png`、`original-plate.png`、`rear-reference.png`。
- `work/model-trial/baseline-reference.html`：原版網站星點近景／全景對照。先檢查頁面實際支援的 view 參數。
- `docs/work/portrait-orbit/evidence/user-reported-v8/`：歷史缺陷及背面參考。
- `docs/work/portrait-orbit/evidence/user-reported-v9/right-hand-rejected.png`：最新右手否決。
- `work/model-trial/shots-v9/compare-original-front.png`、`compare-original-wide.png`：左原版、右失敗候選。
- `work/model-trial/shots-v9/contact-body.png`、`contact-left-hand.png`、`contact-right-hand.png` 及個別近照、sequence、spin／playback 檔案。

程式與資料：
- `work/model-trial/align_model.py`：模型對齊、手臂與區域變形，需優先查首尾姿勢誤差。
- `work/model-trial/model-v9-right-repair.py`：目前右手補指，使用者已否決最終手形，不能只保留原 PASS。
- `work/model-trial/build_scene.py`：完整表面點、顏色與密度。
- `work/model-trial/guide-core.js`、`guided.js`、`guided.html`：相機、掌心、渲染與控制。
- `work/model-trial/aligned-character.glb`、`aligned-world.npy`、`aligned-tris.npy`、`surface-points.bin`、`surface-faces.bin`、`surface-bary.bin`、`scene-meta.json`：v9 共同產物；幾何改動後應重新生成相依資料，不能混版本。
- `work/model-trial/model-v9-integrated-result.md`：開發證據；其中 PASS 是舊開發自檢，已被使用者及獨立視覺審查否決，不是交付依據。
- `work/model-trial/reviewer-a-v9-result.md`、`reviewer-b-v9-result.md`：兩份獨立審查均已交付，結論均為不通過；目前沒有仍在執行的實作或審查 Agent。
- `work/model-trial/root-v9-review/observations.md`、`review-v9-status.md`：協調者觀察與交接狀態。

## 7. 固定版本、保護資料與已知限制

v9 manifest `work/model-trial/SHA256SUMS-v9.txt` 共 275 筆，SHA256：`00788e5c964a362bc65934ae37ae248512edd89c23d34f9c015ee125d9cb4441`。Root 與兩位 Reviewer 已重算符合。它綁定舊受檢 v9；最新 Spec 在 manifest 的 `scope-v9` 以外，下一輪以本交接列出的**目前 docs**為需求，`scope-v9` 只供追溯舊審查。

原始 GLB SHA256：`2613d404adaa4c0bad11a4e4a809938701699ad50af4ce3b07f52f95a7c4f20f`。Git 基準 HEAD：`41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6`，但工作樹有大量未提交及被忽略的 work 資料。新 Task 必須使用這個已有檔案的目錄；乾淨 Git worktree 不會自動有這些成果。不要 reset、清理、覆寫來源、發布或擅自 commit/push。

失敗 v9 已保存於 `work/model-trial/review-v9/`，共275個受檢檔案。交接保存版以 `review-v9/SHA256SUMS-handoff.txt` 為準，其 SHA256 為 `daaa489596e9c129dcd4087c1deea02a45a788f29392b4d9ad3f227d3bbfbbdf`。其中274檔符合舊受檢 manifest；只有 `runtime-test-v9.json` 被 Coordinator 重跑核心測試重寫，保存的是重跑結果。模型、程式、原圖、星點與截圖沒有因此改動。詳見 `review-v9/ARCHIVE-NOTE.md`；不要將舊 manifest 的275項全部相符誤當成交接現況。

修改前保留此失敗基準；舊 review-v7／review-v8／baseline-v6 也保留。沿用現有本地工具，主站尚未整合。伺服器可能是 Windows 3004 與 WSL 3007，先確認實際服務根目錄；網址後綴 v=9 不是模型雜湊。`guide-core.test.mjs` 會寫出結果檔，不能把它當純唯讀命令重跑於固定快照。

本次需求是交接，不是再交付未過關樣片。接手後應從真實模型的姿勢／手形／肩領修正開始；不要繼續寫「已完成，剩下美術差異」。

## 8. 新 Task 啟動文字

請將以下內容完整貼到新的獨立 Task：

```text
$milktea-agents-skills-for-codex:milktea-skills-implement

專案根目錄：C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site
Spec：C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site/docs/work/portrait-orbit/spec.md
Tickets（依建議順序）：
C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site/docs/work/portrait-orbit/tickets/01-fixed-portrait.md
C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site/docs/work/portrait-orbit/tickets/02-camera-sequence.md
C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site/docs/work/portrait-orbit/tickets/03-site-integration.md

依已核准 Spec 與 Tickets 完成實作及驗收，不得自行擴大核准範圍。
```

請一併提供本檔案給新 Task，要求其先完整讀取，特別是第 1–4 節的硬目標、錯誤與逐面工作方法。

