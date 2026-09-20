# 39 — /我的作品 星火格 v2 → v3：薄膜被燒穿、專屬色、大圖示

## v3（2026-09-18 第二次回饋後，本版為準）

### 使用者原話
> 現在的火沒有那種火的感覺 他感覺不是在燒 他只是在往外而已。
> 外圍不是所有都同樣這樣的配色。如果這格燒的時候是用金色燒，那他的框也是金色，不過是不同的金在流轉的感覺。每一格有他專屬的顏色。
> 火燒的應該沒有現在這麼快。
> 我要的是現在上面的這層(專案名跟ICON)是個薄膜，被火燒掉後，跑出裡面的介紹跟 github youtube 連結的感覺。
> 我的 ICON 應該要大一點 像毛哥那種比例。
> 之後還會提供其他專案，就自動套上這些顏色（金、亮紫、亮藍、亮粉紅、亮靛、亮黃…）。

### 心智模型（v2 做錯的地方）
v2 是「燒開面從中心長出來」。v3 是「**關閉面是一層膜，膜被燒穿**」：底下的簡介與連結本來就在、不動；
動的是上面那層膜——從中心被燒出一個洞，洞緣是火，洞擴到整張膜燒光。

### 核准需求
1. **膜（關閉面）**：大圖示（約卡片寬 1/4，lucide `size` 64–72）＋名稱＋角落「01 / 類別」。位於最上層。
2. **燒穿**：膜用 `mask-image: radial-gradient(circle, transparent var(--hole), #000 …)` 做洞，`@property --hole` 由 0 動到蓋滿（約 **1.8s**）；
   火帶是獨立一層，環繞在 `--hole` 半徑上，用 SVG `feTurbulence + feDisplacementMap` 把邊緣扭成火舌、seed 隨時間變化讓它抖；
   兩層火帶反向慢轉；燒的過程甩出 8–12 顆火星往外飛、漸暗；燒完火帶再停留 ~0.5s 淡掉。
3. **專屬色**：`EMBER_TINTS`（shell）：`market-council` 金、`cb` 亮粉紅、`milktea` 亮紫；**未指定的專案依序從色池領**
   （色池：金、亮紫、亮藍、亮粉紅、亮靛、亮黃、白熱…由使用者列的星點色組成）。
   火 = 專屬色三個明度（白熱核心 → 本色 → 深色外緣）；**流光框 = 專屬色四個明度**的 conic 漸層轉動（7s），不是七彩。
4. **收回**：反向——膜從外緣長回來把簡介蓋住（~1.2s），火在洞緣。可多張同開；再點同一張收回；點膜以外的空白處也收回，連結圖示不收回。
5. 三張同高（每排自動等於最長簡介高度）；≤850px 單欄。
6. `prefers-reduced-motion`：直接切換，無火、框靜止。
7. a11y：膜是 `<button aria-expanded aria-controls>`；底下簡介 `role=region`；連結 Tab 得到；Enter／Space 開合。
8. 效能：SVG 濾鏡只在燒的期間掛上（`data-burning`），燒完移除；使用者實機確認順暢，若不順退到「只抖不位移」備案。

### 範圍
`components/starlit-shell.tsx`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`；SVG 濾鏡定義 inline 於 shell。不動 `lib/projects.ts`。
**與 Ticket 37 並行**：37 只動新檔 `components/starlit-dust.*`、`lib/star-dust.*` 及 shell.tsx 內指定的一行掛載點。

### 驗證
tsc／測試；紅測（膜起始就有洞、火不在燒穿期間播放、專屬色對錯、色池自動領色、一次只開一張回來、連結進 button）；
harness：點擊後 300ms 洞半徑 > 0 且火 opacity > 0.5、1.8s 後膜 mask 全透、框 `--ember-angle` 在轉且 conic 只含專屬色系；390 單欄；實機親眼看「像燒」。

## v2（已被 v3 取代，保留紀錄）
v2 做成「燒開面從中心 clip-path circle 長出＋七彩火環＋七彩流光框」。Review K：版面／a11y／多開全過，但火在真實點擊時沒播（動畫在膜還關著時已播完）、火落後於揭露邊、不像燒。
使用者看後定義了 v3 的心智模型。v2 的證據在 `work/starlit-implementation/followup-39/`。

## 交付狀態
- 2026-09-18 v3 實作完成：tsc／四支測試綠、紅測 10/10、harness 1440×900 全過（燒穿時序、火與濾鏡只在燒的期間、專屬色框、雙開、空白收回、連結不收回）。
  節奏修正（closest-side 基準、0→150%、2.2s ease-in-out、膜染專屬色）後 **1440 與 390 harness 皆 ALL PASSED（27）**——
  時序改以暫停動畫設 currentTime 量測，與機器 fps 無關。凍結幀 `evidence/*-works-burn-{300,700,1100,1600}.png`。
  紀錄：`work/starlit-implementation/followup-39/coordinator-work-v3.md`。
- Reviewer L（Opus 5 medium）**PASS with findings**：「像膜被燒穿」成立；F1（390 四角燒不完）、F2（火舌不足）、F3（前 350ms 無回饋）。
  處置：終點 185%→複驗後再推到 **195%**（390 半對角 176.8% 留 12% 以上餘裕）、位移 60／三 octave／blur 0.8、洞從 4% 起步、線性 2.2s。
  Reviewer L 定向複驗：**三條已解**（150ms 洞 16%、1000ms 洞緣明顯撕裂與火舌、2.5s 後角落小字消失），速度「剛好」。
  最終 harness 1440／390 ALL PASSED、紅測 10/10。**結票。** 火的最終觀感待使用者實機確認。
