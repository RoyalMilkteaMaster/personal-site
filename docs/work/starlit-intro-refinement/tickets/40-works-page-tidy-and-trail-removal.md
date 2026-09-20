# 40 — /我的作品 零碎修整（開啟面保留小圖示＋名稱、連結一左一右、拿掉標籤／GitHub 連結／標題改字）＋ 拿掉導引光跡

使用者於 2026-09-19 實機看過 Ticket 39 v3 與 Ticket 37 後提出。本票只收「簡單、可直接做」的項目；
火的重做在 Ticket 41、星塵流的改良在 Ticket 42（兩者先討論再動手）。

## 使用者原話（節錄）
> 3. 現在點進去後。我要像截圖1那樣，上面還是有個縮小版的 icon 和專案名 下面介紹
> 4. 截圖二 我想要我的圖標的位置是一左一右 不要並在一起 要是只有一個才放左邊
> 5. 這些多 agents 系統的標籤拿掉
> 6. 截圖4 探索我的 github 拿掉。
> 7. 截圖5 的地方拿掉，改成 Royal Miltea Master's / Project Base
> 8. …右邊有一條東西 我沒有很喜歡。幫我把他修掉。

## 核准需求
1. **開啟面版面**：燒穿後露出的 `.starlit-ember-open` 最上方一列 = **縮小的專案圖示（約 22–26px，同一顆 lucide）＋專案名稱**（水平並排，名稱粗一點），
   下方才是簡介，最下方是連結列。三張同高規則不變；390 單欄不變。
2. **連結列**：`.starlit-work-links` 改 `justify-content: space-between`：兩個連結時一左一右；**只有一個時靠左**（不置中、不靠右）。
3. **拿掉膜上的「01 / 類別」標籤**（`starlit-kicker` 那個 span）。Ticket 28 的「01 02 03」釘子若因此失效，改寫測試，不保留標籤。
4. **拿掉作品頁底部的「探索我的 GitHub」文字連結**（`t.works.github`）；中英文兩份 copy 一起清掉，`site-copy.test.ts` 同步。
5. **作品頁標題區**：拿掉 `SELECTED & ONGOING` 小標與 lead 句；`<h1>` 改成兩行 **「Royal Milktea Master's」／「Project Base」**（中英文版相同，第二行沿用 `<em>` 金色）。
   > 使用者原文打「Miltea」，Coordinator 判斷為 Milktea 之筆誤（站名 皇家奶茶大師 = Royal Milktea Master），已向使用者標明；**使用者 2026-09-19 確認是筆誤，Milktea 為準。**
6. **拿掉導引光跡（Ticket 37 B）**：`components/starlit-dust.tsx` 不再畫光跡與光點；`lib/star-dust.ts` 的 `TRAIL_*`／`trailProgress`／`trailPoint` 與其測試一併移除（不留死碼）；
   `scrollerId` 若只為光跡進度而存在也可移除，但**捲動反向流**（37.3）仍需要捲動位置——保留該部分。Ticket 37 F4 因此作廢。

## 範圍
`components/starlit-shell.tsx`、`components/starlit-shell.css`、`components/starlit-shell.test.ts`、`lib/site-copy.ts`、`lib/site-copy.test.ts`、
`components/starlit-dust.tsx`、`lib/star-dust.ts`、`lib/star-dust.test.ts`。不動 `lib/projects.ts`、開場、About、Contact、火的 CSS（Ticket 41）。
不 commit／push／部署；只用 WSL Ubuntu 跑指令；不新增依賴。

## 驗證
`bash work/starlit-implementation/followup-34/run-tests.sh`（tsc + 五支測試）全綠；
harness：從 `work/starlit-implementation/followup-39/ui-checks.cjs` 派生 `followup-40/`（patch 腳本），1440／390：開啟面第一列含小圖示＋名稱、
連結列兩個時左右分開（第一個 left ≈ 容器 left、最後一個 right ≈ 容器 right）、一個時靠左；膜上無「01 /」；頁面無「探索我的 GitHub」；h1 兩行新字；canvas 仍在但無光跡（取樣右緣 30px 內像素全為背景色）；
紅測至少 3 條（連結 justify、標籤回來、光跡回來）。截圖存 `followup-40/evidence/`。

## 交付狀態
- 開票 2026-09-19，Developer（Opus 5 high）實作，Reviewer（Opus 5 high）一位。
- 2026-09-19 Developer 實作完成，六項全做：
  1. 開啟面新增頭列 `.starlit-ember-head`（同一顆 lucide `size={24}` + `.starlit-ember-head-name`），順序＝頭列 → 簡介 → 連結列；
     頭列圖示用自己的 class（`starlit-ember-head-icon`），不搶膜上 68px 的 `.starlit-ember-icon`；`role=region`／`aria-label`／點空白收回／連結在 button 外都保留；三張同高、390 單欄不變。
  2. `.starlit-ember-open .starlit-work-links` 加 `justify-content: space-between`；實測兩連結卡一左一右（誤差 0.0px），
     單連結卡靠左（右邊留 176.8px 空白），**單一 flex child 在 space-between 下確實落在左邊，已實機驗證**。
  3. 膜上 `starlit-kicker` span 與其 CSS 規則一併移除；Ticket 28/39 的「01 /」釘子改寫成「不存在」的釘子。
  4. 底部「探索我的 GitHub」文字連結、`works.github`（中英）、型別欄位、`.starlit-text-link` CSS 全部移除；測試同步。
  5. 作品頁 kicker 與 lead 移除，`works.title` = `Royal Milktea Master's`、`works.titleEm` = `Project Base`（中英同字），
     `works.kicker`／`works.lead` 鍵與型別一併刪（grep 過，站內其他地方沒有用到；`app/page.tsx` 的舊首頁有自己的字串，未動）。
  6. 導引光跡整段移除：`starlit-dust.tsx` 不再畫線與光點、不再記 `progress`（`metrics()` 收斂成 `scrollTop()`，因為只剩反向流要用捲動位置）；
     `lib/star-dust.ts` 的 `TRAIL_TILT_DEG`／`TRAIL_INSET`／`TRAIL_OPACITY`／`trailProgress`／`trailPoint` 與其測試刪除；星塵與 37.3 捲動反向流保留（harness 實測 28 顆仍在畫）。
     **Ticket 37 F4 因此作廢**（已寫入 Ticket 37 交付狀態）。
- 驗證：`followup-34/run-tests.sh` → TSC GREEN + 五支 GREEN；
  harness `followup-40/ui-checks.cjs`（由 `patch-harness-40.mjs` 從 followup-39 派生）1440×900 與 390×844 **ALL PASSED**，
  含 Ticket 39 v3 的燒穿時序全數續綠；紅測 5 條全 RED 且逐條 `cmp` 還原。
  紀錄：`work/starlit-implementation/followup-40/developer.md`、`ui-checks-run.txt`、`red-test.txt`、`evidence/`。
- 2026-09-19 Coordinator：Developer 交付（tsc／五支測試綠、harness 1440／390 ALL PASSED 29、紅測 5/5）；Reviewer（Opus 5 high）審查中。Ticket 41／42 同時開工。
- Reviewer N（Opus 5 high）**PASS with findings**（三條 Minor）：F1 `starlit-dust.css` 檔頭註解仍寫導引光跡 → 交 Ticket 42 Developer 順手改；F2 作品頁 h1 兩行間缺 `<br />`（textContent 黏在一起）→ 交 Ticket 41 Developer 順手補；F3 harness QUICK 模式照印 ALL PASSED → 記錄不處理（正式跑不用 QUICK）。Reviewer 未重跑紅測（會覆寫 41／42 正在編輯的檔案），以突變套快照方式驗證五條皆命中。**結票，F1／F2 由 41／42 交付時一併驗。**
