import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMaayanPage } from './sync-maayan-from-word-forge.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scopePath = path.join(repositoryRoot, 'main-tree-scope.json');

export const scope = JSON.parse(await readFile(scopePath, 'utf8'));

function normalizeRepositoryPath(value) {
  const normalized = String(value).replaceAll('\\', '/').replace(/^\.\//, '');
  assert.ok(!normalized.startsWith('../'), `path leaves repository: ${value}`);
  return normalized;
}

function matchesDirectory(value, directory) {
  return value === directory.slice(0, -1) || value.startsWith(directory);
}

export function classifyRepositoryPath(value) {
  const candidate = normalizeRepositoryPath(value);
  if (scope.syncOnlyExceptions.some((item) => item.path === candidate)) return 'sync-only';
  if (scope.detached.files.includes(candidate)) return 'detached';
  if (scope.detached.directories.some((directory) => matchesDirectory(candidate, directory))) return 'detached';
  if (scope.mainTree.entryDocuments.includes(candidate)) return 'main-tree';
  if (scope.mainTree.runtimeFiles.includes(candidate)) return 'main-tree';
  if (scope.mainTree.runtimeDirectories.some((directory) => matchesDirectory(candidate, directory))) return 'main-tree';
  if (scope.scopeControlFiles.includes(candidate)) return 'scope-control';
  if (scope.verification.defaultTestFiles.includes(candidate)) return 'verification';
  if (scope.verification.explicitDetachedTests.includes(candidate)) return 'detached-test';
  return 'unclassified';
}

async function filesBelow(relativeDirectory) {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(`${relative}/`));
    if (entry.isFile()) files.push(relative);
  }
  return files;
}

export async function mainTreeFiles() {
  const directoryFiles = await Promise.all(scope.mainTree.runtimeDirectories.map(filesBelow));
  return [...new Set([
    ...scope.mainTree.entryDocuments,
    ...scope.mainTree.runtimeFiles,
    ...directoryFiles.flat(),
  ])].sort();
}

export function mainTreeHtmlFiles() {
  return scope.mainTree.entryDocuments.filter((file) => file.endsWith('.html'));
}

function repositoryTarget(sourceFile, rawReference) {
  if (!rawReference || rawReference.startsWith('#') || rawReference.includes('${')) return null;
  const baseUrl = new URL(scope.repositoryBaseUrl);
  const resolved = new URL(rawReference, new URL(sourceFile, baseUrl));
  if (resolved.origin !== baseUrl.origin || !resolved.pathname.startsWith(baseUrl.pathname)) return null;
  let relative = decodeURIComponent(resolved.pathname.slice(baseUrl.pathname.length));
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  return normalizeRepositoryPath(relative);
}

async function assertFileExists(relativePath) {
  const metadata = await stat(path.join(repositoryRoot, relativePath));
  assert.ok(metadata.isFile(), `expected file: ${relativePath}`);
}

export async function validateMainTreeScope() {
  assert.equal(scope.policy, 'default-main-navigation-tree-only');
  assert.ok(scope.mainTree.entryDocuments.includes('diagnostic/index.html'));

  const mainFiles = await mainTreeFiles();
  for (const file of mainFiles) {
    assert.equal(classifyRepositoryPath(file), 'main-tree', `main-tree classification: ${file}`);
    await assertFileExists(file);
  }

  for (const item of scope.syncOnlyExceptions) {
    assert.equal(classifyRepositoryPath(item.path), 'sync-only');
    await Promise.all([assertFileExists(item.path), assertFileExists(item.source), assertFileExists(item.script)]);
    const [source, generated] = await Promise.all([
      readFile(path.join(repositoryRoot, item.source), 'utf8'),
      readFile(path.join(repositoryRoot, item.path), 'utf8'),
    ]);
    assert.equal(generated, createMaayanPage(source), `${item.name} must be an exact deterministic sync`);
  }

  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const sourceFile of mainTreeHtmlFiles()) {
    const html = await readFile(path.join(repositoryRoot, sourceFile), 'utf8');
    for (const match of html.matchAll(attributePattern)) {
      const target = repositoryTarget(sourceFile, match[1]);
      if (!target) continue;
      assert.equal(
        classifyRepositoryPath(target),
        'main-tree',
        `${sourceFile} links outside the main tree: ${match[1]} -> ${target}`,
      );
    }
  }

  for (const file of scope.verification.defaultTestFiles) {
    assert.notEqual(classifyRepositoryPath(file), 'detached-test');
    await assertFileExists(file);
  }
}

async function runCli() {
  const [command = 'check', ...values] = process.argv.slice(2);
  if (command === 'check') {
    await validateMainTreeScope();
    process.stdout.write('Main-tree scope is valid. Detached subtrees were not traversed.\n');
    return;
  }
  if (command === 'list') {
    process.stdout.write(`${(await mainTreeFiles()).join('\n')}\n`);
    return;
  }
  if (command === 'classify') {
    for (const value of values) process.stdout.write(`${value}\t${classifyRepositoryPath(value)}\n`);
    return;
  }
  if (command === 'assert-main') {
    for (const value of values) assert.equal(classifyRepositoryPath(value), 'main-tree', `${value} is outside the main tree`);
    return;
  }
  throw new Error(`unknown command: ${command}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await runCli();
