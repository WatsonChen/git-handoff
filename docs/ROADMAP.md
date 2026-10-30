# Roadmap

[English overview](../README.md) · [繁體中文](../README.zh-TW.md)

This is a proposed sequence, not a delivery schedule.

## Implemented in the local CLI

- Automatic source identity from Git remotes; optional one-time defaults and manual aliases.
- Git comparison modes and explicit task extraction.
- Versioned handoff data, Markdown rendering, and JSON export.
- Recipient-checked import and duplicate detection.
- Explicit task status updates and replies tied to original task IDs.
- Separate response histories for multiple recipients.
- English and Traditional Chinese documents.

## Current priority: correct Markdown and clear instructions

- Validate the full file exchange with frontend/backend agents and developers.
- Keep agent reasoning separate from CLI extraction: agents supply requirements, evidence, and acceptance criteria.
- Compare generated files/tasks against the requested Git comparison mode.
- Keep observed changes, developer-supplied requirements, and unresolved questions distinct.
- Improve error messages and instructions based on actual trial feedback.
- Share documents manually through the conversation tools collaborators already use, including Telegram.

Use the [agent instructions](AGENT_WORKFLOW.md) and [trial guide](TRY_IT.md). Clear usage documentation is the adoption priority; a demo video is not required.

## Later: more useful handoff content

- Structured API request, response, error, and acceptance-criteria sections.
- References to checked-in contracts such as OpenAPI.
- Configurable Markdown templates.
- Feedback-driven improvements to import/reply history and status summaries.

## Before a wider release

- Choose a license with the project owner.
- Check npm package-name availability and CLI conflicts.
- Verify installation on supported Node versions and operating systems.
- Publish a tested package and tagged release.

## Deferred: third-party platforms and AI

Notion, Slack, Asana, Jira, and Telegram connections are not implemented and are not required for the current trial. The structured document model can support separate adapters later. Posting to a service and synchronizing task status back are distinct future capabilities.

Optional AI summaries may follow once source-derived content and the manual workflow are reliable. Generation should remain usable without external accounts or services.
