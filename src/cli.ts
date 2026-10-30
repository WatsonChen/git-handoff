import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

function git(args: string[]): string {
  return execFileSync('git', ['--no-pager', ...args], {
    encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const help = `git-handoff — 跨 Repository 的 Markdown 交接工具

handoff init
handoff generate --to shop-api [--to admin-web] [--base main | --staged]
                 [--note "請協助確認 API"] [--output 檔案路徑]

預設比較 HEAD 與目前已追蹤檔案（包含暫存與未暫存變動）。
--base 比較指定參考與 HEAD 的共同祖先至 HEAD；--staged 僅讀取暫存區。
新檔案請先 git add。設定檔：repo 根目錄的 handoff.config.json。
本版產生確定的 Git 摘要與新增行中的 TODO/FIXME，不使用 AI。`;

export function main(args: string[]): void {
  const command = args.shift();
  if (!command || command === '--help' || command === '-h') {
    console.log(help); return;
  }
  if (!['init', 'generate'].includes(command)) throw new Error(`未知指令：${command}`);
  const root = git(['rev-parse', '--show-toplevel']).trim();
  const configPath = resolve(root, 'handoff.config.json');
  if (command === 'init') {
    if (args.length) throw new Error('init 不接受額外參數');
    writeFileSync(configPath, JSON.stringify({ project: basename(root), targets: [], output: 'handoffs' }, null, 2) + '\n', { flag: 'wx' });
    console.log(`已建立 ${configPath}`); return;
  }
  let config: { project?: string; targets?: string[]; output?: string } = {};
  try { config = JSON.parse(readFileSync(configPath, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (!config || typeof config !== 'object' ||
      (config.project !== undefined && typeof config.project !== 'string') ||
      (config.output !== undefined && typeof config.output !== 'string') ||
      (config.targets !== undefined && (!Array.isArray(config.targets) || config.targets.some(t => typeof t !== 'string')))) {
    throw new Error('handoff.config.json 格式錯誤');
  }
  const targets: string[] = [], notes: string[] = [];
  let base: string | undefined, staged = false, output: string | undefined;
  while (args.length) {
    const option = args.shift()!;
    if (option === '--staged') { staged = true; continue; }
    if (!['--to', '--note', '--base', '--output'].includes(option)) throw new Error(`未知選項：${option}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw new Error(`${option} 需要值`);
    if (option === '--to') targets.push(value);
    if (option === '--note') notes.push(value);
    if (option === '--base') base = value;
    if (option === '--output') output = value;
  }
  if (base && staged) throw new Error('--base 與 --staged 無法同時使用');
  if (!targets.length) targets.push(...(config.targets ?? []));
  if (!targets.length) throw new Error('請用 --to 指定交接對象，或設定 config.targets');
  const head = git(['rev-parse', 'HEAD']).trim();
  const start = base ? git(['merge-base', '--', base, head]).trim() : undefined;
  const range = staged ? ['--cached'] : start ? [start, head] : [head];
  const common = ['diff', '--no-ext-diff', '--no-textconv', '--no-renames'];
  const names = git([...common, '--name-only', '-z', ...range, '--']).split('\0').filter(Boolean);
  // Generated documents must not recursively become another handoff's input.
  const outputRoot = resolve(root, config.output ?? 'handoffs');
  const included = names.filter(p => {
    const absolute = resolve(root, p);
    return absolute !== configPath && !absolute.startsWith(outputRoot + '/') && absolute !== resolve(process.cwd(), output ?? outputRoot);
  });
  if (!included.length) throw new Error('沒有可交接的變動；新檔案請先 git add');
  const patch = git([...common, '--unified=0', ...range, '--', ...included]);
  const todos: string[] = [];
  let file = '', line = 0;
  for (const row of patch.split('\n')) {
    if (row.startsWith('+++ b/')) file = row.slice(6);
    else if (row.startsWith('@@')) line = Number(row.match(/\+(\d+)/)?.[1] ?? 0);
    else if (row.startsWith('+')) {
      const match = row.slice(1).match(/\b(TODO|FIXME)\b[:\s-]*(.*)/);
      if (match) todos.push(`${match[1]}: ${match[2].trim()} (${file}:${line})`);
      line++;
    } else if (row.startsWith(' ')) line++;
  }
  const id = `hf-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;
  const destination = output ? resolve(output) : resolve(outputRoot, id, '改動.md');
  const safe = (s: string) => s.replace(/[\r\n]/g, ' ').replace(/([\\`*_\[\]<>])/g, '\\$1');
  const tasks = [...notes, ...todos];
  const document = [
    '---', `id: ${JSON.stringify(id)}`, `from: ${JSON.stringify(config.project ?? basename(root))}`,
    `to: ${JSON.stringify([...new Set(targets)])}`, `source_commit: ${JSON.stringify(head)}`,
    `comparison: ${JSON.stringify(staged ? 'staged' : start ? `${start}...${head}` : 'HEAD to working tree')}`,
    'status: pending', `created_at: ${JSON.stringify(new Date().toISOString())}`, '---', '',
    '# 變動交接', '', '## 本次改動', '',
    ...included.map(p => `- ${safe(p)}`), '',
    '## 待處理', '',
    ...(tasks.length ? tasks.map((t, i) => `- [ ] [TASK-${String(i + 1).padStart(3, '0')}] ${safe(t)}`) : ['- 尚未提供待辦，請交接者補充。']), '',
    '## 待確認', '', '- 請確認 API、資料結構與驗收條件；本文件未自動推斷介面需求。', '',
    '## 來源說明', '',
    '- 待辦來自 --note 與差異新增行內的 TODO/FIXME；不代表全部未完成工作。',
    '- 工作區及暫存區的內容可能尚未提交，source_commit 僅標示產生時的 HEAD。', '',
  ].join('\n');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, document, { flag: 'wx' });
  console.log(`已建立 ${destination}`);
}
