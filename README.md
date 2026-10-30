# git-handoff

**Turn Git diffs into Markdown handoff checklists for teams working across repositories.**

[![CI](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml/badge.svg)](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml)

English | [繁體中文](README.zh-TW.md)

Create a handoff in your frontend repo, send the `.md` file to your backend team, and receive a reply tied to the original tasks. Files can be shared in a regular conversation, such as Telegram. No hosted service or AI account is required.

**Status: local CLI MVP (0.2).** Generation, import, task updates, replies, and English/Traditional Chinese document output are implemented. Third-party platform connections are deferred. Not yet published to npm.

## What it does

| Command | Purpose |
| --- | --- |
| `init` | Set the repository's project label and output language |
| `generate` | List changed files and collect explicit tasks from Git changes |
| `import` | Validate and save a received handoff or reply, deduplicating by document ID |
| `list` / `show` | Find local documents, tasks, and received replies |
| `update` | Explicitly mark an imported task pending, in progress, done, blocked, or needing clarification |
| `reply` | Produce a new Markdown reply referencing the original handoff and task IDs |
| `export` | Export the immutable source document as Markdown or JSON |

**It does not automatically explain code semantics, infer API requirements, or decide that work is done.** The generated change summary is a file list. Tasks come from your notes and TODO/FIXME markers in added diff lines. Add API details and acceptance criteria explicitly with `--note`.

## Install from source

Requires **Git** and **Node.js 22.18+**. Both collaborators install the CLI:

```bash
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm link
```

To update a normal clone later, run `git pull --ff-only` and `npm ci` in the tool's directory. For direct execution without `npm link`, use `node /absolute/path/to/git-handoff/bin/handoff.js` in place of `handoff`.

## Quick start: frontend → backend → frontend

### 1. Frontend: create the handoff

Inside the **frontend project**, which must have at least one commit:

```bash
# Run init once. Agree on project labels with your collaborator.
handoff init --project shop-web --lang en

# Make your code changes first. New files must be staged with git add.
handoff generate --to shop-api --note "Confirm registration API request, response, and error fields"
```

Send `handoffs/<id>/改動.md` to the backend team. The CLI prints the ID and file path. It does not send the file automatically. This explicit note becomes `TASK-001`; additional extracted TODOs follow it.

### 2. Backend: import, work, and reply

Inside the **backend project**:

```bash
handoff init --project shop-api --lang en
handoff import /path/to/received/改動.md
handoff list
handoff show <original-handoff-id>

# Implement and verify the agreed change, then explicitly record its status.
handoff update <original-handoff-id> --task TASK-001 --status done --note "POST /api/register implemented; duplicate email returns 409"

# Commit backend changes before replying if the reply's HEAD should identify them.
handoff reply <original-handoff-id> --note "Please verify the frontend handles HTTP 409"
```

Send the generated `handoffs/<reply-id>/回覆.md` back. A reply includes all original task IDs and their current states, your notes, and the backend HEAD commit. It does not automatically attach backend code diffs.

### 3. Frontend: read the reply

```bash
handoff import /path/to/received/回覆.md
handoff show <original-handoff-id>
```

The original view now includes the received reply. When multiple repositories receive a handoff, their replies stay separate. One recipient's completion does not mark another recipient's work complete. Repeated replies are kept as separate snapshots in import order.

See the [bilingual trial guide](docs/TRY_IT.md) for a shorter checklist and troubleshooting, and [real generated examples](examples/handoff.md) / [reply](examples/reply.md).

## Git comparison modes

```bash
# Default: HEAD to working tree, including staged and unstaged tracked changes
handoff generate --to shop-api

# Staging area only
handoff generate --staged --to shop-api --to mobile-app

# Committed feature-branch changes since the merge base with main
handoff generate --base main --to shop-api

# Choose document language and destination; --note can be repeated
handoff generate --to shop-api --lang en --note "Agree on error fields" --output ./handoff.md
```

`--base` and `--staged` cannot be combined. `--base` excludes uncommitted work. Untracked files are excluded until staged. Renames appear as deletion/addition. Binary and deleted files are listed, without inventing tasks from their old content.

## Task states and local history

Use `update` on an **imported handoff**:

```bash
handoff update <id> --task TASK-001 --status in-progress
handoff update <id> --task TASK-001 --status blocked --note "Waiting for the agreed response schema"
handoff update <id> --task TASK-001 --status needs-clarification --note "Should duplicate email return 409?"
```

Allowed task states: `pending`, `in-progress`, `done`, `blocked`, `needs-clarification`. A document with no tasks stays pending; otherwise its aggregate state follows its task states. Completion is always explicitly supplied by the developer.

Records live in `.git-handoff/records/` under each repository root, including sent documents and received replies. Preserve this directory until the round trip is complete. Add `.git-handoff/` to your project's `.gitignore` if you want local-only history. Do not edit these records manually.

The original handoff remains an immutable snapshot. Its status is separate from each recipient's reply. Export also preserves that original snapshot; use `reply` to send local status changes.

## Configuration

`init` creates `handoff.config.json` at the Git root without overwriting an existing file:

```json
{
  "project": "shop-web",
  "targets": ["shop-api", "mobile-app"],
  "output": "handoffs",
  "language": "en"
}
```

- `project` must match the recipient label agreed with the sender. Without config, the repository folder name is used.
- `--to` can be repeated and replaces configured targets. These are labels, not remote repository connections.
- `output` is relative to the repository root. The default is `handoffs`.
- `--output` is a file path relative to the current working directory. Existing files are never overwritten.
- `language` accepts `en` or `zh-TW`; default is `zh-TW`. `--lang` overrides it for generation or replies. Default file names remain `改動.md` / `回覆.md` in both languages.

The config file, configured output directory, and `.git-handoff/` records are excluded from generated input.

## Document format and JSON export

New Markdown files have `schema_version: 1` front matter containing sender, recipients, source HEAD, tasks, language, notes, and (for replies) `reply_to`. The front matter is authoritative machine data; the body is a readable view. Use CLI commands rather than editing generated files. The original v0.1 Markdown format can also be imported; its existing task IDs are preserved.

```bash
handoff export <id> --format json --output ./handoff.json
handoff export <id> --format markdown --output ./copy.md
```

Both formats can be imported. Same ID/data deduplicates; different data under the same ID is rejected. Imports check that a reply references a known outgoing handoff, matches a named recipient, and preserves the original task IDs and texts. Labels are workflow checks, not sender authentication.

## Current limits

- TODO/FIXME extraction is text matching in added lines; strings or documentation examples can match too. Unchanged TODOs and deleted TODOs are not new tasks.
- Changed files are listed, without a full patch or AI explanation. API contracts and acceptance criteria need your input.
- `source_commit` records HEAD; it cannot reconstruct uncommitted changes. A reply contains status claims, not proof of code or test completion.
- Documents are exchanged manually. Notion, Slack, Asana, Jira, and Telegram API integrations are not implemented.
- The importer accepts files up to 2 MiB. Generated text can contain internal file names and notes; review it before sharing.
- Local records are required to relate replies to sent documents. Use one CLI writer at a time in a repository.

## Next steps

First, test the Markdown round trip with real frontend/backend collaborators and improve correctness and clarity from that feedback. API contract sections and flexible templates can follow. Third-party integrations and optional AI summaries are deferred. See the [roadmap](docs/ROADMAP.md).

## Feedback and development

[Open an issue](https://github.com/WatsonChen/git-handoff/issues/new/choose) with expected versus actual output, or tell us which handoff information was missing.

```bash
npm run check
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

A license has not been selected yet. This is public source code; no open-source license is currently granted. Licensing remains a prerequisite for a wider release.
