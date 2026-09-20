# 目前工作位置（2026-09-20）

- 主要專案：`D:/workstationD/personal-site`
- WSL Ubuntu：`/mnt/d/workstationD/personal-site`
- GitHub：`https://github.com/RoyalMilkteaMaster/personal-site`（私人儲存庫）
- Spec 與 Tickets：本專案內的 `docs/work/`；新工作一律在 D 槽進行。
- OneDrive 原專案只保留為遷移備份，不再作為後續編輯位置。
- 舊文件內的 C 槽／OneDrive 專案絕對路徑是歷史紀錄，執行時應改用以上新根目錄。
- 歷史大型模型試驗及驗收原始證據仍在 `C:/starlit-work/`，不屬於本次專案搬遷；產品執行不依賴這些資料。未來新證據請放本專案 `work/`（不提交 Git）。

## 開發

沿用 WSL Ubuntu 的開發環境：

```sh
cd /mnt/d/workstationD/personal-site
npm ci
npm run dev -- --host 0.0.0.0
```

完整預覽路徑為 `/starlit-full-preview`。已有其他預覽使用 5173 時，請以啟動輸出的實際連接埠為準。

## 此次保存的狀態

保存目前星空網站、月亮人物、雙語文案、奶茶杯及既有規格／票／報告。
手機載入與轉場效能、手機文字裁切、月亮恢復摸貓動作仍待後續處理，本次未實作。
使用者要求保留粒子數；WebGPU 仍處於討論／評估階段，未核准全面改寫。
目前外部手機預覽通道仍指向舊目錄啟動的 5173 服務；它不是正式部署，也不會自動跟隨 D 槽的後續修改。
