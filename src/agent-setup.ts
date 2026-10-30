import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const begin = '<!-- git-handoff:begin -->';
const end = '<!-- git-handoff:end -->';
export const agents = ['auto', 'generic', 'codex', 'claude', 'copilot'] as const;
export type Agent = typeof agents[number];

// Self-contained instructions: no network lookup or globally installed skill is required.
export const instructions = `${begin}
## git-handoff: cross-repository review / 跨端交接檢查

At the end of a coding task, check cross-repository dependencies as part of your normal review.
Follow the user's request and the project's existing rules. git-handoff is a bridge between
frontend, backend, mobile, and other agents; it does not infer requirements or wake other agents.

### Review
- Inspect the actual task diff, relevant API callers/mocks, contracts/types, and tests.
- Does completion need another repository to add/change an API, field, event, or capability?
- Can the issue instead be fixed within this repository using an existing supported interface?
- Separate observed evidence from assumptions. Not finding a field in a frontend type or mock
  is not proof that the backend lacks it. Do not pretend to inspect code you cannot access.

### Report one outcome in the user's language
- **No cross-repo work / 無需跨端**: explain briefly; do not generate an empty or irrelevant handoff.
- **Cross-repo work required / 需要跨端**: identify the concrete dependency, evidence, and acceptance criteria.
- **Needs confirmation / 待確認**: state the missing information and question; do not present a proposed contract as agreed.

### Generate when work or confirmation is needed
- Run commands in the actual application repository, not the git-handoff tool clone.
- Use \`handoff generate\` with one single-line \`--note\` per self-contained task. Start the note
  with [required] or [needs-confirmation], then give behavior, file/line evidence, relevant
  endpoint/request/response/error fields, acceptance criteria, and remaining questions.
- Select the real task comparison: default for uncommitted tracked changes, \`--staged\` for
  staged changes, or \`--base <actual-start-ref>\` for committed changes. A clean tree after
  commit/push has no default diff. Follow existing project rules before staging any new files.
- Do not require init or recipient setup. Omit \`--to\` unless targeting is explicitly requested;
  existing configured targets still apply. Do not change configuration just to bypass a mismatch.
- Read the generated Markdown and verify its sources and tasks. Report its path, original ID,
  and open questions. Do not hand-edit generated files/front matter or overwrite prior snapshots.
- If the CLI is unavailable or cannot generate for the selected scope, report the limitation;
  do not claim a file was generated. Do not invent unrelated changes to make generation succeed.

### When receiving a handoff or reply
- Import the user-provided file with \`handoff import <path>\`, then inspect \`handoff show <original-id>\`.
- Verify requirements against this repository's actual code/contracts before implementing.
- Preserve task IDs/text. Use \`handoff update <id> --task TASK-001 --status <state> --note <result>\`.
  Mark done only after appropriate verification; use blocked or needs-clarification when needed.
- Produce \`handoff reply <original-id> --note <actual behavior, verification, and follow-up>\`.
  Keep actual results separate from assumptions. Never claim tests or delivery that did not occur.
- Files are local, immutable snapshots. The user sends them manually; no push hook, remote
  notification, automatic delivery, or cross-agent execution is installed by this rule.
${end}`;

function target(root: string, agent: Agent): string {
  const file = (name: string) => resolve(root, name);
  if (agent === 'claude') return file('CLAUDE.md');
  if (agent === 'copilot') return file('.github/copilot-instructions.md');
  if (agent === 'codex') return file(existsSync(file('AGENTS.override.md')) ? 'AGENTS.override.md' : 'AGENTS.md');
  if (agent === 'generic') return file('AGENTS.md');
  // Reuse an existing instruction file. Default to AGENTS.md on a new repository.
  for (const name of ['AGENTS.override.md', 'AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md']) {
    if (existsSync(file(name))) return file(name);
  }
  return file('AGENTS.md');
}
function readSafe(root: string, path: string): string {
  // Do not follow a file or parent symlink into another repo or an unrelated user instruction file.
  let current = root;
  for (const part of relative(root, path).split(sep)) {
    current = join(current, part);
    let info;
    try { info = lstatSync(current); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    if (info.isSymbolicLink()) throw new Error(`Instruction paths must not be symlinks: ${current}. Merge instructions manually instead.`);
  }
  try { return readFileSync(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw error; }
}
function ownedRange(text: string): [number, number] | undefined {
  const start = text.indexOf(begin), finish = text.indexOf(end);
  if (start === -1 && finish === -1) return;
  if (start === -1 || finish < start || text.indexOf(begin, start + begin.length) !== -1 || text.indexOf(end, finish + end.length) !== -1) {
    throw new Error('Malformed or duplicate git-handoff markers. Existing instructions were not changed.');
  }
  return [start, finish + end.length];
}
export function agentSetup(root: string, action: 'enable' | 'disable' | 'agent-status', name: string): void {
  if (!agents.includes(name as Agent)) throw new Error(`--agent must be one of: ${agents.join(', ')}`);
  const path = target(root, name as Agent);
  const original = readSafe(root, path);
  const range = ownedRange(original);
  if (action === 'agent-status') {
    console.log(`${range ? 'Enabled / 已啟用' : 'Not enabled / 未啟用'}: ${path}`);
    return;
  }
  let next: string;
  if (action === 'enable') {
    next = range ? original.slice(0, range[0]) + instructions + original.slice(range[1]) : original + (original ? '\n\n' : '') + instructions + '\n';
  } else {
    if (!range) { console.log(`Not enabled / 未啟用: ${path}`); return; }
    const start = range[0] >= 2 && original.slice(range[0] - 2, range[0]) === '\n\n' ? range[0] - 2 : range[0];
    const finish = original[range[1]] === '\n' ? range[1] + 1 : range[1];
    next = original.slice(0, start) + original.slice(finish);
  }
  if (next === original) { console.log(`Already enabled / 已啟用: ${path}`); return; }
  if (original) {
    const backupRoot = resolve(root, '.git-handoff', 'instruction-backups');
    // Apply the same containment check to backup paths before writing.
    readSafe(root, resolve(backupRoot, '__path_check__'));
    mkdirSync(backupRoot, { recursive: true });
    writeFileSync(resolve(backupRoot, `${Date.now()}-${randomUUID()}.md`), original, { flag: 'wx' });
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  console.log(`${action === 'enable' ? 'Enabled / 已啟用' : 'Disabled / 已停用'}: ${path}`);
  if (action === 'enable') console.log('Start a new agent session or reload project instructions. This installs guidance, not a completion hook or a remote notification.');
}
