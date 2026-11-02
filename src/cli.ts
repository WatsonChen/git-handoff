import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { newId, overall, render, taskStatuses, validate, type Handoff, type Language, type TaskStatus } from './document.ts';
import { Store, entry, readDocument } from './store.ts';
import { identify, type Identity } from './identity.ts';
import { agentSetup } from './agent-setup.ts';
import { configPathFor } from './paths.ts';

function git(args: string[], cwd = process.cwd()): string {
  try {
    return execFileSync('git', ['--no-pager', '--literal-pathspecs', '-c', 'core.quotePath=false', ...args], {
      cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.toString().trim();
    throw new Error(stderr || 'Git command failed.');
  }
}
interface Config { project?: string; targets?: string[]; output?: string; language?: Language }
function configAt(path: string): Config {
  let c: Config;
  try { c = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
  const label = (s: unknown) => typeof s === 'string' && !!s.trim() && !/[\r\n\0]/.test(s);
  if (!c || typeof c !== 'object' || Array.isArray(c) ||
      (c.project !== undefined && !label(c.project)) ||
      (c.output !== undefined && !label(c.output)) ||
      (c.language !== undefined && !['en', 'zh-TW'].includes(c.language)) ||
      (c.targets !== undefined && (!Array.isArray(c.targets) || !c.targets.every(label)))) {
    throw new Error('Invalid Sidepact configuration.');
  }
  return c;
}
const help = `Sidepact — cross-repository handoff checklists / 跨 repo 交接工具

sidepact info
sidepact enable [--agent auto|generic|codex|claude|copilot]
sidepact disable [--agent auto|generic|codex|claude|copilot]
sidepact agent-status [--agent auto|generic|codex|claude|copilot]
sidepact init [--to owner/shop-api] [--lang en|zh-TW] [--project alias | --auto-project]
sidepact generate [--to owner/shop-api] [--base main | --staged]
                 [--note "Confirm API fields"] [--output path] [--lang en|zh-TW]
sidepact import <file.md|file.json>
sidepact list
sidepact show <handoff-id>
sidepact update <handoff-id> --task TASK-001 --status done [--note "Implemented"]
sidepact reply <handoff-id> [--note "API details"] [--output path] [--lang en|zh-TW]
sidepact export <handoff-id> --format json|markdown --output path

Task states: pending, in-progress, done, blocked, needs-clarification.
Install this tool once; run commands inside the repo whose changes you want.
Source project is detected from its Git remote. init is optional, saves defaults,
and preserves unspecified settings when run again. --project is an optional alias.
Recipients are optional: without --to or saved targets, any repo can import the handoff.
工具只需安裝一次；切換至實際專案操作，自動辨識來源。init 選用，不必每次執行。
enable installs one-time project guidance: no cross-repo work / work required / needs confirmation.
啟用後請讓 agent 重新讀取專案指令；不是 push hook，也不會喚醒另一端的 agent。
Default diff: HEAD to working tree (tracked files). Stage new files first.
--base: merge base to HEAD (committed changes only); --staged: index only.
Documents are shared manually. No remote integrations or AI calls.
文件需手動交接；請使用 update/reply 更新狀態，不要手動編輯產出文件。`;

function options(args: string[], allowed: string[], flags: string[] = []): Map<string, string[]> {
  const result = new Map<string, string[]>();
  while (args.length) {
    const key = args.shift()!;
    if (!allowed.includes(key)) throw new Error(`Unknown option: ${key}`);
    const value = flags.includes(key) ? 'true' : args.shift();
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value.`);
    if (result.has(key) && !['--to', '--note'].includes(key)) throw new Error(`Repeated option: ${key}`);
    result.set(key, [...(result.get(key) ?? []), value]);
  }
  return result;
}
function one(opts: Map<string, string[]>, key: string): string | undefined { return opts.get(key)?.[0]; }
function language(value?: string): Language {
  if (value !== undefined && !['en', 'zh-TW'].includes(value)) throw new Error('--lang must be en or zh-TW.');
  return (value ?? 'zh-TW') as Language;
}
function writeOutput(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { flag: 'wx' });
  console.log(`Created / 已建立: ${path}`);
}
function inside(path: string, directory: string): boolean {
  const child = relative(directory, path);
  return child === '' || (child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child));
}
function quotePath(path: string): string {
  if (!path.startsWith('"')) return path;
  // Git quotes control characters and arbitrary filename bytes using C escapes.
  const body = path.slice(1, -1);
  const buffers: Buffer[] = [];
  for (let i = 0; i < body.length;) {
    if (body[i] !== '\\') {
      const next = body.indexOf('\\', i);
      const end = next < 0 ? body.length : next;
      buffers.push(Buffer.from(body.slice(i, end))); i = end; continue;
    }
    const octal = body.slice(i + 1).match(/^[0-7]{1,3}/)?.[0];
    if (octal) { buffers.push(Buffer.from([parseInt(octal, 8)])); i += octal.length + 1; }
    else {
      const escapes: Record<string, string> = { t: '\t', n: '\n', r: '\r', a: '\x07', b: '\b', v: '\v', f: '\f', '\\': '\\', '"': '"' };
      buffers.push(Buffer.from(escapes[body[i + 1]] ?? body[i + 1])); i += 2;
    }
  }
  return Buffer.concat(buffers).toString('utf8');
}

function printInfo(root: string, config: Config, identity: Identity): void {
  console.log([
    `Repository / 目前操作的 repo: ${root}`,
    `Project / 專案識別: ${identity.project}`,
    `Identity source / 辨識來源: ${identity.source}`,
    `Recipients / 預設接收方: ${config.targets?.join(', ') || '(open / 未指定，由匯入的專案接手)'}`,
    `Language / 文件語言: ${config.language ?? 'zh-TW'}`,
  ].join('\n'));
}

export function main(args: string[]): void {
  const command = args.shift();
  if (!command || command === '--help' || command === '-h') { console.log(help); return; }
  if (!['info', 'enable', 'disable', 'agent-status', 'init', 'generate', 'import', 'list', 'show', 'update', 'reply', 'export'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const root = git(['rev-parse', '--show-toplevel']).trim();
  if (command === 'enable' || command === 'disable' || command === 'agent-status') {
    const opts = options(args, ['--agent']);
    agentSetup(root, command, one(opts, '--agent') ?? 'auto'); return;
  }
  const configPath = configPathFor(root);
  const config = configAt(configPath);
  if (command === 'init') {
    const opts = options(args, ['--to', '--project', '--auto-project', '--lang'], ['--auto-project']);
    if (opts.has('--project') && opts.has('--auto-project')) throw new Error('--project and --auto-project cannot be combined.');
    const next: Config = { targets: [], output: 'handoffs', language: 'zh-TW', ...config };
    if (opts.has('--project')) next.project = one(opts, '--project');
    if (opts.has('--auto-project')) delete next.project;
    if (opts.has('--to')) next.targets = [...new Set(opts.get('--to'))];
    if (opts.has('--lang')) next.language = language(one(opts, '--lang'));
    if ((next.project !== undefined && (!next.project.trim() || /[\r\n\0]/.test(next.project))) || next.targets?.some(t => !t.trim() || /[\r\n\0]/.test(t))) throw new Error('Invalid project or recipient label.');
    // Avoid pinning automatic detection to the machine's folder name or a stale remote value.
    writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n');
    console.log(`Configured / 已設定: ${configPath}`);
    printInfo(root, next, identify(root, next.project)); return;
  }
  const identity = identify(root, config.project);
  const project = identity.project;
  if (command === 'info') { options(args, []); printInfo(root, config, identity); return; }
  const store = new Store(root);
  const outputRoot = resolve(root, config.output ?? 'handoffs');
  const lang = language(config.language);

  if (command === 'generate') {
    const opts = options(args, ['--to', '--note', '--base', '--staged', '--output', '--lang'], ['--staged']);
    const base = one(opts, '--base'), staged = opts.has('--staged');
    if (base && staged) throw new Error('--base and --staged cannot be combined.');
    const targets = [...new Set(opts.get('--to') ?? config.targets ?? [])];
    const head = git(['rev-parse', 'HEAD'], root).trim();
    const start = base ? git(['merge-base', '--', base, head], root).trim() : undefined;
    const range = staged ? ['--cached'] : start ? [start, head] : [head];
    const common = ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', '--no-relative', '--src-prefix=a/', '--dst-prefix=b/'];
    const names = git([...common, '--name-only', '-z', ...range, '--'], root).split('\0').filter(Boolean);
    const output = one(opts, '--output');
    const files = names.filter(p => {
      const absolute = resolve(root, p);
      return ![configPath, resolve(root, 'sidepact.config.json'), resolve(root, 'handoff.config.json')].includes(absolute) && !inside(absolute, outputRoot) && !inside(absolute, resolve(root, '.git-handoff')) && !inside(absolute, resolve(root, '.sidepact')) && (!output || absolute !== resolve(output));
    });
    if (!files.length) throw new Error('No changes to hand off. Stage new files with git add.');
    const patch = git([...common, '--unified=0', ...range, '--', ...files], root);
    const todos: string[] = [];
    let file = '', line = 0, inHunk = false;
    for (const row of patch.split('\n')) {
      if (row.startsWith('diff --git ')) { inHunk = false; file = ''; }
      else if (!inHunk && row.startsWith('+++ ')) file = quotePath(row.slice(4).replace(/\t.*$/, '')).replace(/^b\//, '');
      else if (row.startsWith('@@')) { line = Number(row.match(/\+(\d+)/)?.[1] ?? 0); inHunk = true; }
      else if (inHunk && row.startsWith('+')) {
        const match = row.slice(1).match(/\b(TODO|FIXME)\b[:\s-]*(.*)/);
        if (match) todos.push(`${match[1]}: ${match[2].trim()} (${file}:${line})`);
        line++;
      } else if (inHunk && row.startsWith(' ')) line++;
    }
    const document: Handoff = {
      schema_version: 1, kind: 'handoff', id: newId(), from: project, to: targets,
      source_commit: head, comparison: staged ? 'staged' : start ? `${start}...${head}` : 'HEAD to working tree',
      status: 'pending', created_at: new Date().toISOString(), language: language(one(opts, '--lang') ?? lang), files,
      tasks: [...(opts.get('--note') ?? []), ...todos].map((text, i) => ({ id: `TASK-${String(i + 1).padStart(3, '0')}`, text, status: 'pending' })), notes: [],
    };
    const destination = output ? resolve(output) : resolve(outputRoot, document.id, '改動.md');
    writeOutput(destination, render(document));
    store.save(entry(document, 'outgoing'));
    console.log(`ID: ${document.id}`); return;
  }

  if (command === 'list') {
    options(args, []);
    const records = store.all();
    console.log(records.length ? records.map(r => `${r.document.id}  ${r.direction}  ${r.document.kind}  ${overall(r.tasks)}  ${r.document.from} -> ${r.receivedBy ?? (r.document.to.join(', ') || '(open)')}  replies:${r.responses.length}`).join('\n') : 'No local handoffs / 尚無交接紀錄。');
    return;
  }

  const idOrPath = args.shift();
  if (!idOrPath || idOrPath.startsWith('--')) throw new Error(`${command} requires a ${command === 'import' ? 'file path' : 'handoff ID'}.`);
  if (command === 'import') {
    options(args, []);
    const { document, fingerprint: digest } = readDocument(resolve(idOrPath));
    if (document.to.length && !document.to.includes(project)) throw new Error(`Recipient mismatch: this repo is ${project}; document is addressed to ${document.to.join(', ')}. Run sidepact info in the receiving repo and use that exact identity in the sender's --to. For an existing alias-based exchange, use sidepact init --project <alias>.`);
    const existing = store.get(document.id);
    if (existing) {
      if (existing.fingerprint !== digest) throw new Error('Same document ID has different content. Ask the sender to generate a new document.');
      console.log(`Already imported / 已匯入: ${document.id}`); return;
    }
    if (document.kind === 'reply') {
      const original = store.require(document.reply_to!);
      if (original.direction !== 'outgoing' || original.document.kind !== 'handoff' || original.document.from !== project || (original.document.to.length && !original.document.to.includes(document.from))) throw new Error('Reply sender or original handoff does not match.');
      const expected = original.document.tasks;
      if (document.tasks.length !== expected.length || document.tasks.some(task => !expected.some(t => t.id === task.id && t.text === task.text))) throw new Error('Reply tasks do not match the original handoff.');
      if (!original.responses.some(r => r.id === document.id)) {
        original.responses.push(document);
        store.save(original, true);
      }
    }
    store.save({ ...entry(document, 'incoming'), receivedBy: project });
    console.log(`Imported / 已匯入: ${document.id}`); return;
  }

  const record = store.require(idOrPath);
  if (command === 'show') {
    options(args, []);
    if (record.receivedBy) console.log(`Local receiver / 本機接手專案: ${record.receivedBy}\n`);
    console.log(render({ ...record.document, tasks: record.tasks, status: overall(record.tasks) }));
    if (record.responses.length) {
      console.log('\n# Received replies / 已收到的回覆\n');
      // Keep each recipient's responses separate; one recipient cannot close another's tasks.
      for (const response of record.responses) console.log(`## ${response.from} — ${response.id}\n\n${render(response)}`);
    }
    return;
  }
  if (command === 'export') {
    const opts = options(args, ['--format', '--output']);
    const format = one(opts, '--format'), output = one(opts, '--output');
    if (!['json', 'markdown'].includes(format ?? '') || !output) throw new Error('export requires --format json|markdown and --output path.');
    // Export the immutable source document; local changes are sent as a new reply.
    writeOutput(resolve(output), format === 'json' ? JSON.stringify(record.document, null, 2) + '\n' : render(record.document));
    return;
  }
  if (record.direction !== 'incoming' || record.document.kind !== 'handoff') throw new Error(`${command} requires an imported handoff, not an outgoing document or reply.`);
  if (record.receivedBy ? record.receivedBy !== project : !record.document.to.includes(project)) throw new Error('Local project label no longer matches the handoff recipient.');
  if (command === 'update') {
    const opts = options(args, ['--task', '--status', '--note']);
    const task = record.tasks.find(t => t.id === one(opts, '--task'));
    const status = one(opts, '--status') as TaskStatus;
    if (!task) throw new Error('Specify an existing task with --task TASK-001.');
    if (!taskStatuses.includes(status)) throw new Error(`--status must be one of: ${taskStatuses.join(', ')}`);
    if ((opts.get('--note')?.length ?? 0) > 1) throw new Error('update accepts only one --note.');
    task.status = status;
    if (opts.has('--note')) task.note = one(opts, '--note');
    validate({ ...record.document, tasks: record.tasks, status: overall(record.tasks) });
    store.save(record, true);
    console.log(`Updated / 已更新: ${record.document.id} ${task.id} -> ${status}`); return;
  }
  const opts = options(args, ['--note', '--output', '--lang']);
  const reply: Handoff = {
    schema_version: 1, kind: 'reply', id: newId(), from: project, to: [record.document.from],
    reply_to: record.document.id, source_commit: git(['rev-parse', 'HEAD'], root).trim(), comparison: 'reply snapshot at HEAD',
    status: overall(record.tasks), created_at: new Date().toISOString(), language: language(one(opts, '--lang') ?? lang),
    files: [], tasks: structuredClone(record.tasks), notes: opts.get('--note') ?? [],
  };
  const destination = one(opts, '--output') ? resolve(one(opts, '--output')!) : resolve(outputRoot, reply.id, '回覆.md');
  writeOutput(destination, render(reply));
  store.save(entry(reply, 'outgoing'));
  console.log(`ID: ${reply.id} (reply to ${reply.reply_to})`);
}
