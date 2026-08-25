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

test('stage 7 keeps mobile, motion, forced-colors and privacy boundaries', async () => {
  const styles = await source('app.css');
  const loop = await source('learning-loop.js');
  const app = await source('app.js');

  assert.match(styles, /@media\(max-width:360px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media\(forced-colors:active\)/);

  const newClientCode = `${loop}\n${app}`;
  assert.doesNotMatch(newClientCode, /\bfetch\s*\(/);
  assert.doesNotMatch(newClientCode, /\bsendBeacon\b/);
  assert.doesNotMatch(loop, /localStorage|sessionStorage|indexedDB|document\.cookie/);
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
