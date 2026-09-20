# 36 — /我的作品 改成「星火格」v1（三格一排、展開細節、GitHub／YouTube 圖示）

使用者於 2026-09-18 提出：喜歡參考站一格一專案的密度，不要流水帳；先用現有三個專案做一版看，
確定方向後再補專案。點格子**先展開細節**，細節裡放 GitHub 圖示連結、有影片的放 YouTube 圖示；
hover 要有特效，點下去要有「符合星火／神火」的效果。小票流程：Coordinator 實作，一位 Opus 5 medium Reviewer。

## 核准需求

### 版型
1. 作品列表改成 **grid，三欄一排**（桌面），每個專案一張卡。≤850px 收成單欄。
2. 卡片：深色（`--starlit-surface`）、1px `--starlit-line` 邊、圓角；內容由上到下：
   **星火**（左上，取代參考站的灰色圖示）→ 小字「01 / 類別」→ 標題 → 一句話 summary → 技術膠囊（沿用 `.starlit-skills`）。
3. 星火 = 一個 CSS 光點：`radial-gradient` 紫→金，與教育脊線同一套色，緩慢呼吸（4s）。

### 互動
4. **hover（未點）**：星火變亮變大、卡片上浮 2px、邊框轉金（約 40%）、星火後方一圈淡淡的光暈。
5. **點擊 = 點燃（神火）**：星火由紫金轉成金白、一圈光環從星火擴散出去（一次性 keyframe），卡片邊框全金；
   同時在**該排下方**展開一個橫跨整排的細節抽屜：detail 文字 + 連結列。
   一次只開一張；再點同一張關閉（星火退回紫金）。
6. 連結列：每個連結一個圖示按鈕 + 文字——`github.com` 用 GitHub 圖示、`youtube.com`／`youtu.be` 用 YouTube 圖示、
   其他用外連箭頭。圖示來自既有的 `lucide-react`，**不新增依賴**。`target="_blank" rel="noreferrer"`。
7. 卡片是 `<button aria-expanded aria-controls>`，抽屜是 `role="region"` 帶 `id`；連結不能放在 button 裡面。
   鍵盤 Enter／Space 可開合。
8. `prefers-reduced-motion: reduce`：呼吸、光環、上浮全部關掉，只保留狀態變化（顏色、邊框）。

### 保留
9. 「01 / 02 / 03」編號保留（Ticket 28 明文不刪）；`.starlit-skills` 膠囊仍用在作品頁；
   底部「探索我的 GitHub」文字連結保留。
10. 資料仍只有 `lib/projects.ts` 一個來源，**不改資料**，圖示種類由 URL 判斷。

## 範圍
可動：`components/starlit-shell.tsx`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`、
`lib/site-copy.ts`（若需要新字串，例如「收起」）。不動 /關於我、開場、字體、延期項目。不 commit／push／部署。

## 驗證
tsc、四支測試綠；紅測：抽屜開合狀態、aria-expanded、圖示判斷、一次只開一張 → 各紅；
UI harness（沿用 followup-33 複製改造，works 那段改成星火格）1440／390 中英；實機 hover 與點擊親眼看。

## 交付狀態
2026-09-18：v1 完成——tsc／四支測試綠、harness ALL PASSED（27）、紅測 7/7；Review I 的 F1（hover 放大被呼吸動畫蓋掉）、
F2（reduced-motion 永久金框）、F3（390 抽屜掉到畫面外）、F4（Tab 順序）、F5（role=list 混子元素）已修並由 harness 實測。
harness 在 390 連續三次逾時的根因是捲動顯現本身的缺陷，另開 Ticket 38 修好後不再逾時。
**使用者看過 v1 後提出 v2 方向（圖示＋名稱、點擊從中心燒開、同格顯示簡介與連結、流光火邊），由 Ticket 39 接手，本票不再單獨審查。**
