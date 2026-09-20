# 37 — 內容欄背景：星塵流 + 導引光跡（A+B），三個分頁共用

使用者於 2026-09-18 提出：想要 sitcon.org/2026 那種「有東西帶著你往下」的感覺，但不要那麼多、不能影響看字。
裁示：A（星塵流）+ B（淡導引光跡）先做一版；/關於我、/我的作品、/聯絡資訊都要有。
小票流程：Coordinator 實作，一位 Opus 5 medium Reviewer。

## 核准需求

### A 星塵流
1. 內容欄（`.starlit-content`）後面一層 `<canvas>`，`pointer-events: none`，永遠在文字之下。
2. 約 28 顆星塵，半徑 0.6–1.6px，opacity 0.12–0.30，顏色取 `--starlit-purple`／`--starlit-gold`／米白。
3. 平常緩慢往下飄（6–12 px/s）；**捲動時跟著捲動速度反向流過**（往下捲 → 星塵往上流，速度依各自景深 0.25–0.6 不同），
   停止捲動後速度阻尼回到平常。
4. 星塵只是背景，**任何一顆都不得比文字亮**：opacity 上限 0.30，不加 blur 光暈。

### B 導引光跡
5. 內容欄右緣（照片下方那條空白帶）一條**微斜 4°**、貫穿可視高度的細光跡，opacity 8–10%，色彩沿用教育脊線的紫→金漸層。
6. 光跡上有**一點光**，位置 = 捲動進度（`scrollTop / (scrollHeight − clientHeight)`），跟著你往下走；
   光點用教育脊線亮光的同一套視覺語彙（同漸層、小尺寸）。
7. 沒有可捲動空間時（內容比視窗短）光點停在頂端。

### 共同
8. 桌面時 `.starlit-content` 是自己的捲動容器、窄螢幕是 window 在捲——沿用 Ticket 30-C「執行時往上找真正在捲的祖先」，
   兩種情況都要實測。
9. 只在 `introComplete` 後掛載；三個分頁共用同一層（放在 `.starlit-content` 內、sticky 滿版）。開場不掛。
10. `requestAnimationFrame` 只在頁面可見時跑；`document.hidden` 時暫停；DPR 正確；resize 重算。
11. `prefers-reduced-motion: reduce`：**整層不掛載**。
12. 純 canvas 2D，**不新增依賴**。粒子與光點的純函式抽到 `lib/star-dust.ts`，可單元測試。

## 範圍
可動：`components/starlit-shell.tsx`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`、
新檔 `lib/star-dust.ts`、`lib/star-dust.test.ts`。不動開場、字體、延期項目；與 Ticket 17 延期的「彗星入口」無關。不 commit／push／部署。

## 驗證
tsc、測試綠；`star-dust.test.ts` 釘住：捲動反向、景深差異、阻尼、opacity 上限、進度→光點位置、無可捲空間停頂端；
紅測各一；UI harness 1440／390 中英 + reduced-motion（canvas 不存在）；實機捲動親眼看「不搶字、有東西在流、光點跟著走」。

## 交付狀態
- 2026-09-18 第一輪（Developer，Opus 5 medium）：功能完成，harness ALL PASSED；自報的「2.6 vs 48fps」效能結論後經第二輪證明是量測方法錯誤（把 3D 舞台一起暫停）。
- 2026-09-18 第二輪：星塵層搬出捲動容器（`position: fixed` 自行對位，`scrollerId` prop），誠實 A/B 差 2.6%；tsc、五支測試、紅測 12/12、harness ALL PASSED（35）。
  紀錄：`work/starlit-implementation/followup-37/`（`developer.md`、`round2/developer.md`、`coordinator-note.md`）。
- Reviewer M（Opus 5 medium）**PASS，無 Major**：星塵 alpha 0.122–0.278、光跡 0.082／0.090、景深比 2.29、阻尼 653→190→12→0、
  開場 canvas 0、reduced-motion 整層不掛、390 不撐高（scrollHeight A/B 相同）。
  F1（run-tests 未收錄 star-dust 測試）已補；F2（DPR 讀取在早退之後）已修；F4（光跡走在文字量度內而非右側空白帶）
  **待使用者裁示**是否推進 padding 區；F3／F5 記錄不處理。
- 2026-09-19：使用者實機看過後要求拿掉右緣那條導引光跡，**Ticket 40.6 已把 B（光跡＋光點）整段移除**
  （`TRAIL_*`／`trailProgress`／`trailPoint` 與其測試一併刪除），A 星塵流與 37.3 捲動反向流保留；**F4 因此作廢，不再需要裁示**。
