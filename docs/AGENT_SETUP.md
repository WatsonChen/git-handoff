# One-time agent activation / 一次性啟用 agent

Install sidepact once per computer, then run this in **each actual application repo**:

```bash
sidepact enable
```

工具每台電腦裝一次；啟用則在各個實際前端、後端或 App 專案執行一次。這會加入專案指引，**不會設定接收方、不安裝 push hook、不啟動另一個 agent**。

## What gets installed

A self-contained, marked instruction block asks the coding agent to check external API/field/event/capability dependencies at task completion, using actual code/contracts/tests. It must report one result:

| Outcome | Required behavior |
| --- | --- |
| No cross-repo work / 無需跨端 | Briefly explain; do not generate an irrelevant document. |
| Work required / 需要跨端 | Generate a task with verified evidence, requested behavior, and acceptance criteria. |
| Needs confirmation / 待確認 | Generate a question with the missing evidence; do not call a proposed contract agreed. |

The block also explains Git comparison selection, `generate`, `import`, `update`, and `reply`, and requires reading output before reporting success. The full protocol is in [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).

Agent judgment is not deterministic. These are project instructions, not a code-based detector, completion notification, or guarantee that the model complies. Enable the client’s custom-instruction support, then start a new session or reload instructions. More specific instructions or client settings may affect loading.

## Choose the instruction file

```bash
sidepact enable                     # auto: reuse an existing root instruction file
sidepact enable --agent codex       # AGENTS.override.md if present, otherwise AGENTS.md
sidepact enable --agent claude      # CLAUDE.md
sidepact enable --agent copilot     # .github/copilot-instructions.md
sidepact enable --agent generic     # AGENTS.md
```

Auto checks these paths in order: `AGENTS.override.md`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`. If none exists, it creates `AGENTS.md`. If you use a different client than the selected file targets, choose it explicitly. Multiple clients can each be enabled separately.

`auto` 不會偵測你正在使用哪個程式；它只依既有指令檔選擇路徑。沒有檔案時使用 `AGENTS.md`。如果用 Claude 或 Copilot，可明確指定 `--agent`。

## Verify and remove

```bash
sidepact agent-status
sidepact agent-status --agent claude
sidepact disable
sidepact disable --agent claude
```

Use the same adapter when checking/removing an explicitly selected installation. Status checks that the managed block exists; it cannot prove an agent has loaded it. Start a new session or ask the current agent to read the displayed instruction path. Clients may not apply changed instructions retroactively to running tasks.

`disable` removes only the marked handoff block. Empty instruction files are retained; other instructions remain. Like enable, removal may require a session restart/reload to affect the agent.

## Preservation and backups

- Existing project instructions are preserved outside the `sidepact:begin` / `sidepact:end` block.
- Repeated enable updates only that block and is a no-op when already current.
- Before changing a nonempty file, the old file is backed up under `.sidepact/instruction-backups/`.
- Malformed/duplicate markers and symlink instruction paths are rejected rather than overwritten.
- Enabling does not stage, commit, push, or edit your handoff config. Review and commit the instruction file yourself if you want teammates to inherit it.
- No user-level/global instruction files are modified.

既有指令不會被整份覆蓋。可用版本控制檢查修改；備份在本機 `.sidepact/`，不是要傳給另一端的交接文件。

## Where to find the Markdown

When required, the agent runs `generate`; output remains a new snapshot at `handoffs/<id>/改動.md`. Replies are at `handoffs/<reply-id>/回覆.md`. Nothing is uploaded automatically. Send files through your regular conversation tool.

## Official file-loading references

- [Codex project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code project memory](https://code.claude.com/docs/en/memory)
- [GitHub Copilot CLI instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
