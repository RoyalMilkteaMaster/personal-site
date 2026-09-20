# R9：恢復 fantasy 第一版運鏡

使用者在R8試看後明確否決新增推近，並確認「最初」指 fantasy-integrated-r1。以第一版連續繞拍、背面停留的鏡頭為基準，僅必要的視角微調；取消R8推近與R6橫向內部裁切。R8未完成驗收，僅保留試作歷史。

保留R7移動星空穿透、現有新模型與星火、第一段0.7秒和第二段按新路徑等速推算。待實際主站驗證與同一位Opus5 MEDIUM獨立審查。

最新確認：使用者實際看過 fantasy-integrated-r1 原頁後同意，只要求背面視角稍往下移、多露背部。沿原角度／距離，適度降低背面取景中心；不再另做運鏡風格。

完成：原R1背面target.y .79→.71，其他背面參數相同。原正面與已接受的R4最終低角度保持；R7星空保持。第一段.7秒，回程1.0236479148秒同平均eye運鏡速率。641幀全程fullcanvas，234幀背面停留完全靜止；8項操作檢查、tsc/tests/build通過。Root已檢視原main背面與降低後畫面，並將預覽tab37切回目前主站。

固定候選cabcae9f04e700feb3d86793978acf8f4160772c955b664f004906b884c39141。同一位Opus5 MEDIUM審查完成無重要或阻擋；74/74pins、42/42其他檔案保持，完整審查在work/model-trial/claude-opus-fantasy-original-r9-review-result.md。文件補充：正式arc()採1024步，result.md的1000步是fantasy-orbit.test.ts獨立密集量測，兩者並非同一組取樣；以正式1.0236479148秒為準，保留固定快照。R8取消，無推近殘留。

[主站](http://localhost:3000/) · [原高度／下移對照](http://127.0.0.1:3004/fantasy-original-camera-r9/comparison.html)。未公開部署。
