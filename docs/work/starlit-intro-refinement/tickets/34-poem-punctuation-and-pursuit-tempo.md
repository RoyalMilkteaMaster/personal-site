# 34 — 結尾四行詩標點 + 「我勇於追求」三詞輪轉加快

使用者於 2026-09-17 提出。小票：Coordinator 直接實作，一位 Opus 5 medium Reviewer 覆核。

## 核准需求

### 34-A 四行詩（中文，只改標點與一個字）

改成使用者給的原文，逐字：

```
我將星空收入掌，
我將靈感斟入觴。
我遂親手摘下神火，執炬先行，共聚星燭鑄天光。
-- 向死而生，循心而行；願此長旅，終抵群星。
```

與現行的差異：第 1 行「掌 ,」→「掌，」（全形、去空格）；第 3 行兩個空格改成全形逗號（「神火」維持——使用者 2026-09-17 確認「星火」是誤植）；
第 4 行加「-- 」前綴、空格改全形逗號、「;」改「；」。英文版不動。
`lib/site-copy.test.ts` 與 `lib/starlit-intro.test.ts` 釘住詩文的硬編碼期望值同步改成新原文。

### 34-B 「技藝／自由／極限」輪轉加快

使用者：「現在轉得有點太慢了，跟其他的比起來節奏有落差，讓他稍微快一點點」。
只縮短三個詞輪轉的時間，**幅度小**（約 20–25%），其他段落的閱讀門檻、顯字速度、回讀不動。
確切常數與新值記在 coordinator note。

## 範圍
- 可動：`lib/fantasy/starlit-intro.mjs`、`components/starlit-shell.tsx`（僅時間常數）、
  `lib/site-copy.test.ts`、`lib/starlit-intro.test.ts`、`components/starlit-shell.test.ts`（僅對應斷言）。
- 不動 /關於我、字體、任何延期項目。不 commit／push／部署。

## 驗證
tsc、`site-copy.test`、`starlit-intro.test`、`starlit-shell.test` 綠；紅測：詩文改回舊字／輪轉常數改回舊值各要變紅；
實機走一次開場，親眼看第三段輪轉節奏與結尾詩文。

## 交付狀態
2026-09-17：完成。Coordinator 直接實作；tsc 與四支測試綠、紅測 4/4 全紅。
Reviewer G（Opus 5 medium）**PASS with findings**：詩文逐字元 diff 無差異（md5 相同）；輪轉實測
lead→技藝 816ms、技藝停 1107ms、自由停 1047ms、整段 4.0s，主觀「收緊一點、不是被催著跑」。
F1 過期註解「five seconds」已改；F2 `run-tests.sh` 的 tsc 退出碼已補；
F3 已消解：使用者確認「星火」是誤植，改回「神火」，中英語意重新對齊。
證據：`work/starlit-implementation/followup-34/`。未 commit／push／部署。
