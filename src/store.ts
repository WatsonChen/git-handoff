import { mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseDocument, validate, validId, overall, type Handoff, type Task } from './document.ts';

export interface RecordEntry {
  version: 1;
  direction: 'incoming' | 'outgoing';
  document: Handoff;
  fingerprint: string;
  tasks: Task[];
  responses: Handoff[];
  receivedBy?: string;
}
export function readDocument(path: string): { document: Handoff; fingerprint: string } {
  if (statSync(path).size > 2 * 1024 * 1024) throw new Error('Document exceeds 2 MiB.');
  const raw = readFileSync(path, 'utf8');
  const document = parseDocument(raw);
  // Canonical parsed data allows Markdown and JSON exports of the same document to deduplicate.
  return { document, fingerprint: fingerprint(document) };
}
export function fingerprint(document: Handoff): string {
  // Normalize field order, including nested task objects.
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, canonical(val)]));
    return value;
  };
  return createHash('sha256').update(JSON.stringify(canonical(document))).digest('hex');
}
export class Store {
  directory: string;
  constructor(root: string) { this.directory = resolve(root, '.git-handoff', 'records'); }
  path(id: string): string {
    if (!validId(id)) throw new Error(`Invalid handoff ID: ${id}`);
    return resolve(this.directory, `${id}.json`);
  }
  get(id: string): RecordEntry | undefined {
    let raw: string;
    try { raw = readFileSync(this.path(id), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    const record = JSON.parse(raw) as RecordEntry;
    if (record.version !== 1 || !['incoming', 'outgoing'].includes(record.direction)) throw new Error('Invalid local record.');
    if (record.receivedBy !== undefined && (record.direction !== 'incoming' || typeof record.receivedBy !== 'string' || !record.receivedBy.trim() || /[\r\n\0]/.test(record.receivedBy))) throw new Error('Invalid local receiver.');
    validate(record.document);
    if (record.document.id !== id || record.fingerprint !== fingerprint(record.document)) throw new Error('Local document integrity check failed.');
    validate({ ...record.document, tasks: record.tasks, status: overall(record.tasks) });
    if (!Array.isArray(record.responses)) throw new Error('Invalid local replies.');
    record.responses.forEach(validate);
    return record;
  }
  require(id: string): RecordEntry {
    const value = this.get(id);
    if (!value) throw new Error(`Unknown handoff: ${id}. Generate or import it first.`);
    return value;
  }
  save(record: RecordEntry, overwrite = false): void {
    mkdirSync(this.directory, { recursive: true });
    const path = this.path(record.document.id);
    const content = JSON.stringify(record, null, 2) + '\n';
    if (!overwrite) { writeFileSync(path, content, { flag: 'wx' }); return; }
    const temporary = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, content, { flag: 'wx' });
    renameSync(temporary, path);
  }
  all(): RecordEntry[] {
    let files: string[];
    try { files = readdirSync(this.directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return files.filter(f => /^hf-\d{8}-[a-f0-9]{8}\.json$/.test(f)).sort().map(f => this.require(f.slice(0, -5)));
  }
}
export function entry(document: Handoff, direction: RecordEntry['direction']): RecordEntry {
  return { version: 1, direction, document, fingerprint: fingerprint(document), tasks: structuredClone(document.tasks), responses: [] };
}
