import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const context = { window: {}, location: { search: '' }, URLSearchParams };
vm.runInNewContext(await readFile(new URL('../diagnostic/common.js', import.meta.url), 'utf8'), context);
const api = context.window.EFN_DIAGNOSTIC;
const attempt = (level, correct, ratio = correct / 4) => ({ level, correct, total: 4, ratio });

 test('speed bonuses cannot change screening placement for identical correct answers', () => {
  for (let first = 0; first <= 4; first++) {
    for (let second = 0; second <= 4; second++) {
      for (let third = 0; third <= 4; third++) {
        const scores = elapsed => Object.fromEntries(['Core I', 'Core II', 'Band III'].map((band, i) => {
          const correct = [first, second, third][i];
          const answers = Array.from({ length: 4 }, (_, n) => ({ points: api.scoreTimedAnswer(n < correct, elapsed) }));
          return [band, { correct, total: 4, ratio: api.scoreRatio(answers) }];
        }));
        assert.equal(api.vocabularyProfile(scores(2000)), api.vocabularyProfile(scores(25000)));
      }
    }
  }
  assert.equal(api.vocabularyProfile({ 'Core I': { total: 4, correct: 2, ratio: 0.5 } }), 'core1');
});

test('no successful A passage means no inferred A evidence', () => {
  for (const profile of ['below-core1', 'core1', 'core2', 'band3']) {
    for (let correct = 0; correct < 3; correct++) {
      const step = api.nextReadingStep(profile, [attempt('A', correct, 1)]);
      assert.equal(step.action, 'finish');
      assert.equal(step.level, null);
    }
  }
  assert.equal(api.readingEvidenceLevel([]), null);
  assert.equal(api.readingEvidenceLevel([{ level: 'G', correct: 4, ratio: 1 }]), null);
});

test('reading recommendations use the highest evidenced passage, not speed or an old label', () => {
  assert.equal(api.readingEvidenceLevel([attempt('A', 3, 0)]), 'A');
  assert.equal(api.readingEvidenceLevel([attempt('E', 3), attempt('G', 2, 1)]), 'E');
  assert.equal(api.readingEvidenceLevel([attempt('E', 0), attempt('C', 0), attempt('A', 0)]), null);
  assert.equal(api.readingEvidenceLevel([attempt('G', 4), attempt('A', 3)]), 'G');
});

test('insufficient reading evidence recommends the supported basic story, never E', () => {
  const recommendation = api.combinedRecommendations(null, 'C');
  assert.match(recommendation[1].href, /l1-a1-new-student/);
  assert.match(recommendation[1].detail, /לא נקבעה רמת קריאה/);
  assert.match(recommendation[0].href, /group-21/);
});

test('the results screen recalculates old evidence without deleting progress or using a default level', async () => {
  const source = await readFile(new URL('../diagnostic/reading.js', import.meta.url), 'utf8');
  assert.match(source, /api\.readingEvidenceLevel\(attempts\)/);
  assert.match(source, /existingResult\?\.readingAttempts/);
  assert.match(source, /assessmentKind: 'practice-recommendation'/);
  assert.match(source, /כדאי לחזק את הבנת הנקרא הבסיסית/);
  assert.doesNotMatch(source, /readingLevel \|\| 'A'|removeStorage|localStorage\.clear/);
});
