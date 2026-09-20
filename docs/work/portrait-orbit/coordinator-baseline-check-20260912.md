# 主站整合前檢查

此紀錄是既有 dirty working tree 的整合前基準，不是目前隔離人物候選或 A13／Ticket03 通過。主站尚未套用本輪 HC1／OH6。

- `npx --no-install tsc --noEmit --incremental false`：exit0。停用 incremental，避免改寫既有 tsconfig.tsbuildinfo。
- `node --experimental-strip-types --test lib/*.test.ts`：exit0，10 tests pass、0 fail、0 skipped，11.825秒。包含既有相機／intro／point pool／particle morph 等測試；其歷史形體參數不是目前候選的外觀證據。
- 未執行正式 build 或宣稱新候選網站整合／效能完成。後續實際主站變更後須重跑所需檢查與 build。
- 保留既有 app、lib、docs、public 等 tracked/untracked changes，未 reset 或清理。
