# Frontend/backend trial / 前後端試用

Follow [agent instructions](AGENT_WORKFLOW.md) if coding agents do the work. The commands below also work for engineers directly. Use Telegram to send files manually.

若由 AI agent 開發，請把 [agent 操作指引](AGENT_WORKFLOW.md) 給它；下列指令也適用於工程師直接操作。文件透過 Telegram 手動傳送。

## Once per computer / 每台電腦安裝一次

Install the tool in its own folder: [English](../README.md#1-install-the-tool-once-per-machine) / [中文](../README.zh-TW.md#1-工具每台電腦安裝一次). Do not clone the tool into each application repository.

工具只需裝一次。**操作交接時，要離開工具目錄，切換到真正的前端或後端 repo。**

## Open the actual application repo / 切換到真正的專案

```bash
cd /path/to/frontend-project
```

No `init` or recipient setup is needed. The tool detects the source repository; the receiving repo takes on the handoff when importing. Use `handoff info` only to inspect identity.

不用初始化或約定接收方名稱。前端產生檔案，後端在自己的 repo 匯入即可。

## Generate and send / 產生並傳送

After making a real change, the agent or developer runs:

```bash
handoff generate --note "需求、實際程式依據、API 欄位、驗收條件與待確認事項"
```

- For committed task changes, use `--base <actual-start-ref>`; for uncommitted tracked changes use the default; for staging only use `--staged`.
- Stage new files first according to your workflow. A clean working tree has no default changes even after a successful push.
- Read `handoffs/<id>/改動.md`. Compare files against `git diff HEAD`, `git diff --cached`, or `git diff <start>...HEAD`, matching the selected mode.
- Check that tasks contain enough context for a backend agent without access to the frontend repo. TODOs alone are not the full analysis.
- Send the `.md` file. Preserve frontend `.git-handoff/` records.

`<id>` means the actual original handoff ID printed by generation. Replace the full placeholder; do not type angle brackets literally.

## Backend work and reply / 後端處理與回覆

Inside the backend project, **no init is required** for automatic source identity and import:

```bash
cd /path/to/backend-project
handoff info
handoff import /path/to/改動.md
handoff show <id>
```

Implement and verify the agreed work. Update each original task explicitly:

```bash
handoff update <id> --task TASK-001 --status done --note "實際 API、欄位、錯誤格式與驗證結果"
handoff reply <id> --note "前端需配合的變動與剩餘問題"
```

Use `blocked` or `needs-clarification` if needed. The first explicit frontend note is `TASK-001`; use `show` for other IDs. Send `handoffs/<reply-id>/回覆.md` back. Replies identify HEAD but do not attach code diffs or include uncommitted work.

## Frontend reads the reply / 前端查看回覆

```bash
handoff import /path/to/回覆.md
handoff show <id>
```

Read the received response beneath the original handoff. The original snapshot stays unchanged; recipients' replies are separate.

## Troubleshooting / 常見問題

| Problem | What to check |
| --- | --- |
| Wrong files or project identity | Run `info` and confirm you are in the application repo, not the tool clone. |
| No changes | Stage new files. If changes are committed, choose their actual start with `--base`; push alone does not create a working-tree diff. |
| Recipient mismatch | Only applies to explicitly targeted handoffs or saved targets. Open handoffs need no recipient setup. Do not edit received files. |
| Old configured alias | Keep it during existing exchanges, or use `init --auto-project` for future exchanges and update recipient defaults accordingly. |
| Already imported | Expected for duplicates. Local task progress is preserved. |
| Unknown handoff | Check `list` in the right repo and preserve `.git-handoff/`. Import the original before replying. |
| File exists / EEXIST | Choose a new `--output` file; generated files are never overwritten. |
| No meaningful tasks | The agent must analyze requirements and supply `--note`. CLI only extracts added-line TODOs, not semantic requirements. |
| Reply rejected | Sender identity, original ID, and task IDs/texts must match the saved outgoing document. |
| No automatic generation or delivery | No completion/push trigger or Telegram API integration is installed. Instruct the agent to generate, then send the file manually. |

## Feedback / 試用回饋

Did the source identity match the right repo? Were the Git files and task evidence correct? Could the backend agent implement the task from the document? Did the reply make outcomes and questions clear?

[Report an issue](https://github.com/WatsonChen/git-handoff/issues/new/choose) with sanitized commands and expected/actual output.
