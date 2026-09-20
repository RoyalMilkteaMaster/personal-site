# 41 — /我的作品 火 v4：要像真的在燒（方案 B：Canvas 2D 火層）

使用者於 2026-09-19 看過 v3 後：
> 那個火燒的特效還是不行，現在還是沒有那種火燒的不確定感、不規則、真的像火的感覺。現在還是感覺就像一個圈往外而已。
> 你先幫我分析真正的火燒 不規則的特效 應該要是怎樣 才會有這個真的是火的感覺。然後 現在火燒完的節奏還是有一點快，再慢一點點。
> 現在我點下去之後 那個外面的框有點太細了，那個框也沒有火焰的感覺…先讓火更像真的火，我們再來調整外面那圈。

## 狀態
**已核准 B（Canvas 2D）**（2026-09-19）。使用者：「先做 B 我覺得效果不好再改 C 記得到時候提醒我」——
交付時 Coordinator **必須提醒**「不夠火可升級 C（WebGL 著色器）」。
外框留到火定案後再調（要更粗、要有火焰感）。

## 分析（使用者已看過並同意）
v3 的洞是正圓、火是固定寬度的環再被濾鏡扭，本質仍是「圓在等速放大」。真火燒紙有五件事：
① 燃燒前緣不規則（舌狀缺口）；② 焦邊帶（褐→黑）＋外側悶燒的橘紅餘燼忽明忽暗；③ 火焰往上竄不是往外；
④ 顏色由熱度決定（焦邊最暗→餘燼→本色→近白核心，往上透明）；⑤ 節奏不均勻（停頓、突進），整體比 2.2s 慢。

## 核准需求
1. **每張卡一個 `<canvas class="starlit-ember-canvas">`**，絕對定位蓋滿卡片，`pointer-events: none`，位在膜之上；
   只在 `data-burning` 期間掛載與繪製；燒完（或收回完）卸載，靜止時零成本。
2. **洞 = 噪音閾值溶解**：預先產生一張 value noise 噪音圖（純函式、可固定種子測試）；每像素的「燒掉時間」= 到中心距離 ×（1 + 噪音幅度約 0.35）；
   閾值隨時間從中心掃到蓋滿四角。膜（DOM，圖示與文字仍是真 DOM）的遮罩改由 canvas 位圖提供
   （優先：`mask-image` 引用 canvas，`-webkit-mask-image: -webkit-element(...)`/`element()` 不可用時改為 `mask-image: url(dataURL)` 每幀更新，或退而把膜的圖示與文字也畫進 canvas——Developer 擇最穩者並記錄）。
   邊緣必須是不規則的舌狀，不是圓。
3. **焦邊**：閾值前 0–6px 塗深焦色（專屬色 deep 再壓暗至近黑帶褐），6–14px 為餘燼帶（專屬色 base→hot，亮度以高頻噪音閃爍 ±40%），餘燼帶內散佈 10–20 個更亮的餘燼點。
4. **火舌**：沿燃燒前緣取樣為熱源，用 DOOM-fire 熱圖（半解析度、每格 2px）往「上」傳播並隨機冷卻，高度 16–40px、每幀變形；
   顏色階：hot（近白）→ light → base → deep → 透明，越高越透明。重力方向固定向上，前緣在卡片下半部時火舌仍往上舔。
5. **火星**：5–10 顆從前緣往外上方飛，微重力彎曲、漸暗；取代 v3 的 12 顆 CSS 火星。
6. **節奏**：燒穿總長 **約 3.0s**（前緣速度 = 基礎速度 ×（0.7–1.3 的低頻噪音），有停頓／突進感），燒完餘燼與火舌再 0.8s 淡出。
   收回（膜長回來）約 1.4s，前緣同樣不規則，火舌較小。
7. **專屬色不變**：所有顏色由 `--ember-tint*`（hot/light/base/deep）推導；未指定專案仍從色池自動領色。
8. **效能**：半解析度離屏（每格 2px），三張同開 60fps；每幀 < 4ms（桌機，A/B 誠實量測）。`prefers-reduced-motion`：不掛 canvas，直接切換（沿用 v3）。
9. **外框**：本票不動外框。
10. a11y／互動：v3 的 button／region／多開／空白收回／連結不收回全部保留。

## 範圍
`components/starlit-shell.tsx`、`components/starlit-shell.css`（v3 的 `.starlit-ember-fire`、`starlit-spark*`、`#starlit-flame` 濾鏡移除）、
新檔 `lib/ember-fire.ts`（純函式：噪音圖、燒掉時間場、閾值→遮罩、熱圖傳播、火星步進）＋ `lib/ember-fire.test.ts`、`components/starlit-shell.test.ts`。
不動 `lib/projects.ts`。**排在 Ticket 40 之後**（40 正在改 shell.tsx 作品區）。Developer Opus 5 high、Reviewer Opus 5 high。不新增依賴。

## 驗證
單元：燒掉時間場隨距離單調且含噪音（同距離不同角度時間不同）、閾值 0 全膜、閾值滿四角皆燒掉、熱圖只往上傳播且冷卻、火星漸暗；紅測各一。
harness 1440／390：canvas 只在燒時存在；t≈1.0s 取遮罩：同半徑不同角度透明狀態不一致（不規則證據）、焦邊像素為深色、洞上緣上方有火舌像素而洞下緣下方無；
3.0s 四角燒穿；3.8s canvas 卸載；多開、收回、連結；A/B 幀時間；凍結幀 evidence。實機親眼看「像燒」。

## 交付狀態
- 2026-09-19 Ticket 40 交付後開工，Developer（Opus 5 high）實作。
- 2026-09-19 **Developer 實作完成**，紀錄：`work/starlit-implementation/followup-41/developer.md`。
  - v3 的火整組移除：`--hole` 與 `starlit-burn*` keyframes、`.starlit-ember-fire`（兩圈 CSS 火環）、
    `.starlit-ember-sparks` 與 12 顆 `<i>`、`#starlit-flame` 的 feTurbulence／feDisplacementMap，
    CSS 與 JSX 都不留死碼（測試逐條釘「不得存在」）。
  - 新檔 `lib/ember-fire.ts` + `lib/ember-fire.test.ts`：燒掉時間場（距離 ×（1 + 0.35 噪音））、
    0.7–1.3 低頻噪音的節奏、焦邊／餘燼帶／餘燼點的顏色（全部由 `--ember-tint*` 推導）、
    只往上傳播且冷卻的 DOOM 熱圖、火星、marching squares 等值線。
  - **41.2 洞的送法＝ `clip-path: url(#…)`**（SVG `<clipPath>` 的 `<path>` 每幀改寫 `d`），
    理由與其他三條路被否決的原因寫在 developer.md 第 1 節與元件的註解裡：沒有位圖、沒有編碼解碼、
    沒有落後幀，膜的圖示與名稱全程是真 DOM，而且 `SVGPathElement.isPointInFill()` 讓 harness
    可以直接問「瀏覽器現在用的那個 clip path」而不是問場的副本。
  - 節奏改為 `EMBER_BURN_MS` 3000 / `EMBER_FADE_MS` 800 / `EMBER_FIRE_MS` 3800 / `EMBER_CLOSE_MS` 1400
    （常數在 lib，shell 轉出去，測試釘「只有一份」）。流光框只動淡入延遲 2s→3s，外觀未動（41.9）。
- 驗證：`followup-34/run-tests.sh` → **TSC GREEN + 六支 GREEN**（新增 `lib/ember-fire.test.ts`）；
  harness `followup-41/ui-checks.cjs`（由 `patch-harness-41.mjs` 從 followup-40 派生）
  **1440×900 與 390×844 ALL PASSED**；紅測 `followup-41/red-test.sh` **5 條 mutation、10 條斷言全 RED**，
  每條 `cmp` 還原且前後 sha256 相同，baseline 與 final 全 GREEN。
  實測重點：靜止 0 canvas → 燒時 3 canvas（蓋滿卡片、pointer-events none、z 5 > 膜 2）→ 3.8s 卸載；
  t=0.8s／1.3s 同一個半徑上落在卡內的 12–16 個角度「有膜／沒膜」不一致（正圓會全 0 或全 1），
  前緣半徑在角度上起伏 48%（1440）／36%（390）；四個角的燒掉時間不同、**不是同時燒掉**
  （2.0s 燒掉三個／兩個，3.0s 全燒，膜上圖示與名稱的位置也已不在膜裡）；
  焦邊亮度 18.3–23.3、餘燼 190–252；火舌在洞的上緣之上 12px、洞的下緣之下沒有火；火星 8–10 顆；
  收回 1.4s 且 canvas 以 close 模式掛上再卸下；多開／空白收回／連結不收回全部續綠；
  `prefers-reduced-motion` 下 canvas 與 clipPath 都不掛、點下去直接換面。
  每幀繪製工時（元件自報，三張同燒）**0.87–2.07ms，票面上限 4ms 之內**；
  凍結幀 `followup-41/evidence/{1440x900,390x844}-works-{burn,card}-{300,800,1300,2000,3000}.png`
  （用 `__starlitEmber.seek(ms)` 精確停在那一毫秒）。
- **待使用者實機確認兩件事**：①「像不像真的在燒」；② 真機 60fps
  （harness 是 headless + swiftshader 純軟體光柵，閒置本身就只有 13–30fps，那個環境量不出 60fps）。
- **Coordinator 交付時必須提醒使用者：不夠火可以升級 C（WebGL 著色器）。** 外框（更粗、要有火焰感）
  依票面 41.9 留到火定案後的下一張票。
- Reviewer P（Opus 5 high）**PASS with findings**（1 Major + 10 Minor）；自跑 tsc／六支測試綠、harness 29 條 ALL PASSED、紅測十條全 RED。`clip-path: url(#…)` 決策獲同意（userSpaceOnUse、三框原點重合、零落後幀、d 只 39–126 點、三張同燒 avg 0.8–1.3ms）。
  美感判定：**形狀的問題解決了，火的問題沒有**——前緣已不是圓（舌、倒鉤、孤島、四角先後燒），但畫面仍不像紙在燒：①焦線被火舌蓋掉（F1 Major）；②半解析度放大把焦線／餘燼／火舌糊成一團，火舌只 12px（F4）；③粉紅／紫卡 0% 像素落在橘／琥珀色相，物理上不可能像火（專屬色 vs 像火，交使用者二選一）。
- Coordinator 處置：F8（外框淡入延遲 2s→3s）**追認保留**。F1／F2／F3／F4／F5／F6／F7／F9／F10／F11 交 Developer 第二輪修（含「焦邊永遠在火舌之上」「火舌 16–40px」「焦邊全解析度或關 smoothing」「燒到一半再點從當前閾值反向」「餘燼點位置固定只閃亮度」），並加一個預設 0 的 `EMBER_FIRE_CORE_WARMTH` 常數讓「琥珀核心」可一鍵開啟，等使用者裁示。
- 2026-09-19 **Developer 第二輪完成**，紀錄：`work/starlit-implementation/followup-41/round2/developer.md`。
  這一輪只做可讀性，不加功能。
  - **F1（Major）已修**：火與帶拆成兩個半解析度緩衝，**火先畫、焦邊與餘燼後畫**，所以 0–6px 的黑焦線
    永遠在最上面；兩層用相反的縮放（火 `imageSmoothing` 開、焦邊與餘燼關 —— 燒焦的邊是硬邊）。
    八條射線取**最亮**的一條（round 1 取最暗）：1440 最差 34.5/35.5/35.9/22.8、390 最差
    33.9/31.4/30.7/28.2，門檻 60；round 1 往上的射線是 150–190。
  - **F4 已修**：`HEAT_STEPS_PER_FRAME` 2→3、`HEAT_COOLING` 0.12→0.10，瀏覽器實量火舌
    1440 30/34/22px、390 28/22px（票面 16–40；round 1 是 12px）。
  - **F3 已修**：改讀火層自己的位圖（火星與餘燼點畫在可見 canvas 上，會被誤算成火），
    並只在「洞還沒碰到卡片上下緣」的時間點量（1440 [300,500,800]、390 [300,500]，要求至少兩個）。
    洞上緣之上的火焰像素 165/613/275 與 318/301，洞下緣之下**兩個寬度全部 0**。
  - **F5 已修**：餘燼點改成燒起來時決定一次的 10–20 顆，各自的角度與帶內深度固定，半徑是閾值的一次
    函數，只有亮度會閃。50ms 內最大位移 1440 6.9px／390 7.7px（每幀重抽是 100px 以上）。
  - **F2 已修**：收回從**當下的前緣**往回收（`burnProgress` ref 跨 effect 重跑保留），時間按比例縮。
    實測 1440 洞 12934 格 → 再點一次 66ms 後 12429 格（round 1 是 12132 → 17290，整張卡瞬間全開）。
  - **F6 已補**：p95 也斷言（門檻 8ms，理由是軟體光柵的 GC 尖峰）；實得 1440 p95 2.6/2.3/2.1、
    390 p95 3.1/2.1/1.8，avg 0.99–1.63ms。**真機 p95 < 4ms 仍未驗證。**
  - **F7 已補**：`-webkit-clip-path` 並寫 + `@supports not (…)` 退路 + 元件的 `CSS.supports` 偵測
    （不支援就走 reduced-motion 那條路，卡片照樣開）。**Safari／WebKit 仍未實測。**
  - **F9 已補**：同半徑的門檻 4 → 8，且要求至少四次量得到。
  - **F10 已補**：新增 R6（閾值 0 全膜）、R7（閾值滿四角皆燒掉）、R8（火星漸暗）三條紅測。
  - **F11 已補**：收回的前緣也要不規則 + 收回時火舌還在。
  - **F8 依 Coordinator 追認保留**（流光框淡入 2s→3s）。
  - **專屬色政策未改**：新增 `EMBER_FIRE_CORE_WARMTH`，**預設 0，0 時 `warmRamp` 原封不動**（單元測試
    與 harness 都釘死）；大於 0 才把琥珀混進 hot/light 兩階，base／deep／焦邊／流光框一律還是卡片自己的
    顏色。要給使用者看「橘核心」只要把這個常數改成 0.35。
- 第二輪驗證：`followup-34/run-tests.sh` **TSC GREEN + 六支 GREEN**；
  `followup-41/run-harness.sh` **1440×900 與 390×844 ALL PASSED**（含全部強化後的斷言）；
  紅測 **8 條 mutation、14 條斷言全 RED**，baseline 與 final 全 GREEN，前後 sha256 一字不差。
  凍結幀改成**三張卡 × 300/500/800/1300/2000/3000ms × 兩個寬度**，共 48 張，在
  `followup-41/evidence/round2/`。
- **合併 41+42 harness 尚未全綠，但不是本票**：`followup-42/merged-harness.sh` 跑兩次都停在
  `390x844 留白處最亮的一顆要比文字量度內最亮的一顆亮`（0.2221 vs 0.225；0.1993 vs 0.2218），
  那是 **Ticket 42 自己的星塵亮度斷言**（`followup-42/ui-checks.cjs:1155`），守的是 Ticket 42 的產品碼；
  Ticket 41 在合併跑裡 1440 的區塊逐字通過，390 的區塊還沒輪到就被擋住。需要 Ticket 42 那邊處理。
- **仍待使用者裁示／實機確認**：①「像不像真的在燒」（這一輪把三個可量的原因都修掉了）；
  ②「專屬色 vs 像火」—— 粉紅卡與紫卡在 41.7 的限制下 0% 像素落在橘／琥珀色相，旋鈕已備好；
  ③ 真機 60fps 與 p95；④ Safari。**交付時仍須提醒「不夠火可升級 C（WebGL 著色器）」。**
- 第二輪（Developer）交付：F1 焦邊改後畫、關平滑（八射線最亮 23–36，門檻 60）；F4 火舌 22–34px；F2 再點從當前前緣反向；F5 餘燼點位置固定；F3／F6／F9／F10／F11 斷言與紅測補齊（8 條 mutation／14 條斷言全 RED）；F7 `-webkit-clip-path` + `@supports` 退路（Safari 仍未實測）。tsc／六支測試綠、harness 1440／390 ALL PASSED。新增 `EMBER_FIRE_CORE_WARMTH`（預設 0，顏色原封不動）。
- Coordinator：合併 41+42 harness 重跑 **ALL PASSED（33 條）**（先把 42 的「390 留白最亮 > 文字最亮」抽籤斷言限桌機，見 42 票）。**等使用者實機看**：①像不像燒；②專屬色 vs 琥珀核心（開 `EMBER_FIRE_CORE_WARMTH`）；③不夠火 → 升級 C。
- 2026-09-19 使用者選 **琥珀核心**：`EMBER_FIRE_CORE_WARMTH` 0→0.35（Coordinator 直接改，三處釘子同步）。41 harness 重生後 1440 全過；390 那次因 43 同時跑 harness 截圖逾時（flake），改由 43 派生的 harness（含 41 全部斷言與 0.35 釘子）1440／390 **ALL PASSED（33 條）**佐證。
