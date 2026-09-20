# 42 — 星塵流 v2：分析為何「還沒有到很好」，提出改法（先討論）

使用者於 2026-09-19：
> 那個星辰流的部分，我覺得有讓現在比一開始好一點點，但我覺得效果還是沒有到很好。幫我分析為甚麼…背後的那個星辰流可以怎麼做得更好? 給我一些想法

## 狀態
**已核准**（2026-09-19）：五項全做，排在 Ticket 40 之後。導引光跡（B）已在 Ticket 40 拿掉。
本票不動任何程式碼，直到使用者核准方案。

## 分析（Coordinator，2026-09-19，使用者已看過）
1. 太少太暗：28 顆、0.6–1.6px、alpha 0.12–0.30，在近黑底上幾乎看不見。
2. 沒有前後層：景深 0.25–0.6 一小段，速度差不到 2.5 倍，捲動時看不出遠近。
3. 沒有生命：不閃爍、無偶發事件、靜止時等速下落，像灰塵不像星辰。
4. 範圍被文字綁住：canvas 只蓋文字欄，所以被壓到很暗；好看的位置其實是左右留白。
5. 「帶著你往下」沒有載體：反向視差只表達深度；光跡（原載體）使用者不喜歡，Ticket 40 已拿掉。

## 核准需求（使用者：「好 照你說的去做做看」— 五項全做）
1. **三層景深**：遠層約 40 顆（極小 0.4–0.8px、alpha 0.08–0.16、捲動係數約 0.15）；中層約 18 顆（0.8–1.4px、0.16–0.30、係數約 0.35）；
   近層 6–8 顆（1.6–2.4px、0.30–0.50、係數約 0.6、帶柔光暈 radial 2–3 倍半徑）。速度差拉到約 4 倍。
2. **微閃爍**：每顆有自己的相位與週期（3–8s），alpha 慢速正弦起伏 ±30%，永不超過該層上限。
3. **偶發流星**：每 6–12 秒（隨機）一顆短流星斜向下劃過（約 25–35° 偏離垂直、長 60–120px、0.35–0.5s、alpha 峰 0.35，頭亮尾淡）；
   捲動中機率提高（間隔縮到 2–4s）。這是「有東西帶著你往下」的載體。同時最多一顆。
4. **捲動拖尾**：捲動中近層（與中層減半）畫成沿速度方向的短線（長度 = 速度 × 約 40ms，上限 14px），停下隨阻尼收回成點。
5. **蓋滿整個內容視窗**（含左右留白、上下），不再只蓋文字欄；水平遮罩讓文字量度底下 alpha 乘 0.45、留白處 1.0，邊界柔化 ~60px。
   規則不變：**任何一顆都不得比文字亮**（文字量度內有效 alpha 上限 0.30）。
6. 沿用 37：只在 introComplete 後掛、reduced-motion 不掛、document.hidden 暫停、DPR／resize 正確、純 canvas 2D、無新依賴；純函式進 `lib/star-dust.ts` 可測。
7. 效能：三層合計 ≤ 70 顆 + 一顆流星，rAF 每幀 < 1.5ms（桌機）；用 A/B（掛／不掛）誠實量測，不重蹈 37 第一輪的錯誤量法。

## 範圍
`lib/star-dust.ts`、`lib/star-dust.test.ts`、`components/starlit-dust.tsx`、`components/starlit-shell.css`（canvas 定位改滿版）、`components/starlit-shell.tsx`（掛載 prop 若需）。
**排程：等 Ticket 40 完成（40 正在改同一批 dust 檔案，拿掉光跡）後再開工**，避免同檔衝突。Developer Opus 5 high，Reviewer Opus 5 high。

## 驗證
單元測試釘：三層數量與範圍、閃爍不超上限、流星間隔範圍與同時只一顆、拖尾長度上限、遮罩在文字量度內 ≤ 0.30；紅測各一；
harness 1440／390：canvas 蓋滿視窗、文字區取樣像素 alpha ≤ 0.30、留白區有較亮星、reduced-motion 無 canvas、A/B 幀時間；實機親眼看。

## 交付狀態
- 2026-09-19 Developer（Opus 5 high）實作完成，**七項全做**。紀錄：`work/starlit-implementation/followup-42/developer.md`
  （含 `ui-checks-run.txt`、`dust.txt`、`red-test.txt`、`perf-ab-{1440,390}.txt`、`evidence/`）。
  動到的產品檔：`lib/star-dust.ts`（重寫）、`lib/star-dust.test.ts`（重寫）、`components/starlit-dust.tsx`（重寫）、
  `components/starlit-dust.css`（只有檔頭註解）、`components/starlit-shell.test.ts`（檔尾新增 3119–3153 一段）。
  **`components/starlit-shell.tsx` 與 `components/starlit-shell.css` 一個字都沒動**——掛載那一行本來就是
  `{introComplete ? <StarlitDust scrollerId="starlit-content" /> : null}`，v2 不需要新 prop；這一層的樣式從
  Ticket 37 起就住在 `components/starlit-dust.css`（票面第 30 行寫成 shell.css，是筆誤）。
- 1. 三層景深：遠 40（0.4–0.8px / 0.08–0.16 / 係數 0.15 / 落 4–6）、中 18（0.8–1.4 / 0.16–0.30 / 0.35 / 7–11）、
  近 7（1.6–2.4 / 0.30–0.50 / 0.60 / 12–16 / radial 光暈 2.5× 半徑），合計 **65 顆（票面上限 70）**。
  速度差**正好 4.000 倍**（係數 0.60/0.15，落下 16/4），harness 實測捲動時景深比兩個寬度都是 4。
- 2. 微閃爍：每顆自己的相位與 3–8s 週期、±30% 正弦，上限用 `clamp` 鎖在該層 `maxAlpha`（結構上不可能超過）。
  harness 實測 53–57 / 65 顆在兩次取樣之間亮度有變。
- 3. 偶發流星：靜止 6–12s、**捲動中縮到 2–4s**（正在倒數的長間隔也會被剪短）、25–35°、60–120px、0.35–0.5s、
  半正弦峰值 0.35、同時最多一顆（單一格，結構保證）。390 實測 `gaps [4.77, 2.43, 2.18, 3.12, 2.93, 7.30]`
  ——捲動那幾段落在 2–4s、靜止那一段 7.3s。截圖 `evidence/1440x900-dust-meteor.png` 拍到亮著的流星。
- 4. 捲動拖尾：近層全長、中層減半、遠層不畫；長度＝速度×40ms、上限 14px；靠 `flow` 的阻尼自己收回成點。
  390 快捲實測近層 **13.68px**（幾乎頂到上限）、中 3.99、遠 0；放手 1.6–6.8 秒收回到 1.17–1.45px。
- 5. 蓋滿內容視窗：canvas 改蓋內容欄的 **padding box**（1440 從 830×810 變成 **960×810**、390 是 390×844），
  左右留白一起蓋進來且不壓到 3D 舞台（1440 canvas 左緣 479.98 ≥ 舞台右緣 480）。
  水平遮罩：文字量度內**每一顆都是 0.45**、留白 1.0、柔邊 60px（390 的留白只有 20px，柔邊夾成 20px，
  否則「留白處 1.0」在窄螢幕永遠不會發生）。**斜坡整條在量度外面**，所以量度的邊界像素也還是 0.45。
  硬規則實測：單顆最亮 0.225（=0.50×0.45）、**像素最大 68–73/255（上限 77/255）**。
  另外做了一層「像素疊加」防線（canvas alpha 會疊，近+中就會到 0.329）——見 developer.md 第 4 節。
- 6. 沿用 37：introComplete 才掛、reduced-motion **整層不掛**（兩個寬度實測 canvas 0 / layer 0）、
  `document.hidden` 暫停、DPR／resize（`dprUsed` 的修法保留）、純 canvas 2D、無新依賴。
- 7. 效能：幀內用 `performance.now()` 包住整個 rAF callback 量，**rAF 全部** mean 0.26–0.27ms / p95 0.5–0.7ms、
  **真的畫的那幾幀** mean 0.29–0.30ms / p95 0.5–0.8ms（1440 與 390），**票面的 1.5ms 達成**。
  誠實 A/B（唯一差別是元件掛不掛，`return null`，量完 cmp+sha256 還原；**什麼都沒有暫停**，
  不重蹈 37 第一輪把 3D 舞台一起停掉的錯）：1440 掛 2.41 / 不掛 2.61 / 還原 2.53 fps，
  390 掛 13.53 / 不掛 2.24 / 還原 2.63 fps——**同一臂內的抖動就比 A/B 之間大，結論是「量不到」**，
  可信的是幀內數字（這一層每秒的成本 ≈ 牆鐘的 0.075%）。
- 驗證：`followup-34/run-tests.sh` → **TSC GREEN + 六支全 GREEN**；
  harness `followup-42/ui-checks.cjs`（由 `patch-harness-42.mjs` 從 followup-40 anchor 派生）
  1440×900 與 390×844 **ALL PASSED（21 條 ok）**，含 reduced-motion 兩個寬度與舊首頁未回歸；
  紅測 **6 條全 RED 且逐條 `cmp` 還原、sha256 前後相同**（遮罩 1.0→像素 131/255、流星關掉、只剩一層、
  閃爍衝破上限、canvas 縮回 830、拖尾上限放掉）。
- **順手修掉 Ticket 40 Review F1（Minor）**：`components/starlit-dust.css` 第一行原本還寫著
  「Ticket 37 — 星塵流 + 導引光跡」，已改寫成現況（v2 三層／閃爍／拖尾／流星、光跡在 40.6 已整段移除）。
- **未完成的一步**：不帶旗標的完整 harness 還沒跑過綠的——Ticket 39 留下的火探針在 Ticket 41
  改到一半的 DOM 上會炸（`.starlit-ember-fire` 已被 `.starlit-ember-canvas` 取代，實機查證見
  developer.md 第 0 節），所以本票的 harness 數字都是用 `STARLIT_DUST_ONLY=1` 跑的（跑完全部星塵斷言後、
  在火的探針之前 return）。**Ticket 41 落地後請不帶旗標再跑一次。**
- **實機觀感未看**：好不好看只能請使用者在真機上確認（流星會不會太搶眼、近層 7 顆光暈會不會太大、
  留白變亮後整體會不會太吵）。這三件事各自是一個常數。
- 2026-09-19 Coordinator：41 落地後以合併 harness（`followup-42/merged/`，41 的 v4 火探針 + 42 的星塵斷言，不帶旗標）重跑：1440／390 **ALL PASSED（33 條）**，tsc／六支測試綠。Reviewer（Opus 5 high）審查中。
- Reviewer O（Opus 5 high）**PASS with findings**（九條 Minor／觀察，無 Major；七項需求皆有測試釘住；紅測六條以快照樹驗證全 RED；A/B 量法誠實）。Coordinator 處置：F4／F5（兩條註解寫錯）已直接改；F1／F2／F3／F6／F7／F8／F9 記錄，待使用者實機看過觀感後與常數調整一併處理（reviewer 觀感：流星偏淡、近層光暈偏弱、文字欄底下仍偏暗、390 星密度偏高；建議 `DUST_TEXT_MASK` 0.45→0.60 前先補 F3／F9 的每像素防線）。
- Coordinator：合併 harness 在 390 以 0.2221 vs 0.225 假紅於「留白最亮 > 文字最亮」（Review 42 F7：390 留白只 20px，這條在那裡是抽籤）→ 該斷言限 w≥851，重生 42 與合併 harness，**ALL PASSED（33 條）**。
- 2026-09-19 使用者：「目前我想要直接放棄這種星塵的背景」→ Ticket 43 整層移除。本票所有實作作廢，紀錄保留於 followup-37／followup-42。
