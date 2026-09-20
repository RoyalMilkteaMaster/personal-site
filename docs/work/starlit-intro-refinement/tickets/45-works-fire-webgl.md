# 45 — /我的作品 火 v5：方案 C（WebGL 著色器），去掉「電子感」

使用者於 2026-09-19 看過 v4（Canvas 2D，琥珀核心 0.35）：
> 我覺得保留琥珀色還不錯 但是我現在想要試試看 C 方案 就是改 WebGL 著色器 主要我一直覺得有一種電子感，不像真的火的感覺，我想看看 C 能不能做得更像一點。

## 為什麼 v4 有電子感（Coordinator 分析）
半解析度（2px 格）的 DOOM 熱圖本質是像素火：格子狀的火舌、離散的冷卻階、放大後的方塊邊。焦邊關掉平滑後更是硬像素邊。真火是連續的：多層 FBM 噪音往上捲、邊緣柔、亮度用加色混合（發光而不是塗色）。

## 核准需求
1. **每張卡一個 WebGL canvas**（`<canvas class="starlit-ember-gl">`，同 v4 的定位、`pointer-events:none`、只在 `data-burning` 期間掛載），片段著色器全解析度（DPR 感知，上限 2）繪製：
   - 火舌：2–3 層 FBM（simplex／value noise）沿 y 往上捲動、不同速度與尺度；熱源沿燃燒前緣取樣（前緣距離場當 uniform texture）；顏色階 hot（含琥珀核心，沿用 `EMBER_FIRE_CORE_WARMTH`）→ light → base → deep → 透明，**加色混合**讓核心發白熱。
   - 焦邊與餘燼：由同一距離場算，焦邊 0–6px 深色、餘燼 6–14px 帶噪音閃爍與固定餘燼點（位置由 seed 決定），邊緣柔化 1px。
   - 火星：保留 v4 的 CPU 火星或改 GPU 點精靈，擇一，5–10 顆。
2. **洞不變**：v4 的燒掉時間場、閾值節奏（3.0s + 0.8s 淡出、收回 1.4s）、marching squares → `clip-path` 全部沿用；著色器只接手「畫火」。膜仍是真 DOM。
3. **退路**：WebGL 建立失敗（或 context lost）自動退回 v4 Canvas 2D 火；v4 程式碼保留。`prefers-reduced-motion` 不掛任何 canvas。
4. **專屬色**：uniform 從 `--ember-tint*` 讀，未指定專案仍自動領色。琥珀核心維持 0.35。
5. **效能**：三張同燒每幀 GPU 時間不可量時，以 rAF 間隔與 `performance.now()` 幀工時報告；每張 canvas 解析度上限（例如 2× DPR、寬 ≤ 900px）；靜止時零 context（燒完 `loseContext()` 或卸載）。同時最多 3 個 context，不與 3D 舞台搶（3D 舞台已有一個）。
6. 互動／a11y 與 v4 完全相同。外框（更粗、火焰舔邊）仍留到火定案後。

## 範圍
新檔 `lib/ember-fire-gl.ts`（著色器原始碼字串、uniform 打包、純函式可測的部分如距離場打包、色階打包）、`lib/ember-fire-gl.test.ts`、`components/starlit-shell.tsx`（`StarlitEmberFire` 內分支 GL／2D）、`components/starlit-shell.css`（`.starlit-ember-gl`）、`components/starlit-shell.test.ts`。
不動 `lib/ember-fire.ts` 的洞／節奏邏輯（可新增匯出）。不新增依賴（手寫 WebGL1，不用 three）。Developer Opus 5 high、Reviewer Opus 5 high。
**與 Ticket 44 並行**：44 動內容欄與卡片外框（`.starlit-ember::before/::after`、`.starlit-content`）；45 只動火層元件與火的 CSS。

## 驗證
單元：著色器字串含三層噪音與加色混合關鍵字、uniform 打包長度、色階打包與 `warmRamp` 一致；紅測各一。
harness 1440／390：燒時 canvas 為 `webgl` context（`getContext('webgl')` 成功且 `data-fire="gl"`）、退路測試（把 `WebGLRenderingContext` 設為 undefined 後 `data-fire="2d"` 且 v4 斷言仍過）、像素：火舌在洞上緣之上、洞下緣之下無、同半徑多角度不一致、焦邊暗；3.0s 四角燒穿、3.8s 卸載；A/B 幀工時；凍結幀（三張 × 6 時點 × 兩寬度）。實機親眼看：**電子感是否消失**。

## 交付狀態
- 開票 2026-09-19，Developer（Opus 5 high）實作中。
- 2026-09-19 **Developer 實作完成**，紀錄：`work/starlit-implementation/followup-45/developer.md`。
  - 新檔 `lib/ember-fire-gl.ts` + `lib/ember-fire-gl.test.ts`：著色器原始碼（WebGL1／GLSL ES 1.0）、
    uniform／色階／距離場打包、加色混合設定、解析度上限。`components/starlit-shell.tsx` 的
    `StarlitEmberFire` 多一條 GL 的 effect（排在 v4 那條之前，用 `glFailed` ref 同一個 commit 交棒），
    v4 一個字沒改地留著當退路；`components/starlit-shell.css` 新增 `.starlit-ember-gl`。
    **`lib/ember-fire.ts` 完全沒有動**（洞、節奏、餘燼點、火星、marching squares 全部沿用）。
  - **45.1 火舌**：三層 FBM（尺度 0.0295／0.0605／0.115，往上捲 150／245／390 px/s），
    熱源沿前緣往下取樣 20 次、加總、以高度加權；噪音同時調亮度與**削出尖端**。
    顏色走 v4 的同一組色階，最熱處往白推、rgb 允許超過 alpha，
    `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` 預乘加色 → 核心白熱。
    焦邊（0–6px）與餘燼帶（6–14px）由同一個距離場算、1px 柔邊、**焦邊最後合成**（F1 不回歸）。
  - **方案 C 不是「換成 WebGL 就會像火」**：前三版都比 v4 更電子，四個不同的原因（取樣步長 >
    熱源帶寬、離散的高度權重取 max、距離場 8 位元的量化等高線、每取樣點的橫向偏移）全部記在
    developer.md 第 2 節與程式碼註解裡，對照圖在 `followup-45/evidence/look/`。
    最終：距離場改 **16 位元**（LUMINANCE_ALPHA + 著色器自己做 texel-centre 雙線性）。
  - **45.3 退路**：拿不到 WebGL1／預算滿了／著色器編不起來 → 直接畫 v4，`data-fire="2d"`；
    `webglcontextlost` → 換 canvas 元素再走 v4。**踩到的坑**：`loseContext()` 之後同一個 canvas
    再也拿不到任何 context，所以「開了再關」的第二支火必須換元素（`key` 帶上 `mode`）。
  - **45.5 context**：預算 3（不跟 3D 舞台的 webgl2 搶），卸載即 `loseContext()`；
    實測三張同燒 `live: 3` → 燒完 `live: 0`（兩個寬度）。DPR ≤2、畫布寬 ≤900 device px。
  - **45.4 專屬色**：著色器裡沒有任何寫死顏色，uniform 全部來自 `--ember-tint*` 過 `warmRamp(0.35)`。
- 驗證：`followup-34/run-tests.sh` → **TSC GREEN + 七支 GREEN**（新增 `lib/ember-fire-gl.test.ts`）；
  `followup-45/ui-checks.cjs`（由 `followup-46` 派生，Ticket 41 round 2 的斷言一條都沒拿掉）
  **1440×900 與 390×844 ALL PASSED（35 條）**；`followup-45/gl-checks.cjs` 兩個寬度 **ALL PASSED**；
  紅測 `followup-45/red-test.sh` **六條全 RED、還原後 sha256 一字不差**。
  凍結幀 `followup-45/evidence/round2/` 48 張（三張卡 × 300/500/800/1300/2000/3000ms × 兩寬度），
  GL／2D 並排對照 `followup-45/evidence/look/` 24 張。
- **反電子感的量測**：票面點名的「>40 跳變密度」實測 **GL 反而比 2D 多**（28.99 vs 5.46／千像素）——
  那個指標量的是「對比」不是「格子」，連續有力的火本來就有大跨度。改用**把火的區域裡相鄰像素的
  亮度差按 `x mod 4` 分四堆**（v4 的一格 2 CSS px，DPR 2 下就是四個裝置像素的方塊）：
  **GL 17.96/18.33/18.05/17.98（最大／平均 1.015）vs 2D 22.03/4.82/3.61/4.79（2.499）**；
  390 為 1.009 vs 2.449。兩個數字都照實印在每一次輸出裡。
- **harness 證不了、仍待確認**：①「電子感是不是真的消失、像不像火」只能實機用眼睛看；
  ② 真機 60fps 與真正的 GPU 成本（swiftshader 純軟體光柵；元件自報的 0.21–0.46ms 只是 CPU 那一側）；
  ③ 混合模式的紅測只能釘在單元層（`getImageData` 會去預乘，兩種混合的顏色完全一樣，只有 alpha
  差一個 a 倍，整團火的平均亮度只差一成）；④ Safari／WebKit 完全沒實測；
  ⑤ `webglcontextlost` 的真實路徑沒被瀏覽器真的觸發過；⑥ 16 位元 texel-centre 取樣在只有 mediump
  的舊行動 GPU 上未驗；⑦ `preserveDrawingBuffer: true` 是為了截圖與量測而開的，請裁示正式版是否關掉。
- 2026-09-19 Reviewer S（Opus 5 high）**PASS with findings**：票面需求 1–6 逐條滿足、七支測試／
  兩個寬度 harness／六條紅測自己重跑數字一字不差；但有一條 Major 的退路缺口（F1）與一個
  **新的、量得到的電子感**（F4 逐像素顆粒，孤立亮點 9.72／千 vs v4 0.084／千）。
  美學裁決：「**已經越過『不是像素火』那條線，還沒越過『是真的火』那條線**」——
  焦邊連續乾淨、外焰真的在發光、格子完全消失（獨立重算 x mod 4：GL 1.033 vs 2D 1.637），
  但顆粒像砂紙、火舌不「舔」（貼著前緣長）、粉紅／紫像「發光的裂縫」。
- 2026-09-19 **Developer 第二輪（v5.1）完成**，紀錄：`work/starlit-implementation/followup-45/round2/developer.md`。
  - **F1（Major）已修，而且根因比 Review 說的更寬**：不是「`loseContext()` 污染 canvas」，
    而是**一張 canvas 只要成功給出過 WebGL context 就永遠給不出 2D context**。所以 Review 的
    建議 (a)「不 lose 就地交棒」行不通，走的是 (b)：編譯失敗 → `setGlBroken(true)` → 換一張
    新的 canvas 元素 → v4 在下一個 commit 畫上去。
  - **F2 已補**：harness 用 `addInitScript` 攔 `getShaderParameter` 報編譯失敗，多跑一趟退路，
    要求 `data-fire="2d"` 且**真的有火**（`flame.cells > 0`）。`ignite` 也改成會 assert
    而不是丟裸的 TimeoutError，所以「挖了洞卻沒有火」現在是看得懂的失敗。
  - **F4（Major）已修**：粗取樣的抖動整個換成平滑噪音（平滑噪音做不出孤立亮點）、march 起點
    改用低頻噪音抖動、點精靈下限 4px 且改圓頂。孤立亮點 **9.72／千 → 最差 1.83（1440）／
    4.36（390，洞吃掉整張卡那一幀）**。新增斷言：火還有身體的幀 ≤ 3.0、全部幀 ≤ 5.0。
  - **火舌會「舔」了**：`fbm` 座標改各向異性 `vec2(p.x * 0.62, p.y * 0.279)`（y 比 x 壓 2.2 倍）。
    只壓 y（Review 的建議）會把火舌削成一個像素寬，尖端反而被算成顆粒，所以 x 也一起放大。
    火舌高度仍在 16–40px（1440 26／22／28px、390 28／20px）。
  - **色階轉折 0.55 → 0.45**（第二個 0.82 → 0.80），火的主體移到 base→light（暖核心 0.35 染過的
    兩階）。三張卡重新量：焦線 (36,26,16)／(40,21,27)／(30,21,31)、hot (255,220,172)／
    (255,217,188)／(249,216,192)、白熱核心實測 249／194.9／252（390：251／196.4／251）。
  - **3(b) 已修**：`preserveDrawingBuffer` 與量測用的離屏 FBO 改掛 `window.__starlitEmberCapture`
    旗標，**正式版預設關**（單元測試釘預設值、shell 測試釘元件不得寫死 true）；
    harness 三個入口都用 `addInitScript` 打開，並且每一幀斷言 `capture === true`。
  - **F3 已補**：中位數半徑的改法保留並在註解裡明寫「已與射線量測相依」；獨立證據
    「前緣半徑起伏 > 25%」從只在 t=0.8s 擴到**每個凍結時間點、每張卡**（1440 實得 28–52%、
    390 實得 26–43%），並寫明「半徑中位數 ≥ 35px 才問」的理由（噪音瓣 45px）。
  - **F5 已補**：紅測在最後一次改 product 檔之後重跑，`red-test.txt` 的 sha256 就是出貨的檔。
  - **F6 已補，而且發現一件該講的事**：`fbm` 紅測的宣稱改成實話（它咬的是火舌高度範圍）。
    另外寫了兩個變異想單獨咬住「欄間參差 ≥ 8px」，**兩個都咬不住** —— 那條斷言被燒掉時間場
    自己的不規則、每欄的 `lean`、march 起點抖動過度決定了，**所以它不能當成「FBM 有在作用」
    的證據**。真正的證據是 `fbm` 變異把火舌高度打出 16–40px 之外，以及顆粒與格子兩個指標。
- 第二輪驗證：`followup-34/run-tests.sh` **TSC GREEN + 七支 GREEN**；
  `followup-45/harness.sh` **1440×900 與 390×844 ALL PASSED（35 條）**；
  `followup-45/gl-checks.cjs` 兩寬度 **ALL PASSED**（含編譯失敗退路、顆粒、capture 三組新斷言）；
  紅測 **六條全 RED、還原後 sha256 一字不差**；凍結幀 48 張 + **五連拍 20 張**
  （card 1／card 3 × 800–1200ms 每 100ms × 兩寬度）+ 顆粒 4× 放大對照。
  反電子感：格子指標 GL **1.006／1.013** vs 2D 2.499／2.449；孤立亮點見上。
  另修了兩處 Ticket 41 harness 在**高負載**下的假紅（A/B 區塊量 32 個 rAF 間隔要三秒多，
  火早已卸載 → `ramps: []`），不是本票缺陷但現在是本票的 harness。
- **第二輪仍未驗證**：①正式版（旗標關閉）那條路徑從來沒被量測過 —— 量它就得開它；
  ②著色器編不起來只有模擬（沒有 mediump-only 的舊機器）；③「欄間參差」沒有任何變異能讓它變紅；
  ④顆粒在「洞吃掉整張卡」那幾幀仍是 4.36／千。第一輪的六條（真機 GPU／Safari／混合模式在真硬體上／
  `webglcontextlost` 真實路徑／mediump 取樣／`ember-fire.ts` 未動只有 mtime 佐證）全部仍然成立。
- **給 Coordinator**：`followup-46/ui-checks.cjs` 目前**自己是紅的**且與本票無關 ——
  `41.2 gold t=300ms 半徑 24px 上十六個角度不得一致`，因為 Ticket 46 把開啟面字級加大使卡片變高，
  300ms 時洞比那個探針半徑還小。45 的 harness 把探針半徑改成「該幀八條射線的前緣半徑中位數」
  （正圓仍會被抓到），理由寫在 `patch-harness-45.mjs`；46 需要同樣處理。
- Developer 交付：`lib/ember-fire-gl.ts`＋測試、`StarlitEmberFire` GL 路徑（context 預算、`loseContext`、同 commit 交棒 2D 退路）、`.starlit-ember-gl`；`lib/ember-fire.ts` 未動。tsc／七支綠；harness（派生自 46，41 round 2 斷言全留）1440／390 ALL PASSED（35）；gl-checks 兩寬度全過；紅測 6/6。待裁示：①票面「>40 跳變密度」量的是對比不是格子（GL 28.99 vs 2D 5.46），Developer 改用「x mod 4 四堆比值」（GL 1.015 vs 2D 2.499）；②`preserveDrawingBuffer: true` 正式版是否關掉；③46 harness 的 41.2 探針半徑需同樣改為前緣中位數。Developer 自述前三版著色器比 v4 更電子（環狀等高線、梳狀細紋），已修。Reviewer（Opus 5 high）審查中；合併 harness（44 疊在 45 上）背景跑中。
- Reviewer S（Opus 5 high）**PASS with findings**：自跑 tsc／七支綠、gl-checks 兩寬度全過、harness 35 條 ALL PASSED、紅測六條全紅、需求 1–6 全滿足。F1（Major）著色器編譯失敗路徑 `loseContext()` 後同一 canvas 拿不到 2D → 卡片無火；F4（Major，不擋票）新的電子感＝逐像素椒鹽顆粒（孤立亮點 GL 9.72／千 vs 2D 0.084／千；根因逐像素 hash 抖動；梳狀等高線是 20 步 march 混疊）；F2／F3／F5／F6／F7 Minor。3(a)：Developer 的 x mod 4 指標誠實但窄，建議加「孤立亮點 ≤3／千」；3(b)：`preserveDrawingBuffer` 改 debug 旗標、正式版關。
  美學：「比 v4 好非常多——焦邊連續乾淨、外焰真的在發光、格子完全消失，金卡已經像燒起來的紙。但電子感換了形式沒消失（椒鹽顆粒、2000ms 像砂紙）；火舌不舔（各向同性 FBM → 雲／泡沫質地）；粉紅只算半個火、紫卡最弱。已越過『不是像素火』，還沒越過『是真的火』。」
- Coordinator：交 Developer 第二輪（v5.1）——F1 退路、march 起點平滑抖動＋hash 抖動 1/4、FBM 垂直拉長讓火舌舔、ramp 轉折 0.55→0.45、preserveDrawingBuffer 改旗標、孤立亮點斷言、F3 每時點起伏斷言、紅測證據重生。
- 第二輪（v5.1）交付：F1 改換新 canvas（一張 canvas 給過 WebGL 就永遠給不出 2D，Review 建議 (a) 不可行）；孤立亮點 9.72→1.83（1440）／4.36（390 最差幀）；格子指標 1.006／1.013；火舌 20–28px；白熱核心三色 249／195／252；前緣起伏每時點 26–52%；`preserveDrawingBuffer` 與 probe FBO 改 `EMBER_GL_CAPTURE_FLAG` 旗標、正式版關；tsc／七支綠、harness 35 條 ALL PASSED、gl-checks 兩寬度全過、紅測 6/6。Developer 指出「欄間參差 ≥8px」斷言無法被任何變異弄紅，不能當 FBM 證據。Reviewer 定向複驗中；合併 harness 重跑中。
- Reviewer S 定向複驗（v5.1）**PASS with findings**：F1／F2／F3／F4／F5／F6／3(a)／3(b) 全部已解（自跑 run-tests 綠、gl-checks 全過、harness 35 條一次過、紅測七條全紅）；顆粒獨立重算 v5 14.26／千 → v5.1 3.17／千。新發現 N1–N6 皆 Minor（顆粒斷言未蓋 1300ms 之後、三處註解過時、兩條紅測標籤不準、點精靈下限無釘、「火舌會舔」無儀器可證）。
  美學：「砂紙沒了；火舌真的會舔，細高分明、尖端撕裂；三張卡都看得到焦線與琥珀白熱核心，粉卡已讀成燒紙，紫卡進步較小。v5.1 已越過『不是像素火』，金卡與粉卡大致越過『像真的火』，紫卡在線上，1300ms 之後的尾段三張卡都掉回線下。若只能再花一刀：讓火舌高度與 seedBand 隨 fade 一起收，讓火熄下去而不是留一排全高尖刺。」
- **等使用者實機看**：①像不像真的火；②要不要做「尾段收火」那一刀（v5.2）。
- 2026-09-19 Coordinator：合併 harness（44 疊在 45 v5.1 上，`followup-44/merged/`）1440／390 **ALL PASSED（47 條）**——41／43／44／45／46 同頁全綠（兩處淡出等待改為條件式）。
- 2026-09-19 使用者：「好 火就用這版」→ **v5.1 定案，結票**。尾段收火（v5.2）不做。琥珀核心 0.35、WebGL 優先、2D 退路保留。
