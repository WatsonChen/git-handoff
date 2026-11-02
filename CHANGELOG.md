# Changelog

## Unreleased

### Documentation

- Add bilingual worked examples for an avatar contract round trip, an uncertain API contract, and a layout-only task with no handoff.
- Include CLI-generated documents and explain which file users send, how agents respond, and what completion claims mean.
- Link the examples from both README entry points. No runtime behavior changed.

## 0.4.0 — 2026-11-02

### Rename to Sidepact

- Rename the package, primary CLI, repository references, agent instructions, and bilingual documentation to Sidepact.
- Use `sidepact` as the public CLI; new projects use `sidepact.config.json` and `.sidepact/`.
- Continue reading existing `handoff.config.json` and `.git-handoff/` data without silently copying or replacing history.
- Recognize legacy managed instruction markers and update them in place on `sidepact enable`.
- Preserve document schema, handoff/task IDs, reply references, and output paths.
- Add a migration guide and agent-focused package keywords.
- The npm registry returned 404 for `sidepact` during the name check; this does not reserve the name. No npm publication was performed.

## 0.3.0 — 2026-10-30

### Agent handoff bridge

- Reposition the tool as a bridge between frontend, backend, mobile, and other agents through traceable Markdown.
- Add `handoff enable`, `disable`, and `agent-status` for one-time project-level activation.
- Support managed blocks in `AGENTS.md`, existing `AGENTS.override.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.
- Install a shared task-end review: no cross-repo work, work required, or needs confirmation. Require code evidence and acceptance criteria; distinguish assumptions from agreed contracts.
- Preserve other project instructions, back up nonempty files before changes, make enable idempotent, and remove only the managed block on disable.
- Reject malformed markers and symlink instruction paths. Do not modify global agent settings.
- Update both READMEs, the agent workflow, and trial/setup instructions.

This installs instructions for an existing agent to follow. It does not guarantee model compliance, wake a remote agent, deliver a file, install a push hook, or automatically infer requirements in the CLI. Reload project instructions or start a new agent session after activation.

### Verification

- Integration coverage for activation, repeat activation, exact preservation/removal, backups, adapter targets, override precedence, and unsafe instruction paths.
- Existing Markdown generation and cross-repository round-trip tests remain required.

## 0.2.2 — 2026-10-30

- Allow open handoffs without init or recipient setup.
- Record the receiving repo locally on import; keep the original document unchanged.
- Retain recipient checks for explicitly targeted handoffs; automatically address replies to the original sender.

## 0.2.1 — 2026-10-30

- Detect source identity from Git remote URLs, with a folder fallback.
- Add `info`, optional one-time defaults, and explicit aliases.
- Clarify tool installation versus application-repo usage, and agent-provided requirements versus CLI extraction.

## 0.2.0 — 2026-10-30

- Add import, explicit task updates, replies, local history, and JSON export.
- Add English/Traditional Chinese documents and a two-repository trial guide.

## 0.1.0 — 2026-10-30

- Initial Git-diff Markdown generator with explicit notes and added-line TODO/FIXME extraction.
