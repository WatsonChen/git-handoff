---
schema_version: 1
kind: "handoff"
id: "hf-20261030-eac31e7b"
from: "Example/shop-web"
to: ["Example/shop-api"]
source_commit: "468a054082901505fdda31b9a2a328f2befe2a19"
comparison: "HEAD to working tree"
status: "pending"
created_at: "2026-10-30T03:00:14.471Z"
language: "zh-TW"
files: ["src/register.ts"]
tasks: [{"id":"TASK-001","text":"需求：提供 POST /api/register；依據：src/register.ts:2 的呼叫；請求：email、password；驗收：成功與重複 Email 回應經雙方確認；待確認：成功回應是否包含 userId","status":"pending"},{"id":"TASK-002","text":"TODO: agree on duplicate email response (src/register.ts:3)","status":"pending"}]
notes: []
---

# 變動交接

## 本次改動

- src/register.ts

## 待處理

- [ ] [TASK-001] 需求：提供 POST /api/register；依據：src/register.ts:2 的呼叫；請求：email、password；驗收：成功與重複 Email 回應經雙方確認；待確認：成功回應是否包含 userId (pending)
- [ ] [TASK-002] TODO: agree on duplicate email response (src/register.ts:3) (pending)

## 補充與待確認

- 請與接收方確認 API 契約及驗收條件。

## 來源與編輯方式

- 待辦來自明確備註及差異新增行的 TODO/FIXME，不是完整專案待辦清單。
- source_commit 標示 HEAD，不含未提交內容；回覆不會自動附上後端 diff。
- 工具讀取檔頭資料。請用 handoff update/reply 更新狀態，不要手動修改產出的文件。
