# 47 — /我的作品 卡片外框：更粗、有火焰舔邊（火定案後的下一步）— 待確認範圍

使用者原話（2026-09-19，看 v3／v4 時）：
> 現在我點下去之後 那個外面的框有點太細了，那個框也沒有火焰的感覺，雖然現在這樣也很好看，是個很好的方向。
> …先讓火更像真的火，我們再來調整外面那圈。

火已於 Ticket 45 v5.1 定案。現況：靜止時是 Ticket 44 的鼠標聚光邊框（1px）；燒開後是 Ticket 39 的專屬色 conic 流光框（3px，7s 轉動）。

## Coordinator 提案（待使用者拍板）
1. **粗度**：燒開後的流光框 3px → 5px；卡片圓角不變。
2. **火焰舔邊**：燒開期間（`data-lit`）用 Ticket 45 的同一套 WebGL 著色器多畫一條「沿卡片四邊往外舔的火」，厚 10–16px，火舌向上（重力方向固定），顏色 = 專屬色 + 琥珀核心 0.35；靜止時不畫、燒完不常駐（避免三張同開時 GPU 一直跑）—— 或改為「燒穿那 3 秒＋淡出 0.8 秒」期間才舔邊，之後只留流光框。
3. **層級**：舔邊火在卡片外側（`overflow: visible` 的獨立 canvas 或同一 canvas 擴 16px），不遮鄰卡文字；390 單欄時上下留白要夠。
4. 效能：沿用 45 的 context 預算與 capture 旗標；2D 退路只畫加粗流光框、不畫舔邊。

## 待使用者確認
- 舔邊火是「燒開後一直舔」還是「只在燒穿期間舔」？（我建議後者，省 GPU 也比較像「火燒過留下的餘光」。）
- 流光框 5px 夠不夠粗？

## 狀態
**2026-09-19 使用者：「粗度先到 5px 看看吧」→ 開工。**舔邊時機使用者未答，依 Coordinator 建議採「只在燒穿 3s＋淡出 0.8s 期間舔邊」（已向使用者標明，要改再改）。Developer Opus 5 high、Reviewer Opus 5 high。

## 交付狀態
**2026-09-19 Developer 完成，待 Review。** 交付紀錄：`C:\starlit-work\starlit-implementation\followup-47\developer.md`（證據與凍結畫面在同目錄 `evidence/`）。

動到的產品檔：`lib/ember-fire-gl.ts`、`components/starlit-shell.tsx`、`components/starlit-shell.css`，測試 `lib/ember-fire-gl.test.ts`、`components/starlit-shell.test.ts`。

做到的：
1. **粗度 3px → 5px**：`.starlit-ember::before` 往外 4px（圓角 20 → 24 同心）＋ Ticket 44-B 原本就有的內容內縮 1px。7s 轉動、專屬色階、燒開後才淡入都沒動。像素實量 1440 與 390 各三張卡、四邊全部 5px。
2. **舔邊火**：同一支 Ticket 45 的片段著色器，同一張 canvas（context 預算仍然 3）往外擴 20px，用卡片自己的圓角矩形距離場把「燒穿的火」關在裡面、「舔邊的火」關在外面。厚度中位數 上 16px／左右 9–11px／下 9–10px（票面 10–16），火舌向上（上緣一定高過下緣），最遠 17px 未碰畫布邊界。專屬色 ＋ 0.35 琥珀核心，三張卡色度互不相同。
3. **時機**：0.5s 淡入 → 燒穿 3.0s → 0.8s 淡出，3.8s 整歸零，之後只剩加粗的流光框；收回（close）完全不畫。
4. **版面**：桌機欄距 24px、390 單欄上下距 28px、格子 `margin-top` 30px（h1 與第一列卡片間距實測 30px）。卡片 `clip-path` 放到 `inset(-20px round 38px)`。火的畫布與鄰卡的框重疊 0 px²、鄰卡框裡 0 個火焰像素；兩個寬度都沒有橫向溢出。
5. **2D 退路**：canvas 沒有外擴（結構上就畫不出卡片外面的東西），舔邊火像素 0，流光框一樣 5px。reduced-motion 不掛 canvas，等於沒有舔邊火。

驗證：`run-tests.sh` TSC GREEN ＋ 七個 GREEN；`followup-47/harness.sh` 兩個寬度 **57 條 ok、ALL PASSED**（41/43/44/45/46 的 47 條原封不動全過，Ticket 47 新增 10 條）；紅測三個全紅、產品檔 sha256 還原一字不差。每幀工時 avg ≤ 0.56ms／p95 ≤ 1.1ms（門檻 avg < 4ms）。

待使用者看：舔邊火「像不像火」是眼睛說了算 —— 第一版是「一圈發光的金屬框」，調細噪音取樣後才有火舌，兩版凍結畫面都在 `evidence/`。另外「收回時完全不畫舔邊」是照票面字面做的，使用者沒有直接答過。
**工作目錄已搬出 OneDrive：harness／紀錄一律寫到 Windows `C:/starlit-work/starlit-implementation/followup-47/`（WSL `/mnt/c/starlit-work/starlit-implementation/followup-47/`），不得再寫進專案的 `work/`。**
- Developer 交付：框 4px 外擴＋1px 內縮＝5px（兩寬度四邊實量 5px）、舔邊火同一張 canvas（外擴 20px，距離場把燒穿火關在卡內、舔邊火關在卡外；厚度上 16／左右 9–11／下 9–10px、卡面與鄰卡 0 像素、3.8s 歸零、收回不畫）、格距 24／28px；tsc／七支綠、harness 57 條 ALL PASSED、紅測 3/3、每幀 avg ≤0.56ms。第一版看起來像「發光金屬框」，噪音調細 2.6 倍後才有火舌。Reviewer（Opus 5 high）審查中。
- Coordinator 順手修：`starlit-shell.test.ts` 的 esbuild 產物改寫到系統 temp（原本每次測試都在 OneDrive 的 `work/` 重建資料夾）。
- Reviewer T（Opus 5 high）**FAIL**（自跑 tsc／七支綠、harness 57 條全過、紅測 3/3、5px 四邊實量正確、預算／退路／交棒皆對，但三條 Major）：F1 火的畫布尺寸只在掛載時量一次，切到作品頁後內容欄有 1.2–1.7s 寬度動畫，真滑鼠在 300–800ms 點卡片會把舔邊火畫到卡面文字上（harness 因暖機沒抓到）；F2 45.1 門檻 12→16 蓋掉真紅（紫卡 500ms 參差 6px）；F3 舔邊火像「發光的蠟／鍍金畫框」，與主火是兩個效果（alpha 拐點 0.28 太低、82–87% 像素飽和；根部是幾何線；`zeros===0` 斷言禁掉斷口；動態只是輪廓輕晃）。F4 右／下緣厚度 8–10px 低於票面；F6 桌機欄距 24 與鄰卡框淨距 0；F5／F7–F9 證據與註解不符。5px 本身份量對；「火退框進」的交棒安排好。Q4：收回不畫舔邊，目前對。
- Coordinator：交 Developer 第二輪——ResizeObserver 跟隨卡片盒（含真滑鼠 300/500/800ms 與中途 resize 的 harness）、45.1 門檻還原 12 並修真因、alpha 拐點 →0.9–1.1＋heat 下修、邊緣切線 ±3px 低頻噪音讓根部咬進咬出、eover 0.55→0.2、覆蓋率區間取代 zeros===0、噪音節奏同主火、欄距 24→30、四邊厚度 10–16 全斷言、註解與證據修正。
