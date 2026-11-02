import { randomUUID } from 'node:crypto';

export type Language = 'zh-TW' | 'en';
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'blocked' | 'needs-clarification';
export interface Task { id: string; text: string; status: TaskStatus; note?: string }
export interface Handoff {
  schema_version: 1;
  kind: 'handoff' | 'reply';
  id: string;
  from: string;
  to: string[];
  source_commit: string;
  comparison: string;
  status: string;
  created_at: string;
  language: Language;
  files: string[];
  tasks: Task[];
  notes: string[];
  reply_to?: string;
}
export const taskStatuses: TaskStatus[] = ['pending', 'in-progress', 'done', 'blocked', 'needs-clarification'];
export function validId(id: string): boolean { return /^hf-\d{8}-[a-f0-9]{8}$/.test(id); }
export function newId(): string {
  return `hf-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;
}
export function overall(tasks: Task[]): string {
  if (!tasks.length) return 'pending';
  if (tasks.every(t => t.status === 'done')) return 'completed';
  if (tasks.some(t => t.status === 'blocked')) return 'blocked';
  if (tasks.some(t => t.status === 'needs-clarification')) return 'needs-clarification';
  if (tasks.some(t => t.status !== 'pending')) return 'in-progress';
  return 'pending';
}
function label(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[\r\n\0]/.test(value);
}
export function validate(value: unknown): Handoff {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid handoff document.');
  const d = value as Handoff;
  const fields = ['schema_version', 'kind', 'id', 'from', 'to', 'source_commit', 'comparison', 'status', 'created_at', 'language', 'files', 'tasks', 'notes', 'reply_to'];
  if (Object.keys(d).some(key => !fields.includes(key))) throw new Error('Unknown document field.');
  if (d.schema_version !== 1) throw new Error('Unsupported schema_version (expected 1).');
  if (!['handoff', 'reply'].includes(d.kind) || !label(d.id) || !validId(d.id)) throw new Error('Invalid document kind or ID.');
  if (!label(d.from) || !Array.isArray(d.to) || !d.to.every(label) || new Set(d.to).size !== d.to.length) throw new Error('Invalid sender or recipients.');
  if (typeof d.source_commit !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(d.source_commit)) throw new Error('Invalid source_commit.');
  if (!label(d.comparison) || !label(d.created_at) || Number.isNaN(Date.parse(d.created_at))) throw new Error('Invalid document metadata.');
  if (!['zh-TW', 'en'].includes(d.language)) throw new Error('Invalid document language.');
  if (!Array.isArray(d.files) || !d.files.every(label) || !Array.isArray(d.notes) || !d.notes.every(label)) throw new Error('Invalid files or notes.');
  if (!Array.isArray(d.tasks) || d.tasks.some(t => !t || !label(t.id) || !/^TASK-\d{3,}$/.test(t.id) || !label(t.text) || !taskStatuses.includes(t.status) || (t.note !== undefined && !label(t.note)))) throw new Error('Invalid task data.');
  if (new Set(d.tasks.map(t => t.id)).size !== d.tasks.length) throw new Error('Duplicate task IDs.');
  if (d.status !== overall(d.tasks)) throw new Error('Document status does not match its tasks.');
  if (d.kind === 'reply' && (!d.reply_to || !validId(d.reply_to) || d.reply_to === d.id || d.to.length !== 1)) throw new Error('Invalid reply reference.');
  if (d.kind === 'handoff' && d.reply_to !== undefined) throw new Error('A handoff cannot have reply_to.');
  return d;
}
export function parseDocument(raw: string): Handoff {
  if (raw.trimStart().startsWith('{')) return validate(JSON.parse(raw));
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const front = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!front) throw new Error('Missing Sidepact front matter.');
  const data: Record<string, unknown> = Object.create(null);
  for (const row of front[1].split('\n')) {
    if (!row.trim()) continue;
    const pair = row.match(/^([a-z_]+):\s*(.+)$/);
    if (!pair || Object.hasOwn(data, pair[1])) throw new Error('Invalid or duplicate front matter field.');
    try { data[pair[1]] = JSON.parse(pair[2]); }
    catch {
      // Compatibility with v0.1's unquoted status field only.
      if (pair[1] === 'status' && pair[2] === 'pending') data.status = 'pending';
      else throw new Error(`Invalid front matter field: ${pair[1]}`);
    }
  }
  if (data.schema_version === undefined) {
    // v0.1 documents had no machine-readable tasks. Limit extraction to the task section.
    const section = text.slice(front[0].length).match(/(?:^|\n)## 待處理\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? '';
    const tasks: Task[] = [];
    for (const line of section.split('\n')) {
      const match = line.match(/^- \[([ xX])\] \[(TASK-\d{3,})\] (.+)$/);
      if (match) tasks.push({ id: match[2], text: match[3].replace(/\\([\\`*_\[\]<>])/g, '$1'), status: match[1] === ' ' ? 'pending' : 'done' });
    }
    const body = text.slice(front[0].length);
    const filesSection = body.match(/(?:^|\n)## 本次改動\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? '';
    const files = filesSection.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).replace(/\\([\\`*_\[\]<>])/g, '$1'));
    Object.assign(data, { schema_version: 1, kind: 'handoff', language: 'zh-TW', files, notes: [], tasks, status: overall(tasks) });
  }
  return validate({ ...data });
}
function safe(s: string): string { return s.replace(/[\r\n]/g, ' ').replace(/([\\`*_\[\]<>])/g, '\\$1'); }
export function render(d: Handoff): string {
  validate(d);
  const en = d.language === 'en';
  const title = d.kind === 'reply' ? (en ? 'Handoff reply' : '交接回覆') : (en ? 'Change handoff' : '變動交接');
  return [
    '---', ...Object.entries(d).map(([key, value]) => `${key}: ${JSON.stringify(value)}`), '---', '',
    `# ${title}`, '',
    ...(d.kind === 'handoff' && !d.to.length ? [en ? 'Recipients: open — the repository that imports this file can take it on.' : '接收方：未指定，由匯入此文件的專案接手。', ''] : []),
    ...(d.reply_to ? [`${en ? 'Reply to' : '原始交接'}: ${d.reply_to}`, ''] : []),
    `## ${en ? 'Changed files' : '本次改動'}`, '',
    ...(d.files.length ? d.files.map(p => `- ${safe(p)}`) : [en ? '- No file list attached.' : '- 未附變動檔案清單。']), '',
    `## ${en ? 'Tasks' : '待處理'}`, '',
    ...(d.tasks.length ? d.tasks.flatMap(t => [
      `- [${t.status === 'done' ? 'x' : ' '}] [${t.id}] ${safe(t.text)} (${t.status})`,
      ...(t.note ? [`  - ${safe(t.note)}`] : []),
    ]) : [en ? '- No tasks supplied. Add explicit notes when generating a handoff.' : '- 尚未提供待辦，產生時可用 --note 補充。']), '',
    `## ${en ? 'Notes / questions' : '補充與待確認'}`, '',
    ...(d.notes.length ? d.notes.map(n => `- ${safe(n)}`) : [en ? '- Confirm API contracts and acceptance criteria with the receiving team.' : '- 請與接收方確認 API 契約及驗收條件。']), '',
    `## ${en ? 'Source and editing' : '來源與編輯方式'}`, '',
    en ? '- Tasks come from explicit notes and TODO/FIXME markers in added diff lines; they are not a complete task inventory.' : '- 待辦來自明確備註及差異新增行的 TODO/FIXME，不是完整專案待辦清單。',
    en ? '- source_commit identifies HEAD, not uncommitted work. Reply files do not automatically include backend diffs.' : '- source_commit 標示 HEAD，不含未提交內容；回覆不會自動附上後端 diff。',
    en ? '- Front matter is machine-readable. Use sidepact update/reply to change task status; do not edit generated files by hand.' : '- 工具讀取檔頭資料。請用 sidepact update/reply 更新狀態，不要手動修改產出的文件。', '',
  ].join('\n');
}
