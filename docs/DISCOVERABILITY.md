# Discoverability and adoption plan

## Positioning

Primary audience: developers coordinating frontend, backend, and mobile changes across separate repositories.

Core promise: **Turn Git diffs into Markdown handoff checklists.**

Use specific phrases naturally: `Git diff to Markdown`, `frontend backend handoff`, `cross-repository handoff`, and `developer handoff checklist`. Avoid describing current functionality as an AI code summarizer, changelog generator, or automated task tracker.

## Included in this repository

- English default README with a Traditional Chinese alternative.
- Clear scope, installation instructions, limitations, and a roadmap.
- A document generated with the real CLI, linked from both READMEs.
- Package description, keywords, repository URL, issue URL, and homepage metadata.
- CI badge, contribution guidance, and bilingual issue templates.

These improve clarity and provide searchable text. They do not guarantee indexing, search ranking, downloads, or adoption. Package metadata will only help npm discovery after publication.

## GitHub About settings to apply

These values are suggestions; adding this file does not change GitHub repository settings.

**Description**

```text
Turn Git diffs into Markdown handoff checklists for frontend, backend, and multi-repo teams. Local TypeScript CLI.
```

**Topics**

```text
git git-diff markdown cli typescript developer-tools handoff multi-repo frontend backend
```

Set these through the gear next to **About** on the repository home page. Topics help people browse related repositories. GitHub search supports the repository name, description, topics, and README through search qualifiers.

## Before inviting wider use

1. Choose a license with the project owner. Public visibility alone does not grant an open-source license.
2. Add English CLI and document output so the first run matches the English introduction.
3. Verify the npm name and publish a tested, tagged release with a short installation command.
4. Record a brief terminal demo: change → generate → inspect document. Show real output rather than planned features.
5. Ask a few developers who maintain separate repos to try a real handoff. Record time to first document, missing information, and whether they use it again.

## After the workflow proves useful

- Publish one practical walkthrough using a frontend/backend example, with commands and output.
- Share it in relevant communities where project sharing is allowed, asking for workflow feedback.
- Add a GitHub social preview image so shared links communicate the use case.
- Build import/reply around feedback from actual receiving teams.
- Consider a documentation site once the README becomes difficult to navigate.

Do not buy stars or treat stars alone as proof of usefulness. Prefer repeat use, actionable issue reports, and completed handoff round trips.

## Official references

- [GitHub repository search](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)
- [GitHub repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [npm package metadata](https://docs.npmjs.com/cli/configuring-npm/package-json/)
- [GitHub repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
