# Coordinator follow-up for next Developer checkpoint
Read work/model-trial/clothes-review-fable-01-v301-result.md (same independent Reviewer). Visible side needles CLOSED; collar local shape accepted. Important unresolved S-296-1: new winding inversions/overlap in v296 tail, most outsideframe, uncertain visible45/315 impact. Do NOT blindly accept numerical count as Spec violation. Reproduce smallest visible distinguishing evidence and fix actual material/surface degeneration if confirmed. Avoid 45minute brute allfaces alltriangles scans; use spatially accelerated/cached or a few visible anomalous representatives, real UI first-hit coverage/brightness/normal and depth evidence, then targeted safe fix. Prior reviewergeo4 fullvisible scan was stopped for excessive runtime; completedgeo2/geo3 evidence stands.
Developer can inspect same fixed review sources; no mutating review snapshots. v318 currently independentreviewed, await findings. Main root actual UI311 playback observed0.15/3.9/9.58/12s, personpresent/endwide; sparseframesnotfull360/video proof.

Second local review now complete: work/model-trial/clothes-head-review-fable-01-v318-result.md. No important findings on311/315/318; hand2723/2723bytepreserved. Recommendation C-311-1 visiblefirsthit of233shoulder normalflips/85head flips unknown (not zero-count mandate), retainedshoulder5616RGB rows rebaked disclosed, document. S-296-1 still pending. Preserve achieved hand/camera and acceptedlocal improvements; finalmaterial/left hair/ear remains.

Root actual CUA sameviewport1000x791 wide324 vs baselinewide: newleftflap fills missing silhouette, but belowcuff around x285–435/y556–630 it is white/bright and broad, original corresponding extension is mainly dimblue/dark. This is concrete regional material/brightness discrepancy, not merely count/density. Near318 collar remains muchdarker/sparser than original prominent lightcollar, and candidate centralface darker. Compare same UI snapshots/sameregions, don't globally brighten or change handacceptedmaterial. Finaloriginalalmostsame not yetmet.

Reviewer324 final now ready: work/model-trial/clothes-review-fable-01-v324-result.md. Flaptruecurved3D acceptedlocal, nohead/hand/samplingregression all344278oldbytespreserved. BrightROI confirmed original2488foreground,p50lum.44,>0.6bright12.8%;3243305,p50.50,bright32.6%, notfixedbysize242to158. Keepmaterialfix. F3201recommendationattachmentinterpenetration:328oldvertices/1012faces inside10mmflap nearseam; visibleissue notseen, don'tautopassifsolidseamfails. Playbackactualprobes263/266/time0–12/theta0–2pi/bodypresent acceptedlocal; NOpropfullspinevidence yet. Lefttuft15px correctionaccepted. S2961stillimportant pendingwallorderfix. Readlatestreviewinboxatnextcheckpoint.

Root viewed model-v10-clothes-evidence-v347/near-collar-crop2x-original-324-348.png:348 leftcollar materiallybrighter/improved; originalstrongouterrim stillmissing/weaker. On RIGHT collar original wide flared collarwing brightgoldouteredge, candidate remains narrow verticalneckedge. This looks like visible surface/shape/occlusion difference, not merely gain. Please compare actualsamecamera facebuffer/islands to restore faithful collarwing without touching acceptedhand/camera or blindlypaintneck. Use sourceimageactualpointssemanticchecks. Developer already investigatingrightcollar rowcomposition; this is corroboratingcoordinator observation.

Reviewer349final work/model-trial/clothes-review-fable-01-v349-result.md nowready. S2961 downgradedIMPORTANTtoRECOMMENDATION with42/167knownresidues and <=7pxvisibleface; nofullzerosrequired. Dataadvection correct max0.0001mm reconstruction,10204rows onmovedfaces correct; README344278allbytespreserved FALSEwording:332159samebytes,12119correctlyadvected. CorrectprovenancewordingnewREADME notfrozen349. Hand2723/2723preserved. Realplayback/clockprop>2pi supported; auto-orbittrace spans344.5deg (14.5to359) plus12sthetafull2pi. Source3306ID/RGB notindependentlyverified yet. F3201recommendationretained. Rightcollar/cuffstillDeveloper-owned. Reviewerclaimswideendpointoverlaydifferentcamera/framing frompairappearance; treatashypothesis, verifyactualviewport+camera+timestamps+originalsampleprojection beforeacceptingframingexplanation. Rootearlierformal52widecalibration fixed, pose/material differences canlookframing; no casualcamerachange. Need accuratecomparison metadata.

Root actual CUA360 near1000x791: rightcollarwing nowclearlyappears/flared andcloseroriginal. LEFTcollarupperpanel x270–350/y505–593 isdarkhollowrectangle boundedbyrim, originalsamepanel had densepale-purplevisiblematerial andbrighttoprim. Belowleftcollar y595+ material brighter, but upperpanel remains visiblemismatch. Verify actualsurfacefacing/firsthit/sourcepixels notjustregionalmedian overwholecollar. This observation is fromlive117/clothes360/t0/sourceoptions, originalbaselinefront sameviewport; userA13notpassed. Nextcheckpointreadthis.
Root read-only wide projection check:
baseline-reference.js renders original source.slice for view=wide, using baseline-shaders.js:
depth = 3/max(.8,3+p.z); fit=min(1,aspect/.62);
clipXY=(p.x*depth*fit/aspect,p.y*depth*fit).
Formal guide-core.makeKeys wide t>=11.3: theta=2pi,elev0,target=(0,0,pivotZ),radius=3-pivotZ,focal3 => eye=(0,0,3), right=(1,0,0),up=(0,1,0),back=(0,0,1).
117 frozen guided ORBIT uses the same fit and clipXY, depth=3-z_world.
Thus with the original-to-world z sign reflection, projectors are algebraically equivalent for unclamped body depths. Original portrait-points depth is -.22*(1-exp(...)) plus pose0 reach/flutter; depth divisor is far from clamp. Difference .8 vs .5 does not explain body framing. The SAME viewport/aspect and source projection must be used; candidate material/body silhouette can differ despite identical camera. Do not change accepted camera52/wide framing merely because bounding boxes differ. Investigate actual model/body-point rays and tails/cuffs silhouette for U08/A13 after metadata checks. Original renderer near portraitView transform is separate and already calibrated52; this conclusion is specifically baseline wide vs117 actual t12, not inspect angle0.
Evidence source files read by Root: work/model-trial/baseline-reference.js,source-lib/baseline-shaders.js,source-lib/portrait-points.js,v10/guide-core.js,v10/guided.js;117 freezes corresponding runtime. A per-point runtime numerical check may refine, but photo bbox alone is not proof of different cameras.

Reviewer360final nowwork/model-trial/clothes-review-fable-01-v360-result.md. Localnoimportant: rightwingfacepixels2597unchanged,wing207to4811; nohand/headregression. Source5567ID/RGB5567match/noface9; viewport+54.5correctionverified0px. M3601recommendationREADMEfalseeachsizeK:all5567size158constant, correctwording. CuffRGB8521allclothart0/cont0/weight0, actualart2723/cont5640/material8640/interior4807bytepreserved. Newcuff2576samplesadddensity identified; thin/resamplevalid realcoverage not deletesurface. Dataall352194baryreconstructionmax.0001mm. Leftupperpanelremainsmissing/dark. Reviewer formally RETRACTS widecameraexplanation: sameprojection, widecandidateoverallbigger/lower is shape/distribution, A13needsactualwholebodycomparison. Projectionequivalence taskv7 alreadyrunning. No Reviewer currentlyrunning.
User asked toseeprogress/fullrotate. RootshowedFROZEN360withcontrols currentChecktab4, browser1 visibilitytrue, clickedPlayandmarkDeliverable; do notnavigateorchange this user's viewingtab. Continueindependentnewversionwork; originalobjectiveunchanged.
Root analytical viewport mapping reminder for v7 current diagnosis:
With fit=1 at aspect1000/791 and1000/900, screen pixel offset from viewport center is H/2 times projected world coordinate (x also H/2 because width/aspect=height). Therefore identical original world sample at 791 to900:
x900=500+(x791-500)*900/791
y900=450+(y791-395.5)*900/791
NOT x unchanged / y+54.5 alone. Equivalent reconstruct normalized projected sx=2*(x791-500)/791,sy=-2*(y791-395.5)/791 directly using sourceviewport. Reviewer360's zero error to +54.5 only validates chosen binding rays, not actual baseline renderer acrossdifferentviewports. Your current mapping test should identify this.
Also baseline count dynamically depends on ph=min(H,W/.62):791 and900 generate different body counts (source34518vsdifferent900), so exact pixel equality to a newly resampled900 baseline not guaranteed even withcorrectprojection. For perpoint validation use same sample world + original shader camera and viewport, or fixed same originalpool read-only QA render. Do not change formal camera.

## New user visual feedback: six screenshots of frozen clothes360
Read docs/work/portrait-orbit/user-feedback-2026-09-11/image-1.png through image-6.png.
User explicitly identifies: (1) oblique view very problematic; (2) back lacks readable lines; (3) side face strange and clothing insufficient; (4) visible discontinuity; (5) locally too loose/sparse; (6) strongest diagnosis: overall anatomy/structure strange, clothes too far behind body.
Treat as current unresolved visual acceptance evidence, not optional polish. Investigate actual solid geometry, head-neck-shoulder-torso/clothing alignment and continuity FIRST; distinguish geometry gaps from dark/undersampled material. Do not only optimize frontal collar colors while ignoring these angular defects. These are directions toward the existing approved target; continue detailed correction and all-angle verification.
User additionally asks whether old silhouette stars should fade while newly exposed silhouette stars brighten during rotation. Coordinator explained view-dependent smooth brightness on fixed surface stars can clarify silhouette, with internal hair/clothing lines preserved; it cannot fix misplaced geometry. Before any renderer behavior change, check approved Spec constraints; do not introduce camera-specific painted colors or moving/fake-outline points. Diagnose existing shader before proposing minimal in-scope change.
Routing: user newly authorizes Opus5 xhigh IF Fable quota is insufficient. Current Fable still emitting normal tool work, no limit error verified. Keep Fable unless actual limit evidence. Do not use Astra. At next checkpoint read this entry and prioritize structural/all-angle user issues; preserve current user's frozen360 preview.

## Root independent solid-angle inspection after user feedback
I viewed frozen360 full8x4 angle090-solid.png and angle270-solid.png at 1000x900. This is not only a weighted-star contrast issue:
- 090 head profile has a bulbous lower-front face/jaw and very narrow neck transition; neck-to-collar silhouette needs actual reference comparison.
- 270 collar/upper garment forms a tall sail-like plane rising from shoulder toward jaw (rough x470–585,y334–444); determine which real collar/shoulder surfaces should produce this, do not assume prior collar-wing local acceptance validates side profile.
- Side/back waist/bow/belt layers show separated protruding pieces; preserve intentional straps but distinguish these from wrongly positioned garment depth.
Use existing solid captures to map the user's screenshot6 angle before adjusting brightness. These observations are hypotheses requiring exact source/ref comparison, not instructions to blindly reshape/delete.

## Latest user steering: real-human proportions and reattached original GLB
User explicitly says current model deviates from real human proportions; recognizable pose alone is insufficient. Preserve original photo/person appearance and realistic starfield aesthetic as primary targets, not current deformed candidate as authority.
Attached C:/Users/leslie/Desktop/臨時/cosmic+character+3d+model.glb is BYTE IDENTICAL to work/model-trial/tripo-original.glb: SHA256 2613d404adaa4c0bad11a4e4a809938701699ad50af4ce3b07f52f95a7c4f20f, 18671020 bytes, Tripo glTF2, 1 mesh/node/material, no skin/animation. No need import/replace/regenerate. Root verified hash both files. Reattachment is renewed reference, NOT approval that raw Tripo proportions are correct.
Compare original photo/front/rear references, raw original GLB and current candidate to identify accumulated anatomical distortion. Realistic head-neck-shoulder/torso proportion and garment depth continuity are acceptance requirements, not pose-recognition metrics. Follow user six images and preserve original endpoint appearance. Continue detailed fixes; no scope expansion. Read this inbox at next checkpoint.

## Root v365 endpoint visual comparison
Viewed near-full-original-364-365.png. Frontal overall head/face silhouette and tilt still visibly differ from original; crown, face-to-neck alignment and left collar upper dark rectangle remain. Do not treat head318 as frozen accepted final; its previous local review was not U08/A13 acceptance. User explicitly requests original proportions/appearance, and head structural edits are authorized. First investigate coupled head-neck-shoulder coordinates with source references, not just small ear/hair pixels. Current v365 may improve sampling but does not resolve structural acceptance.

## Coordinator response to v365/v366 checkpoint
Useful: confirmed actual 791→900 projection mapping (old360 comparison was self-consistent wrong); source normal lighting and honest duplicate thinning improve panel.
Structural diagnosis is PARTIAL: native Tripo continuity is evidence against disconnected surfaces, NOT evidence anatomy/proportions are acceptable. User reattached same rawGLB and explicitly rejected current proportions. Need head/neck/shoulder solid comparison against original photo/rear references, not merely v5 same-shape comparison. Do not leave known side hair wedge, smooth rear hair shell/bake without detail as permanent limitation: these are already approved A01/A02 corrections. Existing rear-reference supports back hair/neck/shoulder refinement; no waist-back reinvention requested. Preserve intentional lower ribbons until evidence requires change.
Please read all newest inbox entries (reattached originalGLB hash and root365 endpoint findings).
Lighting: don't introduce time gates (rim=0 at t<=0.9 or>=11.3) merely to pass endpoint screenshots. Fixed continuous normal/view lighting should behave the same at the same viewing geometry in inspect/replay, no special presentation states. If adding a minimal optional isolated rim test, use smooth clamped low strength with nonzero dark coverage and keep inner hair folds readable; compare ALL angles+endpoints, no new outline points or camera-specific RGB. No blanket core RGB brightening until material/density/normal diagnosis supports it.
Proceed with scoped structural head-side and rear hair corrections plus coherent material/render trial; report remaining uncertainty honestly, but no scope approval required for these known defects.

## Root rear reference inspection
Viewed rear-reference.png directly: many layered directional hair locks taper toward nape, shorter neck visible below hair; collar is a finite folded band around neck, shoulder drapes have clear layered borders. Source has explicit internal light/dark hair lock edges, not only bright outer silhouette. Thus rear smooth-shell/featureless-star issue has existing visual evidence to calibrate; first use correct back-source sampling/projection and actual geometry normals, evaluate if surface needs bounded hair-lock refinement. Do not simply brighten the full rear shell or invent new ornament design.

## Root head369 implementation inspection — targeted checks needed
Read model-v10-head-proportion-v369.py. Proposed forehead restore alongcamera52rays + near silhouette warp is an actual geometry correction; allangle/wide verification essential. Please specifically verify:
1. Face-island boundary to neighboring hair/ear/neck after up-to~80mm depth restoration, especially shared/nonshared vertex seams and side profile; base-v5depth is a diagnostic baseline not anatomical proof.
2. Source RGB fixed but regenerated geometric normals can change near source-light appearance; compare face/hair near, not only pixelXYZ invariance.
3. Script catches GLB write AssertionError and copies OLD GLB. If triggered, do not publish mixed-version artifact silently: report/fix so actual renderer/solid/GLB authoritative paths agree, or clearly exclude unused staleGLB from package claim.
4. Head selection excludes collar islands, but demonstrate actual combined nonhead/hand geometry unchanged and head-neck joining remains coherent.
These are targeted review checks, not newly imposed zero-all metrics. Continue implementation and inspect newestinbox atcheckpoint.

## Root inspected actual v370 angle270 solid
Viewed v10/combined-head370-hand73-clothes370-bound-check/angle270-solid.png. Upper head now presents a rounded forward bulge above the face/neck rather than previous thin visor; this alone does not demonstrate a natural forehead/hair profile. Need compare source/reference anatomy and both90/270 closeups: visible forehead/nose/chin/ear separation and head-to-neck center, not only restoring v5depth. Collar tall sail remains unmodified. Please assess visually before treating370geometry accepted. No instruction to revertblindly or forcegenusanatomicalmetrics.

## Coordinator checkpoint discipline
Current head369/370/372/375/376 iterations: don't let zero face-flip or smoothing metrics become an unapproved acceptance target. For any proposed relaxation, inspect visible faces and compare original/side closeups; select coherent visible improvement, reject actual newseams but don't endlessly smooth harmless tinyfaces. Main user goal remains naturalproportions, originalappearance, rearhair, garmentdepth andcontinuousstarreadability. Preserve a clear base and report one bounded rationale per candidate. Read latest inbox before next progress checkpoint.

## Root v376 closeup visual finding
Viewed head-closeup270-solid-v5-360-376.png (3 columns). v376 still has an enlarged/bulbous forward hair mass and sharp flat upper-front rim; forehead/nose facial profile remains mostly covered by the large hair sheet. It differs fromv5 and360 but does not yet establish natural proportions. Originalv5 itself has the same broad coveringhair, so v5-restoration alone insufficient. Keep this explicitly unresolved for A01/A02, not "shape fixed" basedoverhangdistance. Need sourcefront hairstyle + supportedside silhouette judgement; minimal coherent hairmass depth and actual face exposure. Don't move face forwardaloneagain; that369failed. Existing source material expectations should guide silhouette and facevisibility.

## Independent v376 review completed — local no NEW important regressions, overall01stillfails
## v376 增量複驗（Spec＋Standards，局部；有界）

**Snapshot**：`claude-review-v376/manifest.json` SHA `7b8f987a…4c28`（Root 831/0）；combined‑376 solid／bound `aligned-world.npy` 相同，GLB→world 最大差 0.0001 mm，points XYZ 對 face/bary 最大 0.0001 mm（0 列超 0.05 mm）。scratch 已修正（set 預建、線性查找，每步 ≤2 s）；先前 v376.py 的二次方查找為我方錯誤，已棄。

### 對我方 v360 斷言的更正
- **撤回**「+54.5 px 平移驗證 0 px」的結論。以 40849 原樣本自驗：baseline 投影＝中心＋(H/2)·3·xy/(3+z)（p50／max 殘差 0.000 px；反號 3−z 則 p50 15.3 px），故 791→900 為繞中心放大 900/791；v360 的 0 殘差只證明綁定射線自洽，不證映射。v363+ 綁定列（size 255 共 7074 列）在正確映射下殘差 p50/p90/max 0.00/0.00 px（2 px 內 100%）。
- 更正欄位：我方 360 報告以 byte 15 稱 size 有誤；size 為 byte 19。以 byte 19 重核：360→376 共同原樣本 ID 12343 列 RGB 全等；size 4658 列 158→255 為 v364 已揭露規則，其餘相等。

### 頭 376（相對 360 combined）
- 只動頭：14785 頂點（y .298–.581，y<.05 為 0、手 mask 0），tris 相同；位移 p50 依高度 0.4→33.7 mm、最大 81 mm。頭頸交界（動／不動邊 1460 條）位移跳變 p50 0.06、p90 0.96、max 9.5 mm，交界連續。
- 翻面 114（朝相機 52 者 59，中位面積 1.2 mm²，髮束島 72/7/73）、嚴重拉伸 39；近景 weighted 未見撕裂 → **建議級**，非零計數要求。
- 近景輪廓疊圖 rows 120–540 雙側 ±6 px；90°/270° 素模特寫親看：376 頭回到頸上、鼻／下巴／耳可辨，但前髮團仍厚、上前緣為平直「崖」、額鼻大半被髮片覆蓋——**維持已知未解（Developer‑owned），非本輪新 Finding**。

### 材質／來源（v363–v365）
- 新 ID 列 2416 與全部 size‑255 綁定列：映射殘差 0、法線與反射原法線 dot p10/p50 1.00/1.00（100% >.98）。B‑1042 列殘差 0 但法線為幾何法線（dot p50 .52）；README「綁定原樣本列皆帶原法線」對 B 列不成立（**建議 M‑376‑1** 措辭）。
- 由頭鏈承接的 11301 列（髮島 63/22/272/61/266）殘差 p90 95 px：其 ID 為近景相機髮源綁定，不適用 wide 映射檢驗，非殘留錯射線。
- 360 有 909 個原 ID 未見於 376、新增 2416：屬正確映射下重綁（舊錯射線綁定被替換），非幾何刪除；tris 不變。
- 抽稀：袖口 hand73 語意列（art0/cont0/mat0，島 209/210/163/216/215/205）16188 → 376 存 10762；RGB 改動的 3843 手相符列全為三旗標 0；art 2723／cont 5640／mat 8640 列逐 byte 保留；手幾何 0 變動；near 相機 52 狀態不變。
- 背髮：以 head376 preview 列 key 追到 293 列 albedo→rear‑art（Developer 297），全在頭後半（z p50 .78、法線 z −.44、y .37–.53），RGB 由 rear‑reference 同色調規則取樣（91 列與既有 rear‑art 值重合），非憑空；未逐列重投影驗證。
- 未獨立核：髮源 3870／耳 218 列本輪未逐集比對（承自前版）。

### v118 rim（可選）
rim=0 near／wide 與 376 bound‑check 逐像素 0 差（我方比對）；.35/.6 為固定法線視角項、無時間閘，效果溫和（Developer 量測 +2–3% 亮度、暗比例 ≤1.3 點）。是否採用交 Root；不構成 Spec 缺陷。

### 播放 v377
257 幀 theta 0→2π、time .017→12.0、body ≥28860、hash 恆定、errors 0；orbit azimuth 5→348、prop clock spin 17.33→23.89 rad（>2π）；webm 12.2 MB；未重跑相機套件。

### 結論
- **Spec（局部）**：無新增重要回歸。已知重要未解（頭側髮團／崖、wide 肢體 60–93 px、右領上緣／270 帆、背髮線條可讀性、左上領暗矩形）維持 Developer‑owned，未因 376 惡化亦未解決。
- **Standards（局部）**：建議 M‑376‑1（B 列法線措辭）；S‑296‑1、F‑320‑1 維持前議。不宣告 U08／A13／Ticket01；03 維持 blocked。
- 涵蓋限制：無全面 winding／翻面逐一親看；背髮列未逐列重投影；閉合檢查全部 ≤2 s 有界。
Coordinator: Fix M-376-1 wording in NEXT package, not frozen376. Reconcile14751vs14785 vertexcount,114flipisland/area labels and297vs293rearcounts with statedbaseline rather than assertingunchangedcounts. No newzero-allrequirements. Continuecurrenthead383/bodyposecorrections. Reviewer confirmed rootviewportcorrection andlocalmaterialprovenance; do notredoalreadyverifiedmath. All knownvisualfailures stillmustresolve.

## Root383 actual90closeup
Viewed head-closeup090-solid-v5-376-383.png. Candidate383 reduces forward hair mass but introduces visibly jagged raised shelf/flap shapes on upper-side/crown (rightcolumn). This is an actualsolidvisibilityfinding, notzero-flipnumericalpin. Inspect sameareaweighted/45/315 andsourcehairlockidentity beforeadopting. Wholeheadoutlinealoneinsufficient. Keep newcandidategeometrycoherent without patch-like raisedplanes.

## Root response to head383 rejection / body priority
Agree reject383 actualvisiblefolds; changing priority to body is sensible. However “needs reference-guided hair reshaping” is an authorized implementation method within Spec01, not an out-of-scope task. <=120s bound applies individual diagnostic runtimes, NOT allowable structural method. Do not permanently stopheadrepair by labeling it beyondboundednumericfixes. Finish independentbody/collarimprovements then return to source-guided coherenthairgeometry usingexistingfront/rearreferences; if actualside-reference absence is necessary to decide ambiguousappearance, identify precise missingview and boundedreference proposal as Specpermits. Do not defaulttoinfinitefieldwarp variants or rawv5asgroundtruth. Usermodelrouting remainsFableunlessactualquota, no strongerfallback merelybecausehard.

## Root arm388 inspection
The 10/12 old contract support faces are implementation guardrails, not Spec-pinned world positions. If a supportfacebelongs to the movingarm/cuff/tail, move it coherently and re-advect dependentpoints/anchors, rather than tapering displacement around an arbitrary frozenvertex creating unnaturalsleeve dents. Guard only actualunrelatedheldhand/prop andunchangedsections. Derive scope from actualanatomical ownership. Your387→388releasedcuff27 isappropriate. Verify armcloth-to-rigidhand wrist continuity and perceivednaturalpose/allangle, not onlywidepixelmatch; per-height silhouette deformation can distort joints. Also verify source/scriptcomment guard assignment reflectsactualcode (longline containing# beforeguards assignment). No requirement tofreezeunsupportedcontractpins.

## Root original rightarm crop semantic check
Viewed front-input-rightarm-crop.png: visibleouterboundary is pale-purple broad CLOTH/COAT withgoldpattern, innerdarkbluefoldedcloth; no distinctglove/finger silhouette atthatouteredge. Thus matchingcandidate rightglove tooriginalouteredge was notsemanticallyestablished. Verify exactimage-to-originalpoint mapping acrossrow600-720, and repaircoatcontour independently ifneeded. Do NOTadopt389handtranslation merelybecausewhole-right-bboxmatches. Preserve naturalrightarm/handpose unless actualoriginalhandtarget supportschange; coastairspaceandclothlayerdepthshoulddriveappropriatepiece. This is evidence-based correction, not freezeposepin. Yourongoingmaterialclassification isappropriate.

## Root next implementation after397 package
Your source-semantic diagnosis is actionable: originalrightside needs broad hanging cloth, andrightcollar needs filledfoldedpanel. Both are authorized Spec01 geometry corrections, and curvedthickactualcloth surface likev339 is establishedvalidmethod. Proceed afterfreezing397 with source-guided actualsurfaceconstruction/attachment, preserveunderlyingarm/handnaturalpose andocclusion; noflatcamera-facingcard,floatingoutline,removingback. Checktrue3Dthickness/foldedges, side90/270/45/315,frontnear+wide,face/handocclusion. Do notstopatneedsnewcloth/needsfill as thoughscopepermissionmissing. RootawaitsuseroptionalearlierOpuspermission, meanwhileFablecontinuesallowedwork. Lowerbacknewdesignnotrequested.

## Independent397 completed — no newimportantregression, knownvisualfailsremain
## v397 增量複驗（Spec＋Standards，局部；有界，每步 ≤3 s）

**Snapshot**：`claude-review-v397/manifest.json` SHA `bc9661db…edaf`（Root 883/0）；combined‑392 solid＝397 bound `aligned-world.npy`，SHA 與 README `b4b2307e…ca0d` 一致；tris 與 357 相同。

### v392 下擺向內場（幾何）
- 對 357 combined：變動 19821 頂點（Developer 19739 tail＋契約口徑），最大 131.6 mm、p50 18.8 mm，全在 y −.75…−.43 尾帶（島 545/472/3818/1177/4083），手 mask 0、頭 0、新增頂點 0。手 art 2723／continuation 5640／material 8640 列逐 byte 保留；near 相機／頭未動。
- 拉伸：我方無向邊 >3× 為 486 條（Developer 928 為有向計數），比值 p50 3.6／max 4.8，邊長 p50 29.5 mm；所涉 1036 面中翻面 48、退化 0、面積中位 21.6 mm²；其中約 490–545 面朝向 135°/225°/315° 相機。親看三角 solid：尾帶為連續彎曲片，**無可辨撕裂／浮片** → **建議級**（保留揭露，非零計數要求）。
- wide 右下輪廓：以簡單閾值偵測（含星點干擾，rows 760/820 讀數為星點，已剔除）rows 780/800/840 右緣 376→397 為 841→778、820→776、854→764 px（原版 745/736/751），即縮減 63/44/90 px 但仍較原版外 +33/+40/+13 px。README「rows 780–840 達 −20…−1 px」**未能以我方偵測器重現**（偵測器定義差），列為口徑差而非回歸。近景像素變化 557 px（x23–344／y201–700，屬背髮重染列在左緣露出），非幾何變動。

### bound v397 provenance（對 376）
- 347295 列同數；byte 相同 315479；XYZ 變 25464、RGB 變 30291、size 變 0、法線變 25649；全部列 XYZ 對 face/bary 在 392 幾何重建最大 0.0001 mm（0 列超 0.05 mm）。RGB 變動：移動面上 rebake 23845、背髮 rear‑art 5545、B 帶面積列 901（README 979，口徑差）。
- **建議 R‑397‑1（措辭）**：README 稱 25464 列「依 face/bary 隨移動面重算」，但其中 1305 列（class 0 面積列）face id 改變、bary 未變、XYZ 位移 p50 32 mm／max 643 mm——這是同 seed 依面積權重重新抽面（面積因場改變），屬重抽而非 advection；同島 1295/1305，密度規則一致，非可見回歸，但應如實標註。
- 背髮 5545 列：均色 159/129/183 → 136/106/156；以「去除 ^.88×1.12 色調」反推的預測與實值 |Δ| p50 0.4 u8（未飽和 4156 列），支持「線性取樣同一 rear‑reference」；飽和列不可逆推（p90 37.8 u8）。與 Developer 一致：**不視為可讀性修正**。
- M‑376‑1：README 已限定「原法線」僅適用 7074 個 size‑255 新綁定列，B‑1042 為幾何法線 → **close**。

### 播放 v398
259 幀 theta 0→2π、time .017→12.0、body ≥27886、hash `b4b2307e…` 恆定、errors 0；orbit azimuth 9→353、prop spin 17.36→24.08 rad（>2π）；webm 12.4 MB。以 hash 追溯接受，未重跑相機／投影驗證。

### 結論
- **Spec（局部）**：無新增重要回歸；下擺尾帶 wide 形體改善且側視無新浮片／撕裂；頭／手／near 未動。
- **Standards（局部）**：R‑397‑1（面積列重抽 vs advection 措辭）、wide −20…−1 未獨立重現（口徑）；M‑376‑1 close；S‑296‑1、F‑320‑1、head376 翻面 114 維持建議級。
- 已知重要視覺未解（頭側髮團／崖、右寬垂袖缺件、右領翻領面板缺件、背髮層次）維持 Developer‑owned；不宣告 U08／A13／Ticket01；03 維持 blocked。
- 涵蓋限制：未逐一親看 48 翻面；背髮列未逐列重投影；未審 378–396 拒採版本。
Coordinator: NextpackagecorrectR3971 resamplingvsadvection andcountswithbaseline. Don'toverwritefrozen397. Wideedge±claimneedsdetector-definedrepro/sourcepixelsemantics; rootpreviousstarfalsepositivehistory meansneitherdetectorautomaticgroundtruth. Compareactualsourcecloth region, countforcountnotnewqualitygate. Continuecurrent399curvedclothconstruction. UseroptionalearlyOpuspermissionstillpending, Fablecontinues.

## Root399 side90 newdrape attachment check
Viewed angle090-solid-397-399.png. Newdrape appears as long straight diagonal plate/edge crossing waist fromrough x1350,y615 to1500,y520 inrightcolumn, ratherthan a naturallyhanging sleeve. Check attachment orientation/worlddepth andshowcurve/thickness/relationshiptoactualsleeve. Closedthicknessalone doesnotproveclothedshape; don'ttreatsourcefrontpixels+fixeddepth as sufficient. Collarnewpanelalsoadds smallfloating-lookinglipunderchin at90, verifycontinuousfoldattachment. These are actualsidevisualconcerns to assess with45/270/315weighted, notzerointersectionmetrics.

## Independent405 review completed — no NEWimportantregression, M4052 topedge recommendation
## v405 增量複驗（Spec＋Standards，局部；有界，每步 ≤3 s）

**Snapshot**：`claude-review-v405/manifest.json` SHA `39cd0833…64d0`（Root 993/0）；combined‑405 solid `aligned-world.npy` SHA `dbb370b5…95c2` 一致；bound world＝solid。

### 拓撲插入與舊資料
- 舊 324206 頂點位元相同；新增 968 頂點、1928 面，插於 B 帶 2646 面之前（位置 544548），前綴與 B 帶面陣列與 392 完全相同，新面只用新頂點；新片邊界邊 0、非流形 0。
- 承接列 345581 列逐 byte 同 397，面 id 重映射後三角 tuple 345581/345581 一致（2469 列 id 位移）；全部 349594 列 XYZ 對 face/bary 重建最大 0.0001 mm。hand art 2723／continuation 5640／material 8640 列存在；hand 頂點不動。
- 列差異：新增 4013＝袖片 2241＋領片 59＋左垂片配對底列 1713（重抽）；移除 1714＝舊左垂片配對列 1713＋領綁定列 1。與 README「owner 0/1/2/3 集合相同、差異只在 owner 4/5」一致。

### 兩片布的三維性與附著
| | 袖片 | 領片 |
|---|---|---|
| 頂點／面 | 752／1500 | 216／428 |
| 體積 | 268 cm³ | 2.9 cm³ |
| 前後壁距 p10/p50/p90 | 8.4／10.2／10.3 mm | 7.3／9.2／10 mm |
| 前壁 PCA σ | 63／43／26 mm，z 跨 312 mm | 7.8／2.4／1.1 mm |
| 最近舊頂點 p10/p50/max | 7.4／28.5／133 mm | 4.8／12.4／32 mm |
| 最近手頂點 | 最小 160 mm | 555 mm |
| 舊頂點落入 10 mm 板內 | 477（手 0） | 18（手 0） |

- 袖片為有曲率的懸垂片（非平板），90° solid 親看：垂直懸掛於大衣前層深度，頂端與肩／前層相接，但**上緣為水平直切、側視呈矩形板邊**（建議級外觀，見 M‑405‑2）；45° solid／315° weighted：寬垂布在右手前方、無浮片；270° 被身體遮蔽；wide 右緣改變 4752 px（bbox x240–771／y271–723），手不可見符合原圖語意。
- 附著仍為互穿重疊（477 舊頂點在板內），同 F‑320‑1 型態，非焊接；未見縫線。
- 領片極小（前壁約 16×5 mm，59 列）且色暗（Developer 自報 34/40/79）：Developer‑owned；near 像素變化僅 40 px（x518–570／y588–635），臉／頭 0 px 變。

### 來源綁定
新增列全為 src 1；帶原 ID 者 1033（袖片 1028、領片 5）：RGB 與 pool 逐列相等 1033/1033、ID 無重複、中心縮放映射殘差 p50/p90 0.00 px、法線與反射原法線 dot p50 1.00；size 255；配對底列 2980 為 size 158 推定列（已標）。袖片來源均色 206/184/235（淡紫袖布，非手套色）。

### 播放 v406
258 幀 theta 0→2π、time .017→12.0、body ≥27815、hash `dbb370b5…` 恆定、errors 0；orbit azimuth 14.5→358、prop spin 17.19→23.87 rad（>2π）；webm 12.2 MB。以 hash 追溯接受。

### 結論
- **Spec（局部）**：無新增重要回歸。右袖垂布為源引導的真體積布片，深度為推定但側視與大衣前層連貫、不遮臉、不觸手；左垂片配對列重抽為既有規則。
- **Standards（局部）**：R‑397‑1 已如實更正 → **close**。新建議 **M‑405‑2**：袖片頂緣為直切水平線（47 列×8 欄網格上緣），90° solid 呈板邊；建議上緣依肩／袖接縫弧線或加 taper。F‑320‑1 型互穿附著沿用（袖片 477 頂點）。
- 已知重要視覺未解（頭側髮團／崖、右領面板小而暗與 rows 570–580 留白、背髮層次、270 領帆）維持 Developer‑owned；不宣告 U08／A13／Ticket01；03 維持 blocked。
- 涵蓋限制：袖片深度真實性無來源可驗；未做全面翻面／winding；未審 399/402/403 中間版。
Coordinator: R3971closed; source/oldface remapping acceptedlocal. AddressM4052 straightupperedge usingcurvedattachment/taper whenrevisingnextsheet, notgeneralwindingchase. Knownhead/collar/rearvisualfailsremain. Continue407/408; don'toverwrite405package.

## Root410 closeup actual collar fold regression
Viewed head-closeup270-solid-376-410.png. Newfoldedge appears as a long straight roundbar bridging the collar opening (rightcolumn x1430–1810/y770–890), not a fold following the existing collar surface; endpoints look faceted and floating/acrossair. Needs source-referenced collar-edge path attached alongthefabric, notchordacrosstwoendpoints. Checkside270/90andnear source. Headgeometrylooksunchangedinthiscomparison, don'tclaimrigid hairfix from410. This isactualvisible concern, preserve rejectedtrial ifnotnatural.

## Root supplied ONE necessary supplementary side reference
You explicitly identified missing90/270hair reference. Spec allowsfewconsistentreferences. Root generated ONE using built-in image_gen with originalfront-input.png+rear-reference.png, saved ../../docs/work/portrait-orbit/references/side-profile-candidate-v1.png +.md (provenance/exactprompt/limitations). READIMAGE+NOTE nextcheckpoint beforeheadwork.
Rootchecked broadidentity/hairpalette/locks/ear/collar continuity. It is INFERRED CANDIDATE, notuser-approvedreplacement orgroundtruth. Generatedposturemoreupright/facebrighter, so don'tadoptpose/camera/frontRGB; originalnear/wide remainsauthority. Use onlysupportedhairlayer/foreheadclearance/nape/collarfoldgeometryhypothesis afteryouindependentlycheck consistency. No wholesaleheadreplacement/newidentity. This addressesyourmissingview concretely; now source-guided localhairreshaping/topology method canprogress underFable. Reviewerwillassessinference/limits. Modelroutingunchanged; noearlyOpusapprovalyet.

## Root visual check — v422 solid side closeups
Root viewed actual head-closeup090-solid-376-422.png and head-closeup270-solid-376-422.png. Crown recession is visible and removes some flat box profile, but this does NOT yet close head natural-proportion finding. In 270 candidate (right column) the large frontal hair lobe still projects far ahead of the brow/face and reads as a large shelf over the upper face; the crown-front strand ends also form a raised sharp lip. Compare whole crown/brow/nose/chin relationship against original and the supporting side hypothesis, not just selected height-depth targets. Need actual weighted/material UI near and oblique evidence before deciding whether v422 is an improvement worth retaining. Collar remains tall thin sheets as already tracked. No demand for zero numerical flips; prioritize visible coherent anatomy and original appearance.

## Root actual CUA UI check — v422 (1280x720)
Opened separate hidden IAB tab7 for combined-local-offset-v117.html assets=combined-head422-hand73-clothes415-bound-preview (UI SHA302972e05f12). Clicked Play and observed t0.17 advancing, later t12 with full body/prop present. Clicked back-head button t6.5, then inspect,270°,head focus,scale200,and material mode. Controls worked. This is a local smoke check, NOT continuous frame-by-frame final acceptance. At back hold hair remains dark with weak layer separation. At270 head weighted facial/neck boundary remains hard to read; material mode shows the large frontal hair lobe/lip prominently. These reproduce existing user readability/profile findings on actual UI; do not close them merely because crown-depth targets improved. Separate QA tab only; user360 untouched.

## Root v427 gap-mask semantic check
Root just viewed model-v10-clothes-evidence-v427/wide-gap-mask-v427.png. The green selected component visibly follows the RIGHT HEAD/JAW outer silhouette and ends at the top of the collar; it is NOT clearly the missing lavender collar panel. Please verify selected component using original full RGB source/row coordinates before calling this a right-collar feasibility test. A head silhouette/density mismatch cannot establish collar incompatibility. The panel itself appears lower in this crop. Treat this as a concrete suspected ROI/semantic issue, verify independently rather than accepting my inference blindly.

## Coordinator review freeze boundary
Root started independent reviewer on v429 after manifest verification1065/0, but observed later refreeze changed manifest 2ab17ad... to b9c733... while Developer still generating final evidence. Root interrupted reviewer before substantive review to avoid mixed snapshot. Finish v429 evidence and clearly freeze once, then report final manifest hash. Do not modify frozen429 afterward; remaining collar/head/rear fixes use new version. Root will restart same independent reviewer against final package and continue your next authorized work; no full01pass implied.

## Independent Opus v429 review — completed, incremental local only
Reviewer same isolated c09d3dd3 session, Opus5/xhigh fallback, exec30930 exit0. FINAL snapshot1cdcd459...3c85. Full result work/model-trial/clothes-review-opus-01-v429-result.md. Close M4052 sleeve-top taper; no NEW important regression, all known head/collar/rear important findings remain, NO01pass. Hand/bary/provenance/GLB claims reproduced. 154tiny flips recommendation based12representativefaces/actualUI, no visibletear. v431169rays/depth feasibility supports retracting blanket incompatibility, not panel acceptance.
Two documentation nits: hand45 notpixelidentical,13pixels>8 atfarupperright[993,0,999,14],not actualhandregression; playback minbody27789,not >=27800 (use exact). Frozen429 MUSTstayunchanged; carry these corrections into nextcandidate/report/progress. OrbitPNGmissing disclosed,full8x4/log/video supporting. Continue remaining fixes, independentreviewfulltext follows:
## v429 增量複驗（Spec＋Standards，局部；Opus 5 fallback，同一 Reviewer）

**Snapshot**：`claude-review-v429/manifest.json` SHA `1cdcd459…3c85`、1069 entries（與指定值相符；舊 2ab17/b9c733 已棄用）。combined‑429 solid `aligned-world.npy` SHA `bfa02ac4…fc3a` 一致，bound 349492 列，bound world＝solid。診斷均 ≤5 s，集合預建，無全面掃描。

### M‑405‑2（袖片頂緣直切）→ **close**
v415 只動袖片頂部：752 頂點中 126 個移動、最大 24.3 mm，領片 0 動。wide 逐列寬度：rows 540–555 由 19→7 px、556–571 由 38→31 px，rows ≥588 右緣逐列完全相同（732/746/760/772/768 px 不變）。體積 268.3→260.7 cm³，封閉流形（邊界邊 0、非流形 0），翻面 0、退化 0、面積比 0.25–1.13，壁厚 p10/p50/p90 仍為 8.4/10.2/10.3 mm，前壁 PCA σ 61/35/5 mm（仍為曲面非平板）。90°/45° solid 親看：頂緣改為收進肩線，不再是水平板邊。

### head429（對 415）
| 檢查 | 結果 |
|---|---|
| 幾何變動 | 14398 頂點、最大 42.1 mm、y .335–.575；tris 相同；hand mask 0；新片頂點 0 |
| bound 列 | 349492 列，byte 相同 336547，變動 12945（xyz 12897、rgb 2219、normal 12116、**size byte19 = 0**） |
| owner 計畫 | owner/source_row 與 415 逐項相同 |
| face/bary | 全列 XYZ 重建最大 0.00013 mm，0 列超 0.05 mm |
| GLB | head429 GLB→world 對 aligned-world 最大 0.00014 mm（322262 點） |
| hand73 | art 2723/2723、continuation 5640/5640、material 8640/8640 逐列存在 |

與 README §4 數字完全吻合。RGB 2219 列為既有背髮 rear‑art 依新位置重取樣，非新色彩規則。

### 不變視圖宣稱（415 vs 429 真 UI 逐像素）
`original-front`、`original-wide`、`right90`、`right270` 變動 **0 px**。變動集中於頭部：near‑weighted 1918 px（bbox y97–515）、wide‑weighted 6431 px（bbox y76–233）、angle270‑solid 4612 px（y217–310）。
**Nit（建議級）**：`hand45.png` 有 13 個 >8 u8 像素，位於畫面右上角 bbox [993,0,999,14]，遠離手部且手頂點位移為 0；屬背景／星點差異，不是手部回歸，但「hand45 逐像素 0 變」的措辭應修正。

### 154 翻面（建議級，非重要）
面積 p50 1.47 mm²、p90 8.06、最大 48.6 mm²。取 12 個最大者（id 542411/415640/540870…），質心 y .361–.544、z .925–.949（前額髮團），90°/270° 分別有 7／5 個朝向相機且在變動集內無遮擋面。親看真 UI head090/head270 solid 特寫與 376‑429 素模對照：該區為連續髮束曲面，**未見破洞、黑片或浮條**。故維持建議級，不套用零翻面規則。

### v431 右領來源檢查（未實作，僅方法評估）
JSON 數字可核：淡紫布樣本 18307、已綁 8398、未綁 1268，cluster 6 = 169 條射線。落在原版近景剪影內的比例：z .40 = 1.000、.45 = .994、.50 = .970、.55 = .899，.85 降至 .172、.95 為 0。故「近景／wide 對這片互不相容」的普遍說法確實不成立，深度帶 **z ≈ .40–.55 可行**，v407 採用的 z≈.836 僅約 .17–.28，失敗原因與 Developer 判讀一致。v427 舊 ROI 貼著頭／下顎輪廓、結論作廢並保留為反例，處理方式正確。**不構成領片已修的宣稱**；遮擋、顏色、密度三者未驗。

### 播放 v430
261 幀、theta 0→2π 單調、time .017→12.0、modelHash `bfa02ac4` 恆定、errors 0、bodyPixels 最小 **27789**（README 稱 ≥27.8k，實為 27.79k，措辭微幅樂觀）；azimuth 13.5→357（span 343.5）、prop spin span 6.517 rad > 2π；webm 12.1 MB；目錄內僅 4 張 PNG，逐 30 幀 orbit 截圖確實缺失且已揭露，角度證據改以 full8x4＋影片＋log 成立。

### 結論
- **Spec（局部）**：**零新增重要回歸**。袖片頂緣收斂為真實形體改善，頭 429 前額／頂部收斂不破壞流形、不動手與相機。
- **Standards（局部）**：close M‑405‑2；兩項措辭 nit（hand45 非全 0、bodyPixels 27.79k）。既有建議級項目（head376 114 翻面、v429 新增 154 翻面、F‑320‑1 互穿、S‑296‑1 殘差）維持。
- **已知重要未解（Developer 所有，未關閉）**：頭側髮團仍厚、上前緣崖與橫向摺痕、斜視深色不可讀；右領缺件與近景片小色暗；背髮層次。側面參考為幾何假設，非原版真值或使用者核可替代品。
- **不宣告 Ticket01／U08／A13 通過**；03 維持 blocked。

**證據限制**：未做全面 winding／逐面射線掃描；154 翻面以特寫視覺判讀，未逐面套色渲染；領片可行性僅深度幾何，未驗遮擋／色彩／密度；orbit 逐幀 PNG 缺失。

## Root v436 original-art overlay observation
Viewed gap-samples-on-original-art-v436.png: green source samples run through ear/hair/neck AND a white background gap between hanging hair and collar; only lower part lies on lavender collar. This does not visually support treating all170 rays as one missing collar wing. Verify original-image pixel transform/crop/semantic correspondence (including any flip/origin/viewport scaling) before building a tall wing up to earheight. This may be source-coordinate mapping or a mixed semantic selection, not actual missing fabric. Your own v436 inspection can distinguish; keep genuine source anatomy/hair vs cloth separate, no invented earheightcollar basedsolelylavenderthreshold.

## Root coverage visual observation (not rejection of local improvement)
Viewed cover442 near-weighted: face/head coverage visibly stronger. Viewed cover444-head180-weighted actualUI: rear silhouette has more coverage but still mostly a dark mass, layered locks not clearly legible as in rear-reference. So density floor can improve basic surface continuity, but do not mark back-layer readability closed from counts alone. Need source/reference comparison at actual back-hold camera, and assess normals/lighting/material mapping plus geometry layering as appropriate. Preserve sameview sameappearance and sourcepointidentity; no timegatedbrightening. Root has not yet evaluated444 near or fullplay.

## Root corrected v436 overlay
Viewed updated v436 image after your mapping correction: green samples now follow RIGHT hair strands/temple/cheek outline and end near chin, above visible lavender collar. This is far clearer than earlier wronglymappedear/whitegap overlay. Root agrees tallfabricwingwouldbe wrong; address truehair/face surface/projection/starbinding iftheseedgesneedrecovery, notcollar geometry. Please explicitly correct earlier v431/Reviewer429's label '169 right-collar rays' in nextreport; depth-feasibility calculation maystillhold forselectedrays but semanticidentitywaswrong. Earlierwrongmappingartoverlay/boundarydistance mustbequalifiedsuperseded, keepprovenancehonest.

## Independent cover444 review completed
OpusReviewer exec11553exit0, samec09d3dd3bothaxes. Fullresult work/model-trial/clothes-review-opus-01-v444-result.md. Pure+2685rows verified via MULTISET all349492oldpreserved, owner6/provenance10/bary/normals/head-only/hands, noNEWimportantregression. SemanticretractionrightHAIR/cheeknotcollar independentlyconfirmed byoriginalimage, priornitsclosed. NEWrecommendationB4441 disclosecoveragefaceshadonly42oldrows,new2685dominatetheseundercoveredfacesandare inferredsamplingnotoriginalstarIDs; carryproportionintocontractnextreport. No01pass, sameimportanthead/readability remain. Frozen444unchanged. Continuev4realfixes. Fullreview:
## v444 增量複驗（Spec＋Standards，局部；Opus 5 fallback，同一 Reviewer）

**Snapshot**：`claude-review-v444/manifest.json` SHA `2593a24b…e60f`、1698 entries，與指定值相符。cover444 `aligned-world.npy` SHA `bfa02ac4…fc3a`（與 v429 逐位元相同）。全部診斷 ≤10 s，集合預建一次，無平方級掃描。

### 採用改動：cover444 頭部覆蓋 2685 列 — 驗證通過
| 檢查 | 結果 |
|---|---|
| 列數 | 349492 → 352177（+2685） |
| 舊列保全 | v429 全部 349492 列以**多重集**比對缺 0 列；未匹配的新列恰為 2685 |
| 幾何／拓撲 | `aligned-world.npy`、`aligned-tris.npy` 逐位元相同 |
| 新列屬性 | class 0（2685/2685）、size byte19 = 242（2685/2685）、**owner 6（2685/2685，全模型 owner 6 總數亦為 2685）**、**provenance 10（2685/2685）** |
| bary／XYZ | 新列在自身面上，bary ≥0、和為 1（誤差 4.5e‑8）；全 352177 列 XYZ 對自身 face/bary 重建最大 0.00013 mm，新列 0.00005 mm |
| 位置 | world y .299–.571、z .716–1.007，島 9/22/337/12/369/272（臉＋髮），2623 個面 |
| 手部 | 新列所在面觸及 hand mask 0；hand73 art 2723/2723、continuation 5640/5640、material 8640/8640 全在 |
| 色彩規則 | 新列 src flags 為既有 bake() 三態（albedo 1153／front‑art 782／rear‑art 750），無新規則；同面既有列僅 42 列（確為欠採樣面），新列 lum p50 80 對既有 93 — **略暗，非加亮** |
| 法線 | 新列 |n| p1 0.995、p50 1.000 |

**真 UI 逐像素（v429 → cover444）**：`original-front`／`original-wide`／`right90`／`right270`／`near-solid`／`near-material`／`wide-solid`／`wide-material` 全部 **0 px 變、前景像素數 0 變**（幾何未動，實心／材質模式不受點列影響）。變動僅在 weighted：near 2421 px（bbox y117–572，前景 +1.2 %）、wide 1226 px（y83–271，+0.4 %）、angle270 1116 px、angle180 872 px，皆落在頭部框內。密度計數不等於整體視覺驗收，此處只確認無回歸。

### 語意更正（169/170 射線）— **獨立確認，接受**
我以原畫自身像素座標重做：pool 的 `source`／`source_pixel` 值域為 x 0–556.8、y 37.2–940.8，**本來就在 557×941 原畫框內**（我先前套 bake 反推得到 29 萬 px 的荒謬殘差，正證明該欄非世界座標），故先前乘 viewport 比例的映射確實錯誤。重取該 wide 視窗樣本 147 個（Developer 報 169，叢集定義略異）：源像素 x 352–436、y 157–265；**到圖形邊界的帶號距離中位數僅 1.4 px、75.5 % 在 3 px 內**，對照全體樣本 p50 47.6 px、淡紫樣本 p50 29.2 px。我另把這些點標回原畫並親看：它們**落在右側髮束的亮邊光與臉頰邊緣**，位置在圖形垂直跨距 37–940 的上四分之一，與底部金邊立領明顯分離。
結論：**這批射線不是領布**，先前「右領缺件」的來源歸屬無效；不建片、改判為右側髮束偏窄（頭髮幾何）是正確處置。v427 與錯誤映射保留為反例亦妥。**深度可行性數學不能單獨支撐布料標籤**這一點成立。

### 播放 v446
259 幀、theta 0→2π 單調、time .017→12.0、modelHash `bfa02ac4` 恆定、errors 0、bodyPixels 最小 **29825**；auto‑orbit 240 幀 azimuth 14.5→358、bodyPixels 最小 67816；prop clock span **6.682 rad**（>2π）；webm 12.4 MB；目錄僅 4 張 PNG，逐 30 幀 orbit 截圖確實缺失且已揭露，角度證據以 full8x4＋log＋影片成立。前輪兩處措辭（hand45 非全 0、27789）已在本包更正，**close**。

### Findings
- **零新增重要回歸**（Spec 局部）。cover444 為純加列、可逆、不動幾何與手部，新列屬性與來源規則全部可獨立重現。
- **建議級（新）B‑444‑1**：cover444 目標面上原本僅 42 列既有點，2685 新列即佔該區絕大多數；近景密度雖與原版對齊（14770 vs 14861），但該區的視覺質感實際由新列主導，屬推定覆蓋而非原畫採樣，建議在契約中標明此比例。
- **維持未解（Developer 所有，未關閉）**：頭部 130 mm 髮片層疊落差與橫向摺痕、右側髮束偏窄、背面髮層次與 270 深色可讀性、右領近景片小而暗、袖片推定深度與 F‑320‑1 互穿、S‑296‑1、cap76/74、UV placeholder、既有 114＋154 翻面（前輪已判建議級）。
- **不宣告 Ticket01／U08／A13 通過**；03 維持 blocked。隔離渲染器尺寸法則候選不在本包，未評。

**限制**：未重做全面 winding／逐面掃描（沿用 v429 結論）；新列的視覺質感只以密度與像素差評估，未逐點比對原畫星點分佈；叢集樣本數 147 與 Developer 的 169 差異源自我方叢集門檻，未逐一對齊 ID。

## Root v450 density-rule caution
Read v450 build: F_LO2.5/F_HI8 plus binary near-camera first-hit visibility gate. This is indeed static construction, notruntimepointreplacement, but it is an additional camera-visibility-conditioned density rule. U01 explicitly says SAME area/brightness rule overwholehead and no sparsefront/solidbacksamplingseam. Existing first-hit use for sourcecolour binding does not automatically justify a binary3.2x density boundary. Treat450 as experiment only; ifretained mustshowallintermediateangles/no visibility-boundary seam andexplaincompliance, notjustnearcountsunchanged. Prefer unified physical/surface/view size law withinisolatedrenderer ifitcanmeetapprovedappearance; authorizationgivenv4prompt. No needstopforpermission, but do not call unchangednear aloneacceptance. Continue actualheadtopologycorrection too.

## Root v459 vs original rear-reference — missing strand structure
Root re-viewed rear-reference.png alongside head-closeup180-solid-429-459.png. Reference has MANY SHORT overlapping tapered locks in several staggered rows, with individually curling tips aroundnape; 429/459 mesh is dominated by a few LONG broad vertical grooves spanningmostrearhead. v459 increases relief oftheexistinglonggrooves onlyslightly; it cannotproduce reference's missing shortlayeredstrand structure. This is a concrete geometry/detail mismatch, notmerelybrightness orquantity. Pleaseuseactualreference lock directions/length/overlap toguide localtrue3Dsurface rework; addingdepthtoexistingbroadgrooves alone shouldnotbeexpectedtoclosebackhairshape. Stillnotpermissionforfloatingoutlinecards; anchoredcurvedhairlocks/remappingorcoherentrebuiltlocalsurface are withinexistingauthorizedgeometryscope. Preservefrontsilhouette andwholevolume. Do nothaverenderinglabelfullshapeaccepted.

## Root actualUI v455 / head459-cover460 checkpoint
Used separateIABtab7 at combined-local-offset-v455.html?assets=./combined-head459-hand73-clothes415-cover460-bound-preview/&render=weighted&diameter=source&lighting=source-rig&lightclose=source&sky=source&stars=45000. UI geometrySHA11549d26dd08. Clickedbackhold6.5 theninspect270/headfocus200 at1280x720. Backcoveragevisiblystrongerthan422/444 butstillbroadmass withweakindividualshortlocks; 270face/neckboundaryslightlymorecoveredbutfrontbulb/capoutline remains. Localimprovementnotwholepass. Referpreviousrootrear-reference actualshape mismatchshortstaggeredlocks vsfewlonggrooves. User360tabsnotchanged.

## Independent460 review completed — important evidence gap for v455
Reviewer exec51176exit0,sameisolatedOpusbothaxes, fullresult work/model-trial/clothes-review-opus-01-v460-result.md. Local460geometry/provenance/coverage noNEWimportantregression. V455onlypoint-diameter.jsbodybranchchanged,noprop/sky/time,7staticviews near/wide/angles0pxchange. IMPORTANT: v463realplayURLusesv117, NOTv455. Beforeusingv455forcoherentnewhaircandidate, runactualcontinuousplay/auto-orbit/propverificationthroughv455(ornewderivedentry) andreportexactentry. Existing463doesnotcovernewsize lawcontinuously. No needstopheadwork; includeproofinnewcandidatefinalverification.
Nitsnextreport/frozen460unchanged: S4601uniquechangedvertices14414(not250+14415=14665overlapdoublecount), observedflips68/stretch19vsDev69/21thresholddiff. S4602+35.5% is HEADbandROI(6301→8535),wholeforeground+7.1%(124873→133746); labelROI. B4441disclosure60old/3000new98%confirmed. Reviewer130mmretractiondidNOTrerunactualdistance; supportingvisualreasoningonly, don'tclaimindependentre-measurement.
Repeated03wordingclarification: formaladoption/main-site03blocked, isolatedv455validatedusagein01alreadyRootauthorized; requirednewentrycontinuousproofstillapplies. Knownfinehairstructure/cap/near-rightcollaropenNO01pass. Fullreview follows:
## v460 增量複驗（Spec＋Standards，局部；Opus 5 fallback，同一 Reviewer）

**Snapshot**：`claude-review-v460/manifest.json` SHA `b3526378…78d3`、2503 entries，與指定值相符。combined solid `11549d26…`、bound 352492 列。診斷各 ≤10 s，集合預建一次，無平方級／全面 winding 掃描。

### 1. 髮片幾何 v457＋v459 — 無新撕裂
| 檢查 | 我方實測 |
|---|---|
| 變動頂點（唯一） | **14414**、平均 2.5 mm、最大 10.8 mm；>8 mm 僅 293 |
| 範圍 | y .301–.575，島 22/337/12/7/272；hand mask **0**；tris 逐位元相同 |
| 面品質 | 受動 25003 面：翻面 68、過度拉伸（>4×/<0.25× 且 >1 mm²）19、退化 **0**；翻面面積 p50 1.20 mm²、p90 6.64 |
| 近景不變性 | 移動頂點在相機 52 的投影位移 **最大 6.0e‑5 px** |

親看 `head-closeup270-solid-429-459`：背面髮束起伏確實變得可辨，輪廓與前版一致，**無撕裂、無浮片、無新接縫**。側／背／near/wide 未見新形變。

**Nit S‑460‑1**：README §7 寫「14665 頂點（250＋14415）」是兩步各自計數之和，兩步有 251 個重疊頂點，實際唯一移動頂點為 **14414**；翻面／過拉伸 69/21 我方得 68/19（面積門檻定義差）。

### 2. 「130 mm 層疊落差」更正 — 獨立確認
我未重做該量測（依指示不重跑），但本輪幾何證據與更正一致：島 22 在該帶的變動集中於片緣（>8 mm 僅 293 個頂點、最大 10.8 mm），若真存在 130 mm 崖，≤8 mm 的回捲不可能讓 270 特寫的「帽簷」讀感改善——而對照圖確實改善。原數值出自島 bounding box 誤讀，**更正成立**；先前我方報告沿用該數字之處一併作廢。

### 3. 覆蓋 cover460 — 單一面積規則，v450 閘門確認排除
- build 腳本 `FLOOR=2.5`，只依「每面面積 × 2.5 列/cm²」補點，**無任何近相機可見性門檻**（grep 到的 visibility 字樣全屬 flap/rear 材質規則）。v450 二元門檻**確實未進入 460**。
- owner 6：2685 → **3000**，class 0（3000/3000）、size byte19 = 242、provenance 10、2903 個面。
- **B‑444‑1 同型揭露複驗**：那 2903 個面原有既有列僅 **60** 列，新列佔 **98.0 %**，與 README 一致。

### 4. Provenance
owner **1（hand73 16580）／2／3／4／5 以多重集比對完全相同**；owner 0 仍 319459 列，其中 306876 逐位元相同、12583 列因幾何位移重算（xyz 12385、normal 12137、rgb 2432、**size 0**）——與 README §7 完全吻合。hand73 art 2723／continuation 5640／material 8640 全在。全 352492 列 XYZ 對自身 face/bary 重建最大 **0.00013 mm**、0 列超 0.05 mm。

### 5. v455 隔離渲染器 — 法則正確、範圍乾淨
- 與 v117 runtime 相比**只有 `point-diameter.js` 一個檔案不同**（HTML 僅換 runtime 路徑）。
- 增益 `framingSizeGain = clamp(focal/6.5230390868, 1, 2.6)` **只套在 body 分支**（`role ∈ [−0.5, 0.5]`）；**prop 分支（role 0.5–2.5）與 `skyPointDiameter` 完全未動**，非 sourceStyle 後備分支亦未動。JS 與 GLSL 兩份實作一致。**無時間項**。
- 逐像素複驗（同資產、7 視圖）：near／wide／45°／90°／270°／315° **任何門檻下皆 0 px 變動**、前景數 0 變 ✓；back hold 27973 px 變動。
- **Nit S‑460‑2**：README 的「back hold +35.5 %（6301→8535）」是**頭部帶亮點**口徑；全畫面前景為 124873→133746（+7.1 %）。兩者皆真，但表格未標 ROI。

### 6. ⚠ 證據缺口（重要，須精確陳述）
`v463` 真播放的 URL 是 **`combined-local-offset-v117.html`**（我直接讀 result.json 確認）。因此 259 幀 theta 0→2π／hash `11549d26` 恆定／errors 0／bodyPixels ≥29898、orbit 240 幀 azimuth 16.0→359.5（最小 67999）、prop span **6.747 rad** 這組連續證據，驗證的是 **cover460 資產在未改尺寸法則的 v117 入口**。
**v455 尺寸法則目前只有 7 張靜態視圖，沒有任何連續播放／自轉驗證。** 不得把 v463 讀成「新入口已完成連續驗證」。orbit 逐 30 幀 PNG 仍缺（已揭露），角度證據依 full8x4＋log＋影片。

### 結論
- **Spec（局部）：零新增重要回歸。** 髮片回捲與起伏放大是真實局部形體改善且不破壞拓撲；覆蓋回到 U01 單一面積規則；手／衣／相機 52 未動。
- **Standards（局部）**：S‑460‑1（頂點計數口徑）、S‑460‑2（+35.5 % 的 ROI 標註）兩項 nit；**證據缺口一項**（v455 無連續驗證，須在下輪或採用前補）。前輪 169 射線語意更正已於 v444 確認，不重做。
- **已知重要未解（Developer 所有，未關閉，不因本輪改善而收斂）**：背面短層次髮束仍缺（參考為多束短鎖，候選為少數長溝）、側面髮團仍厚、近景右領片小而暗；另有袖片推定深度、F‑320‑1 互穿、S‑296‑1、cap76/74、UV placeholder、累積翻面（114＋154＋68）。
- **不宣告 Ticket01／U08／A13 通過**；正式 runtime 未動，v455 採用與否屬 03／final UI。Root 正在進行的短髮鎖重建不在本包，未評。

**限制**：未重做全面 winding／逐面掃描；68 個翻面以面積分布＋270/180 特寫判讀，未逐面套色渲染；背面層次改善以素模對照判斷，未做與參考圖的量化相似度；v455 只驗靜態 7 視圖。

## Root fresh-rebuild reference overlay observation
Viewed model-v10-head-evidence-v464/rear-reference-vs-current-hair-v466.png. Candidate green/red hair overlay occupies upper-left fraction of referencehair (ear/nape/crown alignmentvisiblyoff); investigatewhetherexistingrear-imagefit/worldtransformisnowstaleafterheadreproportion beforeusingitfornewlocklandmarks/sourcecolours. Do NOT treatoldrearfitasimmutableacceptedpin. Refittingreferenceprojection/data-mappingwithin01authorized, whileoriginalfrontpose/formalcamera52shouldremain. Useactualreference landmarks andsamecameracomparison; this couldalsoexplainbadrearcolour/strand correspondence. Yourdiagnosticmayalreadybeaddressingit; rootnotassumingcauseuntilverified.

## Root initial v469 solid visual
Viewed head-closeup180-solid-457-v469.png. Rightcandidate now has dense angular/jagged faceting acrossback, but individual smooth shortcurvedtaperedlocks asreferenceare notyetreadable; it readscrumpledsurface ratherthanhairstands. This is an initialdryrunobservation, notblanketmethodrejection. Ifdetailfrequencyexceedsexistingmeshsampling, resolvegeometry/tessellation/locksurface continuity beforestarcoveragemasksit. Needtargetobservablecurvedoverlappinglocks withanchoredroots, notjusthigherfrequencyrelief. Continueyouriterativefixwithinapprovedscope.

## Root v471 extraction visual
Viewed reference-lock-extract-s21-w10-b4.png: middle segmentation merges many distinct visiblelocks intoverylargecolourregions, while rightgrayscale mostlyblurredlighting. These regions are notyetindividualtaperedhairlocks; directextrusionwouldrisk broadblobsagain. You can explicitly trace a modestsetofreference-guided curved lock centerlines/boundaries ifautomaticsegmentationfails; manualreferenceannotation is allowed, no neednewtools/generation. Requirementisobservable layeredshortlocks, not anyparticularimageprocessingmethod. Do notoverinvestinparametergridsifsemanticresultdoesn'timprove.

## Root v473 tessellation claim needs visual evidence
Readv473doc: 23mm pitch /5.3mm vertexspacing≈4.3 verticesperlock is usedtojustify 'mesh CAN carry, no newverticesneeded'. That ratio alone doesnotdemonstrate smoothcurvedtaperedoverlaps; v473actual180image stillfaceted/crumpledinmanyareas. Review actualquality ratherthanusingNyquist/vertexcountasacceptance. Localresampling/subdivision/newlocksurfaces are allowed ifsamplingisinsufficient; oldtrianglesnotimmutable. Avoidonlyamplitude/jitterparameterloopswhilecrosssectionremainsfewvertices. Ifbetterv473bvisuallyresolvesit,showevidence; otherwiseaddressmeshresolution/continuityatcorrectseam.

## Root actual v473d visual check — do not accept texture relief as completed locks
Viewed model-v10-head-evidence-v473/head-closeup180-solid-457-v473d.png. Right candidate still has crumpled/faceted small ripples, dark slit-like edges, and old long vertical lobes dominating. It does NOT yet show reference's smooth short curved tapered overlapping hair locks. Integration v474 can evaluate star appearance but is not evidence the required geometry is solved. Please read this before freezing/Ready. Existing-vertex displacement iterations have repeatedly produced relief texture instead of actual strand shapes. Use a bounded explicit patch of several smooth curved tapered lock surfaces with sufficient tessellation, inspect solid + weighted and reference crop, then extend if successful. Preserve near silhouette / hand / cloth, fixed XYZ at runtime. Do not report task complete on basis of candidate numbering, geometric deltas, or coverage alone.

## NEW USER CONFIRMATION — side clothing reference
User explicitly identifies previously generated docs/work/portrait-orbit/references/side-profile-candidate-v1.png as the side clothing reference to use. Approved to correct side garment geometry using it while preserving original frontal outfit/pose. Current baseline-only brief remains: prepare head baseline comparison first, no premature edits. Include a brief note locating shoulder/sleeve/collar depth differences against this confirmed reference if feasible, without expanding the bounded comparison into implementation.
Root viewed confirmed side-profile reference now. It clearly supports collar around neck, shoulder wrap over sleeve and descending chest lapel. It is cropped upper-body and neutral arm posture, so not evidence for lower sleeve or replacing original reaching-arm pose. Correct side attachment/depth based on those visible upper garment relations; keep original pose. Avoid saying whole sleeve is directly evidenced by generated reference.
Root viewed v481 strips near52 and side90. v5-native appears materially smoother and less deformed than 318/376/459, but all are poor human forms in these diagnostic renders. Later versions show face-like area ripples as well as hair, which is concerning: audit whether hair masks accidentally include face/cheek, and whether renderer smoothing/backface handling creates misleading shading before calling shape conclusions. Near52 shows hair covering nearly entire facial area, not original artwork's clear face. Need verify with actual browser solid/material same versions; do NOT choose 376/459 just because prior numerical projection checks passed. v5 can be candidate starting point only, not accepted final. Distinguish clipping at ymin .28 from actual open mesh defects. Ensure comparison labels appear ON artifact, not only JSON, and same physical frame/scale (bounds-derived target can differ across baselines). Keep bounded baseline work.
Root runtime shortcut: existing v10/combined-live-playback-v326.mjs imports Playwright file:///C:/Users/leslie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs ; chrome executable C:/Users/leslie/.cache/puppeteer/chrome-headless-shell/win64-152.0.7977.75/chrome-headless-shell-win64/chrome-headless-shell.exe . Existing Windows bundled node under corresponding dependencies/node path. Avoid broad AppData searches; reuse these exact known working prior capture imports. No install needed.
## Root actual raw v1 browser first check
Loaded raw-glb-stars-v1.html in CUA at1280x720, original texture/full then head focus, toggled stars same camera. Texture head has coherent smooth jaw/face, though source differs originalart. Stars default psize1 gives huge confetti-like ~8px circles on head and mottled pale patches through dark face, likely back/far stars leaking without source-surface occlusion. MUST inspect proper source depth prepass occlusion (same original mesh, normal opaque visibility, no cutting/view-switched sets) and set reasonable fine star defaults in screen units. Current giant circles not intended star quality. Do not alter geometry to fix rendering. Root image source actual page not custom CPU renderer. Preserve camera on mode toggle (worked). User wants line detail retained, not discs filling all surfaces. Developer should inspect before Ready; this is first baseline development feedback, not full geometry acceptance.
Root reloaded actual browser after depth-prepass+psize0.45 fix. Head front now retains clean dark face without prior pale mottled leakage; circles visibly finer. This fixes initial renderer defects but is NOT final line-quality acceptance: hair lock separation remains faint in sparse baseline vs source texture. Good basis for same-camera diagnosis, no geometry intervention yet. Verify side/back and continuous actual tests. Original source material label should disclose this is base-colour texture diagnostic with optional simple normal light, not complete glTF PBR reproduction (unless now implemented). Source head is smoother but source posture/proportions/reference mismatch remain separate. Prepare final bounded raw baseline evidence for independent review, don't silently tune shape.
Root final baseline actual270solid check shows rear-oblique head, not anatomical profile (raw source facing yaw means0/90/180/270 are source-coordinate presets). Thus README 'no nose/profile structure' is NOT proven by these four preset angles. Must inspect actual anatomical frontal/profile at intermediate angles such as45/135/315 before deciding missing face geometry. Do not equate simplified NdotV shading low relief with nonexistent facial structure, or original darkface with literally no facial features. Current raw270hair smooth shallow grooves distinct from oldwarpedcap, preserved coherent neck/collar relation. Next baseline improvements should include eight angle presets for honest head/clothing inspection, same source unchanged. CurrentReviewer independentlycheckingfrozenfiles; leavefrozenunchanged untilreviewdone.
Root correction for addendum A: CUA actual in-app browser was visually inspected, but its GL renderer/backend was NOT queried. Do not call Root observation 'non SwiftShader evidence' or hardware/GPU crosscheck. State 'Root actual in-app UI observation, renderer backend unknown, not hardware-vs-software pixelcomparison.' Existing tools may permitdefaultChrome but noneed claims/broad new probes. Two launches default bothSwiftShader proves these two configurations only, not all approvedtoolschain unavailable. Please correct wording in addendum beforeReady; no rerenderneeded.
Root read v2-art-camera.json: wide az204.2 selected! This is likely REAR-facing relative raw0front/180back. Whole-silhouette IoU + averagecolor can still select wrong anatomical side. Do NOT adopt rear view to match frontal originalart, evenhighermetric. Constrain front-facing yaw range from actualmesh face/palm orientation and verify visibleface/reachingpalm/chest vsrearhair. Use few semantic landmarks (chin, facecenter, shoulders, reachingpalm, torso) for camera fitting rather than silhouetteglobal alone; brightness can't disambiguate similarfrontbackcolors. Near/wide need same frontal pose, not flipped facing direction. Inspect screenshot of current204 beforecallingbest. This is a known priorfailureclass, avoid metrics winning against obvioussemanticmismatch. No geometrywarps ascompensation.
Root actual v2 UI1280x720 clicked 原畫構圖: frontalpose selected now17.4, good. BUT reaching hand is mostly cut OFF LEFT edge of portrait canvas while originalhand fullyvisible. This is NOT acceptable 'original composition' fit evenIoU. Add explicit reachinghand-inframe constraint or choose wider conservative framing, record residual head/pose mismatch. Do not improveIoU bycropping importantbodyparts. Screenshot currently sourceheadnarrow/taller, shouldernearlevelvsoriginaltilt; labels should say '構圖比對' or '近似構圖' not imply A13match. No deformation tocorrectthisyet; present honestcameraonlyresidual. Core user earlier A03handvisible. Preserve fullaspectreference and samecamera, noindividualstretch. Original unmodifiedstep can reveal necessarylocalposefix but not hidehand.
