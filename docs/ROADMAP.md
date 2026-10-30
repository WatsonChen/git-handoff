# Roadmap

[Project overview](../README.md) · [繁體中文](../README.zh-TW.md)

This is a proposed sequence, not a delivery schedule. Only `init` and `generate` are implemented today.

## 1. Complete the handoff round trip

- Define and version the document format before adding consumers.
- `import`: validate the document, confirm the recipient, and deduplicate by handoff ID.
- Preserve source handoff/task IDs when importing tasks.
- `reply`: reference the original handoff and record completed, blocked, and clarification-needed tasks.
- Allow explicit status updates. Do not infer completion from a changed file alone.

Success: a frontend team can send a document to a backend team, receive a reply, and identify which original tasks were addressed without a separate tracker.

## 2. Make a first-time trial easier

- English CLI help, errors, and generated headings alongside Traditional Chinese.
- Configurable output templates and file names.
- Choose an open-source license with the project owner.
- Check npm name availability and CLI command conflicts before publishing.
- Validate installation on supported Node versions and operating systems.
- Publish a tagged release with tested installation instructions.

Success: a new user can install the tool and produce a useful handoff in a few minutes.

## 3. Make API handoffs more useful

- Structured request, response, error, and acceptance-criteria sections.
- Explicit contract references, such as checked-in OpenAPI documents.
- Distinguish observed changes, author-supplied requirements, and unresolved questions.

Success: receiving teams can see what is agreed and what still needs discussion.

## 4. Add optional automation

- GitHub PR checks or attached handoff artifacts.
- Optional delivery with explicit repository access and recipient configuration.
- Optional AI summaries with clear provenance and a local-only default.
- Keep generation usable without accounts, AI services, or hosted infrastructure.

## Feedback wanted

What do you currently send between repositories? Which information is most often missing? Share a sanitized example through [GitHub Issues](https://github.com/WatsonChen/git-handoff/issues/new/choose).
