# Ticket 05 — 移除 LinkedIn 入口（指標）

**最終報告** `/mnt/c/starlit-work/starlit-implementation/effects-portfolio-20260919/ticket-05/report.md`
**移除前快照** 同目錄 `removal-baseline/`
**移除後實機證據** 同目錄 `removal-browser-evidence.md`
**歷史（已撤回的 authwall 查驗）** 同目錄 `history-report.md`、`browser-evidence.md`，保留未刪

## 結論（與最終報告一致）

使用者 2026-09-19 實作中修訂：「算了 直接改成把 linkedin 拿掉好了」。原可達性查驗撤回，authwall 不再是阻擋。

- **已移除**：`STARLIT_SOCIAL` 的 linkedin 條目、`SOCIAL_ICON` 只為它存在的 SVG path、`StarlitSocialList` 的 handle 語言分支與已無用的 `language` prop（含呼叫點）、`site-copy.ts` 的 `linkedinHandle` 型別與中英文兩個值、測試中 LinkedIn 專屬斷言。
- **保留**：GitHub、Instagram、Email 的名稱、目的地、`target="_blank" rel="noreferrer"`／mailto 不開新分頁、可及性標籤一律未變；不新增替代社群。
- **新增行為釘子**：中英文聯絡頁／頁尾的 render markup 皆不得出現 LinkedIn 或其 handle；原始碼不得殘留 LinkedIn（比照既有 Facebook 掃描）。「外部連結開新分頁」釘子改綁 Instagram，覆蓋不降級。
- **驗收**：`node components/starlit-shell.test.ts` 0、`node lib/site-copy.test.ts` 0、`tsc --noEmit` 0。紅測：加回 LinkedIn 條目 → AssertionError，還原後 sha256 byte-for-byte 相同。
- **AC6 已由 Coordinator 實機確認**（`removal-browser-evidence.md`）：中英文 Contact 與 footer 都只剩 GitHub／Instagram／Email 三項、無 LinkedIn 也無其 handle；實點英文 GitHub 開新分頁到 `https://github.com/RoyalMilkteaMaster` 本人帳號。證據與實作一致，無矛盾。
- **三方結論**：Developer 完成；Reviewer A 無 Finding 通過；Reviewer B 無阻擋 Finding 通過，僅一項非阻擋建議（Facebook／LinkedIn 兩個殘留掃描迴圈可合併）——**明確延期**，待 01／02／03 收斂、共享測試檔穩定後併入一次整理，避免持續衝突。
- **完成判定由 Coordinator 作出，本票不自我核准。**
