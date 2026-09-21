# 07 停止畫面外 GPU 繪製，狀態照常更新
狀態：使用者於本輪明確核准。Blocked by：原手機與排版工作已完成。
基準：目前 dirty followup-layout-r2；不是 git HEAD。Spec同目錄../spec.md及../iphone17-followup.md最新核准節優先。
目標：主canvas完全不可見時，不持續GL清屏/深度/粒子/天空/持物繪製；可見時保留原畫質、粒子、解析度、動畫。不得一行早退導致clock、命令、morph進度、report、done停住。
命令切章需要的單次快照/資源准备可保留，但要與穩態每幀绘製分開揭露。重播、語言、reduced-motion、document hidden既有語意保留；恢復畫面沒有空白、過時姿態或跳回開場。完全離開才停，部分可見仍繪製。
驗收：1.可見/全離屏穩態draw及上傳計數對照，離屏零持續繪製；2.離屏正常UI切章/重播/語言後回來與React章節一致；3.六向章節轉換不中斷、必要快照正確；4.正常開場與桌面可見畫面無退步；5.測試覆蓋實際場景命令/回報而非只驗字串。保留真機限制，不宣稱實際FPS。
邊界：實際app/starlit-sky-study/scene-study.mjs場景迴圈及必要共用接縫/行為測試；legacy粒子GPU重寫留08。不改Shell/文字/星雲/粒子數/DPR/相機/深度品質。變更必要時說明因果，不為mock建立大框架。
證據：work/starlit-mobile-optimization/scroll-performance/ticket-07/。完成固定snapshot交新雙Reviewer，無commit/push/deploy。

完成紀錄2026-09-21：產品07-r1 scene-study7a65c8f6…；DeveloperFable5.1high requested/actualeffortunknown，ReviewerA/B Opus5medium requested/actualeffortunknown。A重要A-1依選項b補正常UI及命令接縫證據後closed/PASS；B無重要Finding/PASS。見scroll-performance/ticket-07/coordinator-ui.md、rawbrowser-candidate/result.json及reviewer-07-a-final-result.md/B-result.md。Chromium非iPhone；原始2harness誤判保留，不宣称原run全綠或真機測完。07完成，08解鎖。
