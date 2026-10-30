# Agent-to-agent handoffs / Agent 對 agent 交接

[English README](../README.md) · [繁體中文](../README.zh-TW.md) · [Trial guide / 試用指南](TRY_IT.md)

## The workflow / 使用方式

```text
Frontend agent: implement → inspect diff → identify backend follow-up → generate 改動.md
You: send the file through Telegram
Backend agent: read → verify against backend code → implement / ask questions → generate 回覆.md
You: send the reply back
Frontend agent: import reply → inspect API details → make any required frontend changes
```

The CLI formats and tracks the handoff. The existing coding agent supplies the reasoning and requirements. It does not start another agent or call an AI API. Documents are not delivered automatically.

工具負責格式、Git 資訊與交接關聯；你正在使用的 coding agent 負責理解程式和判斷需求。**不是工具看見 diff 就能自動知道後端該做什麼。** 下方指引可以放進任務提示詞，或由你加入現有的 agent 專案規範；工具不會自動修改 `AGENTS.md` 等指令檔。

## One-time setup / 一次性準備

1. Install the tool once on each developer's computer. See the README; do not clone the tool into every application repo.
2. Run `handoff info` in each actual application repo. Share the displayed identities, for example `Example/shop-web` and `Example/shop-api`.
3. Optionally run `handoff init --to Example/shop-api` in the frontend repo to remember the recipient. The agent can then generate without repeating `--to`.
4. Give the agent the relevant instructions below. No manual source project name is needed. Use `--project` only for a deliberate alias.

## Instructions for a frontend agent

Copy into the coding task or your existing agent instructions, replacing the recipient with the backend's actual `handoff info` identity:

```text
After completing this frontend task, prepare a backend handoff if backend work is required.

1. Run handoff info in this frontend repository to confirm the source and default recipients.
2. Inspect the actual task diff, relevant API callers/mocks, existing contracts, and tests.
3. Identify concrete backend work. For each task, record the requested behavior, source
   file/line evidence, relevant request/response/error fields, acceptance criteria, and
   unresolved questions. Label assumptions as questions; do not present inferred contracts
   as already agreed. Do not invent missing backend implementation details.
4. Generate a document with handoff generate. Add one --note per self-contained backend
   task; include the context above in that note. Use configured recipients or --to Example/shop-api.
   Select the correct Git comparison: default for uncommitted tracked changes; --staged for
   staged work; --base <actual-start-ref> for committed task changes. Do not assume a clean
   working tree contains the changes you just committed. Stage new files only as permitted
   by the project's existing workflow.
5. Read the generated Markdown and verify its changed files, task evidence, and task IDs.
   Report the output path, original handoff ID, and remaining questions to the user.
   Do not edit the generated Markdown/front matter manually, and do not claim it was sent.

The CLI does not infer backend requirements: supply them explicitly after inspecting the code.
```

中文版本：

```text
前端任務完成後，如果需要後端配合，請主動整理交接：

1. 在前端 repo 執行 handoff info，確認目前專案與預設接收方。
2. 檢查這次任務的實際 diff、API 呼叫或 mock、既有契約與測試。
3. 每個後端待辦應包含：要做什麼、程式依據（檔案與行號）、相關請求／回應／
   錯誤欄位、驗收條件、待確認事項。推測請明確標為待確認，不要寫成已達成共識。
   無法看到後端程式時，不要假裝知道它目前的實作。
4. 執行 handoff generate，每個 --note 放一項包含上述上下文的完整待辦。
   使用預設接收方，或加 --to Example/shop-api。請選對比較範圍：未提交的已追蹤
   變動用預設；只交接暫存內容用 --staged；已提交的任務用 --base 加實際任務起點。
   乾淨工作區不會包含已提交的變動；新檔案是否暫存請遵循專案既有工作流程。
5. 讀回生成的 Markdown，核對檔案清單、待辦依據與編號。回報檔案路徑、原始交接
   編號與待確認事項。不要手動修改生成文件，也不要聲稱已經傳給後端。

CLI 不會自行推斷後端需求，請由你檢查程式後明確提供。
```

### What one task should contain / 一項待辦的內容

This is an author-supplied task, not an automatically inferred fact:

```bash
handoff generate --to Example/shop-api --note "需求：提供 POST /api/register；依據：src/api/auth.ts:18 的呼叫；請求：email、password；成功回應：需與前端確認 userId 格式；驗收：有效請求與重複 Email 均有測試；待確認：重複 Email 是否回傳 409"
```

Use only paths, line numbers, and field names verified in the real project. A `--note` is a single-line task; repeat the option for separate tasks. The example is a proposed handoff, not a claim that every registration API has this contract.

If no backend work is required, report that finding instead of fabricating tasks. Git TODO extraction is a supplement, not the full requirements analysis.

## Instructions for a backend agent

Give the backend agent the received file and these instructions:

```text
Read the attached frontend handoff and handle it in this backend repository.

1. Run handoff info. Import the file with handoff import <received-file>, then inspect
   handoff show <original-id>. If the recipient does not match, report the identity mismatch;
   do not edit the document to bypass it.
2. Treat the handoff as requirements to verify against the actual backend code and existing
   contracts. Preserve original task IDs/text. Resolve assumptions and conflicts explicitly.
3. Implement agreed work and run appropriate checks. Do not mark something done merely
   because you changed a file. Record each task with handoff update <original-id>
   --task TASK-001 --status <state> --note <actual result, validation, or question>.
   Use blocked or needs-clarification where appropriate. Do not claim tests you did not run.
4. Run handoff reply <original-id> --note <actual API behavior and frontend follow-up>.
   Include relevant endpoints, fields, error behavior, verification, and remaining questions.
   The reply's HEAD is only a commit reference; it does not include uncommitted changes or diffs.
5. Read the reply and report its path and original handoff ID. The user sends the file back.
```

中文版本：

```text
請在後端 repo 處理收到的前端交接文件：

1. 執行 handoff info，然後用 handoff import <收到的檔案> 匯入，使用
   handoff show <原始交接編號> 查看。接收方不符時先回報，不要改文件來略過檢查。
2. 對照後端實際程式與既有 API 契約核對需求。保留原待辦編號及文字；有推測或衝突
   要明確提出，不能只因文件寫了就視為既定共識。
3. 實作已確認的工作並執行適當檢查。每一項都用 handoff update <原始交接編號>
   --task TASK-001 --status <狀態> --note <實際結果、驗證或疑問> 更新。
   需要確認或被阻擋時用 needs-clarification／blocked，不要假報完成或沒跑過的測試。
4. 用 handoff reply <原始交接編號> --note <實際 API 與前端需配合事項> 產生回覆，
   說明端點、欄位、錯誤處理、驗證與剩餘問題。HEAD 只是 commit 參考，不包含未提交
   的變動或後端 diff。
5. 讀回回覆文件，回報檔案路徑與原始交接編號，讓使用者傳回前端。
```

## Frontend agent receives the reply / 前端 agent 收到回覆

Import the reply, inspect the **original handoff** with `show`, and read each recipient's actual task outcomes and notes. Compare backend behavior with frontend callers before making follow-up changes. If another backend change is needed, generate a new handoff referencing the earlier ID in the task note.

匯入 `回覆.md` 後，使用原始交接編號查看回覆。先核對後端實際回報與前端呼叫方式，再調整前端；若還需要後端處理，產生新的交接，在待辦備註中引用前次編號。工具不會自行同步另一端的程式碼。
