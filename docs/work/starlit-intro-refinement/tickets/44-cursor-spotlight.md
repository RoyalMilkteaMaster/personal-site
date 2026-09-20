# 44 — 鼠標漸亮（毛哥 elvismao.com/zh-Hant/code 那種）— 先確認範圍

使用者於 2026-09-19：「我現在想要改成像毛哥這個網站一樣 有鼠標到的地方漸亮的效果，幫我看一下他是怎麼做到的」。

## 毛哥怎麼做的（Coordinator 2026-09-19 實機檢視 elvismao.com/zh-Hant/code）
- 純 CSS + 幾行 JS，沒有 canvas。JS 在 `#cards` 容器上聽 `mousemove`，對**每一張** `.card` 算 `clientX − rect.left`／`clientY − rect.top`，寫進該卡的 `--mouse-x`／`--mouse-y`（實測：鼠標在第二張卡 x=80 時，第一張是 387px、第三張是 −228px——每張卡都知道鼠標相對自己的位置，所以相鄰卡的邊也會亮）。
- 每張卡兩個偽元素，都是 `radial-gradient(… circle at var(--mouse-x) var(--mouse-y), 白 → transparent 40%)`，`transition: opacity .5s`：
  - `::after`（z 1，600px 圓、白 40%）墊在內容底下；內容 `.card-content` 是 `inset: 1px` 的深色板，所以只露出 **1px 邊框**在鼠標附近亮起——這就是「邊框跟著鼠標亮」。`#cards:hover > .card::after { opacity: 1 }`：鼠標在整個格子區時所有卡的邊都亮。
  - `::before`（z 3，800px 圓、白 6%）蓋在內容上，只有 `.card:hover` 才 opacity 1——鼠標所在那張卡內部有一層淡淡的聚光。
- 這是 Hyperplexed 的「Linear 風格卡片」做法，成本幾乎為零。

## 待使用者確認的範圍
A. **內容欄背景聚光**：整個 `.starlit-content` 一層 radial 漸亮（紫→金的星點色，很淡）跟著鼠標，取代星塵的「背景有東西」——三個分頁都有。
B. **作品卡邊框跟著鼠標亮**：三張火卡照毛哥做 `::after` 邊框聚光（用各卡專屬色），與現有流光框並存（燒開時流光框接手）。
C. A + B。

## 狀態
**使用者 2026-09-19 選 C（背景聚光 + 卡片邊框）**，開工。Developer Opus 5 high、Reviewer Opus 5 high。與 Ticket 45（WebGL 火）並行：45 只動火層元件；44 動內容欄與 `.starlit-ember` 外框偽元素。
待使用者裁示範圍後開工。不動任何程式碼。

## 核准需求（C）
A. **內容欄背景聚光**：`.starlit-content`（三個分頁共用）一層 `radial-gradient(… circle at var(--mouse-x) var(--mouse-y))`，色用星點色（紫→金極淡，白 4–6% 等級），800–1000px 圓，`transition: opacity .5s`；鼠標離開內容欄淡出；捲動時位置跟著（用 `clientX/Y − rect`，捲動容器內要正確）；`pointer-events:none`，永遠在文字之下、背景之上；`@media (hover: none)` 不掛；`prefers-reduced-motion` 只去掉過渡不去掉效果。JS：一個 `pointermove` 監聽在內容欄，`requestAnimationFrame` 節流，只寫 CSS 變數。
B. **作品卡邊框跟著鼠標亮**（毛哥做法）：`.starlit-ember` 每張卡 `--mouse-x/--mouse-y`（監聽在 grid 上，對每張卡算相對座標）；`::after`（墊底，600px 圓、該卡專屬色 40%）＋內容板內縮 1px 露出邊框；`::before`（蓋內容，800px 圓、專屬色 6%）只在 `:hover`；grid `:hover` 時所有卡 `::after` opacity 1。**與現有流光框並存**：靜止時鼠標聚光邊框；`data-lit` 燒開後流光框接手（聚光邊框淡出）。膜（button）在最上層時聚光仍要看得到 → 層級要排好。
C. 兩者都不新增依賴、不用 canvas。

## 驗證
單元：座標換算純函式（含捲動偏移）；紅測各一。harness 1440／390：pointermove 到內容欄某點後 `--mouse-x/y` 等於相對座標、聚光偽元素 opacity 1、離開後 0；grid 上移動時三張卡各自的變數不同且相鄰卡邊框亮；hover 卡 `::before` opacity 1；燒開時聚光邊框 opacity 0 而流光框 1；`(hover: none)` 模擬下沒有監聽、變數不寫；像素：聚光中心比 200px 外亮、但文字對比不變。實機親眼看。

## 交付狀態
- 開工 2026-09-19，Developer（Opus 5 high）**實作完成**，交付文件
  `work/starlit-implementation/followup-44/developer.md`。

### 動到的檔案
- 新增：`lib/cursor-glow.ts`（座標換算純函式 + `(hover: none)` 擋板）、`lib/cursor-glow.test.ts`。
- 改：`components/starlit-shell.css`、`components/starlit-shell.tsx`、
  `components/starlit-shell.test.ts`、`work/starlit-implementation/followup-34/run-tests.sh`。
- 沒動 `app/page.tsx`、`lib/projects.ts`、開場、About／Contact 文案，也沒動 Ticket 45 的火層
  （`StarlitEmberFire`、`lib/ember-fire*`、`.starlit-ember-canvas`／`.starlit-ember-gl`）。

### 做法
- **A**：內容欄裡多一層 `.starlit-glow-host > .starlit-glow`。宿主包住三個分頁**與頁尾**、
  在正常流裡、高度＝整欄內容高度（scroller 裡 `inset: 0` 的孩子只有可視高度、而且會跟著內容
  捲走，所以不能直接放在 `.starlit-content` 上）；負 margin ＋ 同額 padding 讓聚光蓋到欄的整個
  padding box 而文字寬度不變；`isolation: isolate` ＋ 分頁／頁尾 `z-index: 1` 讓聚光永遠在文字
  之下。900px 紫 5% ＋ 420px 金 4%，`transition: opacity .5s`，亮不亮交給 CSS `:hover`。
- **B**：`.starlit-ember::after` 是鼠標邊框聚光（600px、該卡專屬色 40%），**流光框的
  `::before` 一個字都沒動**；膜與開啟面各內縮 1px 露出那一圈（毛哥的 `inset: 1px`），火的
  canvas 維持 `inset: 0`；卡片內部的淡聚光是新元素 `.starlit-ember-spot`（z 3：火 5 ＞ spot 3
  ＞ 膜 2 ＞ 開啟面 1 ＞ 聚光邊框／流光框 0）。`data-lit`／`data-closing`／`data-burning` 時
  聚光邊框讓位給流光框。
- JS 只有一個 rAF 節流的 `pointermove`，回呼裡只寫 `--mouse-x/--mouse-y`；`(hover: none)`
  不掛監聽、不寫變數，CSS 的亮起規則也全部關在 `@media (hover: hover)` 裡。

### 驗證（實得）
- `TSC GREEN` ＋ 本票負責的五支測試 GREEN（`lib/cursor-glow.test.ts` 在內）。
- harness 1440×900 的 Ticket 44 三條全過（`followup-44/ui-checks-run.txt`）。
- `followup-44/probe-44.cjs`（同一組斷言、同一組訊息，走 `/starlit-ui-preview` 不必讀開場）
  **1440 與 390 都 ALL PASSED，10 條**：
  - 內容欄：`--mouse-x/y` 與 `clientX/Y − 宿主 rect` 相差 <1px、opacity 0 → 1 → 0、過渡 0.5s；
    捲 300px 後欄內 y 18 → 318（**1440 捲的是內容欄自己、390 捲的是視窗**，同一條公式）；
    像素 鼠標處 12.088 → 27.16／27.17，250px 外只有 → 14.79／14.61，h1 最亮像素 237.277 不變。
  - 卡片：桌機三張 `--mouse-x` **415.2 / 132.4 / −150.4**（＝毛哥 387 / 80 / −228 的同一件事）；
    390 是單欄直排所以換成 `--mouse-y` **378 / 120 / −138**；邊框 opacity 1/1/1、
    內部聚光 0/1/0、膜與開啟面各內縮 1px、層級 邊框 0 → 內部 3。
  - 燒開後：邊框 0/0/0、流光框 1/1/1 且 `starlit-ember-orbit` 在轉、鼠標那張的內部聚光仍是 1。
  - reduced-motion（兩個寬度）：三層過渡都 0s，但漸層還在、`display` 不是 none、變數照寫、
    opacity 照樣到 1。
  - `(hover: none)` 兩條路（hasTouch+isMobile、matchMedia 覆寫）都是一個 `--mouse-*` 都沒寫；
    真觸控那條連三種聚光的 opacity 都是 0。
- 紅測四條（監聽拆掉／邊框釘死 0／擋板拿掉／膜不內縮），全部真 AssertionError，
  `components/starlit-shell.{tsx,css}` 的 sha256 前後相同。

### 未完（與 Ticket 45 並行造成）
交付版 harness 跑不到 390：1440 的 Ticket 44 三條全過之後，停在 **Ticket 41 的火**。
收工前最後一次重跑的狀態是：F2（重點兩次都要量得到火）已經**過了**（Ticket 45 修掉了
`__starlitEmber` 的時序），harness 往前走，接著停在 **Ticket 41 的火像素探針** ——
它對那張 canvas 呼叫 `getContext('2d')`，而火現在是 WebGL，回 null
（`TypeError: Cannot read properties of null (reading 'getImageData')`）。一張 canvas 只能有
一種 context，所以這是 **Ticket 41 的一整組火像素證據要跟著 Ticket 45 重生**，不屬於本票。
**這不是 Ticket 44 造成的**：把未改過的 `followup-46/ui-checks.cjs` 原樣複製到
`followup-44/control-46/`、對同一份工作樹跑，它在完全同一行紅。

因此**「Ticket 40/41/43/46 的斷言仍然全過」本輪只驗到 1440 走到 Ticket 41 的火為止（10 條 ok
全過，其中 7 條是 40/43/46 與版面／型階／字體那些）**。Ticket 45 把火的 harness 斷言重生之後，
請再跑一次 `bash work/starlit-implementation/followup-44/harness.sh`（Ticket 44 這邊不需要跟著
改任何東西）。

### Review R（PASS with findings）之後
- **F2（滾輪捲動、指標不動時聚光跟著內容跑掉）已修**：`useCursorGlow` 在同一個 effect、同一道
  `(hover: none)` 擋板之後多掛一個 `document` 捕獲階段的 passive `scroll`，回呼只是拿同一組
  client 座標再跑一次 rAF 節流的 `paint()`（公式沒改；桌機捲的是 `.starlit-content` 這個元素、
  元素 scroll 不冒泡到 window，所以掛捕獲階段一次收兩種）。新釘子：`lib/cursor-glow.test.ts`
  的不變量（同一 client 座標、不同 `rect.top` → 視窗座標不變，以及反面的偏移量＝捲動量）、
  `components/starlit-shell.test.ts` 四條（只有一處、掛在 document 捕獲階段且 passive、
  cleanup 拆得掉、兩個監聽都排在擋板之後）、`probe-44.cjs` 與交付版 harness 的 **A-3b**
  （滾輪捲 300、指標不動 → 圓心的**視窗**座標 ±2px 不動，外加「欄內 `--mouse-y` 必須重算
  ≥100px」的反面斷言）。實測：1440 內容欄捲 0→300（`hostTop` 90→−210）、390 視窗捲 0→300
  （`hostTop` 628.38→328.38），兩邊欄內 y 都 18→318，而圓心視窗座標 (509.98,108)／(30,646.38)
  **一格都沒動**。`probe-44.cjs` 12 條 ok ALL PASSED、`run-tests.sh` TSC + 七支全 GREEN；
  交付版 harness 重生重跑後 1440 是 **11 條 ok 全過**（含新的 F2 那條），之後仍停在
  Ticket 41 的火像素探針（與 F2、與 Ticket 44 無關，見上一段）。
- F1（`min-height: 100%`）與 F3（followup-46 patcher 的 17/15 等值釘子）由 Coordinator 自行補。
- **合併 harness 在 390 紅的 `44-A：真的捲了 300px（視窗），實得 2` 已修，不是產品 bug**：
  `app/globals.css` 的 `html { scroll-behavior: smooth }` 讓**視窗**的程式捲動變成動畫，
  headless 裡那個動畫幾乎不前進；`scroll-behavior` 不繼承，桌機捲的 `.starlit-content` 是
  `auto`，所以只有 ≤850px 會踩到。harness 步驟改成明寫 `behavior: 'instant'`、回傳實得位置、
  先驗起點再驗到位，A-3b 先試真滾輪、捲不到 ≥250px 就退回 instant 程式捲動（對 F2 等價且更
  嚴格：少了實機滾輪後的 synthetic mousemove），反面斷言改成「欄內 `--mouse-y` 要正好跟著
  實得捲動量重算 ±2px」。三份（`patch-harness-44.mjs`、`merged/patch-harness-44-merged.mjs`、
  `probe-44.cjs`）用同一支修正腳本同步。重跑：**1440 ok 11 條、390 ok 12 條，Ticket 44 全過**
  （390 實得 `視窗以真滾輪捲 0 → 300｜欄內 --mouse-y 18px → 318px｜圓心視窗座標 (30, 696.88)
  → (30, 696.88) 沒動`），兩邊之後剩下的紅都落在 Ticket 45 進行中的火層。

- 待使用者實機親眼看（含實機真滾輪）。
- Developer 交付：A 聚光宿主在正常流裡（負 margin＋padding 蓋滿欄、isolation 讓文字永遠在上）、B `::after` 邊框聚光＋膜／開啟面內縮 1px＋`.starlit-ember-spot` 內部聚光，流光框 `::before` 未動；tsc／七支測試綠；probe-44 1440／390 10 條全過（像素 12→27、250px 外 14.8、h1 像素不變；三卡 415/132/−150；燒開後邊框讓位流光框）；紅測 4/4。完整 harness 被 45 改寫中的 WebGL 火擋在 41 探針（`getContext(2d)` null），等 45 落地重跑。Developer 另報 `starlit-shell.tsx` 行尾在中途 CRLF→LF（非本票），待 45 落地處理。Reviewer（Opus 5 high，含 46）審查中。
- Reviewer R（Opus 5 high）**44 PASS with findings、46 PASS with findings**：tsc／七支綠、probe-44 10 條兩寬度全過、版面幾何與 43 逐 px 相同、正文對比 9.72→9.59（−1.3%）、1px 亮邊 37→102、相鄰卡 38→75、行尾全 LF 無混合。口味：「像，而且比預期更像……夜色被呵了一口氣，不是手電筒」。F1（中）host 無 min-height → 作品頁底部 151px 死區有直邊 → **Coordinator 已加 `min-height: 100%`**；F2（中低）只聽 pointermove，滾輪捲動時聚光中心跟著內容跑 → 交 44 Developer 加 passive scroll 重算；F3（46）字級釘子改等值 → 已改；F4／F5 nit 記錄。
- Review R F2 已修（document 捕獲階段 passive scroll 重算，公式不變）：tsc／七支綠、probe-44 12 條兩寬度全過（捲 300 後圓心視窗座標不動、欄內 y 18→318）。**44 結票**（完整 harness 待 45 落地後由其派生版收尾）。
- 2026-09-19 Coordinator：合併 harness（44 疊在 45 v5.1 上，`followup-44/merged/`）1440／390 **ALL PASSED（47 條）**——41／43／44／45／46 同頁全綠（兩處淡出等待改為條件式）。
