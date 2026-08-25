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

test('exposure contrasts uppercase and lowercase while the missing-letter task stays lowercase', async () => {
  const html = await source('word-forge/index.html');

  assert.match(html, /<h2 class="word" lang="en">\$\{item\.word\.toUpperCase\(\)\}<\/h2>/);
  assert.match(html, /characters\.map\(letter => `<span class="letter">\$\{letter\.toLowerCase\(\)\}<\/span>`\)/);
  assert.match(html, /const displayWord = characters\.map\(\(letter, letterIndex\) => letterIndex === hiddenIndex \? '<span class="missing-slot">_<\/span>' : letter\.toLowerCase\(\)\)\.join\(''\)/);
  assert.match(html, /disabled>\$\{option\.toLowerCase\(\)\}<\/button>/);
  assert.match(html, /\.choice \{[\s\S]*text-transform: lowercase;/);
  assert.match(html, /encounterLabel\.textContent = isReview \? '↺ retry' : '★ quiz'/);
  assert.match(html, /<h2 class="challenge-title" lang="en" aria-label="איזו אות חסרה">letter\?<\/h2>/);
  assert.match(html, /<strong lang="en">yes!<\/strong>[\s\S]*\$\{item\.word\.toLowerCase\(\)\}<\/span> · \$\{item\.translation\} · <strong lang="en">\$\{correct\.toLowerCase\(\)\}<\/strong>/);
  assert.doesNotMatch(html, /missing-slot">_<\/span>' : letter\.toUpperCase\(\)/);
});

test('the missing-letter challenge is silent underneath and completes the lowercase word after any answer', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  assert.match(inlineScript, /async function startBackgroundMusic\(\) \{[\s\S]*!challengeStage\.hidden/);
  assert.match(inlineScript, /async function showWord\(wordIndex\) \{[\s\S]*challengeStage\.hidden = true;[\s\S]*await startBackgroundMusic\(\);/);
  assert.match(inlineScript, /async function showChallenge\(wordIndex, isReview\) \{[\s\S]*pauseBackgroundMusic\(\);[\s\S]*challengeStage\.hidden = false;/);
  assert.match(inlineScript, /class="missing-word" lang="en" aria-live="polite"/);
  assert.match(inlineScript, /const missingWord = challengeStage\.querySelector\('\.missing-word'\);[\s\S]*missingWord\.textContent = item\.word\.toLowerCase\(\);[\s\S]*let audioFeedback;[\s\S]*if \(answer === correct\)/);
});

test('success feedback climbs for three actions and then plays a long descending cascade', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);
  const patternsSource = inlineScript.match(/const positiveTonePatterns = (\[[\s\S]*?\n\s*\]);/)?.[1];
  assert.ok(patternsSource, 'positive tone patterns are declared');
  const patterns = new Function(`return ${patternsSource};`)();

  assert.equal(patterns.length, 4);
  assert.deepEqual(patterns.slice(0, 3).map(pattern => pattern[0].frequency), [440, 554, 659]);
  const cascadeFrequencies = patterns[3].map(tone => tone.frequency);
  assert.ok(cascadeFrequencies.every((frequency, index) => index === 0 || frequency < cascadeFrequencies[index - 1]));
  const cascadeSeconds = patterns[3].reduce((sum, tone) => sum + tone.duration + tone.gap, 0);
  assert.ok(cascadeSeconds > 1, 'the fourth cue is a long descent');
  assert.match(inlineScript, /positiveToneStep = \(positiveToneStep \+ 1\) % positiveTonePatterns\.length/);
  assert.match(inlineScript, /button\.classList\.add\('wrong'\);[\s\S]*positiveToneStep = 0;/);
});

test('an original quiet arcade loop builds tension and ducks under learning audio', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);
  const patternSource = inlineScript.match(/const backgroundTonePattern = (\[[\s\S]*?\n\s*\]);/)?.[1];
  assert.ok(patternSource, 'background tone pattern is declared');
  const pattern = new Function(`return ${patternSource};`)();

  assert.equal(pattern.length, 32, 'the loop has enough movement to avoid a short alert-like repeat');
  assert.ok(new Set(pattern.map(tone => tone.frequency)).size >= 16, 'the loop uses a varied original pitch set');
  assert.ok(Math.max(...pattern.map(tone => tone.gain)) <= .06, 'the synthesized loop stays quiet at its source');
  assert.ok(pattern.reduce((sum, tone) => sum + tone.duration + tone.gap, 0) > 3, 'the loop lasts more than three seconds');
  assert.match(inlineScript, /let backgroundAudio = null;[\s\S]*backgroundAudio = new Audio\(\);[\s\S]*backgroundAudio\.loop = true/);
  assert.match(inlineScript, /URL\.createObjectURL\(createToneWave\(backgroundTonePattern\)\)/);
  assert.match(inlineScript, /const backgroundVolume = \.36;[\s\S]*const backgroundDuckVolume = \.055;/);
  assert.match(inlineScript, /function speak\([\s\S]*const backgroundWasDucked = duckBackground\(\);[\s\S]*restoreBackground\(backgroundWasDucked\);/);
  assert.match(inlineScript, /async function playTones\([\s\S]*const backgroundWasDucked = duckBackground\(\);[\s\S]*finally \{[\s\S]*restoreBackground\(backgroundWasDucked\);/);
  assert.match(inlineScript, /game\.classList\.add\('active'\);[\s\S]*await startBackgroundMusic\(\);[\s\S]*showWord\(0\);/);
  assert.match(inlineScript, /function showFinish\(\) \{[\s\S]*gameFinished = true;[\s\S]*pauseBackgroundMusic\(true\);/);
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
