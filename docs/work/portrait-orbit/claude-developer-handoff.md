# Claude Developer continuation — user routing override 2026-09-11

使用者最新要求：修改也改用 Claude Fable 5.1 / medium，先不用 GPT-6 Astra，以節省 Codex 用量。三個 native Developer 已 interrupted，不得喚醒／再派 native agents。現在由一個全新 Claude Developer 上下文兼任唯一模型整合者及 runtime writer；既有 Claude Reviewer 是另一隔離 session，Developer 不得使用它。此設定優先於舊 AGENTS／brief 的 Astra/Sol 路由。不得自行派代理、變更模型／推理、重設用量。

專案 C:/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site；WSL /mnt/c/Users/leslie/OneDrive/文件/ChatGPT/奶茶流/personal-site。目前隔離 work/model-trial。基準main HEAD41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6，dirty main含使用者變更，禁止reset/cleanup/commit/push/deploy。原來源／失敗候選全部保留。

先讀專案AGENTS、work/model-trial/AGENTS、docs/work/portrait-orbit/{spec,agent-brief,user-regression-checklist,next-task-handoff}.md、Tickets01/02/03與必要planning/CONTEXT/ADR。舊handoff與指令中的模型路由以本檔及最新使用者覆蓋。讀Ponytail full：/mnt/c/Users/leslie/.codex/plugins/cache/ponytail/ponytail/4.9.0/skills/ponytail/SKILL.md。debug按需、不新建框架或安裝建模工具。可讀current-run-state.md最新段落獲完整歷史，不必重跑已閉檢查。

## 邊界及完成定義
目前01/U08/A13未過；02的相機/控制局部已有審查，03未解鎖。全部人物真3D、首near/尾wide須與原版幾乎一致，自然雙手/真掌星火與360，不能切卡片/刪真表面/浮動描邊/換人物/動態view RGB。固定點數、12mm掌錨、舊cut-loop XYZ/genus/zero-sign/所有normaldot都不是Spec要求，不創新pin。形體與動畫通過後才03。你本次先完成01剩餘與同版隔離QA，Ready for Review交Coordinator；不自我審核，不擅接03。核准一般修正直接做，只有缺產品/範圍/不可逆決策回報。

WindowsPython C:/Users/leslie/AppData/Local/Programs/Python/Python312/python.exe；已有offline uv Python3.13/numpy/scipy環境可沿最近.py。WindowsPlaywright既有capture .mjs會走Windows本機3004，WSL localhost3004不通不能誤判產品。http.server3004已開，別殺。優先同既有工具做原圖/候選同viewport1000x900或791明列、8角四模式、連續360與完整播放；所有截圖要自己讀必要全尺寸，不以數學代視覺。必要臨時圖程式重現scratch，不覆寫fixed review證據。

## 目前共同候選／入口
- combined-head105-hand73-clothes270-solid-preview及-bound-preview在v10/，geo5c8a570e8bb9225dccc58a2142a9f1945eb46520d2a279c1ce07e21f26494158。bound points e1b52512509e9142c862022071309e624cca3bc494786ea76fb07128c7698b37，344352/prefix154743；僅診斷未採。頭105＋手70geometry/73材質＋isolated44collar＋衣270新拓。
- 正確current入口 v10/combined-local-offset-v117.html?assets=./combined-head105-hand73-clothes270-bound-preview/&t=12&still=1&chrome=0&render=weighted&diameter=source&lighting=source-rig&lightclose=source&sky=source&stars=45000&spin=0 。near t0/solid可查。切solid/material/uniform/weighted；angle0/45/90/135/180/225/270/315，focus=head/hand/right-hand，scale170/250。
- 正式v10/guide-core.js v52 / guided.js ca3未改，v117獨立currentclosure支持meta localgrip .031957m、propbasis/pointCSS。v33入口仍舊c7近鏡，不能用來近景校準！wide/inspect相同。Root已更正此一次入口誤稱。
- baseline-reference.html?view=front|wide&chrome=0 原版實際基準；禁止raw photo投影當原actual shader相機。
- 新共同cloth UV/RGB部分仍推定：1427area+1042truefront；150unknownroot/cap neutral、581paired、208圖外續色明列，非完成。headear218/hair3944、handfront2723逐列bytes保，truefacebary max1.26e-7。

## 已收斂：手與掌物，避免重做
hand-review-fable-01-v73-result.md：同獨立Reviewer確認70自然geometry＋73材質兩軸局部無未解重要。H-S1 275群實134cuff+141glove，140/65均已控制；216自然殘差建議。H-M1『皆混舊』撤回，多白/暗是真原sameface dense，其他harmonic明列推定；weightedwide/0/90/270自然，不能把unlit白色皆當錯。H-D1不同基準close。73資產held-hand-dense-material-v73-preview，pointXYZ/normal/size同70，2723source RGB同，propanchor/basis同。180/315補看在held-hand-material-v73-completion/亦無新可見破綻。不要再材料版本/手整指位移。舊v5垂手保持，Root已看最新共同right-hand90/270自然，仍須最終point及8角同版驗證。

## 衣服剩餘與最新工作
1. 上B形已由舊方盒改善窄S；251/259消金下緣暗條，259雙微負(1–2.4µm)在clothes-review-fable-01-v264-result.md降建議。G1/S1完整壓縮揭露close，Reviewer撤600全過/RAW索引錯誤。完整live delta約346.999mm含舊下衣壓縮，勿說只微修。
2. 衣270恢復舊135/136→140 ambient box誤動的袖子；真袖163/209非零937點，與手之187衝突已解，三域交集0。新契約model-v10-clothes-evidence-v276/integration-contract.json（worlddc196cad…）；live18694、remove12710、1171newv2646newf。Root90/270素模平順改善。274聯集520找到4小根反側/overlap，278單因27v max.686mm改善四負，但對面402673新2/1待真接觸，勿全數字清零。結果model-v10-clothes-result-sleeve-v270-v278.md。共同目前仍270，未自採278。
3. 主要重要缺陷：90/270下方雙細桿/針叉。264 Reviewer標90 x301–340/y537–799及361–374、270x418–482/y537–799，Root實看成立。不是小sign。281半恢復ray曲率仍尖桥拒採，不掃係數。286原圖cyan76cut-loop落下方連續藍布內，不是自由布尾；74/66圖外不當位置pin。
   288完整保留native167/168+cap76/74修域2708面(2562old+146new)、真weld邊界155/9/4。167原1828面、168417面曾被舊12709上B域移除，不能假所有12709都是同一上B。289上藍source(320,780)到(440,883) currentfirstZ約1.0，(475,916)/(500,930)下167約1.125，斷差約130mm；但firstbody不自動真藍語意。290真共邊路徑333面1016mm繞底，直距259mm，非自然station。應恢復誤移除真下藍布／重選最小自然修補域，真前後兩壁接回完整藍布，不沉針/刪布/硬pin舊loop/genus。
   最新中斷時已有 model-v10-clothes-blue-restore-v292.py、-v293.py（03:51附近）；先檢檔完整、語法及evidence是否已執行，不能假定成功！原nativeagent已停，無人寫共同。
4. 衣領：新共同117/v52對原near1000x900，原左頂x245–310/y575–580近平，候選x235/y593尖頂後斜下；六source430797/430265/339634/339613/344858/344835後段有neck不能全灰線當rim抬。266/284/285有精確相機face/bary與crop。需真領rim前背/neck語意＋局部連續形修同near/wide，保新顎/耳接合與自然360。舊44px/21.63px/760v不是pin，尚未實作新領。
5. 右肩外小藍彎片：原wide約x650–690/y395–485，共同像灰三角。combined-right-blue-readonly-v121.json已反證非270漏刪：459原ROI中383hit皆舊保留face、76miss、0新B/cap，4554currentpoints全owner105 bytes同。因此既有形體/材質殘差，不追18285removed。可有界修原語意/真色，非直接gain。
6. 來源取样重要：combined-clothes270-source-plan原逆worldXY錯忽略portraitPoints reach/flutter；v119直接捕原採樣x/y修正，34518body XYZ/RGB/ID/CSS及baselinePNG byte同。1046ray不變，24舊標偏max56.7px。clothes核原sample30626/30788/31192/31430屬下層藍布不promote上B，餘1042已綁共同。correct頁combined-clothes270-source-exact-v119.html。不要再誤用world逆投影當原像素，不能首hit替部位。

## 頭髮／耳剩餘（獨立資產比共同105新）
- 103薄耳/側髮共享場face/jaw守，104原耳50真source+168area、105髮currentfirst3944，原near耳/冠/右環仍差。116使用115幾何重接3870髮source，未整合共同。
- 最新可保局部 hair-crown-material-refine-v120-bound-preview：保持116pool358690及原RGB/UV/size，前冠+4.93Y/−.72Zmm；120最小3face10v共邊細分，新增strictparent0。Rootactualnear主冠上提更近原，但native上弧/右厚環與近冠起伏仍差，不A13。119/120原側面无新長角/耳柱，不能全頭自然PASS。
- 118反證：fit sourcebary後每次强制currentfirst/wide0會抵消或反轉near改善。因此已可信真材料附著要隨真幾何移，near/wide柔性同評；只有跨錯語意再有據重接。勿把pool或12mm幅度硬pin。121–123整弧微修收益不足被拒，不再掃權重／微小版本，120保基線。
- 回耳最新124：v10/head-ear-lower-source-v124.png（Root已看）原耳103ROI綠色1000x900 y385–462；下方橘色至535混髮鉤/接頸，不是全耳，Root先前『原耳到465@791』應改為耳旁混合輪廓，不將耳拉到最底。真正C輪仍待改善，50已附耳點/其餘來源被hair/transition遮需分真GPU可見。保持薄耳自然前後皮/根部，不回55長角、86厚柱或染髮耳色。

## 節奏/回報
先用現有證據快速接續具體修正，不整批重做歷史測試、不用無窮只讀統計拖延建候選。建候選後自己看actual同鏡完整圖，失敗保反例、定位因果；fixedreview不覆。於docs/work/portrait-orbit/claude-developer-progress.md寫簡短checkpoint（當前工作/修改/證據/下一步），可在CLI文字輸出精簡里程碑讓Coordinator監控。實作與合併單writer由你全責，無native並行。做好Ready for Review時固定同snapshot/manifest與可重現證據交Coordinator；Reviewer不由你派、不自核准。不因完成一個小診斷就結束整票；如需Coordinator真UI或review可明確回报。
