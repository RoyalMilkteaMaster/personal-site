# 29 — /關於我 個人檔案版型改版（毛哥式）

參考版型：<https://elvismao.com/zh-Hant/about/>
使用者於 2026-09-17 提出，經四項提問確認後定案。

## 核准需求

### 29-A 標題與文案結構（本票先做）

1. **標題區全部換掉。** 刪除現行 kicker「ABOUT ME」、h1「把好奇，／變成可能。」與 lead「嗨，我是林品宏。…」。
   改成毛哥式三行：
   - 主名（大字、粗、緊字距）：`皇家奶茶大師`
   - 英文副名（小、大寫、寬字距）：`ROYAL MILKTEA MASTER`
   - 一行自我定位（副標）：`熱愛 AI 與遊戲的夢想家`

   英文版對應：主名 `Royal Milktea Master`、副名 `PIN HUNG LIN`、副標 `A dreamer who loves AI and games.`
   （主名用頁面語言、副名用另一種書寫形式，與 header 既有 brandName／brandSub 一致。）

2. **技能區改成兩塊、去掉膠囊改成直列清單。**
   - 塊一 `專業` / `Expertise`：全端開發、AI Agents 開發、Multi-Agents 協作系統、Python 自動化開發、資料分析與視覺化、遊戲企劃、劇本創作
   - 塊二 `程式語言與應用` / `Languages & tools`：Python、JavaScript、HTML／CSS、Git、MySQL、NumPy、pandas、YOLO、CLI Bridge、Blender、ComfyUI、SMPL-X、VPoser
   - 版型：小標題「技能 SKILLS」+ 整條細分隔線，線下兩欄（桌面），每欄上方是欄標題、下方是逐行列出的項目。窄螢幕收成單欄。
   - 使用者貼的【基礎與專案應用技術】五類長清單**不顯示在網頁上**，只作背景理解。

3. **「歷程 JOURNEY」整塊換成「教育 EDUCATION」。** 三筆，由舊到新：
   - 市立青溪國民中學 / Qingxi Municipal Junior High School
   - 國立武陵高中 / National Wuling Senior High School
   - 國立成功大學 光電科學與工程學系 / National Cheng Kung University — Department of Photonics Science and Engineering

   使用者未提供就讀年份，**不得自行編造年份**；先只列校名。既有 timeline 的 2024／跨域經驗／現在三筆敘述一併移除。

4. **得獎區內容不變**（2026 雲湧智生黑客松 — 智慧交易冠軍 ✧ ／ 2026 台灣未來祭 — AI 創意科技優勝 · AI 綜合第四），只跟著新版型調整外觀：年份當左側標記、✧ 維持右側。

5. 字體沿用站上既有 `jfOpenHuninn`，不得引入新字型或新依賴。顏色沿用既有 `--starlit-*` token。

### 29-B 右上角個人照（待使用者提供檔案後再做，不在 29-A 範圍）

裁切保留「使用者本人 + 貓」，去掉另一人的手臂、牆上彩繪與貓圖案桌布；壓暗降飽和調成星空色調，左側／下側以漸層 mask 融入 `--starlit-bg`；放在 /關於我 內容區右上、向右出血。

## 範圍與限制

- 只改 `/starlit-full-preview` 的 `/關於我` 分頁：`lib/site-copy.ts`、`components/starlit-shell.tsx`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`。
- 不動開場閱讀流程、粒子人物舞台、header 分頁、Language、品牌重播、`/我的作品`、`/聯絡資訊`。
- 不動 `app/page.tsx` 正式首頁，不 commit、不 push、不部署。
- 保留整個 dirty working tree，禁止 reset／clean／checkout 全檔。
- 不恢復貓娘、3D 奶茶、彗星、人物 3D 轉場等延期項目。
- 不新增 npm 依賴。桌面畫面優先，但窄螢幕不得橫向溢出。
- 全部指令在 WSL Ubuntu 執行。

## 驗證

- TypeScript 型別檢查（專案既有指令）
- 定向測試：`components/starlit-shell.test.ts` 與 `lib/site-copy.test.ts`（若有語言對齊斷言需同步更新）
- 實際 UI：1440×900 與 390×844，中／英兩語都走一次 /關於我，截圖為證。
- 確認 `/我的作品`、`/聯絡資訊`、開場、品牌重播皆未回歸。

## 2026-09-17 追加決定（Review A 之後，使用者裁示）

1. **區塊順序改為「技能 → 教育 → 得獎」**，與使用者原始訊息的敘述順序及參考站一致。
2. **英文版主名維持 `Royal Milktea Master` / 副名 `PIN HUNG LIN`**，不因與 header 品牌重複而更動。
3. **29-B 照片版位：向右出血、與標題齊高。** 貼齊內容區右緣並裁切出血，高度大致包住三行標題，左緣以漸層融入背景。
4. 採納 Review A 的 MINOR-1：把技能 20 項與兩筆得獎的文字用**硬編碼**斷言釘住（不得從 `SITE_COPY` 自我迭代），改壞一個字要能讓測試變紅。
5. 採納 Review A 的 NIT-1：三個 `list-style:none` 的 `<ul>` 補 `role="list"`。
6. 不處理：NIT-2（`.starlit-about-name-sub` 用 Arial，與既有拉丁小字標籤慣例一致）、英文系所名在 390 寬折三行（不自行縮寫官方系所名）。

## 交付狀態

- 2026-09-17：29-A 實作與 Review A 完成，結論 PASS with findings，無 Blocker。
  MAJOR-1 已由 Coordinator 釐清並關閉，見 `work/starlit-implementation/followup-29/coordinator-note.md`。
- 進行中：29-A 收尾（順序、MINOR-1、NIT-1）與 29-B 照片整合。
