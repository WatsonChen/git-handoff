# Contributing

English and Traditional Chinese feedback are welcome.

## Report a problem

Use the [issue templates](https://github.com/WatsonChen/sidepact/issues/new/choose). Include Node/Git versions, operating system, command, comparison mode, and a minimal example of expected versus actual behavior. Remove private details before posting.

## Propose a feature

Describe the handoff workflow and who receives the output. For larger changes, discuss the design in an issue first. The [roadmap](docs/ROADMAP.md) distinguishes planned work from current functionality.

## Development

Requires Git and Node.js 22.18+.

```bash
npm ci
npm run check
npm test
node bin/sidepact.js --help
```

`src/cli.ts` handles commands, `src/document.ts` handles the shared data model and Markdown, and `src/store.ts` handles local records. `src/identity.ts` normalizes hosted remote identities without network calls. `test/cli.test.js` uses temporary Git repositories, including frontend/backend round trips. Do not use real project repositories as destructive test fixtures.

Keep changes focused. Update both READMEs when behavior changes, and add a meaningful integration test for changes to Git comparison or document generation.

## Licensing status

No project license has been selected yet. Resolve licensing with the maintainer before submitting code intended for redistribution. Bug reports and workflow feedback are welcome now.
