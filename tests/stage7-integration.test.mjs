import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('the lesson loads the shared loop before the application', async () => {
  const lesson = await source('lesson.html');
  const loopPosition = lesson.indexOf('learning-loop.js');
  const appPosition = lesson.indexOf('app.js');

  assert.ok(loopPosition > -1);
  assert.ok(appPosition > loopPosition);
});

test('all 50 lessons provide complete queues for the corrected modes', async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await source('curriculum-data.js'), context);
  const levels = context.window.ENGLISH_BASIC_COURSE.levels;
  const lessons = levels.flatMap(level => level.lessons);

  assert.equal(levels.length, 5);
  assert.equal(lessons.length, 50);
  for (const lesson of lessons) {
    assert.equal(lesson.words.length, 10);
    assert.equal(lesson.transfer.length, 5);
  }
});

test('listening, self-reading and mastery check share the return queue', async () => {
  const app = await source('app.js');

  assert.match(app, /function renderListen\(\)/);
  assert.match(app, /function renderSelfRead\(isTransfer\)/);
  assert.match(app, /function renderCheck\(\)/);
  assert.match(app, /learningLoop\.scheduleAfterError/);
  assert.match(app, /learningLoop\.scheduleAfterSuccess/);
  assert.match(app, /role=\"status\" aria-live=\"polite\"/);
  assert.doesNotMatch(app, /ננסה שוב בהמשך/);
});

test('listening choices rotate the correct display position', async () => {
  const app = await source('app.js');
  const helperSource = app.match(/function avoidRepeatedCorrectPosition\(values,isCorrect,previousIndex=-1,random=Math\.random\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(helperSource);
  const arrange = new Function(`${helperSource}; return avoidRepeatedCorrectPosition;`)();
  const values = ['correct', 'one', 'two', 'three'];
  const first = arrange(values, value => value === 'correct', -1, () => 0);
  const second = arrange(values, value => value === 'correct', first.correctIndex, () => 0);
  const third = arrange(['one', 'correct', 'two', 'three'], value => value === 'correct', second.correctIndex, () => .99);

  assert.equal(first.choices[first.correctIndex], 'correct');
  assert.equal(second.choices[second.correctIndex], 'correct');
  assert.equal(third.choices[third.correctIndex], 'correct');
  assert.notEqual(second.correctIndex, first.correctIndex);
  assert.notEqual(third.correctIndex, second.correctIndex);
  assert.match(app, /previousAnswerIndex=arranged\.correctIndex/);
});

test('stage 7 keeps mobile, motion, forced-colors and privacy boundaries', async () => {
  const styles = await source('app.css');
  const loop = await source('learning-loop.js');
  const app = await source('app.js');

  assert.match(styles, /@media\(max-width:360px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media\(forced-colors:active\)/);
  assert.match(styles, /\.translation,\.choice,\.big-read,\.reveal\{min-width:0;max-width:100%;overflow-wrap:anywhere\}/);

  const newClientCode = `${loop}\n${app}`;
  assert.doesNotMatch(newClientCode, /\bfetch\s*\(/);
  assert.doesNotMatch(newClientCode, /\bsendBeacon\b/);
  assert.doesNotMatch(loop, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test('Listen & Find shows long words without clipping them on phones', async () => {
  const game = await source('word-game/index.html');
  assert.match(game, /\.choice-word \{[\s\S]*overflow-wrap: anywhere;[\s\S]*white-space: normal;/);
  assert.doesNotMatch(game, /\.choice-word \{[\s\S]*?text-overflow: ellipsis;[\s\S]*?\}/);
});

test('lesson cards use an LTR track with RTL card content and a cache-busted stylesheet', async () => {
  const styles = await source('app.css');
  const lesson = await source('lesson.html');

  assert.match(styles, /\.card-track\{direction:ltr\}/);
  assert.match(styles, /\.study-card\{direction:rtl\}/);
  assert.match(lesson, /app\.css\?v=9/);
});

test('the home page explains the corrected learning loop in Hebrew', async () => {
  const home = await source('index.html');

  assert.match(home, /טעות חוזרת אחרי שתי שאלות אחרות/);
  assert.match(home, /הצלחה נבדקת אחרי ארבע עד שש שאלות/);
  assert.match(home, /טעות חוזרת לתרגול — ולא נעלמת/);
});

test('the separate Listen & Find game already keeps a wrong target active', async () => {
  const game = await source('word-game/index.html');
  const wrongBranch = game.slice(game.indexOf('if (word.w !== target.w)'), game.indexOf('const cleanAnswer'));

  assert.match(wrongBranch, /readTarget\(1\)/);
  assert.match(wrongBranch, /Try again/);
  assert.match(wrongBranch, /return;/);
});
