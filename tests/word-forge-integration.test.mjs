import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Word Forge reads the exact ten-word group for every course lesson', async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await source('curriculum-data.js'), context);

  const levels = context.window.ENGLISH_BASIC_COURSE.levels;
  assert.equal(levels.length, 5);
  assert.equal(levels.flatMap(level => level.lessons).length, 50);
  for (const level of levels) {
    for (const lesson of level.lessons) assert.equal(lesson.words.length, 10);
  }

  const html = await source('word-forge/index.html');
  assert.match(html, /src="\.\.\/curriculum-data\.js\?v=2"/);
  assert.match(html, /params\.get\('level'\)/);
  assert.match(html, /params\.get\('lesson'\)/);
  assert.match(html, /lessonData\.words\.map\(\(\[word, translation\]\)/);
  assert.doesNotMatch(html, /const words = \[/);
});

test('the production game compiles and visibly reshuffles every run', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Function(inlineScript));
  assert.match(inlineScript, /runWords = shuffleGroup\(words, runWords\)/);
  assert.match(inlineScript, /shuffled\[0\] === previousGroup\[0\]/);
});

test('apostrophes in contractions are never selected as missing letters', async () => {
  const html = await source('word-forge/index.html');
  const helperSource = html.match(/function chooseLetterIndex\(word\) \{[\s\S]*?\n\s*\}/)?.[0];
  assert.ok(helperSource);
  const chooseLetterIndex = new Function(`${helperSource}; return chooseLetterIndex;`)();

  for (const word of ["I'm", "can't", "don't", "you're", "they've", "she'll", "won't", "didn't"]) {
    const index = chooseLetterIndex(word);
    assert.match([...word][index], /[a-z]/i, `${word} selects an English letter`);
  }
});

test('exposure uses lowercase and the missing-letter task uses uppercase', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /characters\.map\(letter => `<span class="letter">\$\{letter\.toLowerCase\(\)\}<\/span>`\)/);
  assert.match(html, /const displayWord = characters\.map\(\(letter, letterIndex\) => letterIndex === hiddenIndex \? '<span class="missing-slot">_<\/span>' : letter\.toUpperCase\(\)\)\.join\(''\)/);
  assert.match(html, /disabled>\$\{option\.toUpperCase\(\)\}<\/button>/);
  assert.match(html, /\$\{item\.word\.toUpperCase\(\)\}<\/span> · \$\{item\.translation\}/);
});

test('lesson and home navigation expose the lesson-specific production game', async () => {
  const [app, lesson, home, game] = await Promise.all([
    source('app.js'),
    source('lesson.html'),
    source('index.html'),
    source('word-forge/index.html')
  ]);

  assert.match(app, /function wordForgeHref\(\)\{return `word-forge\/\?level=\$\{level\}&lesson=\$\{lesson\}`\}/);
  assert.match(app, /data-word-forge/);
  assert.match(app, /location\.href=wordForgeHref\(\)/);
  assert.match(lesson, /app\.js\?v=9/);
  assert.match(home, /href="word-forge\/\?level=1&amp;lesson=1"/);
  assert.match(game, /const lessonHref = `\.\.\/lesson\.html\?level=\$\{courseLevel\}&lesson=\$\{courseLesson\}&mode=cards`/);
});

test('Word Forge keeps the approved privacy and audio boundaries', async () => {
  const html = await source('word-forge/index.html');

  for (const forbidden of ['analytics.js', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'he-IL']) {
    assert.equal(html.includes(forbidden), false, `production game must not contain ${forbidden}`);
  }
  assert.match(html, /language = 'en-US'/);
  assert.match(html, /if \(\/\[a-z\]\/i\.test\(characters\[letterIndex\]\)\)/);
  assert.match(html, /aria-label="חזרה לרמה \$\{courseLevel\}, שיעור \$\{courseLesson\}"/);
});
