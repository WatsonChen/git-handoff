# git-handoff

**Turn Git diffs into Markdown handoff checklists for teams working across repositories.**

[![CI](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml/badge.svg)](https://github.com/WatsonChen/git-handoff/actions/workflows/ci.yml)

English | [繁體中文](README.zh-TW.md)

Ship a frontend change, then give your backend or mobile team a document with changed files, explicit follow-up tasks, and source metadata. `git-handoff` is a local TypeScript CLI for cross-repository developer handoffs.

**Status: early MVP.** `init` and `generate` work today. Importing, replying, automatic delivery, and AI summaries are planned. CLI messages and generated document headings are currently in Traditional Chinese; English output is planned.

## Why use it?

When frontend, backend, and mobile code live in separate Git repositories, a diff alone does not explain who needs to follow up. Package changed file names, TODO/FIXME markers from added lines, and your own notes into one portable checklist.

```text
Frontend repo → Git diff + explicit notes → 改動.md → Backend / Mobile team
```

Share the file manually with the receiving team. The tool records recipient names; it does not connect to those repositories.

## Quick start

Requires **Git** and **Node.js 22.18+**. Not yet published to npm.

```bash
git clone https://github.com/WatsonChen/git-handoff.git
cd git-handoff
npm ci
npm link
```

Then, inside the repository whose changes you want to hand off:

```bash
handoff init

# Edit files first. Stage new files with git add so Git can see them.
handoff generate --to shop-api --note "Confirm the registration API error format"
```

Open `handoffs/<handoff-id>/改動.md` and send it to the receiving team. Generation requires changes to tracked files and a repository with at least one commit.

Prefer not to use `npm link`? Run `node /absolute/path/to/git-handoff/bin/handoff.js generate --to shop-api` from your source repository instead.

## What works today

| Capability | Current behavior |
| --- | --- |
| Compare Git changes | Working tree, staging area, or committed feature branch changes |
| Address multiple repositories | Repeat `--to`, or configure default recipient names |
| Collect explicit tasks | Repeated `--note` values and TODO/FIXME markers in added diff lines |
| Produce a Markdown handoff | Unique document ID, numbered checkboxes, changed file list, HEAD commit and comparison mode |
| Keep documents separate | Unique default output directory; existing files are never overwritten |
| Work locally | No API key, runtime npm dependencies, or external service calls |

This version lists changed files. It does **not** generate a semantic explanation of code changes, include the full patch, infer API contracts, scan all outstanding tasks, or determine whether a task is complete.

## Commands

```bash
# Working tree, including staged and unstaged tracked changes
handoff generate --to shop-api

# Staged changes only
handoff generate --staged --to shop-api --to mobile-app

# Committed changes since the merge base of main and HEAD
handoff generate --base main --to shop-api

# Explicit task and custom output path
handoff generate --to shop-api --note "Confirm request and response fields" --output ./handoff.md

handoff --help
```

`--note` can be repeated. `--base` and `--staged` cannot be combined. `--base` excludes uncommitted changes. Untracked files are excluded until staged. Renames appear as deletion/addition.

## Configuration

`handoff init` creates `handoff.config.json` at the Git root:

```json
{
  "project": "shop-web",
  "targets": ["shop-api", "mobile-app"],
  "output": "handoffs"
}
```

- `project`: source project label, defaulting to the repository folder name.
- `targets`: recipient labels; explicit `--to` arguments replace these defaults.
- `output`: output directory relative to the repository root. Defaults to `handoffs`.
- `--output`: an explicit file path relative to the current working directory.

The configuration file and configured output directory are excluded from the handoff input. Default output is `handoffs/<handoff-id>/改動.md`.

## Example output

See a [complete generated document](examples/handoff.md). Here is an excerpt with the current Chinese headings:

```markdown
## 本次改動

- src/register.ts

## 待處理

- [ ] [TASK-001] Confirm the registration API error format
- [ ] [TASK-002] TODO: agree on duplicate email response (src/register.ts:2)
```

YAML front matter includes `id`, `from`, `to`, `source_commit`, `comparison`, `status`, and `created_at`. Task numbers are local to each document; they do not yet provide cross-document status tracking. Initial status is always `pending`.

## Limitations

- TODO/FIXME extraction matches text in added lines; strings and documentation examples can match too. It is not a complete task inventory.
- API contracts, data structures, and acceptance criteria need to be supplied or reviewed by a person.
- In working-tree or staged mode, `source_commit` identifies HEAD, not a snapshot of uncommitted content.
- Generated files can contain internal file names and task text. Read the document before sharing it.
- CLI messages, document headings, and the default file name are currently Chinese.

## Roadmap

The next goal is a complete handoff round trip, then easier adoption:

1. **Import and reply:** validate documents, avoid duplicate imports, and reply to a specific handoff/task.
2. **English CLI and output:** selectable language and document templates.
3. **First packaged release:** choose a license, verify the npm package name, and publish an installable release.
4. **API contract support:** explicit request/response sections and contract-change checks.
5. **Optional integrations:** GitHub PR workflow, opt-in AI summaries, and delivery to other repositories.

These are plans, not available commands or release commitments. See the [detailed roadmap](docs/ROADMAP.md).

## Contributing and feedback

[Open an issue](https://github.com/WatsonChen/git-handoff/issues/new/choose) to report bugs or suggest workflows. Frontend/backend handoff examples and feedback on the generated checklist are especially useful.

```bash
npm ci
npm run check
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

A license has not been selected yet. This is public source code; no open-source license is currently granted. Licensing is a prerequisite for a wider release.
