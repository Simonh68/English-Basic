import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const loop = require('../learning-loop.js');

test('a mistake returns only after two other questions', () => {
  const rest = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  const retry = { key: 'retry' };
  const next = loop.scheduleAfterError(rest, retry, index => ({ key: `f-${index}` }));

  assert.equal(loop.ERROR_GAP, 2);
  assert.equal(next.indexOf(retry), 2);
});

test('a success returns after four to six other questions', () => {
  const rest = Array.from({ length: 8 }, (_, index) => ({ key: `q-${index}` }));
  const review = { key: 'review' };

  for (let seed = 0; seed < 12; seed += 1) {
    const next = loop.scheduleAfterSuccess(rest, review, seed, index => ({ key: `f-${index}` }));
    assert.ok(next.indexOf(review) >= loop.SUCCESS_GAP_MIN);
    assert.ok(next.indexOf(review) <= loop.SUCCESS_GAP_MAX);
  }
});

test('short queues receive reinforcement items so spacing is preserved', () => {
  const retry = { key: 'retry' };
  const next = loop.scheduleAfterError([], retry, index => ({ key: `f-${index}` }));

  assert.deepEqual(next.map(entry => entry.key), ['f-0', 'f-1', 'retry']);
});
