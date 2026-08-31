import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyRepositoryPath,
  mainTreeFiles,
  scope,
  validateMainTreeScope,
} from '../scripts/main-tree-scope.mjs';

test('the declared live main tree is internally valid', async () => {
  await validateMainTreeScope();
  for (const file of await mainTreeFiles()) assert.equal(classifyRepositoryPath(file), 'main-tree');
});

test('known disconnected surfaces stay outside every general operation', () => {
  for (const file of [
    'prototypes/word-forge/index.html',
    'level2/lesson1.html',
    'lesson1.html',
    'word-spelling-reader.html',
    'temp/analytics-v2.js',
  ]) {
    assert.equal(classifyRepositoryPath(file), 'detached', file);
  }
  assert.equal(classifyRepositoryPath('temp/index.html'), 'sync-only');
  assert.equal(classifyRepositoryPath('diagnostic/index.html'), 'main-tree');
});

test('the default test set excludes detached prototype tests', () => {
  for (const file of scope.verification.explicitDetachedTests) {
    assert.ok(!scope.verification.defaultTestFiles.includes(file));
    assert.equal(classifyRepositoryPath(file), 'detached-test');
  }
});
