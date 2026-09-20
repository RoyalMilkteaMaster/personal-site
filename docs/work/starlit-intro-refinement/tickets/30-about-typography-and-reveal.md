# 30 — /關於我 型階、分隔、照片比例、字體系統與捲動顯現

使用者於 2026-09-17 第二次回饋提出。參考版型仍為 <https://elvismao.com/zh-Hant/about/>。
前置：Ticket 29（29-A、29-B）已完成並通過 Review A。

## 參考站實測基準（1440px viewport，`getComputedStyle` 實量，非目測）

| 項目 | 參考站 | 我方現況 |
|---|---|---|
| 內容左邊界 / 內容寬 | x=72 / 1281 | — |
| 區塊標題（技能／教育／獎項） | **16px / weight 900 / letter-spacing 4px** | 24px / weight 400 |
| 欄標題（專業／語言與函式庫） | 18.72px / weight 600 | 約 16px |
| 清單項 | 16px / weight 400 / **line-height 32px** | 15–16px、行高不成網格 |
| 英文副名 | 20.8px / weight 900 | 12px Arial |
| 個人照 | **455×480**，右緣對齊內容右緣（x 898→1353），**不出血** | 約 178×223、出血且被切 |
| 橫線 | **只有每個區塊標題下一條髮絲線，列與列之間完全沒有線** | 區塊標題 1 條 + 教育每筆 1 條 + 得獎每筆 1 條 |
| 字體堆疊 | `Audiowide, "Noto Sans TC", …`；Noto Sans TC 載入**實體 700** | `jfOpenHuninn` **只載 400**，CSS 卻寫 weight 900 → 瀏覽器假粗體 |

## 核准需求

### 30-A 型階、線條、版位

1. **減少橫線。** 只保留每個區塊標題下方那一條髮絲線。
   移除：教育每筆之間的分隔線（由 30-A.3 的彗星取代）、得獎每列的 `border-bottom`。
   分組改由留白與年份標記負責。

2. **型階對齊參考比例。**
   - 主名（皇家奶茶大師）：從現行 `clamp(38px, 5.2vw, 76px)` 降下來，與清單項 16px 的比值落在 **3.2–3.5 倍**（參考站約 3.1）。
   - 區塊標題：降到 **15–16px、真實 weight 900、letter-spacing 約 0.25em**，中文標題與其後的拉丁小標同一行。
   - 欄標題：約 **18–19px / weight 600**。
   - 清單項：**16px、line-height 32px**，讓所有清單落在同一條垂直網格上。
   - 英文副名：比現行 12px 放大，約 **18–21px**，維持大寫與寬字距。

3. **教育改成左右兩欄，中間一道「微斜」彗星分割線。**（使用者明確指定：要有一點斜度，不是純垂直）
   - 三所學校分成左右兩欄。
   - 中間是一道由上往下、**帶輕微傾斜**的彗星光跡：頭端亮、尾端漸隱，兩端溶進背景。
   - 純 CSS 或 inline SVG 實作，**不新增依賴、不新增圖檔**。
   - `prefers-reduced-motion: reduce` 時不得有任何動態（靜態光跡可以保留）。
   - 窄螢幕（≤850px）收成單欄，彗星改為橫向或隱藏，由 Developer 判斷並說明。

4. **「程式語言與應用」13 項拆成兩欄**，不要單欄拉長。
   整個技能區的欄位配置由 Developer 依平衡度決定（例如「專業」1 欄 + 「程式語言與應用」2 欄），
   目標是右側大片留白被有效利用、兩塊高度接近。

5. **得獎資料更新，且兩筆各自獨立、不可並排或用 `·` 串成一行。**

   ```
   2026  AWS 雲湧智生黑客松
         智慧交易冠軍

   2026  Sitcon 台灣未來祭
         AI 創意科技優勝
         AI 綜合賽道 第四
   ```

   - 第二筆的兩個成績是**兩行**，不是一行。
   - 中英文版都套用；獎項名稱維持中文（既有註解已說明無官方英文名），`AWS`／`Sitcon` 前綴兩語都保留。
   - 年份維持 2026。既有的 ✧ 裝飾可留可去，由 Developer 依 30-A.1 的減線原則判斷。

6. **照片放大並往左靠。**
   - 尺寸拉到接近參考比例：1440 時高度約 **400–480px**，寬度依圖片 4:5 自算（約 320–384px）。
   - **取消向右出血**，改成右緣對齊內容欄右緣（與參考站一致）——這同時解決「太右邊」與「離中心太遠」。
   - 圖檔本身（`public/portrait-milktea.png`）左／上／下的 alpha 漸層維持，不要再疊 CSS mask。
   - 標題區的 grid 要重新配比，確保放大後不擠壓三行標題、不重疊、窄螢幕不溢出。

### 30-B 字體系統 —— ⚠️ 已於 2026-09-17 由使用者裁示**整段撤回**

> **這一整節不再有效，照它做會把已經撤掉的字體加回去。**
> 使用者裁示：「字體就先用原本的好了 畢竟我看不出差別 / 還要花一堆 token 跟時間 / 還怕修壞」。
> 站上只保留 `jfOpenHuninn` 一個字體，沒有 NotoSansTC、沒有 Playfair Display、
> 沒有 Google Fonts、沒有 preconnect。
> 撤回的裁示與範圍：`work/starlit-implementation/followup-30/user-decision-font-revert.md`
> 撤回的實作與驗證：`work/starlit-implementation/followup-30/font-revert/coordinator-work.md`
> **Ticket 32「全站換字」一併取消，不建檔。**
> 以下原文保留，僅供追溯當初為什麼這樣做、以及後來為什麼撤掉。



**根因**：`jfOpenHuninn` 只提供 400 一個字重，站上卻寫 `font-weight: 900`，瀏覽器只能合成假粗體；
拉丁字則散落在 Georgia（品牌）、Arial（小標）與 jfOpenHuninn 的圓體拉丁之間，沒有一個刻意挑選的拉丁字。

1. **加入真實 CJK 粗體**：`@import url('https://font.emtech.cc/css/NotoSansTC')`（400／700／900）。
   這是站上**既有的同一個 host**（`font.emtech.cc` 已用於 jfOpenHuninn），不算新來源。
2. **挑一個刻意的拉丁展示字**，取代目前 Georgia／Arial 的臨時組合，用在：主名的英文副名、
   區塊標題後的拉丁小標（SKILLS／EDUCATION／RECOGNITION）、header 品牌。
   - Developer 要做 **3 個候選**，各出一張 1440×900 的 `/關於我` 截圖給使用者挑；先選一個當預設。
   - 候選要貼合「星空／皇家」調性，**不要直接照抄參考站的 Audiowide**。
3. **用 CSS 變數收斂**：`--starlit-font-display`（拉丁展示）、`--starlit-font-heavy`（CJK 粗體），
   換字只改一處。
4. **清掉所有沒有真實字檔支撐的 `font-weight`**，避免任何假粗體。
5. **範圍**：本票只套 `/關於我` 與 header 品牌。**開場閱讀六段不動**——它已驗收，且文字動畫與閱讀門檻
   依賴現有字體度量。Developer 必須實際驗證 header 換字後開場畫面沒有回歸。全站換字另開票。

### 30-C 捲動顯現動畫

1. `/關於我` 的各區塊（標題區、技能、教育、得獎）在**捲進視窗時淡入並輕微上移**。
2. 用 **IntersectionObserver + CSS transition** 自行實作，**不得安裝 AOS 或任何動畫套件**。
3. 一次性：顯現後不再重播（參考站的行為）。
4. `prefers-reduced-motion: reduce` 時**直接顯示最終狀態，完全不動畫**。
5. 不得影響開場閱讀門檻、`/我的作品`、`/聯絡資訊`。
6. 內容欄在桌面是自己的 scroll container（`.starlit-content` `overflow-y:auto`），
   IntersectionObserver 的 `root` 要設對，否則桌面不會觸發。這是本票最容易出錯的地方。

## 範圍與限制

- 可動檔案：`lib/site-copy.ts`、`components/starlit-shell.tsx`、`components/starlit-shell.css`、
  `components/starlit-shell.test.ts`、`lib/site-copy.test.ts`、`app/globals.css`（僅為字體 `@import`）。
- 不動 `app/page.tsx` 正式首頁，不 commit、不 push、不部署。
- 保留整個 dirty working tree，禁止 reset／clean／checkout 全檔／stash。
- **不新增 npm 依賴**（字體走既有的 `font.emtech.cc`；若拉丁展示字必須用新來源，要在報告中說明並標為待使用者確認）。
- 不恢復貓娘、3D 奶茶、人物 3D 轉場等延期項目。本票的「彗星」**只是教育區的裝飾分割線**，
  與 Ticket 17 延期的「彗星入口／轉場控制」無關，不得藉此恢復 Ticket 17。
- 桌面畫面優先；窄螢幕不得橫向溢出。
- 全部指令在 WSL Ubuntu 執行。

## 驗證

- `./node_modules/.bin/tsc --noEmit`
- `node components/starlit-shell.test.ts`、`node lib/site-copy.test.ts`
- 得獎新文字要用**硬編碼**斷言釘住（延續 Ticket 29 Review A 的 MINOR-1 處置），並實跑紅測。
- 型階要有**可重現的量測證據**（`getComputedStyle` 輸出），不能只憑截圖目測。
- 實際 UI：1440×900 與 390×844，中／英各一次；另外要驗開場、`/我的作品`、`/聯絡資訊`、
  Language 保留章節、品牌重播皆未回歸。
- 捲動顯現要同時驗 `prefers-reduced-motion: reduce` 的行為。

## 2026-09-17 追加：Review B 之後的第二輪（30-D）

授權紀錄與 Findings 逐條處置見 `work/starlit-implementation/followup-30/coordinator-note.md`。

**可動檔案清單追加**：`public/`（僅限照片衍生檔的搬移）、`app/layout.tsx`（僅限字體 `preconnect`）。

1. **拉丁展示字定案為 Playfair Display**（使用者裁示）。Cinzel、Jost 候選撤除，repo 只留一個預設值。
2. **`SITCON` 全大寫**（官方寫法）。`site-copy.ts` 的字面值改成 `SITCON 台灣未來祭`，
   不要靠 `text-transform` 造成大小寫，中英兩語一致。硬編碼斷言同步更新。
3. **MINOR-6（最高優先）**：本票的視覺成果目前**零回歸保護**——Reviewer 實跑 6 種 CSS 改壞法
   （關掉減線、型階、彗星斜度、照片尺寸、捲動顯現），兩支 repo 測試全綠。
   請補上會真的變紅的回歸測試，至少涵蓋：
   - 章節內帶 `border-bottom` 的元素數量 = 3
   - 主名／區塊標題／欄標題／清單項的字級與字重落在票面區間
   - 清單項 `line-height` = 32px
   - 彗星分隔線**有非零斜度**
   - 照片高度落在 400–480px 區間、`src` 指向 webp
   - `.starlit-reveal` 的初始與顯現狀態
   每一條都要實跑紅測證明改壞會變紅。
4. **MINOR-1**：教育清單實量 pitch 60px／56px，不在 32px 網格上（`padding:12px 0` + `gap:4px` 造成）。
   修到與其他清單同一條垂直網格。
5. **MINOR-2**：`--starlit-font-title` 實際套到 8 個選擇器，30-B.2 只列了 3 個。
   這個擴大有正當理由（是拿到真實字重的唯一路徑），**予以追認**，但要在測試中釘住實際套用的選擇器清單，
   避免日後無聲擴散。
6. **MINOR-3**：Google Fonts 目前走 `@import` 三層串接且無 `preconnect`，54px 主名有可見 FOUT/CLS。
   在 `app/layout.tsx` 追加 `fonts.googleapis.com` 與 `fonts.gstatic.com` 的 `preconnect`（後者要 `crossorigin`）。
7. **MINOR-5**：NotoSansTC 目前只載 600/900，走 font-title 的 400/500 CJK 會靜默取到 600。
   補載 400，或明確限制可用字重並在測試中釘住。
8. **Nit**：英文版第二筆得獎兩行的大小寫風格統一。
9. **死檔**：`public/portrait-milktea.png`（2.8MB）與 `public/portrait-milktea-768.png`（1MB）零引用，
   移到 `work/starlit-implementation/followup-29b/`（已 gitignore），**不要刪除**。
10. **MINOR-7**：報告的成本數字改列實際傳輸值（壓縮後），不要只給未壓縮值。

**不處理**：MINOR-4（NotoSansTC `@import` 全站生效，舊首頁實測無回歸）、globals.css LF→CRLF（非本票造成）。

**另開 Ticket 32「全站換字」**：30-B.5 的具名例外造成開場六段與 `.starlit-tab[data-active]` 仍是假粗體。
Developer 服從 30-B.5 正確，本票不動，另票處理。

## 2026-09-17 追加：30-B 撤回後，30-D 那十項還剩下什麼

30-B 撤回之後，30-D 的十項有四項失效或反轉，逐項對帳如下，避免有人照舊文把字體加回去：

| 30-D 項目 | 撤回後的狀態 |
|---|---|
| 1 Playfair Display 定案 | **反轉**：`--starlit-font-display` 不再指向任何外部字 |
| 2 `SITCON` 全大寫 | 有效，與字體無關 |
| 3 視覺回歸測試（MINOR-6） | 有效，且 Review C 另跑 5 條 30-A／30-C 改壞法確認 5/5 全紅 |
| 4 教育回到 32px 網格 | 有效 |
| 5 八個 font-title 選擇器釘住 | 有效，但**追認理由已消失**（見下） |
| 6 Google Fonts preconnect | **反轉**：不得有任何 preconnect |
| 7 NotoSansTC 補載 400 | **反轉**：不得載入 NotoSansTC |
| 8 英文得獎大小寫統一 | 有效 |
| 9 死檔移出 `public/` | 有效 |
| 10 成本改列傳輸值 | 有效 |

**第 5 項要特別註記**：Review B 當初追認「八個選擇器」的唯一理由是「那個堆疊是拿到真實 CJK
字重的唯一路徑」。外部字撤掉之後這個理由不存在了，但擴散仍原樣保留。
Review C 據此開出 MAJOR-1。處置見下。

## 2026-09-17 追加：Review C 的 Findings 處置（30-E）

完整報告：`work/starlit-implementation/followup-30/font-revert/review-C/review.md`

| Finding | 處置 |
|---|---|
| MAJOR-1 `--starlit-font-display: Georgia` 是偷渡的設計決定 | **採納**。Review C 用前 30 基線證明八個套用點裡只有一個原本是 Georgia、兩個是 Arial、五個是 jfOpenHuninn，所以「Georgia 是原本」只有八分之一成立。改為 `'jfOpenHuninn'`；`.starlit-brand-name` 與 `.starlit-brand-sub` 兩個 header 選擇器**回到前 30 的原始宣告**（Georgia 400 與 Arial）。Georgia 版本另附前後對照請使用者拍板，不由 Coordinator 代答。 |
| MAJOR-2 票面與 coordinator-note 沒回寫 | **採納**。本段與 30-B 節首的警語即為補寫。Coordinator 在前一輪才立下「票外動檔案當場補登」的規矩，本輪自己沒做，記過。 |
| MAJOR-3 18 條回來路徑中 10 條測試全綠 | **採納**。防線只架在 `app/globals.css` 與 `--starlit-font-display` 上。擴大到：`globals.css`、`starlit-shell.css`、`layout.tsx`、`starlit-shell.tsx` 四個來源都不得出現外部字型 URL、`@font-face`、指向字型主機的 `<link rel=stylesheet>`；三個字體變數都不得長出泛型襯線。 |
| MINOR「拉丁不得掉到 fallback」被靜默刪除且無替代 | **採納**。這正是本專案一路在防的那種弱化，而且 Coordinator 的報告沒提。改成**正向**識別：拉丁堆疊必須量到 jfOpenHuninn，不是「不等於不存在的字族」。 |
| MINOR `[400,600,900]` 已退化成冗餘推論 | **採納**，改寫成有獨立意義的斷言或刪除並說明。 |
| MINOR preconnect 正則綁死雙引號 | **採納**。 |
| MINOR 撤除候選迴圈掃描面比訊息窄 | **採納**。 |
| MINOR `red-test.sh` 把任何非 0 離開碼當 RED | **採納**，要區分斷言失敗與腳本錯誤。 |
| MINOR header 品牌字重 400→600、副標 Arial→Georgia | **採納**，見 MAJOR-1 的處置。 |
| Nit ×2 | 依 Review C 報告處置。 |

## 交付狀態

- 2026-09-17：第一輪實作與 Review B 完成，PASS with findings，無 Blocker。
- 2026-09-17：30-D 第二輪完成（十項、25 條紅測全紅）。
- 2026-09-17：**30-B 經使用者裁示撤回**，Coordinator 直接執行，Review C 覆核為
  PASS with findings（3 Major / 6 Minor / 2 Nit，無 Blocker）。
- 進行中：30-E，處置 Review C 的 Findings。
