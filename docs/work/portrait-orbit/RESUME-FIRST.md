# 恢復工作必讀：2026-09-12

## 使用者的不可遺失要求
- 原始星點圖 baseline-front.png / baseline-wide.png 是最高外觀基準。首尾須幾乎重現原畫，不能把局部改善當 A13 通過。
- 從 raw-integrated-r5 與已改善版本局部微調；禁止回素模整體重建或還原手／頭。素模顯示只用診斷。
- 重点：臉型、髮型髮流、手勢、衣服側背連續性、腿部露出比例、真掌心火焰、完整旋轉。
- Astra 6 medium 執行；唯一獨立 Fable 5 medium Reviewer。使用者授權可安全並行。
- 所有三張票仍未完成；主站整合尚未開始。持續到整合／驗證，額度錯誤則記錄真實阻擋。
- 保留歷史、未提交檔案及現有滿意的衣服、身體、星點；不發布、不自行 commit。

## 恢復時確認的真實狀態
- head-astra-r3 已 Ready；SHA manifest 95c101345abed5e8ad0e231d30deb50b48d29e73ea46b617e04af55c42f64dbe。移除壞 prefix 與 append，current r5 局部 3.93mm 調整、頭部 shader；髮流與首尾比例差距仍明顯，待 review。
- hand-astra-r2 已 Ready；manifest 530b92fc59381916be3e31834a9e471a75de25f5a65e88aa9ce558b3b34a0b1d。選小幅腕姿 b，大拉指版本已排除；拇指、彎指、袖口、星點輪廓仍未完成，待 review。
- camera-astra-r1 F39 已關閉，使用此相機。head2 F40 點 ID 保留已關閉；head3 處理 F41，待複驗。hand1 F37/F38 已關閉。
- Prop F32 仍待最終手型後修；A13 未通過，不准以大量測試代替圖片比較。

## 凍結基準與派工邊界
- 原始圖：work/model-trial/raw-integrated-r2/shots/baseline-front.png、baseline-wide.png。
- Head continuation thread 01a091f2-2bc7-75f3-9356-d751f49949e1，新目錄 raw-head-astra-r4；前版本全部只讀。
- Hand continuation thread 01a091f2-2c43-7840-b349-ee23459ecb67，新目錄 raw-hand-astra-r3；前版本全部只讀。
- Fable reviewer session c08239e9-d393-4c5f-b74a-3231d8f0db2c，唯讀審查 head3、hand2。
- Windows Codex CLI gpt-6-astra medium；WSL 舊 Codex 不支援此模型。Fable 經既有 WSL Claude CLI。不得擅自換模型。
- 先讀本檔，再讀各候選 result.md、最新 review result、current-run-state.md 最新段落；舊段落不取代新決定。
- 每完成／中斷一階段，更新本檔或追加 checkpoint，記錄 session、輸出路徑、證據、下一步，不只留在聊天。

## 此次啟動記錄
Head4 exec 33190；Hand3 exec 55074；Fable frozen-head3-hand2 review exec 39467。日誌 codex-astra-head-r4-*、codex-astra-hand-r3-*、claude-fable-review-resume-*。requested effort medium；後端推理強度未獨立揭露，不當成已證實。

## Root visual check during resume
Directly viewed baseline-front.png and head3 candidate-near-after.png at1280x720, plus hand2 comparison.png. Head candidate still narrower/elongated and hair flow differs; hand remains dark, palm/finger/cuff silhouette differs. This confirms A13 open. Brightness-only change insufficient; developers have separate geometry/style diagnosis tasks. No user approval sought or acceptance inferred. Current CLI sessions launched successfully and emitted work commands; no quota error observed in initial logs.

## Review result received
claude-fable-review-resume-result.md: F41 CLOSED; head3 and hand2 locally mergeable, affected vertices/triangles/star-ID overlap0. A13 still unmet. Head remaining hair FORM not only shading; hand thumb/curl/cuff. Reviewer idle. Camera thread resumed for bounded ticket02 control verification in raw-controls-astra-r1; no geometry/main edits.

## Next decision after current candidates freeze
Root original/candidate near and wide visual assessment: near head width fairly close but wide head/body proportion too small. Need a controlled coupled head-scale/neck-transition + near-camera FOV framing diagnostic if color-only head4 does not close A13. Existing mesh local proportion changes are allowed; don't distort single jaw landmark to force two images or assert camera vs anatomy incompatibility. Preserve A05 outward path and current body, original endpoints are actual image truth. This is a hypothesis to test, not approved new result or mandated blind scale. Fable frozen-head3 review explicitly says hair FORM gap not merely shading. Deliver these observations to Head Developer when current frozen result arrives, without rewriting mutable work.

## Root browser control check
CUA IAB tab14 camera-astra-r1 actualr5 asset cb1f177e/stars25113152 RTX4090. ClickPlay0→12 final fullcharacter screenshot verified. open_in_codex returned queued. Created reference tab15 visible=true but original tab continued; no verified actual document.hidden transition. Hidden behavior remains unverified (not proven product defect). Controls reviewer exec97068; logsclaude-fable-review-controls-*; controlmanifest96f995013850ec140c20f52e290ce6465be7f6bf72975b04bf0907278f86b6f1.

## Latest dispatch
Controls Fable review completed no importantfinding; localR04/A07 accepted, actual hidden remainsunverified. Camera Astra same thread now raw-proportion-astra-r1: frozenhead3/currentr5 coupled headproportion+camera endpoint controlledcandidate, independent from head4 surface material and hand3 gesture. No mutablecrossread. Preserve body/starIDs/full3D, no rawreset. Reviewer idle until next frozenReady.

## Important next hand instruction — avoid invented invariant
Spec requires real palm attachment, NOT frozen palm triangle XYZ/normal. Preserve triangle identity450950 and recompute barycentric anchor/basis on final mesh if palm turns/moves. Prior prompts saying protected truepalm must not prevent necessary natural palm/wrist orientation changes. User wants original gesture, so use physically coherent hand/palm rotation and articulated finger curl, not only small tip raises around frozen palm plane. Keep body's good parts, local wholehand may change as required. No rawreset. Deliver this clarification to hand next resume after hand3 freezes; do not retroactively call alreadyfrozen localstep bad.

## Hand3 frozen / review active
hand3 finished exec55074 exit0, raw-hand-astra-r3 manifest d1fc10f7c2ae4d28b871d0cf2f416d7da7375edb3577c66e6f7debe3703c42ae (462files). Fable review exec92202 logsclaude-fable-review-hand3-*. Root sawcomparison: morevisiblefingeredges butpalm/curl/cuffstilldifferent. Next hand4 must receive truepalmidentitynotfixedXYZclarification above, pluslatestreview. Head4 exec33190 andproportion1 exec69114 stillactive. NoA13acceptance.

## Latest proportion frozen / hand4 dispatched
Proportion1 Ready exec69114exit0 manifestbb9d073f49c101aefba9b0f0a37cc46482d5a0ffde6e63f7f4124ced1f2c1e15; currenthead3+hand2 baseline thenheadscale1.18+near/rearFOV+wide16.4pxdown. 3higharearatiotris noted, independentreviewpending. Hand4 exec6094 samehandthread newraw-hand-astra-r4; explicitpalmmaymove/turn, recomputeanchor450950, articulatedPIP/DIP andcuff naturalshape. Hand3 frozenreviewexec92202ongoing. Head4exec33190ongoing. NoA13/mainpass.

## Hand3 reviewed: actual rootcause
claude-fable-review-hand3-result.md noimportantfindings, locallymergeable. Palmnormal remains53deg fromviewer inr5 andhand3; originalreadsfront-facingopenpalm. Root+Reviewer agreeprimarypalm/wrist orientationbeforefingers. Hand4alreadyinstructed; readreviewwhenavailable. Newsubpixelslivertri480296 source-relativeonly, hand2-relative0opposed; noimportantdefect. Head4stillrunning. Proportion1reviewdispatched. Hand4streamreconnecterrors observed thenagentresumedtext; notquotaerror. Verifyongoingbeforeclaimactive.

## Head4 frozen / provisional combinedr6 active
Head4exec33190exit0, 268manifest a088862d010a13941f63152d6780118b82c5362369e2eabb1580d05e045f6eb2, 58inputhashes. FixedsurfaceUV/color/hairblend andlocalizedcrownflow16mm, noappend, no rawreset. A13stillunmet. SAMEheadthread now exec11756 raw-integrated-r6 provisionalcomposition frozenhead4+proportion1+hand3; correctoverlaptransform/Jacobian/pointwitness/attribute conflicts, no mutablehand4read, noF32/mainclaim. Head4independentreviewpendingafterproportionreviewexec29141. Hand4exec6094active. monitor-resume.py tracksintegratedr6,hand4,proportion1completed.

## Proportion review accepted / head4 review started
claude-fable-review-proportion1-result.md: locallymergeable noimportantfinding; realnear/wideimprovement, 3highareatrianglesnotvisibledefects; nearbodyROI249pxdifferencewithinheadsupport(notwholebodyzero). Fullgeometry+camera coupled; finalhead4sharedrowsmustrecompute. Head4reviewnowlogsclaude-fable-review-head4-*, soleFablemedium. Integrator11756 andhand46094active.

## Head4 review complete
claude-fable-review-head4-result.md: locallymergeable materialuseful/geometrymarginal, noimportantfinding. AdvisoryF42:1440vertexreferenceblend edgesjump>.5;885pointfields differfrombaryinterpolatedvertex>.1. Stars smooth no visiblefinalseam, diagnostictexcanhardhueedge. Fixsinglecontinuousfield orvertexinterpolationasneeded, preserveoriginalhairtexture. Integrationshouldreadreview andhandleoverlap/refitnear/rearonlyifactualcrownfitneeds. Nextbiggap front-leftflatwing vsoriginalfluffyupwardfringe; doshapeonexistingsurface notgenerictips/recoloronly. Facelandmarksneedactualcombinedcomparison, don'tblindlychoosewiden/narrowfromdarkarea. Revieweridle. Activeintegrated6exec11756,hand4exec6094.

## Independent clothing scope
CameraDeveloperthread01a091f9-7246-7c63-9baa-18bcdd379824 resumedexec23342 solewriteraw-clothes-astra-r1: frozencurrentr5/proportion1 baseline, lowerrobe/belt/loopdrape/torso volume towardoriginalSTAR andconfirmedside/back; protecthead/neck/collar andBOTHhand/wrist/cuff/forearm, preserveE2materialandoriginalIDs. No mutableintegrated6/hand4read. Revieweridle. Monitortracksintegratedr6,hand4,clothes1. Need eventualhairFORM correction aftercombinedr6 freeze; notforgotten.

## Hand4 frozen for review
Hand4exec6094exit0 manifest0ad604897e5753c2e65e41c1c395bf9965392874c4c6e3c0a598f003a7e87880(299). Palm20deg/currentanchor40.66degvs51.58usinganchor-eye definition; don'tmixReviewer53globaldefinition. Middleupright/errorworse, fingerthickness/curlstillopen; 34compressedcuffedges<.5, noNEWcrossings. Reviewlogsclaude-fable-review-hand4-* active. Futuregeometrymayadjustfingerlength/thickness ifphoto-supported/naturalanatomy; preserving source dimensions isNOTSpecinvariant, avoidinventedconstraints. HandDeveloperidleuntilreview/freeslot. Integrated6exec11756/clothes1exec23342active.

## Living coordination docs vs frozenproductinputs
This file and current-run-state.md are LIVING coordinationrecords peruserrequest. Historical inputhashofthisfile recordswhatwasread, NOTrequirementthatcoordinatorstopupdating. Productasset/code/reference manifests remainfrozen. If strictfrozenrequirements needed save snapshotcopy insideowncandidate; never rewritehistory orclaimmutablecoorddochashstillmatches. Integrated6 found286upper-shouldersupportvertices<=2mm exactlysameproportion1delta, notnewcomposition; reporthonestly and reviewactualimages. Activeintgrator hastransientnetworkreconnect aftersuccessfulchecks; verifycontinuedlogs, notquotaassumption.

## Hand4 review complete; fresh Developer hand5
claude-fable-review-hand4-result.md locallymergeable smallnetgain, noimportantfinding. Palmnormalforward53→42.8, anchor-eye50.6→40.9; middle/indexMOREupright, notfullgesture. Nextjointpalm/MCPflexion+adduction+webrespacing andslenderer/longerphoto-supportedmiddle/ring; sourcefingerlength/thicknessNOTinvariants. FreshAstra6MEDIUM CLIexec14834 (newcontextnotmodelchange) writesraw-hand-astra-r5 (NOToldfailedraw-pose-hand-r5). Fullpromptcodex-astra-hand-r5-prompt.md. Readresultforfutureexactcontract; no mutableintegrated6/clothes1reads. Originalhandthreadidle. Revieweridleafterhand4. Activeintegrated6exec11756,clothes1exec23342,hand5exec14834. NoA13/maincompletion.

## ACTUAL REVIEWER QUOTA BLOCK — 05:33 Asia/Taipei 2026-09-12
Fable dispatch claude-fable-review-r6-clothes1-* exited1 beforetools: API429 sessionlimit resets07:30amAsiaTaipei. NO r6/clothes1 review performed. Do not switchmodel/session to bypasslimit. CurrentuserexplicitFable5medium Reviewer. Prior validreviews: head3/hand2,controls1,hand3,proportion1,head4,hand4. NoA13/mainpass.
Frozen integratedr6 exec11756exit0 manifest2e2ceaa6e6d4a0bb6e992f9d6170eb75a56815781afede1a3ebe4d2f1da7436e(191files121inputs), merged45f7547c...,stars5fc88f18...; currenthead4/proportion/hand3. Rootviewednear/wide stillhairwing/face/hand/robe gaps. Clothes1 exec23342exit0 manifest63149910c5e6d65efd20a97c6b296ac0182260ca634c729e03b317eeac14458a, LEFTdrape45pximproved, rightfailedretracted; E2/armsprotected.
ACTIVE coding (noAstraquotaobserved): freshhand5 thread01a09260-adea-7a31-8f63-132f55157add exec14834 raw-hand-astra-r5; freshfringe1 exec86154 raw-fringe-astra-r1 fromfrozenr6 existingheadFORM; clothes2 samecamera/cloththread exec31948 raw-clothes-astra-r2 connectedright-ribbon/waistfold. AllAstra6medium, no rawreset/mutablecrossreads. Oldhead/integratorthreadidle. Occasionalstreamreconnect recovered.
Next: completeactivecoding, RootactualcombinedUI, freezevalidoutputs; Fable reviewpending r6+clothes1/newoutputs afterquotaallows. F32propfitafterfinalhand; actualA13stillunmet/mainnotstarted. Do notdeclarecompleteorpretendrevieweractive. RESUME-FIRST/current-run-state livingdoc hashes expectedtochange; assetmanifestsremainfrozen.

## Root actual CUA r6 UI — new transition framing issue
CUA combinedQa tab16 IAB, visible requested; runtime GLB45f7547c/stars5fc88f18 RTX4090 verified. ClickPlay0.16→12 completed actualfullfigure screenshot. Seek5.5 back headshoulder/collar visible, nape connected. Seek4.35 actualside transition: HEAD TOP CLIPPED by viewport top at1280x720. This is productsequence, not inspectioncamera. Notfigureblank, but needs framingrepair afterfinalhead; don'tclaimA04visualcomplete fromnonemptycoverage alone. Need temporalFOV/shift framing withfixedXYZ andsameoutwardradius/rotation, preservefirst/last; do NOThidebyfastmotion. Rootcurrenttab16time4.35star. No newuserapprovalneeded: withinexistingcamera/visualtask. Actualall8anglesstilldeveloper evidence; Rootwillrecheckfinalcandidate.

Rootclip evidence also exists in frozen raw-integrated-r6/play/turn.png (viewed directly; head reaches/crosses y0), supporting CUA4.35 finding. Finalcamera framing repair must use currentfinalhead, not just raiseallbody or changefixedXYZ. Fringe freshthread01a09264-f0b7-7502-8d63-9839e371b0fe exec86154; hand5fresh01a09260-adea-7a31-8f63-132f55157add exec14834; clothes2exec31948 same01a091f9thread.

## Optional next high-leverage head linework diagnosis (not implemented)
Original STAR uses image edge/feature-weighted point construction, current raw surface uniform-ish pool produces different head linework. After fringe geometry freezes, a bounded HEAD-ONLY surface sampling comparison may test original reference weighting or original star screen-ray samples attached ON existing full3Dmesh (actual triangle+bary), static throughorbit. This is withinR02/R03 construction, not rawreset/card/overlay. Never per-angle XYZ/color reassignment or floating reference strokes. Preservebody/unaffectedpointrows; 600k count and everyHEAD samplingID are technicalhistory, NOT userhardinvariants; previousF40 objected WHOLEBODYrandomresampling. Any localheadresampling must be explicit, fixedasset, fullside/backcoverage, independentreview, and actualnear+wide+sideimprovement beforeadoption. Preferminimal controlledweighting first; do not speculatearchitecture/mainAPI. Currenttaskfringe remainsunchanged.

## Fringe1 frozen, framingbugfixdispatched
Fringe1exec86154exit0 manifestf78881693b783a835169f64dab98f976b5d371ef96c56843429ae283006d81f6 GLB1d83bd4e388055440ac878e9c609feea32d89b28c9a403a664158850d5262e38. NoReviewyet, nearleftfringe/crestmovescloser, somewideborderworse, 24facesarea<.5min.447. Newcamera-onlyframingtask sameoldhead/integratorthread01a091f2-2bc7-75f3-9356-d751f49949e1 raw-framing-astra-r1 repairsactual4.35headcrop usingfixedr6/fringeunionbounds, smoothzeroendpointFOV/shift, preserveA05andmaterials/XYZ. Freshfringethreadidleforlaterheadpointpatterncontrolleddiagnosis. Hand5exec14834/clothes2exec31948active; Fablequota07:30stillblock.

## Clothes2 frozen / contact repair3 dispatched
Clothes2 manifest3dd92e9be976a51e24ae0a0cf5113f5c3020df3f2f07d508972f129193f95633 GLB0a136caab67dff885573c5af950b5a077c56319f987d73afccfcbd7580dc3fb3, right edge924→888 original845, left/near/rear preserved. NEW strict crossing103910/103939 remains; no acceptance. Same clothes Developer resumed raw-clothes-astra-r3 to fix connected contact strip before further fold strengthening. Fullprompt codex-astra-clothes-r3-prompt.md. Framing1 andhand5 stillactive; Fable quota07:30, current05:58.

## Root framing actual UI verification
CUA framingLive tab18 raw-framing-astra-r1/vis.html, GLB1d83bd4e stars138e5f75 NVIDIA4090 verified. Actualseek4.35 shows clear topmargin; originalcrop fixed in loadedcurrentfringe candidate at1280x720. Started actual0→12Play. Pageindex.html404 was prepackaging name mismatch only; vis.html exists. Framingcompletefreeze/independentreview pending. Clothes3 developer reports newcrossings0 across60856tri, inherited1 retained, local655vertices2.93mm. Actualproof stillbeingpackaged. Do notclaimallclothesapproved.

## Framing frozen / headlinework dispatched
Framing1 manifest253128b434d2074915ed83b87d56532e319b35f10f1111a1dce698d10c6f31ae. RootactualCUAtab18 4.35crownmargin andPlay0→12verified; Fablepending. Freshfringethread01a09264-f0b7-7502-8d63-9839e371b0fe resumed raw-head-linework-astra-r1, onecontrolledHEAD-onlystaticreferencefeatureweighting/samplingtest onfrozenfringe1, preservefull3D/body; fullpromptcodex-astra-head-linework-r1-prompt.md. No rawreset/newanatomy; A13stillopen. Hand5/clothes3active. Oldintegratorthreadidle readycomposeoncehand5/clothes3frozen.

## Hand5 frozen / propfitdispatched
Hand5exec14834exit0 frozenpreviewa84e9602166287c147b85d6ec23d396396df94c97507a1216b9885e1092bea31 hand52509ce...; actualpalmface42.53→24.53deg, anchor-eye40.66→22.88. Newcrossings0. Stillindexdeepbend/thumbpad/pinky315crease/cuffbrightness, noU03/A13pass. Cumulativehand-r5-current-r5-delta.npy includes1..5, useoneonly andmaskednormals. Samefreshhandthread01a09260-adea-7a31-8f63-132f55157add nowraw-prop-astra-r1 truepalm450950F32naturalfit/ownspin fromfrozenhand5, nohandshapechanges. Fullpromptcodex-astra-prop-r1-prompt.md. Headlinework1/clothes3active, integratoridleuntilclothes3freeze. Fablequota07:30.

## Clothes3 frozen / integrated7active
Clothes3exec44057exit0 GLB8c1758af04fc833e0acb2b940a5fb3ac785d6ad238f6becee82d9837b5b9674c stars0908e17a34a1ab71df01eb025cc8efe444c6a05fa16c1cc3f4af50216d826ca8. Target103910/103939fixed,newcrossings0,inherited90907/90915retained. Near/wide/rearpixelidenticalr2; r5cumulativeclothes1..3masked32343rows. Fablepending. Oldintegratorthread01a091f2-2bc7-75f3-9356-d751f49949e1 resumedraw-integrated-r7 composefrozenfringe1+hand5+clothes3+framing1, no mutableheadlinework/propread. Fullpromptcodex-astra-integrated-r7-prompt.md. Bewarefringecumulativedelta containsOLDhand3, do notdoubleaddhand5. Activeheadlineworkexec25452,propexec6124,integrated7new. Clothingthreadidle. Main/A13remainopen.

## Root nativeimage recheck original vsfringe1
Directlyviewed1280x720 originalbaseline-front andfringe1candidate-near-after. StillclearA13gap: originalleftuppersecondaryhaircrest fuller, originalfrontfringe layeredcurved downward; candidatefrontis broadflat/diagonal sparsecap withrightprotrusion. Face/neck silhouette and collar/shoulderplacementdifferent; candidateleftshouldertop noticeablyhigher andcollar larger/differentshape. These arevisualobservations notexactanatomicaltargets; don'tblameallgap onheadpointdensity orusepoorjawlandmark. Headlineworkonlycontrolledstaticdensitydiagnosis; likelymorelocalshape/collar/shoulderworkafterfinalcombinedcomparison. OriginalSTAR remains authority. MainintegrationgateNOTmet.

## Headlinework1 early decision (awaitfreeze)
Developeractualstaticopacityfield worked butnooriginalfinehairflow; side/backmoregrainy. Semanticheadmask erroneouslyincludedleftcollartip, correctednonheadpixel0. TrialREJECTED, preservefringe1. Awaitfrozenresultbefore nextsurfacepointplacementdiagnosis; don'tmergeopacity justbecausefieldworks. Originalimagefeature-weightedONsurfacefixedsampling permitted technicalconstruction; nofullbodyresample/card/viewangleassignments. Activeintegrated7exec10084,propexec6124,headlineworkexec25452.

## Integrated7 / rejectedlinework frozen; nextheadsurface anduppercloth
Integrated7exec10084exit0 manifest2851b777e2bceebfd4409f48fbb9f4a638badcb17495867ca9df9c2a40f3bf48 GLB715f3bea1a75a45724eeb797676d317a3da056d0f27225269d97c34360c69258 starsb8e8604c2772babb447814ded8400e4d8f44d6f6be0215537755fdd89636fe86. Frozenr7 newcoherentprovisionalbase, noA13/Fablepass. Rejectedlinework1manifest50994b157b21ec689fff720a4cd259280b9591e526f02ed35c9e2fdae1d236d4; defaultkeepsfringe, don'tadoptalpha. Headthread resumedraw-head-surface-astra-r1 exec85519: oneoriginalreferencefeatureONactualmeshfixedsampling/fieldtest, nofloat/card/peranglechange, bodypreserve. Oldcloththread resumedraw-clothes-upper-astra-r1: r7samecamoriginalshoulder/collar calibration, protectskinhead/neck/bothhandsforearmscuffs/lowerclothes. Fullprompts codex-astra-head-surface-r1 andclothes-upper-r1. Propexec6124stillactive onhand5; integratoridle. Fablequota07:30stillpending. Rootnativefullr7UIcheckstillneeded.

## Root r7 actual UI
CUA r7Live tab19 index.html exact715f3bea/b8e8604c RTX4090verified. ClickPlay0→12completed actualstatusdone. Seek4.435rejectedbyrangeinputstep(notproductbug), seek4.44succeeded withvisiblecrownmargin. Thisconfirmscorrectcombinedassetandactualknowncropregression; noA13claim. Rootviewedcurrentprop1candidatehand/wide provisional: clearancepossible butnaturalcontactstillunderDevelopercheck, do notacceptsolelyzeroinsidecount.

## Currentheadsurface diagnostic early result
2068headrowsreplaced,597932unchanged; originalheadrays1025missmodel,1913outsideconservativeheadmask omitted (NOTall1913proofgeometrymissing; maskmayexcludevalidlowerface). Keptactualsurfacehitsfixed; nearscreenmatched butwide median7.65pxdifferent. Thisiscurrentfixedgeometry/camera mismatch, NOTproofA05/A13incompatible orglobal3Dimpossible(F35alreadyretracted). Needactualfinalimages andcauseanalysisbeforeadoptingornewgeometry/camerafit. Preserveoriginalreference andfrozenr7. Prop1candidateclosercontactmax6gaspoints1.85mm vsplaceholder21.55mm, crown0, alternativezeroinsidekept; ReviewF32pending.

## Prop1 frozen / hand6 next
Prop1exec6124exit0 frozenmanifest7a48e783...0cb161c (getfullhashfile), placementscale.36/palmbasislocal[-.027045,.028,-.022337]+worldY.035, worldYspin.55radsec mod2pi. Crown0inside,gasmax6/1.85mm vsplaceholder506/21.55;62insideobservations/24of72phases, F32pendingnot0contact. Shaderrevealcommentbugfixedandactualpixelon/offverified. Actualsourceexactweldboundary0/nonmanifold41, notoldapprox112/66. Samehandthread nowraw-hand-astra-r6 indexhook/thumbshapeoriginalfitfromr7, preservemiddle/ring,palm450950/wrist/cuffscopeandprop1unlessconcretecouplingneed, no globalinvariantclaim. Fullpromptcodex-astra-hand-r6. Activeheadsurface85519/uppercloth46229/hand6new. Head-surfaceearlyREJECTED(noadopt), awaitfreeze; nexthead materialmappingandhairshape diagnosisneeded, notA05/A13impossibility.

## Headsurface rejected frozen / referenceUV repairactive
Headsurface1manifest a202557071757e80b0fd352b70e7b5498a695c1be15b47383ca912afb52146c3; NOTadopt. FinaldiagnosticcorrectedROI:915miss/2023maskoutside (oldearly1025/1913wrongaccelerationROI). LeftfringeROI552refsamples235miss;crown1189/240miss. Innerface1009allhit,396acceptedbyconservativemask, noallfacegeometrymissingclaim. 2068mappedpointnearaccurate,wide7.65pxmedian;813activehairUVmedian15.386platepxmisregistration. Nextsameheadthreadraw-head-reference-astra-r1 staticreferenceUV/coloralignmentcontrolledcomparison onactualsurface, noopaque/card/perangleXYZ,color. Fullpromptcodex-astra-head-reference-r1. Hand6exec43659/uppercloth46229active. Prop1frozenpendingReview. A13/Mainincomplete; F35incompatibilitynotrevived.

## Uppercloth1frozen / headFORMactive
Uppercloth1exec46229exit0 GLBa3389bc557cfa904d1cf7e465179f6f78103150f998977c454a6b889f9b8bfe8 starsb2efb41c9cc45a29ca9ecb2d8590e11dbf1d8ab272f9d9b2215c82b0bd1d7561; manifest.json/manifest.sha256differentformat. Leftshoulderfield5464vertsmax27.8568mm y.720053-.834937, originalnearstar509 current440 new504; witness444.6→508.9. CollarNOTmoved(originaltop459current455), thickness/widthstillgap. Delta-vs-r7andnormalmask applyONCE. Historicalheadsupport532verts/1416facesoverlap actualcloth; DON'Toverwritewithwholeheadsource. Truehead/neck/hands/lowerclothunchanged. Newcrossings0, localstrainminarea.4158 disclosed. Rootnativeimage confirmsnetshoulderplacementgain, Fablepending. Oldintegratorthread01a091f2-2bc7-75f3-9356-d751f49949e1 nowraw-head-shape-astra-r1 actualleftfringe/crownFORMrepair fromr7 verifiedmissmaps, protecty<=.88/uppercloth, noappend/rawreset, fullpromptcodex-astra-head-shape-r1. Activeheadreference25855,hand643659,headshapeNEW. Cloththreadidle; latercollarcalibrationstillneeded.

## Concise active handoff
Read docs/work/portrait-orbit/ACTIVE-HANDOFF.md FIRST forlatestcompactstate/activeCLIids/userconstraints. Thisfilekeepshistory. Active25855headreference/43659hand6/61066headshape; Fable07:30quota, nofalsecompletedtickets.

## Latest06:49
Headreference1frozenREJECTED b71739430ca2383c932c6df93819451800339316d3d56c9a2e9856915a436e16, UVfixed.060px butonly343pointsmajorityblend/doublelighting remains. Oldclothes threadnowraw-collar-astra-r1 fromfrozenupper1; activehand643659/headshape61066/collarnew. SeeACTIVE-HANDOFFlatestappend. Fable07:30pending, noA13.

Hand6frozen; nowhand-look1samehandthread fixedhand6readabilitydiagnosis viaexistinglocalhandweight/normal-lightseam, notnewgeometry/globalboost. Activecollar80416/headshape61066/handlooknew. SeeACTIVE-HANDOFFlatestappend, reviewquota07:30stillpending.

Latest: headshape1frozen(newGLB057b3632) usefuloutercontourbutA13open. Activehead-front1 coherentstaticfrontSTARonnewshape (notthreepreviousrejectedfields), collar80416,handlook57933. SeeACTIVE-HANDOFFlatestappend/fullcodex-astra-head-front-r1-prompt.md. No maincompletion, Fable07:30.

Latest collar1frozen; integrated8nowactive fromallpositivefrozenheadshape/hand6/uppercollar/prop onr7. Headfront77031active; handlookrejected/idle,clothidle. OnefreeReviewer slotawait07:30. SeeACTIVE-HANDOFFlastappendandcodex-astra-integrated-r8-prompt.md.
