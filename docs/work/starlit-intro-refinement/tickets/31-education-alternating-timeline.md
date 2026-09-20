# 31 — 教育區改成交錯式時間軸（照參考站機制）

使用者於 2026-09-17 提出：「學歷那個跟我想像的不一樣，你看毛哥是怎麼做的，照他的風格去做，
那條線可能可以長一點」。

## 參考站實測（1440px viewport，`getComputedStyle` + `getBoundingClientRect` 實量）

<https://elvismao.com/zh-Hant/about/> 的教育區**不是左右兩欄並排**，是一條中央脊線加左右交錯：

| 元素 | 實測值 |
|---|---|
| `.education` 容器 | `position: relative`，w 1137、h 272 |
| `.education::before`（脊線） | `position: absolute`、`width: 1px`、**`height: 272.292px` = 整個區塊高度**、`left: 568.333px`（= 1137/2，正中央）、`background-image: linear-gradient(...)` 讓頭尾淡出 |
| 每一筆 `.school` | `position: relative`、w 1137、h 52，內含一個 w 536 的卡片，**左右交錯**（左欄 x=64、右欄 x=664） |
| `.school::after`（連接線） | `position: absolute`、**`width: 24px`、`height: 1px`**、`left: 568.333px`，靠 `linear-gradient(90deg, …)` 與 `linear-gradient(270deg, …)` 分出朝左或朝右 |
| 每筆內容 | `h3` 校名 18.72px/700 + `p` 年份 16px/400（兩行，所以列高 52px） |

**關鍵**：脊線長度等於整個區塊高度，一路到底；我們目前的短彗星是錯的。

## 我方現況

`/關於我` 的教育是左右兩個靜態欄，中間一段約 100px 的短彗星。三所學校沒有交錯，
連接線不存在，線也遠短於區塊高度。

## 核准需求

1. **改成交錯式時間軸。** 三筆由舊到新交錯排列：
   - 市立青溪國民中學 → **左**
   - 國立武陵高中 → **右**
   - 國立成功大學 光電科學與工程學系 → **左**

2. **中央彗星光跡拉到整塊高度。** 高度 = 教育區塊高度（等同參考站的 `height: 272.292px` 之於 `h: 272`），
   頭尾以漸層淡出溶進背景。

3. **保留微斜**（使用者 2026-09-17 再次確認：「保留微斜」）。參考站是純垂直，我們刻意不同。
   斜度要小到仍讀得出是一條中央脊線，不是對角線。

4. **每一筆要有一條短連接線**，從脊線伸向自己那一側（參考站是 24px×1px）。
   **因為脊線是斜的，每一筆的連接線起點 x 必須等於脊線在該列垂直中心的 x**，不能全部用同一個
   固定 x，否則會浮在半空中接不到線。這是本票最容易做錯的地方。

5. **每筆只有校名一行**（使用者裁示：不放年份、不放英文校名）。
   **不得自行編造就讀年份。**
   因為少了第二行，列高只有參考站的一半，區塊會變矮、線會變短——這與使用者要的「線可以長一點」相反。
   **所以要用列距把區塊拉高**：加大每一筆的上下留白，讓 1440 時教育區塊高度 **≥ 280px**
   （參考站是 272px）。實際列距由 Developer 依視覺平衡決定，但要滿足這個下限並在報告說明取值理由。

6. **窄螢幕（≤850px）降級**由 Developer 判斷並說明：交錯在 390 寬會讓每張卡只剩一半寬度。
   可以收成單欄＋脊線移到左側，或其他合理做法。不得橫向溢出、不得擠壓校名。

7. `prefers-reduced-motion: reduce` 時脊線與連接線**不得有任何動態**（靜態光跡可留）。

8. 純 CSS 或 inline SVG，**不新增圖檔、不新增依賴**。

## 範圍與限制

- 可動檔案：`components/starlit-shell.tsx`、`components/starlit-shell.css`、
  `components/starlit-shell.test.ts`、`lib/site-copy.ts`、`lib/site-copy.test.ts`。
- **只動教育區**。技能、得獎、標題區、照片、捲動顯現一律不動。
- 不動 `app/globals.css`、`app/layout.tsx`、`app/page.tsx`；不 commit／push／部署。
- 保留整個 dirty working tree，禁止 reset／clean／checkout 全檔／stash。
- **字體維持撤回後的狀態**：全站只有 `jfOpenHuninn`，不得引入任何外部字體或 preconnect。
  `components/starlit-shell.test.ts` 已有四個來源的防線與 12 條紅測，不得為了本票放寬。
- 不恢復貓娘、3D 奶茶、Ticket 17 的彗星入口、人物 3D 轉場。本票的彗星**只是教育區的脊線**。
- 全部指令在 WSL Ubuntu 執行。

## 驗證

- `./node_modules/.bin/tsc --noEmit`
- `node components/starlit-shell.test.ts`、`node lib/site-copy.test.ts`
- **回歸測試**（延續 Ticket 30-D.3 的做法，期望值硬編碼，不得從 CSS 反推），至少釘住：
  - 脊線高度 = 教育區塊高度（允許 1px 誤差）
  - 脊線斜度**非零**
  - 三筆的左右交錯順序是 左／右／左
  - 每一筆的連接線起點 x **落在脊線於該列的 x 上**（允許小誤差）
  - 教育區塊高度 ≥ 280px @1440
  - 校名不得含數字（防止日後有人補上編造的年份）
  每一條都要實跑紅測證明改壞會變紅。
- **量測證據**：`getComputedStyle` / `getBoundingClientRect` 實量，存 `followup-31/geometry.txt`。
- **實際 UI**：1440×900 與 390×844，中／英各一次，外加 reduced-motion 兩個寬度。
  開場用滾輪逐段前進（每段播完才前進，每次前進後等 5 秒）→「/我的專案」→ header「/關於我」。
- **未回歸**：開場六段、技能、得獎、標題區、照片、`/我的作品`、`/聯絡資訊`、Language、品牌重播。

## 交付狀態

2026-09-17：完成。Developer（Opus 5）實作，紅測 9/9 全紅，幾何實量脊線高度 = 區塊高度（352px）、
斜度 4°、三筆 L/R/L、連接線起點與脊線差 ≤0.02px。Reviewer D（Opus 5 medium）覆核 **PASS，無 Findings**。
證據：`work/starlit-implementation/followup-31/`（`developer.md`、`geometry.txt`、`red-test.txt`、
`evidence/`、`review-D/review.md`）。未 commit／push／部署。
