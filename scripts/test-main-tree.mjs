import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scope, validateMainTreeScope } from './main-tree-scope.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await validateMainTreeScope();

const result = spawnSync(
  process.execPath,
  ['--test', ...scope.verification.defaultTestFiles],
  { cwd: repositoryRoot, encoding: 'utf8', stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
