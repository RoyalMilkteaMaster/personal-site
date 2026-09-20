# 本輪派工紀錄（2026-09-10）

基準 main / 41e27f9eb99e6c93d344dc5f9e5ebd6df855f0f6，保留全部既有未提交與 work 資料。
.milktea/agent-settings.yaml 不存在；WSL Ubuntu 可讀寫專案且 Claude/Codex CLI 可用。work/model-trial/AGENTS.md 與當前 agent-brief/next-task-handoff 明確要求原生 Astra medium 實作、Sol 5.6 high 獨立檢查，故依專案明確設定使用原生 Subagent，不使用 CLI 預設路由。
可用槽位 4（含 Coordinator）。

| Ticket/角色 | Agent | CLI | 實際模型 | 推理 | 設定來源 | 難度及路由 |
|---|---|---|---|---|---|---|
| 01 Developer/共同模型與雙手 | /root/portrait_model | 無，原生 | gpt-6-astra | medium | work/model-trial/AGENTS.md | 高/不確定：3D形體與表面校準；明確指定模型優先 |
| 02 Developer/runtime | /root/portrait_runtime | 無，原生 | gpt-6-astra | medium | 同上 | 高/不確定：相機、文字及可視驗證；明確指定模型優先 |
| 01 臉髮部位實作 | /root/portrait_face | 無，原生 | gpt-6-astra | medium | 同上 | 高/不確定：原畫匹配；明確指定模型優先 |

模型/生成資料單一寫入者 portrait_model；runtime 單一寫入者 portrait_runtime；臉髮只交獨立修正模組。衣服角色待槽位釋出安排。Reviewer 尚未派發。03 依賴01/02驗收，尚未解鎖。

## 控制快照審查與槽位調整

原生新增Reviewer連續回報agent thread limit reached，故使用已驗可用的WSL Codex CLI建立兩個隔離上下文，仍維持指定Sol5.6/high。CLI實際啟動header證明model=gpt-5.6-sol/provider=openai/reasoning effort=high。
- Ticket02 Reviewer A Spec：CLI codex0.149.0，session01a08829-8e0a-7e70-9326-62e2966674a7，exec18366，camera-review-a-v10-{task.md,log.txt,result.md}；不適用難度路由。
- Ticket02 Reviewer B Standards：CLI同上，session01a08829-8e88-75b1-82a5-6a2cf32b9298，exec96362，camera-review-b-v10-*；不適用難度路由。
- 固定snapshot work/model-trial/runtime-review-v10，manifest13eabb61b259887ea0018bf865f418386f299c0ee8b292bf70f6b33cd45ba2a3。僅控制差異可審，U03/U07/U08未過，不能整票完成。
- portrait_clothes Astra/medium接手model-v10-clothes-*，已交v3並續作肩袖/前襟三角形鄰域修正。portrait_model唯一共同整合，重建右手後仍做視覺迭代。
- portrait_face已完成局部v1但U08失敗；平台無法恢復其上下文。原portrait_runtime在保留Ticket02快照後暫接臉髮獨立v2部位修正（不改runtime或共同資產），Astra/medium。原Developer角色仍在，可接Reviewer Findings。
- root CUA已實際操作3004/v10/guided.html，重播會退出檢查並自動到12秒；已看原版wide、v9背面、v10側面素模、右手0/90。以上為草稿檢查，未宣稱完整視覺通過。

## 使用者變更審查配置
使用者直接要求單一Claude Fable5.1/medium取代兩Sol；CLI probe成功，modelUsage canonicalModel=claude-fable-5-1，provider firstParty。兩Sol exec18366/96362已Ctrl-C停止exit1，保留log；不得當完整Review。新Reviewer兩軸合併、CLI不占原生槽。

Claude首輪完成，session dad7dabc-e3c3-40e0-bf57-51b3b077b3d5，結果camera-review-fable-v10-result.md。Spec/Standards待修正：重要Finding為d/3點尺寸退化；控制行為成立，U03/U05/U07/U08草稿失敗。已交原Developer獨立重現，之後同session複驗。

Claude同session定向複驗runtime-review-sizefix（manifest50af3722…d7a49）完成：重要Finding1 closed，36檔驗證0、回歸old1/new0、實際wide與prop畫格確認。結果camera-review-fable-sizefix-result.md。整票仍未過，最終U03/U05/U07/U08與其餘U驗收繼續。
