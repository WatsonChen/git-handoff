import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

/** Convert common hosted Git URL forms into the same owner/repo label. Never return credentials. */
export function repositoryLabel(remote: string): string | undefined {
  const value = remote.trim();
  let path: string;
  if (/^(https?|ssh|git):\/\//i.test(value)) {
    try { const url = new URL(value); if (!url.hostname) return undefined; path = url.pathname; }
    catch { return undefined; }
  } else {
    // SCP-style SSH URL. Local paths (including Windows drive paths) are not hosted identities.
    if (/^[a-z]:[\\/]/i.test(value) || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return undefined;
    const scp = value.match(/^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/);
    if (!scp) return undefined;
    path = scp[1];
    if (path.startsWith(':')) return undefined;
  }
  path = path.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
  const segments = path.split('/');
  if (segments.length < 2 || segments.some(s => !s || s === '.' || s === '..') || /[\r\n\0?#]/.test(path)) return undefined;
  return path;
}

export interface Identity { project: string; source: string }
export function identify(root: string, override?: string): Identity {
  if (override !== undefined) return { project: override, source: 'config.project (explicit alias / 手動別名)' };
  const read = (args: string[]): string => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const remotes = read(['remote']).split('\n').filter(Boolean);
  const remote = remotes.includes('origin') ? 'origin' : remotes.length === 1 ? remotes[0] : undefined;
  if (remote) {
    let url: string | undefined;
    try { url = read(['remote', 'get-url', remote]); } catch { /* A remote without a URL falls back to the folder. */ }
    const project = url ? repositoryLabel(url) : undefined;
    if (project) return { project, source: `Git remote: ${remote} (automatic / 自動辨識)` };
  }
  return { project: basename(root), source: 'repository folder (no unambiguous hosted remote / 使用資料夾名稱)' };
}
