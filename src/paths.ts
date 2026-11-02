import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function configPathFor(root: string): string {
  const current = resolve(root, 'sidepact.config.json');
  const legacy = resolve(root, 'handoff.config.json');
  return existsSync(current) ? current : existsSync(legacy) ? legacy : current;
}

export function stateDirectory(root: string): string {
  const current = resolve(root, '.sidepact');
  const legacy = resolve(root, '.git-handoff');
  if (existsSync(current) && existsSync(legacy)) {
    throw new Error('Both .sidepact and .git-handoff exist. Keep one local history directory before continuing; Sidepact will not merge or overwrite records automatically.');
  }
  return existsSync(legacy) ? legacy : current;
}
