---
schema_version: 1
kind: "reply"
id: "hf-20261030-a7672d39"
from: "shop-api"
to: ["shop-web"]
reply_to: "hf-20261030-0daf7414"
source_commit: "3521d55cd5530d7b671c8f12b4430ef53d6bc0b9"
comparison: "reply snapshot at HEAD"
status: "needs-clarification"
created_at: "2026-10-30T02:01:25.339Z"
language: "zh-TW"
files: []
tasks: [{"id":"TASK-001","text":"確認註冊 API 的請求、回應與錯誤欄位","status":"done","note":"已完成 POST /api/register；請求包含 email、password，成功回傳 userId。"},{"id":"TASK-002","text":"TODO: agree on duplicate email response (src/register.ts:2)","status":"needs-clarification","note":"Email 重複是否統一回傳 HTTP 409？"}]
notes: ["請確認前端的重複 Email 錯誤處理。"]
---

# 交接回覆

原始交接: hf-20261030-0daf7414

## 本次改動

- 未附變動檔案清單。

## 待處理

- [x] [TASK-001] 確認註冊 API 的請求、回應與錯誤欄位 (done)
  - 已完成 POST /api/register；請求包含 email、password，成功回傳 userId。
- [ ] [TASK-002] TODO: agree on duplicate email response (src/register.ts:2) (needs-clarification)
  - Email 重複是否統一回傳 HTTP 409？

## 補充與待確認

- 請確認前端的重複 Email 錯誤處理。

## 來源與編輯方式

- 待辦來自明確備註及差異新增行的 TODO/FIXME，不是完整專案待辦清單。
- source_commit 標示 HEAD，不含未提交內容；回覆不會自動附上後端 diff。
- 工具讀取檔頭資料。請用 handoff update/reply 更新狀態，不要手動修改產出的文件。
