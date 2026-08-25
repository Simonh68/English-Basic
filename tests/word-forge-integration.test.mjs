import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Word Forge reads every target group and its five transfer challenges', async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await source('curriculum-data.js'), context);

  const levels = context.window.ENGLISH_BASIC_COURSE.levels;
  assert.equal(levels.length, 5);
  assert.equal(levels.flatMap(level => level.lessons).length, 50);
  for (const level of levels) {
    for (const lesson of level.lessons) {
      assert.equal(lesson.words.length, 10);
      assert.equal(lesson.transfer.length, 5);
    }
  }
  assert.equal(new Set(levels.flatMap(level => level.lessons.flatMap(stage => stage.words.map(([word]) => word.toLowerCase())))).size, 459);
  assert.equal(levels.flatMap(level => level.lessons.flatMap(stage => stage.transfer)).length, 250);

  const html = await source('word-forge/index.html');
  assert.match(html, /src="\.\.\/curriculum-data\.js\?v=2"/);
  assert.match(html, /params\.get\('level'\)/);
  assert.match(html, /params\.get\('lesson'\)/);
  assert.match(html, /lessonData\.words\.map\(\(\[word, translation\]\)/);
  assert.match(html, /lessonData\.transfer\.map\(\(\[word, translation\]\)/);
  assert.match(html, /const words = \[\.\.\.targetWords, \.\.\.transferWords\]/);
  assert.doesNotMatch(html, /const targetWords = \[|const transferWords = \[/);
});

test('the mobile opening is content-sized and starts directly below the topbar', async () => {
  const html = await source('word-forge/index.html');
  const mobileRules = html.match(/@media \(max-width: 620px\) \{([\s\S]*?)\n    \}/)?.[1];

  assert.ok(mobileRules, 'mobile rules exist');
  assert.match(mobileRules, /\.intro \{[\s\S]*min-height: 0;[\s\S]*justify-content: flex-start;/);
  assert.doesNotMatch(mobileRules, /\.intro \{[^}]*100svh/);
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

test('course navigation exposes the stage-specific production game', async () => {
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

test('the full 5 by 10 journey is explicit, premium, and free of school-facing language', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  assert.match(html, /id="stageMenuButton"[^>]*aria-haspopup="dialog"/);
  assert.match(html, /id="stageMapIntroButton"[^>]*>שלבים<\/button>/);
  assert.match(html, /id="stageMap"[^>]*aria-labelledby="stageMapTitle"/);
  assert.match(inlineScript, /function renderStageMap\(\)/);
  assert.match(inlineScript, /Array\.from\(\{ length: stageLevelCount \}/);
  assert.match(inlineScript, /class="level-route/);
  assert.match(html, /grid-template-columns: repeat\(10, minmax\(0, 1fr\)\)/);
  assert.match(inlineScript, /const nextStageHref = isFinalStage \? null/);
  assert.match(inlineScript, />השלב הבא <span aria-hidden="true">←<\/span><\/a>/);
  assert.match(inlineScript, /id="restartButton">לשחק שוב<\/button>/);
  assert.match(html, /PREMIUM WORD ARCADE/);
  assert.doesNotMatch(html, /LESSON/);
  assert.doesNotMatch(html, /שיעור/);
  assert.doesNotMatch(html, /ARCADE SPELLING LAB/);
});

test('each stage has a richer coin value, a distinct premium shell, and collectible rewards', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  const coinValuesSource = inlineScript.match(/const stageCoinValues = (\[[^;]+\]);/)?.[1];
  assert.ok(coinValuesSource, 'stage coin values are declared');
  const coinValues = new Function(`return ${coinValuesSource};`)();
  assert.equal(coinValues.length, 10);
  assert.deepEqual(coinValues.slice(0, 3), [5, 7, 12]);
  assert.equal(coinValues.at(-1), 25);
  assert.ok(coinValues.every((value, index) => index === 0 || value > coinValues[index - 1]));

  const themesSource = inlineScript.match(/const stageThemes = (\[[\s\S]*?\n\s*\]);/)?.[1];
  assert.ok(themesSource, 'stage themes are declared');
  const themes = new Function(`return ${themesSource};`)();
  assert.equal(themes.length, 10);
  assert.equal(new Set(themes.map(theme => theme.name)).size, 10);
  assert.match(inlineScript, /document\.documentElement\.style\.setProperty\('--stage-panel-a', stageTheme\.panelA\)/);
  assert.match(inlineScript, /document\.body\.dataset\.stageTheme = stageTheme\.name\.toLowerCase\(\)/);

  const rewardsSource = inlineScript.match(/const rewardLadder = (\[[\s\S]*?\n\s*\]);/)?.[1];
  assert.ok(rewardsSource, 'reward ladder is declared');
  const rewards = new Function(`return ${rewardsSource};`)();
  assert.deepEqual(rewards.map(reward => reward.label), ['סוכרייה', 'גביע ארד', 'גביע כסף', 'גביע זהב', 'בית', 'טירה', 'מטוס']);
  assert.deepEqual(rewards.map(reward => reward.symbol), ['🍬', '🏆', '🏆', '🏆', '🏠', '🏰', '✈️']);
  assert.deepEqual(rewards.map(reward => reward.threshold), [25, 100, 250, 600, 1500, 3500, 7500]);
  assert.match(inlineScript, /rewardLadder\.filter\(reward => totalCoins >= reward\.threshold\)/);
  assert.match(html, /id="coinMetric"/);
  assert.doesNotMatch(html, /\bPTS\b|\bPOINTS\b/);
  assert.doesNotMatch(html, /⚙️|🔋/);
});

test('Word Forge gold coins accumulate locally while legacy points migrate safely', async () => {
  const stored = new Map();
  const context = {
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, String(value))
    },
    window: { dispatchEvent() {} },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(await source('progress.js'), context);

  const progress = context.window.EBR_PROGRESS;
  let profile = progress.recordGame(true, 5, { game: 'word_forge', xp: 5, stage: 1 });
  assert.equal(profile.wordForgeCoins, 5);
  assert.equal(profile.xp, 5);

  profile = progress.recordGame(true, 12, { game: 'word_forge', xp: 7, stage: 2 });
  assert.equal(profile.wordForgeCoins, 12);
  assert.equal(profile.xp, 12);

  profile = progress.recordGame(false, 12, { game: 'word_forge', xp: 25, stage: 10 });
  assert.equal(profile.wordForgeCoins, 12, 'an incorrect answer gives no coins');
  assert.equal(profile.xp, 12);

  profile = progress.recordGame(true, 4, { game: 'word_match' });
  assert.equal(profile.wordForgeCoins, 12, 'other games do not change the Word Forge total');
  assert.equal(profile.xp, 16, 'other games keep the existing four-point default');

  profile = progress.completeWordForgeStage(1, 1);
  assert.deepEqual(Array.from(profile.wordForgeCompletedStages), ['1-1']);
  profile = progress.completeWordForgeStage(1, 1);
  assert.equal(profile.wordForgeCompletedStages.length, 1, 'stage completion is idempotent');

  const legacy = JSON.parse(stored.get('ebr-profile-v2'));
  delete legacy.wordForgeCoins;
  legacy.wordForgePoints = 321;
  stored.set('ebr-profile-v2', JSON.stringify(legacy));
  assert.equal(progress.getProfile().wordForgeCoins, 321, 'legacy points become coins without loss');
});

test('the missing-letter timer adapts from ten to seven to five seconds and can be disabled', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  const durations = new Function(`return ${inlineScript.match(/const challengeDurationsMs = (\[[^;]+\]);/)?.[1]};`)();
  const bonuses = new Function(`return ${inlineScript.match(/const pressureBonusByDuration = (\{[^;]+\});/)?.[1]};`)();
  const nextLevelSource = inlineScript.match(/function nextPressureLevel\(currentLevel, correct, pressureOn\) \{[\s\S]*?\n\s*\}/)?.[0];
  assert.deepEqual(durations, [10000, 7000, 5000]);
  assert.deepEqual(bonuses, { 10000: 0, 7000: 2, 5000: 5 });
  assert.ok(nextLevelSource);
  const nextLevel = new Function('challengeDurationsMs', `${nextLevelSource}; return nextPressureLevel;`)(durations);
  assert.deepEqual([nextLevel(0, true, true), nextLevel(1, true, true), nextLevel(2, true, true)], [1, 2, 2]);
  assert.equal(nextLevel(2, false, true), 0, 'an error resets the next challenge to ten seconds');
  assert.equal(nextLevel(2, true, false), 0, 'untimed success does not increase pressure');
  assert.match(html, /id="timePressureToggle"[^>]*aria-pressed="true"[^>]*>⏱ 10<\/button>/);
  assert.match(html, /id="challengeTimer" role="progressbar"[^>]*aria-valuemax="10"[^>]*aria-valuenow="10"/);
  assert.match(inlineScript, /const durationMs = timePressureOn \? challengeDurationsMs\[pressureLevel\] : null/);
  assert.match(inlineScript, /if \(!timer \|\| !fill \|\| !timePressureOn \|\| !durationMs\) return/);
  assert.match(inlineScript, /fill\.style\.transform = `scaleX\(\$\{ratio\}\)`/);
  assert.match(inlineScript, /answerChallenge\(null, \{ timedOut: true \}\)/);
  assert.match(inlineScript, /async function answerChallenge\(button, \{ timedOut = false \} = \{\}\)/);
  assert.match(inlineScript, /recordStageResult\(true, pressureBonus\)/);
  assert.match(inlineScript, /בונוס לחץ זמן: \$\{pressureBonus\} מטבעות/);
  assert.match(inlineScript, /לחץ הזמן בוטל\. אפשר לענות ללא הגבלת זמן/);
  assert.match(inlineScript, /timedOut \? 'הזמן הסתיים'/);
});

test('level completion triggers Golden Buzzer feedback and automatic level-to-level movement', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  assert.match(inlineScript, /completeWordForgeStage\?\.\(courseLevel, courseLesson\)/);
  assert.match(inlineScript, /const currentLevelComplete = Array\.from/);
  assert.match(inlineScript, /const levelAdvanceReady = Boolean\(autoLevelHref && currentLevelComplete\)/);
  assert.match(inlineScript, /LEVEL \$\{courseLevel\} ✓[\s\S]*LEVEL \$\{courseLevel \+ 1\}[\s\S]*id="autoCountdown">3/);
  assert.match(inlineScript, /function startAutoAdvance\(href\)/);
  assert.match(inlineScript, /if \(currentLevelComplete \|\| allStagesComplete\) triggerCoinBurst\(true\)/);
  assert.match(html, /\.coin-metric\.milestone::before/);
  assert.match(html, /@keyframes golden-rays/);
});

test('the Hebrew certificate is gated by all 50 stages, accepts any name script, and changes appearance per issue', async () => {
  const html = await source('word-forge/index.html');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  assert.match(html, /<h2 id="certificateTitle">תעודת סיום<\/h2>/);
  assert.match(html, /id="certificateNameInput"[^>]*dir="auto"[^>]*required/);
  assert.match(html, /5 רמות · 50 שלבים/);
  assert.match(html, /459 מילים/);
  assert.match(html, /250 אתגרי העברה/);
  assert.match(html, /שליטה מלאה במילים/);
  assert.doesNotMatch(html, /MASTERY CERTIFICATE|AWARDED TO|TARGET WORDS|TRANSFER CHALLENGES/);
  assert.match(inlineScript, /const allStagesComplete = completedStageCount >= totalStageCount/);
  assert.match(inlineScript, /certificateName\.textContent = learnerName/);
  assert.match(inlineScript, /progressApi\?\.issueWordForgeCertificate\?\.\(\)/);
  assert.match(inlineScript, /const certificatePalettes = \[/);
  assert.match(inlineScript, /uniqueGemHue = \(certificateNumber \* 137\.508/);
  assert.doesNotMatch(inlineScript, /learnerName[^\n]*localStorage|localStorage[^\n]*learnerName/);
});

test('Word Forge keeps the approved privacy and audio boundaries', async () => {
  const html = await source('word-forge/index.html');

  for (const forbidden of ['analytics.js', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'he-IL']) {
    assert.equal(html.includes(forbidden), false, `production game must not contain ${forbidden}`);
  }
  assert.match(html, /language = 'en-US'/);
  assert.match(html, /if \(\/\[a-z\]\/i\.test\(characters\[letterIndex\]\)\)/);
  assert.match(html, /<script src="\.\.\/progress\.js\?v=3"><\/script>/);
  assert.match(html, /lessonBackLink\.setAttribute\('aria-label', 'יציאה ל-English Basic'\)/);
  assert.match(html, /game: 'word_forge',[\s\S]*xp: gained/);
});
