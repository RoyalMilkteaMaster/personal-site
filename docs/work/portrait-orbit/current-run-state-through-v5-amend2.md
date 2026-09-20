# 目前執行狀態 — 2026-09-10

本輪尚未完成。依已核准portrait-orbit Spec/Tickets01–03，完整同一3D與首尾幾乎原画都是硬門檻；v9否決，任何舊完成/局部PASS不可替代本輪驗收。main基準41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6；保留全部dirty、原圖/GLB、歷史候選；不reset/cleanup/commit/push/部署。主站未套本輪候選，Ticket03未解鎖。

## 目前代理與接續方式
- resume_face_runtime：原生gpt-6-astra/medium，唯一臉髮/detail獨立模組及runtime/QA寫者，目前已固定局部facev15，正在校對原版點徑後密度。
- resume_clothes：同模型/強度，唯一model-v10-clothes-*寫者。後帶v35局部推薦，續修前帶上段急V折，之後立領厚折。
- resume_model：同模型/強度，唯一共同build/bin/GLB/UV/normal/取樣/掌錨寫者。每個build段完成後會completed，收到部位確切模組可followup喚醒；completed不是整票完成。
- 使用者已允許一位Claude Fable5.1/medium CLI Reviewer同時審Spec+Standards，取代兩Sol，不占原生槽。WSL实际canonical claude-fable-5-1。暫無審查進程。
- 電腦斷線曾令原三代理與服務全停，檔案保留；已重新建立以上resume上下文。使用者再次詢問時，三位有界段完成後停下，Coordinator已如實更正並續派，目前必須持續接續未完成工作，勿把有界完成當整體完成。

## 已固定的局部成果
所有候選在work/model-trial/v10，未切預設。
- 雙手基準checkpoint-88eb9c，geometry88eb9c3100a4；手/袖口穿插修正、左拇指回原方向。model-v10-hand-stage-result.md詳述數值與視覺範圍，勿重做手。
- jaw-preview b24acba0920f，facev5局部下顎，四模式八角及11.98秒完整360退出0，側面無新增頸裂。原近景髮頂/下巴已校至原圖附近；front target約.377。
- 推薦下一臉髮基底facev15，scalp-flow-v15-preview geometry899dd4c5bb63360ce7dae852a983bc4d694074035d69cff38dee4a26c11ac5a7，clothesv4/detailv2/0追加hairmesh。專員同1000×900 CUA實看180/135/225/270solid+frontweighted：後冠長直坡成連續起伏、無新折面、270step厚壁與橫線消除，front主峰約520/100保留。不是U08PASS：耳側y450仍偏短直、右緣缺翹尖、後髮細束不足、暗部點偏密。
- 推薦後帶根端clothesv35，preview14a4cc4628257db6d61c2c5084c1912cbff4f7aa42eb4d805dd30fa03d34e150，facev2/既有手/無hair-detail比較基底。root及專員同後鏡頭看到密齒明顯減少，專員90/270solid/material未見新增破洞/穿插且厚度保持。七圖model-v10-clothes-evidence-v35/runtime。只是局部推薦，非整衣U04/U08通過。
- 前帶v17下段連續性改善；前領v22 preview615e8d587f0b將左領頂回原圖附近，但厚舌折仍在；尚不整體採用。

## 正在處理的根因與剩餘
- 額外獨立hair束造成帽+貼條已否決，現直接塑原封閉頭髮表面。v9 geometry4d8c6040a15a有step回退不連續與冠權重急變，face-v9-diagnosis.json定位。v10 c7d8367b分開shape/flow安全回退、UV焊接step平滑已修側面；後冠v11/v13等試作各缺陷保留，不倒退替代v15。
- 点徑舊d/3退化已由Claude關閉，與原版完整質感不相等。原baseline點徑(1.05+bright*.78)*depth、近景再1.32，latest公式不同；尺寸/密度分開校對，GPU/CPU一致，保留暗部非零底密度、XYZ固定，驗front/wide與火種完全可見/完整自轉。舊source-UV RMS<30 fixture綁舊模型仍RED，不能放寬閾值假綠；最終需正確同版回歸。
- 前帶急V來源410084/410086→407290→145508，v4已有真折回，v17大致同量平移，非單純新版過渡。衣服正局部重塑折回中段、保持下段和肩端。
- 後帶齒邊381731/381785/381863等211輪廓面，封閉component30840頂點，原92可見齒面不在交叉pairs；屬真截面起伏而非開洞/衣身穿插。v35整理截面並保厚度成功；v26–34無效或厚度待補試作保留。

## 構圖待核對
原網站complete figure指原圖構圖，非額外Tripo所有腿鞋。不得縮腿/刪面/動態mask。wide俯17.48°radius1.5方案實看比例失真且違外擴，不採。?frame=portrait窄框截近景雙肩不採；?frame=full-width僅opt-in：全寬、上下6%留白，wide下界符合原圖幅，近景底54px肩被切。root已看同1000×900圖，仍預設無框。frame-proposal.md與shots-frame-fullwidth保存明確取捨，其他獨立修正先完成，不能無聲當已核准變更。

## 審查、服務、報告
- Claude session dad7dabc-e3c3-40e0-bf57-51b3b077b3d5首輪及sizefix複驗完成，Finding1 closed。camera-review-fable-{v10,sizefix}-result.md。原兩Sol已中止不算完整審查。最終Ticket01新獨立Claude上下文與Ticket02最終同版審查均尚待。
- Windows Python312 http.server3004，root work/model-trial，hidden PID23212已恢復且最近listener正常。3000/3007斷線後未恢復，不要假定在跑；如需服務先查避免重複。
- root CUA本輪currentCheck=IAB tab1，1280×720，目前clothes-v35-preview t6.8 solid。root已親看v10臉髮270/front/180及v35後帶。最終Coordinator仍須真正操作全流程，不能只有腳本截圖。
- completion-report.html已改實作中；舊2026-09-09報告保存completion-report-before-v10.html，舊完成結論不適用。當前報告靜態檢查成功；CUA file://預覽被URL安全政策拒絕，未繞過，不宣稱報告視覺驗證通過。open_in_codex(file)曾queued。
- 更多歷史current-run-state-history.md、delegation-current.md、v10/face-resume-notes.md、model-v10-clothes-result-resumed-v23.md。讀最新部位文件並核hash；不要把舊歷史狀態當目前活躍進程。

下一步：持續等/接兩專員候選、模型唯一整合，局部合格後同一候選四模式八角/連續360/星火/原首尾比較與所有U01–U08。成立後獨立審查，才解鎖主站03與性能/降級/互動驗收、最終HTML與使用者視覺確認。

## 本次接續驗證
- density-half-cell-v15-preview 為 260020 個固定原點，12 對交換使 22³ 格覆蓋恢復 1930/1930；geometry 與 v15 不變。不是視覺通過。
- Root 同 1280×720 實看原始 front 與 v15 full/half + diameter=source：候選眉眼鼻及下顎明顯弱於原版，half 再弱化；已交 runtime 追查來源明暗、取樣與可見面，禁止以減密局部改善替代 A13。
- clothes-v40-preview geometry98669b38aa476569af51efa4aa6a7aee3940e61c950bacc5f6590c1cb411a4e3。Root angle0 full60/full120 material 實看：原腰部右側水平急返折已成連續右下走向，完整視野仍成立；側面、厚度與交叉待衣專員核對，尚未整體推薦。
- 臉線、衣線持續修正；模型線準備同版整合清單並接各部位確切 build 請求。尚無 Ticket 整體通過。
- 衣專員推薦 v42 作整合測試：geometry2e9241d3105492f494760510a3daba7068b1faeb4d507accec6296ad7377383c，保持 v40 正面形並修7新反向互穿；報告 model-v10-clothes-result-v42.md。2微小同向 pair 限制保留。立領 v43 仍試驗，未推薦。
- 前臉已查到原 source-lib/portrait-points.js 141–146 的固定原臉區 maxRGB .30 色相比率提升未移植，正建立只改此規則的固定點池候選。原內臉736點、v15嚴格近表面朝前512點（509 area/3 detail）；兩者原RGB中位近似，不能稱 floor 是唯一根因。新候選尚待實看。
- root 實際點播放 v15+diameter=source，觀察3.7秒正面文字、8秒背面文字、12秒全景皆有人物，末尾恢復播放按鈕。此有限操作證據不代表新候選全部視覺或完整逐格驗收。
- 衣線已凍結推薦 v43（v42回退）：geometry e909516ed3c6548f8158a5c5236a15ded9ee87bb042fd31ee6946f87ed9914ad；19依賴 model-v10-clothes-frozen-v43.json，報告 model-v10-clothes-result-v43.md。U04/U08仍待共同版/Reviewer。唯讀追加A13差異 model-v10-clothes-a13-readonly.md，sky舊平面sizeK對球面9000點4506負，runtime已接修。
- 臉 floor full/half 固定池候選已完成，root實看full效果不足。front-ray-v15-preview 是另一獨立精確前方triangle可見性候選，520020 ray 0miss、geometry不變；root實看無新大片孔、暗臉未解，未混floor。
- 精確runtime-camera ray更正：原內臉736點，v15貢獻807（803area/4detail），half384；早先512是保守sampled-z不是實際總數。原lit luminance .19298對候選 .12745，因此不得再宣稱整臉總點數不足。
- runtime opt-in lighting=source-rig 已以原key/fill係數、sourceZ=pivotZ-worldZ反射轉換固定world光照；lightclose=source 恢復原body近景1.28，diameter=source保持獨立。Root實看 front-ray-v15 +上述三optin，臉輪廓略清楚但原左下顎明線仍不足、髮偏亮、下巴1280×720約555比原520低。runtime續局部source feature/ray/幾何辨因，不能改相機牽動已對齊髮頂。
- builder explicit face/clothes缺檔已fail-fast且不建out，hash de0a5552374567406cf4572b1d8cbdce31ffa54ad8a1ead4630b590ab778cc61。完整同版整合仍等臉推薦，half最終未定；不得直接沿v15硬鎖half腳本套混合模型。
- 下顎位置已精確定位：runtime jaw-projection-v15.json 的來源面432474/394523/345464在近景相對原圖Y偏低32.23/36.36/51.80px，實際eye ray無遮擋。上左缺原圖覆蓋並非模型開洞；model jaw-miss-edge-v15.json 最近封閉silhouette source394377/394378，距原圖目標3.922來源px，1000×900偏右8.27/下29.92px。runtime正做保冠/頸的局部連續下半臉抬升与輪廓修正，仍未候選完成。
- Root已實看clothes-v43 angle270/head250 solid，領口厚度與內翻可保持，未見新明顯穿出；該preview舊頭髮比較base不可當臉v15形狀。Root currentCheck IAB1現在停此頁。
- face v16 下顎候選 geometry13275fcbc577641ad22c5b691c7428d9f7f208169e6bf5294f1b3f144f9e5215，jaw-align-v16-preview（standard）/jaw-align-ray-v16-preview（與v15同front-ray）；520018全池，無floor/half/衣43。Root1280×720 front實看下巴約510–520已改善、冠保持，270/head170 solid無明顯新頸裂/尖角。不能當A13通過。
- 新精確根因：v16真下顎抬升後，現bake仍以新world重新投原圖，原下顎線未隨面移動而滑到頸。jaw-projection-jaw-align-ray-v16-preview.json：原source259.56,261.57原命中432474→新miss；原394523/345464改命中386669/386398頸側。runtime/model正做v15 face/bary固定原圖來源UV綁定，隨v16真面移動，visibility仍新幾何；不依camera換圖，不混衣。
- source-bind-v16-preview 已建立：geometry13275f…/520018，points e3fde377…，相對jaw-align-ray-v16只6306點RGB改，變形區外逐byte同。Root實看左下顎明線延伸，仍未原版連續。runtime固定UV+current ray：左jaw217點對原195，但候選luma .172對原.327；右jaw515對原268、luma .240對.387。問題不是全臉總點少，是亮線相對採樣弱/暗面多。runtime正原圖feature-edge固定權重候選，保area與總detail預算。
- 尚待釐清雙鏡头：runtime指出v16 Y-only近景對齊但wide可能高18px，正同face/bary量測。model已接獨立唯讀Y/Z聯合位移可行性，不改幾何/相機/冠，先看合理尺寸再決策。切勿沿用近景改善宣稱A13首尾成立。
- face-edge-v16-preview 已建立：geom13275f…/points1acab2f3…；baseline320018 bytes不變、detail200000總額不變，原畫face edge ×1.5×2.4固定權重（head-detail-v3 SHA2bfb9d8…），detail face區1591→4660。固定v15 source UV+v16visibility，無floor/half/衣43。Root1280×720 source diameter/rig/lightclose t0實看：左下顎連線明顯較source-bind改善，眉眼線亦增，局部可保留；剩髮束/耳側緣最大可觀察差異。
- 双镜同点精算wide v16高4.08/2.55/2.62/13.70px；chin零誤差需Z後移.12063，不採，會破壞側形。A13幾乎一致非每個點零誤差，先修可觀察大差異、整體首尾實看再記合理殘差，不因數值自行停工。
- runtime續髮緣/峰谷，衣專員另接唯讀原圖2–3個髮緣缺口source座標支援；model段完成可followup接build。下顎與衣43保持局部推薦。最終全部U、同版review和主站03仍未完成。
- ear-flow-v17-preview geom9c25250a7d44b277388d7e895d83f85ebe59e04565ff7514ddc73b1c9f04b490、pointsacfd0cd2df9ae1f2594b3eef165e6aefdc8d6e7af8776253c9f041c216e85244，520018固定face-edge pool advect耳形，current17 exactfront+ref15UV，rear16 sampled限制記manifest。Root front/135/225 solid與runtime90/270對v16實看無新厚壁/頸裂；front髮尾長但鈍且短。
- runtime source458110/458441定位末端1000×900約290,495對原305,525，ear-tip-v18-preview僅末端下移約.016world、內收.007與漸細，保上段/冠/jaw；已交model geometry/GLB建成，正同點池advect，待完整後root front/135/225、runtime90/270分攤檢查。耳接近後固定，下一冠斜坡/髮束峰谷與新疏密，仍不採個點零誤差破壞體積。
- 衣唯讀髮緣座標：原557×941左耳外尖214,230下尾225,240；右上鉤440,126；右下弧436,151回鉤430,171。model-v10-clothes-hair-edge-readonly.md已交runtime，不新增貼條。
- ear-tip-v18-preview geometry47125b67deb1655a3257945ca16efb9e2f22dd8700c13ba6371e25597cf9294a，全520018同點池advect。Root front1280×720耳尾約415對原425，較v17漸細接近；135/225 solid無新厚壁/裂，runtime90/270同意。耳局部固定v18，不再盲拉長。
- 冠兩谷新精確定位：1000×900原411.78,147.38與454.77,132.41，v18輪廓y131.0665/114.7685，填平16.31/17.64px；主峰520原96候選98已近似。原front_detail z>.032門檻未涵蓋真輪廓z.015–.024。model crown-valley-topology-v18.json證明8/29相鄰面，非孤點。runtime已交crown-valleys-v19-preview兩谷最大.0095world連續下壓、主峰/耳/jaw固定0flip，正build固定原點池/UV，不混density。完成後root front、runtime180/270/斜側分擔。
- crown-valleys-v19-preview geometry692ecb7bfb218d7c3d9b049f2b96489d4292cef25ca73752dade3defae22e680：Rootfront峰谷恢復主峰保持，runtime180/270/225無新裂/厚壁但270兩淺溝仍整齊感，先固定geom試疏密。
- area-half-detail-v19-preview 360018=160000area+18supp+200000detail，22次固定baseline swaps保1929cells，所有保留點bytes和幾何不變。Rootfront填滿感降且jaw線保留，wide暗袖有體積；尚未最終比例接受。runtime續手/側面。舊half結論不套新rig/綁定/edge。
- sky負sizeK修復為SKY_SIZE_K=1，9000舊4506負，修後8角2294可見樣本正且等深旋轉一致，測試0。Root觀察新sky過淡/少，runtime續source palette/随机亮度/sky專屬點徑與球面視野數分離；guided原isSky覆寫vColor=aC，runtime先前誤稱被rig照暗已撤回，不新增假修正。
- Root1280×720 area-half wide vsbaseline：候選掌心高亮白塊、原front指輪廓更清晰/似較長；runtime正solid/weighted分辨光照與朝向，不能用舊手局部PASS或270近照代替front原姿態。已看270四指可辨/局部143°spin火掌保持，完整360仍待。另一手90weighted很暗，補uniform coverage。衣仍v4不是新衣43，最終共同版才評新衣/構圖底框。
- 持物手語意校正：palm_anchor是left-hand-repair-v2原source手，replacement right_hand_anchor是垂手。持物白塊證實front投影袖色污染（ROI2308點src11840，例final441551→原148,474袖白）。held-hand-material-v19只黑內部ROI校準過暗未採；held-hand-material-range-v19以完整22409px手套輪廓p10/p50/p99+原bake曲線改善，points3c2a87b8…，Root實看指緣有光但掌白線/姿態仍待。
- held-index-10-v19-preview geomaf144aef…/pointsbacd2b33…，只index10°/0flip/left交叉0，但Root solid整手仍短鈍比例不自然，不採為U03解。新分色診斷 held-hand-bones-v19-{0,270}.png證實index/middle朝相機，ring/little偏長且重疊，cap厚21–35mm。model正基於runtime提供actual portraitPoints五端、真semantic骨域做保掌腕的遠端曲率/長度/漸細修正；原端反解需降低部分指，撤銷『短就上抬』直覺，不沿單index試驗疊。
- sky=source palette/randomlight與正intrinsic原式已GPU驗，推薦stars=45000固定球共同版起點。9000前綴保留。Root前景IAB1280×720 perf90k body360018+prop3600:1061@1789010504061→5447@1789010529858=約170.02fps；9k1337@1789010570780→5351@1789010594388=170.03fps。屬隔離t12單樣本/可能顯示上限，非final性能PASS。另一Chrome空白RAF亦1fps證實節流，不採其性能推論。
- runtime共同交接 v10/face-runtime-local-status-v19.md：flags diameter=source&lighting=source-rig&lightclose=source&sky=source&stars=45000；尚legacy default/主站不動。body64/rig27/sky18/closegain GPU回歸通過，所有U pending。rear sampled/prop専屬legacy/底框/RMS舊fixture仍明列。
- runtime已再followup處理02舊fixture與控制必要回歸，保存RED不放寬閾值，依据固定source绑定/鏡頭契約做有意義替換；model持物手完成接受後立即合衣43+臉19+新flags同版整體驗證，不等所有微小殘差0才整合。
- 02固定送審snapshot runtime-review-02-v19-source-20260910，46copies+60hash refs，verify106檔0error；manifest e3824fd1da99dce271b435551bb33152f6974fccdea74fe4565f50b34effbdef。正式prompt camera-review-fable-02-v19-prompt.md。
- Root已啟動唯一Claude reviewer CLI（WSL Ubuntu，resume dad7dabc-e3c3-40e0-bf57-51b3b077b3d5，--model claude-fable-5-1 --effort medium）。events init實際model claude-fable-5-1已核，effort依CLI明確參數，runtime init未另暴露。exec session80760正在跑；events/stderr camera-review-fable-02-v19-{events.jsonl,stderr.txt}，未有結論。限02控制/renderer，不裁01造型/03或整體完成；single reviewer同时Spec+Standards用户已授权。
- 持物arc-v4數值0cross/0flip但ring表面皺，model不推薦；index/middle/little相對比例改善，ring防翻面step削掉目標仍.150對目標.128。model續只ring PIP遠端局部表面/截面修正保掌根/袖錨，不採數值PASS代視覺。
- Claude02審查已exit0完成，camera-review-fable-02-v19-result.md：控制/renderer Spec與Standards通過附建議，無blocking/important。連續播放逐幀可見仍證據不足（reviewer自己13時間點/19圖無pageerror只補抽樣，不是連續）。02尚不整票complete，合版補。
- Reviewer建議已followup runtime：FRONT_VIEW cy實視覺校準非fit（legacy RED主要cy變更，不純模型過期），改註解/說明不改相機；runtime.test用實際default keys；sky守衛真source sizeK/skyPointDiameter；連續/inspect覆蓋合版补。舊snapshot immutable不改，small amendment+新hash後同Claude定向複驗。verify-manifest舊C路徑WSL不可解但reviewer自行轉譯106hash全符，new verifier可支援Win→WSL。
- 手arc-v8 geom9b77efa6d4c00405e34e980fd5846aac0854a9cb65cc44efec5ec76e3d9ac720，point448a5676…，rootfrontsolid/weighted弧改善ring皺去；runtime90/270無新裂/尖/皺。held-hand-arc-v8-spin-qa/result.json：12.582sec6.9022rad，9門檻PNG全部實看prop完整/掌相連/pageerror0。可作共同候選，掌亮線/原手套差仍限制，不U03pass。
- model正在合衣43+face19+arc8手+range材質+360018固定pool：先核manifest，triUV同，手delta只加到未被衣碰區，overlap halt；face/baryadvect仅衣變區，原臉手錨保護bytes；ref15UV/currentcombined front，rear需重生成current至少同算法而非沿v16舊buffer，若known sampled空洞用既有exact接縫修；coverage缺cell先回報不暗重採樣。default/main保持。

## 共同候選 v3 與本輪接續狀態

- 三位子代理上階段皆已完成分工回報；Coordinator 已再次啟動 model 的衣帶點雲差異診斷與 runtime 的逐幀人物守衛補強，並持續驗收。
- combined-v3-preview：geometry f8e2f682990829d9f87fd0723cac4ea1d17eb1fddcfe86167c6a7df0f61f4af5；points 72593cf2d94f458106e0d33f9bfab02f9b77dce35001b627d9815aa147b93252；360027 點 = 160027 baseline prefix + 200000 detail。修正衣服誤用 v15 source lookup、補點排序及一點手腕材質漏套；幾何與 v2 相同。結構重建誤差 2.4756e-7，nonmanifold 0，weighted 1789 cell 全覆蓋。uniform 4 cell 僅 detail 已記錄，未為湊數另補。
- Root 已在 IAB 1280×720 實看 v3 同鏡頭 t12：material 衣帶為亮白連續面，weighted + source 五 flags 仍大片暗，尚不可宣稱視覺問題解決。model 正查 point/solid RGB、採樣與法線等原因；暫不跑已知缺陷版全套視覺 QA。
- combined-full-qa.mjs 原整畫面 brightSamplePixels>100 可能由星空單獨通過，不能證明人物每幀存在。runtime 正以測試專用 instrumentation 補人物守衛及人物缺失 negative control，不修改凍結 renderer。
- Claude 02 首輪及 amend1 審查均已完成 exit0。amend1 manifest a6fed2ec76beb42d2f6b78f47c729cc4858de7dd977a43e9f28558936fac441c，camera-review-fable-02-amend1-result.md：三項建議 CLOSED，Spec/Standards 控制及 renderer 範圍 PASS，無 blocking/important。實際 default keys、正值 source sky、FRONT_VIEW 註解/legacy RED 原因已複驗。連續同版人物可見與整體視覺仍 pending，01/02 尚未整票結案，03 主站整合未開始。

## v4 驗收抓到的後續修正（未結案）

- v4 points 4f32418dec8a3baa3f11e7d25f012c0a053ff510f82a846902fac837cf6a0d10，geometry仍f8e2f682…。衣帶RGB原本正確（點luma .792／solid .785），舊detail權重 .03164 vs current .76070；僅46872衣detail重新分配，固定160027baseline與其餘153128detail及4保底點。Root1280×720同鏡實看斜衣帶與右下亮布恢復可讀，屬局部修正，非U08 PASS。
- runtime對v4 source binding回歸RED126（78area+48detail）；同fixture v3亦RED238。model已確證v3 cm=world!=arc把數微米接縫位移當衣，誤把jaw face原source UV重新投影；不是fixture混衣領。v5正在使用固定face變形支持域保護原圖附著、恢復誤重分配點，保衣密度修正及geometry。
- v4全QA先保存17時間PNG；hidden selectOption timeout屬harness，已最小改DOM change/input並追加播放checkpoint，沒有假報96張。v4首尾原版／候選並排與疊圖位於v10/combined-v4-endpoint-reference。
- Root實際UI點播放v4看0／5.8／12，另讀time4.2／4.5／9.8／10.4。人物可見，不能稱人工逐幀全看；9.8髮頂部分出框、10.4火種在側面過早淡入，後者需按A06修正。
- A06已由runtime最小修prop由9.8–11.3淡入改11.3–12.0（最後全景camera已到位），不改keys/duration。prop-reveal-regression真舊RED exit1／新GREEN exit0，1131個0–11.3樣本零、定鏡段單調至1。待v5同版視覺與同Claude02定向複驗。
- Root與runtime實看v4首尾並排：細髮鉤/耳、近景衣領高度、持物手亮白厚關節與原黑手套、wide額外下身圖幅等仍不同，U08未過。待v5共同QA後逐項修，不放寬Spec、不以來源限制通過；03仍未解鎖。

## v5 共同 QA 與後續 A13 定位

- v5 points 527bb992df6858ffff88b1f427798b8cc842df18f24b69a66c3b3d67387e8242，geometry保持f8e2f682…；真face支持域188point/180solid RGB修正，582誤入face衣detail恢復並重新綁ref15。舊fixture剩86 RED由二維jaw框混入真領口造成：canonicalY .769590–.796835，face19-ref15所有頂點delta0，RGB=current衣lookup exact。runtime獨立核對後依固定face語意支持域改fixture，v5 1114真jaw PASS；v3仍RED62、v4RED40、原bad jaw-align-ray16 RED1001。old86RED與scope證據均保留。
- v5+A06完整QA result.json：258實際渲染畫格(0.017–12)、113 shots、9 spin、minBodyPixels39067、0pageerror。Root實看v5 t10.4無prop、11.65定鏡淡入；另看full90/270材質、180weighted、持物0/90solid、180weighted與垂手0solid/90material。非所有部位每角無遮擋之宣稱；已要求真正全模型入框固定scale41補四模式八角，原70近身圖保留。
- 隔離inspect原min60會阻止全模型入框，root已指派runtime把實際UI下限改20（預設值/產品camera keys不改），不用僅harness偷偷解鎖當UI通過。此小diff與A06、body guard待同Claude02定向複驗。
- 持物手A13根因報告 held-hand-v5-readonly-result.md：native UV白關節被range映亮，且arc8只擬截面中心未擬雙側輪廓。只材質候選 held-hand-interior-v5-preview point67bfebd49fe59b5d00a431eba73829d76129b2c770e5614e25e8ccc61ca78d68；4941point/2442solid RGB改，pool/geometry/normal/source全固定，用原圖掌內面與真亮緣分取色、固定掌錨法線面向混合。Root末幕實看大片掌白減少、指側亮緣仍在，可作局部推薦；model正接真指截面/指間負空間候選，不改v5、不重做垂手。
- clothes唯讀近景衣領診斷重現47px差：同真正領頂source430489、world(-.102703,.276633,.873573)，wide近原1.8px，front偏低47px。保持wide射線讓front吻合需Z .874→.721（15cm），不視為安全微調。正在查多語意near camera共同校準的可行性，尚不改相機或幾何，避免硬拉領子破側面。所有A13殘差仍未通過，03未解鎖。

## 02 amend2 審查與需補正證據

- 唯一 Claude CLI 同 session dad7dabc-e3c3-40e0-bf57-51b3b077b3d5，actual claude-fable-5-1、CLI --effort medium，exec7529已exit0。Snapshot runtime-review-02-combined-v5-amend2-20260910，manifest1011110b28b4768d4f7f9f4a36ed3cfb3a8f4942a779bf9bbc158a3abc54e94b；reviewer自行轉譯相對反斜線後394/394 hash符。結果camera-review-fable-02-amend2-result.md：Spec/Standards該控制範圍PASS、無blocking/important；01/U08/03未過。兩provenance建議：fit-head腳本與旧result生成版本不一致；negative使用v3需明列。
- Root核出Reviewer spin數學錯，不能沿用其『6.20>2π』：9張首89.2039末95.4004，差6.1965 <6.283185…，不足完整一圈。已指派runtime僅補自轉證據使從實際首張到末張超2π，保舊結果，新supplement再同Reviewer更正；不重跑無關控制/113圖。相對路徑verifier修只在新supplement，舊snapshot不改。
- Root另已實際可見UI播放v5新A06：t0啟動，4.5背轉、11.1正轉無prop、12全貌有prop；固定10.4/11.65複驗另列，非人工逐幀觀看宣稱。
- clothes-v44-combined-preview geometry c7f4d67e89a3a3916d2e58f638a649449cde15896748d636f09719db4ec6ed1d，小Y抬領最大9.93mm/760頂點。近景改善17px、wide偏6.3px；root看nearweighted/270solid/widematerial可作局部候選，維持幅度。near仍低約30px，A13待，v43回退/共同v5保留。
- held-hand-roots-v1半步、roots-v2全目標均保留獨立。v2geometry70d30fe7…/point2b45f017…，最大37.32mm、0flip/0cross但90/270指根S折不自然，model與root實看判RED，不推薦。正在將修正分散到完整指中心線與末端切向，不硬鎖舊tip姿態、不繼續放大局部root平移。單材質interior-v5仍為局部推薦。
