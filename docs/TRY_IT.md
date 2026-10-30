# Frontend/backend trial / 前後端試用

Use regular chat to exchange the generated files. Telegram integration is not needed. Replace `<id>` with the original ID printed by `generate`; do not type the angle brackets literally.

透過一般對話傳送檔案即可。`<id>` 代表 `generate` 顯示的原始交接編號，請替換整段內容，不要照打角括號。

## Before starting / 試用前

- Both developers install the tool: follow the [English](../README.md#install-from-source) or [中文](../README.zh-TW.md#安裝) instructions.
- Both repositories need Git and at least one commit.
- Agree on labels: frontend `shop-web`, backend `shop-api`. Labels are case-sensitive.
- `init` runs once. For an existing config, edit its `project` and `language` fields instead.

## Frontend / 前端

Run inside the frontend project after making a real change:

```bash
handoff init --project shop-web --lang zh-TW
handoff generate --to shop-api --note "確認這次 API 的請求、回應與錯誤格式"
```

1. Read `handoffs/<id>/改動.md`: does it list the right files and tasks? Compare the requested mode with `git diff HEAD`, `git diff --cached`, or `git diff main...HEAD` as appropriate.
2. Ensure the explicit note contains enough information for the backend. It becomes `TASK-001`.
3. Send the `.md` file through Telegram. Keep the frontend `.git-handoff/` records.

閱讀產出，確認檔名、待辦與實際變動一致，再把 `.md` 傳給後端。請保留本機紀錄，以便接收回覆。

## Backend / 後端

Run inside the backend project:

```bash
handoff init --project shop-api --lang zh-TW
handoff import /path/to/改動.md
handoff list
handoff show <id>
```

After implementing and verifying the work:

```bash
handoff update <id> --task TASK-001 --status done --note "說明實際 API、欄位、錯誤格式與驗證結果"
handoff reply <id> --note "說明前端接下來需要配合的事項"
```

If blocked or unclear, use `--status blocked` or `--status needs-clarification` instead of `done`. Update every relevant task separately; only the first explicit note is guaranteed to be `TASK-001` in this example.

Send `handoffs/<reply-id>/回覆.md` back. Commit code first if the reply's HEAD should point to that implementation. Replies do not automatically include backend code changes.

## Frontend receives the reply / 前端接收回覆

```bash
handoff import /path/to/回覆.md
handoff show <id>
```

Check the backend's status and notes under received replies. The original task snapshot remains unchanged, so distinguish it from the recipient's response.

## Troubleshooting / 常見問題

| Message / 問題 | What to check / 處理方式 |
| --- | --- |
| No changes | New files require `git add`. `--base` only includes commits. Default mode needs changes relative to HEAD. |
| Recipient mismatch | Set backend `config.project` to the exact label used by frontend `--to`. Do not edit the received file. |
| Already imported | Expected for duplicates. Local task progress is preserved. |
| Unknown handoff | Use `list` in the right repo. Preserve `.git-handoff/`; import the original handoff before replying. |
| File exists / EEXIST | Pick a new `--output` path. Existing files are never overwritten. |
| No tasks | Supply `--note` when generating; unchanged TODOs are not extracted. Generate a new handoff rather than editing the old one. |
| Reply rejected | The sender, original ID, and full set of task IDs/texts must match the saved outgoing handoff. |
| Nothing sent to Telegram | Expected. Send the generated file yourself. |

## Useful feedback / 試用後最有用的回饋

- Which changed file or new TODO was missing or incorrect?
- Could the backend act on the note without asking for context?
- Did the reply clearly identify completed work and unresolved questions?

可在 [Issues](https://github.com/WatsonChen/git-handoff/issues/new/choose) 回報，附上去識別化的指令、預期輸出與實際輸出。不要附私有程式碼或機密資訊。
