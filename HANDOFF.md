# 星空個人網站 — Claude 接手交接

更新日期：2026-09-17  
專案狀態：本機預覽持續精修中；未 commit、未 push、未部署、未替換正式首頁。

## 可直接貼給 Claude 的接手提示詞

```text
請接手「皇家奶茶大師」星空個人網站的後續精修。

$milktea-skills-implement

只使用 WSL Ubuntu 執行開發命令，不要改用 Windows shell 實作。

專案根目錄：
/mnt/c/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site

目前 Branch／SHA：
main
41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6

先讀取：
1. HANDOFF.md（本交接）
2. docs/work/starlit-intro-refinement/spec.md
3. docs/work/starlit-intro-refinement/completion-report.html
4. docs/work/starlit-intro-refinement/tickets/09-reading-and-flip.md 至 28-entry-header-tabs.md
5. work/starlit-implementation/approved-09-18/user-scope-update-2d.md
6. work/starlit-implementation/approved-09-18/final-coordinator-ui.md
7. work/starlit-implementation/followup-28/developer-v3.md
8. work/starlit-implementation/followup-28/recheck-A.md
9. work/starlit-implementation/followup-28/recheck-B.md
10. work/starlit-implementation/followup-28/consensus.md
11. work/starlit-implementation/followup-28/coordinator-ui.md

目前可看頁面：
http://localhost:5173/starlit-full-preview

若 5173 沒有服務，從專案根目錄使用：
CHOKIDAR_USEPOLLING=1 CHOKIDAR_INTERVAL=500 npm run dev -- --host 0.0.0.0 --port 5173

目前完成狀態：
- 09、10、11（含三姿態共用星空）、12-hidden、14-hidden、18 已依縮減後範圍完成並審查。
- 19–22、23、24、25、26、27、28 已完成並有 Developer、Reviewer A、Reviewer B 證據。
- Ticket 28 最終交付是 snapshot-v3／frozen-v3.sha256；三方已同意交付，沒有未關閉的阻擋或重要 Finding。
- 最新畫面：內容頁三分頁位於 Language 左側，精確為「/關於我」「/我的作品」「/聯絡資訊」；英文為「/About me」「/My work」「/Contact」。開場與結尾不顯示分頁。
- 從結尾進入內容時，人物舞台會在 1.25 秒內由滿版連續收束到左 1/3、右 2/3，不再一幀突然縮小。
- 「值得讓星空記下的事呢~」的金屬掃光為 2.1 秒。
- 手機開場已修回滿版；390×844、850×800、900×800、1707×735 的開場與內容狀態已有定向證據。
- 品牌重播會回開場並隱藏頂部分頁；鍵盤方向鍵＋Enter、語言切換保留目前章節均已驗證。

使用者主動延期／不要做的項目：
- 貓娘完整動畫與場景整合（13、14 原完整範圍）暫停；開頭貓娘目前隱藏。
- 人物新的 3D 首次轉場與六向轉場（15、16）不採用目前候選，維持既有 2D 粒子轉場。
- 17 的新彗星入口／新轉場控制延期，維持目前轉場。
- 所有 3D 奶茶目前從開頭、結尾與內容移除；素材保留，等使用者以後決定位置。
- 不要自行重啟 Blender、重做人物、加入貓娘、3D 奶茶或彗星，也不要因為舊 Ticket 原文而恢復這些功能。

目前仍待使用者觀感確認，不代表程式缺陷：
- 900px 寬進入內容時，最終人物會因既有相機取景公式比開場小約 39%；現在已是連續過渡，使用者需要實機看是否自然。
- 金屬掃光 2.1 秒、右上斜線分頁的大小與位置仍可由使用者繼續微調。
- 桌面畫面優先；不要為手機適配犧牲桌面構圖與細節。

重要範圍限制：
- 不要擴大已核准範圍。使用者提出新視覺修改時，先追加新 Ticket／Spec 紀錄，再實作與驗收。
- 不要重做已完成 Ticket；先看 completion-report 與該票最新 snapshot／review。
- 不要把 work/ 裡的舊候選、3D 模型或歷史實驗直接接回主預覽。
- 不要把 app/page.tsx 的正式首頁當成目前已完成成果；這輪成果在 /starlit-full-preview，尚未正式整合或部署。
- 保留整個 dirty working tree。不得 git reset --hard、git clean、checkout 全部檔案或覆蓋使用者未提交內容。
- personal-site 是實際 Git 倉庫；父層「奶茶流」也是另一個倉庫，Git 命令一定先 cd 到 personal-site。
- 未經使用者明確要求，不 commit、push、部署或修改線上站。

接手後先做：
1. 在 personal-site 執行 git status --short，確認 dirty tree，不清理。
2. 確認 http://localhost:5173/starlit-full-preview 可連線並實際走一次開場 → /我的專案 → 三分頁 → Language → 品牌重播。
3. 以 completion-report.html 與 followup-28/frozen-v3.sha256 為最近的交付基準。
4. 等使用者提出下一個具體視覺修改；把它寫成新的 Ticket，沿用 Opus 5 Developer＋兩位獨立 Reviewer 的流程。

不要只回報計畫；收到新修改後，要在核准範圍內完成實作、定向測試、實際 UI 驗證與審查，再交付使用者查看。
```

## 目前成果摘要

目前主線不是舊交接曾描述的固定相機／Blender 研究，而是已落地的 `starlit-full-preview`。截至 Ticket 28，網站具有完整的開場閱讀流程、三個 2D 粒子人物姿態、共用旋轉星空、雙語內容頁、深色奶茶色 Language 選單、回讀與品牌重播，以及內容頁右上分頁。

### 已完成並保留

- 開場文字依閱讀門檻逐段播放，讀完可左鍵／滾輪繼續，向上可返回並重播段落動畫。
- 自介分成「你好／我是 皇家奶茶大師」與三項身分；「我勇於追求」接技藝、自由、極限。
- 邀請文案、四行詩、金屬掃光、結尾左右排版已依最近指示更新。
- 圖一、圖二、圖三維持 2D 粒子重構；轉場時共用星空同步加速，人物底部與背景以遮罩／漸層減少割裂。
- 內容頁桌面為左人物 1/3、右內容 2/3；目前優先保留桌面效果。
- 分頁移到 Language 左側，數字 01／02／03 已從分頁膠囊移除，改為斜線前綴；作品列表內原本的 01／02／03 未被刪除。
- 3D 奶茶與開頭貓娘均不建立、不繪製，但原素材與舊候選仍保留在專案中。

### 延期且不可自行恢復

| 項目 | 狀態 |
|---|---|
| Ticket 13 貓娘動畫 | 使用者主動延期 |
| Ticket 14 原貓娘整合 | 原完整範圍延期；只有「開頭隱藏」補充已完成 |
| Ticket 15 人物首次 3D 轉場 | 候選品質未達要求，不採用 |
| Ticket 16 人物六向 3D 轉場 | 未啟動，維持 2D |
| Ticket 17 彗星與新轉場控制 | 使用者要求維持現況，延期 |
| 3D 奶茶展示 | 開頭、結尾、內容全數暫移除，素材保留 |

## 最近一次交付：Ticket 28 v3

最新固定成果位於：

- `work/starlit-implementation/followup-28/snapshot-v3/`
- `work/starlit-implementation/followup-28/frozen-v3.sha256`
- `work/starlit-implementation/followup-28/incremental-v3.diff`

Ticket 28 修改的產品檔為：

- `components/starlit-shell.tsx`
- `components/starlit-shell.css`
- `components/starlit-shell.test.ts`
- `lib/site-copy.ts`

驗證紀錄：

- `work/starlit-implementation/followup-28/v3-shell-test.txt`
- `work/starlit-implementation/followup-28/v3-site-copy-test.txt`
- `work/starlit-implementation/followup-28/v3-tsc.txt`
- `work/starlit-implementation/followup-28/v3-ui-checks-log.txt`
- `work/starlit-implementation/followup-28/coordinator-ui.md`
- `work/starlit-implementation/followup-28/recheck-A.md`
- `work/starlit-implementation/followup-28/recheck-B.md`
- `work/starlit-implementation/followup-28/consensus.md`

Ticket 28 的兩位 Reviewer 均 PASS，Developer 同意交付。曾發現的手機開場高度回歸已在 v3 修正並覆蓋測試。剩餘的 900px 過渡流暢度屬使用者實機觀感確認，不是未關閉 Finding。

## 工作樹與 Git

- 正確 Git 根目錄：`C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site`
- WSL 路徑：`/mnt/c/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site`
- Branch：`main`
- HEAD：`41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6`
- 工作樹包含大量既有修改與未追蹤成果，全部都要保留。
- 目前沒有為本輪成果建立 commit，也沒有 push／deploy。

接手時必須重新執行 `git status --short` 取得即時清單；不要把 HEAD 當成目前畫面，也不要使用破壞性 Git 指令。

## 預覽與驗收

主預覽：<http://localhost:5173/starlit-full-preview>

目前 5173 在本交接更新時回應 HTTP 200。若之後服務停止，使用 WSL：

```bash
cd "/mnt/c/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site"
CHOKIDAR_USEPOLLING=1 CHOKIDAR_INTERVAL=500 npm run dev -- --host 0.0.0.0 --port 5173
```

完成報告：

- `docs/work/starlit-intro-refinement/completion-report.html`

主要人工檢查路徑：

1. 完整走過開場各段，確認左鍵只在文字完成後前進。
2. 到結尾點「/我的專案」，觀察滿版人物連續收束到 1/3，而非一幀跳小。
3. 檢查 `/關於我`、`/我的作品`、`/聯絡資訊` 位於 Language 左側且只有一組。
4. 用方向鍵與 Enter 換頁。
5. 切英文後確認停留同章，分頁變成 `/About me`、`/My work`、`/Contact`。
6. 點品牌重播，確認分頁消失並回到滿版開場。
7. 特別看 900px 寬的進入過渡是否符合使用者主觀期待。

## 文件優先順序

若文件互相衝突，依下列順序判斷：

1. 使用者最新訊息與本交接的延期決定。
2. `docs/work/starlit-intro-refinement/spec.md` 最後追加內容。
3. Ticket 19–28 與 `completion-report.html` 的最新段落。
4. `approved-09-18/user-scope-update-2d.md`。
5. 舊 `CONTEXT.md`、`DESIGN.md`、Ticket 01–18 的原始構想與歷史研究。

舊文件可能仍描述貓娘、3D 奶茶、人物 GLB、六向 3D 或彗星為待實作功能；這些已被使用者後續指示延期，不可據此自行恢復。
