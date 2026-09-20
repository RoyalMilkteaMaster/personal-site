# 07 — 依使用者反饋重做奶茶、近景揭示與前後段落鏡頭
Spec: ../visual-revision.md（最新使用者直接修訂優先於舊spec）。
Blocked by：01/03/05既有基準；可與08依寫入邊界並行。
交付：短胖可愛星點貓耳杯、臉中央近景到正臉的連續揭示、短轉場停穩才出字、前後六段閱讀與快捲重定向、全貌結尾待選擇、無音訊與既有人物/首頁保留。
使用work/starlit-implementation/visual-revision/interface.md共同接縫。
驗收：杯子至少兩角度有XYZ厚度與吸管/貓耳/珍珠辨識；起點看不出整臉但同人物點雲仍在，拉遠連續可辨識為臉；轉場期間visibleChars=0，到位後依參考頁實際CSS，以2秒ease-in揭示文字；停在段落不自動前進，前後及快速重定向連續無跳鏡；隱藏分頁保持進度；現有模型與正式首頁hash保持。
模型：Developer Codex gpt-6-astra medium，獨立Spec/Standards Reviewers各Claude claude-opus-5 medium。品味仍待使用者實際確認。

使用者最新調整：奶茶模型改由使用者提供；本票先完成其餘鏡頭與閱讀，現有杯子僅定位，不驗收形狀。
