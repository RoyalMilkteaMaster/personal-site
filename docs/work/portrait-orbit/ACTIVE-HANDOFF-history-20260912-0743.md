# 目前斷點：先讀本頁，再讀各 result.md

更新：2026-09-12。這是持續更新的協調文件；檔案 hash 改變屬正常，凍結的是產品候選及其 manifest。

## 使用者不能遺忘的指示

- 繼續完成 portrait-orbit 已核准 Spec/Tickets01–03。全部目前仍未完成，A13 原畫一致性未達，主站03未開始。
- 原始 STAR 首尾圖片最優先，應幾乎一致；完整固定3D、同向外擴旋轉也必須成立。
- 保留目前修正版，不要回去換成使用者否決的原始素模。raw GLB只能作結構診斷。
- Developer：Astra6 medium；唯一 Reviewer：Fable5 medium。實際CLI別名gpt-6-astra、claude-fable-5-1。
- 允許安全並行，要求做到最後驗證，並持續記錄避免壓縮遺失。不要求一般步驟重複批准。

## 現在可看：已凍結合成 r7

網址 http://127.0.0.1:3004/raw-integrated-r7/index.html
資料夾 work/model-trial/raw-integrated-r7；result.md/compare.html/parts.html。
包含 fringe1髮型、hand5、clothes3、framing1，尚未含prop1和uppercloth1。
Manifest 2851b777e2bceebfd4409f48fbb9f4a638badcb17495867ca9df9c2a40f3bf48。
GLB715f3bea1a75a45724eeb797676d317a3da056d0f27225269d97c34360c69258。
Stars b8e8604c2772babb447814ded8400e4d8f44d6f6be0215537755fdd89636fe86。
Root實際CUA tab19 r7Live已Play0→12、seek4.44確認頭頂留白；不是只有自動截圖。

## 正在跑的三個 Windows Astra CLI

| 工作 | exec session | Codex thread | 唯一寫入資料夾 |
|---|---|---|---|
| 頭部referenceUV/色場對齊 | 25855 | 01a09264-f0b7-7502-8d63-9839e371b0fe | raw-head-reference-astra-r1 |
| 食指/拇指局部修形 | 43659 | 01a09260-adea-7a31-8f63-132f55157add | raw-hand-astra-r6 |
| 左髮緣/冠脊實際形體 | 61066 | 01a091f2-2bc7-75f3-9356-d751f49949e1 | raw-head-shape-astra-r1 |

monitor：Python312 -X utf8 work/model-trial/monitor-resume.py。
完整派工與事件在 work/model-trial/codex-astra-{head-reference-r1,hand-r6,head-shape-r1}-{prompt.md,events.jsonl,stderr.txt,result.md}。
頭部reference目前早期結果不足，可能不採用；等凍結結果，不能把進度說成通過。
手6保留掌450950/腕袖/中無名指，修食指前凸和拇指方向厚度；保持prop1參數並複驗接觸。
頭shape只修現有髮量冠脊，不把暗臉誤判成缺面，不強迫不可靠下顎地標。
衣服thread 01a091f9-7246-7c63-9baa-18bcdd379824目前idle。

## 額度真實阻擋

Fable session c08239e9-d393-4c5f-b74a-3231d8f0db2c 在05:33回429，台灣07:30重置。
r6+clothes1那次審查在任何工具執行前就失敗，沒有審查。
不換模型/會話繞過額度。到時間後可恢復同一Fable session；沒有設定自動排程或背景喚醒。
已準備 claude-fable-review-r7-prop1-prompt.md，但尚未派出。
pending-review-2026-09-12.md有待審清單。新uppercloth1也需加到後續固定審查。

## 最近凍結候選

- raw-prop-astra-r1：manifest7a48e783566c1a0251758111bd32283ccac9a4d8c79b6fdb6722f83cc0cb161c。scale.36，掌basis local[-.027045,.028,-.022337]+worldY.035，worldYspin.55rad/s取2pi餘數。金冠穿透0；氣焰max6點/1.85mm，保留接觸取捨，F32未獨立關閉。只能移植placement+重算anchor，不覆蓋整個手部preview。hand6變形後需再複驗。
- raw-clothes-upper-astra-r1：左肩近景star肩緣440→504，原圖509；實際mesh追蹤444.6→508.9，無改相機。GLBa3389bc557cfa904d1cf7e465179f6f78103150f998977c454a6b889f9b8bfe8。delta-vs-r7.npy+normal-mask/normal-replacements，只套一次。5464verts/max27.8568mm；與歷史head-support重疊532個實際衣服頂點，不能被整頭overwrite。真正頭頸/雙手/下衣保留；新增交叉0。manifest.json/manifest.sha256（不是SHA256SUMS格式）。領口沒下移：原圖領頂約459，r7約455，真正差距是厚寬和摺形。下輪collar-only需要明確skin/cloth junction，不把肩的70px直接套領口。
- raw-framing-astra-r1：manifest253128b434d2074915ed83b87d56532e319b35f10f1111a1dce698d10c6f31ae，第一段平滑下移max23.04px，首/背/尾與第二段不變。已在r7採入。
- raw-hand-astra-r5：manifest395ac46192fcec6413711677b41b28d3410f327320eccfeebcbcf544025db5d0。掌面24.53度，改細中無名指，有局部收益但食指/拇指/小指摺痕仍差；已在r7採入。

## 明確不採用的頭部試驗

- raw-head-linework-astra-r1 manifest50994b157b21ec689fff720a4cd259280b9591e526f02ed35c9e2fdae1d236d4：alpha只增加既有粗亮塊，側背更顆粒，保留fringe/r7。
- raw-head-surface-astra-r1 manifesta202557071757e80b0fd352b70e7b5498a695c1be15b47383ca912afb52146c3：2068點改為原圖射線真實曲面命中，其餘597932行不動，仍不足。原點near對準但wide中位誤差7.65px。813 activehair referenceUV中位偏移15.386platepx，促成目前reference修正。
- surface最終ray統計915miss/2023mask外，早期1025/1913是加速ROI不全，不能引用。左髮ROI235miss/552，冠頂240/1189；內臉1009全命中，396經保守mask/fade接受。mask外不等於缺幾何。這不證明A05/A13或3D不可能。

## 後續順序

1. 持續監看上述三個現有進程，不重啟重複worker；完成後凍結/讀result/檢查實際圖片。
2. 頭reference如無淨收益就保持不採用。頭shape完成後，reference/取樣對應需在新幾何上重驗，不能盲加舊投影字段。
3. 未修完衣領、腰衣帶/腿部露出與臉髮/手細節仍需修，不以局部PASS當A13。
4. 合成下一版應以r7加明列r7-relative patch，head/uppercloth歷史mask重疊需正確處理，point witnesses/normal fields用最終幾何重算。prop1新anchor重算，hand6接觸重驗。
5. 07:30後恢復唯一Fable獨立審查固定snapshot，處理有效findings；Root再實際操作。
6. A13及形體/動畫關成立才主站03；最後型別/測試/build、主站真實互動、效能/降級、HTML完成報告和使用者最終視覺確認。不能提早宣告完成。

## 環境與禁止事項

Windows Codex0.153.4能用gpt-6-astra；WSL Codex太舊不能用，勿安裝/換auth。
Codex resume --ignore-user-config -m gpt-6-astra -c model_reasoning_effort=medium -c approval_policy=never -c sandbox_mode=danger-full-access --json -o result THREAD - 。模型effort backend若未揭露記unknown。
Reviewer WSL /home/leslie/.local/bin/claude -p --resume上列session --model claude-fable-5-1 --effort medium --permission-mode dontAsk --allowedTools Read,Glob,Grep,Bash --tools Read,Glob,Grep,Bash --output-format stream-json --verbose。
HTTP3004 PythonPID25560、主站localhost:3000現有服務保留。所有work舊實驗和未提交變更保留。沒有commit/push/deploy/install/creditreset/automation/goal。
原STAR: raw-integrated-r2/shots/baseline-front.png(ab2a0644...)、baseline-wide.png(c90f19bc...)。完整歷史與已撤回F20/F29/F35/F37/F38見RESUME-FIRST/current-run-state；勿再重提假缺小指、世界normal負值等於翻面、掌心是袖口等誤判。

## 最新覆蓋更新（下方優先）
06:49頭reference1已結束且不採用，manifestb71739430ca2383c932c6df93819451800339316d3d56c9a2e9856915a436e16。813hairUVmedian15.386→.060px，但僅343點referenceblend>0.5，加上既有doublelighting，視覺不足。保留r7；下次待新headgeometry後再檢查完整前面點分佈/色彩/既有光照，勿再單一alpha或強迫A05/A13不可能。Headreference threadidle。新collar1已派到衣服thread01a091f9-7246-7c63-9baa-18bcdd379824，raw-collar-astra-r1，從frozenuppercloth1修領口厚寬摺線，保留肩部/skin/head/hands/lowercloth，完整promptcodex-astra-collar-r1。目前active是collar1、hand6exec43659、headshapeexec61066。其他上方資訊照舊。

Hand6exec43659已結束凍結（讀SHA256SUMS取hash），r7-relativeincrement-vs-r7.npy與normalmask1703，1591位置/max24.356mm；palm450950/腕袖/中無名小指固定，newcrossings0。2865 changedpointrows，其餘597135原樣。Prop1氣焰max6/1.85mm未變、總inside62→77次（新增15薄接觸），crown0。Root看STAR仍暗、手弧/拇指方向高度未幾乎一致。Samehandthread改跑raw-hand-look-astra-r1（完整promptcodex-astra-hand-look-r1），固定hand6幾何，一個現有handweight seam的局部可讀性/法線光照診斷，不是新pose或全域提亮。監看名稱已更新。Active collar80416、headshape61066、handlook新exec。


頭shape1exec61066已凍結，GLB057b3632a9a2a5d267e5ecf869368caae921aec2921c892012e0d844308d2f83，stars3b94d8cebd98566fc205d0ade4dfef1e62e0631b257b1f5965ec9366663a7761。R7-relative delta-vs-r7+normalmask10404rows/max12.4031mm y.91513-1.017905，與uppercloth actualmask及incidentface零重疊。14673affectedstars，其餘585327保留。Leftnear miss235→64/crown240→123，wide同批430→294/216→111；近遠約7.8px殘差仍在，非impossible。Newcrossings0/inherited442329/458529，minJ.6587/area.6565-1.8332。Root看原生圖有外輪廓收益但仍平髮帶。現在headreference舊thread01a09264-f0b7-7502-8d63-9839e371b0fe接raw-head-front-astra-r1，從NEWfrozenheadshape做一次完整前側reference point/color/shading校準，讀完整promptcodex-astra-head-front-r1，不重複343低覆蓋小試驗，固定full3D和body。active collar80416/handlook57933/headfront新exec。Headshape/integratorthreadidle，可於後續候選凍結後合成8。

CUA重置後目前binding r7Live=getTab19/iab；仍r7index，已markDeliverable、停12秒全景。自行建立的17(舊404)和18(舊framing)已關；沒刪任何檔案。API docs重新取得：tab.goto(url)/reload()/close()/markDeliverable()/markHandoff()可用，未來版本沿用tab19 goto避免重複開頁。getScreenshot()本身自動emit，不再nodeRepl.emitImage包它（先前會重複圖）。每次動作後getAXState再取新index。Hand6manifest7f7ac1c83d3d053b45823ae68292db763d6192f051d5aa942751161df3fda0bb；handlookexec57933目前有新tool執行，之前stream5/5已恢復，非quota停止。

Handlook1exec57933已完成且REJECTED，保留hand6。LOD0和單一frontfill均無原圖手弧淨收益；不採入任何補光patch，manifest015b922c...9234d95。Handthreadidle；currently active collar80416及headfront77031，留空槽等collar凍結後立即讓integratorthread合成8（headshape1+hand6+upper/collar+prop1）。headfront仍active，不讀入合成。

Collar1exec80416已凍結，GLB8a299980c8771291d1a681ddb2149d911dcd93a27f640209c67096e8fa88e51a，starsf697bd827e081c6ab564b9c1f5a2b42fc85d41ffbf423a0025113e2152cf68e0；manifest.json/manifest.sha256。領外邊near388→411原432，肩頂維持。incrementupper1 1627verts，cumulativer7含upper+collar6436rows，實際y<.858963。与upper655verts/1360faces重疊已正確合成，與歷史head988verts重疊實為cloth；用actualnewheadshape支撐檢查。Newcrossings0/minJ.2814/area.24555，壓縮仍待審。現在integratorthread01a091f2-2bc7-75f3-9356-d751f49949e1接raw-integrated-r8：r7+headshape1+hand6+collar1累計upper+collar+prop1，只讀全部凍結inputs，fullpromptcodex-astra-integrated-r8-prompt.md。Headfront77031仍獨立active，不讀/不採其他rejectedlook。Headshape1manifestb10b32a43b70a0c37bf983582d4b0e00377ba5adaa9bc7544924a3f3823936fe。手/衣服thread目前idle，留一個slot待Fable07:30。
07:28更新：head-front1已Ready凍結，manifest e6866782b6ef293c971c1420192be42bf4d3803613ec083bc1d0280f9dcfcff5。Root看原生near/wide與original，前髮細線有局部收益，仍非A13。新增3521reference+939area-floor，保留600kprefix，604460rows固定triangle+bary；nonheadpixels0。既有前側4216alpha退場採共同vertex W，新reference光照僅originalwide離線一次，保留source尺寸兩端；wide source residual7.733px/輪廓仍待修。唯一Fable review pending。現在同headthread接raw-head-form-astra-r2，exec85196，完整prompt codex-astra-head-form-r2-prompt.md；用可靠sourceID near/wide雙端先分析再修現有髮緣/冠頂/右突起/有依據臉形，不猜chin，不rawreset，不讀active r8。保持headfront線流和actualmesh綁定；失敗不採用。Integrator r8仍exec39969 active。Root tab19 r7Live已goto r8實際Play0→12成功，當時頁面PROVISIONAL GLB8b02d4e6/stars6fb4d776；並非凍結最終驗收。Fable07:30重置待同session恢復，未設定排程。
07:29更正與接續：上一則標07:28其實工具clock為07:26:53，時間以工具為準。r8已凍結manifest196da9d401f008c3a51eb0493b830fdc98b1eeae932b9fa588d55c87b8951e3b；Root相同GLB/stars實際Play0→12+seek4.44頂部留白確認，非A13。現在integrator同thread接raw-integrated-r9，exec63769，僅將frozenheadfront1的4460append+alpha/原始shader分支合入r8，保留r8所有geometry/body/prop/fields，不重加headshape，不讀activeheadform2。prompt codex-astra-integrated-r9-prompt.md。Headform2exec85196active。已備妥新的claude-fable-review-r8-front1-prompt.md，審固定r8與headfront1兩個snapshot及累積components；07:30後resume同Fable，不使用過時r7prompt。仍全部票未完成，A13/main03未過。
07:30:14後已resume唯一Fable session c08239e9-d393-4c5f-b74a-3231d8f0db2c，exec40739，prompt/events/stderr claude-fable-review-r8-front1-*。初次unknown APIretry已恢復，現在有thinking_tokens事件，不再是05:33 quota429；尚無審查結論。只審固定r8/headfront1，不讀activeheadform2/r9。Headform2量測兩端ray角1.95–4.73deg，獨立點最小平方median移動78mm，未採用；這是固定現camera下的解，不代表Spec不可行。後續若仍受雙端配準限制，应檢查聯合camera校準（Spec不凍結數值；目前1/1.15/1.32是既有選擇）是否比拉壞頭型合理，不能把目前camera當使用者硬限制。仍須同向外擴與全身參考/背面約束。當前worker先做可靠曲線平滑修形，未承諾A13。
07:42前後：Fable r8/headfront1審查完成，完整claude-fable-review-r8-front1-result.md。無blocking/important findings，兩者localmergeable，F32在hand6geometry上locallyclosed（掌邊形體再變時重開）。非A13/主站通過。Reviewer獨立算r8 exact566416rows，其中3replacementrows字節沒變；報告566413是unaffected定義，非矛盾。Reviewer最後palm41–43度一句與hand5/6宣告24.53/22.88不同，已要求定向澄清勿盲改掌。R9已凍結manifest07248d1e6ba9031ca6681f24df1a2c90e34d5795f6e6d15ab60f0736889d6624；GLB同r8，final604460pointsc13a34c9前綴，rootCUA已goto r9並Play。新Fable r9定向review exec52948，claude-fable-review-r9-*。Headform2候選失敗不採用，仍exec85196整理凍結（左翼外伸/near median2.52px退步抵不過wide7.733→6.923）。Headthread完成後需camera/geometry聯合配準診斷，勿繼續錯用固定camera硬拉頭。Handthread另接raw-hand-front-astra-r1 exec24555，以frozenr9做ONE原圖手部feature點線構造，固定hand6/prop/geometry，與先前失敗frontfill不同；實際表面命中不夠就拒絕，不能點落袖口或空中。完整promptcodex-astra-hand-front-r1。現有active三個為headform2、handfront1、Fable r9；integratorthreadidle。Main03仍未開始，所有票未完成。
