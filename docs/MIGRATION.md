# Migrating from git-handoff to Sidepact

Sidepact is the new name for git-handoff. The CLI is now `sidepact`; handoff/reply data and task IDs are unchanged.

## Existing source-checkout users

Before pulling the renamed package, remove the old development link **while the checkout still has its old package name**:

```bash
# Inside your existing tool checkout, before updating it:
npm unlink

git remote set-url origin https://github.com/WatsonChen/sidepact.git
git pull --ff-only
npm ci
npm link
sidepact --help
```

If you prefer a fresh checkout, first unlink the old tool, then clone Sidepact into your tools directory. Do not delete application-repo history.

This only changes the installed CLI. In each actual application repo, run:

```bash
sidepact enable
# Use the same --agent choice as your previous installation when explicitly selected.
```

The managed legacy instruction block is recognized and replaced in place with Sidepact commands. Other project instructions stay intact, and the old file is backed up before updating. Reload agent instructions or start a new session afterward.

## Existing application data

- Existing `handoff.config.json` is still read and updated if no `sidepact.config.json` exists. When both exist, the Sidepact config takes precedence.
- Existing `.git-handoff/` history and instruction backups are reused. Sidepact does not copy, rename, or discard them automatically.
- New projects use `sidepact.config.json` (when optionally initialized) and `.sidepact/`.
- If both history directories exist, commands that use local history stop rather than silently selecting or merging them. Preserve both copies and resolve the duplicate before continuing; do not discard records blindly.
- Existing `hf-...` document IDs, `TASK-...` IDs, schema version, `reply_to`, and `handoffs/` output paths stay unchanged.
- Legacy Markdown and JSON documents can still be imported. Original source/recipient labels remain case-sensitive and unchanged.

## 中文摘要

- 新命令是 `sidepact`，不是 `handoff`；先在舊版本工具目錄解除 `npm link`，再更新並重新連結。
- 各實際專案重新執行 `sidepact enable`，會原地更新舊版指引，不重複加入第二個區塊。
- 舊 `handoff.config.json` 與 `.git-handoff/` 繼續有效，不需要手動搬移。
- 新專案使用 `sidepact.config.json` 與 `.sidepact/`。
- 不要刪除舊紀錄；原始交接和待辦編號仍可用於回覆。
- 此次改名沒有發布 npm 套件，也沒有安裝自動傳送、push 或遠端喚醒功能。
