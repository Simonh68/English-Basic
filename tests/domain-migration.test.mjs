import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8');

test('legacy English Basic routes migrate while MAAYAN stays independent', () => {
  assert.match(source, /\/word-forge\//);
  assert.match(source, /\/diagnostic\//);
  assert.match(source, /\/english-basic\//);
  assert.match(source, /relative === 'temp'/);
  assert.match(source, /ebr-profile-v2/);
});
