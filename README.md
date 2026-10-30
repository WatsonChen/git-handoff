# git-handoff

**A bridge between frontend, backend, and cross-platform agents: share requirements, interface changes, and results through traceable Markdown.**

[![CI](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml/badge.svg)](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml)

English | [繁體中文](README.zh-TW.md)

Frontend agent finishes → produces `改動.md` → you send it through Telegram → backend agent reads it, implements changes, and produces `回覆.md`.

Engineers can use the same workflow directly. This local CLI does not call an AI service or send documents automatically. **Current version: 0.3.0; not yet published to npm.**

## What is automatic?

| Responsibility | Who handles it? |
| --- | --- |
| Identify the current source repository | CLI, using its Git remote |
| Collect changed files and TODO/FIXME markers in added diff lines | CLI |
| Decide what the backend needs to implement, with evidence and acceptance criteria | Your frontend agent, or you |
| Create Markdown with source metadata, task IDs, and reply references | CLI |
| Read requirements, implement them, and explicitly report status | Your backend agent, or you |

The CLI does **not** infer API contracts, explain code semantics, or decide that a task is done. An agent can supply the required context through `--note`, so you do not need to type each task manually. Run `handoff enable` once in each application repo to install the cross-repository review policy in its agent instructions. Start a new agent session or reload those instructions. No completion or push hook is installed; the agent performs the review as part of its task.

See the [agent-to-agent workflow and ready-to-use instructions](docs/AGENT_WORKFLOW.md).

## 1. Install the tool once per machine

Requires **Git** and **Node.js 22.18+**. Clone the tool into a separate tools directory, not into every frontend/backend project:

```bash
# Start in your preferred tools directory.
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm link
```

`npm link` makes `handoff` available from other directories. This clone is the **tool's source code**, not the project whose changes you want to hand off. To update this clone later: `git pull --ff-only`, then `npm ci`.

## 2. Generate inside your actual project

```bash
cd /path/to/your/frontend-project
```

Enable the agent policy once in that application repo:

```bash
handoff enable
```

Then continue normal coding with an agent that loads that instruction file. At task completion it is instructed to report one result: **no cross-repo work**, **work required**, or **needs confirmation**. For required work or questions, it should prepare a handoff with evidence and acceptance criteria; no file is needed for unrelated work. You do not need to repeat the handoff prompt every task once the policy is loaded.

`enable` reuses an existing root instruction file, or creates `AGENTS.md`. For a specific client use `--agent codex`, `--agent claude`, or `--agent copilot`. See [setup, status, and removal](docs/AGENT_SETUP.md).

No `init`, source project name, or recipient setup is required. The source is detected from the Git remote (folder name as a fallback). By default the handoff is open: the repository that imports it takes it on. Use `handoff info` only if you want to check the detected source.

After your agent or you changes tracked files in the frontend project:

```bash
handoff generate --note "Implement POST /api/register; evidence: src/api/auth.ts:18 calls it; verify: duplicate email response agreed with frontend"
```

The first note becomes `TASK-001`; added-line TODOs follow it. Give each task enough context for someone without the frontend repo. The CLI prints `handoffs/<id>/改動.md` and the original handoff ID. Send that file to the backend agent's operator.

Inside the **backend project**, import the file directly:

```bash
handoff import /path/to/received/改動.md
handoff show <original-id>

# After implementation and verification:
handoff update <original-id> --task TASK-001 --status done --note "Implemented and tested; duplicate email returns 409"
handoff reply <original-id> --note "Frontend should handle HTTP 409"
```

Send `handoffs/<reply-id>/回覆.md` back. In the frontend project:

```bash
handoff import /path/to/received/回覆.md
handoff show <original-id>
```

Replace `<original-id>` with the actual ID, without angle brackets. The [trial guide](docs/TRY_IT.md) covers troubleshooting. See real [handoff](examples/handoff.md) and [reply](examples/reply.md) examples.

## Compare the right Git changes

```bash
handoff generate                         # HEAD → working tree; staged + unstaged tracked changes
handoff generate --staged                # HEAD → staging area
handoff generate --base main             # merge base(main, HEAD) → HEAD; committed branch changes
handoff generate --base HEAD~1           # previous commit → HEAD; last commit only
handoff generate --to Example/shop-api --lang en --note "Explicit requirement" --output ./handoff.md
```

**After committing or pushing, a clean working tree has no default diff.** Choose the actual task/branch starting point with `--base` for committed changes. New files need `git add`. `--base` and `--staged` cannot be combined. Notes can be repeated. No automatic push hook or push wrapper is currently installed.

## Commands and status

| Command | Purpose |
| --- | --- |
| `enable` / `disable` | Install or remove the managed project-level agent policy |
| `agent-status` | Check whether the policy block is installed |
| `info` | Show the actual repo, identity source, and configured recipients |
| `init` | Save defaults; optionally set a manual identity alias |
| `generate` | Create a handoff from the selected Git comparison and explicit notes |
| `import` | Validate and save a received handoff/reply, deduplicating by ID |
| `list` / `show` | Inspect local history and replies |
| `update` | Update one task in an imported handoff |
| `reply` | Create a response preserving original task IDs |
| `export` | Export an immutable source document as JSON or Markdown |

Task states: `pending`, `in-progress`, `done`, `blocked`, `needs-clarification`. All tasks done yields `completed`; no tasks stays `pending`. Use `--note` on `update` or `reply` to explain blockers or questions. Different recipients' responses stay separate; the original handoff remains unchanged.

## Configuration and existing users

A new `handoff.config.json` normally omits `project` so detection stays automatic:

```json
{
  "targets": [],
  "output": "handoffs",
  "language": "en"
}
```

- `output` is relative to the Git root; `--output` is a file path relative to the current directory. Existing generated files are never overwritten.
- `language`: `en` or `zh-TW` (default). `--lang` overrides generated-document language. Default file names remain `改動.md` / `回覆.md`.
- Recipients are optional. With no `--to` or saved targets, `to: []` means an open handoff. Import records the local receiving identity without changing the original document. Replies automatically address the original sender.
- Optional targeting: `generate --to Example/shop-api` restricts who can import. `init --to Example/shop-api` saves that default. Existing saved targets remain honored; set `targets` to `[]` in config to return to open handoffs.
- `init` is optional and preserves unspecified settings when run again.
- `project` is an optional alias: `handoff init --project shop-web`. Existing configured names remain respected.
- To switch an old alias-based setup to automatic identity: `handoff init --auto-project`. Use `info` to check both sides first. Keep an existing alias until its in-flight exchanges are complete, because old documents still address that label.

Local history lives in `.git-handoff/records/`. Preserve it for reply matching; optionally add `.git-handoff/` to your project's `.gitignore`. Records, config, and the configured output folder are excluded from generated input.

## Format and limits

- Versioned Markdown front matter is authoritative machine data; the body is its readable view. Use CLI commands rather than editing generated files.
- TODO extraction only covers added lines and can match strings/examples. The change summary is a file list, not a full patch or AI explanation.
- HEAD identifies a commit, not uncommitted content. Replies do not automatically include backend diffs or prove that tests passed.
- `handoff export <id> --format json --output ./handoff.json` also produces an importable source snapshot. Local task changes are sent via `reply`.
- Imports accept up to 2 MiB. Recipient labels are case-sensitive workflow checks, not authentication; hosted identities omit the host, so use explicit aliases if hosts would collide.
- Same ID/data deduplicates; changed data under the same ID is rejected. Replies must match a saved outgoing handoff and its task IDs/texts. For targeted handoffs the replying project must also be a named recipient; open handoffs accept replies from the repositories that take them on.
- Third-party APIs, AI generation, and automatic completion/push triggers are deferred. Use one CLI writer per repo at a time.

## Development and feedback

```bash
npm run check
npm test
```

[Report an issue](https://github.com/WatsonChen/git-handoff/issues/new/choose) · [Contributing](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Changelog](CHANGELOG.md)

## License

A license has not been selected yet. This is public source code; no open-source license is currently granted.
