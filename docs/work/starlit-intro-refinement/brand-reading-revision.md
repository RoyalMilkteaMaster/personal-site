# 2026-09-15 品牌開場與固定閱讀修訂
本文件記錄本次使用者逐項確認，衝突處優先於舊 Spec／Tickets；不授權替換首頁或發布。

- 品牌確定 **Royal Milktea Master**。開場移除詩，品牌佔畫面大部分（桌面先約三分之二寬，可分行）。
- 空間如抬頭看星空天花板：名字與奶茶位於人物頭頂上方、朝向人物，讀者先抬頭看，再轉到人物正臉。皇冠已於後續指示移除。
- 介紹保留四句：我是皇家奶茶大師／一名 AI 應用全端工程師／一位數位內容創作者／一個正在一步一步實現理想的夢想家。四個身分關鍵字加大加粗；夢想家另加星光。
- 「我追求」小字；技藝、自由、極限大粗字依序，完畢停在最後，不無限輪播。
- 文字位置固定，不跟著滾輪上下滑。捲動推進文字逐步揭露、段落與鏡頭，停下可讀，反向可回看；鏡頭停穩才顯示文字。取消使文字像獨立浮卡的背景遮罩。開場仍可點擊、一般鍵盤或滾輪啟動。
- 正面到背面平順逆時針繞行，不額外先上再下。
- 第3／4閱讀段只有旋轉星空，人物／奶茶不出現；文字居中：
  如果有機會，
  希望我們能在星空下，
  一起喝杯奶茶。
  接續：說不定，我們暢談著，歡笑著，就一起幹了件——
  會讓星光記住的事~
- 邀請後直接轉全身，不再次拍到開場品牌和奶茶；全身及轉場不露模型缺腳截斷面。
- 結尾左侧品牌、AI 應用全端工程師、我的專案（左）／關於我（右）；不顯示歡迎聯繫。Mail／GitHub／IG保留。只有專案／關於我進場播放流星。
- 結尾右侧四行詩：
  將星空收入手掌，
  將靈感斟入玉觴。
  散落的星願，勾勒出那片遠方，
  我摘下星火，執炬先行，為世界添上一抹燦光。
- 中文原文不任意改寫，英文維持對等內容；手機不得裁字。
- 新astral/fantasy兩個GLB分別由Astra medium處理，Opus5獨立審查。移除fantasy孤立球，astral雙手僅修自然度，保留手掌／手腕／手肘與兩手間距。骨架先以實際可驗證的局部候選交付，限制明列；未驗證完整骨架不能宣稱完成。
- VPoser與SMPL-X檔已找到，屬可選身體姿勢資源，本次尚未執行，非自動GLB綁定／修指工具。
- 星點貓娘、探頭／戳R／抱R／招手等目前是可行性討論，尚未核准製作、購買模型或接入。

實作與驗證在 work/starlit-implementation/visual-revision/brand-revision/、astral-model/、fantasy-model/。原始檔、既有工作與未提交資料保留；全程WSL。


# 2026-09-15 使用者最新核准修訂
取代之前手動逐字捲動：像 https://elvismao.com/zh-Hant/，捲到某段即按設定節奏自動顯字，不用每個字自己捲。讀完停留等下一次捲動換段，可往回看；不自動換scene。文字仍固定位置，不隨捲動移動，鏡頭停穩才出字。
圖1結尾詩、圖3正面自介遮人物：把文字移到更右下的星空空位，避開人物（尤其臉和輪廓），不要移動既有相機或人物構圖。desktop圖1/3為優先；手機需可讀、不裁切，若空間無法兼得回報限制。
「希望我們能在星空下，」改成「我們可以在星空下，」，同步英文為 We can... 意思。其他文案不變。
貓娘成熟/可愛是諮詢，未授權實作；不加新角色/皇冠/音訊或改相機。保留4→5直接全身，開場click/key/wheel，雙語/replay/兩入口/social/endingpoem。
參考前輪實際CSSOM：#space height400vh，各stage sticky top0 100vh；#intro child40%；.type background-clip:text，background-size0→100%，transition2s ease-in，section1觸發。因此最新明確要scroll觸發timedreveal而非scrub。

追加核准：開場品牌文字保留明亮奶油白，加入一點淡漸層（香檳金至冰藍）；不改大小/位置/相機。貓娘全身建模參考圖已明確授權，使用built-in image_gen生成output/imagegen/catgirl-model-reference-v1.png；本輪不生成貓娘GLB或整合其動作。


## 2026-09-15 最新追加：手機原圖角度與貓娘試用
- 使用者要求手機必須保留人物原圖的角度，允許調整手機相機；文字須配合，不能以排字為理由改人物角度。原圖比對基準已詢問，尚待回覆。
- 收到 anime catgirl 3d model.glb，先獨立試用，來源圖 output/imagegen/catgirl-model-reference-v1.png 為形象基準；目前模型暫用且可替換。不聲稱模型臉部已修正或已有完整動作骨架。

## 2026-09-15 最新確認與追加
- 手機原圖角度基準：使用者確認目前桌面與原始人物圖同樣觀感，以桌面為準。手機保持觀看方向，僅調取景及文字排版。
- 貓娘來源改用 anime catgirl 3d model2.glb，以實際效果為準；第一版保留對照。
- 皇冠重新納入貓娘互動構想：先生成單獨建模參考圖，皇冠可先放Royal的R上再被拿下戴頭上，匹配貓娘服裝。尚未要求此輪完成該動畫。圖片已生成於output/imagegen/catgirl-crown-model-reference-v1.png。
- 使用者要求修正貓娘星點整體/尤其臉部辨識度，不能只是一團稀疏點，需實機可辨輪廓與五官。以第二版模型實作星點效果，原始GLB不改。

# 2026-09-16 使用者視覺修訂
- intro exact: 我是 皇家奶茶大師。
一位 創作者，
一名 AI全端工程師，
一個正在一步步實現理想的 夢想家。
- bold identity keywords maintain large/bold, dreamer sparkle; space before bold. Sync English meaning.
- intro in starfield clear of figure, screenshots 5/6. Pursuit left empty stars, larger keyword, 3 words once only.
- back camera more straight at back, both shoulders complete. Preserve CCW and mobile original angle, final no missing feet.
- talk lead larger; closing phrase exactly 值得讓星空記下的事, larger.
- ending brand block and poem separated in empty stars; awaiting optional placement clarification (brand upper-left / poem lower-left or left-right); don't block other changes.
- diagnose/improve wheel + click flow, section-trigger timed text fixed in place, stop allows reading, backwards allowed, no automatic scene advance.
- integrate v2 star catgirl in opening full preview and tune in context. No claim complete skeletal character actions. Preserve formal home route.
- show current human rig/camera available effect honestly.

結尾位置已確認：品牌與入口/social左上，四行詩左下，中間留白，避開右側人物。

## 2026-09-16 取消星點貓娘，改2D插畫動畫
使用者明確選擇保留原圖樣貌的2D插畫動畫：眨眼、歪頭、耳朵動，再設計跟字互動。星點GLB整合取消，source/adapter/證據保留；不再為已取消效果修face/LOD。此轮2D初版以原白髮藍眼插畫準備眨眼素材（output/imagegen/catgirl-2d-blink-atlas-chroma-v1.png），瀏覽器動畫合成去綠底，開場品牌旁先可看自然眨眼/歪頭/耳動；完整R/皇冠拿放動作仍後續設計，不能聲稱完成。

最新使用者要求：2D貓娘一定要全身，包含腿、鞋、尾巴，不採半身版本。全身atlas output/imagegen/catgirl-2d-fullbody-blink-v1.png。文字及3D杯互動目前為方式說明（手層/道具錨點/遮擋），尚無拿R拿杯動作交付。

使用者再次強調保留上方半身版的可愛形象、補完整腳。最新asset是 output/imagegen/catgirl-2d-fullbody-cute-v2.png，以半身臉為身份基準延伸，舊fullbody-v1保留不作最終。
