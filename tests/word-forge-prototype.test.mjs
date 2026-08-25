import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '../prototypes/word-forge/index.html'), 'utf8');
const reviewCopy = readFileSync(resolve(here, '../prototypes/word-forge/word-forge-v4.html'), 'utf8');
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

assert.equal(reviewCopy, html, 'standalone V4 review copy matches the prototype source');
assert.ok(inlineScript, 'inline prototype script exists');
assert.doesNotThrow(() => new Function(inlineScript), 'inline prototype script compiles');

const shuffleSource = inlineScript.match(/function shuffleGroup\(group, previousGroup = \[\]\) \{[\s\S]*?return shuffled;\n\s*\}/)?.[0];
assert.ok(shuffleSource, 'group shuffle helper exists');
const shuffleGroup = new Function(`${shuffleSource}; return shuffleGroup;`)();
const sourceGroup = ['one', 'two', 'three', 'four'];
const originalRandom = Math.random;
let shuffledGroup;
try {
  Math.random = () => 0;
  shuffledGroup = shuffleGroup(sourceGroup);
} finally {
  Math.random = originalRandom;
}
assert.deepEqual(sourceGroup, ['one', 'two', 'three', 'four'], 'shuffle keeps the source group unchanged');
assert.deepEqual([...shuffledGroup].sort(), [...sourceGroup].sort(), 'shuffle preserves every word in the group');
assert.notDeepEqual(shuffledGroup, sourceGroup, 'shuffle can change the group order');

let visiblyShuffledGroup;
try {
  Math.random = () => .999;
  visiblyShuffledGroup = shuffleGroup(sourceGroup, sourceGroup);
} finally {
  Math.random = originalRandom;
}
assert.notEqual(visiblyShuffledGroup[0], sourceGroup[0], 'every new run visibly starts with a different word');

const backgroundPatternSource = inlineScript.match(/const backgroundTonePattern = (\[[\s\S]*?\n\s*\]);/)?.[1];
assert.ok(backgroundPatternSource, 'background tone pattern exists');
const backgroundPattern = new Function(`return ${backgroundPatternSource};`)();
assert.equal(backgroundPattern.length, 32, 'background loop contains 32 original arcade notes');
assert.ok(Math.max(...backgroundPattern.map(tone => tone.gain)) <= .06, 'background loop source gain stays quiet');
assert.ok(backgroundPattern.reduce((sum, tone) => sum + tone.duration + tone.gap, 0) > 3, 'background loop runs longer than three seconds');

const pointValuesSource = inlineScript.match(/const stagePointValues = (\[[^;]+\]);/)?.[1];
assert.ok(pointValuesSource, 'stage point values exist');
const pointValues = new Function(`return ${pointValuesSource};`)();
assert.deepEqual(pointValues.slice(0, 3), [5, 7, 12], 'the first three stages award 5, 7, and 12 points');
assert.equal(pointValues.at(-1), 25, 'the final stage awards 25 points');
assert.ok(pointValues.every((value, index) => index === 0 || value > pointValues[index - 1]), 'point values grow at every stage');

const themesSource = inlineScript.match(/const stageThemes = (\[[\s\S]*?\n\s*\]);/)?.[1];
assert.ok(themesSource, 'stage themes exist');
const themes = new Function(`return ${themesSource};`)();
assert.equal(themes.length, 10, 'all ten stages receive a premium shell');
assert.equal(new Set(themes.map(theme => theme.name)).size, 10, 'every premium shell is distinct');

const rewardsSource = inlineScript.match(/const rewardLadder = (\[[\s\S]*?\n\s*\]);/)?.[1];
assert.ok(rewardsSource, 'collectible reward ladder exists');
const rewards = new Function(`return ${rewardsSource};`)();
assert.deepEqual(rewards.map(reward => reward.label), ['סוכרייה', 'גביע ארד', 'גביע כסף', 'גביע זהב', 'בית', 'טירה', 'מטוס'], 'rewards grow from candy to an airplane');

const checks = [
  ['Hebrew-first document', /<html lang="he" dir="rtl">/],
  ['ten source words', /const words = \[[\s\S]*important[\s\S]*class[\s\S]*\];/],
  ['fresh visible random order for every run', /function resetState\(\) \{[\s\S]*runWords = shuffleGroup\(words, runWords\)[\s\S]*function shuffleGroup\(group, previousGroup = \[\]\)[\s\S]*shuffled\[0\] === previousGroup\[0\]/],
  ['every word receives a focus check', /new Set\(words\.map\(\(_, wordIndex\) => wordIndex\)\)/],
  ['assessment follows every exposure', /showChallenge\(index, false\)/],
  ['Hebrew assessment hint', /class="hebrew-hint"[\s\S]*\$\{item\.translation\}/],
  ['US English pronunciation remains', /language = 'en-US'[\s\S]*utterance\.lang = language/],
  ['arcade question tones', /async function questionCue[\s\S]*type: 'square'[\s\S]*frequency: 659/],
  ['question pause', /await sleep\(360\)/],
  ['four-step arcade success cue', /const positiveTonePatterns = \[[\s\S]*frequency: 440[\s\S]*frequency: 554[\s\S]*frequency: 659[\s\S]*frequency: 988[\s\S]*frequency: 262[\s\S]*\];/],
  ['success cue advances cyclically', /function nextPositiveTonePattern\(\)[\s\S]*positiveToneStep = \(positiveToneStep \+ 1\) % positiveTonePatterns\.length/],
  ['retry resets the success cue', /button\.classList\.add\('wrong'\);[\s\S]*positiveToneStep = 0;/],
  ['distinct arcade retry cue', /async function retryAudio[\s\S]*frequency: 147[\s\S]*type: 'triangle'/],
  ['no Hebrew voice feedback', /async function positiveAudio[\s\S]*await speak\(item\.word[\s\S]*async function retryAudio/],
  ['explicit audio test', /id="soundTestButton"[\s\S]*runSoundCheck/],
  ['HTML audio fallback', /createToneWave[\s\S]*playMediaTones/],
  ['original tense arcade background loop', /const backgroundTonePattern = \[[\s\S]*frequency: 110[\s\S]*frequency: 294[\s\S]*frequency: 82[\s\S]*frequency: 247[\s\S]*\];/],
  ['separate looping background audio', /let backgroundAudio = null;[\s\S]*backgroundAudio = new Audio\(\);[\s\S]*backgroundAudio\.loop = true/],
  ['quiet background mix with deep ducking', /const backgroundVolume = \.36;[\s\S]*const backgroundDuckVolume = \.055;[\s\S]*function duckBackground\(\)[\s\S]*function restoreBackground\(wasDucked\)/],
  ['background follows the game lifecycle', /game\.classList\.add\('active'\);[\s\S]*await startBackgroundMusic\(\);[\s\S]*function resetState\(\) \{[\s\S]*pauseBackgroundMusic\(true\);[\s\S]*function showFinish\(\) \{[\s\S]*gameFinished = true;[\s\S]*pauseBackgroundMusic\(true\);/],
  ['background stops for the challenge and resumes only for exposure', /async function startBackgroundMusic\(\) \{[\s\S]*!challengeStage\.hidden[\s\S]*async function showWord\(wordIndex\) \{[\s\S]*challengeStage\.hidden = true;[\s\S]*await startBackgroundMusic\(\);[\s\S]*async function showChallenge\(wordIndex, isReview\) \{[\s\S]*pauseBackgroundMusic\(\);[\s\S]*challengeStage\.hidden = false;/],
  ['answered challenge completes the lowercase word', /class="missing-word" lang="en" aria-live="polite"[\s\S]*const missingWord = challengeStage\.querySelector\('\.missing-word'\);[\s\S]*missingWord\.textContent = item\.word\.toLowerCase\(\);[\s\S]*let audioFeedback;/],
  ['speech and foreground cues duck the music', /function speak\([\s\S]*duckBackground\(\)[\s\S]*restoreBackground\(backgroundWasDucked\)[\s\S]*async function playTones\([\s\S]*duckBackground\(\)[\s\S]*finally \{[\s\S]*restoreBackground\(backgroundWasDucked\)/],
  ['square-wave arcade timbre', /type === 'square'[\s\S]*Math\.sign\(Math\.sin\(phase\)\)/],
  ['single-screen compact opening', /@media \(max-width: 620px\)[\s\S]*\.intro \{[\s\S]*min-height: 0;[\s\S]*justify-content: flex-start;/],
  ['three compact mobile world buttons', /@media \(max-width: 620px\)[\s\S]*route-picker \{ grid-template-columns: repeat\(3/],
  ['maze-chase visual lane', /class="arcade-lane"[\s\S]*arcade-runner">ᗧ[\s\S]*arcade-chaser/],
  ['arcade progress runner', /\.progress-fill::after[\s\S]*content: "ᗧ"/],
  ['mobile compact build', /height: 106px;[\s\S]*grid-template-columns: 78px minmax\(0, 1fr\)/],
  ['speech timeout fallback', /setTimeout\(finish, Math\.max\(1800, text\.length \* 180\)\)/],
  ['answers locked until cue completes', /aria-label="האות \$\{option\.toLowerCase\(\)\}" disabled/],
  ['uppercase headword on the exposure card', /<h2 class="word" lang="en">\$\{item\.word\.toUpperCase\(\)\}<\/h2>/],
  ['lowercase spelling on the exposure card', /map\(letter => `<span class="letter">\$\{letter\.toLowerCase\(\)\}<\/span>`\)/],
  ['lowercase missing-letter prompt', /missing-slot">_<\/span>' : letter\.toLowerCase\(\)/],
  ['lowercase missing-letter choices', /disabled>\$\{option\.toLowerCase\(\)\}<\/button>/],
  ['choice styling preserves lowercase', /\.choice \{[\s\S]*text-transform: lowercase;/],
  ['lowercase missing-letter labels', /isReview \? '↺ retry' : '★ quiz'[\s\S]*>letter\?<\/h2>/],
  ['lowercase missing-letter feedback', /<strong lang="en">yes!<\/strong>[\s\S]*\$\{item\.word\.toLowerCase\(\)\}[\s\S]*\$\{correct\.toLowerCase\(\)\}/],
  ['corrective spaced return', /dueAt: Math\.min\(runWords\.length, completedWords \+ 2\)/],
  ['no public leaderboard', /ללא דירוג/],
  ['explicit opening stage picker', /id="stageMapIntroButton"[^>]*>שלבים<\/button>/],
  ['stage map exposes all course routes', /id="stageMap"[\s\S]*function renderStageMap\(\)[\s\S]*LEVEL \$\{level\}/],
  ['next stage is the primary completion action', /id="nextStageLink"[^>]*>השלב הבא/],
  ['replay and stage actions stay explicit', /id="restartButton">לשחק שוב<\/button>[\s\S]*id="finishStageMapButton">שלבים<\/button>/],
  ['premium shell variables change by stage', /setProperty\('--stage-panel-a', stageTheme\.panelA\)[\s\S]*dataset\.stageTheme/],
  ['cumulative Word Forge point bridge', /function recordStageResult\(correct\)[\s\S]*game: 'word_forge'[\s\S]*xp: gained[\s\S]*profile\.wordForgePoints/],
  ['collectible reward reveal', /class="build-piece[\s\S]*הפרס הבא: \$\{rewardLadder\[lit\]\.label\}/],
  ['animated per-word feedback', /feedbackAnimation\('success'\)[\s\S]*feedbackAnimation\('retry'\)/],
  ['live feedback', /role="status" aria-live="polite"/],
  ['reduced motion support', /prefers-reduced-motion/],
  ['forced colors support', /forced-colors: active/],
  ['mobile 320 minimum', /min-width: 320px/]
];

for (const [label, pattern] of checks) {
  assert.match(html, pattern, label);
}

for (const forbidden of ['analytics.js', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage']) {
  assert.equal(html.includes(forbidden), false, `prototype must not contain ${forbidden}`);
}

for (const forbiddenSpeech of ['he-IL', 'speakHebrewOrEnglish', 'primeSpeech']) {
  assert.equal(html.includes(forbiddenSpeech), false, `prototype must not contain Hebrew voice feedback helper ${forbiddenSpeech}`);
}

assert.doesNotMatch(html, /LESSON/, 'the interface never calls a stage a lesson');
assert.doesNotMatch(html, /שיעור/, 'the interface has no school-facing lesson wording');
assert.doesNotMatch(html, /⚙️|🔋/, 'the reward collection has no scientific machinery');

assert.equal((html.match(/class="route-card"/g) || []).length, 3, 'exactly three build choices');
assert.equal((html.match(/\{ word:/g) || []).length, 10, 'exactly ten spelling words');

console.log(`Word Forge prototype checks passed: ${checks.length + 16}`);
