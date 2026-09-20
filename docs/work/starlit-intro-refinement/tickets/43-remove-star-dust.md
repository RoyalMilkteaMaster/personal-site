# 43 — 拿掉星塵流背景（Ticket 37／42 整層移除）

使用者於 2026-09-19：「目前我想要直接放棄這種星塵的背景」。改用鼠標漸亮效果（Ticket 44，另議）。

## 核准需求
1. 整層移除：`components/starlit-dust.tsx`、`components/starlit-dust.css`、`lib/star-dust.ts`、`lib/star-dust.test.ts` 刪除；
   `components/starlit-shell.tsx` 的 import 與 `<StarlitDust …/>` 掛載行刪除；shell 內若有為它而設的 CSS 變數／class 一併清乾淨，不留死碼。
2. `components/starlit-shell.test.ts` 的星塵段落改為反向釘子（頁面上不得有 `canvas.starlit-dust`／星塵層；原始碼不得再 import starlit-dust）。
3. `work/starlit-implementation/followup-34/run-tests.sh` 測試清單移除 `lib/star-dust.test.ts`。
4. harness：從 `followup-42/merged/ui-checks.cjs`（41+42 合併版，目前 33 條 ALL PASSED）派生 `followup-43/`，拿掉 Ticket 42 的星塵區塊與 reduced-motion 星塵釘子，改為「星塵層不存在」的釘子；Ticket 41 火與 Ticket 40 版面的斷言全部保留。
5. 開場、About、Contact、作品區（火）、`app/page.tsx`、`lib/projects.ts` 不動。不 commit／push；只用 WSL；無新依賴。

## 驗證
tsc、`run-tests.sh` 全綠；harness 1440／390 ALL PASSED；紅測 2 條（掛載行加回去 → 反向釘子紅；import 加回去 → 原始碼釘子紅）；
效能：拿掉後不需 A/B。

## 交付狀態
- 開票 2026-09-19，Developer（Opus 5 high）實作，Reviewer（Opus 5 high）一位。
- 2026-09-19 Developer 實作完成，**Ready for Review**。交付文件
  `work/starlit-implementation/followup-43/developer.md`。
  - 刪除：`components/starlit-dust.tsx`、`components/starlit-dust.css`、`lib/star-dust.ts`、
    `lib/star-dust.test.ts`。
  - 改動：`components/starlit-shell.tsx`（原 61 行 import、原 2259 行掛載行各刪一行；shell CSS
    本來就沒有為星塵開過變數／class，`scrollerId` 隨掛載行消失）、
    `components/starlit-shell.test.ts`（原 3164–3198 的 Ticket 42.6 正向釘子 →
    3164–3214 的三條反向釘子：markup／原始碼／檔案存在）、
    `work/starlit-implementation/followup-34/run-tests.sh`（測試清單六支 → 五支）。
  - 產品碼掃描 `grep -rn "star-dust\|starlit-dust\|StarlitDust" components lib app` 只剩反向釘子
    自己念出的字串，其餘 0 命中；`work/`、`docs/` 的歷史照票面保留。
  - harness `followup-43/ui-checks.cjs`（由 `followup-43/patch-harness-43.mjs` 從
    `followup-42/merged/ui-checks.cjs` anchor-based 派生，含「琥珀核心 0.35」來源 guard）：
    1440×900 + 390×844 **ALL PASSED，33 條 ok**；Ticket 41／40 的斷言逐 hunk 比對確認未動。
  - 紅測 3 條（`followup-43/red-test.sh`）：掛載行+import+會畫的 stub → markup 釘子紅；
    掛載行+import+回 null 的 stub → 原始碼釘子紅；空的 `starlit-dust.tsx` → 檔案釘子紅。
    全部真 AssertionError，shell sha256 前後一致。
  - `bash work/starlit-implementation/followup-34/run-tests.sh`：TSC GREEN + 五支 GREEN。
  - 未驗證：效能 A/B 未跑（票面明示不需要）。
- Developer 交付：四檔刪除、掛載行與 import 刪除、反向釘子三條、run-tests 五支綠、harness 1440／390 ALL PASSED（33）、紅測 3/3。Reviewer（Opus 5 high）審查中。
- Reviewer Q（Opus 5 high）**PASS with findings**：四檔刪除、產品碼零殘留、行尾未混、tsc／五支測試綠、harness diff 只刪星塵量測、warmth 0.35 釘子原封、三分頁×兩寬度無殘留空塊與錯誤、幾何檔逐位元相同（無版面位移）、紅測三條真紅。F1（reviewer 無法獨立重現 33 條 ALL PASSED——44／46 同時在寫同一棵樹、同一個 5173 在跑 harness；43 自己的釘子皆過）→ 等樹靜下來由 44／45 派生 harness 收尾；F2（40.6 光跡釘子隨星塵區塊消失，developer.md 說法不精確）記錄；F3（followup-37/run-tests.sh 仍列已刪測試）Coordinator 已改。**結票。**
- 合併 harness（followup-44/merged）ALL PASSED 47 條，含 43 的無星塵釘子。**結票。**
