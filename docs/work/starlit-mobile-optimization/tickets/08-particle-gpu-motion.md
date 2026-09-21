# 08 作品頁粒子動畫避免每幀CPU全池重算與重傳
狀態：使用者於本輪明確核准。Blocked by：07完成驗收。
基準：07完成後固定版本；沿用原Spec及iphone17-followup.md最新核准節。
目標：保持所有粒子、位置/法線/顏色、漂移、持物旋轉、閃爍、速度、reduced-motion與章節快照語意；移除Works穩態每幀全池CPU重算及全量bufferData。優先沿用現有shader/uniform與資料接縫，不引入引擎/依賴/抽象框架。可共用到相同renderer路徑但須證明不退步。
驗收：1.固定時間CPU原算式與新GPU位置/法線對照（含body/held/sky/seed語意）容差合理且記錄；2.同粒子數/同視窗可見穩態bufferData及bufferSubData總上傳消失或有可重現必要差異，禁止換API假改善；3.快照使用相同運動，六向轉場包含連點、重播、reduced-motion無跳接；4.手機402×681及桌面畫面/完整流程對照，保留遮擋光照及动画品質；5.07離屏行為仍通過。不得以軟體GL的單次FPS代表iPhone速度。
預期接縫：app/starlit-sky-study/legacy-study.mjs、lib/particle-morph.ts既有算式及必要相同renderer路徑/測試。不得改星雲、任意降低動畫或省略About深度。
證據：work/starlit-mobile-optimization/scroll-performance/ticket-08/。雙獨立Opus5medium審查，實作Fable5.1high。

完成2026-09-21：08-r1 legacy-study c10b8d91…/particle-morph0324352b…。Fable5.1high Developer，雙Opus5medium Reviewer PASS，實際effort均unknown。真GPU CPU參考/候選對照、07回歸、build與整頁計數通過；Works/Contact穩態bufferData+bufferSubData為0，粒子數不變；六向手機UI、卡片/重播、1440桌面前後圖已驗。ReviewerA已定向接受AC4，重要未解0。證據work/starlit-mobile-optimization/scroll-performance/ticket-08/及reviewer-08-a-final-result.md/B-result.md。真iPhone仍待09，非FPS宣稱。
