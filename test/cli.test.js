import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/handoff.js', import.meta.url));
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'handoff-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(cwd, 'api.ts'), '// baseline\n');
  git('add', '.'); git('commit', '-qm', 'baseline');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  return { cwd, git, run };
}

test('working tree includes staged and unstaged changes; multiple recipients and no overwrite', t => {
  const { cwd, git, run } = fixture(t);
  writeFileSync(join(cwd, 'api.ts'), '// TODO: implement endpoint\n');
  git('add', '.');
  writeFileSync(join(cwd, 'api.ts'), '// TODO: implement endpoint\n// FIXME: error format\n');
  const result = run('generate', '--to', 'api', '--to', 'mobile', '--output', 'handoff.md');
  assert.equal(result.status, 0, result.stderr);
  const doc = readFileSync(join(cwd, 'handoff.md'), 'utf8');
  assert.match(doc, /to: \["api","mobile"\]/);
  assert.match(doc, /implement endpoint/);
  assert.match(doc, /error format/);
  assert.equal(run('generate', '--to', 'api', '--output', 'handoff.md').status, 1);
});

test('staged mode does not include unstaged TODOs', t => {
  const { cwd, git, run } = fixture(t);
  writeFileSync(join(cwd, 'api.ts'), '// TODO: staged\n'); git('add', '.');
  writeFileSync(join(cwd, 'api.ts'), '// TODO: unstaged\n');
  assert.equal(run('generate', '--staged', '--to', 'api', '--output', 'out.md').status, 0);
  const doc = readFileSync(join(cwd, 'out.md'), 'utf8');
  assert.match(doc, /TODO: staged/); assert.doesNotMatch(doc, /TODO: unstaged/);
});

test('base mode uses committed branch changes and ignores working tree', t => {
  const { cwd, git, run } = fixture(t);
  git('checkout', '-qb', 'feature');
  writeFileSync(join(cwd, 'api.ts'), '// TODO: committed\n');
  git('add', '.'); git('commit', '-qm', 'feature');
  writeFileSync(join(cwd, 'api.ts'), '// TODO: local\n');
  const result = run('generate', '--base', 'main', '--to', 'api', '--output', 'out.md');
  assert.equal(result.status, 0, result.stderr);
  const doc = readFileSync(join(cwd, 'out.md'), 'utf8');
  assert.match(doc, /TODO: committed/); assert.doesNotMatch(doc, /TODO: local/);
});

test('init, config defaults, clean tree and invalid arguments', t => {
  const { cwd, run } = fixture(t);
  assert.equal(run('init').status, 0);
  assert.equal(run('init').status, 1);
  assert.equal(run('generate', '--to', 'api').status, 1);
  assert.equal(run('generate', '--to').status, 1);
  assert.equal(run('generate', '--base', 'main', '--staged', '--to', 'api').status, 1);
  writeFileSync(join(cwd, 'handoff.config.json'), JSON.stringify({ project: 'web', targets: ['api'] }));
  writeFileSync(join(cwd, 'api.ts'), '// changed\n');
  assert.equal(run('generate', '--output', 'out.md').status, 0);
  assert.match(readFileSync(join(cwd, 'out.md'), 'utf8'), /from: "web"/);
});
