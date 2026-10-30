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
  assert.equal(run('init').status, 0);
  assert.equal(run('generate', '--to', 'api').status, 1);
  assert.equal(run('generate', '--to').status, 1);
  assert.equal(run('generate', '--base', 'main', '--staged', '--to', 'api').status, 1);
  writeFileSync(join(cwd, 'handoff.config.json'), JSON.stringify({ project: 'web', targets: ['api'] }));
  writeFileSync(join(cwd, 'api.ts'), '// changed\n');
  assert.equal(run('generate', '--output', 'out.md').status, 0);
  assert.match(readFileSync(join(cwd, 'out.md'), 'utf8'), /from: "web"/);
});

// Exercise the full CLI between independent repositories, not just parser helpers.
function generated(t, recipients = ['shop-api']) {
  const frontend = fixture(t);
  assert.equal(frontend.run('init', '--project', 'shop-web', '--lang', 'en').status, 0);
  writeFileSync(join(frontend.cwd, 'api.ts'), '// baseline\n// TODO: agree on duplicate email response\n');
  const output = join(frontend.cwd, 'handoff.md');
  const result = frontend.run('generate', ...recipients.flatMap(to => ['--to', to]), '--note', 'Confirm registration API fields', '--output', output);
  assert.equal(result.status, 0, result.stderr);
  const document = parseDocument(readFileSync(output, 'utf8'));
  return { frontend, output, document };
}
import { parseDocument } from '../src/document.ts';
import { existsSync, mkdirSync } from 'node:fs';
function state(repo, id) {
  return JSON.parse(readFileSync(join(repo.cwd, '.git-handoff', 'records', `${id}.json`), 'utf8'));
}
function writeDocument(path, document) { writeFileSync(path, JSON.stringify(document)); }

test('two repositories complete a handoff round trip with explicit status and reply notes', t => {
  const { frontend, output, document } = generated(t);
  const backend = fixture(t);
  assert.equal(backend.run('init', '--project', 'shop-api', '--lang', 'en').status, 0);
  assert.equal(backend.run('import', output).status, 0);
  assert.equal(backend.run('update', document.id, '--task', 'TASK-001', '--status', 'done', '--note', 'POST /register implemented').status, 0);
  assert.equal(backend.run('update', document.id, '--task', 'TASK-002', '--status', 'needs-clarification', '--note', 'Should duplicate email return 409?').status, 0);
  // Reimporting does not reset work in progress.
  assert.match(backend.run('import', output).stdout, /Already imported/);
  assert.equal(state(backend, document.id).tasks[0].status, 'done');
  const replyPath = join(backend.cwd, 'reply.md');
  const result = backend.run('reply', document.id, '--note', 'Please confirm the duplicate-email behavior', '--output', replyPath);
  assert.equal(result.status, 0, result.stderr);
  const raw = readFileSync(replyPath, 'utf8');
  const reply = parseDocument(raw);
  assert.equal(reply.kind, 'reply');
  assert.equal(reply.reply_to, document.id);
  assert.equal(reply.status, 'needs-clarification');
  assert.deepEqual(reply.to, ['shop-web']);
  assert.equal(reply.tasks[0].id, document.tasks[0].id);
  assert.match(raw, /- \[x\] \[TASK-001\]/);
  assert.match(raw, /Should duplicate email return 409/);
  assert.equal(frontend.run('import', replyPath).status, 0);
  assert.equal(frontend.run('import', replyPath).status, 0);
  assert.equal(state(frontend, document.id).responses.length, 1);
  assert.match(frontend.run('show', document.id).stdout, /POST \/register implemented/);
  assert.match(frontend.run('list').stdout, /replies:1/);
  // Sender tasks remain the original snapshot; recipient status is tracked separately.
  assert.equal(state(frontend, document.id).tasks[0].status, 'pending');
});

test('multiple recipients keep independent replies and partial completion', t => {
  const { frontend, output, document } = generated(t, ['shop-api', 'mobile-app']);
  for (const recipient of ['shop-api', 'mobile-app']) {
    const receiver = fixture(t);
    receiver.run('init', '--project', recipient);
    assert.equal(receiver.run('import', output).status, 0);
    const status = recipient === 'shop-api' ? 'done' : 'blocked';
    assert.equal(receiver.run('update', document.id, '--task', 'TASK-001', '--status', status).status, 0);
    const reply = join(receiver.cwd, 'reply.md');
    assert.equal(receiver.run('reply', document.id, '--output', reply).status, 0);
    assert.equal(frontend.run('import', reply).status, 0);
  }
  const responses = state(frontend, document.id).responses;
  assert.equal(responses.length, 2);
  assert.equal(responses[0].from, 'shop-api');
  assert.equal(responses[0].status, 'in-progress');
  assert.equal(responses[1].from, 'mobile-app');
  assert.equal(responses[1].status, 'blocked');
});

test('reject malformed, conflicting, wrong-recipient and unsupported documents without overwriting tasks', t => {
  const { output, document } = generated(t);
  const backend = fixture(t);
  backend.run('init', '--project', 'wrong-project');
  assert.match(backend.run('import', output).stderr, /Recipient mismatch/);
  assert.equal(existsSync(join(backend.cwd, '.git-handoff')), false);
  writeFileSync(join(backend.cwd, 'handoff.config.json'), '{"project":"shop-api"}');
  assert.equal(backend.run('import', output).status, 0);
  const path = join(backend.cwd, 'bad.json');
  const invalid = [
    { ...document, id: '../../escape' },
    { ...document, schema_version: 999 },
    { ...document, tasks: [document.tasks[0], document.tasks[0]] },
    { ...document, status: 'completed' },
    { ...document, source_commit: 'not-a-commit' },
    { ...document, to: null },
  ];
  for (const data of invalid) {
    writeDocument(path, data);
    assert.equal(backend.run('import', path).status, 1);
  }
  writeDocument(path, { ...document, files: ['changed-under-same-id.ts'] });
  assert.match(backend.run('import', path).stderr, /different content/);
  assert.equal(backend.run('update', document.id, '--task', 'TASK-999', '--status', 'done').status, 1);
  assert.equal(backend.run('update', document.id, '--task', 'TASK-001', '--status', 'unknown').status, 1);
  assert.equal(state(backend, document.id).tasks[0].status, 'pending');
  assert.equal(backend.run('show', '../../outside').status, 1);
});

test('validate reply provenance, complete task set and stable task text', t => {
  const { frontend, output, document } = generated(t);
  const backend = fixture(t);
  backend.run('init', '--project', 'shop-api');
  backend.run('import', output);
  const replyPath = join(backend.cwd, 'reply.md');
  backend.run('reply', document.id, '--output', replyPath);
  const reply = parseDocument(readFileSync(replyPath, 'utf8'));
  const bad = join(frontend.cwd, 'bad.json');
  for (const changes of [
    { from: 'stranger' },
    { reply_to: 'hf-20261030-11111111' },
    { tasks: [] },
    { tasks: [{ ...reply.tasks[0], text: 'Different requirement' }, reply.tasks[1]] },
  ]) {
    writeDocument(bad, { ...reply, ...changes });
    assert.equal(frontend.run('import', bad).status, 1);
    assert.equal(state(frontend, document.id).responses.length, 0);
  }
  assert.equal(frontend.run('reply', document.id).status, 1);
  assert.equal(frontend.run('import', replyPath).status, 0);
  assert.equal(frontend.run('update', reply.id, '--task', 'TASK-001', '--status', 'done').status, 1);
});

test('JSON and Markdown export preserve the immutable source and deduplicate across formats', t => {
  const { frontend, output, document } = generated(t);
  const jsonPath = join(frontend.cwd, 'export.json');
  assert.equal(frontend.run('export', document.id, '--format', 'json', '--output', jsonPath).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(jsonPath, 'utf8')), document);
  assert.equal(frontend.run('export', document.id, '--format', 'json', '--output', jsonPath).status, 1);
  const backend = fixture(t);
  backend.run('init', '--project', 'shop-api');
  assert.equal(backend.run('import', jsonPath).status, 0);
  backend.run('update', document.id, '--task', 'TASK-001', '--status', 'done');
  assert.match(backend.run('import', output).stdout, /Already imported/);
  const copy = join(backend.cwd, 'source.md');
  assert.equal(backend.run('export', document.id, '--format', 'markdown', '--output', copy).status, 0);
  assert.equal(parseDocument(readFileSync(copy, 'utf8')).tasks[0].status, 'pending');
});

test('Chinese output escapes task text; English output and subdirectory invocation preserve sources', t => {
  const repo = fixture(t);
  repo.run('init', '--project', 'web');
  mkdirSync(join(repo.cwd, 'src'));
  const file = 'src/註冊 [form].ts';
  writeFileSync(join(repo.cwd, file), '// old\n');
  repo.git('add', '.'); repo.git('commit', '-qm', 'add form');
  writeFileSync(join(repo.cwd, file), '// old\n// TODO: return [status] and <token>\n');
  const output = join(repo.cwd, 'zh.md');
  assert.equal(repo.run('generate', '--to', 'api', '--note', '# heading [x] <script>', '--output', output).status, 0);
  const zh = readFileSync(output, 'utf8');
  assert.match(zh, /# 變動交接/);
  assert.match(zh, /\\\[x\\\] \\<script\\>/);
  assert.equal(parseDocument(zh).tasks[1].text, `TODO: return [status] and <token> (${file}:2)`);
  const result = spawnSync(process.execPath, [cli, 'generate', '--lang', 'en', '--to', 'api', '--output', 'en.md'], { cwd: join(repo.cwd, 'src'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const en = readFileSync(join(repo.cwd, 'src/en.md'), 'utf8');
  assert.match(en, /# Change handoff/);
  assert.deepEqual(parseDocument(en).files, [file]);
});

test('generated documents and local state are excluded even if tracked', t => {
  const { frontend, document } = generated(t);
  // Put the generated content in the configured output folder before tracking.
  const folder = join(frontend.cwd, 'handoffs', document.id);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, '改動.md'), 'old document\n');
  frontend.git('add', '.'); frontend.git('commit', '-qm', 'track existing state');
  const record = join(frontend.cwd, '.git-handoff', 'records', `${document.id}.json`);
  writeFileSync(record, readFileSync(record, 'utf8') + '\n');
  writeFileSync(join(folder, '改動.md'), '// TODO: should not be extracted\n');
  assert.match(frontend.run('generate', '--to', 'api').stderr, /No changes/);
});

test('imports original v0.1 Markdown files without schema metadata', t => {
  const backend = fixture(t);
  backend.run('init', '--project', 'shop-api');
  const legacy = join(backend.cwd, 'legacy.md');
  writeFileSync(legacy, `---\nid: "hf-20261030-1234abcd"\nfrom: "web"\nto: ["shop-api"]\nsource_commit: "${'a'.repeat(40)}"\ncomparison: "staged"\nstatus: pending\ncreated_at: "2026-10-30T00:00:00.000Z"\n---\n\n# 變動交接\n\n## 本次改動\n\n- src/app.ts\n\n## 待處理\n\n- [ ] [TASK-001] Confirm API\n\n## 待確認\n\n- Discuss errors\n`);
  assert.equal(backend.run('import', legacy).status, 0);
  const record = state(backend, 'hf-20261030-1234abcd');
  assert.equal(record.tasks[0].text, 'Confirm API');
  assert.equal(record.tasks[0].status, 'pending');
});

test('extract only added TODO/FIXME lines, including content resembling diff headers', t => {
  const repo = fixture(t);
  writeFileSync(join(repo.cwd, 'api.ts'), '// TODO: removed\nconst a = 1;\n// TODO: untouched\nconst b = 2;\n');
  repo.git('add', '.'); repo.git('commit', '-qm', 'prepare lines');
  writeFileSync(join(repo.cwd, 'api.ts'), 'const a = 1;\n// TODO: untouched\nconst b = 2;\n++ TODO: plus content\n// FIXME: new error\n');
  repo.git('config', 'color.ui', 'always');
  repo.git('config', 'diff.noprefix', 'true');
  repo.git('config', 'diff.relative', 'true');
  const output = join(repo.cwd, 'out.md');
  const result = repo.run('generate', '--to', 'api', '--output', output);
  assert.equal(result.status, 0, result.stderr);
  const doc = parseDocument(readFileSync(output, 'utf8'));
  assert.deepEqual(doc.tasks.map(t => t.text), ['TODO: plus content (api.ts:4)', 'FIXME: new error (api.ts:5)']);
  assert.doesNotMatch(readFileSync(output, 'utf8'), /\u001b/);
});

test('deleted and binary files are listed without inventing tasks', t => {
  const repo = fixture(t);
  writeFileSync(join(repo.cwd, 'binary.dat'), Buffer.from([0, 1, 2]));
  writeFileSync(join(repo.cwd, 'delete.ts'), '// TODO: old removed task\n');
  repo.git('add', '.'); repo.git('commit', '-qm', 'prepare binary and deleted file');
  rmSync(join(repo.cwd, 'delete.ts'));
  writeFileSync(join(repo.cwd, 'binary.dat'), Buffer.from([0, 3, 4]));
  const output = join(repo.cwd, 'out.md');
  const result = repo.run('generate', '--to', 'api', '--output', output);
  assert.equal(result.status, 0, result.stderr);
  const doc = parseDocument(readFileSync(output, 'utf8'));
  assert.deepEqual(doc.files, ['binary.dat', 'delete.ts']);
  assert.deepEqual(doc.tasks, []);
});

import { repositoryLabel } from '../src/identity.ts';

test('canonical remote identity supports HTTPS, SSH, ports, groups and excludes credentials', () => {
  for (const remote of [
    'https://github.com/WatsonChen/shop-web.git',
    'https://user:secret@github.com/WatsonChen/shop-web.git/',
    'git@github.com:WatsonChen/shop-web.git',
    'ssh://git@github.com:2222/WatsonChen/shop-web.git',
    'git://github.com/WatsonChen/shop-web',
  ]) assert.equal(repositoryLabel(remote), 'WatsonChen/shop-web');
  assert.equal(repositoryLabel('git@gitlab.com:team/subgroup/api.git'), 'team/subgroup/api');
  for (const remote of ['/tmp/backend.git', '../backend.git', 'C:\\repos\\backend.git', 'file:///tmp/backend.git', 'not-a-url', 'https://github.com/only-owner', 'ext::helper /repo.git']) {
    assert.equal(repositoryLabel(remote), undefined, remote);
  }
});

test('source identity is automatic with or without init, including from a subdirectory', t => {
  const repo = fixture(t);
  repo.git('remote', 'add', 'origin', 'https://user:secret@github.com/Example/shop-web.git');
  const info = repo.run('info');
  assert.equal(info.status, 0, info.stderr);
  assert.match(info.stdout, /Example\/shop-web/);
  assert.doesNotMatch(info.stdout, /secret|user:/);
  assert.equal(existsSync(join(repo.cwd, 'handoff.config.json')), false);
  writeFileSync(join(repo.cwd, 'api.ts'), '// TODO: verify endpoint\n');
  const output = join(repo.cwd, 'without-init.md');
  assert.equal(repo.run('generate', '--to', 'Example/shop-api', '--output', output).status, 0);
  assert.equal(parseDocument(readFileSync(output, 'utf8')).from, 'Example/shop-web');
  assert.equal(repo.run('init', '--to', 'Example/shop-api', '--to', 'Example/mobile', '--lang', 'en').status, 0);
  const config = JSON.parse(readFileSync(join(repo.cwd, 'handoff.config.json'), 'utf8'));
  assert.equal(config.project, undefined);
  assert.deepEqual(config.targets, ['Example/shop-api', 'Example/mobile']);
  mkdirSync(join(repo.cwd, 'nested'));
  const result = spawnSync(process.execPath, [cli, 'generate', '--output', 'nested.md'], { cwd: join(repo.cwd, 'nested'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const doc = parseDocument(readFileSync(join(repo.cwd, 'nested/nested.md'), 'utf8'));
  assert.equal(doc.from, 'Example/shop-web');
  assert.deepEqual(doc.to, ['Example/shop-api', 'Example/mobile']);
});

test('repeat init preserves unspecified settings; explicit aliases survive until --auto-project', t => {
  const repo = fixture(t);
  repo.git('remote', 'add', 'origin', 'git@github.com:Example/web.git');
  repo.run('init', '--project', 'legacy-web', '--to', 'legacy-api', '--lang', 'en');
  const path = join(repo.cwd, 'handoff.config.json');
  const before = JSON.parse(readFileSync(path, 'utf8'));
  before.output = 'custom-handoffs';
  writeFileSync(path, JSON.stringify(before));
  assert.equal(repo.run('init').status, 0);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), before);
  assert.match(repo.run('info').stdout, /legacy-web/);
  assert.equal(repo.run('init', '--auto-project').status, 0);
  const after = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(after.project, undefined);
  assert.equal(after.output, 'custom-handoffs');
  assert.deepEqual(after.targets, ['legacy-api']);
  assert.match(repo.run('info').stdout, /Example\/web/);
  assert.equal(repo.run('init', '--project', 'alias', '--auto-project').status, 1);
  assert.equal(repo.run('init', '--to', 'new-api').status, 0);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).targets, ['new-api']);
});

test('identity selection uses origin, then a sole remote, otherwise the folder', t => {
  const repo = fixture(t);
  const fallback = repo.cwd.split(/[\\/]/).at(-1);
  assert.match(repo.run('info').stdout, new RegExp(fallback));
  repo.git('remote', 'add', 'upstream', 'git@gitlab.com:team/api.git');
  assert.match(repo.run('info').stdout, /team\/api/);
  repo.git('remote', 'add', 'backup', 'https://github.com/other/api.git');
  assert.match(repo.run('info').stdout, new RegExp(fallback));
  repo.git('remote', 'add', 'origin', 'https://github.com/Example/web.git');
  assert.match(repo.run('info').stdout, /Example\/web/);
  repo.git('remote', 'set-url', 'origin', '/tmp/local-repo.git');
  assert.match(repo.run('info').stdout, new RegExp(fallback));
});

test('two repositories with HTTPS/SSH identities exchange documents without init or manual source labels', t => {
  const front = fixture(t), back = fixture(t);
  front.git('remote', 'add', 'origin', 'https://github.com/Example/web.git');
  back.git('remote', 'add', 'origin', 'git@github.com:Example/api.git');
  writeFileSync(join(front.cwd, 'api.ts'), '// changed\n');
  const source = join(front.cwd, 'handoff.md');
  assert.equal(front.run('generate', '--to', 'Example/api', '--note', 'Confirm API', '--output', source).status, 0);
  const doc = parseDocument(readFileSync(source, 'utf8'));
  assert.equal(back.run('import', source).status, 0);
  assert.equal(back.run('update', doc.id, '--task', 'TASK-001', '--status', 'done').status, 0);
  const reply = join(back.cwd, 'reply.md');
  assert.equal(back.run('reply', doc.id, '--output', reply).status, 0);
  assert.equal(parseDocument(readFileSync(reply, 'utf8')).from, 'Example/api');
  assert.equal(front.run('import', reply).status, 0);
  assert.equal(state(front, doc.id).responses[0].status, 'completed');
});

test('open handoffs complete a round trip without init or specifying either recipient', t => {
  const front = fixture(t), back = fixture(t);
  front.git('remote', 'add', 'origin', 'https://github.com/Example/frontend.git');
  back.git('remote', 'add', 'origin', 'git@github.com:OtherTeam/backend.git');
  writeFileSync(join(front.cwd, 'api.ts'), '// TODO: implement endpoint\n');
  const source = join(front.cwd, 'handoff.md');
  const generated = front.run('generate', '--output', source);
  assert.equal(generated.status, 0, generated.stderr);
  const document = parseDocument(readFileSync(source, 'utf8'));
  assert.deepEqual(document.to, []);
  assert.match(readFileSync(source, 'utf8'), /接收方：未指定/);
  assert.equal(back.run('import', source).status, 0);
  const accepted = state(back, document.id);
  assert.equal(accepted.receivedBy, 'OtherTeam/backend');
  assert.deepEqual(accepted.document.to, []); // Taking on a task never rewrites its source snapshot.
  back.run('update', document.id, '--task', 'TASK-001', '--status', 'done');
  assert.match(back.run('import', source).stdout, /Already imported/);
  assert.equal(state(back, document.id).tasks[0].status, 'done');
  const replyPath = join(back.cwd, 'reply.md');
  assert.equal(back.run('reply', document.id, '--output', replyPath).status, 0);
  const reply = parseDocument(readFileSync(replyPath, 'utf8'));
  assert.deepEqual(reply.to, ['Example/frontend']);
  assert.equal(front.run('import', replyPath).status, 0);
  assert.equal(state(front, document.id).responses[0].from, 'OtherTeam/backend');
  assert.equal(state(front, document.id).responses[0].status, 'completed');
  assert.equal(existsSync(join(front.cwd, 'handoff.config.json')), false);
  assert.equal(existsSync(join(back.cwd, 'handoff.config.json')), false);
});

test('open handoffs accept multiple receivers independently and bind local work to the importing identity', t => {
  const front = fixture(t);
  front.git('remote', 'add', 'origin', 'https://github.com/Example/web.git');
  writeFileSync(join(front.cwd, 'api.ts'), '// TODO: confirm contract\n');
  const source = join(front.cwd, 'handoff.md');
  front.run('generate', '--output', source);
  const document = parseDocument(readFileSync(source, 'utf8'));
  for (const [repoName, status] of [['api', 'done'], ['mobile', 'blocked']]) {
    const receiver = fixture(t);
    receiver.git('remote', 'add', 'origin', `https://github.com/Example/${repoName}.git`);
    assert.equal(receiver.run('import', source).status, 0);
    assert.equal(receiver.run('update', document.id, '--task', 'TASK-001', '--status', status).status, 0);
    const reply = join(receiver.cwd, 'reply.md');
    assert.equal(receiver.run('reply', document.id, '--output', reply).status, 0);
    assert.equal(front.run('import', reply).status, 0);
    receiver.git('remote', 'set-url', 'origin', 'https://github.com/Example/renamed.git');
    assert.equal(receiver.run('update', document.id, '--task', 'TASK-001', '--status', 'done').status, 1);
    assert.equal(receiver.run('reply', document.id).status, 1);
  }
  assert.deepEqual(state(front, document.id).responses.map(r => [r.from, r.status]), [['Example/api', 'completed'], ['Example/mobile', 'blocked']]);
});

test('replies must always have one explicit recipient even when the original was open', t => {
  const front = fixture(t), back = fixture(t);
  writeFileSync(join(front.cwd, 'api.ts'), '// TODO: work\n');
  const source = join(front.cwd, 'handoff.md');
  front.run('generate', '--output', source);
  const document = parseDocument(readFileSync(source, 'utf8'));
  back.run('import', source);
  const replyPath = join(back.cwd, 'reply.md');
  back.run('reply', document.id, '--output', replyPath);
  const reply = parseDocument(readFileSync(replyPath, 'utf8'));
  writeDocument(join(front.cwd, 'bad-reply.json'), { ...reply, to: [] });
  assert.equal(front.run('import', join(front.cwd, 'bad-reply.json')).status, 1);
  assert.equal(state(front, document.id).responses.length, 0);
});
